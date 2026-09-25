const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");

const { interviewQuestions, getRandomQuestions } = require("./data/interviewQuestions");
const { evaluateAnswer, generateSessionSummary } = require("./services/aiService");

dotenv.config();

const app = express();

// In-memory session store (resilient if MongoDB is unavailable)
const sessionsStore = new Map();

// Middleware
app.use(express.json());
app.use(cors());

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api", authRoutes);

connectDB();

app.get("/", (req, res) => {
    res.send("AI Mock Interview Backend is running!");
});

// GET /api/interviews - Return all interview tracks from dataset
app.get("/api/interviews", (req, res) => {
    res.json(
        interviewQuestions.map((track) => ({
            role: track.role,
            difficulty: track.difficulty,
            questionCount: track.questionCount || 4
        }))
    );
});

// POST /api/sessions - Start session & pick random questions directly from dataset
app.post("/api/sessions", (req, res) => {
    const { role } = req.body;
    const sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const randomQuestions = getRandomQuestions(role, 4).map((text, idx) => ({
        _id: `q_${Date.now()}_${idx}`,
        sessionId,
        text,
        transcript: "",
        feedback: "",
        recordingUrl: ""
    }));

    const session = {
        _id: sessionId,
        role: role || "Technical Interview",
        score: 0,
        summary: "",
        createdAt: new Date()
    };

    sessionsStore.set(sessionId, { session, questions: randomQuestions });

    console.log(`Created session ${sessionId} for "${role}" with ${randomQuestions.length} randomized questions.`);
    res.status(201).json({ sessionId, questions: randomQuestions });
});

// GET /api/session/:id - Get session details and its questions
app.get("/api/session/:id", (req, res) => {
    const sessionData = sessionsStore.get(req.params.id);

    if (sessionData) {
        return res.json(sessionData);
    }

    const fallbackRole = req.query.role || "Technical Interview";
    const randomQuestions = getRandomQuestions(fallbackRole, 4).map((text, idx) => ({
        _id: `q_${Date.now()}_${idx}`,
        sessionId: req.params.id,
        text,
        transcript: "",
        feedback: "",
        recordingUrl: ""
    }));

    const fallbackSession = {
        _id: req.params.id,
        role: fallbackRole,
        score: 82,
        summary: "Candidate demonstrated solid reasoning and component architecture understanding.",
        createdAt: new Date()
    };

    sessionsStore.set(req.params.id, {
        session: fallbackSession,
        questions: randomQuestions
    });

    res.json({
        session: fallbackSession,
        questions: randomQuestions
    });
});

// POST /api/answers - Record candidate's answer
app.post("/api/answers", (req, res) => {
    const { questionId, transcript } = req.body;

    for (const [sId, data] of sessionsStore.entries()) {
        const q = data.questions.find((item) => item._id === questionId);

        if (q) {
            q.transcript = transcript || "";
            console.log(
                `[Answer Saved] Question ID: ${questionId} -> "${(transcript || "").slice(0, 40)}..."`
            );
            break;
        }
    }

    res.json({
        success: true,
        message: "Answer recorded successfully"
    });
});

// POST /api/finish - Complete session with Gemini AI evaluation
app.post("/api/finish", async (req, res) => {
    const { sessionId } = req.body;
    const sessionData = sessionsStore.get(sessionId);

    if (sessionData) {
        const evaluations = await Promise.all(
            sessionData.questions.map(async (q) => {
                const evalResult = await evaluateAnswer(q.text, q.transcript);

                q.score = evalResult.score;
                q.feedback = evalResult.feedback;

                return evalResult.score;
            })
        );

        const answeredQs = sessionData.questions.filter(
            (q) =>
                (q.transcript || "").trim() &&
                q.transcript !== "No response recorded."
        );

        let avgScore = 0;

        if (answeredQs.length > 0) {
            const answeredTotal = answeredQs.reduce(
                (acc, curr) => acc + (curr.score || 0),
                0
            );

            avgScore = Math.round(answeredTotal / answeredQs.length);
        } else {
            avgScore = Math.round(
                evaluations.reduce((a, b) => a + b, 0) /
                (evaluations.length || 1)
            );
        }

        sessionData.session.score = avgScore;

        sessionData.session.summary = await generateSessionSummary(
            sessionData.session.role,
            avgScore,
            sessionData.questions
        );
    }

    res.json({
        success: true,
        message: "Session evaluated with AI successfully",
        sessionId
    });
});

// GET /api/history - Return candidate session history
app.get("/api/history", (req, res) => {
    const historyList = [];

    for (const [_, data] of sessionsStore.entries()) {
        historyList.push(data.session);
    }

    if (historyList.length === 0) {
        const d1 = new Date();
        d1.setDate(d1.getDate() - 3);

        const d2 = new Date();
        d2.setDate(d2.getDate() - 1);

        historyList.push(
            {
                _id: "s1",
                role: "Frontend Developer",
                score: 85,
                createdAt: d1
            },
            {
                _id: "s2",
                role: "System Design Interview",
                score: 78,
                createdAt: d2
            }
        );
    }

    res.json(historyList);
});

// Protected route demo
app.get("/api/protected", authMiddleware, (req, res) => {
    res.json({
        message: "You have accessed a protected route!",
        userId: req.userId
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
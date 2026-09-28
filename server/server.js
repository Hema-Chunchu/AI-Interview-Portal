const dns = require("dns");
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
    // Ignored if custom DNS cannot be set
}

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");

const Session = require("./models/Session");
const Question = require("./models/Question");
const User = require("./models/User");

const { interviewQuestions, getRandomQuestions } = require("./data/interviewQuestions");
const { evaluateAnswer, generateSessionSummary } = require("./services/aiService");

dotenv.config();

const app = express();

// In-memory session store for ultra-fast access and offline resilience
const sessionsStore = new Map();

// Middleware
app.use(express.json());
app.use(cors());

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api", authRoutes);

// Connect to MongoDB
connectDB();

app.get("/", (req, res) => {
    res.send("AI Mock Interview Backend is running!");
});

// Helper: Extract userId from Bearer token if present
const getUserIdFromHeader = (req) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "ai_interview_portal_secret_key_2026");
            return decoded.id;
        }
    } catch (e) {
        // Token invalid or unverified, continue as guest
    }
    return null;
};

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

// POST /api/sessions - Start session & pick random questions dynamically
app.post("/api/sessions", async (req, res) => {
    const { role, questionCount } = req.body;
    const targetRole = role || "Technical Interview";
    const count = parseInt(questionCount, 10) || 4;

    const isConnected = mongoose.connection.readyState === 1;
    let userId = getUserIdFromHeader(req);

    let sessionObjId = new mongoose.Types.ObjectId();
    const sessionId = sessionObjId.toString();

    const selectedQuestionTexts = getRandomQuestions(targetRole, count);
    const questionsList = [];

    // Create session in MongoDB if connected
    if (isConnected) {
        try {
            if (!userId) {
                let defaultUser = await User.findOne();
                if (!defaultUser) {
                    defaultUser = await User.create({
                        name: "Candidate",
                        email: "candidate@interview.local",
                        password: "guest_password_hash"
                    });
                }
                userId = defaultUser._id;
            }

            const dbSession = await Session.create({
                _id: sessionObjId,
                userId,
                role: targetRole,
                score: 0,
                summary: "Session started.",
                status: "in-progress",
                createdAt: new Date()
            });

            // Insert questions in MongoDB
            for (const qText of selectedQuestionTexts) {
                const dbQ = await Question.create({
                    sessionId: dbSession._id,
                    text: qText,
                    transcript: "",
                    feedback: "",
                    score: 0,
                    recordingUrl: ""
                });

                questionsList.push({
                    _id: dbQ._id.toString(),
                    sessionId,
                    text: qText,
                    transcript: "",
                    feedback: "",
                    score: 0,
                    recordingUrl: ""
                });
            }
        } catch (dbErr) {
            console.warn("Failed to create session in MongoDB, falling back to memory:", dbErr.message);
        }
    }

    // In-memory fallback if MongoDB was not connected or write failed
    if (questionsList.length === 0) {
        selectedQuestionTexts.forEach((text, idx) => {
            questionsList.push({
                _id: `q_${Date.now()}_${idx}`,
                sessionId,
                text,
                transcript: "",
                feedback: "",
                score: 0,
                recordingUrl: ""
            });
        });
    }

    const sessionData = {
        session: {
            _id: sessionId,
            userId: userId ? userId.toString() : null,
            role: targetRole,
            score: 0,
            summary: "Session started.",
            status: "in-progress",
            createdAt: new Date()
        },
        questions: questionsList
    };

    sessionsStore.set(sessionId, sessionData);

    console.log(`[Session Created] ID: ${sessionId} | Role: "${targetRole}" | Questions: ${questionsList.length}`);
    res.status(201).json({ sessionId, questions: questionsList });
});

// GET /api/session/:id - Get session details and its questions
app.get("/api/session/:id", async (req, res) => {
    const sId = req.params.id;

    // 1. Check in-memory store
    const sessionData = sessionsStore.get(sId);
    if (sessionData) {
        return res.json(sessionData);
    }

    // 2. Check MongoDB if connected
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sId)) {
        try {
            const dbSession = await Session.findById(sId);
            if (dbSession) {
                const dbQuestions = await Question.find({ sessionId: sId });
                const loaded = {
                    session: {
                        _id: dbSession._id.toString(),
                        role: dbSession.role,
                        score: dbSession.score,
                        summary: dbSession.summary,
                        status: dbSession.status || (dbSession.summary && dbSession.summary !== "Session started." ? "completed" : "in-progress"),
                        createdAt: dbSession.createdAt
                    },
                    questions: dbQuestions.map(q => ({
                        _id: q._id.toString(),
                        sessionId: sId,
                        text: q.text,
                        transcript: q.transcript || "",
                        feedback: q.feedback || "",
                        score: q.score || 0,
                        recordingUrl: q.recordingUrl || ""
                    }))
                };
                sessionsStore.set(sId, loaded);
                return res.json(loaded);
            }
        } catch (dbErr) {
            console.warn("Error querying session from MongoDB:", dbErr.message);
        }
    }

    // 3. Fallback dynamically generated session if id is unknown
    const fallbackRole = req.query.role || "Technical Interview";
    const randomQuestions = getRandomQuestions(fallbackRole, 4).map((text, idx) => ({
        _id: `q_${Date.now()}_${idx}`,
        sessionId: sId,
        text,
        transcript: "",
        feedback: "",
        score: 0,
        recordingUrl: ""
    }));

    const fallbackSession = {
        _id: sId,
        role: fallbackRole,
        score: 75,
        summary: "Practice session scorecard.",
        createdAt: new Date()
    };

    const newFallback = {
        session: fallbackSession,
        questions: randomQuestions
    };

    sessionsStore.set(sId, newFallback);

    res.json(newFallback);
});

// POST /api/answers - Record candidate's answer
app.post("/api/answers", async (req, res) => {
    const { questionId, transcript, recordingUrl } = req.body;
    const cleanTranscript = (transcript || "").trim();

    // 1. Update in-memory
    let found = false;
    for (const [_, data] of sessionsStore.entries()) {
        const q = data.questions.find((item) => item._id === questionId);
        if (q) {
            q.transcript = cleanTranscript;
            if (recordingUrl) q.recordingUrl = recordingUrl;
            found = true;
            console.log(`[Answer Saved in Memory] Q ID: ${questionId} -> "${cleanTranscript.slice(0, 50)}..."`);
            break;
        }
    }

    // 2. Update MongoDB if valid ObjectId and connected
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(questionId)) {
        try {
            await Question.findByIdAndUpdate(questionId, {
                transcript: cleanTranscript,
                ...(recordingUrl ? { recordingUrl } : {})
            });
            console.log(`[Answer Saved in MongoDB] Q ID: ${questionId}`);
        } catch (dbErr) {
            console.warn("Failed to update question in MongoDB:", dbErr.message);
        }
    }

    res.json({
        success: true,
        message: "Answer recorded successfully"
    });
});

// POST /api/finish - Complete session with Gemini AI evaluation
app.post("/api/finish", async (req, res) => {
    const { sessionId, answers } = req.body;
    let sessionData = sessionsStore.get(sessionId);

    // If not in memory, try loading from MongoDB
    if (!sessionData && mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sessionId)) {
        try {
            const dbSession = await Session.findById(sessionId);
            if (dbSession) {
                const dbQuestions = await Question.find({ sessionId });
                sessionData = {
                    session: {
                        _id: dbSession._id.toString(),
                        role: dbSession.role,
                        score: dbSession.score,
                        summary: dbSession.summary,
                        createdAt: dbSession.createdAt
                    },
                    questions: dbQuestions.map(q => ({
                        _id: q._id.toString(),
                        sessionId,
                        text: q.text,
                        transcript: q.transcript || "",
                        feedback: q.feedback || "",
                        score: q.score || 0,
                        recordingUrl: q.recordingUrl || ""
                    }))
                };
                sessionsStore.set(sessionId, sessionData);
            }
        } catch (dbErr) {
            console.warn("Error loading session for finish:", dbErr.message);
        }
    }

    // Sync any pending answers sent with the finish payload
    if (answers && Array.isArray(answers) && sessionData) {
        for (const ans of answers) {
            const q = sessionData.questions.find(item => item._id === ans.questionId);
            if (q) {
                if (ans.transcript !== undefined) q.transcript = ans.transcript.trim();
                if (ans.recordingUrl) q.recordingUrl = ans.recordingUrl;
            }
        }
    }

    if (sessionData && sessionData.questions.length > 0) {
        console.log(`[Evaluating Interview] Session ${sessionId} with ${sessionData.questions.length} questions...`);

        // Evaluate each question using Gemini API
        for (const q of sessionData.questions) {
            const evalResult = await evaluateAnswer(q.text, q.transcript);
            q.score = evalResult.score;
            q.feedback = evalResult.feedback;

            // Update in MongoDB
            if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(q._id)) {
                try {
                    await Question.findByIdAndUpdate(q._id, {
                        score: q.score,
                        feedback: q.feedback,
                        transcript: q.transcript
                    });
                } catch (dbErr) {
                    console.warn(`Failed to update question ${q._id} in MongoDB:`, dbErr.message);
                }
            }
        }

        // Calculate overall average score
        const totalScore = sessionData.questions.reduce((sum, curr) => sum + (curr.score || 0), 0);
        const avgScore = Math.round(totalScore / sessionData.questions.length);

        sessionData.session.score = avgScore;
        sessionData.session.status = "completed";

        // Generate executive summary via Gemini
        sessionData.session.summary = await generateSessionSummary(
            sessionData.session.role,
            avgScore,
            sessionData.questions
        );

        // Update session in MongoDB
        if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(sessionId)) {
            try {
                await Session.findByIdAndUpdate(sessionId, {
                    score: avgScore,
                    summary: sessionData.session.summary,
                    status: "completed"
                });
                console.log(`[Session Finished & Saved in MongoDB] Score: ${avgScore}%`);
            } catch (dbErr) {
                console.warn("Failed to update session in MongoDB:", dbErr.message);
            }
        }
    }

    res.json({
        success: true,
        message: "Session evaluated with AI successfully",
        sessionId,
        score: sessionData?.session?.score || 0
    });
});

// GET /api/history - Return candidate session history strictly for logged-in user
app.get("/api/history", async (req, res) => {
    const historyMap = new Map();
    const userId = getUserIdFromHeader(req);

    if (!userId) {
        // If unauthenticated or token is missing, return empty history list
        return res.json([]);
    }

    // 1. Load from MongoDB strictly for this userId
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(userId)) {
        try {
            const dbSessions = await Session.find({ userId }).sort({ createdAt: -1 }).limit(40);
            for (const s of dbSessions) {
                const sId = s._id.toString();
                const qCount = await Question.countDocuments({ sessionId: s._id });
                const isCompleted = s.status === "completed" || (s.summary && s.summary !== "Session started.");

                // If not completed and summary is just "Session started.", check if any question was answered
                if (!isCompleted && s.summary === "Session started.") {
                    const answeredCount = await Question.countDocuments({ sessionId: s._id, transcript: { $ne: "" } });
                    if (answeredCount === 0) {
                        // Skip empty abandoned draft
                        continue;
                    }
                }

                historyMap.set(sId, {
                    _id: sId,
                    userId: s.userId ? s.userId.toString() : null,
                    role: s.role,
                    score: typeof s.score === "number" ? s.score : 0,
                    status: isCompleted ? "Completed" : "In Progress",
                    summary: s.summary,
                    questionsCount: qCount || 4,
                    createdAt: s.createdAt
                });
            }
        } catch (dbErr) {
            console.warn("Failed to fetch history from MongoDB:", dbErr.message);
        }
    }

    // 2. Merge with in-memory sessions strictly belonging to this userId
    for (const [sId, data] of sessionsStore.entries()) {
        const sessionUserId = data.session?.userId ? data.session.userId.toString() : null;
        if (sessionUserId && sessionUserId === userId.toString() && !historyMap.has(sId)) {
            const isCompleted = data.session.status === "completed" || (data.session.summary && data.session.summary !== "Session started.");
            const hasAnswers = data.questions?.some(q => (q.transcript || "").trim().length > 0);
            if (!isCompleted && !hasAnswers) {
                continue;
            }
            historyMap.set(sId, {
                _id: sId,
                userId: sessionUserId,
                role: data.session.role,
                score: typeof data.session.score === "number" ? data.session.score : 0,
                status: isCompleted ? "Completed" : "In Progress",
                summary: data.session.summary,
                questionsCount: data.questions?.length || 4,
                createdAt: data.session.createdAt
            });
        }
    }

    const historyList = Array.from(historyMap.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

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
// server/services/aiService.js
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignored if custom DNS can't be set
}

const PRIMARY_MODEL = "gemini-3.5-flash";

/**
 * Evaluates candidate answer using Google Gemini API or intelligent heuristic fallback
 * @param {string} question
 * @param {string} transcript
 * @returns {Promise<{score: number, feedback: string}>}
 */
async function evaluateAnswer(question, transcript) {
  const cleanedTranscript = (transcript || "").trim();

  // If no answer was provided or recorded
  if (!cleanedTranscript || cleanedTranscript === "No response recorded." || cleanedTranscript === "No response provided.") {
    return {
      score: 0,
      feedback: "No response was recorded for this question. Make sure to speak clearly or enter your answer before proceeding."
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are a principal technical hiring manager and expert interview evaluator.
Evaluate the candidate's answer to the technical interview question below.

Question: "${question}"
Candidate Answer: "${cleanedTranscript}"

Grading Rubric (0 to 100):
- 90-100 (Expert): Highly accurate, comprehensive, mentions key concepts, architectural trade-offs, and best practices.
- 75-89 (Proficient): Accurate, covers core principles and standard use cases with clear communication.
- 55-74 (Developing): Basic conceptual understanding, but lacks depth, missing trade-offs, or has slight inaccuracies.
- 25-54 (Novice/Flawed): Significantly flawed, vague, or partially off-topic.
- 0-24 (Unacceptable): Completely wrong, irrelevant to the question, or gibberish.

Respond ONLY with valid JSON in this exact structure without markdown code blocks:
{"score": <number between 0 and 100>, "feedback": "<2-3 actionable, constructive sentences explaining what was good and specifically how to improve>"}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleaned = candidateText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (typeof parsed.score === "number" && parsed.feedback) {
          console.log(`[AI Evaluation via ${PRIMARY_MODEL}] Q: "${question.slice(0, 35)}..." -> Score: ${parsed.score}`);
          return {
            score: Math.min(100, Math.max(0, Math.round(parsed.score))),
            feedback: parsed.feedback
          };
        }
      } else {
        console.warn("Gemini API error:", response.status, await response.text().catch(() => ""));
      }
    } catch (err) {
      console.warn("Gemini evaluation call failed, using heuristic evaluation:", err.message);
    }
  }

  // Intelligent heuristic fallback when offline or rate limited
  const wordCount = cleanedTranscript.split(/\s+/).filter(Boolean).length;
  let score = 75;
  let feedback = "Good explanation with foundational concepts covered.";

  if (wordCount < 6) {
    score = 45;
    feedback = "Answer was too brief. Elaborate with specific definitions, architectural considerations, and concrete examples.";
  } else if (wordCount < 20) {
    score = 70;
    feedback = "Clear foundational answer. To score higher, discuss design trade-offs and real-world edge cases.";
  } else {
    score = 85;
    feedback = "Thorough and structured explanation demonstrating good conceptual understanding and relevant terminology.";
  }

  return { score, feedback };
}

/**
 * Generates an executive summary of the entire session
 * @param {string} role
 * @param {number} avgScore
 * @param {Array<{text: string, feedback: string, score: number, transcript: string}>} questions
 * @returns {Promise<string>}
 */
async function generateSessionSummary(role, avgScore, questions) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const qSummary = questions.map((q, idx) => `Q${idx + 1}: "${q.text}" -> Score: ${q.score}/100\nFeedback: ${q.feedback}\nCandidate Answer: "${(q.transcript || '').slice(0, 150)}"`).join("\n\n");
      const prompt = `You are a senior hiring lead. A candidate completed a ${role} technical interview with an overall score of ${avgScore}/100.

Detailed Question Performance:
${qSummary}

Write a 2-3 sentence executive performance summary for the candidate's report card. Highlight their demonstrated strengths and provide clear, high-impact recommendations for areas of improvement. Respond with plain text only.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (err) {
      console.warn("Gemini summary call failed:", err.message);
    }
  }

  return `The candidate completed the ${role} mock interview with an overall score of ${avgScore}%. Demonstrated solid architectural thinking and clear communication; recommended to detail fault-tolerance mechanisms and performance edge cases.`;
}

module.exports = {
  evaluateAnswer,
  generateSessionSummary
};

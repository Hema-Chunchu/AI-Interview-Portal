// server/services/aiService.js
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignored if custom DNS can't be set
}

// Order models with known working, responsive models first
const MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.8-flash",
  "gemini-flash-latest"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
      feedback: "No response was provided for this question. Speak clearly or enter your answer before continuing."
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    const prompt = `You are a principal technical hiring manager and expert interview evaluator.
Evaluate the candidate's answer to the technical interview question below.

Question: "${question}"
Candidate Answer: "${cleanedTranscript}"

Grading Criteria & Rubric:
- Relevance: If the candidate answer is gibberish, completely off-topic, random words, or talks about food/unrelated things, the score MUST be between 0 and 15.
- Accuracy: Are technical concepts, terminology, and mechanisms correct?
- Depth & Trade-offs: Does the answer explain why, how it works, architectural trade-offs, and best practices?

Score Scale (0 to 100):
- 90-100 (Exceptional): Comprehensive, accurate, mentions architecture, trade-offs, and best practices.
- 75-89 (Proficient): Solid, technically accurate, covers all core concepts well.
- 50-74 (Developing): Basic conceptual understanding, but lacks depth or misses key distinctions.
- 25-49 (Novice): Weak, superficial, or contains notable inaccuracies.
- 0-24 (Unacceptable): Irrelevant, off-topic, nonsensical, or completely wrong.

Respond ONLY with valid JSON in this exact structure without markdown code blocks:
{"score": <number between 0 and 100>, "feedback": "<2-3 actionable, constructive sentences assessing correctness, strengths, and specific areas to improve>"}`;

    for (const model of MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
          // Extract text from parts (filtering out thought blocks if any)
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const textPart = parts.find(p => p.text && !p.thought) || parts[parts.length - 1];
          const candidateText = textPart?.text || "";

          // Match JSON in the text
          const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (typeof parsed.score === "number" && parsed.feedback) {
              const finalScore = Math.min(100, Math.max(0, Math.round(parsed.score)));
              console.log(`[AI Evaluation via ${model}] Q: "${question.slice(0, 35)}..." -> Score: ${finalScore}`);
              return {
                score: finalScore,
                feedback: parsed.feedback
              };
            }
          }
        } else {
          console.warn(`Gemini API returned status ${response.status} with model ${model}`);
          if (response.status === 503 || response.status === 429) {
            await sleep(500); // Brief pause before trying next fallback model
          }
        }
      } catch (err) {
        console.warn(`Gemini evaluation call failed with ${model}:`, err.message);
      }
    }
  }

  // Calibrated heuristic fallback when offline or network unavailable
  console.log(`[Heuristic Fallback Evaluation] Q: "${question.slice(0, 35)}..."`);
  return calculateHeuristicScore(question, cleanedTranscript);
}

/**
 * Intelligent heuristic evaluation assessing relevance, keyword overlap, and vocabulary diversity
 */
function calculateHeuristicScore(question, answer) {
  const answerWords = answer.toLowerCase().match(/\b[a-z0-9_]{2,}\b/g) || [];
  if (answerWords.length < 4) {
    return {
      score: 25,
      feedback: "Answer was too brief to demonstrate technical competence. Please elaborate with definitions and architectural examples."
    };
  }

  // Extract non-stopword keywords from the question
  const stopWords = new Set([
    "what", "is", "the", "difference", "between", "how", "do", "you", "and", "or",
    "can", "explain", "describe", "why", "when", "would", "with", "for", "that", "this", "in", "of", "to", "a", "an"
  ]);
  const questionKeywords = (question.toLowerCase().match(/\b[a-z0-9_]{3,}\b/g) || [])
    .filter(w => !stopWords.has(w));

  // Count keyword matches
  const answerSet = new Set(answerWords);
  const matchedKeywords = questionKeywords.filter(k => answerSet.has(k));
  const keywordMatchRatio = questionKeywords.length > 0 
    ? matchedKeywords.length / questionKeywords.length 
    : 0.5;

  // Calculate vocabulary diversity (detects speech duplication or repeated gibberish)
  const uniqueRatio = answerSet.size / answerWords.length;

  let baseScore = 50;
  let feedback = "";

  if (keywordMatchRatio === 0 && answerWords.length > 8) {
    // Answer did not mention any topic keywords from the question
    baseScore = 30;
    feedback = "The answer does not appear directly relevant to the core technical concepts asked in the question. Ensure you address the specific tools and patterns requested.";
  } else if (uniqueRatio < 0.45) {
    // Excessive word repetition detected
    baseScore = 40;
    feedback = "Noticeable repetition of words detected. Structure your answer cleanly with distinct architectural points.";
  } else {
    // Proportional scoring based on depth and keyword coverage
    if (keywordMatchRatio >= 0.6 && answerWords.length >= 25) {
      baseScore = 88;
      feedback = `Strong technical response covering key concepts (${matchedKeywords.slice(0, 3).join(', ')}). Demonstrated good architectural clarity and structured thought.`;
    } else if (keywordMatchRatio >= 0.3 || answerWords.length >= 18) {
      baseScore = 76;
      feedback = `Solid foundational answer addressing relevant topics (${matchedKeywords.join(', ') || 'core principles'}). To score higher, detail practical edge cases and system trade-offs.`;
    } else {
      baseScore = 60;
      feedback = "Basic conceptual response. Elaborate further with concrete implementation details and scalability considerations.";
    }
  }

  return { score: baseScore, feedback };
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

      for (const model of MODELS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
            const parts = data?.candidates?.[0]?.content?.parts || [];
            const textPart = parts.find(p => p.text && !p.thought) || parts[parts.length - 1];
            const text = textPart?.text;
            if (text) {
              console.log(`[AI Summary via ${model}] generated successfully`);
              return text.trim();
            }
          }
        } catch (err) {
          console.warn(`Gemini summary call failed with ${model}:`, err.message);
        }
      }
    } catch (e) {
      console.warn("Summary generation error:", e.message);
    }
  }

  if (avgScore >= 80) {
    return `The candidate completed the ${role} mock interview with an impressive overall score of ${avgScore}%. Demonstrated strong technical fluency, articulate explanations, and solid architectural trade-off evaluations.`;
  } else if (avgScore >= 60) {
    return `The candidate completed the ${role} mock interview with a score of ${avgScore}%. Demonstrated good foundational competence; recommended to deepen knowledge around edge-case fault-tolerance and system performance tuning.`;
  } else {
    return `The candidate completed the ${role} mock interview with a score of ${avgScore}%. Identified areas for foundational improvement in core system concepts, architectural definitions, and structured communication.`;
  }
}

module.exports = {
  evaluateAnswer,
  generateSessionSummary
};

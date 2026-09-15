import express from "express";
import cors from "cors";
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY is not configured.");
}

const ai = API_KEY
  ? new GoogleGenAI({
      apiKey: API_KEY
    })
  : null;

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ONLINE",
    service: "J.A.R.V.I.S. Backend",
    version: "2.0"
  });
});

// Health API
app.get("/api/health", (req, res) => {
  res.json({
    online: true,
    aiConfigured: Boolean(API_KEY),
    service: "J.A.R.V.I.S."
  });
});

// AI chat
app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured on the server."
      });
    }

    const { message, context = "" } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    const prompt = `
You are J.A.R.V.I.S., a helpful futuristic personal AI assistant.

Personality:
- Calm
- Intelligent
- Clear
- Helpful
- Slightly futuristic
- Never pretend you performed an action you cannot actually perform

User context:
${context || "No additional context."}

User message:
${message}

Answer naturally and concisely.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });

    const reply = response.text?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    res.json({
      success: true,
      reply
    });

  } catch (error) {
    console.error("JARVIS AI ERROR:", error);

    res.status(500).json({
      success: false,
      error: "J.A.R.V.I.S. could not process the request."
    });
  }
});

app.listen(PORT, () => {
  console.log(`J.A.R.V.I.S. backend running on port ${PORT}`);
});

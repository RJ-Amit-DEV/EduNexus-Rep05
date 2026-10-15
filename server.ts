import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Authenticated Smart AI Scheduler proxy. Gemini credentials stay server-side.
  app.post("/api/generate-content", async (req, res) => {
    const authorization = req.headers.authorization;
    const token = typeof authorization === "string" && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    if (!token) return res.status(401).json({ error: "Sign in to use Smart AI Scheduler." });

    try {
      const identityResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token })
        }
      );
      if (!identityResponse.ok) {
        return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
      }

      const { contents, config } = req.body ?? {};
      if (!Array.isArray(contents) || !config || typeof config !== "object") {
        return res.status(400).json({ error: "Invalid AI request." });
      }
      if (JSON.stringify(req.body).length > 120_000) {
        return res.status(413).json({ error: "Request is too large. Shorten the syllabus and try again." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(503).json({ error: "Smart AI Scheduler is not configured on the server." });
      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config
      });
      return res.json({ text: result.text || "" });
    } catch (error) {
      console.error("Scheduler AI request failed:", error);
      return res.status(500).json({ error: "AI generation failed. Please retry in a moment." });
    }
  });

  // YouTube Search API Proxy
  app.get("/api/youtube-search", async (req, res) => {
    const { q } = req.query;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "YouTube API key not configured on server." });
    }

    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required." });
    }

    try {
      const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=3&order=relevance&q=${encodeURIComponent(q as string)}&key=${apiKey}`;
      const response = await fetch(youtubeUrl);
      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      // Return only necessary data (Video IDs and titles)
      const videos = data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
      }));

      res.json({ videos });
    } catch (error) {
      console.error("YouTube API Error:", error);
      res.status(500).json({ error: "Failed to fetch videos from YouTube." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

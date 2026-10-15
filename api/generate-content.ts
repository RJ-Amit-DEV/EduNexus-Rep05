import { GoogleGenAI } from '@google/genai';
import firebaseConfig from '../firebase-applet-config.json';

type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};
type ResponseLike = {
  status(code: number): ResponseLike;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const authorization = req.headers.authorization;
  const token = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : '';
  if (!token) return res.status(401).json({ error: 'Sign in to use Smart AI Scheduler.' });

  try {
    const identityResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token })
      }
    );
    if (!identityResponse.ok) {
      return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
    }

    const payload = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
      contents?: unknown;
      config?: Record<string, unknown>;
    } | null;
    if (!payload || !Array.isArray(payload.contents) || !payload.config || typeof payload.config !== 'object') {
      return res.status(400).json({ error: 'Invalid AI request.' });
    }
    if (JSON.stringify(payload).length > 120_000) {
      return res.status(413).json({ error: 'Request is too large. Shorten the syllabus and try again.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Smart AI Scheduler is not configured on the server.' });

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: payload.contents as never,
      config: payload.config as never
    });
    return res.status(200).json({ text: result.text || '' });
  } catch (error) {
    console.error('Scheduler AI request failed:', error);
    return res.status(500).json({ error: 'AI generation failed. Please retry in a moment.' });
  }
}

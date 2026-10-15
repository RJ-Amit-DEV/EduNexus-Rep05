type RequestLike = { method?: string; query?: Record<string, string | string[] | undefined> };
type ResponseLike = { status(code: number): ResponseLike; json(body: unknown): void; setHeader(name: string, value: string): void };

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const rawQuery = req.query?.q;
  const q = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim();
  if (!q) return res.status(400).json({ error: "Query parameter 'q' is required." });
  if (q.length > 200) return res.status(400).json({ error: 'Search query is too long.' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Video search is not configured on the server.' });

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', '3');
    url.searchParams.set('order', 'relevance');
    url.searchParams.set('q', q);
    url.searchParams.set('key', apiKey);
    const response = await fetch(url);
    if (!response.ok) return res.status(response.status).json({ error: 'Video search provider returned an error.' });
    const data = await response.json() as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; thumbnails?: { medium?: { url?: string } } } }> };
    const videos = (data.items || []).flatMap(item => {
      const id = item.id?.videoId;
      const title = item.snippet?.title;
      const thumbnail = item.snippet?.thumbnails?.medium?.url;
      return id && title && thumbnail ? [{ id, title, thumbnail }] : [];
    });
    return res.status(200).json({ videos });
  } catch (error) {
    console.error('YouTube search failed:', error);
    return res.status(500).json({ error: 'Unable to search videos right now.' });
  }
}

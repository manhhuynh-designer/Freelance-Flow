import { NextResponse } from 'next/server';

// Ensure Node.js runtime for server-side SDKs
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const texts = body?.texts;
    const providedKey = body?.apiKey;
    const provider = body?.provider || 'google';
    const model = body?.model;
    if (!Array.isArray(texts)) return NextResponse.json({ error: 'texts must be array' }, { status: 400 });

    if (provider === 'openai') {
      // Strictly require user-provided API key (from settings). Do not use server env fallbacks.
      const key = providedKey;
      if (!key) return NextResponse.json({ error: 'OpenAI apiKey is required in request body' }, { status: 400 });
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: key });
      const resp = await client.embeddings.create({ model: model || 'text-embedding-3-small', input: texts });
      const embeddings = resp.data.map((d: any) => d.embedding);
      return NextResponse.json({ embeddings });
    }

    // Default: Google Generative API (Gemini)
    // Strictly require user-provided API key (from settings). Do not use server env fallbacks.
    const gKey = providedKey;
    if (!gKey) return NextResponse.json({ error: 'Google apiKey is required in request body' }, { status: 400 });
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const gen = new GoogleGenerativeAI(gKey);
    const mdl = gen.getGenerativeModel({ model: model || 'text-embedding-004' });
    try {
      // Prefer batch API when available
      const resp = await (mdl as any).batchEmbedContents?.({
        requests: texts.map((t: string) => ({
          content: { parts: [{ text: t }] },
        })),
      });
      if (resp?.embeddings) {
        const embeddings = resp.embeddings.map((e: any) => e?.values || []);
        return NextResponse.json({ embeddings });
      }
    } catch {}
    // Fallback to single requests if batch is unavailable
    const results = await Promise.all(
      texts.map(async (t: string) => {
        try {
          const r = await (mdl as any).embedContent?.({ content: { parts: [{ text: t }] } });
          return r?.embedding?.values || [];
        } catch {
          return [];
        }
      })
    );
    return NextResponse.json({ embeddings: results });
  } catch (e: any) {
    console.error('Embeddings route error:', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

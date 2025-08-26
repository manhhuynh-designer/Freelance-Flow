// Minimal embedding bridge. By default, uses OpenAI/Text-Embedding-3-small if OPENAI_API_KEY is present in server env.
// On client we expect the caller to request embeddings via a server endpoint.

export async function getEmbeddingsForTexts(texts: string[], options?: { provider?: 'google' | 'openai', apiKey?: string, model?: string }) {
  // server-only path: use dynamic import if running in Node
  if (typeof window === 'undefined') {
    try {
      // Require explicit API key on server path to match client behavior
      const apiKey = options?.apiKey;
      const provider = options?.provider || 'google';
      if (!apiKey) {
        console.warn('Embeddings: missing apiKey (server). Returning empty vectors.');
        return texts.map(() => [] as number[]);
      }
      // Only support Google Gemini
      const Google = require('@google/generative-ai');
      const gen = new (Google as any).GoogleGenerativeAI(apiKey);
      const model = gen.getGenerativeModel({ model: options?.model || 'text-bison-001' });
      // Try embed method (client library shape may vary)
      if (typeof model.embed === 'function') {
        const resp = await model.embed({ input: texts });
        return resp?.data?.map((d: any) => d?.embedding || []) || texts.map(() => [] as number[]);
      }
      // Fallback: empty vectors
      return texts.map(() => [] as number[]);
    } catch (e) {
      console.warn('Embeddings failed (server):', e);
      return texts.map(() => [] as number[]);
    }
  }

  // client-side: call /api/embeddings
  try {
    const body: any = { texts };
    // prefer google provider by default
  if ((options as any)?.apiKey) body.apiKey = (options as any).apiKey;
  if ((options as any)?.model) body.model = (options as any).model;
  if ((options as any)?.provider) body.provider = (options as any).provider;
    const res = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      console.warn(`Embeddings API failed: ${res.status} ${res.statusText}`);
      return texts.map(() => [] as number[]);
    }
    const json = await res.json();
    return json.embeddings as number[][];
  } catch (e) {
    console.warn('Embeddings client call failed:', e);
    return texts.map(() => [] as number[]);
  }
}

import type { VectorDB, Document, QueryResult } from './types';

export class InMemoryVectorDB implements VectorDB {
  private store: Map<string, { doc: Document; vector: number[] }> = new Map();

  async upsert(docs: Document[]): Promise<void> {
    docs.forEach(d => {
      if (!d.vector) return; // require vector for in-memory indexing
      this.store.set(d.id, { doc: d, vector: d.vector });
    });
  }

  async query(query: string | number[], limit = 5): Promise<QueryResult[]> {
    // if query is a string, can't compute embedding here; caller should convert to vector
    const qvec = Array.isArray(query) ? query : null;
    if (!qvec) return [];

    const results: QueryResult[] = [];
    for (const [id, { doc, vector }] of this.store) {
      const score = cosineSimilarity(qvec, vector);
      results.push({ id, score, metadata: doc.metadata, text: doc.text });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

function dot(a: number[], b: number[]) { return a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0); }
function norm(a: number[]) { return Math.sqrt(a.reduce((s, x) => s + x * x, 0)); }
function cosineSimilarity(a: number[], b: number[]) { return dot(a, b) / ((norm(a) * norm(b)) || 1e-8); }

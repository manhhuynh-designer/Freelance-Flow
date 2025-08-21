import type { VectorDB, Document } from './types';
import { InMemoryVectorDB } from './in-memory';

// Singleton vector DB instance (for client-side usage or serverless adapter)
const db: VectorDB = new InMemoryVectorDB();

export const VectorDBService = {
  upsert: async (docs: Document[]) => db.upsert(docs),
  query: async (q: number[] | string, limit = 5) => db.query(q, limit),
  delete: async (id: string) => db.delete(id),
  clear: async () => db.clear(),
};

export default VectorDBService;

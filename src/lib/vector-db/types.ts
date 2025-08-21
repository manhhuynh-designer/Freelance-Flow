export type Document = {
  id: string;
  text: string;
  metadata?: Record<string, any>;
  vector?: number[];
};

export type QueryResult = {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  text?: string;
};

export interface VectorDB {
  upsert(docs: Document[]): Promise<void>;
  query(query: string | number[], limit?: number): Promise<QueryResult[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

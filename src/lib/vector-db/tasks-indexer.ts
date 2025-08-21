import type { Document } from './types';
import { getEmbeddingsForTexts } from './embeddings';
import VectorDBService from './service';
import { persistTaskVectors } from './persistence';

export async function indexTasks(tasks: any[], options?: { apiKey?: string, model?: string }) {
  if (!tasks || tasks.length === 0) return;
  
  const docs: Document[] = tasks.map(t => ({ 
    id: `task:${t.id}`, 
    text: `${t.title || t.name || ''}\n${t.description || ''}`, 
    metadata: { taskId: t.id, project: t.projectId } 
  }));
  
  const texts = docs.map(d => d.text);
  
  try {
    const embeddings = await getEmbeddingsForTexts(texts, { provider: 'google', apiKey: options?.apiKey, model: options?.model });
    
    // Check if we got valid embeddings
    const hasValidEmbeddings = embeddings.some((emb: number[]) => emb && emb.length > 0);
    if (!hasValidEmbeddings) {
      console.warn('No valid embeddings returned, skipping vector persistence');
      return;
    }
    
    const docsWithVec = docs.map((d, i) => ({ ...d, vector: embeddings[i] }));
    
    // Persist vectors into PouchDB for offline use, then upsert into vector DB
    try { 
      await persistTaskVectors(docsWithVec); 
      console.info(`✅ Persisted ${docsWithVec.length} task vectors to PouchDB`);
    } catch (e) { 
      console.warn('persistTaskVectors failed:', e); 
    }
    
    await VectorDBService.upsert(docsWithVec);
    console.info(`✅ Upserted ${docsWithVec.length} vectors to in-memory DB`);
  } catch (e: any) {
    console.warn('Embedding generation failed:', e.message || e);
    throw e;
  }
}

export async function queryTasks(query: string, limit = 5, options?: { apiKey?: string, model?: string }) {
  const emb = await getEmbeddingsForTexts([query], { provider: 'google', apiKey: options?.apiKey, model: options?.model });
  if (!emb[0] || emb[0].length === 0) return [];
  const results = await VectorDBService.query(emb[0], limit);
  return results;
}

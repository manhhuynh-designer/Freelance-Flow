import { PouchDBService } from '@/lib/pouchdb-service';
import type { Document } from './types';

/**
 * Persist vectors into the PouchDB 'tasks' document.
 * Expects docs with id `task:<taskId>` and vector field present.
 */
export async function persistTaskVectors(docs: Document[]): Promise<void> {
  try {
    // Load current tasks
    const tasksDoc = await PouchDBService.getDocument('tasks');
    const currentTasks: any[] = (tasksDoc as any)?.data || [];

    const map = new Map<string, number[]>();
    docs.forEach(d => {
      if (d.id?.startsWith('task:') && Array.isArray(d.vector) && d.vector.length > 0) {
        const taskId = d.id.slice(5);
        map.set(taskId, d.vector);
      }
    });

    if (map.size === 0) return;

    const updated = currentTasks.map(t => {
      const vec = map.get(t.id);
      if (vec) return { ...t, vector: vec };
      return t;
    });

    await PouchDBService.setDocument('tasks', updated);
  } catch (e) {
    console.error('Failed to persist task vectors:', e);
  }
}

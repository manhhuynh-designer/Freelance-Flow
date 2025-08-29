import { initialAppData } from '@/lib/data';
import type { AppData } from '@/lib/types';
import type PouchDB from 'pouchdb-browser';

let db: PouchDB.Database | null = null;
let dbPromise: Promise<PouchDB.Database> | null = null;

async function getDb(): Promise<PouchDB.Database> {
  if (db) return db;
  if (dbPromise) return dbPromise;
  
  dbPromise = (async () => {
    const PouchDBModule = await import('pouchdb-browser');
    db = new PouchDBModule.default('freelance_flow_data');
    return db;
  })();
  return dbPromise;
}

// Use camelCase IDs consistently across the app to match initialAppData keys
export type DocumentID =
  | 'appSettings' | 'tasks' | 'clients' | 'collaborators' | 'categories'
  | 'quotes' | 'collaboratorQuotes' | 'quoteTemplates' | 'notes' | 'events' | 'workSessions'
  | 'fixedCosts' | 'expenses' | 'aiAnalyses' | 'aiProductivityAnalyses'; // ADDED

// Keep a utility to hard-reset the DB when explicitly requested by the app (not used automatically).
async function destroyAndRecreateDb(): Promise<PouchDB.Database> {
  console.warn("[DEBUG] Destroying existing DB by explicit request...");
  const PouchDBModule = await import('pouchdb-browser');
  const oldDb = new PouchDBModule.default('freelance_flow_data');
  await oldDb.destroy();
  console.log("[DEBUG] DB Destroyed. Recreating...");
  db = new PouchDBModule.default('freelance_flow_data');
  dbPromise = Promise.resolve(db);
  return db;
}


export const PouchDBService = {
  async getDocument<T>(id: DocumentID): Promise<(T & { _id: string; _rev: string }) | null> {
    const db = await getDb();
    try { return await db.get(id) as any; } catch (e) { return null; }
  },

  async setDocument(id: DocumentID, data: any): Promise<void> {
    const db = await getDb();
    try {
      const doc = await this.getDocument(id);
      if (doc && (doc as any)._rev) {
        await db.put({ _id: id, _rev: (doc as any)._rev, data });
      } else {
        await db.put({ _id: id, data });
      }
    } catch (err) {
      console.error(`[PouchDB] setDocument failed for '${id}':`, err);
      throw err;
    }
  },

  async loadAppData(): Promise<AppData> {
      console.log("[DEBUG] loadAppData starting...");
      const database = await getDb();

      // Known document IDs (camelCase) for stability
      const ids: DocumentID[] = [
        'appSettings', 'tasks', 'clients', 'collaborators', 'categories',
        'quotes', 'collaboratorQuotes', 'quoteTemplates', 'notes', 'events', 'workSessions',
        'fixedCosts', 'expenses', 'aiAnalyses', 'aiProductivityAnalyses' // ADDED
      ];

      // Migration: copy data from legacy snake_case IDs to new camelCase IDs if needed
      try {
        const legacyMap: Record<string, DocumentID> = {
          app_settings: 'appSettings',
          collaborator_quotes: 'collaboratorQuotes',
          quote_templates: 'quoteTemplates',
          work_sessions: 'workSessions',
        };
        for (const [oldId, newId] of Object.entries(legacyMap)) {
          let oldDoc: any = null;
          try { oldDoc = await database.get(oldId); } catch {}
          const newDoc = await this.getDocument(newId);
          if (oldDoc && !newDoc) {
            console.log(`[DEBUG] Migrating legacy doc '${oldId}' -> '${newId}'`);
            await database.put({ _id: newId, data: oldDoc.data });
          }
        }
      } catch (err) {
        console.error('[ERROR] Legacy migration failed:', err);
      }

      // Ensure each top-level document exists; never destroy the DB automatically.
      try {
        for (const id of ids) {
          const existing = await this.getDocument(id);
          if (!existing) {
            const docData = (initialAppData as any)[id] ?? (Array.isArray((initialAppData as any)[id]) ? [] : (id === 'appSettings' ? (initialAppData as any).appSettings : []));
            console.log(`[DEBUG] Missing doc '${id}'. Initializing with defaults...`);
            await database.put({ _id: id, data: docData });
          }
        }
      } catch (err) {
        console.error("[ERROR] Ensuring default documents failed:", err);
      }

      // Fetch all documents explicitly by ID to avoid key-order bugs
      const [appSettingsDoc, tasksDoc, clientsDoc, collaboratorsDoc, categoriesDoc, quotesDoc, collaboratorQuotesDoc, quoteTemplatesDoc, notesDoc, eventsDoc, workSessionsDoc, fixedCostsDoc, expensesDoc, aiAnalysesDoc, aiProductivityAnalysesDoc] = await Promise.all(ids.map(id => this.getDocument(id)));

      const loadedData: AppData = {
          appSettings: (appSettingsDoc as any)?.data ?? initialAppData.appSettings,
          tasks: (tasksDoc as any)?.data ?? [],
          clients: (clientsDoc as any)?.data ?? [],
          collaborators: (collaboratorsDoc as any)?.data ?? [],
          categories: (categoriesDoc as any)?.data ?? [],
          quotes: (quotesDoc as any)?.data ?? [],
          collaboratorQuotes: (collaboratorQuotesDoc as any)?.data ?? [],
          quoteTemplates: (quoteTemplatesDoc as any)?.data ?? [],
          notes: (notesDoc as any)?.data ?? [],
          events: (eventsDoc as any)?.data ?? [],
          workSessions: (workSessionsDoc as any)?.data ?? [],
          fixedCosts: (fixedCostsDoc as any)?.data ?? [],
          expenses: (expensesDoc as any)?.data ?? [],
          aiAnalyses: (aiAnalysesDoc as any)?.data ?? [], // ADDED
          aiProductivityAnalyses: (aiProductivityAnalysesDoc as any)?.data ?? [], // ADDED
      };
      console.log("[DEBUG] loadAppData finished. Task count:", loadedData.tasks.length);
      return loadedData;
  }
};
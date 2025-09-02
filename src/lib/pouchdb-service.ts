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
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const doc = await this.getDocument(id);
        if (doc && (doc as any)._rev) {
          await db.put({ _id: id, _rev: (doc as any)._rev, data });
        } else {
          await db.put({ _id: id, data });
        }
        return; // Success, exit the loop
      } catch (err: any) {
        attempts++;
        
        // Handle conflicts by refetching the latest revision
        if (err.name === 'conflict' && attempts < maxAttempts) {
          console.warn(`[PouchDB] Conflict detected for document '${id}', retrying... (attempt ${attempts}/${maxAttempts})`);
          // Wait a brief moment before retrying
          await new Promise(resolve => setTimeout(resolve, 50 * attempts));
          continue;
        }
        
        // For other errors or max attempts reached, throw the error
        console.error(`[PouchDB] setDocument failed for '${id}' after ${attempts} attempts:`, err);
        throw err;
      }
    }
  },

  async removeDocument(id: DocumentID): Promise<void> {
    const db = await getDb();
    try {
      const doc = await this.getDocument(id);
      if (doc) {
        await db.remove(doc._id, doc._rev);
      }
    } catch (err) {
      console.error(`[PouchDB] removeDocument failed for '${id}':`, err);
      // Don't throw if document doesn't exist, as this is expected for optional docs.
      // Re-throw for other errors.
      if (! (err instanceof Error && err.name === 'not_found') ) {
          throw err;
      }
    }
  },

  // Recovery method to handle severe database conflicts
  async recoverFromConflicts(): Promise<void> {
    console.warn("[PouchDB] Attempting database conflict recovery...");
    const database = await getDb();
    
    try {
      // Get all documents and resolve any conflicts
      const result = await database.allDocs({ include_docs: true, conflicts: true });
      
      for (const row of result.rows) {
        if (row.doc && (row.doc as any)._conflicts) {
          console.warn(`[PouchDB] Resolving conflict for document: ${row.id}`);
          
          // For each conflicted document, keep the latest revision and delete conflicts
          const conflicts = (row.doc as any)._conflicts;
          for (const conflictRev of conflicts) {
            try {
              await database.remove(row.id, conflictRev);
              console.log(`[PouchDB] Removed conflicted revision ${conflictRev} for ${row.id}`);
            } catch (err) {
              console.warn(`[PouchDB] Could not remove conflict revision:`, err);
            }
          }
        }
      }
      
      console.log("[PouchDB] Conflict recovery completed successfully");
    } catch (err) {
      console.error("[PouchDB] Conflict recovery failed:", err);
      throw err;
    }
  },

  async loadAppData(): Promise<AppData> {
      console.log("[DEBUG] loadAppData starting...");
      
      let database: PouchDB.Database;
      let recoveryAttempted = false;
      
      try {
        database = await getDb();
      } catch (err: any) {
        if (err.name === 'conflict' && !recoveryAttempted) {
          console.warn("[PouchDB] Conflict detected during database initialization, attempting recovery...");
          await this.recoverFromConflicts();
          database = await getDb();
          recoveryAttempted = true;
        } else {
          throw err;
        }
      }

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
            
            // Use conflict-resistant initialization
            let initAttempts = 0;
            const maxInitAttempts = 3;
            
            while (initAttempts < maxInitAttempts) {
              try {
                await database.put({ _id: id, data: docData });
                break; // Success, exit the loop
              } catch (initErr: any) {
                initAttempts++;
                
                if (initErr.name === 'conflict' && initAttempts < maxInitAttempts) {
                  console.warn(`[PouchDB] Conflict during initialization of '${id}', retrying... (attempt ${initAttempts}/${maxInitAttempts})`);
                  // Check if document was created by another process
                  const recheckExisting = await this.getDocument(id);
                  if (recheckExisting) {
                    console.log(`[DEBUG] Document '${id}' was created by another process, continuing...`);
                    break;
                  }
                  await new Promise(resolve => setTimeout(resolve, 100 * initAttempts));
                  continue;
                }
                
                console.error(`[ERROR] Failed to initialize document '${id}' after ${initAttempts} attempts:`, initErr);
                break; // Don't throw, just log and continue with other documents
              }
            }
          }
        }
      } catch (err) {
        console.error("[ERROR] Ensuring default documents failed:", err);
      }

      // Fetch all documents explicitly by ID to avoid key-order bugs
      let documents;
      try {
        documents = await Promise.all(ids.map(id => this.getDocument(id)));
      } catch (err: any) {
        if (err.name === 'conflict' && !recoveryAttempted) {
          console.warn("[PouchDB] Conflict detected during document fetching, attempting recovery...");
          await this.recoverFromConflicts();
          documents = await Promise.all(ids.map(id => this.getDocument(id)));
        } else {
          throw err;
        }
      }
      
      const [appSettingsDoc, tasksDoc, clientsDoc, collaboratorsDoc, categoriesDoc, quotesDoc, collaboratorQuotesDoc, quoteTemplatesDoc, notesDoc, eventsDoc, workSessionsDoc, fixedCostsDoc, expensesDoc, aiAnalysesDoc, aiProductivityAnalysesDoc] = documents;

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
  },

  // Utility method to manually trigger conflict recovery
  async manualRecovery(): Promise<void> {
    console.log("[PouchDB] Manual recovery initiated...");
    try {
      await this.recoverFromConflicts();
      console.log("[PouchDB] Manual recovery completed successfully");
    } catch (err) {
      console.error("[PouchDB] Manual recovery failed:", err);
      throw err;
    }
  },

  // Method to check database health
  async checkDatabaseHealth(): Promise<{ healthy: boolean; conflicts: number; totalDocs: number }> {
    try {
      const database = await getDb();
      const result = await database.allDocs({ include_docs: true, conflicts: true });
      
      let conflictCount = 0;
      for (const row of result.rows) {
        if (row.doc && (row.doc as any)._conflicts) {
          conflictCount += (row.doc as any)._conflicts.length;
        }
      }
      
      return {
        healthy: conflictCount === 0,
        conflicts: conflictCount,
        totalDocs: result.total_rows
      };
    } catch (err) {
      console.error("[PouchDB] Health check failed:", err);
      return { healthy: false, conflicts: -1, totalDocs: -1 };
    }
  }
};
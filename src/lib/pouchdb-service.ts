import PouchDB from 'pouchdb-browser';
import type { AppData } from '@/lib/types';

// We can use a single database and distinguish between document types using a 'type' field.
// Or, we can use multiple databases. For simplicity and since the data is all related,
// a single database with a 'type' property on documents is often a good starting point.
// However, the existing AppData structure is one large object. We'll store different
// parts of it as separate documents.

const db = new PouchDB('freelance_flow_data');

export type DocumentID = 
  | 'app_settings'
  | 'tasks'
  | 'clients'
  | 'collaborators'
  | 'categories'
  | 'quotes'
  | 'collaborator_quotes'
  | 'quote_templates'
  | 'notes'
  | 'events'
  | 'work_sessions';

export const PouchDBService = {
  // Get a single document by its ID
  async getDocument<T>(id: DocumentID): Promise<(T & { _id: string; _rev: string }) | null> {
    try {
      const doc = await db.get(id);
      return doc as T & { _id: string; _rev: string };
    } catch (err: any) {
      if (err.name === 'not_found') {
        return null;
      }
      console.error(`Error getting document '${id}':`, err);
      throw err;
    }
  },

  // Update or insert a document
  async setDocument(id: DocumentID, data: any): Promise<void> {
    try {
      const doc = await this.getDocument(id);
      await db.put({
        _id: id,
        _rev: doc ? doc._rev : undefined,
        ...data,
      });
    } catch (err) {
      console.error(`Error setting document '${id}':`, err);
      throw err;
    }
  },

  // Load the entire AppData state, initializing if it doesn't exist
  async loadAppData(initialData: AppData): Promise<AppData> {
    console.log("Attempting to load data from PouchDB...");
    
    const settingsDoc = await this.getDocument<AppData['appSettings']>('app_settings');
    const tasksDoc = await this.getDocument<{ data: AppData['tasks'] }>('tasks');
    const clientsDoc = await this.getDocument<{ data: AppData['clients'] }>('clients');
    const collaboratorsDoc = await this.getDocument<{ data: AppData['collaborators'] }>('collaborators');
    const categoriesDoc = await this.getDocument<{ data: AppData['categories'] }>('categories');
    const quotesDoc = await this.getDocument<{ data: AppData['quotes'] }>('quotes');
    const collabQuotesDoc = await this.getDocument<{ data: AppData['collaboratorQuotes'] }>('collaborator_quotes');
    const templatesDoc = await this.getDocument<{ data: AppData['quoteTemplates'] }>('quote_templates');
    const notesDoc = await this.getDocument<{ data: AppData['notes'] }>('notes');
    const eventsDoc = await this.getDocument<{ data: AppData['events'] }>('events');
    const workSessionsDoc = await this.getDocument<{ data: AppData['workSessions'] }>('work_sessions');
    
    // If settings don't exist, we assume it's a fresh database
    if (!settingsDoc) {
      console.log("No data found in PouchDB. Initializing with provided data.");
      await this.setDocument('app_settings', initialData.appSettings);
      await this.setDocument('tasks', { data: initialData.tasks });
      await this.setDocument('clients', { data: initialData.clients });
      await this.setDocument('collaborators', { data: initialData.collaborators });
      await this.setDocument('categories', { data: initialData.categories });
      await this.setDocument('quotes', { data: initialData.quotes });
      await this.setDocument('collaborator_quotes', { data: initialData.collaboratorQuotes });
      await this.setDocument('quote_templates', { data: initialData.quoteTemplates });
      await this.setDocument('notes', { data: initialData.notes });
      await this.setDocument('events', { data: initialData.events });
      await this.setDocument('work_sessions', { data: initialData.workSessions });
      return initialData;
    }

    console.log("Data loaded successfully from PouchDB.");
    return {
      appSettings: settingsDoc,
      tasks: tasksDoc?.data ?? [],
      clients: clientsDoc?.data ?? [],
      collaborators: collaboratorsDoc?.data ?? [],
      categories: categoriesDoc?.data ?? [],
      quotes: quotesDoc?.data ?? [],
      collaboratorQuotes: collabQuotesDoc?.data ?? [],
      quoteTemplates: templatesDoc?.data ?? [],
      notes: notesDoc?.data ?? [],
      events: eventsDoc?.data ?? [],
      workSessions: workSessionsDoc?.data ?? [],
    };
  },

  // Migrate data from localStorage if it exists and PouchDB is empty
  async migrateFromLocalStorage(): Promise<boolean> {
    const settingsDoc = await this.getDocument('app_settings');
    const storageKey = 'freelance-flow-data';
    const storedDataString = localStorage.getItem(storageKey);

    if (!settingsDoc && storedDataString) {
      console.log("Found localStorage data and empty PouchDB. Migrating...");
      try {
        const localData: AppData = JSON.parse(storedDataString);
        await this.loadAppData(localData); // Use loadAppData to populate
        
        // Optionally, rename old localStorage key to prevent re-migration
        localStorage.removeItem(storageKey);
        localStorage.setItem(`${storageKey}_migrated`, new Date().toISOString());

        console.log("Migration successful!");
        return true;
      } catch (err) {
        console.error("Migration from localStorage failed:", err);
        return false;
      }
    }
    return false; // No migration needed
  },

  async getTasks(): Promise<AppData['tasks']> {
    const doc = await this.getDocument<{ data: AppData['tasks'] }>('tasks');
    return doc?.data ?? [];
  },

  async saveTasks(tasks: AppData['tasks']): Promise<void> {
    await this.setDocument('tasks', { data: tasks });
  }

  // We will add more specific methods (e.g., saveSingleTask, getClientById) later as we refactor.
};
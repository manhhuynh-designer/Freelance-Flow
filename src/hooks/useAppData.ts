"use client";

import { useQuery, useMutation, useQueryClient } from 'react-query';
import { initialAppData } from '@/lib/data';
import type { AppData, Client, Task, Quote, CollaboratorQuote } from '@/lib/types';
import { PouchDBService, DocumentID } from '@/lib/pouchdb-service';
import { i18n } from '@/lib/i18n';
import { useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { indexTasks } from '@/lib/vector-db/tasks-indexer';
import VectorDBService from '@/lib/vector-db/service';

const noop = (...args: any[]) => {};

const safeInitialAppData: AppData = {
    ...initialAppData,
    workSessions: initialAppData.workSessions || [],
};

const parseDates = (data: AppData): AppData => {
  if (data?.tasks) {
    data.tasks = data.tasks.map(task => {
      const safeParseDate = (date: any): Date => {
        if (!date) return new Date();
        
        // Handle if it's already a valid Date object
        if (date instanceof Date && !isNaN(date.getTime())) {
          return date;
        }
        
        // Handle string dates (ISO strings, timestamps, etc.)
        if (typeof date === 'string' || typeof date === 'number') {
          const parsed = new Date(date);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
        
        return new Date(); // fallback to current date
      };

      return {
        ...task,
        startDate: safeParseDate(task.startDate),
        deadline: safeParseDate(task.deadline),
      };
    });
  }
  return data;
};

const getLoadingState = () => ({
  appData: safeInitialAppData,
  isDataLoaded: false,
  T: i18n.en,
  setAppData: noop,
  updateTask: noop,
  handleDeleteTask: noop,
  updateQuote: noop,
  updateCollaboratorQuote: noop,
  handleEditTask: noop,
  handleAddClientAndSelect: () => safeInitialAppData.clients[0],
});

export function useAppData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: appData, isLoading, error } = useQuery('appData', 
    async () => {
      try {
        return await PouchDBService.loadAppData().then(parseDates);
      } catch (err: any) {
        console.error('[useAppData] Error loading data:', err);
        
        // If it's a conflict error, try recovery once
        if (err.name === 'conflict') {
          console.warn('[useAppData] Detected conflict, attempting automatic recovery...');
          try {
            await PouchDBService.manualRecovery();
            console.log('[useAppData] Recovery successful, retrying data load...');
            return await PouchDBService.loadAppData().then(parseDates);
          } catch (recoveryErr) {
            console.error('[useAppData] Recovery failed:', recoveryErr);
            toast({
              title: "Database Conflict Detected",
              description: "There was a conflict accessing your data. Please refresh the page or contact support if this persists.",
              variant: "destructive",
              duration: 10000,
            });
            // Return safe initial data as fallback
            return parseDates(safeInitialAppData);
          }
        }
        
        // For other errors, show a general error and return fallback data
        toast({
          title: "Data Loading Error", 
          description: "Could not load your data. Using defaults. Please refresh the page.",
          variant: "destructive",
          duration: 8000,
        });
        return parseDates(safeInitialAppData);
      }
    }, 
    {
      refetchOnWindowFocus: false, 
      staleTime: Infinity,
      retry: false, // Don't retry automatically, we handle it ourselves
    });
  
  const mutation = useMutation('updateAppData',
    async (updates: Partial<AppData>) => {
      const currentData = queryClient.getQueryData<AppData>('appData') ?? safeInitialAppData;
      const newData = { ...currentData, ...updates };
      
      try {
        await Promise.all(Object.keys(updates).map(key => PouchDBService.setDocument(key as DocumentID, newData[key as keyof AppData])));
        return newData;
      } catch (err: any) {
        console.error('[useAppData] Mutation error:', err);
        
        if (err.name === 'conflict') {
          console.warn('[useAppData] Conflict during save, attempting recovery and retry...');
          try {
            await PouchDBService.manualRecovery();
            // Retry the save operation
            await Promise.all(Object.keys(updates).map(key => PouchDBService.setDocument(key as DocumentID, newData[key as keyof AppData])));
            return newData;
          } catch (retryErr) {
            console.error('[useAppData] Retry after recovery failed:', retryErr);
            throw new Error('Failed to save data due to database conflicts. Please try again.');
          }
        }
        
        throw err; // Re-throw non-conflict errors
      }
    },
    {
      onSuccess: (updatedData) => { queryClient.setQueryData('appData', parseDates(updatedData)); },
      onError: (error: any) => { 
        toast({ 
          title: "Data Sync Error", 
          description: error.message || "Failed to save data. Please try again.", 
          variant: "destructive",
          duration: 6000,
        }); 
      },
    }
  );
  
  const handleGenericUpdate = useCallback((updates: Partial<AppData>) => {
    mutation.mutate(updates);
  }, [mutation]);
  
  const setAppData = useCallback((updater: (prev: AppData) => AppData) => {
    // Always read the freshest state from the query cache to prevent overwriting recent updates
    const currentData = queryClient.getQueryData<AppData>('appData') ?? safeInitialAppData;
    const newData = updater(currentData);
    handleGenericUpdate(newData);
  }, [handleGenericUpdate, queryClient]);

  // Promise-based saver for batch operations (e.g., backup restore) to ensure persistence completes before reload
  const saveAppData = useCallback(async (updates: Partial<AppData>) => {
    try {
      const currentData = queryClient.getQueryData<AppData>('appData') ?? safeInitialAppData;
      const newData = { ...currentData, ...updates } as AppData;
      await (mutation as any).mutateAsync(newData);
    } catch (error: any) {
      toast({ title: "Data Sync Error", description: error?.message || String(error), variant: "destructive" });
      throw error;
    }
  }, [mutation, queryClient, toast]);

  // Helper to index new tasks (for create operations)
  const indexNewTasks = useCallback((newTasks: Task[]) => {
    const gKey = (appData?.appSettings as any)?.googleApiKey || undefined;
    const gModel = (appData?.appSettings as any)?.googleModel || undefined;
    if (gKey && newTasks.length > 0) {
      setTimeout(() => {
        indexTasks(newTasks, { apiKey: gKey, model: gModel }).catch(e => 
          console.warn('Delta indexing failed for new tasks:', e)
        );
      }, 500);
    }
  }, [appData]);

  const updateTask = useCallback((updates: Partial<Task> & { id: string }) => {
    const updatedTasks = (appData?.tasks || []).map(task => task.id === updates.id ? { ...task, ...updates } : task);
    handleGenericUpdate({ tasks: updatedTasks });
    
    // Delta indexing: index the updated task if content changed
    const updatedTask = updatedTasks.find(t => t.id === updates.id);
    if (updatedTask && (updates.name || updates.description)) {
      const gKey = (appData?.appSettings as any)?.googleApiKey || undefined;
      const gModel = (appData?.appSettings as any)?.googleModel || undefined;
      if (gKey) {
        setTimeout(() => {
          indexTasks([updatedTask], { apiKey: gKey, model: gModel }).catch(e => 
            console.warn('Delta indexing failed for updated task:', e)
          );
        }, 500);
      }
    }
  }, [appData, handleGenericUpdate]);

  const handleDeleteTask = useCallback((taskId: string) => {
    const updatedTasks = (appData?.tasks || []).filter(task => task.id !== taskId);
    handleGenericUpdate({ tasks: updatedTasks });
  }, [appData, handleGenericUpdate]);

  const updateQuote = useCallback((quoteId: string, updates: Partial<Quote>) => {
    const updatedQuotes = (appData?.quotes || []).map(q => q.id === quoteId ? { ...q, ...updates } : q);
    handleGenericUpdate({ quotes: updatedQuotes });
  }, [appData, handleGenericUpdate]);

  const lang = (appData?.appSettings?.language as keyof typeof i18n) || 'en';
  const T = i18n[lang] || i18n.en;
  
  if (isLoading || !appData) {
    return getLoadingState() as any;
  }

  // Auto-index tasks that don't yet have a stored vector.
  // Debounce simple: wait 1s after load/change before indexing.
  // Bootstrap in-memory vector DB from any persisted vectors on tasks so semantic search works offline immediately.
  (async () => {
    try {
      const persisted = (appData?.tasks || []).filter((t: any) => Array.isArray(t.vector) && t.vector.length > 0).map((t: any) => ({
        id: `task:${t.id}`,
        text: `${t.title || ''}\n${t.description || ''}`,
        metadata: { taskId: t.id, project: t.projectId },
        vector: t.vector,
      }));
      if (persisted.length > 0) {
        // Fire-and-forget: populate in-memory DB
        VectorDBService.upsert(persisted).catch((e: any) => console.warn('VectorDB bootstrap failed:', e));
      }
    } catch (e) {
      console.warn('VectorDB bootstrap error:', e);
    }

    try {
      const tasksToIndex = (appData?.tasks || []).filter((t: any) => !Array.isArray(t.vector) || t.vector.length === 0);
      if (tasksToIndex.length === 0) return;
      
      // Use Google (Gemini) API key and model from appSettings
      const gKey = (appData?.appSettings as any)?.googleApiKey || undefined;
      const gModel = (appData?.appSettings as any)?.googleModel || undefined;
      
      if (!gKey) {
        console.info(`📋 ${tasksToIndex.length} tasks need indexing, but no Google API key configured. Vector search features will be limited.`);
        return;
      }
      
      console.info(`🔍 Auto-indexing ${tasksToIndex.length} tasks without vectors...`);
      // Do async but don't block UI; index in background using user's Google key and model if present
      setTimeout(() => { 
        indexTasks(tasksToIndex, { apiKey: gKey, model: gModel })
          .then(() => console.info(`✅ Auto-indexed ${tasksToIndex.length} tasks successfully`))
          .catch(e => console.warn('Auto-indexing failed:', e.message || e));
      }, 1000);
    } catch (e) {
      console.warn('Auto-index check failed:', e);
    }
  })();

  return {
    appData,
    isDataLoaded: !isLoading,
    T,
    setAppData,
    saveAppData,
    updateTask,
    handleDeleteTask,
    updateQuote,
    indexNewTasks, // Expose helper for create forms
    // Provide other handlers as needed
  };
}
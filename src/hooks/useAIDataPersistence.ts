 'use client';

import { useState, useEffect } from 'react';
import { PouchDBService } from '@/lib/pouchdb-service';

interface PersistentAIData {
  conversationHistory: any[];
  contextMemory: any[];
  userPatterns: any[];
  learningData: any[];
  financialInsights: any[];
  lastUpdateTime: string;
}

const AI_STORAGE_KEY = 'freelance-flow-ai-persistent-data';
const AI_BACKUP_KEY = 'freelance-flow-ai-backup-data';

export function useAIDataPersistence() {
  const [persistentData, setPersistentData] = useState<PersistentAIData>({
    conversationHistory: [],
    contextMemory: [],
    userPatterns: [],
    learningData: [],
    financialInsights: [],
    lastUpdateTime: new Date().toISOString()
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load data on mount. Prefer PouchDB app documents when available (server-synced).
  useEffect(() => {
    (async () => {
      // Try to load AI persistent data from PouchDB first
      try {
        const doc = await PouchDBService.getDocument('aiAnalyses');
        if (doc && (doc as any).data) {
          // If aiAnalyses doc exists, we can map it into financialInsights for backwards compatibility
          const docData = (doc as any).data;
          setPersistentData(prev => ({ ...prev, financialInsights: Array.isArray(docData) ? docData : prev.financialInsights }));
          console.log('🔄 AI data loaded from PouchDB aiAnalyses document');
        } else {
          // Fallback to localStorage
          loadAIData();
        }
      } catch (err) {
        console.warn('⚠️ PouchDB aiAnalyses not available, falling back to localStorage', err);
        loadAIData();
      } finally {
        setIsLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveAIData(persistentData);
    }, 30000);

    return () => clearInterval(interval);
  }, [persistentData]);

  const loadAIData = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from localStorage
      const storedData = localStorage.getItem(AI_STORAGE_KEY);
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setPersistentData(parsedData);
        console.log('🔄 AI data loaded from localStorage:', parsedData);
      } else {
        console.log('💡 No existing AI data found, starting fresh');
      }
    } catch (error) {
      console.error('❌ Error loading AI data:', error);
      // Try to load backup
      try {
        const backupData = localStorage.getItem(AI_BACKUP_KEY);
        if (backupData) {
          const parsedBackup = JSON.parse(backupData);
          setPersistentData(parsedBackup);
          console.log('🔄 AI data restored from backup');
        }
      } catch (backupError) {
        console.error('❌ Error loading backup AI data:', backupError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveAIData = async (data: PersistentAIData) => {
    try {
      setIsSaving(true);
      
      const dataToSave = {
        ...data,
        lastUpdateTime: new Date().toISOString()
      };

      // Prefer saving into PouchDB app documents so AI data is part of appData backups.
      try {
        // Save as 'aiAnalyses' document (this keeps historical analyses accessible to other users/devices)
        await PouchDBService.setDocument('aiAnalyses', dataToSave.financialInsights || []);
        console.log('💾 AI data saved to PouchDB aiAnalyses document');
      } catch (pErr) {
        console.warn('⚠️ Could not save AI data to PouchDB, falling back to localStorage', pErr);
        // Save to localStorage as fallback
        localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(dataToSave));
        // Create backup
        const currentData = localStorage.getItem(AI_STORAGE_KEY);
        if (currentData) localStorage.setItem(AI_BACKUP_KEY, currentData);
      }
    } catch (error) {
      console.error('❌ Error saving AI data:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const updateConversationHistory = (conversations: any[]) => {
    setPersistentData(prev => ({
      ...prev,
      conversationHistory: conversations,
      lastUpdateTime: new Date().toISOString()
    }));
  };

  const updateContextMemory = (contextEntries: any[]) => {
    setPersistentData(prev => ({
      ...prev,
      contextMemory: contextEntries,
      lastUpdateTime: new Date().toISOString()
    }));
  };

  const updateUserPatterns = (patterns: any[]) => {
    setPersistentData(prev => ({
      ...prev,
      userPatterns: patterns,
      lastUpdateTime: new Date().toISOString()
    }));
  };

  const updateLearningData = (learningData: any[]) => {
    setPersistentData(prev => ({
      ...prev,
      learningData,
      lastUpdateTime: new Date().toISOString()
    }));
  };

  const updateFinancialInsights = (insights: any[]) => {
    setPersistentData(prev => ({
      ...prev,
      financialInsights: insights,
      lastUpdateTime: new Date().toISOString()
    }));
  };

  const clearAllAIData = async () => {
    try {
      localStorage.removeItem(AI_STORAGE_KEY);
      localStorage.removeItem(AI_BACKUP_KEY);
      
      const freshData: PersistentAIData = {
        conversationHistory: [],
        contextMemory: [],
        userPatterns: [],
        learningData: [],
        financialInsights: [],
        lastUpdateTime: new Date().toISOString()
      };

      setPersistentData(freshData);
      console.log('🗑️ All AI data cleared');
    } catch (error) {
      console.error('❌ Error clearing AI data:', error);
      throw error;
    }
  };

  const exportAIData = () => {
    const dataStr = JSON.stringify(persistentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freelance-flow-ai-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importAIData = async (file: File) => {
    try {
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      // Validate imported data structure
      if (importedData && typeof importedData === 'object') {
        setPersistentData({
          conversationHistory: importedData.conversationHistory || [],
          contextMemory: importedData.contextMemory || [],
          userPatterns: importedData.userPatterns || [],
          learningData: importedData.learningData || [],
          financialInsights: importedData.financialInsights || [],
          lastUpdateTime: new Date().toISOString()
        });
        
        console.log('📁 AI data imported successfully');
        return true;
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('❌ Error importing AI data:', error);
      throw error;
    }
  };

  const getStorageStats = () => {
    try {
      const data = localStorage.getItem(AI_STORAGE_KEY);
      const backup = localStorage.getItem(AI_BACKUP_KEY);
      
      return {
        mainDataSize: data ? new Blob([data]).size : 0,
        backupDataSize: backup ? new Blob([backup]).size : 0,
        totalEntries: persistentData.conversationHistory.length + 
                     persistentData.contextMemory.length + 
                     persistentData.userPatterns.length,
        lastUpdateTime: persistentData.lastUpdateTime
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return {
        mainDataSize: 0,
        backupDataSize: 0,
        totalEntries: 0,
        lastUpdateTime: new Date().toISOString()
      };
    }
  };

  return {
    persistentData,
    isLoading,
    isSaving,
    updateConversationHistory,
    updateContextMemory,
    updateUserPatterns,
    updateLearningData,
    updateFinancialInsights,
    saveAIData: () => saveAIData(persistentData),
    loadAIData,
    clearAllAIData,
    exportAIData,
    importAIData,
    getStorageStats
  };
}

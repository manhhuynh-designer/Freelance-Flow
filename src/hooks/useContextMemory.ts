'use client';

import { useState, useCallback, useEffect } from 'react';
import { SmartContextPrioritizer, type ContextPriority } from '@/ai/context/smart-prioritizer';
import { browserLocal } from '@/lib/browser';

export interface ContextMemoryEntry {
  id: string;
  timestamp: Date;
  sessionId: string;
  userQuery: string;
  aiResponse: string;
  entityMentions: string[]; // Tasks, clients, etc mentioned
  topics: string[]; // Topics discussed
  sentiment: 'positive' | 'neutral' | 'negative';
  importance: number; // 1-10 scale
  actionsTaken?: string[];
}

export interface ContextPattern {
  pattern: string;
  frequency: number;
  lastSeen: Date;
  contexts: string[];
  successRate: number;
}

export interface UseContextMemoryReturn {
  memoryEntries: ContextMemoryEntry[];
  contextPatterns: ContextPattern[];
  addMemoryEntry: (entry: Omit<ContextMemoryEntry, 'id' | 'timestamp'>) => void;
  searchMemory: (query: string, limit?: number) => ContextMemoryEntry[];
  getRelevantContext: (currentQuery: string, limit?: number) => {
    entries: ContextMemoryEntry[];
    priorities: ContextPriority[];
  };
  getTopPatterns: (limit?: number) => ContextPattern[];
  clearMemory: () => void;
  exportMemory: () => string;
  importMemory: (data: string) => void;
}

const CONTEXT_MEMORY_KEY = 'freelance-flow-context-memory';
const CONTEXT_PATTERNS_KEY = 'freelance-flow-context-patterns';
const MAX_MEMORY_ENTRIES = 500;

export function useContextMemory(): UseContextMemoryReturn {
  const [memoryEntries, setMemoryEntries] = useState<ContextMemoryEntry[]>([]);
  const [contextPatterns, setContextPatterns] = useState<ContextPattern[]>([]);
  const [prioritizer] = useState(() => new SmartContextPrioritizer());

  // Load memory from localStorage on init
  useEffect(() => {
    try {
      const savedMemory = browserLocal.getItem(CONTEXT_MEMORY_KEY);
      if (savedMemory) {
        const parsed = JSON.parse(savedMemory);
        const memoryWithDates = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        setMemoryEntries(memoryWithDates);
      }

      const savedPatterns = browserLocal.getItem(CONTEXT_PATTERNS_KEY);
      if (savedPatterns) {
        const parsed = JSON.parse(savedPatterns);
        const patternsWithDates = parsed.map((pattern: any) => ({
          ...pattern,
          lastSeen: new Date(pattern.lastSeen)
        }));
        setContextPatterns(patternsWithDates);
      }
    } catch (error) {
      console.error('Failed to load context memory:', error);
    }
  }, []);

  // Save memory to localStorage when it changes
  useEffect(() => {
    try { browserLocal.setItem(CONTEXT_MEMORY_KEY, JSON.stringify(memoryEntries)); } catch (error) { console.error('Failed to save context memory:', error); }
  }, [memoryEntries]);

  useEffect(() => { try { browserLocal.setItem(CONTEXT_PATTERNS_KEY, JSON.stringify(contextPatterns)); } catch (error) { console.error('Failed to save context patterns:', error); } }, [contextPatterns]);

  const addMemoryEntry = useCallback((entry: Omit<ContextMemoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: ContextMemoryEntry = {
      ...entry,
      id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setMemoryEntries(prev => {
      const updated = [newEntry, ...prev].slice(0, MAX_MEMORY_ENTRIES);
      return updated;
    });

    // Update patterns
    const queryWords = entry.userQuery.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    queryWords.forEach(word => {
      setContextPatterns(prev => {
        const existing = prev.find(p => p.pattern === word);
        if (existing) {
          return prev.map(p => p.pattern === word ? {
            ...p,
            frequency: p.frequency + 1,
            lastSeen: new Date(),
            contexts: [...new Set([...p.contexts, ...entry.topics])]
          } : p);
        } else {
          return [...prev, {
            pattern: word,
            frequency: 1,
            lastSeen: new Date(),
            contexts: entry.topics,
            successRate: entry.actionsTaken && entry.actionsTaken.length > 0 ? 1 : 0.5
          }];
        }
      });
    });

    console.log('Context memory entry added:', newEntry);
  }, []);

  const searchMemory = useCallback((query: string, limit = 10): ContextMemoryEntry[] => {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

    return memoryEntries
      .filter(entry => {
        const searchText = `${entry.userQuery} ${entry.aiResponse} ${entry.entityMentions.join(' ')} ${entry.topics.join(' ')}`.toLowerCase();
        return queryWords.some(word => searchText.includes(word));
      })
      .sort((a, b) => {
        // Sort by relevance score
        const scoreA = calculateRelevanceScore(a, queryWords);
        const scoreB = calculateRelevanceScore(b, queryWords);
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }, [memoryEntries]);

  const getRelevantContext = useCallback((currentQuery: string, limit = 5) => {
    if (memoryEntries.length === 0) {
      return {
        entries: [],
        priorities: []
      };
    }

    // Use smart prioritizer for better context selection
    const prioritized = prioritizer.prioritizeContext(
      memoryEntries.slice(0, 100), // Consider last 100 entries for performance
      currentQuery
    );

    const selected = prioritized
      .slice(0, limit)
      .map(p => p.entry);

    console.log('🧠 Smart context prioritization:', {
      considered: memoryEntries.length,
      prioritized: prioritized.length,
      selected: selected.length,
      topReasons: prioritized.slice(0, 3).map(p => ({
        score: p.score.toFixed(2),
        reasons: p.reasons.slice(0, 2)
      }))
    });

    return {
      entries: selected,
      priorities: prioritized.slice(0, limit)
    };
  }, [memoryEntries, prioritizer]);

  const getTopPatterns = useCallback((limit = 10): ContextPattern[] => {
    return contextPatterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }, [contextPatterns]);

  const clearMemory = useCallback(() => {
    setMemoryEntries([]);
    setContextPatterns([]);
  try { browserLocal.removeItem(CONTEXT_MEMORY_KEY); browserLocal.removeItem(CONTEXT_PATTERNS_KEY); } catch {}
    console.log('Context memory cleared');
  }, []);

  const exportMemory = useCallback((): string => {
    const exportData = {
      memoryEntries,
      contextPatterns,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(exportData, null, 2);
  }, [memoryEntries, contextPatterns]);

  const importMemory = useCallback((data: string) => {
    try {
      const imported = JSON.parse(data);
      if (imported.memoryEntries && imported.contextPatterns) {
        const memoryWithDates = imported.memoryEntries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        const patternsWithDates = imported.contextPatterns.map((pattern: any) => ({
          ...pattern,
          lastSeen: new Date(pattern.lastSeen)
        }));
        
        setMemoryEntries(memoryWithDates);
        setContextPatterns(patternsWithDates);
        console.log('Context memory imported successfully');
      }
    } catch (error) {
      console.error('Failed to import context memory:', error);
    }
  }, []);

  return {
    memoryEntries,
    contextPatterns,
    addMemoryEntry,
    searchMemory,
    getRelevantContext,
    getTopPatterns,
    clearMemory,
    exportMemory,
    importMemory
  };
}

// Helper function to calculate relevance score
function calculateRelevanceScore(entry: ContextMemoryEntry, queryWords: string[]): number {
  let score = 0;
  const searchText = `${entry.userQuery} ${entry.aiResponse} ${entry.entityMentions.join(' ')} ${entry.topics.join(' ')}`.toLowerCase();
  
  queryWords.forEach(word => {
    const occurrences = (searchText.match(new RegExp(word, 'g')) || []).length;
    score += occurrences;
  });

  // Boost score for recent entries
  const daysSinceEntry = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
  const recencyMultiplier = Math.max(0.1, 1 - (daysSinceEntry / 30));
  
  // Boost score for important entries
  const importanceMultiplier = entry.importance / 10;

  return score * recencyMultiplier * (1 + importanceMultiplier);
}

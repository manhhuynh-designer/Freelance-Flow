'use client';

import { useState, useCallback, useEffect } from 'react';
import { PatternLearner, type UserPattern, type LearningInsight, type PatternLearningConfig } from '@/ai/learning/pattern-learner';
import { ContextMemoryEntry } from '@/hooks/useContextMemory';

export interface UsePatternLearningReturn {
  learner: PatternLearner;
  detectedPatterns: UserPattern[];
  insights: LearningInsight[];
  isAnalyzing: boolean;
  lastAnalysis: Date | null;
  analyzePatterns: (memoryEntries: ContextMemoryEntry[]) => Promise<void>;
  clearPatterns: () => void;
  updateConfig: (config: Partial<PatternLearningConfig>) => void;
  exportPatterns: () => string;
  importPatterns: (data: string) => boolean;
}

const PATTERN_STORAGE_KEY = 'freelance-flow-user-patterns';
const INSIGHTS_STORAGE_KEY = 'freelance-flow-learning-insights';
const PATTERN_CONFIG_KEY = 'freelance-flow-pattern-config';

export function usePatternLearning(initialConfig?: Partial<PatternLearningConfig>): UsePatternLearningReturn {
  const [learner] = useState(() => new PatternLearner(initialConfig));
  const [detectedPatterns, setDetectedPatterns] = useState<UserPattern[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  // Load saved patterns and insights on init
  useEffect(() => {
    try {
      // Load patterns
      const savedPatterns = localStorage.getItem(PATTERN_STORAGE_KEY);
      if (savedPatterns) {
        const patterns = JSON.parse(savedPatterns);
        // Convert timestamp strings back to Date objects
        const hydratedPatterns = patterns.map((p: any) => ({
          ...p,
          lastSeen: new Date(p.lastSeen)
        }));
        setDetectedPatterns(hydratedPatterns);
      }

      // Load insights
      const savedInsights = localStorage.getItem(INSIGHTS_STORAGE_KEY);
      if (savedInsights) {
        setInsights(JSON.parse(savedInsights));
      }

      // Load config
      const savedConfig = localStorage.getItem(PATTERN_CONFIG_KEY);
      if (savedConfig) {
        learner.updateConfig(JSON.parse(savedConfig));
      }

      console.log('📚 Pattern learning data loaded from storage');
    } catch (error) {
      console.error('Error loading pattern learning data:', error);
    }
  }, [learner]);

  // Save patterns and insights whenever they change
  useEffect(() => {
    if (detectedPatterns.length > 0) {
      localStorage.setItem(PATTERN_STORAGE_KEY, JSON.stringify(detectedPatterns));
    }
  }, [detectedPatterns]);

  useEffect(() => {
    if (insights.length > 0) {
      localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify(insights));
    }
  }, [insights]);

  const analyzePatterns = useCallback(async (memoryEntries: ContextMemoryEntry[]) => {
    if (memoryEntries.length === 0) {
      console.log('📚 No memory entries to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log('📚 Starting pattern analysis for', memoryEntries.length, 'entries');

      // Analyze patterns (simulate async operation)
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UX
      
      const patterns = learner.analyzePatterns(memoryEntries);
      setDetectedPatterns(patterns);

      // Generate insights from patterns
      const newInsights = learner.generateInsights(patterns);
      setInsights(newInsights);

      setLastAnalysis(new Date());

      console.log('📚 Pattern analysis complete:', {
        patterns: patterns.length,
        insights: newInsights.length,
        topPatterns: patterns.slice(0, 3).map(p => ({
          type: p.type,
          pattern: p.pattern,
          confidence: p.confidence.toFixed(2)
        }))
      });

    } catch (error) {
      console.error('Error during pattern analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [learner]);

  const clearPatterns = useCallback(() => {
    learner.clearPatterns();
    setDetectedPatterns([]);
    setInsights([]);
    setLastAnalysis(null);
    
    localStorage.removeItem(PATTERN_STORAGE_KEY);
    localStorage.removeItem(INSIGHTS_STORAGE_KEY);
    
    console.log('📚 All patterns and insights cleared');
  }, [learner]);

  const updateConfig = useCallback((newConfig: Partial<PatternLearningConfig>) => {
    learner.updateConfig(newConfig);
    localStorage.setItem(PATTERN_CONFIG_KEY, JSON.stringify(newConfig));
    
    console.log('📚 Pattern learning configuration updated:', newConfig);
  }, [learner]);

  const exportPatterns = useCallback(() => {
    const exportData = {
      patterns: detectedPatterns,
      insights: insights,
      lastAnalysis: lastAnalysis?.toISOString(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [detectedPatterns, insights, lastAnalysis]);

  const importPatterns = useCallback((data: string): boolean => {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.patterns || !Array.isArray(importData.patterns)) {
        console.error('Invalid pattern data format');
        return false;
      }

      // Hydrate dates
      const patterns = importData.patterns.map((p: any) => ({
        ...p,
        lastSeen: new Date(p.lastSeen)
      }));

      setDetectedPatterns(patterns);
      
      if (importData.insights) {
        setInsights(importData.insights);
      }
      
      if (importData.lastAnalysis) {
        setLastAnalysis(new Date(importData.lastAnalysis));
      }

      console.log('📚 Patterns imported successfully:', patterns.length, 'patterns');
      return true;
    } catch (error) {
      console.error('Error importing patterns:', error);
      return false;
    }
  }, []);

  return {
    learner,
    detectedPatterns,
    insights,
    isAnalyzing,
    lastAnalysis,
    analyzePatterns,
    clearPatterns,
    updateConfig,
    exportPatterns,
    importPatterns
  };
}

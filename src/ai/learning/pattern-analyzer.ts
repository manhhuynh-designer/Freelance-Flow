import { UserPattern, LearningInsight } from './pattern-learner';

export type PatternAnalysisResult = {
  patterns: UserPattern[];
  insights: LearningInsight[];
};

// Minimal stub for pattern-analyzer
export type PatternInsight = {
  id?: string;
  description?: string;
  score?: number;
};

export function analyzePatterns(events: any[] = []): PatternAnalysisResult {
  // placeholder simple analysis
  const patterns: UserPattern[] = events.length ? [{ id: 'p-1', type: 'workflow', pattern: 'batching', frequency: 0.4, confidence: 0.5, strength: 0.7 }] : [];
  const insights: LearningInsight[] = patterns.length ? [{ id: 'ins-1', title: 'Batching detected', description: 'You group similar tasks together', confidence: 0.5 }] : [];
  return { patterns, insights };
}

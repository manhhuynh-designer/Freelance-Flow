import { UserPattern, LearningInsight } from './pattern-learner';

export type BehaviorEvent = {
  id?: string;
  type?: string;
  timestamp?: number | string | Date;
  payload?: any;
};

export type BehaviorProfile = {
  userId?: string;
  habits?: string[];
  regularHours?: { start?: string; end?: string } | null;
  patterns?: UserPattern[];
  insights?: LearningInsight[];
};

export function trackBehaviors(events: BehaviorEvent[] = []): BehaviorProfile {
  // naive aggregator: extract simple time-of-day patterns
  const patterns = (events || []).length ? [{ id: 'b-1', type: 'timing', pattern: 'works-mornings', frequency: 0.5, confidence: 0.6 }] as UserPattern[] : [];
  const insights = patterns.length ? [{ id: 'i-1', title: 'Likely morning worker', description: 'User often works in the morning', confidence: 0.6 }] as LearningInsight[] : [];
  return { habits: patterns.map(p => p.pattern || ''), patterns, insights, regularHours: null };
}
// Lightweight stub types for behavior-tracker
export type ActionEvent = {
  id: string;
  actionType: string; // e.g. 'create', 'edit', 'complete', 'navigate'
  entityType?: string; // e.g. 'task', 'quote', 'client'
  entityId?: string;
  timestamp: Date; // normalized to Date for analytics
  duration?: number; // seconds
  metadata?: Record<string, any>;
};

export type UserBehaviorPattern = {
  id: string;
  patternType: string; // e.g. 'procrastination', 'batching', 'morning_worker'
  pattern: string;
  frequency: number; // 0..1
  confidence: number; // 0..1
  strength: number; // 0..1
  impact: number; // heuristic impact score
  recommendations: string[];
  description: string;
  metadata?: Record<string, any>;
};

export type PerformanceMetrics = {
  efficiency: number; // 0..100
  focusRatio: number; // 0..1
  distractionEvents: number;
  totalWorkTimeMinutes?: number;
};

export function extractActionEvents(input: any): ActionEvent[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : [input];
  return arr.map((it: any, i: number) => {
    const ts = it?.timestamp ? new Date(it.timestamp) : new Date();
    return {
      id: it?.id || `ae-${Date.now()}-${i}`,
      actionType: it?.actionType || it?.type || 'unknown',
      entityType: it?.entityType || it?.entity || '',
      entityId: String(it?.entityId || it?.entity_id || it?.id || ''),
      timestamp: ts,
      duration: typeof it?.duration === 'number' ? it.duration : 0,
      metadata: it?.metadata || it?.payload || {}
    } as ActionEvent;
  });
}

// Lightweight type stubs to satisfy imports during typecheck
// Richer UserPattern shape used by many analytics/prediction modules
export type UserPattern = {
  id: string;
  // keep both aliases because different modules refer to different names
  type: string; // e.g., 'workflow', 'timing', 'language', 'topic'
  patternType?: string; // optional alias for code expecting 'patternType'
  pattern: string; // human-readable pattern description
  frequency: number; // 0..1
  confidence: number; // 0..1
  strength: number; // 0..1
  lastSeen?: string | number | Date;
  metadata?: {
    languagePatterns?: string[];
    timePatterns?: string[];
    topicPatterns?: string[];
    [k: string]: any;
  };
  contexts?: any[];
};

export type LearningInsight = {
  id?: string;
  title?: string;
  description?: string;
  confidence?: number;
  details?: any;
};

export type PatternLearningConfig = {
  sensitivity?: number;
  minOccurrences?: number;
};

// A basic PatternLearner with methods expected by hooks and other modules.
export class PatternLearner {
  private patterns: UserPattern[] = [];
  constructor(public config?: PatternLearningConfig) {}

  updateConfig(cfg: Partial<PatternLearningConfig>) {
    this.config = { ...(this.config || {}), ...(cfg || {}) };
  }

  analyzePatterns(events: any[]): UserPattern[] {
    // naive stub: return previously stored patterns or empty
    return this.patterns;
  }

  generateInsights(patterns: UserPattern[]): LearningInsight[] {
    // simple mapping
    return (patterns || []).map((p, i) => ({ id: p.id || `insight-${i}`, title: p.pattern || p.type, description: `Automatically generated insight for ${p.pattern || p.type}`, confidence: p.confidence }));
  }

  learn(events: any[]): UserPattern[] {
    // placeholder implementation: ensure generated patterns conform to shape
    const raw = this.analyzePatterns(events) || [];
    this.patterns = raw.map((p, i) => ({
      id: p.id || `p-${Date.now()}-${i}`,
      type: p.type || p.patternType || 'unknown',
      patternType: p.patternType || p.type || undefined,
      pattern: p.pattern || p.type || 'pattern',
      frequency: typeof p.frequency === 'number' ? p.frequency : 0.5,
      confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
      strength: typeof p.strength === 'number' ? p.strength : 0.5,
      lastSeen: p.lastSeen,
      metadata: p.metadata,
      contexts: p.contexts || []
    }));
    return this.patterns;
  }

  getTopPatterns(n = 3): UserPattern[] {
    return (this.patterns || []).slice(0, n);
  }

  clearPatterns() { this.patterns = []; }
}

'use client';

import { ContextMemoryEntry } from '@/hooks/useContextMemory';

export interface UserPattern {
  id: string;
  type: 'workflow' | 'preference' | 'timing' | 'language' | 'topic';
  pattern: string;
  confidence: number; // 0-1
  frequency: number;
  lastSeen: Date;
  contexts: string[];
  metadata: {
    timePatterns?: string[]; // ['morning', 'afternoon']
    topicPatterns?: string[]; // ['task_management', 'client_communication']
    actionPatterns?: string[]; // ['create_task', 'update_status']
    languagePatterns?: string[]; // ['formal', 'casual', 'technical']
    responsePreferences?: string[]; // ['detailed', 'brief', 'examples']
  };
}

export interface LearningInsight {
  type: 'workflow_optimization' | 'response_personalization' | 'timing_suggestion' | 'topic_correlation';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  suggestions: string[];
  relatedPatterns: string[];
}

export interface PatternLearningConfig {
  minFrequencyThreshold: number;
  confidenceThreshold: number;
  maxPatterns: number;
  enableWorkflowDetection: boolean;
  enableTimingAnalysis: boolean;
  enableLanguagePreferences: boolean;
  enableTopicCorrelation: boolean;
}

export class PatternLearner {
  private config: PatternLearningConfig;
  private detectedPatterns: Map<string, UserPattern> = new Map();

  constructor(config: Partial<PatternLearningConfig> = {}) {
    this.config = {
      minFrequencyThreshold: 3,
      confidenceThreshold: 0.6,
      maxPatterns: 50,
      enableWorkflowDetection: true,
      enableTimingAnalysis: true,
      enableLanguagePreferences: true,
      enableTopicCorrelation: true,
      ...config
    };
  }

  /**
   * Analyze memory entries and extract user patterns
   */
  analyzePatterns(memoryEntries: ContextMemoryEntry[]): UserPattern[] {
    console.log('🎯 PatternLearner: Analyzing', memoryEntries.length, 'entries');

    const patterns: UserPattern[] = [];

    if (this.config.enableWorkflowDetection) {
      patterns.push(...this.detectWorkflowPatterns(memoryEntries));
    }

    if (this.config.enableTimingAnalysis) {
      patterns.push(...this.detectTimingPatterns(memoryEntries));
    }

    if (this.config.enableLanguagePreferences) {
      patterns.push(...this.detectLanguagePatterns(memoryEntries));
    }

    if (this.config.enableTopicCorrelation) {
      patterns.push(...this.detectTopicPatterns(memoryEntries));
    }

    // Filter by confidence and frequency thresholds
    const validPatterns = patterns.filter(p => 
      p.confidence >= this.config.confidenceThreshold &&
      p.frequency >= this.config.minFrequencyThreshold
    );

    // Limit number of patterns
    const sortedPatterns = validPatterns
      .sort((a, b) => (b.confidence * b.frequency) - (a.confidence * a.frequency))
      .slice(0, this.config.maxPatterns);

    // Update internal pattern tracking
    sortedPatterns.forEach(pattern => {
      this.detectedPatterns.set(pattern.id, pattern);
    });

    console.log('🎯 Detected patterns:', sortedPatterns.length, 'valid patterns');
    return sortedPatterns;
  }

  /**
   * Detect workflow patterns (sequences of actions)
   */
  private detectWorkflowPatterns(entries: ContextMemoryEntry[]): UserPattern[] {
    const patterns: UserPattern[] = [];
    const workflows = new Map<string, { frequency: number; contexts: string[]; lastSeen: Date }>();

    // Sort entries by timestamp to detect sequences
    const sortedEntries = entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < sortedEntries.length - 1; i++) {
      const current = sortedEntries[i];
      const next = sortedEntries[i + 1];

      // Check if entries are within reasonable time window (30 minutes)
      const timeDiff = next.timestamp.getTime() - current.timestamp.getTime();
      if (timeDiff > 30 * 60 * 1000) continue;

      const currentTopics = current.topics.join(',');
      const nextTopics = next.topics.join(',');
      const workflowKey = `${currentTopics}→${nextTopics}`;

      if (!workflows.has(workflowKey)) {
        workflows.set(workflowKey, { frequency: 0, contexts: [], lastSeen: next.timestamp });
      }

      const workflow = workflows.get(workflowKey)!;
      workflow.frequency++;
      workflow.lastSeen = next.timestamp;
      workflow.contexts.push(`${current.sessionId}-${i}`);
    }

    // Convert to patterns
    workflows.forEach((data, workflowKey) => {
      if (data.frequency >= 2) { // At least 2 occurrences
        const confidence = Math.min(data.frequency / 10, 0.95); // Max confidence 0.95
        patterns.push({
          id: `workflow-${workflowKey.replace(/[^a-zA-Z0-9]/g, '-')}`,
          type: 'workflow',
          pattern: workflowKey,
          confidence,
          frequency: data.frequency,
          lastSeen: data.lastSeen,
          contexts: data.contexts,
          metadata: {
            actionPatterns: workflowKey.split('→')
          }
        });
      }
    });

    return patterns;
  }

  /**
   * Detect timing patterns (when user is most active)
   */
  private detectTimingPatterns(entries: ContextMemoryEntry[]): UserPattern[] {
    const patterns: UserPattern[] = [];
    const timeSlots = new Map<string, number>();
    const dayPatterns = new Map<string, number>();

    entries.forEach(entry => {
      const hour = entry.timestamp.getHours();
      const day = entry.timestamp.toLocaleDateString('en', { weekday: 'long' });

      // Time of day patterns
      let timeSlot = 'night';
      if (hour >= 6 && hour < 12) timeSlot = 'morning';
      else if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
      else if (hour >= 18 && hour < 22) timeSlot = 'evening';

      timeSlots.set(timeSlot, (timeSlots.get(timeSlot) || 0) + 1);
      dayPatterns.set(day, (dayPatterns.get(day) || 0) + 1);
    });

    // Find most active time slots
    const totalEntries = entries.length;
    timeSlots.forEach((count, timeSlot) => {
      const percentage = count / totalEntries;
      if (percentage > 0.2) { // At least 20% of activity
        patterns.push({
          id: `timing-${timeSlot}`,
          type: 'timing',
          pattern: `Most active during ${timeSlot}`,
          confidence: percentage,
          frequency: count,
          lastSeen: new Date(),
          contexts: [`${timeSlot}-activity`],
          metadata: {
            timePatterns: [timeSlot]
          }
        });
      }
    });

    return patterns;
  }

  /**
   * Detect language and communication preferences
   */
  private detectLanguagePatterns(entries: ContextMemoryEntry[]): UserPattern[] {
    const patterns: UserPattern[] = [];
    const languageFeatures = {
      formal: 0,
      casual: 0,
      technical: 0,
      detailed: 0,
      brief: 0
    };

    entries.forEach(entry => {
      const query = entry.userQuery.toLowerCase();

      // Formal language indicators
      if (query.includes('please') || query.includes('could you') || query.includes('would you')) {
        languageFeatures.formal++;
      }

      // Casual language indicators
      if (query.includes('hey') || query.includes('okay') || query.includes('thanks')) {
        languageFeatures.casual++;
      }

      // Technical language
      if (query.includes('api') || query.includes('database') || query.includes('function')) {
        languageFeatures.technical++;
      }

      // Query length as indicator of detail preference
      if (query.length > 100) {
        languageFeatures.detailed++;
      } else if (query.length < 30) {
        languageFeatures.brief++;
      }
    });

    // Convert to patterns
    Object.entries(languageFeatures).forEach(([feature, count]) => {
      if (count >= 3) {
        patterns.push({
          id: `language-${feature}`,
          type: 'language',
          pattern: `Prefers ${feature} communication`,
          confidence: Math.min(count / entries.length * 2, 0.9),
          frequency: count,
          lastSeen: new Date(),
          contexts: [`language-${feature}`],
          metadata: {
            languagePatterns: [feature]
          }
        });
      }
    });

    return patterns;
  }

  /**
   * Detect topic correlation patterns
   */
  private detectTopicPatterns(entries: ContextMemoryEntry[]): UserPattern[] {
    const patterns: UserPattern[] = [];
    const topicCombinations = new Map<string, number>();
    const topicFrequency = new Map<string, number>();

    entries.forEach(entry => {
      // Count individual topics
      entry.topics.forEach(topic => {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
      });

      // Count topic combinations
      if (entry.topics.length > 1) {
        const sortedTopics = entry.topics.sort();
        for (let i = 0; i < sortedTopics.length; i++) {
          for (let j = i + 1; j < sortedTopics.length; j++) {
            const combo = `${sortedTopics[i]}+${sortedTopics[j]}`;
            topicCombinations.set(combo, (topicCombinations.get(combo) || 0) + 1);
          }
        }
      }
    });

    // Create patterns for frequent topics
    topicFrequency.forEach((frequency, topic) => {
      if (frequency >= 5) {
        patterns.push({
          id: `topic-${topic}`,
          type: 'topic',
          pattern: `Frequently discusses ${topic.replace('_', ' ')}`,
          confidence: Math.min(frequency / entries.length * 3, 0.9),
          frequency,
          lastSeen: new Date(),
          contexts: [`topic-${topic}`],
          metadata: {
            topicPatterns: [topic]
          }
        });
      }
    });

    // Create patterns for topic combinations
    topicCombinations.forEach((frequency, combo) => {
      if (frequency >= 3) {
        const [topic1, topic2] = combo.split('+');
        patterns.push({
          id: `topic-combo-${combo.replace(/[^a-zA-Z0-9]/g, '-')}`,
          type: 'topic',
          pattern: `Often combines ${topic1.replace('_', ' ')} with ${topic2.replace('_', ' ')}`,
          confidence: Math.min(frequency / entries.length * 5, 0.9),
          frequency,
          lastSeen: new Date(),
          contexts: [`combo-${combo}`],
          metadata: {
            topicPatterns: [topic1, topic2]
          }
        });
      }
    });

    return patterns;
  }

  /**
   * Generate actionable insights from detected patterns
   */
  generateInsights(patterns: UserPattern[]): LearningInsight[] {
    const insights: LearningInsight[] = [];

    // Workflow optimization insights
    const workflowPatterns = patterns.filter(p => p.type === 'workflow');
    workflowPatterns.forEach(pattern => {
      insights.push({
        type: 'workflow_optimization',
        title: 'Workflow Optimization Detected',
        description: `You frequently follow the pattern: ${pattern.pattern}`,
        confidence: pattern.confidence,
        actionable: true,
        suggestions: [
          'Create a quick action for this workflow',
          'Set up automated suggestions when this pattern is detected',
          'Create a template for this common sequence'
        ],
        relatedPatterns: [pattern.id]
      });
    });

    // Timing insights
    const timingPatterns = patterns.filter(p => p.type === 'timing');
    timingPatterns.forEach(pattern => {
      insights.push({
        type: 'timing_suggestion',
        title: 'Peak Activity Time Identified',
        description: pattern.pattern,
        confidence: pattern.confidence,
        actionable: true,
        suggestions: [
          'Schedule important tasks during this time',
          'Set up notifications during peak hours',
          'Optimize system performance for this time period'
        ],
        relatedPatterns: [pattern.id]
      });
    });

    // Language personalization
    const languagePatterns = patterns.filter(p => p.type === 'language');
    if (languagePatterns.length > 0) {
      const dominantStyle = languagePatterns.sort((a, b) => b.confidence - a.confidence)[0];
      insights.push({
        type: 'response_personalization',
        title: 'Communication Style Detected',
        description: `You prefer ${dominantStyle.pattern.toLowerCase()}`,
        confidence: dominantStyle.confidence,
        actionable: true,
        suggestions: [
          'Adjust AI response style to match your preference',
          'Customize interface language and tone',
          'Set up personalized response templates'
        ],
        relatedPatterns: languagePatterns.map(p => p.id)
      });
    }

    // Topic correlation insights
    const topicPatterns = patterns.filter(p => p.type === 'topic');
    const highConfidenceTopics = topicPatterns.filter(p => p.confidence > 0.7);
    if (highConfidenceTopics.length > 0) {
      insights.push({
        type: 'topic_correlation',
        title: 'Key Interest Areas Identified',
        description: `Your primary focus areas: ${highConfidenceTopics.map(p => 
          p.metadata.topicPatterns?.[0]?.replace('_', ' ')
        ).join(', ')}`,
        confidence: Math.max(...highConfidenceTopics.map(p => p.confidence)),
        actionable: true,
        suggestions: [
          'Prioritize features related to these topics',
          'Customize dashboard to highlight these areas',
          'Set up specialized workflows for these topics'
        ],
        relatedPatterns: highConfidenceTopics.map(p => p.id)
      });
    }

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get current detected patterns
   */
  getDetectedPatterns(): UserPattern[] {
    return Array.from(this.detectedPatterns.values());
  }

  /**
   * Clear all detected patterns
   */
  clearPatterns(): void {
    this.detectedPatterns.clear();
  }

  /**
   * Update pattern learning configuration
   */
  updateConfig(newConfig: Partial<PatternLearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

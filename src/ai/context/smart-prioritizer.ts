'use client';

import type { ContextMemoryEntry } from '@/hooks/useContextMemory';

export interface ContextPriority {
  entry: ContextMemoryEntry;
  score: number;
  reasons: string[];
}

export interface ContextPrioritizationConfig {
  recencyWeight: number; // 0-1, how much to weight recent conversations
  relevanceWeight: number; // 0-1, how much to weight topic relevance
  importanceWeight: number; // 0-1, how much to weight entry importance
  sentimentWeight: number; // 0-1, how much to weight sentiment
  actionWeight: number; // 0-1, how much to weight entries with actions taken
  maxContextLength: number; // Max characters in context
  maxEntries: number; // Max number of entries to include
}

export class SmartContextPrioritizer {
  private config: ContextPrioritizationConfig;

  constructor(config?: Partial<ContextPrioritizationConfig>) {
    this.config = {
      recencyWeight: 0.3,
      relevanceWeight: 0.4,
      importanceWeight: 0.2,
      sentimentWeight: 0.05,
      actionWeight: 0.05,
      maxContextLength: 2000,
      maxEntries: 5,
      ...config
    };
  }

  /**
   * Prioritize context entries based on current query and configuration
   */
  prioritizeContext(
    availableEntries: ContextMemoryEntry[],
    currentQuery: string,
    currentTopics?: string[]
  ): ContextPriority[] {
    if (availableEntries.length === 0) return [];

    const queryLower = currentQuery.toLowerCase();
    const queryWords = this.extractKeywords(queryLower);
    const detectedTopics = currentTopics || this.detectTopicsFromQuery(currentQuery);

    // Score each entry
    const scoredEntries: ContextPriority[] = availableEntries.map(entry => {
      const score = this.calculatePriorityScore(entry, queryWords, detectedTopics);
      const reasons = this.getScoreReasons(entry, queryWords, detectedTopics, score);
      
      return {
        entry,
        score: score.total,
        reasons
      };
    });

    // Sort by score (highest first)
    scoredEntries.sort((a, b) => b.score - a.score);

    // Filter by context length and entry limits
    return this.filterByLimits(scoredEntries);
  }

  /**
   * Calculate comprehensive priority score for an entry
   */
  private calculatePriorityScore(
    entry: ContextMemoryEntry,
    queryWords: string[],
    currentTopics: string[]
  ): {
    recency: number;
    relevance: number;
    importance: number;
    sentiment: number;
    actionTaken: number;
    total: number;
  } {
    // 1. Recency Score (0-1)
    const daysSinceEntry = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysSinceEntry / 30)); // Decay over 30 days

    // 2. Relevance Score (0-1) 
    const relevanceScore = this.calculateRelevanceScore(entry, queryWords, currentTopics);

    // 3. Importance Score (0-1)
    const importanceScore = entry.importance / 10; // Normalize to 0-1

    // 4. Sentiment Score (0-1)
    const sentimentScore = this.calculateSentimentScore(entry);

    // 5. Action Score (0-1)
    const actionScore = entry.actionsTaken && entry.actionsTaken.length > 0 ? 1 : 0;

    // Calculate weighted total
    const total = 
      (recencyScore * this.config.recencyWeight) +
      (relevanceScore * this.config.relevanceWeight) +
      (importanceScore * this.config.importanceWeight) +
      (sentimentScore * this.config.sentimentWeight) +
      (actionScore * this.config.actionWeight);

    return {
      recency: recencyScore,
      relevance: relevanceScore,
      importance: importanceScore,
      sentiment: sentimentScore,
      actionTaken: actionScore,
      total: Math.min(1, total) // Cap at 1.0
    };
  }

  /**
   * Calculate relevance score based on keyword and topic overlap
   */
  private calculateRelevanceScore(
    entry: ContextMemoryEntry,
    queryWords: string[],
    currentTopics: string[]
  ): number {
    let score = 0;

    // Text overlap score
    const entryText = `${entry.userQuery} ${entry.aiResponse}`.toLowerCase();
    const keywordMatches = queryWords.filter(word => entryText.includes(word)).length;
    const keywordScore = Math.min(1, keywordMatches / Math.max(1, queryWords.length));

    // Topic overlap score  
    const topicMatches = currentTopics.filter(topic => entry.topics.includes(topic)).length;
    const topicScore = Math.min(1, topicMatches / Math.max(1, currentTopics.length));

    // Entity mention overlap
    const entityScore = this.calculateEntityOverlapScore(entry, queryWords);

    // Combine scores
    score = (keywordScore * 0.5) + (topicScore * 0.3) + (entityScore * 0.2);

    return Math.min(1, score);
  }

  /**
   * Calculate sentiment contribution to priority
   */
  private calculateSentimentScore(entry: ContextMemoryEntry): number {
    switch (entry.sentiment) {
      case 'positive': return 0.8;
      case 'negative': return 0.3; // Still valuable for context but less priority
      case 'neutral': return 0.5;
      default: return 0.5;
    }
  }

  /**
   * Calculate entity overlap score
   */
  private calculateEntityOverlapScore(entry: ContextMemoryEntry, queryWords: string[]): number {
    if (!entry.entityMentions || entry.entityMentions.length === 0) return 0;

    const entityMatches = entry.entityMentions.filter(entity => 
      queryWords.some(word => entity.toLowerCase().includes(word))
    ).length;

    return Math.min(1, entityMatches / entry.entityMentions.length);
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);

    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
      .filter(word => word.length > 0);
  }

  /**
   * Detect topics from current query
   */
  private detectTopicsFromQuery(query: string): string[] {
    const topics: string[] = [];
    const queryLower = query.toLowerCase();

    const topicKeywords = {
      'task_management': ['task', 'todo', 'work', 'job', 'assignment', 'complete', 'finish'],
      'client_relations': ['client', 'customer', 'meeting', 'call', 'email'],
      'project_planning': ['project', 'plan', 'timeline', 'deadline', 'schedule'],
      'financial': ['quote', 'money', 'cost', 'budget', 'payment', 'price'],
      'collaboration': ['team', 'collaborate', 'share', 'work together'],
      'productivity': ['efficiency', 'optimize', 'improve', 'workflow'],
      'reporting': ['report', 'status', 'progress', 'overview', 'summary'],
      'scheduling': ['calendar', 'schedule', 'time', 'appointment']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics.length > 0 ? topics : ['general'];
  }

  /**
   * Generate reasons for the score
   */
  private getScoreReasons(
    entry: ContextMemoryEntry,
    queryWords: string[],
    currentTopics: string[],
    scores: ReturnType<typeof this.calculatePriorityScore>
  ): string[] {
    const reasons: string[] = [];

    if (scores.recency > 0.7) {
      reasons.push('Recent conversation');
    }

    if (scores.relevance > 0.6) {
      reasons.push('High topic relevance');
    }

    if (scores.importance > 0.7) {
      reasons.push('High importance entry');
    }

    if (scores.actionTaken > 0) {
      reasons.push('Contains actionable content');
    }

    if (scores.sentiment === 0.8) {
      reasons.push('Positive interaction');
    }

    // Topic matches
    const topicMatches = currentTopics.filter(topic => entry.topics.includes(topic));
    if (topicMatches.length > 0) {
      reasons.push(`Matches topics: ${topicMatches.join(', ')}`);
    }

    // Keyword matches
    const entryText = `${entry.userQuery} ${entry.aiResponse}`.toLowerCase();
    const keywordMatches = queryWords.filter(word => entryText.includes(word));
    if (keywordMatches.length > 0) {
      reasons.push(`Contains keywords: ${keywordMatches.slice(0, 3).join(', ')}`);
    }

    return reasons;
  }

  /**
   * Filter results by configured limits
   */
  private filterByLimits(scoredEntries: ContextPriority[]): ContextPriority[] {
    const filtered: ContextPriority[] = [];
    let totalLength = 0;

    for (const scored of scoredEntries) {
      if (filtered.length >= this.config.maxEntries) break;

      const entryLength = scored.entry.userQuery.length + scored.entry.aiResponse.length;
      if (totalLength + entryLength > this.config.maxContextLength) break;

      filtered.push(scored);
      totalLength += entryLength;
    }

    return filtered;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ContextPrioritizationConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextPrioritizationConfig {
    return { ...this.config };
  }
}

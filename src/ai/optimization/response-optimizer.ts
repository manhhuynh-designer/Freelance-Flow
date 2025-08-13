'use client';

import { ContextMemoryEntry } from '@/hooks/useContextMemory';
import { UserPattern, LearningInsight } from '@/ai/learning/pattern-learner';

export interface ResponseOptimization {
  id: string;
  type: 'tone_adjustment' | 'length_optimization' | 'structure_modification' | 'content_personalization';
  recommendation: string;
  confidence: number;
  reasoning: string[];
  appliedAt?: Date;
}

export interface OptimizationContext {
  userQuery: string;
  conversationHistory: ContextMemoryEntry[];
  detectedPatterns: UserPattern[];
  currentInsights: LearningInsight[];
  timeContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    isWorkingHours: boolean;
  };
  sessionContext: {
    messageCount: number;
    averageResponseTime: number;
    lastInteraction: Date | null;
  };
}

export interface ResponseOptimizationConfig {
  enableToneAdjustment: boolean;
  enableLengthOptimization: boolean;
  enableStructureModification: boolean;
  enableContentPersonalization: boolean;
  confidenceThreshold: number;
  maxOptimizations: number;
}

export class ResponseOptimizer {
  private config: ResponseOptimizationConfig;
  private appliedOptimizations: Map<string, ResponseOptimization> = new Map();

  constructor(config: Partial<ResponseOptimizationConfig> = {}) {
    this.config = {
      enableToneAdjustment: true,
      enableLengthOptimization: true,
      enableStructureModification: true,
      enableContentPersonalization: true,
      confidenceThreshold: 0.7,
      maxOptimizations: 5,
      ...config
    };
  }

  /**
   * Generate response optimizations based on context and user patterns
   */
  optimizeResponse(context: OptimizationContext, baseResponse: string): {
    optimizedResponse: string;
    optimizations: ResponseOptimization[];
  } {
    console.log('🎯 ResponseOptimizer: Optimizing response based on user patterns');

    const optimizations: ResponseOptimization[] = [];

    if (this.config.enableToneAdjustment) {
      const toneOpt = this.optimizeTone(context, baseResponse);
      if (toneOpt && toneOpt.confidence >= this.config.confidenceThreshold) {
        optimizations.push(toneOpt);
      }
    }

    if (this.config.enableLengthOptimization) {
      const lengthOpt = this.optimizeLength(context, baseResponse);
      if (lengthOpt && lengthOpt.confidence >= this.config.confidenceThreshold) {
        optimizations.push(lengthOpt);
      }
    }

    if (this.config.enableStructureModification) {
      const structureOpt = this.optimizeStructure(context, baseResponse);
      if (structureOpt && structureOpt.confidence >= this.config.confidenceThreshold) {
        optimizations.push(structureOpt);
      }
    }

    if (this.config.enableContentPersonalization) {
      const contentOpt = this.personalizeContent(context, baseResponse);
      if (contentOpt && contentOpt.confidence >= this.config.confidenceThreshold) {
        optimizations.push(contentOpt);
      }
    }

    // Sort by confidence and limit
    const validOptimizations = optimizations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxOptimizations);

    // Apply optimizations to create final response
    const optimizedResponse = this.applyOptimizations(baseResponse, validOptimizations);

    // Track applied optimizations
    validOptimizations.forEach(opt => {
      opt.appliedAt = new Date();
      this.appliedOptimizations.set(opt.id, opt);
    });

    console.log('🎯 Applied optimizations:', validOptimizations.length, 'out of', optimizations.length);

    return {
      optimizedResponse,
      optimizations: validOptimizations
    };
  }

  /**
   * Optimize response tone based on user language patterns
   */
  private optimizeTone(context: OptimizationContext, response: string): ResponseOptimization | null {
    const languagePatterns = context.detectedPatterns.filter(p => p.type === 'language');
    
    if (languagePatterns.length === 0) return null;

    // Determine dominant communication style
    const styleScores = {
      formal: 0,
      casual: 0,
      technical: 0,
      friendly: 0
    };

    languagePatterns.forEach(pattern => {
      const metadata = pattern.metadata.languagePatterns || [];
      metadata.forEach(lang => {
        if (lang in styleScores) {
          (styleScores as any)[lang] += pattern.confidence * pattern.frequency;
        }
      });
    });

    const dominantStyle = Object.entries(styleScores)
      .sort(([,a], [,b]) => b - a)[0];

    if (!dominantStyle || dominantStyle[1] < 1) return null;

    const [style, score] = dominantStyle;
    const confidence = Math.min(score / 10, 0.95);

    let recommendation = '';
    switch (style) {
      case 'formal':
        recommendation = 'Use more formal language and professional tone';
        break;
      case 'casual':
        recommendation = 'Use casual, friendly language and contractions';
        break;
      case 'technical':
        recommendation = 'Include technical details and precise terminology';
        break;
      case 'friendly':
        recommendation = 'Use warm, encouraging tone with personal touches';
        break;
    }

    return {
      id: `tone-${style}-${Date.now()}`,
      type: 'tone_adjustment',
      recommendation,
      confidence,
      reasoning: [
        `User shows strong preference for ${style} communication`,
        `Pattern confidence: ${(confidence * 100).toFixed(0)}%`,
        `Based on ${languagePatterns.length} language patterns`
      ]
    };
  }

  /**
   * Optimize response length based on user preferences
   */
  private optimizeLength(context: OptimizationContext, response: string): ResponseOptimization | null {
    // Analyze historical query-response patterns
    const responseLengths = context.conversationHistory.map(entry => entry.aiResponse.length);
    const queryLengths = context.conversationHistory.map(entry => entry.userQuery.length);

    if (responseLengths.length < 3) return null;

    const avgResponseLength = responseLengths.reduce((sum, len) => sum + len, 0) / responseLengths.length;
    const avgQueryLength = queryLengths.reduce((sum, len) => sum + len, 0) / queryLengths.length;
    const currentLength = response.length;

    let recommendation = '';
    let confidence = 0;
    const reasoning: string[] = [];

    // User prefers shorter responses if their queries are brief
    if (avgQueryLength < 50 && currentLength > avgResponseLength * 1.5) {
      recommendation = 'Provide more concise response - user prefers brief answers';
      confidence = 0.8;
      reasoning.push(
        `User's average query length: ${avgQueryLength.toFixed(0)} chars`,
        `Suggested response length: ${(avgResponseLength * 1.2).toFixed(0)} chars`,
        'Pattern indicates preference for concise responses'
      );
    }
    // User prefers detailed responses if they ask detailed questions
    else if (avgQueryLength > 100 && currentLength < avgResponseLength * 0.7) {
      recommendation = 'Provide more detailed response - user appreciates thoroughness';
      confidence = 0.75;
      reasoning.push(
        `User's average query length: ${avgQueryLength.toFixed(0)} chars`,
        `Suggested response length: ${(avgResponseLength * 1.3).toFixed(0)} chars`,
        'Pattern indicates preference for detailed responses'
      );
    }

    if (!recommendation) return null;

    return {
      id: `length-opt-${Date.now()}`,
      type: 'length_optimization',
      recommendation,
      confidence,
      reasoning
    };
  }

  /**
   * Optimize response structure based on user interaction patterns
   */
  private optimizeStructure(context: OptimizationContext, response: string): ResponseOptimization | null {
    const workflowPatterns = context.detectedPatterns.filter(p => p.type === 'workflow');
    const topicPatterns = context.detectedPatterns.filter(p => p.type === 'topic');

    // Check if user frequently asks follow-up questions
    const followUpPattern = this.detectFollowUpPattern(context.conversationHistory);
    
    if (followUpPattern.frequency > 0.3) { // More than 30% of conversations have follow-ups
      return {
        id: `structure-followup-${Date.now()}`,
        type: 'structure_modification',
        recommendation: 'Add anticipatory information to prevent follow-up questions',
        confidence: followUpPattern.frequency,
        reasoning: [
          `${(followUpPattern.frequency * 100).toFixed(0)}% of conversations need follow-ups`,
          'Adding related information upfront can improve efficiency',
          'Structure response with main answer + related details'
        ]
      };
    }

    // Check if user prefers structured lists vs. paragraphs
    const structurePreference = this.analyzeStructurePreference(context.conversationHistory);
    if (structurePreference.confidence > 0.6) {
      return {
        id: `structure-format-${Date.now()}`,
        type: 'structure_modification',
        recommendation: `Format response as ${structurePreference.preferred} - user shows preference for this structure`,
        confidence: structurePreference.confidence,
        reasoning: [
          `User responds better to ${structurePreference.preferred} format`,
          `Pattern confidence: ${(structurePreference.confidence * 100).toFixed(0)}%`,
          'Based on interaction patterns and response engagement'
        ]
      };
    }

    return null;
  }

  /**
   * Personalize content based on user patterns and context
   */
  private personalizeContent(context: OptimizationContext, response: string): ResponseOptimization | null {
    const topicPatterns = context.detectedPatterns.filter(p => p.type === 'topic');
    const timingPatterns = context.detectedPatterns.filter(p => p.type === 'timing');

    let personalizationScores = 0;
    const reasons: string[] = [];

    // Time-based personalization
    const timePattern = timingPatterns.find(p => 
      p.metadata.timePatterns?.includes(context.timeContext.timeOfDay)
    );
    
    if (timePattern) {
      personalizationScores += 0.3;
      reasons.push(`Optimized for ${context.timeContext.timeOfDay} interaction patterns`);
    }

    // Topic-based personalization
    const relevantTopics = topicPatterns.filter(p => 
      p.metadata.topicPatterns?.some(topic => 
        context.userQuery.toLowerCase().includes(topic.replace('_', ' '))
      )
    );

    if (relevantTopics.length > 0) {
      personalizationScores += relevantTopics.length * 0.2;
      reasons.push(`Incorporates user's ${relevantTopics.length} preferred topics`);
    }

    // Session context personalization
    if (context.sessionContext.messageCount > 5) {
      personalizationScores += 0.2;
      reasons.push('Extended conversation - adjusting for session depth');
    }

    if (personalizationScores < 0.5) return null;

    return {
      id: `content-personal-${Date.now()}`,
      type: 'content_personalization',
      recommendation: 'Personalize response based on user preferences and context',
      confidence: Math.min(personalizationScores, 0.95),
      reasoning: reasons
    };
  }

  /**
   * Apply optimizations to the base response
   */
  private applyOptimizations(baseResponse: string, optimizations: ResponseOptimization[]): string {
    let optimizedResponse = baseResponse;

    // This is a simplified implementation
    // In a real system, you would use more sophisticated NLP techniques
    
    optimizations.forEach(opt => {
      switch (opt.type) {
        case 'tone_adjustment':
          if (opt.recommendation.includes('formal')) {
            optimizedResponse = this.makeFormal(optimizedResponse);
          } else if (opt.recommendation.includes('casual')) {
            optimizedResponse = this.makeCasual(optimizedResponse);
          }
          break;
          
        case 'length_optimization':
          if (opt.recommendation.includes('concise')) {
            optimizedResponse = this.makeConcise(optimizedResponse);
          } else if (opt.recommendation.includes('detailed')) {
            optimizedResponse = this.makeDetailed(optimizedResponse);
          }
          break;
          
        case 'structure_modification':
          if (opt.recommendation.includes('list')) {
            optimizedResponse = this.addStructure(optimizedResponse);
          }
          break;
      }
    });

    return optimizedResponse;
  }

  // Helper methods for response modifications
  private makeFormal(response: string): string {
    return response
      .replace(/can't/g, 'cannot')
      .replace(/won't/g, 'will not')
      .replace(/don't/g, 'do not')
      .replace(/I'll/g, 'I will');
  }

  private makeCasual(response: string): string {
    return response
      .replace(/cannot/g, "can't")
      .replace(/will not/g, "won't")
      .replace(/do not/g, "don't")
      .replace(/I will/g, "I'll");
  }

  private makeConcise(response: string): string {
    // Remove redundant phrases and simplify
    return response
      .replace(/In order to/g, 'To')
      .replace(/It is important to note that/g, 'Note:')
      .replace(/Please be aware that/g, 'Note:')
      .split('. ')
      .slice(0, Math.ceil(response.split('. ').length * 0.8)) // Remove 20% of sentences
      .join('. ');
  }

  private makeDetailed(response: string): string {
    // Add helpful context (simplified implementation)
    return response + "\n\nAdditional context: This recommendation is based on your usage patterns and current project context.";
  }

  private addStructure(response: string): string {
    // Convert paragraphs to bullet points where appropriate
    if (response.includes('First') || response.includes('Second') || response.includes('Next')) {
      return response
        .replace(/First,/g, '• ')
        .replace(/Second,/g, '• ')
        .replace(/Next,/g, '• ')
        .replace(/Then,/g, '• ')
        .replace(/Finally,/g, '• ');
    }
    return response;
  }

  // Pattern detection helper methods
  private detectFollowUpPattern(history: ContextMemoryEntry[]): { frequency: number } {
    if (history.length < 4) return { frequency: 0 };

    let followUpCount = 0;
    const conversations = new Map<string, ContextMemoryEntry[]>();

    // Group by session
    history.forEach(entry => {
      if (!conversations.has(entry.sessionId)) {
        conversations.set(entry.sessionId, []);
      }
      conversations.get(entry.sessionId)!.push(entry);
    });

    // Check each conversation for follow-up patterns
    conversations.forEach(entries => {
      if (entries.length < 2) return;
      
      for (let i = 1; i < entries.length; i++) {
        const prev = entries[i - 1];
        const current = entries[i];
        
        // Simple heuristic: follow-up if queries are related and close in time
        const timeDiff = current.timestamp.getTime() - prev.timestamp.getTime();
        if (timeDiff < 10 * 60 * 1000) { // Within 10 minutes
          const sharedTopics = prev.topics.filter(topic => current.topics.includes(topic));
          if (sharedTopics.length > 0 || current.userQuery.length < prev.userQuery.length * 0.5) {
            followUpCount++;
          }
        }
      }
    });

    return { frequency: followUpCount / Math.max(history.length - 1, 1) };
  }

  private analyzeStructurePreference(history: ContextMemoryEntry[]): { preferred: string; confidence: number } {
    // Simplified: just return default preference
    return { preferred: 'structured lists', confidence: 0.5 };
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats(): {
    totalOptimizations: number;
    byType: Record<string, number>;
    averageConfidence: number;
    recentOptimizations: ResponseOptimization[];
  } {
    const optimizations = Array.from(this.appliedOptimizations.values());
    const byType: Record<string, number> = {};
    
    optimizations.forEach(opt => {
      byType[opt.type] = (byType[opt.type] || 0) + 1;
    });

    const averageConfidence = optimizations.length > 0
      ? optimizations.reduce((sum, opt) => sum + opt.confidence, 0) / optimizations.length
      : 0;

    const recentOptimizations = optimizations
      .filter(opt => opt.appliedAt)
      .sort((a, b) => b.appliedAt!.getTime() - a.appliedAt!.getTime())
      .slice(0, 10);

    return {
      totalOptimizations: optimizations.length,
      byType,
      averageConfidence,
      recentOptimizations
    };
  }

  /**
   * Clear optimization history
   */
  clearOptimizations(): void {
    this.appliedOptimizations.clear();
  }

  /**
   * Update optimizer configuration
   */
  updateConfig(newConfig: Partial<ResponseOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

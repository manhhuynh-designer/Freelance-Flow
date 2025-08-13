/**
 * AI Feedback Collection System
 * Collects user feedback on AI predictions and insights to improve accuracy
 */

import { AppData } from '../../lib/types';

export type FeedbackType = 'prediction' | 'insight' | 'recommendation' | 'explanation';

export interface AIFeedback {
  id: string;
  userId: string;
  type: FeedbackType;
  targetId: string; // ID of the prediction/insight being rated
  
  // Rating scores (1-5)
  accuracy: number;
  usefulness: number;
  clarity: number;
  actionability: number;
  
  // Detailed feedback
  positiveAspects: string[];
  improvementSuggestions: string[];
  userComment?: string;
  
  // Context
  actualOutcome?: string; // What actually happened vs prediction
  actionTaken: boolean; // Did user act on the recommendation?
  actionResult?: string; // Result of taking action
  
  // Metadata
  timestamp: Date;
  deviceInfo: string;
  sessionDuration: number; // How long user spent reviewing
}

export interface FeedbackSummary {
  totalFeedback: number;
  averageRatings: {
    accuracy: number;
    usefulness: number;
    clarity: number;
    actionability: number;
    overall: number;
  };
  commonImprovement: string[];
  mostValuedAspects: string[];
  actionRate: number; // % of recommendations acted upon
  successRate: number; // % of predictions that were accurate
}

export class AIFeedbackCollector {
  
  /**
   * Collect feedback from user
   */
  static async collectFeedback(
    feedback: Omit<AIFeedback, 'id' | 'timestamp'>,
    appData: AppData
  ): Promise<void> {
    const newFeedback: AIFeedback = {
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    // Store in appData
    if (!appData.appSettings.aiFeedback) {
      appData.appSettings.aiFeedback = [];
    }
    
    appData.appSettings.aiFeedback.push(newFeedback);
    
    // Save to localStorage
    localStorage.setItem('freelance-flow-data', JSON.stringify(appData));
    
    console.log('AI Feedback collected:', newFeedback);
  }

  /**
   * Get feedback summary for analysis
   */
  static getFeedbackSummary(appData: AppData): FeedbackSummary {
    const feedback = appData.appSettings.aiFeedback || [];
    
    if (feedback.length === 0) {
      return {
        totalFeedback: 0,
        averageRatings: {
          accuracy: 0,
          usefulness: 0,
          clarity: 0,
          actionability: 0,
          overall: 0
        },
        commonImprovement: [],
        mostValuedAspects: [],
        actionRate: 0,
        successRate: 0
      };
    }

    // Calculate averages
    const averageRatings = {
      accuracy: this.calculateAverage(feedback, 'accuracy'),
      usefulness: this.calculateAverage(feedback, 'usefulness'),
      clarity: this.calculateAverage(feedback, 'clarity'),
      actionability: this.calculateAverage(feedback, 'actionability'),
      overall: 0
    };
    
    averageRatings.overall = (
      averageRatings.accuracy + 
      averageRatings.usefulness + 
      averageRatings.clarity + 
      averageRatings.actionability
    ) / 4;

    // Analyze text feedback
    const commonImprovement = this.extractCommonThemes(
      feedback.flatMap(f => f.improvementSuggestions)
    );
    
    const mostValuedAspects = this.extractCommonThemes(
      feedback.flatMap(f => f.positiveAspects)
    );

    // Calculate action and success rates
    const actionRate = feedback.filter(f => f.actionTaken).length / feedback.length * 100;
    const successRate = feedback.filter(f => f.accuracy >= 4).length / feedback.length * 100;

    return {
      totalFeedback: feedback.length,
      averageRatings,
      commonImprovement,
      mostValuedAspects,
      actionRate,
      successRate
    };
  }

  /**
   * Get feedback for specific type or target
   */
  static getFeedbackForTarget(
    appData: AppData,
    targetId?: string,
    type?: FeedbackType
  ): AIFeedback[] {
    const feedback = appData.appSettings.aiFeedback || [];
    
    return feedback.filter(f => {
      if (targetId && f.targetId !== targetId) return false;
      if (type && f.type !== type) return false;
      return true;
    });
  }

  /**
   * Get recent feedback trends
   */
  static getFeedbackTrends(appData: AppData, days: number = 7): {
    daily: { date: string; count: number; averageRating: number }[];
    trending: { aspect: string; trend: 'improving' | 'declining' | 'stable' }[];
  } {
    const feedback = appData.appSettings.aiFeedback || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentFeedback = feedback.filter(f => new Date(f.timestamp) >= cutoffDate);
    
    // Group by day
    const dailyData = new Map<string, { count: number; totalRating: number }>();
    
    recentFeedback.forEach(f => {
      const dateKey = new Date(f.timestamp).toISOString().split('T')[0];
      const avgRating = (f.accuracy + f.usefulness + f.clarity + f.actionability) / 4;
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { count: 0, totalRating: 0 });
      }
      
      const day = dailyData.get(dateKey)!;
      day.count++;
      day.totalRating += avgRating;
    });

    const daily = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      averageRating: data.totalRating / data.count
    }));

    // Analyze trends (simplified)
    const trending = [
      { aspect: 'accuracy', trend: this.calculateTrend(recentFeedback, 'accuracy') },
      { aspect: 'usefulness', trend: this.calculateTrend(recentFeedback, 'usefulness') },
      { aspect: 'clarity', trend: this.calculateTrend(recentFeedback, 'clarity') },
      { aspect: 'actionability', trend: this.calculateTrend(recentFeedback, 'actionability') }
    ];

    return { daily, trending };
  }

  /**
   * Generate improvement recommendations based on feedback
   */
  static generateImprovementRecommendations(appData: AppData): {
    priority: 'high' | 'medium' | 'low';
    area: string;
    issue: string;
    recommendation: string;
    impact: string;
  }[] {
    const summary = this.getFeedbackSummary(appData);
    const recommendations = [];

    // Low accuracy
    if (summary.averageRatings.accuracy < 3.5) {
      recommendations.push({
        priority: 'high' as const,
        area: 'Prediction Accuracy',
        issue: 'AI predictions not matching actual outcomes',
        recommendation: 'Improve data quality and model training with recent outcomes',
        impact: 'Better user trust and adoption'
      });
    }

    // Low actionability
    if (summary.averageRatings.actionability < 3.5) {
      recommendations.push({
        priority: 'high' as const,
        area: 'Recommendation Quality',
        issue: 'Suggestions are not practical or actionable',
        recommendation: 'Include more specific, step-by-step guidance',
        impact: 'Higher action rate and user satisfaction'
      });
    }

    // Low clarity
    if (summary.averageRatings.clarity < 3.5) {
      recommendations.push({
        priority: 'medium' as const,
        area: 'Explanation Quality',
        issue: 'AI explanations are confusing or unclear',
        recommendation: 'Simplify language and add visual aids',
        impact: 'Better understanding and confidence'
      });
    }

    // Low action rate
    if (summary.actionRate < 30) {
      recommendations.push({
        priority: 'medium' as const,
        area: 'User Engagement',
        issue: 'Users not acting on recommendations',
        recommendation: 'Add incentives and progress tracking',
        impact: 'Increased feature utilization'
      });
    }

    return recommendations.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });
  }

  /**
   * Export feedback data for analysis
   */
  static exportFeedbackData(appData: AppData): {
    summary: FeedbackSummary;
    rawData: AIFeedback[];
    recommendations: ReturnType<typeof AIFeedbackCollector.generateImprovementRecommendations>;
    exportDate: Date;
  } {
    return {
      summary: this.getFeedbackSummary(appData),
      rawData: appData.appSettings.aiFeedback || [],
      recommendations: this.generateImprovementRecommendations(appData),
      exportDate: new Date()
    };
  }

  // Helper methods
  private static calculateAverage(feedback: AIFeedback[], field: keyof Pick<AIFeedback, 'accuracy' | 'usefulness' | 'clarity' | 'actionability'>): number {
    const values = feedback.map(f => f[field]);
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static extractCommonThemes(texts: string[]): string[] {
    // Simple keyword extraction - in production you'd use more sophisticated NLP
    const words = texts.join(' ').toLowerCase().split(/\s+/);
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3 && !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'them'].includes(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    return Array.from(wordCount.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private static calculateTrend(feedback: AIFeedback[], field: keyof Pick<AIFeedback, 'accuracy' | 'usefulness' | 'clarity' | 'actionability'>): 'improving' | 'declining' | 'stable' {
    if (feedback.length < 3) return 'stable';
    
    const sortedFeedback = feedback.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const midPoint = Math.floor(sortedFeedback.length / 2);
    
    const firstHalf = sortedFeedback.slice(0, midPoint);
    const secondHalf = sortedFeedback.slice(midPoint);
    
    const firstAvg = this.calculateAverage(firstHalf, field);
    const secondAvg = this.calculateAverage(secondHalf, field);
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 0.2) return 'improving';
    if (diff < -0.2) return 'declining';
    return 'stable';
  }
}

/**
 * Feedback Collection Component Helper
 */
export class FeedbackUIHelper {
  
  /**
   * Create feedback form data
   */
  static createFeedbackForm(
    type: FeedbackType,
    targetId: string,
    language: 'en' | 'vi' = 'vi'
  ): {
    title: string;
    fields: {
      id: string;
      label: string;
      type: 'rating' | 'text' | 'checkbox' | 'select';
      required: boolean;
      options?: string[];
    }[];
  } {
    const isVietnamese = language === 'vi';
    
    return {
      title: isVietnamese ? 'Đánh giá AI' : 'AI Feedback',
      fields: [
        {
          id: 'accuracy',
          label: isVietnamese ? 'Độ chính xác' : 'Accuracy',
          type: 'rating',
          required: true
        },
        {
          id: 'usefulness',
          label: isVietnamese ? 'Tính hữu ích' : 'Usefulness',
          type: 'rating',
          required: true
        },
        {
          id: 'clarity',
          label: isVietnamese ? 'Độ rõ ràng' : 'Clarity',
          type: 'rating',
          required: true
        },
        {
          id: 'actionability',
          label: isVietnamese ? 'Tính khả thi' : 'Actionability',
          type: 'rating',
          required: true
        },
        {
          id: 'positiveAspects',
          label: isVietnamese ? 'Điểm tích cực' : 'Positive Aspects',
          type: 'text',
          required: false
        },
        {
          id: 'improvementSuggestions',
          label: isVietnamese ? 'Đề xuất cải thiện' : 'Improvement Suggestions',
          type: 'text',
          required: false
        },
        {
          id: 'userComment',
          label: isVietnamese ? 'Nhận xét thêm' : 'Additional Comments',
          type: 'text',
          required: false
        },
        {
          id: 'actionTaken',
          label: isVietnamese ? 'Đã thực hiện theo đề xuất' : 'Acted on recommendation',
          type: 'checkbox',
          required: false
        }
      ]
    };
  }

  /**
   * Get feedback display data
   */
  static getFeedbackDisplayData(summary: FeedbackSummary, language: 'en' | 'vi' = 'vi'): {
    title: string;
    metrics: { label: string; value: string; status: 'good' | 'warning' | 'poor' }[];
    insights: string[];
  } {
    const isVietnamese = language === 'vi';
    
    const getStatus = (value: number): 'good' | 'warning' | 'poor' => {
      if (value >= 4) return 'good';
      if (value >= 3) return 'warning';
      return 'poor';
    };

    return {
      title: isVietnamese ? 'Tổng hợp phản hồi AI' : 'AI Feedback Summary',
      metrics: [
        {
          label: isVietnamese ? 'Tổng phản hồi' : 'Total Feedback',
          value: summary.totalFeedback.toString(),
          status: summary.totalFeedback > 10 ? 'good' : 'warning'
        },
        {
          label: isVietnamese ? 'Độ chính xác trung bình' : 'Average Accuracy',
          value: `${summary.averageRatings.accuracy.toFixed(1)}/5`,
          status: getStatus(summary.averageRatings.accuracy)
        },
        {
          label: isVietnamese ? 'Tính hữu ích' : 'Usefulness',
          value: `${summary.averageRatings.usefulness.toFixed(1)}/5`,
          status: getStatus(summary.averageRatings.usefulness)
        },
        {
          label: isVietnamese ? 'Tỷ lệ hành động' : 'Action Rate',
          value: `${summary.actionRate.toFixed(0)}%`,
          status: summary.actionRate > 50 ? 'good' : summary.actionRate > 25 ? 'warning' : 'poor'
        }
      ],
      insights: [
        isVietnamese 
          ? `Người dùng đánh giá cao: ${summary.mostValuedAspects.slice(0, 3).join(', ')}`
          : `Users value: ${summary.mostValuedAspects.slice(0, 3).join(', ')}`,
        isVietnamese
          ? `Cần cải thiện: ${summary.commonImprovement.slice(0, 3).join(', ')}`
          : `Needs improvement: ${summary.commonImprovement.slice(0, 3).join(', ')}`,
        isVietnamese
          ? `Tỷ lệ thành công dự đoán: ${summary.successRate.toFixed(0)}%`
          : `Prediction success rate: ${summary.successRate.toFixed(0)}%`
      ]
    };
  }
}

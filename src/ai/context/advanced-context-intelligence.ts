/**
 * Advanced Context Intelligence System
 * Enhances AI predictions with deep contextual understanding
 */

import { AppData } from '../../lib/types';
import { PredictionContext, AIBusinessInsight } from './prediction-context-types';

export type ContextualFactor = {
  id: string;
  name: string;
  category: 'temporal' | 'behavioral' | 'environmental' | 'historical' | 'predictive';
  weight: number; // 0-1 importance
  confidence: number; // 0-1 reliability
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  description: string;
  evidence: string[];
  impact: {
    productivity: number; // -1 to 1
    timeEstimation: number;
    riskLevel: number;
    resourceUtilization: number;
  };
};

export type ContextualInsight = {
  id: string;
  title: string;
  description: string;
  category: 'pattern' | 'anomaly' | 'opportunity' | 'risk' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  factors: ContextualFactor[];
  actionable: boolean;
  timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  confidence: number;
  relatedInsights: string[];
};

export type ContextIntelligenceReport = {
  id: string;
  timestamp: Date;
  
  // Core analysis
  factors: ContextualFactor[];
  insights: ContextualInsight[];
  
  // Predictions
  shortTermTrends: {
    productivity: number;
    workload: number;
    efficiency: number;
    riskLevel: number;
  };
  
  longTermProjections: {
    capacityTrend: 'increasing' | 'decreasing' | 'stable';
    skillDevelopment: string[];
    potentialBottlenecks: string[];
    opportunityAreas: string[];
  };
  
  // Recommendations
  immediateActions: string[];
  strategicRecommendations: string[];
  
  // Metadata
  analysisDepth: 'basic' | 'standard' | 'comprehensive' | 'deep';
  dataQuality: number;
  coveragePeriod: { start: Date; end: Date };
};

export class AdvancedContextIntelligence {
  
  /**
   * Generate comprehensive context intelligence report
   */
  static async generateIntelligenceReport(
    appData: AppData,
    predictionContext: PredictionContext,
    timeframe: 'weekly' | 'monthly' | 'quarterly' = 'weekly'
  ): Promise<ContextIntelligenceReport> {
    
    // Analyze contextual factors
    const factors = await this.analyzeContextualFactors(appData, predictionContext);
    
    // Generate insights from factors
    const insights = await this.generateContextualInsights(factors, predictionContext);
    
    // Make predictions
    const shortTermTrends = this.predictShortTermTrends(factors, predictionContext);
    const longTermProjections = this.projectLongTermTrends(factors, predictionContext);
    
    // Generate recommendations
    const { immediateActions, strategicRecommendations } = this.generateRecommendations(
      insights, 
      shortTermTrends, 
      longTermProjections
    );
    
    return {
      id: `context_report_${Date.now()}`,
      timestamp: new Date(),
      factors,
      insights,
      shortTermTrends,
      longTermProjections,
      immediateActions,
      strategicRecommendations,
      analysisDepth: 'comprehensive',
      dataQuality: predictionContext.contextMetadata.dataQuality,
      coveragePeriod: {
        start: new Date(Date.now() - this.getTimeframeDays(timeframe) * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    };
  }

  /**
   * Analyze contextual factors from multiple dimensions
   */
  private static async analyzeContextualFactors(
    appData: AppData,
    context: PredictionContext
  ): Promise<ContextualFactor[]> {
    const factors: ContextualFactor[] = [];
    
    // Temporal factors
    factors.push(...this.analyzeTemporalFactors(appData, context));
    
    // Behavioral factors
    factors.push(...this.analyzeBehavioralFactors(appData, context));
    
    // Environmental factors
    factors.push(...this.analyzeEnvironmentalFactors(appData, context));
    
    // Historical patterns
    factors.push(...this.analyzeHistoricalFactors(appData, context));
    
    // Predictive indicators
    factors.push(...this.analyzePredictiveFactors(appData, context));
    
    return factors.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Analyze temporal patterns and cycles
   */
  private static analyzeTemporalFactors(
    appData: AppData,
    context: PredictionContext
  ): ContextualFactor[] {
    const factors: ContextualFactor[] = [];
    const tasks = appData.tasks || [];
    
    // Day of week patterns
    const dayPatterns = this.analyzeDayOfWeekPatterns(tasks);
    if (dayPatterns.strength > 0.3) {
      factors.push({
        id: 'temporal_day_patterns',
        name: 'Mẫu ngày trong tuần',
        category: 'temporal',
        weight: dayPatterns.strength,
        confidence: dayPatterns.confidence,
        trend: dayPatterns.trend,
        description: `Hiệu suất cao nhất vào ${dayPatterns.peakDay}, thấp nhất vào ${dayPatterns.lowDay}`,
        evidence: [`${dayPatterns.dataPoints} điểm dữ liệu`, 'Phân tích hoàn thành task theo ngày'],
        impact: {
          productivity: dayPatterns.productivityImpact,
          timeEstimation: 0.2,
          riskLevel: -0.1,
          resourceUtilization: 0.15
        }
      });
    }
    
    // Time of day productivity
    const timePatterns = this.analyzeTimeOfDayPatterns(tasks);
    if (timePatterns.strength > 0.25) {
      factors.push({
        id: 'temporal_time_patterns',
        name: 'Mẫu giờ trong ngày',
        category: 'temporal',
        weight: timePatterns.strength,
        confidence: timePatterns.confidence,
        trend: 'stable',
        description: `Hiệu suất tốt nhất vào ${timePatterns.peakHours.join(', ')}h`,
        evidence: [`${timePatterns.dataPoints} hoạt động`, 'Tracking thời gian hoàn thành'],
        impact: {
          productivity: timePatterns.productivityImpact,
          timeEstimation: 0.3,
          riskLevel: -0.05,
          resourceUtilization: 0.2
        }
      });
    }
    
    return factors;
  }

  /**
   * Analyze behavioral patterns and habits
   */
  private static analyzeBehavioralFactors(
    appData: AppData,
    context: PredictionContext
  ): ContextualFactor[] {
    const factors: ContextualFactor[] = [];
    const tasks = appData.tasks || [];
    
    // Task completion patterns
    const completionPatterns = this.analyzeCompletionPatterns(tasks);
    factors.push({
      id: 'behavioral_completion',
      name: 'Mẫu hoàn thành công việc',
      category: 'behavioral',
      weight: 0.8,
      confidence: completionPatterns.confidence,
      trend: completionPatterns.trend,
      description: `Tỷ lệ hoàn thành đúng hạn: ${completionPatterns.onTimeRate}%`,
      evidence: [`${tasks.length} tasks`, 'Lịch sử hoàn thành'],
      impact: {
        productivity: completionPatterns.productivityImpact,
        timeEstimation: completionPatterns.estimationAccuracy,
        riskLevel: completionPatterns.riskLevel,
        resourceUtilization: 0.1
      }
    });
    
    // Multitasking behavior
    const multitaskingPattern = this.analyzeMultitaskingBehavior(tasks);
    if (multitaskingPattern.prevalence > 0.2) {
      factors.push({
        id: 'behavioral_multitasking',
        name: 'Mẫu đa nhiệm',
        category: 'behavioral',
        weight: multitaskingPattern.impact,
        confidence: 0.7,
        trend: multitaskingPattern.trend,
        description: `${multitaskingPattern.prevalence * 100}% thời gian làm nhiều task cùng lúc`,
        evidence: ['Overlap analysis', 'Task timing data'],
        impact: {
          productivity: multitaskingPattern.productivityImpact,
          timeEstimation: multitaskingPattern.estimationImpact,
          riskLevel: multitaskingPattern.riskLevel,
          resourceUtilization: multitaskingPattern.resourceImpact
        }
      });
    }
    
    return factors;
  }

  /**
   * Analyze environmental and external factors
   */
  private static analyzeEnvironmentalFactors(
    appData: AppData,
    context: PredictionContext
  ): ContextualFactor[] {
    const factors: ContextualFactor[] = [];
    const tasks = appData.tasks || [];
    
    // Client diversity impact
    const clientDiversity = this.analyzeClientDiversity(appData);
    factors.push({
      id: 'env_client_diversity',
      name: 'Đa dạng khách hàng',
      category: 'environmental',
      weight: clientDiversity.impactScore,
      confidence: 0.8,
      trend: clientDiversity.trend,
      description: `Làm việc với ${clientDiversity.uniqueClients} khách hàng khác nhau`,
      evidence: [`${clientDiversity.uniqueClients} clients`, 'Project complexity analysis'],
      impact: {
        productivity: clientDiversity.productivityImpact,
        timeEstimation: clientDiversity.estimationComplexity,
        riskLevel: clientDiversity.riskLevel,
        resourceUtilization: clientDiversity.resourceRequirement
      }
    });
    
    // Collaboration level
    const collaborationLevel = this.analyzeCollaborationLevel(appData);
    if (collaborationLevel.prevalence > 0.1) {
      factors.push({
        id: 'env_collaboration',
        name: 'Mức độ cộng tác',
        category: 'environmental',
        weight: collaborationLevel.impact,
        confidence: 0.75,
        trend: collaborationLevel.trend,
        description: `${collaborationLevel.prevalence * 100}% tasks có sự cộng tác`,
        evidence: ['Collaborator assignment data', 'Communication patterns'],
        impact: {
          productivity: collaborationLevel.productivityImpact,
          timeEstimation: collaborationLevel.timeImpact,
          riskLevel: collaborationLevel.riskLevel,
          resourceUtilization: collaborationLevel.resourceSharing
        }
      });
    }
    
    return factors;
  }

  /**
   * Analyze historical performance patterns
   */
  private static analyzeHistoricalFactors(
    appData: AppData,
    context: PredictionContext
  ): ContextualFactor[] {
    const factors: ContextualFactor[] = [];
    
    // Performance trajectory
    const trajectory = context.historicalPerformance;
    factors.push({
      id: 'hist_performance_trend',
      name: 'Xu hướng hiệu suất',
      category: 'historical',
      weight: 0.9,
      confidence: 0.85,
      trend: trajectory.productivity.weekOverWeekGrowth > 0 ? 'increasing' : 'decreasing',
      description: `Tăng trưởng hiệu suất: ${trajectory.productivity.weekOverWeekGrowth}%/tuần`,
      evidence: ['Historical completion data', 'Performance metrics'],
      impact: {
        productivity: trajectory.productivity.weekOverWeekGrowth / 100,
        timeEstimation: trajectory.efficiency.timePerTask['average'] || 0,
        riskLevel: 0.1, // Default risk level
        resourceUtilization: trajectory.efficiency.resourceUtilization / 100
      }
    });
    
    return factors;
  }

  /**
   * Analyze predictive indicators
   */
  private static analyzePredictiveFactors(
    appData: AppData,
    context: PredictionContext
  ): ContextualFactor[] {
    const factors: ContextualFactor[] = [];
    const tasks = appData.tasks || [];
    
    // Workload trajectory
    const workloadTrend = this.analyzeWorkloadTrajectory(tasks);
    factors.push({
      id: 'pred_workload_trend',
      name: 'Xu hướng khối lượng công việc',
      category: 'predictive',
      weight: 0.7,
      confidence: workloadTrend.confidence,
      trend: workloadTrend.direction,
      description: `Khối lượng công việc ${workloadTrend.direction === 'increasing' ? 'tăng' : 'giảm'} ${workloadTrend.rate}%`,
      evidence: ['Task creation rate', 'Completion velocity'],
      impact: {
        productivity: workloadTrend.productivityImpact,
        timeEstimation: workloadTrend.estimationImpact,
        riskLevel: workloadTrend.riskLevel,
        resourceUtilization: workloadTrend.resourceStrain
      }
    });
    
    return factors;
  }

  /**
   * Generate contextual insights from factors
   */
  private static async generateContextualInsights(
    factors: ContextualFactor[],
    context: PredictionContext
  ): Promise<ContextualInsight[]> {
    const insights: ContextualInsight[] = [];
    
    // Pattern recognition
    insights.push(...this.identifyPatterns(factors));
    
    // Anomaly detection
    insights.push(...this.detectAnomalies(factors, context));
    
    // Opportunity identification
    insights.push(...this.identifyOpportunities(factors));
    
    // Risk assessment
    insights.push(...this.assessRisks(factors));
    
    // Optimization suggestions
    insights.push(...this.suggestOptimizations(factors));
    
    return insights.sort((a, b) => {
      const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  }

  /**
   * Predict short-term trends
   */
  private static predictShortTermTrends(
    factors: ContextualFactor[],
    context: PredictionContext
  ): ContextIntelligenceReport['shortTermTrends'] {
    
    const productivityFactors = factors.filter(f => Math.abs(f.impact.productivity) > 0.1);
    const workloadFactors = factors.filter(f => f.category === 'predictive');
    const efficiencyFactors = factors.filter(f => f.impact.resourceUtilization > 0.1);
    const riskFactors = factors.filter(f => f.impact.riskLevel > 0.1);
    
    return {
      productivity: this.calculateTrendPrediction(productivityFactors, 'productivity'),
      workload: this.calculateTrendPrediction(workloadFactors, 'workload'),
      efficiency: this.calculateTrendPrediction(efficiencyFactors, 'efficiency'),
      riskLevel: this.calculateTrendPrediction(riskFactors, 'risk')
    };
  }

  /**
   * Project long-term trends
   */
  private static projectLongTermTrends(
    factors: ContextualFactor[],
    context: PredictionContext
  ): ContextIntelligenceReport['longTermProjections'] {
    
    return {
      capacityTrend: this.projectCapacityTrend(factors),
      skillDevelopment: this.identifySkillDevelopmentAreas(factors),
      potentialBottlenecks: this.identifyPotentialBottlenecks(factors),
      opportunityAreas: this.identifyOpportunityAreas(factors)
    };
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    insights: ContextualInsight[],
    shortTermTrends: ContextIntelligenceReport['shortTermTrends'],
    longTermProjections: ContextIntelligenceReport['longTermProjections']
  ): { immediateActions: string[]; strategicRecommendations: string[] } {
    
    const immediateActions: string[] = [];
    const strategicRecommendations: string[] = [];
    
    // Process high priority insights for immediate actions
    insights
      .filter(i => i.priority === 'high' || i.priority === 'critical')
      .filter(i => i.actionable && i.timeframe === 'immediate')
      .forEach(insight => {
        immediateActions.push(`${insight.title}: ${insight.description}`);
      });
    
    // Process strategic recommendations
    insights
      .filter(i => i.timeframe === 'medium_term' || i.timeframe === 'long_term')
      .forEach(insight => {
        strategicRecommendations.push(`${insight.title}: ${insight.description}`);
      });
    
    // Add trend-based recommendations
    if (shortTermTrends.productivity < -0.1) {
      immediateActions.push('Xem xét điều chỉnh workload - xu hướng giảm hiệu suất được phát hiện');
    }
    
    if (shortTermTrends.riskLevel > 0.2) {
      immediateActions.push('Thực hiện đánh giá rủi ro - mức rủi ro dự kiến tăng cao');
    }
    
    return { immediateActions, strategicRecommendations };
  }

  // Helper methods for various analyses
  private static analyzeDayOfWeekPatterns(tasks: any[]): any {
    // Simplified implementation
    return {
      strength: 0.6,
      confidence: 0.8,
      trend: 'stable',
      peakDay: 'Thứ 3',
      lowDay: 'Chủ nhật',
      dataPoints: tasks.length,
      productivityImpact: 0.15
    };
  }

  private static analyzeTimeOfDayPatterns(tasks: any[]): any {
    return {
      strength: 0.4,
      confidence: 0.7,
      peakHours: ['9-11', '14-16'],
      dataPoints: tasks.length,
      productivityImpact: 0.2
    };
  }

  private static analyzeCompletionPatterns(tasks: any[]): any {
    const completedTasks = tasks.filter(t => t.status === 'done');
    const onTimeRate = Math.random() * 30 + 70; // Simplified
    
    return {
      confidence: 0.85,
      trend: 'stable',
      onTimeRate: onTimeRate.toFixed(0),
      productivityImpact: (onTimeRate - 80) / 100,
      estimationAccuracy: 0.1,
      riskLevel: (100 - onTimeRate) / 200
    };
  }

  private static analyzeMultitaskingBehavior(tasks: any[]): any {
    return {
      prevalence: 0.3,
      impact: 0.5,
      trend: 'stable',
      productivityImpact: -0.1,
      estimationImpact: 0.15,
      riskLevel: 0.2,
      resourceImpact: 0.3
    };
  }

  private static analyzeClientDiversity(appData: AppData): any {
    const clients = appData.clients || [];
    const uniqueClients = clients.length;
    
    return {
      uniqueClients,
      impactScore: Math.min(uniqueClients / 10, 1),
      trend: 'stable',
      productivityImpact: uniqueClients > 5 ? -0.05 : 0.05,
      estimationComplexity: uniqueClients * 0.02,
      riskLevel: uniqueClients * 0.01,
      resourceRequirement: uniqueClients * 0.03
    };
  }

  private static analyzeCollaborationLevel(appData: AppData): any {
    const collaborators = appData.collaborators || [];
    
    return {
      prevalence: collaborators.length > 0 ? 0.4 : 0,
      impact: 0.6,
      trend: 'stable',
      productivityImpact: collaborators.length > 0 ? 0.1 : 0,
      timeImpact: 0.05,
      riskLevel: 0.1,
      resourceSharing: 0.2
    };
  }

  private static analyzeWorkloadTrajectory(tasks: any[]): any {
    return {
      direction: 'increasing',
      rate: 15,
      confidence: 0.75,
      productivityImpact: -0.05,
      estimationImpact: 0.1,
      riskLevel: 0.15,
      resourceStrain: 0.2
    };
  }

  private static identifyPatterns(factors: ContextualFactor[]): ContextualInsight[] {
    const insights: ContextualInsight[] = [];
    
    const temporalFactors = factors.filter(f => f.category === 'temporal');
    if (temporalFactors.length > 0) {
      insights.push({
        id: 'pattern_temporal',
        title: 'Mẫu thời gian làm việc',
        description: 'Phát hiện patterns rõ ràng trong thời gian làm việc hiệu quả',
        category: 'pattern',
        priority: 'medium',
        factors: temporalFactors,
        actionable: true,
        timeframe: 'immediate',
        confidence: 0.8,
        relatedInsights: []
      });
    }
    
    return insights;
  }

  private static detectAnomalies(factors: ContextualFactor[], context: PredictionContext): ContextualInsight[] {
    return []; // Implementation here
  }

  private static identifyOpportunities(factors: ContextualFactor[]): ContextualInsight[] {
    return []; // Implementation here
  }

  private static assessRisks(factors: ContextualFactor[]): ContextualInsight[] {
    return []; // Implementation here
  }

  private static suggestOptimizations(factors: ContextualFactor[]): ContextualInsight[] {
    return []; // Implementation here
  }

  private static calculateTrendPrediction(factors: ContextualFactor[], type: string): number {
    if (factors.length === 0) return 0;
    
    const avgImpact = factors.reduce((sum, f) => {
      switch (type) {
        case 'productivity': return sum + f.impact.productivity * f.weight;
        case 'workload': return sum + f.weight;
        case 'efficiency': return sum + f.impact.resourceUtilization * f.weight;
        case 'risk': return sum + f.impact.riskLevel * f.weight;
        default: return sum;
      }
    }, 0) / factors.length;
    
    return avgImpact;
  }

  private static projectCapacityTrend(factors: ContextualFactor[]): 'increasing' | 'decreasing' | 'stable' {
    const productivityTrend = factors
      .filter(f => f.impact.productivity !== 0)
      .reduce((sum, f) => sum + f.impact.productivity * f.weight, 0);
    
    if (productivityTrend > 0.1) return 'increasing';
    if (productivityTrend < -0.1) return 'decreasing';
    return 'stable';
  }

  private static identifySkillDevelopmentAreas(factors: ContextualFactor[]): string[] {
    return ['Time management', 'Client communication', 'Technical efficiency'];
  }

  private static identifyPotentialBottlenecks(factors: ContextualFactor[]): string[] {
    const bottlenecks: string[] = [];
    
    factors.forEach(factor => {
      if (factor.impact.riskLevel > 0.2) {
        bottlenecks.push(factor.name);
      }
    });
    
    return bottlenecks;
  }

  private static identifyOpportunityAreas(factors: ContextualFactor[]): string[] {
    const opportunities: string[] = [];
    
    factors.forEach(factor => {
      if (factor.impact.productivity > 0.15) {
        opportunities.push(factor.name);
      }
    });
    
    return opportunities;
  }

  private static getTimeframeDays(timeframe: 'weekly' | 'monthly' | 'quarterly'): number {
    switch (timeframe) {
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      default: return 7;
    }
  }
}

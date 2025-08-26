/**
 * Adaptive Predictor - Phase 4.2
 * Self-improving prediction system based on historical accuracy
 */

import type { Task, Client, Collaborator } from '@/lib/types';
import type { ActionEvent, UserBehaviorPattern, UserPreferences, PerformanceMetrics } from './behavior-tracker';
import type { PatternInsight } from './pattern-analyzer';
import { EnhancedPredictionEngine, type EnhancedPrediction } from '../prediction/enhanced-prediction-engine';

export interface AdaptivePredictionModel {
  id: string;
  version: string;
  modelType: PredictionModelType;
  accuracy: number;
  confidence: number;
  trainingDataSize: number;
  lastUpdated: Date;
  parameters: ModelParameters;
  performanceHistory: AccuracyRecord[];
}

export type PredictionModelType = 
  | 'task_completion' | 'deadline_risk' | 'workload_capacity' 
  | 'productivity_forecast' | 'time_estimation' | 'priority_scoring';

export interface ModelParameters {
  learningRate: number;
  adaptationSpeed: 'slow' | 'medium' | 'fast';
  confidenceThreshold: number;
  feedbackWeight: number;
  patternInfluence: number;
  contextSensitivity: number;
}

export interface AccuracyRecord {
  timestamp: Date;
  accuracy: number;
  predictionCount: number;
  feedbackCount: number;
  contextFactors: string[];
}

export interface AdaptivePrediction extends EnhancedPrediction {
  modelVersion: string;
  adaptationScore: number;
  personalizedFactors: string[];
  learningContribution: number;
  uncertaintyLevel: number;
}

export interface FeedbackData {
  predictionId: string;
  actualOutcome: any;
  userFeedback: UserFeedback;
  contextAtTime: any;
  accuracyScore: number;
}

export enum AccuracyRating {
  TooHigh = 'too_high',
  Accurate = 'accurate',
  TooLow = 'too_low'
}

export enum UsefulnessRating {
  Helpful = 'helpful',
  Neutral = 'neutral',
  Unhelpful = 'unhelpful'
}
export interface UserFeedback {
  rating: number; // 1-5 stars
  accuracy: AccuracyRating ;
  usefulness: UsefulnessRating ;
  comments?: string;
  wouldUseAgain: boolean;
}

export class AdaptivePredictor {
  private models: Map<PredictionModelType, AdaptivePredictionModel> = new Map();
  private feedbackHistory: FeedbackData[] = [];
  private userPatterns: PatternInsight[] = [];
  private userPreferences: UserPreferences | null = null;
  private baseEngine: EnhancedPredictionEngine;

  constructor(
    private userId: string,
    tasks: Task[],
    clients: Client[],
    collaborators: Collaborator[]
  ) {
    this.baseEngine = new EnhancedPredictionEngine(tasks, clients, collaborators);
    this.initializeModels();
  }

  /**
   * Generate adaptive predictions based on learned patterns
   */
  async generateAdaptivePredictions(
    patterns: PatternInsight[],
    preferences: UserPreferences,
    performanceMetrics: PerformanceMetrics
  ): Promise<AdaptivePrediction[]> {
    this.userPatterns = patterns;
    this.userPreferences = preferences;

    // Get base predictions
    const basePredictions = await this.baseEngine.generatePredictions();
    
    // Adapt predictions based on learned patterns
    const adaptivePredictions: AdaptivePrediction[] = [];

    for (const basePrediction of basePredictions) {
      const adaptedPrediction = await this.adaptPrediction(
        basePrediction,
        patterns,
        preferences,
        performanceMetrics
      );
      adaptivePredictions.push(adaptedPrediction);
    }

    // Generate additional personalized predictions
    const personalizedPredictions = await this.generatePersonalizedPredictions(
      patterns,
      preferences,
      performanceMetrics
    );

    return [...adaptivePredictions, ...personalizedPredictions];
  }

  // Compatibility methods used by older call sites
  async predict(actionsOrArgs?: any, patterns?: any, context?: any): Promise<AdaptivePrediction[]> {
    // Use generateAdaptivePredictions if possible
    try {
      const patternsArg = Array.isArray(patterns) ? patterns : this.userPatterns || [];
      const preferences = this.userPreferences || (context?.preferences ?? null);
      const perf = context?.performanceMetrics || ({} as PerformanceMetrics);
      return await this.generateAdaptivePredictions(patternsArg, preferences as any, perf as any);
    } catch (e) {
      return [];
    }
  }

  async updateModel(_updates: any): Promise<void> {
    // no-op for typecheck; real implementation updates internal models
    return;
  }

  async getPredictions(): Promise<AdaptivePrediction[]> {
    return [];
  }

  getAccuracy(): number {
    return 0;
  }

  /**
   * Adapt a base prediction using learned patterns
   */
  private async adaptPrediction(
    basePrediction: EnhancedPrediction,
    patterns: PatternInsight[],
    preferences: UserPreferences,
    metrics: PerformanceMetrics
  ): Promise<AdaptivePrediction> {
    const model = this.getModel(this.mapPredictionToModelType(basePrediction.type));
    
    // Calculate adaptation score based on patterns
    const adaptationScore = this.calculateAdaptationScore(basePrediction, patterns);
    
    // Adjust confidence based on historical accuracy
    const adjustedConfidence = this.adjustConfidenceScore(
      basePrediction.confidence,
      model.accuracy,
      adaptationScore
    );

    // Identify personalized factors
    const personalizedFactors = this.identifyPersonalizedFactors(basePrediction, patterns, preferences);
    
    // Calculate learning contribution
    const learningContribution = this.calculateLearningContribution(basePrediction.type, patterns);
    
    // Assess uncertainty level
    const uncertaintyLevel = this.assessUncertaintyLevel(basePrediction, model, patterns);

    // Enhance recommendations with personalized insights
    const enhancedRecommendations = this.enhanceRecommendations(
      basePrediction.recommendations,
      patterns,
      preferences,
      metrics
    );

    return {
      ...basePrediction,
      confidence: adjustedConfidence,
      recommendations: enhancedRecommendations,
      modelVersion: model.version,
      adaptationScore,
      personalizedFactors,
      learningContribution,
      uncertaintyLevel
    };
  }

  /**
   * Generate completely personalized predictions
   */
  private async generatePersonalizedPredictions(
    patterns: PatternInsight[],
    preferences: UserPreferences,
    metrics: PerformanceMetrics
  ): Promise<AdaptivePrediction[]> {
    const personalizedPredictions: AdaptivePrediction[] = [];

    // Procrastination warning
    const procrastinationPattern = patterns.find(p => p.type === 'procrastination');
    if (procrastinationPattern && procrastinationPattern.strength > 0.6) {
      personalizedPredictions.push({
        id: 'personalized_procrastination_warning',
        type: 'productivity',
        title: '⚠️ Procrastination Risk Alert',
        description: `Based on your patterns, có ${(procrastinationPattern.strength * 100).toFixed(0)}% khả năng bạn sẽ delay start tasks này tuần`,
        confidence: procrastinationPattern.confidence,
        urgency: procrastinationPattern.strength > 0.8 ? 'high' : 'medium',
        recommendation: 'Set smaller milestones và artificial deadlines để overcome procrastination',
        factors: procrastinationPattern.examples,
        timeline: '3-5 ngày tới',
        impact: 'Prevent task delays và stress',
        recommendations: [
          'Break large tasks thành 25-minute chunks',
          'Use accountability partner hoặc public commitment',
          'Address underlying blockers early',
          'Reward yourself cho small completions'
        ],
        modelVersion: this.getModel('productivity_forecast').version,
        adaptationScore: procrastinationPattern.strength,
        personalizedFactors: ['historical_procrastination', 'deadline_pressure', 'task_complexity'],
        learningContribution: 0.8,
        uncertaintyLevel: 0.2
      });
    }

    // Productivity optimization
    const productivityPattern = patterns.find(p => p.type === 'productivity_cycle');
    if (productivityPattern && productivityPattern.impact === 'positive') {
      personalizedPredictions.push({
        id: 'personalized_productivity_optimization',
        type: 'productivity',
        title: '🚀 Productivity Optimization Opportunity',
        description: `Your peak performance times: ${productivityPattern.examples.join(', ')}. Optimize scheduling để maximize output`,
        confidence: productivityPattern.confidence,
        urgency: 'medium',
        recommendation: `Schedule most important tasks during ${productivityPattern.description}`,
        factors: ['time_patterns', 'energy_levels', 'historical_performance'],
        timeline: 'Tuần tới',
        impact: 'Tăng 20-30% productivity',
        recommendations: productivityPattern.recommendations,
        modelVersion: this.getModel('productivity_forecast').version,
        adaptationScore: productivityPattern.strength,
        personalizedFactors: ['peak_hours', 'energy_management', 'task_scheduling'],
        learningContribution: 0.7,
        uncertaintyLevel: 0.3
      });
    }

    // AI trust improvement
    const aiPattern = patterns.find(p => p.type === 'ai_interaction');
    if (aiPattern && aiPattern.impact === 'negative') {
      personalizedPredictions.push({
        id: 'personalized_ai_trust_building',
        type: 'productivity',
        title: '🤖 AI Collaboration Improvement',
        description: `AI prediction accuracy đang improve. Trust level hiện tại: ${(preferences.predictionTrust * 100).toFixed(0)}%`,
        confidence: 0.8,
        urgency: 'low',
        recommendation: 'Gradually increase AI reliance với feedback để improve accuracy',
        factors: ['ai_accuracy_history', 'user_feedback', 'prediction_success'],
        timeline: '2-3 tuần tới',
        impact: 'Better AI assistance và decision support',
        recommendations: [
          'Start với low-risk AI suggestions',
          'Provide feedback on prediction accuracy',
          'Review past successful AI recommendations',
          'Use AI for initial drafts, then refine'
        ],
        modelVersion: this.getModel('productivity_forecast').version,
        adaptationScore: 1 - preferences.predictionTrust,
        personalizedFactors: ['ai_trust_history', 'feedback_quality', 'success_rate'],
        learningContribution: 0.6,
        uncertaintyLevel: 0.4
      });
    }

    return personalizedPredictions;
  }

  /**
   * Process user feedback to improve models
   */
  async processFeedback(feedback: FeedbackData): Promise<void> {
    this.feedbackHistory.push(feedback);
    
    // Update model accuracy
    const predictionType = this.extractPredictionType(feedback.predictionId);
    const model = this.getModel(predictionType);
    
    if (model) {
      await this.updateModelAccuracy(model, feedback);
      await this.adjustModelParameters(model, feedback);
    }

    // Learn from feedback patterns
    await this.learnFromFeedbackPatterns();
  }

  /**
   * Update prediction models based on accuracy data
   */
  private async updateModelAccuracy(model: AdaptivePredictionModel, feedback: FeedbackData): Promise<void> {
    const newAccuracyRecord: AccuracyRecord = {
      timestamp: new Date(),
      accuracy: feedback.accuracyScore,
      predictionCount: 1,
      feedbackCount: 1,
      contextFactors: Object.keys(feedback.contextAtTime || {})
    };

    model.performanceHistory.push(newAccuracyRecord);
    
    // Calculate new overall accuracy with decay factor for older records
    const decayFactor = 0.95;
    let totalWeightedAccuracy = 0;
    let totalWeight = 0;

    model.performanceHistory.forEach((record, index) => {
      const weight = Math.pow(decayFactor, model.performanceHistory.length - index - 1);
      totalWeightedAccuracy += record.accuracy * weight;
      totalWeight += weight;
    });

    model.accuracy = totalWeightedAccuracy / totalWeight;
    model.lastUpdated = new Date();

    // Adaptive learning rate based on feedback frequency
    if (model.performanceHistory.length > 10) {
      model.parameters.learningRate *= 0.98; // Reduce learning rate as model stabilizes
    }
  }

  /**
   * Adjust model parameters based on feedback
   */
  private async adjustModelParameters(model: AdaptivePredictionModel, feedback: FeedbackData): Promise<void> {
    // Adjust confidence threshold based on user feedback
    if (feedback.userFeedback.accuracy === AccuracyRating.TooHigh) {
      model.parameters.confidenceThreshold *= 1.05;
    } else if (feedback.userFeedback.accuracy === AccuracyRating.TooLow) {
      model.parameters.confidenceThreshold *= 0.95;
    }

    // Adjust feedback weight based on usefulness
    if (feedback.userFeedback.usefulness === UsefulnessRating.Helpful) {
      model.parameters.feedbackWeight = Math.min(1.0, model.parameters.feedbackWeight * 1.1);
    } else if (feedback.userFeedback.usefulness === UsefulnessRating.Unhelpful) {
      model.parameters.feedbackWeight = Math.max(0.1, model.parameters.feedbackWeight * 0.9);
    }

    // Adjust adaptation speed based on user engagement
    if (feedback.userFeedback.wouldUseAgain) {
      if (model.parameters.adaptationSpeed === 'slow') {
        model.parameters.adaptationSpeed = 'medium';
      } else if (model.parameters.adaptationSpeed === 'medium') {
        model.parameters.adaptationSpeed = 'fast';
      }
    }
  }

  /**
   * Learn from feedback patterns across all models
   */
  private async learnFromFeedbackPatterns(): Promise<void> {
    if (this.feedbackHistory.length < 10) return;

    const recentFeedback = this.feedbackHistory.slice(-20);
    
    // Identify systematic biases
    const averageRating = recentFeedback.reduce((sum, f) => sum + f.userFeedback.rating, 0) / recentFeedback.length;
    
    if (averageRating < 3) {
      // User generally unsatisfied, be more conservative
      this.adjustAllModelsConservatively();
    } else if (averageRating > 4) {
      // User satisfied, can be more aggressive
      this.adjustAllModelsAggressively();
    }

    // Learn time-based patterns
    const timeBasedAccuracy = this.analyzeTimeBasedAccuracy(recentFeedback);
    this.applyTimeBasedAdjustments(timeBasedAccuracy);
  }

  // Helper methods
  private initializeModels(): void {
    const modelTypes: PredictionModelType[] = [
      'task_completion', 'deadline_risk', 'workload_capacity',
      'productivity_forecast', 'time_estimation', 'priority_scoring'
    ];

    modelTypes.forEach(type => {
      const model: AdaptivePredictionModel = {
        id: `model_${type}_${this.userId}`,
        version: '1.0.0',
        modelType: type,
        accuracy: 0.7, // Starting accuracy
        confidence: 0.6,
        trainingDataSize: 0,
        lastUpdated: new Date(),
        parameters: {
          learningRate: 0.1,
          adaptationSpeed: 'medium',
          confidenceThreshold: 0.7,
          feedbackWeight: 0.5,
          patternInfluence: 0.6,
          contextSensitivity: 0.4
        },
        performanceHistory: []
      };
      
      this.models.set(type, model);
      
    });
  }

  private getModel(type: PredictionModelType): AdaptivePredictionModel {
    return this.models.get(type)!;
  }

  private mapPredictionToModelType(predictionType: string): PredictionModelType {
    switch (predictionType) {
      case 'workload': return 'workload_capacity';
      case 'completion': return 'task_completion';
      case 'deadline': return 'deadline_risk';
      case 'productivity': return 'productivity_forecast';
      default: return 'task_completion';
    }
  }

  private calculateAdaptationScore(prediction: EnhancedPrediction, patterns: PatternInsight[]): number {
    const relevantPatterns = patterns.filter(p => 
      this.isRelevantPattern(p.type, prediction.type) ||
      prediction.factors.some(factor => p.description.includes(factor))
    );

    if (relevantPatterns.length === 0) return 0.5;

    const averageStrength = relevantPatterns.reduce((sum, p) => sum + p.strength, 0) / relevantPatterns.length;
    return Math.min(0.95, averageStrength * 0.8 + 0.2);
  }

  private isRelevantPattern(patternType: string, predictionType: string): boolean {
    // Map pattern types to prediction types
    const typeMapping: Record<string, string[]> = {
      'productivity_cycle': ['productivity', 'workload'],
      'procrastination': ['completion', 'deadline'],
      'time_estimation': ['completion', 'deadline'],
      'workflow_sequence': ['productivity', 'workload'],
      'ai_interaction': ['productivity'],
      'decision_making': ['productivity', 'completion']
    };

    return typeMapping[patternType]?.includes(predictionType) || false;
  }

  private adjustConfidenceScore(baseConfidence: number, modelAccuracy: number, adaptationScore: number): number {
    const adjustmentFactor = (modelAccuracy * 0.7) + (adaptationScore * 0.3);
    return Math.min(0.95, Math.max(0.1, baseConfidence * adjustmentFactor));
  }

  private identifyPersonalizedFactors(
    prediction: EnhancedPrediction,
    patterns: PatternInsight[],
    preferences: UserPreferences
  ): string[] {
    const personalizedFactors: string[] = [];

    // Add pattern-based factors
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        personalizedFactors.push(`${pattern.type}_pattern`);
      }
    });

    // Add preference-based factors
    personalizedFactors.push(`${preferences.planningStyle}_planner`);
    personalizedFactors.push(`${preferences.aiAssistanceLevel}_ai_user`);

    return personalizedFactors;
  }

  private calculateLearningContribution(predictionType: string, patterns: PatternInsight[]): number {
    const relevantPatterns = patterns.filter(p => this.isRelevantPattern(p.type, predictionType));
    return relevantPatterns.length > 0 ? relevantPatterns[0].confidence : 0.5;
  }

  private assessUncertaintyLevel(
    prediction: EnhancedPrediction,
    model: AdaptivePredictionModel,
    patterns: PatternInsight[]
  ): number {
    const factorUncertainty = 1 - (patterns.length / 10); // More patterns = less uncertainty
    const modelUncertainty = 1 - model.accuracy;
    const dataUncertainty = Math.max(0, 1 - (model.trainingDataSize / 100));

    return (factorUncertainty + modelUncertainty + dataUncertainty) / 3;
  }

  private enhanceRecommendations(
    baseRecommendations: string[],
    patterns: PatternInsight[],
    preferences: UserPreferences,
    metrics: PerformanceMetrics
  ): string[] {
    const enhanced = [...baseRecommendations];

    // Add pattern-based recommendations
    patterns.forEach(pattern => {
      if (pattern.recommendations.length > 0 && pattern.confidence > 0.7) {
        enhanced.push(...pattern.recommendations.slice(0, 2));
      }
    });

    // Add preference-based recommendations
    if (preferences.planningStyle === 'detailed') {
      enhanced.push('Create detailed subtasks cho better tracking');
    } else if (preferences.planningStyle === 'flexible') {
      enhanced.push('Keep some buffer time cho unexpected changes');
    }

    return [...new Set(enhanced)]; // Remove duplicates
  }

  private extractPredictionType(predictionId: string): PredictionModelType {
    if (predictionId.includes('workload')) return 'workload_capacity';
    if (predictionId.includes('deadline')) return 'deadline_risk';
    if (predictionId.includes('completion')) return 'task_completion';
    return 'productivity_forecast';
  }

  private adjustAllModelsConservatively(): void {
    this.models.forEach(model => {
      model.parameters.confidenceThreshold *= 1.1;
      model.parameters.learningRate *= 0.9;
    });
  }

  private adjustAllModelsAggressively(): void {
    this.models.forEach(model => {
      model.parameters.confidenceThreshold *= 0.95;
      model.parameters.learningRate *= 1.05;
    });
  }

  private analyzeTimeBasedAccuracy(feedback: FeedbackData[]): Record<string, number> {
    // Implementation for time-based accuracy analysis
    return {};
  }

  private applyTimeBasedAdjustments(timeBasedAccuracy: Record<string, number>): void {
    // Implementation for applying time-based adjustments
  }
}

export default AdaptivePredictor;

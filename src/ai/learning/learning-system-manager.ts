/**
 * Learning System Manager - Phase 4.3 Personal Analytics Focus
 * Orchestrates all AI learning components với tập trung vào phân tích cá nhân
 */

export interface LearningSystemConfig {
  userId: string;
  enableBehaviorTracking: boolean;
  enablePatternAnalysis: boolean;
  enableAdaptivePredictions: boolean;
  learningUpdateInterval: number; // minutes
  maxHistoryDays: number;
  confidenceThreshold: number;
}

export interface LearningSystemState {
  isActive: boolean;
  totalActions: number;
  patternsIdentified: number;
  predictionsGenerated: number;
  accuracyScore: number;
  lastAnalysis: Date | null;
  personalInsights: PersonalAnalyticsInsight[];
}

export interface LearningSystemMetrics {
  behaviorMetrics: PerformanceMetrics;
  patternInsights: PatternInsight[];
  predictionAccuracy: number;
  userEngagement: number;
  learningProgress: number;
  adaptationRate: number;
}

import type { Task, Client, Collaborator } from '@/lib/types';
import { BehaviorTracker, type ActionEvent, type UserBehaviorPattern, type PerformanceMetrics } from './behavior-tracker';
import { PatternAnalyzer, type PatternInsight } from './pattern-analyzer';
import { AdaptivePredictor, type AdaptivePrediction, type FeedbackData,  AccuracyRating, UsefulnessRating } from './adaptive-predictor';
import ProductivityAnalyzer from '../analytics/productivity-analyzer';
import TimeEfficiencyAnalyzer from '../analytics/time-efficiency-analyzer';
import PersonalDeadlineIntelligence from '../analytics/personal-deadline-intelligence';

export interface PersonalAnalyticsInsight {
  type: 'productivity' | 'time_efficiency' | 'deadline_management' | 'pattern_recognition';
  title: string;
  description: string;
  actionItems: string[];
  confidenceScore: number; // 0-100
  impactLevel: 'low' | 'medium' | 'high';
  category: 'immediate' | 'short_term' | 'long_term';
}

export class LearningSystemManager {
  private behaviorTracker: BehaviorTracker;
  private patternAnalyzer: PatternAnalyzer;
  private adaptivePredictor: AdaptivePredictor;
  private productivityAnalyzer: ProductivityAnalyzer;
  private timeEfficiencyAnalyzer: TimeEfficiencyAnalyzer;
  private deadlineIntelligence: PersonalDeadlineIntelligence;
  
  private isInitialized = false;
  private analysisCache = new Map<string, any>();

  constructor(private userId: string, tasks: Task[] = [], clients: Client[] = [], collaborators: Collaborator[] = []) {
    this.behaviorTracker = new BehaviorTracker(userId);
    this.patternAnalyzer = new PatternAnalyzer(userId);
    this.adaptivePredictor = new AdaptivePredictor(userId, tasks, clients, collaborators);
    this.productivityAnalyzer = new ProductivityAnalyzer(userId);
    this.timeEfficiencyAnalyzer = new TimeEfficiencyAnalyzer(userId);
    this.deadlineIntelligence = new PersonalDeadlineIntelligence(userId);
  }

  /**
   * Initialize the learning system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.isInitialized = true;
      console.log('Personal Analytics Learning System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize learning system:', error);
      throw error;
    }
  }

  /**
   * Track user action for personal analytics
   */
  async trackAction(action: ActionEvent): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Track với behavior tracker
      this.behaviorTracker.trackAction(action);
      
      // Clear relevant cache entries
      this.clearAnalysisCache();
      
      // Generate real-time insights if significant action
      if (this.isSignificantAction(action)) {
        await this.generateRealTimeInsights(action);
      }
    } catch (error) {
      console.error('Error tracking action:', error);
    }
  }

  /**
   * Generate comprehensive personal analytics insights
   */
  async generatePersonalInsights(
    tasks: Task[],
    clients: Client[] = [],
    collaborators: Collaborator[] = []
  ): Promise<PersonalAnalyticsInsight[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `insights_${Date.now()}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    try {
      const insights: PersonalAnalyticsInsight[] = [];
      
      // Get behavior data
      const actions = this.behaviorTracker.getRecentActions(30);
      const patterns = await this.patternAnalyzer.analyzeAllPatterns(actions);
      
      // Productivity insights
      const productivityMetrics = await this.productivityAnalyzer.getProductivityMetrics(
        actions, tasks, patterns
      );
      insights.push(...this.extractProductivityInsights(productivityMetrics));
      
      // Time efficiency insights
      const timeEfficiencyMetrics = await this.timeEfficiencyAnalyzer.getTimeEfficiencyMetrics(
        tasks, actions
      );
      insights.push(...this.extractTimeEfficiencyInsights(timeEfficiencyMetrics));
      
      // Deadline management insights
      const deadlineMetrics = await this.deadlineIntelligence.getDeadlineIntelligenceMetrics(
        tasks, actions
      );
      insights.push(...this.extractDeadlineInsights(deadlineMetrics));
      
      // Pattern recognition insights
      insights.push(...this.extractPatternInsights(patterns as any));
      
      // Sort by impact và confidence
      const sortedInsights = insights.sort((a, b) => {
        const impactWeight = { 'high': 3, 'medium': 2, 'low': 1 };
        return (impactWeight[b.impactLevel] * b.confidenceScore) - 
               (impactWeight[a.impactLevel] * a.confidenceScore);
      });
      
      this.analysisCache.set(cacheKey, sortedInsights);
      return sortedInsights;
      
    } catch (error) {
      console.error('Error generating personal insights:', error);
      return [];
    }
  }

  /**
   * Generate predictions for personal productivity
   */
  async generatePredictions(
    tasks: Task[],
    context: any = {}
  ): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
         const recentActions = this.behaviorTracker.getRecentActions(30);
          const patterns = await this.patternAnalyzer.analyzeAllPatterns(recentActions);
      
      return await this.adaptivePredictor.generateAdaptivePredictions(
         patterns,
         {} as any,
         {} as any
      );
    } catch (error) {
      console.error('Error generating predictions:', error);
      return [];
    }
  }

  /**
   * Process feedback to improve personal analytics
   */
  async processFeedback(
    predictionId: string,
    feedback: 'accurate' | 'inaccurate' | 'partially_accurate',
    details?: string
  ): Promise<void> {
        let accuracyFeedback: AccuracyRating  ;

       if (feedback === 'accurate') {
           accuracyFeedback = AccuracyRating.Accurate;
        } else if (feedback === 'inaccurate') {
            accuracyFeedback = AccuracyRating.TooLow;
       } else  {
            accuracyFeedback = AccuracyRating.TooHigh
        }

             
             const  userFeedback:UserFeedback = {rating:0, accuracy: accuracyFeedback , usefulness: UsefulnessRating.Neutral, wouldUseAgain: false }
    try {

           
          await this.adaptivePredictor.processFeedback(
              {
                  predictionId: predictionId, 
                  actualOutcome: null,
                  userFeedback:userFeedback,
                  contextAtTime: null,
                   accuracyScore: 0 
            } );
      
      // Clear cache to regenerate insights với updated learning
      this.clearAnalysisCache();
      
    } catch (error) {
      console.error('Error processing feedback:', error);
    }
  }

  /**
   * Get current learning system state
   */
  async getSystemState(): Promise<LearningSystemState> {
    try {
       const recentActions = this.behaviorTracker.getRecentActions(30);
        const patterns = await this.patternAnalyzer.analyzeAllPatterns(recentActions);
      
        const accuracy = 0.7;
      
      // Get recent insights for state
      const recentInsights = Array.from(this.analysisCache.values())
        .flat()
        .slice(0, 5); // Latest 5 insights
      
      return {
        isActive: this.isInitialized,
        totalActions: recentActions.length,
        patternsIdentified: patterns.length,
        predictionsGenerated: 0,
        accuracyScore: accuracy,
        lastAnalysis: recentActions.length > 0 ? new Date() : null,
        personalInsights: recentInsights
      };
    } catch (error) {
      console.error('Error getting system state:', error);
      return {
        isActive: false,
        totalActions: 0,
        patternsIdentified: 0,
        predictionsGenerated: 0,
        accuracyScore: 0,
        lastAnalysis: null,
        personalInsights: []
      };
    }
  }

  // Helper Methods
  private isSignificantAction(action: ActionEvent): boolean {
    const significantActions = ['complete', 'create', 'ai_query'];
    return significantActions.includes(action.actionType);
  }

  private async generateRealTimeInsights(action: ActionEvent): Promise<void> {
    // Generate immediate insights for significant actions
    if (action.actionType === 'complete') {
      // Task completion insights
      console.log(`Real-time insight: Task completed at ${action.timestamp.toLocaleTimeString()}`);
    }
  }

  private clearAnalysisCache(): void {
    // Keep only recent cache entries (last 5)
    const entries = Array.from(this.analysisCache.entries());
    if (entries.length > 5) {
      const toKeep = entries.slice(-5);
      this.analysisCache.clear();
      toKeep.forEach(([key, value]) => {
        this.analysisCache.set(key, value);
      });
    }
  }

  private extractProductivityInsights(metrics: any): PersonalAnalyticsInsight[] {
    const insights: PersonalAnalyticsInsight[] = [];
    
    if (metrics.overallTrend === 'improving') {
      insights.push({
        type: 'productivity',
        title: 'Productivity Improving',
        description: `Your productivity has been trending upward với current streak of ${metrics.currentStreak.days} days`,
        actionItems: [
          'Continue current working patterns',
          'Identify what\'s working well và replicate it'
        ],
        confidenceScore: 85,
        impactLevel: 'medium',
        category: 'short_term'
      });
    }

    if (metrics.peakPerformanceTimes.length > 0) {
      const peakTime = metrics.peakPerformanceTimes[0];
      insights.push({
        type: 'productivity',
        title: 'Optimal Performance Window Identified',
        description: `You're most productive between ${peakTime.startHour}:00 - ${peakTime.endHour}:00`,
        actionItems: [
          'Schedule important tasks during peak hours',
          'Protect this time from interruptions'
        ],
        confidenceScore: peakTime.consistency,
        impactLevel: 'high',
        category: 'immediate'
      });
    }

    return insights;
  }

  private extractTimeEfficiencyInsights(metrics: any): PersonalAnalyticsInsight[] {
    const insights: PersonalAnalyticsInsight[] = [];
    
    if (metrics.overallEfficiency < 70) {
      insights.push({
        type: 'time_efficiency',
        title: 'Time Efficiency Needs Improvement',
        description: `Current efficiency score: ${metrics.overallEfficiency}%. Focus areas identified.`,
        actionItems: [
          'Review estimation accuracy for better planning',
          'Identify và minimize time wastage areas'
        ],
        confidenceScore: 80,
        impactLevel: 'high',
        category: 'immediate'
      });
    }

    if (metrics.timeWastageAreas.length > 0) {
      const mainWastage = metrics.timeWastageAreas[0];
      insights.push({
        type: 'time_efficiency',
        title: 'Major Time Wastage Identified',
        description: `${mainWastage.area} is consuming ${mainWastage.minutesPerDay} minutes daily`,
        actionItems: mainWastage.solutions,
        confidenceScore: 75,
        impactLevel: 'medium',
        category: 'short_term'
      });
    }

    return insights;
  }

  private extractDeadlineInsights(metrics: any): PersonalAnalyticsInsight[] {
    const insights: PersonalAnalyticsInsight[] = [];
    
    if (metrics.overallAccuracy < 70) {
      insights.push({
        type: 'deadline_management',
        title: 'Deadline Accuracy Needs Attention',
        description: `Current deadline accuracy: ${metrics.overallAccuracy.toFixed(1)}%`,
        actionItems: [
          'Increase buffer time for task estimates',
          'Break down complex tasks into smaller milestones'
        ],
        confidenceScore: 85,
        impactLevel: 'high',
        category: 'immediate'
      });
    }

    const criticalTasks = metrics.riskAssessments.filter((r: any) => r.riskLevel === 'critical');
    if (criticalTasks.length > 0) {
      insights.push({
        type: 'deadline_management',
        title: 'Critical Deadline Alert',
        description: `${criticalTasks.length} task(s) at critical risk of missing deadline`,
        actionItems: [
          'Prioritize critical tasks immediately',
          'Consider requesting deadline extensions',
          'Focus on minimum viable deliverables'
        ],
        confidenceScore: 95,
        impactLevel: 'high',
        category: 'immediate'
      });
    }

    return insights;
  }

  private extractPatternInsights(patterns: UserBehaviorPattern[]): PersonalAnalyticsInsight[] {
    const insights: PersonalAnalyticsInsight[] = [];
    
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        insights.push({
          type: 'pattern_recognition',
          title: `${pattern.patternType} Pattern Detected`,
          description: pattern.description,
          actionItems: [
            'Leverage this pattern for better productivity',
            'Monitor pattern consistency để optimize workflow'
          ],
          confidenceScore: pattern.confidence * 100,
          impactLevel: pattern.frequency > 0.5 ? 'medium' : 'low',
          category: 'long_term'
        });
      }
    });

    return insights;
  }
}

// Factory for personal analytics system
export function createPersonalAnalyticsSystem(
  config: Partial<LearningSystemConfig>,
  tasks: Task[],
  clients: Client[],
  collaborators: Collaborator[]
): LearningSystemManager {
  const defaultConfig: LearningSystemConfig = {
    userId: 'personal_user',
    enableBehaviorTracking: true,
    enablePatternAnalysis: true,
    enableAdaptivePredictions: true,
    learningUpdateInterval: 30,
    maxHistoryDays: 90,
    confidenceThreshold: 0.7
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new LearningSystemManager(finalConfig.userId, tasks, clients, collaborators);
}

export default LearningSystemManager;

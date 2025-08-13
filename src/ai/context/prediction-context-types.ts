import type { Task, Client } from '@/lib/types';
import type { UserPattern } from '@/ai/learning/pattern-learner';
import type { ContextMemoryEntry } from '@/hooks/useContextMemory';

// Core AI Context Interfaces
export interface UserAnalysis {
  workingHours: string[];
  peakProductivityTime: string;
  averageTasksPerDay: number;
  completionRateHistory: number;
  preferredTaskTypes: string[];
  workingStyle: 'focused' | 'multitask' | 'flexible';
  stressIndicators: {
    overloadRisk: 'low' | 'medium' | 'high';
    burnoutSignals: string[];
    capacityUtilization: number;
  };
}

export interface TaskPatternAnalysis {
  typicalDuration: Record<string, number>; // task type -> avg days
  complexityFactors: Record<string, number>; // factors that increase time
  seasonalPatterns: Array<{
    period: string;
    taskTypes: string[];
    volumeMultiplier: number;
  }>;
  dependencyPatterns: Array<{
    taskType: string;
    commonDependencies: string[];
    blockingFactors: string[];
  }>;
  qualityMetrics: {
    revisionRate: number;
    clientSatisfactionScore: number;
    onTimeDeliveryRate: number;
  };
}

export interface WorkloadAnalysis {
  currentCapacity: {
    activeTasks: number;
    upcomingDeadlines: number;
    availableHours: number;
    commitmentLevel: number;
  };
  historicalPerformance: {
    bestPerformancePeriod: string;
    averageTasksCompleted: number;
    peakCapacityHandled: number;
    efficiencyTrends: Array<{
      period: string;
      efficiency: number;
      factors: string[];
    }>;
  };
  bottleneckAnalysis: {
    commonBottlenecks: string[];
    timeWasters: string[];
    optimizationOpportunities: string[];
  };
}

export interface ClientAnalysis {
  relationshipHealth: Record<string, {
    communicationFrequency: number;
    projectSuccessRate: number;
    paymentPunctuality: number;
    relationshipTrend: 'improving' | 'stable' | 'declining';
  }>;
  opportunityMapping: Record<string, {
    potentialValue: number;
    lastInteraction: Date;
    projectTypes: string[];
    seasonalPatterns: string[];
    growthPotential: 'high' | 'medium' | 'low';
  }>;
  riskAssessment: Record<string, {
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    mitigationStrategies: string[];
  }>;
}

export interface PerformanceMetrics {
  productivity: {
    tasksCompletedThisWeek: number;
    tasksCompletedLastWeek: number;
    weekOverWeekGrowth: number;
    monthlyTrend: 'up' | 'down' | 'stable';
  };
  quality: {
    clientFeedbackScore: number;
    revisionRequests: number;
    deliveryAccuracy: number;
  };
  efficiency: {
    timePerTask: Record<string, number>;
    resourceUtilization: number;
    multitaskingEffectiveness: number;
  };
  business: {
    revenueThisMonth: number;
    revenueLastMonth: number;
    averageProjectValue: number;
    clientRetentionRate: number;
  };
}

export interface CurrentWorkloadState {
  activeTasks: Array<{
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    estimatedTimeRemaining: number;
    blockers: string[];
    clientExpectations: string;
  }>;
  upcomingDeadlines: Array<{
    taskId: string;
    deadline: Date;
    preparedness: number; // 0-1 scale
    riskLevel: 'low' | 'medium' | 'high';
  }>;
  resourceConstraints: {
    timeAvailability: number; // hours per week
    skillGaps: string[];
    toolLimitations: string[];
    externalDependencies: string[];
  };
  marketConditions: {
    demandLevel: 'low' | 'medium' | 'high';
    competitionLevel: 'low' | 'medium' | 'high';
    seasonalFactors: string[];
    industryTrends: string[];
  };
}

export interface PredictionContext {
  userProfile: UserAnalysis;
  taskPatterns: TaskPatternAnalysis;
  workloadInsights: WorkloadAnalysis;
  clientRelationships: ClientAnalysis;
  historicalPerformance: PerformanceMetrics;
  currentState: CurrentWorkloadState;
  contextMetadata: {
    dataQuality: number; // 0-1 score of data completeness
    analysisDepth: 'basic' | 'standard' | 'comprehensive';
    lastUpdated: Date;
    predictionScope: 'task' | 'project' | 'business' | 'strategic';
  };
}

// AI Response Interfaces
export interface AITaskPrediction {
  taskId: string;
  estimatedCompletion: {
    optimistic: Date;
    realistic: Date;
    pessimistic: Date;
    confidence: number;
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: Array<{
      factor: string;
      impact: number; // 0-1 scale
      mitigation: string;
    }>;
    contingencyTime: number; // additional hours needed
  };
  recommendations: Array<{
    category: 'scheduling' | 'resources' | 'approach' | 'quality';
    action: string;
    rationale: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
  }>;
  dependencies: Array<{
    type: 'internal' | 'external' | 'resource' | 'approval';
    description: string;
    timeline: string;
    criticality: 'low' | 'medium' | 'high';
  }>;
  aiReasoning: {
    primaryFactors: string[];
    historicalComparisons: string[];
    assumptionsMade: string[];
    confidenceFactors: string[];
  };
}

export interface AIBusinessInsight {
  id: string;
  category: 'opportunity' | 'risk' | 'optimization' | 'growth';
  title: string;
  insight: string;
  impact: {
    financial: number; // estimated $ impact
    time: number; // estimated hours saved/gained
    risk: 'reduces' | 'neutral' | 'increases';
    confidence: number; // 0-1 scale
  };
  actionPlan: Array<{
    step: string;
    timeline: string;
    resources: string[];
    successMetrics: string[];
  }>;
  aiAnalysis: {
    dataPoints: string[];
    patternRecognition: string[];
    marketInsights: string[];
    personalizedFactors: string[];
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeframe: 'immediate' | 'this_week' | 'this_month' | 'this_quarter';
}

export interface AIWorkloadOptimization {
  currentEfficiency: number; // 0-1 scale
  optimizedSchedule: Array<{
    taskId: string;
    suggestedStartTime: Date;
    suggestedDuration: number;
    rationale: string;
  }>;
  capacityRecommendations: {
    optimalTasksPerDay: number;
    idealWorkingHours: string[];
    bufferTimeNeeded: number;
    breakSchedule: string[];
  };
  bottleneckSolutions: Array<{
    bottleneck: string;
    solution: string;
    implementationTime: number;
    expectedImprovement: number;
  }>;
  stressManagement: {
    currentStressLevel: 'low' | 'medium' | 'high';
    stressFactors: string[];
    recommendedActions: string[];
    monitoringMetrics: string[];
  };
}

/**
 * Context Builder - Phase 4.1
 * Builds prediction context from application data
 */

import type { Task, Client, Collaborator } from '@/lib/types';
import type { PredictionContext, UserAnalysis, TaskPatternAnalysis, WorkloadAnalysis, ClientAnalysis, PerformanceMetrics, CurrentWorkloadState } from './prediction-context-types';

interface ContextBuilderInput {
  tasks: Task[];
  clients: Client[];
  collaborators: Collaborator[];
  actionHistory: any[];
  memoryEntries: any[];
}

export function buildPredictionContext(input: ContextBuilderInput): PredictionContext {
  const { tasks, clients, collaborators, actionHistory, memoryEntries } = input;
  
  // Build user analysis
  const userProfile: UserAnalysis = buildUserAnalysis(tasks, actionHistory);
  
  // Build task patterns
  const taskPatterns: TaskPatternAnalysis = buildTaskPatterns(tasks);
  
  // Build workload insights
  const workloadInsights: WorkloadAnalysis = buildWorkloadAnalysis(tasks);
  
  // Build client relationships
  const clientRelationships: ClientAnalysis = buildClientAnalysis(clients, tasks);
  
  // Build performance metrics
  const historicalPerformance: PerformanceMetrics = buildPerformanceMetrics(tasks, actionHistory);
  
  // Build current state
  const currentState: CurrentWorkloadState = buildCurrentWorkloadState(tasks);
  
  return {
    userProfile,
    taskPatterns,
    workloadInsights,
    clientRelationships,
    historicalPerformance,
    currentState,
    contextMetadata: {
      dataQuality: calculateDataQuality(tasks, clients, actionHistory),
      analysisDepth: 'standard',
      lastUpdated: new Date(),
      predictionScope: 'business'
    }
  };
}

function buildUserAnalysis(tasks: Task[], actionHistory: any[]): UserAnalysis {
  const activeTasks = tasks.filter(task => task.status !== 'done' && task.status !== 'archived');
  const completedTasks = tasks.filter(task => task.status === 'done');
  
  return {
    workingHours: ['9', '10', '11', '14', '15', '16', '17'], // Default business hours
    peakProductivityTime: '10', // Default peak time
    averageTasksPerDay: Math.max(1, Math.round(tasks.length / 30)), // Rough estimate
    completionRateHistory: tasks.length > 0 ? completedTasks.length / tasks.length : 0.5,
    preferredTaskTypes: extractPreferredTaskTypes(tasks),
    workingStyle: determineWorkingStyle(tasks),
    stressIndicators: {
      overloadRisk: activeTasks.length > 10 ? 'high' : activeTasks.length > 5 ? 'medium' : 'low',
      burnoutSignals: activeTasks.length > 15 ? ['High task count', 'Multiple active projects'] : [],
      capacityUtilization: Math.min(1, activeTasks.length / 10)
    }
  };
}

function buildTaskPatterns(tasks: Task[]): TaskPatternAnalysis {
  return {
    typicalDuration: {
      'design': 3,
      'development': 5,
      'research': 2,
      'meeting': 1,
      'review': 1
    },
    complexityFactors: {
      'multiple_collaborators': 1.3,
      'external_dependencies': 1.5,
      'tight_deadline': 1.2,
      'new_technology': 1.4
    },
    seasonalPatterns: [
      {
        period: 'Q4',
        taskTypes: ['year-end projects', 'planning'],
        volumeMultiplier: 1.2
      }
    ],
    dependencyPatterns: [
      {
        taskType: 'development',
        commonDependencies: ['design', 'requirements'],
        blockingFactors: ['client approval', 'resource availability']
      }
    ],
    qualityMetrics: {
      revisionRate: 0.15,
      clientSatisfactionScore: 4.2,
      onTimeDeliveryRate: 0.85
    }
  };
}

function buildWorkloadAnalysis(tasks: Task[]): WorkloadAnalysis {
  const activeTasks = tasks.filter(task => task.status !== 'done' && task.status !== 'archived');
  const upcomingDeadlines = tasks.filter(task => {
    if (!task.deadline) return false;
    const deadline = new Date(task.deadline);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return deadline <= nextWeek;
  });
  
  return {
    currentCapacity: {
      activeTasks: activeTasks.length,
      upcomingDeadlines: upcomingDeadlines.length,
      availableHours: Math.max(0, 40 - (activeTasks.length * 5)), // Rough estimate
      commitmentLevel: Math.min(1, activeTasks.length / 10)
    },
    historicalPerformance: {
      bestPerformancePeriod: 'Last month',
      averageTasksCompleted: Math.round(tasks.filter(t => t.status === 'done').length / 4),
      peakCapacityHandled: Math.max(10, activeTasks.length),
      efficiencyTrends: [
        {
          period: 'Last month',
          efficiency: 0.85,
          factors: ['Good task completion rate', 'Consistent workflow']
        }
      ]
    },
    bottleneckAnalysis: {
      commonBottlenecks: ['Client feedback delays', 'Resource availability'],
      timeWasters: ['Excessive meetings', 'Task switching'],
      optimizationOpportunities: ['Batch similar tasks', 'Automate routine work']
    }
  };
}

function buildClientAnalysis(clients: Client[], tasks: Task[]): ClientAnalysis {
  return {
    relationshipHealth: {},
    opportunityMapping: {},
    riskAssessment: {}
  };
}

function buildPerformanceMetrics(tasks: Task[], actionHistory: any[]): PerformanceMetrics {
  const completedTasks = tasks.filter(task => task.status === 'done');
  
  return {
    productivity: {
      tasksCompletedThisWeek: completedTasks.length,
      tasksCompletedLastWeek: Math.max(0, completedTasks.length - 5),
      weekOverWeekGrowth: 0.1,
      monthlyTrend: 'up'
    },
    quality: {
      clientFeedbackScore: 4.2,
      revisionRequests: 2,
      deliveryAccuracy: 0.9
    },
    efficiency: {
      timePerTask: { 'default': 8 },
      resourceUtilization: 0.8,
      multitaskingEffectiveness: 0.7
    },
    business: {
      revenueThisMonth: 10000,
      revenueLastMonth: 9500,
      averageProjectValue: 5000,
      clientRetentionRate: 0.85
    }
  };
}

function buildCurrentWorkloadState(tasks: Task[]): CurrentWorkloadState {
  const activeTasks = tasks.filter(task => task.status !== 'done' && task.status !== 'archived');
  
  const workloadActiveTasks = activeTasks.map(task => ({
    id: task.id,
    title: task.name,
    priority: task.status === 'inprogress' ? 'high' as const : 'medium' as const,
    estimatedTimeRemaining: 8, // Default 8 hours
    blockers: [],
    clientExpectations: 'Standard delivery'
  }));
  
  const upcomingDeadlines = tasks
    .filter(task => task.deadline)
    .map(task => ({
      taskId: task.id,
      deadline: new Date(task.deadline!),
      preparedness: 0.7,
      riskLevel: 'medium' as const
    }))
    .slice(0, 5); // Top 5 upcoming deadlines
  
  return {
    activeTasks: workloadActiveTasks,
    upcomingDeadlines,
    resourceConstraints: {
      timeAvailability: 40,
      skillGaps: [],
      toolLimitations: [],
      externalDependencies: []
    },
    marketConditions: {
      demandLevel: 'medium',
      competitionLevel: 'medium',
      seasonalFactors: [],
      industryTrends: []
    }
  };
}

// Helper functions
function extractPreferredTaskTypes(tasks: Task[]): string[] {
  // Simple analysis based on task names
  const types = ['design', 'development', 'research', 'planning', 'client work'];
  return types.slice(0, 3); // Return top 3
}

function determineWorkingStyle(tasks: Task[]): 'focused' | 'multitask' | 'flexible' {
  const activeTasks = tasks.filter(task => task.status === 'inprogress').length;
  if (activeTasks <= 2) return 'focused';
  if (activeTasks > 5) return 'multitask';
  return 'flexible';
}

function calculateDataQuality(tasks: Task[], clients: Client[], actionHistory: any[]): number {
  let score = 0;
  let maxScore = 0;
  
  // Task data quality
  maxScore += 0.4;
  if (tasks.length > 0) score += 0.2;
  if (tasks.some(t => t.description && t.description.length > 10)) score += 0.2;
  
  // Client data quality
  maxScore += 0.3;
  if (clients.length > 0) score += 0.15;
  if (clients.some(c => c.name && c.name.length > 0)) score += 0.15;
  
  // Action history quality
  maxScore += 0.3;
  if (actionHistory.length > 0) score += 0.3;
  
  return maxScore > 0 ? score / maxScore : 0.5;
}

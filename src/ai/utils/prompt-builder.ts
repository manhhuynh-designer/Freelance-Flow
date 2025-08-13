import type { PredictionContext, AITaskPrediction, AIBusinessInsight, AIWorkloadOptimization } from '../context/prediction-context-types';
import type { Task } from '@/lib/types';

export interface PromptTemplate {
  system: string;
  user: string;
  format: string;
}

export class AIPromptBuilder {
  /**
   * Build prompt for task completion prediction
   */
  static buildTaskPredictionPrompt(task: Task, context: PredictionContext): PromptTemplate {
    const systemPrompt = `You are an expert AI project management consultant with deep expertise in freelance workflow optimization. Your role is to analyze task patterns, user behavior, and contextual factors to provide highly accurate task completion predictions.

EXPERTISE AREAS:
- Project timeline estimation with 90%+ accuracy
- Risk assessment and mitigation planning
- Resource optimization and bottleneck identification
- Client relationship and expectation management

ANALYSIS APPROACH:
- Use historical data patterns for baseline predictions
- Apply contextual factors for adjustment
- Consider user working style and peak productivity times
- Factor in external dependencies and potential blockers
- Provide confidence-scored recommendations`;

    const userPrompt = `TASK PREDICTION REQUEST

TARGET TASK:
- Name: ${task.name}
- Description: ${task.description}
- Client: ${this.getClientName(task, context)}
- Category: ${task.categoryId}
- Deadline: ${task.deadline}
- Start Date: ${task.startDate}
- Current Progress: ${task.progress || 0}%

USER CONTEXT:
- Working Style: ${context.userProfile.workingStyle}
- Peak Productivity: ${context.userProfile.peakProductivityTime}
- Average Tasks/Day: ${context.userProfile.averageTasksPerDay}
- Completion Rate: ${context.userProfile.completionRateHistory}%
- Stress Level: ${context.userProfile.stressIndicators.overloadRisk}

HISTORICAL PATTERNS:
- Typical Duration for ${task.categoryId}: ${context.taskPatterns.typicalDuration[task.categoryId] || 'Unknown'} days
- Quality Metrics: ${context.taskPatterns.qualityMetrics.onTimeDeliveryRate * 100}% on-time delivery
- Revision Rate: ${context.taskPatterns.qualityMetrics.revisionRate * 100}%

CURRENT WORKLOAD:
- Active Tasks: ${context.currentState.activeTasks.length}
- Upcoming Deadlines: ${context.currentState.upcomingDeadlines.length}
- Capacity Utilization: ${context.userProfile.stressIndicators.capacityUtilization * 100}%
- Available Hours/Week: ${context.currentState.resourceConstraints.timeAvailability}

PROVIDE INTELLIGENT ANALYSIS FOR:
1. Realistic completion timeline (optimistic, realistic, pessimistic scenarios)
2. Risk factors that could delay completion
3. Specific recommendations for optimization
4. Dependencies and blocking factors
5. Quality assurance considerations`;

    const formatPrompt = `RESPOND WITH STRUCTURED JSON:
{
  "taskId": "${task.id}",
  "estimatedCompletion": {
    "optimistic": "YYYY-MM-DD",
    "realistic": "YYYY-MM-DD", 
    "pessimistic": "YYYY-MM-DD",
    "confidence": 0.85
  },
  "riskAssessment": {
    "level": "low|medium|high",
    "factors": [
      {
        "factor": "specific risk description",
        "impact": 0.7,
        "mitigation": "specific action to mitigate"
      }
    ],
    "contingencyTime": 8
  },
  "recommendations": [
    {
      "category": "scheduling|resources|approach|quality",
      "action": "specific actionable recommendation",
      "rationale": "why this recommendation matters",
      "impact": "low|medium|high",
      "effort": "low|medium|high"
    }
  ],
  "dependencies": [
    {
      "type": "internal|external|resource|approval",
      "description": "specific dependency",
      "timeline": "when needed",
      "criticality": "low|medium|high"
    }
  ],
  "aiReasoning": {
    "primaryFactors": ["key factors influencing prediction"],
    "historicalComparisons": ["similar tasks analyzed"],
    "assumptionsMade": ["assumptions in analysis"],
    "confidenceFactors": ["what increases/decreases confidence"]
  }
}

IMPORTANT: Provide realistic, actionable insights based on the data. Be specific and avoid generic advice.`;

    return {
      system: systemPrompt,
      user: userPrompt,
      format: formatPrompt
    };
  }

  /**
   * Build prompt for business insights generation
   */
  static buildBusinessInsightsPrompt(context: PredictionContext): PromptTemplate {
    const systemPrompt = `You are a strategic business intelligence consultant specializing in freelance business optimization. Your expertise includes revenue optimization, client relationship management, market analysis, and operational efficiency.

CORE COMPETENCIES:
- Revenue growth strategy and opportunity identification
- Client lifetime value optimization
- Market positioning and competitive analysis
- Operational efficiency and process improvement
- Risk assessment and business continuity planning

ANALYSIS FRAMEWORK:
- Data-driven insights with confidence scoring
- Actionable recommendations with clear ROI
- Risk-adjusted opportunity assessment
- Timeline-specific implementation planning`;

    const userPrompt = `BUSINESS INTELLIGENCE REQUEST

CURRENT BUSINESS STATE:
- Total Clients: ${Object.keys(context.clientRelationships.relationshipHealth).length}
- Active Projects: ${context.currentState.activeTasks.length}
- Monthly Revenue Trend: ${context.historicalPerformance.business.revenueThisMonth > context.historicalPerformance.business.revenueLastMonth ? 'Growing' : 'Declining'}
- Client Retention Rate: ${context.historicalPerformance.business.clientRetentionRate * 100}%
- Average Project Value: $${context.historicalPerformance.business.averageProjectValue}

PERFORMANCE METRICS:
- Week-over-week Growth: ${context.historicalPerformance.productivity.weekOverWeekGrowth}%
- Delivery Accuracy: ${context.historicalPerformance.quality.deliveryAccuracy * 100}%
- Client Satisfaction: ${context.historicalPerformance.quality.clientFeedbackScore}/5
- Resource Utilization: ${context.historicalPerformance.efficiency.resourceUtilization * 100}%

MARKET POSITION:
- Demand Level: ${context.currentState.marketConditions.demandLevel}
- Competition Level: ${context.currentState.marketConditions.competitionLevel}
- Seasonal Factors: ${context.currentState.marketConditions.seasonalFactors.join(', ')}

OPERATIONAL EFFICIENCY:
- Current Capacity Utilization: ${context.userProfile.stressIndicators.capacityUtilization * 100}%
- Overload Risk: ${context.userProfile.stressIndicators.overloadRisk}
- Efficiency Score: ${context.historicalPerformance.efficiency.resourceUtilization * 100}%

IDENTIFY AND ANALYZE:
1. Revenue optimization opportunities
2. Client relationship enhancement strategies
3. Operational efficiency improvements
4. Market expansion possibilities
5. Risk mitigation priorities
6. Strategic growth recommendations`;

    const formatPrompt = `RESPOND WITH STRUCTURED JSON ARRAY:
[
  {
    "id": "unique-insight-id",
    "category": "opportunity|risk|optimization|growth",
    "title": "Clear, actionable insight title",
    "insight": "Detailed analysis and explanation",
    "impact": {
      "financial": 2500,
      "time": 10,
      "risk": "reduces|neutral|increases",
      "confidence": 0.85
    },
    "actionPlan": [
      {
        "step": "Specific action step",
        "timeline": "this_week|this_month|this_quarter",
        "resources": ["required resources"],
        "successMetrics": ["measurable outcomes"]
      }
    ],
    "aiAnalysis": {
      "dataPoints": ["key data supporting this insight"],
      "patternRecognition": ["patterns identified"],
      "marketInsights": ["market context"],
      "personalizedFactors": ["user-specific considerations"]
    },
    "priority": "low|medium|high|urgent",
    "timeframe": "immediate|this_week|this_month|this_quarter"
  }
]

FOCUS ON: High-impact, actionable insights with clear implementation paths and measurable outcomes.`;

    return {
      system: systemPrompt,
      user: userPrompt,
      format: formatPrompt
    };
  }

  /**
   * Build prompt for workload optimization
   */
  static buildWorkloadOptimizationPrompt(context: PredictionContext): PromptTemplate {
    const systemPrompt = `You are a productivity optimization specialist with expertise in workload management, stress reduction, and performance enhancement for knowledge workers and freelancers.

SPECIALIZATION AREAS:
- Workload capacity planning and optimization
- Stress management and burnout prevention
- Peak performance scheduling
- Bottleneck identification and resolution
- Sustainable productivity strategies

OPTIMIZATION PRINCIPLES:
- Human-centered productivity (not just efficiency)
- Sustainable long-term performance
- Work-life balance integration
- Evidence-based scheduling recommendations
- Proactive stress and bottleneck management`;

    const userPrompt = `WORKLOAD OPTIMIZATION REQUEST

CURRENT WORKLOAD STATE:
- Active Tasks: ${context.currentState.activeTasks.length}
- Upcoming Deadlines: ${context.currentState.upcomingDeadlines.length}
- Capacity Utilization: ${context.userProfile.stressIndicators.capacityUtilization * 100}%
- Overload Risk Level: ${context.userProfile.stressIndicators.overloadRisk}

USER PRODUCTIVITY PROFILE:
- Working Style: ${context.userProfile.workingStyle}
- Peak Performance Time: ${context.userProfile.peakProductivityTime}
- Average Tasks/Day: ${context.userProfile.averageTasksPerDay}
- Working Hours: ${context.userProfile.workingHours.join(', ')}

PERFORMANCE PATTERNS:
- Weekly Performance Trend: ${context.historicalPerformance.productivity.monthlyTrend}
- Multitasking Effectiveness: ${context.historicalPerformance.efficiency.multitaskingEffectiveness * 100}%
- Resource Utilization: ${context.historicalPerformance.efficiency.resourceUtilization * 100}%

STRESS INDICATORS:
- Burnout Signals: ${context.userProfile.stressIndicators.burnoutSignals.join(', ') || 'None detected'}
- Time Availability: ${context.currentState.resourceConstraints.timeAvailability} hours/week

TASK ANALYSIS:
${context.currentState.activeTasks.map(task => 
  `- ${task.title}: ${task.estimatedTimeRemaining}h remaining, Priority: ${task.priority}`
).join('\n')}

OPTIMIZE FOR:
1. Sustainable workload distribution
2. Peak performance utilization
3. Stress reduction and burnout prevention
4. Bottleneck elimination
5. Enhanced overall efficiency`;

    const formatPrompt = `RESPOND WITH STRUCTURED JSON:
{
  "currentEfficiency": 0.75,
  "optimizedSchedule": [
    {
      "taskId": "task-id",
      "suggestedStartTime": "2024-08-09T09:00:00Z",
      "suggestedDuration": 4,
      "rationale": "Schedule during peak performance time for maximum efficiency"
    }
  ],
  "capacityRecommendations": {
    "optimalTasksPerDay": 3,
    "idealWorkingHours": ["09:00-12:00", "14:00-17:00"],
    "bufferTimeNeeded": 2,
    "breakSchedule": ["12:00-13:00", "15:00-15:15"]
  },
  "bottleneckSolutions": [
    {
      "bottleneck": "Specific bottleneck identified",
      "solution": "Actionable solution",
      "implementationTime": 2,
      "expectedImprovement": 0.25
    }
  ],
  "stressManagement": {
    "currentStressLevel": "low|medium|high",
    "stressFactors": ["identified stress factors"],
    "recommendedActions": ["specific stress reduction actions"],
    "monitoringMetrics": ["metrics to track stress levels"]
  }
}

PROVIDE: Specific, implementable recommendations that balance productivity with well-being.`;

    return {
      system: systemPrompt,
      user: userPrompt,
      format: formatPrompt
    };
  }

  /**
   * Helper method to get client name from context
   */
  private static getClientName(task: Task, context: PredictionContext): string {
    // This would need to be implemented to lookup client name by ID
    return task.clientId || 'Unknown Client';
  }

  /**
   * Build context-aware prompt for general predictions
   */
  static buildGeneralPredictionPrompt(context: PredictionContext, specificQuery: string): PromptTemplate {
    const systemPrompt = `You are an intelligent freelance productivity assistant with comprehensive knowledge of project management, business optimization, and workflow efficiency.

CORE CAPABILITIES:
- Pattern recognition in work habits and productivity
- Predictive analysis for project timelines and outcomes
- Business intelligence and opportunity identification
- Risk assessment and mitigation strategies
- Personalized productivity recommendations

ANALYSIS APPROACH:
- Evidence-based insights from historical data
- Context-aware recommendations
- Confidence-scored predictions
- Actionable, specific guidance`;

    const userPrompt = `ANALYSIS REQUEST: ${specificQuery}

COMPREHENSIVE CONTEXT:
Data Quality: ${context.contextMetadata.dataQuality * 100}%
Analysis Depth: ${context.contextMetadata.analysisDepth}
Prediction Scope: ${context.contextMetadata.predictionScope}

USER PROFILE:
- Completion Rate: ${context.userProfile.completionRateHistory}%
- Working Style: ${context.userProfile.workingStyle}
- Peak Time: ${context.userProfile.peakProductivityTime}
- Stress Level: ${context.userProfile.stressIndicators.overloadRisk}

CURRENT STATE:
- Active Tasks: ${context.currentState.activeTasks.length}
- Capacity: ${context.userProfile.stressIndicators.capacityUtilization * 100}%
- Performance Trend: ${context.historicalPerformance.productivity.monthlyTrend}

Provide intelligent, actionable insights based on this comprehensive context.`;

    const formatPrompt = `RESPOND WITH CLEAR, STRUCTURED ANALYSIS:
- Lead with key insights
- Provide specific recommendations
- Include confidence levels
- Suggest measurable actions
- Consider user's current context and constraints

Format as clear, actionable guidance that helps the user make informed decisions.`;

    return {
      system: systemPrompt,
      user: userPrompt,
      format: formatPrompt
    };
  }
}

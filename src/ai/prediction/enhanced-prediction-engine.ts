import { Task, Client, Collaborator } from '@/lib/types';
import { buildPredictionContext } from '../context/context-builder';
import { AITaskPredictor } from './ai-task-predictor';
import { AIBusinessInsightGenerator } from './ai-business-insights';
import { AIWorkloadOptimizer } from './ai-workload-optimizer';
import { AIConfigManager } from '../utils/ai-config-manager';

export interface EnhancedPrediction {
  id: string;
  type: 'workload' | 'completion' | 'deadline' | 'productivity';
  title: string;
  description: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  factors: string[];
  timeline: string;
  impact: string;
  recommendations: string[];
}

export interface WorkloadForecast {
  currentCapacity: number;
  projectedCapacity: number;
  overloadRisk: number;
  optimalTaskDistribution: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  recommendations: string[];
  timeline: string;
}

export interface DeadlineAlert {
  taskId: string;
  taskName: string;
  deadline: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  daysUntilDeadline: number;
  completionProbability: number;
  blockers: string[];
  recommendations: string[];
}

export class EnhancedPredictionEngine {
  private tasks: Task[];
  private clients: Client[];
  private collaborators: Collaborator[];
  private geminiApiKey: string | null;

  constructor(tasks: Task[], clients: Client[], collaborators: Collaborator[]) {
    this.tasks = tasks;
    this.clients = clients;
    this.collaborators = collaborators;
    this.geminiApiKey = AIConfigManager.getGeminiApiKey();
  }

  async generatePredictions(): Promise<EnhancedPrediction[]> {
    if (!this.geminiApiKey) {
      console.warn('🔑 No Gemini API key found, using fallback predictions');
      return this.getFallbackPredictions();
    }

    try {
      console.log('🤖 Starting AI-powered predictions...');
      
      const context = buildPredictionContext({
        tasks: this.tasks,
        clients: this.clients,
        collaborators: this.collaborators,
        actionHistory: [],
        memoryEntries: []
      });

      const predictions: EnhancedPrediction[] = [];

      // 🤖 AI Task Predictions
      console.log('📋 Generating AI task predictions...');
      const aiTaskPredictions = await AITaskPredictor.generateGeneralPredictions({
        context,
        geminiApiKey: this.geminiApiKey,
        focusArea: 'all'
      });

      if (aiTaskPredictions.success && aiTaskPredictions.predictions.length > 0) {
        aiTaskPredictions.predictions.forEach((pred: any, index: number) => {
          predictions.push({
            id: `ai-task-${index}`,
            type: 'completion',
            title: pred.title || `AI Task Prediction ${index + 1}`,
            description: pred.description || 'AI-generated task insight',
            confidence: pred.confidence || 0.75,
            urgency: pred.urgency || 'medium',
            recommendation: pred.recommendation || pred.suggestions?.[0] || 'Continue monitoring',
            factors: pred.factors || ['AI analysis', 'Historical patterns'],
            timeline: pred.timeline || 'Next week',
            impact: pred.impact || 'Improved productivity',
            recommendations: pred.suggestions || pred.recommendations || ['Follow AI recommendations']
          });
        });
      }

      // 💼 AI Business Insights
      console.log('💼 Generating AI business insights...');
      const aiBusinessInsights = await AIBusinessInsightGenerator.generateBusinessInsights({
        context,
        geminiApiKey: this.geminiApiKey,
        focusArea: 'all'
      });

      if (aiBusinessInsights.success && aiBusinessInsights.insights.length > 0) {
        aiBusinessInsights.insights.forEach((insight: any, index: number) => {
          predictions.push({
            id: `ai-business-${index}`,
            type: 'productivity',
            title: insight.title || `Business Insight ${index + 1}`,
            description: insight.insight || 'AI-generated business insight',
            confidence: insight.impact?.confidence || 0.8,
            urgency: insight.priority === 'urgent' ? 'critical' : 
                    insight.priority === 'high' ? 'high' : 'medium',
            recommendation: typeof insight.actionPlan?.[0] === 'object' ? insight.actionPlan[0].step : insight.actionPlan?.[0] || 'Review and implement',
            factors: insight.aiAnalysis?.dataPoints || ['Business analysis', 'Market trends'],
            timeline: insight.timeframe || 'This month',
            impact: `Potential: $${insight.impact?.financial || 0}`,
            recommendations: Array.isArray(insight.actionPlan) 
              ? insight.actionPlan.map((item: any) => typeof item === 'object' ? item.step : item)
              : ['Implement business strategy']
          });
        });
      }

      // ⚡ AI Workload Optimization
      console.log('⚡ Generating AI workload optimization...');
      const aiWorkloadOptimization = await AIWorkloadOptimizer.optimizeWorkload({
        context,
        geminiApiKey: this.geminiApiKey,
        optimizationGoal: 'balance'
      });

      if (aiWorkloadOptimization.success && aiWorkloadOptimization.optimization) {
        const opt = aiWorkloadOptimization.optimization;
        predictions.push({
          id: 'ai-workload-optimization',
          type: 'workload',
          title: 'AI Workload Optimization',
          description: `Current efficiency: ${(opt.currentEfficiency * 100).toFixed(1)}%`,
          confidence: 0.85,
          urgency: opt.stressManagement.currentStressLevel === 'high' ? 'high' : 'medium',
          recommendation: opt.bottleneckSolutions[0]?.solution || 'Optimize workload distribution',
          factors: ['AI workload analysis', 'Stress indicators', 'Capacity planning'],
          timeline: 'Immediate implementation',
          impact: 'Improved work-life balance',
          recommendations: opt.stressManagement.recommendedActions || ['Balance workload']
        });
      }

      // Always add traditional workload analysis as backup
      const workloadPrediction = await this.analyzeWorkloadCapacity();
      predictions.push({
        id: 'workload-forecast',
        type: 'workload',
        title: 'Workload Capacity Analysis',
        description: `Current capacity: ${workloadPrediction.currentCapacity}%`,
        confidence: 0.75,
        urgency: workloadPrediction.overloadRisk > 70 ? 'critical' : 
                 workloadPrediction.overloadRisk > 50 ? 'high' : 'medium',
        recommendation: workloadPrediction.recommendations[0] || 'Maintain current pace',
        factors: ['Active tasks', 'Deadline pressure', 'Resource availability'],
        timeline: workloadPrediction.timeline,
        impact: 'Optimized work performance',
        recommendations: workloadPrediction.recommendations
      });

      // Deadline Alerts
      const deadlineAlerts = await this.analyzeDeadlineRisks();
      deadlineAlerts.forEach((alert, index) => {
        predictions.push({
          id: `deadline-${index}`,
          type: 'deadline',
          title: `Cảnh báo deadline: ${alert.taskName}`,
          description: `Mức độ rủi ro: ${alert.riskLevel.toUpperCase()}`,
          confidence: 0.82,
          urgency: alert.riskLevel === 'critical' ? 'critical' : 
                  alert.riskLevel === 'high' ? 'high' : 'medium',
          recommendation: alert.recommendations[0] || 'Cần xem xét lại timeline',
          factors: alert.blockers,
          timeline: `${alert.daysUntilDeadline} ngày còn lại`,
          impact: 'Tránh trễ deadline quan trọng',
          recommendations: alert.recommendations
        });
      });

      // Productivity forecast
      const productivityForecast = await this.generateProductivityForecast();
      predictions.push({
        id: 'productivity-forecast',
        type: 'productivity',
        title: 'Dự báo năng suất',
        description: productivityForecast.summary,
        confidence: 0.75,
        urgency: 'medium',
        recommendation: productivityForecast.primaryRecommendation,
        factors: productivityForecast.keyFactors,
        timeline: 'Tuần tới',
        impact: 'Tăng hiệu quả công việc tổng thể',
        recommendations: productivityForecast.recommendations
      });

      console.log(`✅ Generated ${predictions.length} AI-powered predictions`);
      return predictions;

    } catch (error) {
      console.error('🚨 AI Prediction Error:', error);
      return this.getFallbackPredictions();
    }
  }

  // Fallback predictions when AI fails
  private getFallbackPredictions(): EnhancedPrediction[] {
    console.log('🔄 Using fallback predictions...');
    
    const predictions: EnhancedPrediction[] = [];
    
    // Basic workload analysis
    const activeTasks = this.tasks.filter(task => 
      task.status === 'todo' || task.status === 'inprogress'
    );

    predictions.push({
      id: 'fallback-workload',
      type: 'workload',
      title: 'Basic Workload Analysis',
      description: `You have ${activeTasks.length} active tasks`,
      confidence: 0.6,
      urgency: activeTasks.length > 8 ? 'high' : 'medium',
      recommendation: activeTasks.length > 8 ? 
        'Consider prioritizing or delegating some tasks' : 
        'Workload is manageable',
      factors: ['Active task count', 'Basic analysis'],
      timeline: 'Current status',
      impact: 'Basic productivity insight',
      recommendations: [
        'Review task priorities',
        'Consider time blocking',
        'Monitor progress regularly'
      ]
    });

    return predictions;
  }

  async analyzeWorkloadCapacity(): Promise<WorkloadForecast> {
    const activeTasks = this.tasks.filter(task => 
      task.status === 'todo' || task.status === 'inprogress'
    );

    const currentCapacity = Math.min(100, (activeTasks.length / 10) * 100);
    const projectedCapacity = Math.min(100, currentCapacity * 1.1);
    const overloadRisk = activeTasks.length > 8 ? 80 : activeTasks.length > 5 ? 50 : 20;

    return {
      currentCapacity,
      projectedCapacity,
      overloadRisk,
      optimalTaskDistribution: {
        daily: Math.ceil(activeTasks.length / 7),
        weekly: activeTasks.length,
        monthly: activeTasks.length * 4
      },
      recommendations: [
        overloadRisk > 70 ? 'Cần giảm tải công việc hoặc gia hạn deadline' :
        overloadRisk > 50 ? 'Cân nhắc phân bổ lại task priority' :
        'Khối lượng công việc trong tầm kiểm soát',
        'Tối ưu hóa thời gian làm việc concentrated',
        'Setup automation cho repeated tasks'
      ],
      timeline: '7-14 ngày tới'
    };
  }

  async predictTaskCompletionTimes(): Promise<Array<{
    taskName: string;
    completionProbability: number;
    daysUntilDeadline: number;
    blockers: string[];
    recommendations: string[];
  }>> {
    const urgentTasks = this.tasks
      .filter(task => task.deadline && new Date(task.deadline) > new Date())
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5);

    return urgentTasks.map(task => {
      const daysUntilDeadline = Math.ceil(
        (new Date(task.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const completionProbability = task.status === 'inprogress' ? 
        Math.max(20, 80 - (daysUntilDeadline < 3 ? 30 : 0)) :
        Math.max(10, 60 - (daysUntilDeadline < 5 ? 20 : 0));

      return {
        taskName: task.name,
        completionProbability,
        daysUntilDeadline,
        blockers: [
          daysUntilDeadline < 3 ? 'Thời gian rất gấp' : '',
          task.status === 'todo' ? 'Chưa bắt đầu' : '',
          'Dependency on external factors'
        ].filter(Boolean),
        recommendations: [
          daysUntilDeadline < 3 ? 'Tập trung 100% cho task này' : 'Lên plan chi tiết',
          'Break down thành subtasks nhỏ hơn',
          'Setup daily check-in progress'
        ]
      };
    });
  }

  async analyzeDeadlineRisks(): Promise<DeadlineAlert[]> {
    const riskyTasks = this.tasks.filter(task => {
      if (!task.deadline) return false;
      const daysUntil = Math.ceil(
        (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil <= 7 && (task.status === 'todo' || task.status === 'inprogress');
    });

    return riskyTasks.map(task => {
      const daysUntilDeadline = Math.ceil(
        (new Date(task.deadline!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (daysUntilDeadline <= 1) riskLevel = 'critical';
      else if (daysUntilDeadline <= 3) riskLevel = 'high';
      else if (daysUntilDeadline <= 5) riskLevel = 'medium';
      else riskLevel = 'low';

      const completionProbability = task.status === 'inprogress' ?
        Math.max(30, 90 - (7 - daysUntilDeadline) * 15) :
        Math.max(15, 70 - (7 - daysUntilDeadline) * 20);

      return {
        taskId: task.id,
        taskName: task.name,
        deadline: typeof task.deadline === 'string' ? task.deadline : task.deadline!.toISOString(),
        riskLevel,
        daysUntilDeadline,
        completionProbability,
        blockers: [
          daysUntilDeadline <= 1 ? 'DEADLINE HÔM NAY!' : '',
          task.status === 'todo' ? 'Chưa bắt đầu làm' : '',
          'Thiếu thông tin chi tiết',
          'Phụ thuộc vào bên thứ 3'
        ].filter(Boolean),
        recommendations: [
          riskLevel === 'critical' ? 'DROP EVERYTHING - FOCUS on this task!' : 
          riskLevel === 'high' ? 'Làm task này trong 2-3 giờ tới' : 
          'Lên plan chi tiết và timeline',
          'Liên hệ client để clarify requirements',
          'Prepare backup plan nếu không kịp'
        ]
      };
    });
  }

  async generateProductivityForecast(): Promise<{
    summary: string;
    primaryRecommendation: string;
    keyFactors: string[];
    recommendations: string[];
  }> {
    const completedTasks = this.tasks.filter(task => task.status === 'done');
    const totalTasks = this.tasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

    const avgTasksPerWeek = completedTasks.length / 4; // Assuming 4 weeks data
    const projectedProductivity = avgTasksPerWeek * 1.1; // 10% improvement target

    return {
      summary: `Tỷ lệ hoàn thành: ${completionRate.toFixed(1)}%. Dự báo cải thiện 10% tuần tới.`,
      primaryRecommendation: completionRate < 70 ? 
        'Focus on completing existing tasks thay vì nhận thêm task mới' :
        'Có thể nhận thêm task nhẹ nhàng',
      keyFactors: [
        'Task completion velocity',
        'Quality vs Speed balance',
        'External dependencies impact',
        'Time management efficiency'
      ],
      recommendations: [
        'Implement Pomodoro technique cho deep work',
        'Batch similar tasks together',
        'Set up automation cho repeated processes',
        'Weekly review & planning sessions',
        'Limit work-in-progress tasks (max 3-4)'
      ]
    };
  }
}

export default EnhancedPredictionEngine;

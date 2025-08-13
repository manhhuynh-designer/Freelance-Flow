import { Task, Client, Collaborator, AppData } from '@/lib/types';
import { buildPredictionContext } from '../context/context-builder';
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
  private appData: AppData;

  constructor(appData: AppData) {
    this.appData = appData;
  }

  async generatePredictions(): Promise<EnhancedPrediction[]> {
    const tasks = this.appData.tasks;
    const clients = this.appData.clients;
    const collaborators = this.appData.collaborators;

    const context = buildPredictionContext({
      tasks,
      clients,
      collaborators,
      actionHistory: [],
      memoryEntries: []
    });

    const predictions: EnhancedPrediction[] = [];

    // Workload capacity prediction using real data
    const workloadPrediction = await this.analyzeWorkloadCapacity(tasks);
    predictions.push({
      id: 'workload-forecast',
      type: 'workload',
      title: 'Dự báo khối lượng công việc',
      description: `Khả năng xử lý công việc hiện tại: ${workloadPrediction.currentCapacity}%`,
      confidence: 0.85,
      urgency: workloadPrediction.overloadRisk > 70 ? 'critical' : 
               workloadPrediction.overloadRisk > 50 ? 'high' : 'medium',
      recommendation: workloadPrediction.recommendations[0] || 'Duy trì tốc độ công việc hiện tại',
      factors: ['Số lượng task active', 'Deadline pressure', 'Resource availability'],
      timeline: workloadPrediction.timeline,
      impact: 'Tối ưu hóa hiệu suất làm việc',
      recommendations: workloadPrediction.recommendations
    });

    // Task completion predictions using real data
    const completionPredictions = await this.predictTaskCompletionTimes(tasks);
    completionPredictions.forEach((pred, index) => {
      predictions.push({
        id: `completion-${index}`,
        type: 'completion',
        title: `Dự báo hoàn thành: ${pred.taskName}`,
        description: `Xác suất hoàn thành đúng hạn: ${pred.completionProbability}%`,
        confidence: 0.78,
        urgency: pred.completionProbability < 50 ? 'high' : 'medium',
        recommendation: pred.recommendations[0] || 'Tiếp tục theo dõi tiến độ',
        factors: pred.blockers,
        timeline: `${pred.daysUntilDeadline} ngày`,
        impact: 'Đảm bảo deadline project',
        recommendations: pred.recommendations
      });
    });

    // Deadline risk analysis using real data
    const deadlineAlerts = await this.analyzeDeadlineRisks(tasks);
    deadlineAlerts.forEach((alert, index) => {
      predictions.push({
        id: `deadline-${index}`,
        type: 'deadline',
        title: `Cảnh báo deadline: ${alert.taskName}`,
        description: `Nguy cơ trễ hạn: ${alert.riskLevel}`,
        confidence: 0.82,
        urgency: alert.riskLevel === 'critical' ? 'critical' : 
                alert.riskLevel === 'high' ? 'high' : 'medium',
        recommendation: alert.recommendations[0] || 'Theo dõi tiến độ sát sao',
        factors: alert.blockers,
        timeline: `${alert.daysUntilDeadline} ngày`,
        impact: 'Tránh trễ deadline',
        recommendations: alert.recommendations
      });
    });

    // Productivity optimization
    const productivityInsight = await this.analyzeProductivityTrends(tasks);
    if (productivityInsight) {
      predictions.push(productivityInsight);
    }

    return predictions;
  }

  private async analyzeWorkloadCapacity(tasks: Task[]): Promise<WorkloadForecast> {
    const activeTasks = tasks.filter(t => ['todo', 'inprogress'].includes(t.status) && !t.deletedAt);
    const completedTasks = tasks.filter(t => t.status === 'done');
    
    // Calculate current capacity based on active vs completed ratio
    const totalTasks = activeTasks.length + completedTasks.length;
    const currentCapacity = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 100;
    
    // Calculate overload risk based on active tasks and upcoming deadlines
    const now = new Date();
    const urgentTasks = activeTasks.filter(t => {
      if (!t.deadline) return false;
      const deadline = new Date(t.deadline);
      const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilDeadline <= 7; // Urgent if deadline within 7 days
    });
    
    const overloadRisk = Math.min(100, (urgentTasks.length / Math.max(1, activeTasks.length)) * 100);
    
    const recommendations: string[] = [];
    if (overloadRisk > 70) {
      recommendations.push('Cần ưu tiên các task có deadline gần nhất');
      recommendations.push('Xem xét hoãn hoặc ủy quyền một số task không cấp bách');
    } else if (overloadRisk > 40) {
      recommendations.push('Lập kế hoạch chi tiết cho các task sắp tới deadline');
      recommendations.push('Tăng cường theo dõi tiến độ hàng ngày');
    } else {
      recommendations.push('Tình hình workload ổn định');
      recommendations.push('Có thể nhận thêm project mới');
    }

    return {
      currentCapacity: Math.round(currentCapacity),
      projectedCapacity: Math.round(Math.max(50, currentCapacity - overloadRisk / 5)),
      overloadRisk: Math.round(overloadRisk),
      optimalTaskDistribution: {
        daily: Math.min(3, Math.max(1, Math.round(activeTasks.length / 7))),
        weekly: Math.min(15, Math.max(5, activeTasks.length)),
        monthly: activeTasks.length * 4
      },
      recommendations,
      timeline: 'Dự báo cho 2 tuần tới'
    };
  }

  private async predictTaskCompletionTimes(tasks: Task[]): Promise<DeadlineAlert[]> {
    const activeTasks = tasks.filter(t => ['todo', 'inprogress'].includes(t.status) && !t.deletedAt);
    const completedTasks = tasks.filter(t => t.status === 'done');
    
    // Calculate average completion time from historical data
    const avgCompletionDays = this.calculateAverageCompletionTime(completedTasks);
    
    const predictions: DeadlineAlert[] = [];
    const now = new Date();

    activeTasks.forEach(task => {
      if (!task.deadline) return;
      
      const deadline = new Date(task.deadline);
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Estimate completion probability based on time remaining vs average completion time
      let completionProbability = 100;
      if (daysUntilDeadline < avgCompletionDays) {
        completionProbability = Math.max(20, (daysUntilDeadline / avgCompletionDays) * 100);
      }
      
      const riskLevel = this.calculateRiskLevel(completionProbability, daysUntilDeadline);
      const blockers = this.identifyTaskBlockers(task, tasks);
      
      const recommendations: string[] = [];
      if (completionProbability < 50) {
        recommendations.push('Ưu tiên cao nhất cho task này');
        recommendations.push('Xem xét chia nhỏ task thành các phần nhỏ hơn');
      } else if (completionProbability < 70) {
        recommendations.push('Theo dõi tiến độ hàng ngày');
        recommendations.push('Chuẩn bị plan B nếu có delay');
      } else {
        recommendations.push('Tiến độ tốt, tiếp tục theo dõi');
      }
      
      predictions.push({
        taskId: task.id,
        taskName: task.name,
        deadline: task.deadline.toString(),
        riskLevel,
        daysUntilDeadline,
        completionProbability: Math.round(completionProbability),
        blockers,
        recommendations
      });
    });

    return predictions.slice(0, 5); // Return top 5 most relevant predictions
  }

  private async analyzeDeadlineRisks(tasks: Task[]): Promise<DeadlineAlert[]> {
    const activeTasks = tasks.filter(t => ['todo', 'inprogress'].includes(t.status) && !t.deletedAt);
    const alerts: DeadlineAlert[] = [];
    const now = new Date();

    activeTasks.forEach(task => {
      if (!task.deadline) return;
      
      const deadline = new Date(task.deadline);
      const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only alert for tasks with upcoming deadlines
      if (daysUntilDeadline <= 14 && daysUntilDeadline > 0) {
        const riskLevel = this.calculateRiskLevel(
          task.progress || 0,
          daysUntilDeadline
        );
        
        if (riskLevel === 'medium' || riskLevel === 'high' || riskLevel === 'critical') {
          alerts.push({
            taskId: task.id,
            taskName: task.name,
            deadline: task.deadline.toString(),
            riskLevel,
            daysUntilDeadline,
            completionProbability: task.progress || 0,
            blockers: this.identifyTaskBlockers(task, tasks),
            recommendations: this.generateRiskRecommendations(riskLevel, daysUntilDeadline)
          });
        }
      }
    });

    return alerts.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);
  }

  private async analyzeProductivityTrends(tasks: Task[]): Promise<EnhancedPrediction | null> {
    const completedTasks = tasks.filter(t => t.status === 'done');
    const activeTasks = tasks.filter(t => ['todo', 'inprogress'].includes(t.status) && !t.deletedAt);
    
    if (completedTasks.length < 3) return null;
    
    const completionRate = completedTasks.length / (completedTasks.length + activeTasks.length);
    const avgCompletionTime = this.calculateAverageCompletionTime(completedTasks);
    
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let recommendation = 'Hiệu suất làm việc tốt';
    
    if (completionRate < 0.3) {
      urgency = 'high';
      recommendation = 'Cần cải thiện tỷ lệ hoàn thành task';
    } else if (completionRate < 0.6) {
      urgency = 'medium';
      recommendation = 'Tỷ lệ hoàn thành có thể cải thiện';
    }

    return {
      id: 'productivity-trend',
      type: 'productivity',
      title: 'Phân tích xu hướng hiệu suất',
      description: `Tỷ lệ hoàn thành hiện tại: ${(completionRate * 100).toFixed(1)}%`,
      confidence: 0.75,
      urgency,
      recommendation,
      factors: ['Tỷ lệ hoàn thành task', 'Thời gian hoàn thành trung bình', 'Số lượng task đang active'],
      timeline: 'Dựa trên dữ liệu lịch sử',
      impact: 'Cải thiện hiệu suất tổng thể',
      recommendations: [
        recommendation,
        'Theo dõi và phân tích patterns làm việc',
        'Tối ưu hóa quy trình làm việc'
      ]
    };
  }

  private calculateAverageCompletionTime(completedTasks: Task[]): number {
    const tasksWithDates = completedTasks.filter(t => t.startDate && t.endDate);
    if (tasksWithDates.length === 0) return 7; // Default 7 days
    
    const totalDays = tasksWithDates.reduce((sum, task) => {
      const start = new Date(task.startDate!).getTime();
      const end = new Date(task.endDate!).getTime();
      return sum + (end - start) / (1000 * 60 * 60 * 24);
    }, 0);
    
    return totalDays / tasksWithDates.length;
  }

  private calculateRiskLevel(progress: number, daysUntilDeadline: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysUntilDeadline <= 1) return 'critical';
    if (daysUntilDeadline <= 3 && progress < 70) return 'high';
    if (daysUntilDeadline <= 7 && progress < 50) return 'high';
    if (daysUntilDeadline <= 7) return 'medium';
    return 'low';
  }

  private identifyTaskBlockers(task: Task, allTasks: Task[]): string[] {
    const blockers: string[] = [];
    
    // Check for dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      const incompleteDeps = task.dependencies.filter(depId => {
        const depTask = allTasks.find(t => t.id === depId);
        return depTask && depTask.status !== 'done';
      });
      
      if (incompleteDeps.length > 0) {
        blockers.push(`${incompleteDeps.length} task phụ thuộc chưa hoàn thành`);
      }
    }
    
    // Check for missing collaborators
    if (task.collaboratorIds && task.collaboratorIds.length > 0) {
      blockers.push('Cần chờ collaborator');
    }
    
    // Check for missing client information
    if (!task.clientId) {
      blockers.push('Thiếu thông tin client');
    }
    
    return blockers;
  }

  private generateRiskRecommendations(riskLevel: string, daysUntilDeadline: number): string[] {
    const recommendations: string[] = [];
    
    switch (riskLevel) {
      case 'critical':
        recommendations.push('Ưu tiên tuyệt đối cho task này');
        recommendations.push('Làm việc tập trung, loại bỏ mọi distraction');
        recommendations.push('Cân nhắc xin gia hạn deadline nếu cần');
        break;
      case 'high':
        recommendations.push('Ưu tiên cao cho task này');
        recommendations.push('Tăng thời gian làm việc hàng ngày');
        recommendations.push('Chia nhỏ task thành các milestone');
        break;
      case 'medium':
        recommendations.push('Theo dõi tiến độ cẩn thận');
        recommendations.push('Lập kế hoạch chi tiết cho những ngày tới');
        break;
      default:
        recommendations.push('Tiếp tục theo dõi tiến độ');
    }
    
    return recommendations;
  }
}

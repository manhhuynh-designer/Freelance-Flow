export type StructuredInsight = {
  category: 'Time Management' | 'Task Prioritization' | 'Workload Balance' | 'Productivity Habit' | 'Risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  insight: string;
  suggestion: string;
};

export type AIProductivityAnalysis = {
  id: string;
  timestamp: string; // ISO string
  insights: StructuredInsight[]; // The structured insights
};

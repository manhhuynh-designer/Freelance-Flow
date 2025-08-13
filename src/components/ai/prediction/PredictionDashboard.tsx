/**
 * Prediction Dashboard - Refactored Architecture
 * Orchestrates quantitative analytics engines and qualitative AI insights
 */

'use client';

import React, { useState } from 'react';
import { useDashboard } from '../../../contexts/dashboard-context';
import { PersonalDeadlineIntelligence, type DeadlineIntelligenceMetrics } from '../../../ai/analytics/personal-deadline-intelligence';
import { chatWithAI } from '@/ai/simple-ai';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, AlertTriangle, Loader2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import { TaskEditDialog } from '@/components/task-dialogs/TaskEditDialog';
import { EnhancedWorkTimeStatsCard } from './EnhancedWorkTimeStatsCard';
import { TaskAnalyticsCard } from './TaskAnalyticsCard';
import { DeadlineAlertsCard } from './DeadlineAlertsCard';
import { AIInsightsList } from './AIInsightsList';
import type { StructuredInsight } from './types';
import { DateRange } from 'react-day-picker';

interface PredictionDashboardProps {
  className?: string;
}

export function PredictionDashboard({ className = '' }: PredictionDashboardProps) {
  // Simplified state structure - removed productivity metrics
  const [deadlineMetrics, setDeadlineMetrics] = useState<DeadlineIntelligenceMetrics | null>(null);
  const [aiInsights, setAiInsights] = useState<StructuredInsight[]>([]); // structured insights
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false); // controls right panel animation
  const [taskAnalytics, setTaskAnalytics] = useState<{ pie: any; trend: any; range?: DateRange; summary?: { active: number; near: number; overdue: number }; groupBy: string } | null>(null);
  const [taskAnalyticsRange, setTaskAnalyticsRange] = useState<DateRange | undefined>({ from: new Date(Date.now() - 29*24*60*60*1000), to: new Date() });
  const [productivityStats, setProductivityStats] = useState<{ range?: DateRange; stats: any | null }>({ stats: null });
  const [productivityRange, setProductivityRange] = useState<DateRange | undefined>({ from: new Date(Date.now() - 6*24*60*60*1000), to: new Date() });

  const { appData, T, workTime, handleDeleteTask, handleEditTask } = useDashboard() as any;
  const workTimeStats = workTime?.stats; // reuse existing aggregated stats if available
  const { toast } = useToast();
  const { tasks = [], clients = [], collaborators = [], categories = [], quotes = [] } = appData || {};

  // Create default metrics for initial display
  const getDefaultMetrics = (): DeadlineIntelligenceMetrics => ({
    overallAccuracy: 0,
    riskAssessments: [],
    performanceHistory: [],
    personalPatterns: {
      userId: 'user-1',
      patternType: 'consistent',
      averageDeadlineAccuracy: 75,
      optimalBufferTime: 60,
      peakPerformancePeriods: [],
      procrastinationTriggers: [],
      motivationFactors: []
    },
    optimizationSuggestions: [],
    upcomingDeadlines: []
  });

  // Initialize deadline metrics immediately without waiting for AI analysis
  const initializeDeadlineMetrics = async () => {
    try {
      const userId = 'user-1'; // TODO: Get from auth context
      const di = new PersonalDeadlineIntelligence(userId);
      const dMetrics = await di.getDeadlineIntelligenceMetrics(tasks, appData.actions || []);
      setDeadlineMetrics(dMetrics);
    } catch (error) {
      console.error('Failed to initialize deadline metrics:', error);
    }
  };

  // Initialize on mount and when tasks change
  React.useEffect(() => {
    if (tasks.length > 0) {
      initializeDeadlineMetrics();
    }
  }, [tasks]);

  // Collect cross-card analytics for AI context (lightweight placeholders for now)
  const prepareAIContext = () => {
    const context = {
      tasksCount: tasks.length,
      workTime: productivityStats.stats ? {
        totalWorkHours: productivityStats.stats.totalWorkHours,
        totalFocusHours: productivityStats.stats.totalFocusHours,
        focusRatio: productivityStats.stats.totalWorkHours ? (productivityStats.stats.totalFocusHours / productivityStats.stats.totalWorkHours).toFixed(2) : null,
        pomodoros: productivityStats.stats.completedPomodoros,
        daily: productivityStats.stats.dailyBreakdown?.map((d:any)=>({ date:d.date, workH:d.totalHours, focusH:d.focusHours }))
      } : null,
      taskAnalytics: taskAnalytics ? {
        pie: taskAnalytics.pie.slice(0, 12),
        totalNew: taskAnalytics.trend.reduce((s:number,d:any)=> s + d.count, 0),
        avgPerDay: taskAnalytics.trend.length ? (taskAnalytics.trend.reduce((s:number,d:any)=> s + d.count, 0) / taskAnalytics.trend.length).toFixed(2) : 0,
        range: taskAnalytics.range ? {
          from: taskAnalytics.range.from?.toISOString(),
          to: taskAnalytics.range.to?.toISOString()
        } : null,
        summary: taskAnalytics.summary,
        groupBy: taskAnalytics.groupBy
      } : null,
      risks: deadlineMetrics ? {
        high: deadlineMetrics.riskAssessments.filter(r => ['high','critical'].includes(r.riskLevel)).length,
        medium: deadlineMetrics.riskAssessments.filter(r => r.riskLevel==='medium').length
      } : null,
      recentCompleted: tasks.filter((t:any)=> t.status==='done').slice(-15).map((t:any)=>({ id:t.id, name:t.name }))
    };
    return context;
  };

  const runFullAnalysis = async () => {
    // Check if API key is configured
    const { googleApiKey: hasApiKey, googleModel, language='en' } = appData?.appSettings || {};
    console.log('🔍 PredictionDashboard - runFullAnalysis called:', {
      hasApiKey: !!hasApiKey,
      apiKeyLength: hasApiKey?.length || 0,
      appSettingsPresent: !!appData?.appSettings,
      tasksCount: tasks.length,
      clientsCount: clients.length,
      collaboratorsCount: collaborators.length
    });

    if (!hasApiKey) {
      console.warn('❌ No API key found in appSettings');
      toast({
        variant: 'destructive',
        title: T.apiKeyRequiredTitle || 'API Key Required',
        description: T.apiKeyRequiredDesc || 'Please configure your Google API key in settings'
      });
      return;
    }

    try {
      // Step 1: Start analysis
      setIsLoading(true);
      setShowAnalysisPanel(true); // trigger UI expansion
      console.log('🚀 Starting simplified analysis...');
      
      // Clear previous results
      setDeadlineMetrics(null);
  setAiInsights([]);

      // Step 2: Run deadline intelligence analysis only
      const userId = 'user-1'; // TODO: Get from auth context
      
      const di = new PersonalDeadlineIntelligence(userId);
      const dMetrics = await di.getDeadlineIntelligenceMetrics(tasks, appData.actions || []);

      console.log('📊 Analytics results received:', {
        deadlineMetrics: !!dMetrics,
        weeklyHours: workTime?.stats?.weeklyTotalHours
      });

      // Update state with analytics results
      setDeadlineMetrics(dMetrics);

      // Step 3: Prepare context for AI
  const context = prepareAIContext();
  const responseLanguage = language === 'vi' ? 'Vietnamese' : 'English';
  const prompt = `You are a senior productivity & workflow analyst AI.
CONTEXT_JSON = ${JSON.stringify(context)}
INSTRUCTIONS:
1. Analyze the selected date range only.
2. Derive insights referencing concrete numbers (e.g., percentages, counts, averages) from the context.
3. If task analytics includes status distribution, refer to top 1-2 statuses by their human-readable names.
4. If focus hours < 30% of total work hours, raise at least one 'Productivity Habit' or 'Time Management' insight.
5. If overdue > 0 or high risks > 0, include a 'Risk' insight with severity high or critical (justify severity briefly).
6. Suggestions must be actionable with a clear next action (start with an imperative verb) and may include a measurable target.
7. Severity guideline: critical (urgent systemic risk), high (significant impact), medium (noticeable), low (optimization).
OUTPUT:
Return ONLY a valid JSON array (3-5) of StructuredInsight objects: [{"category":"...","severity":"...","insight":"...","suggestion":"..."}] with text in ${responseLanguage}. No markdown, no commentary.`;
      try {
        if (!hasApiKey || !googleModel) throw new Error('Missing API config');
        const response = await chatWithAI({
          apiKey: hasApiKey,
            modelName: googleModel,
          messages: [{ role: 'user', content: prompt, timestamp: new Date() }]
        });
        if (response.success) {
          try {
            const raw = (response.message?.content || '').toString();
            // Remove code fences anywhere and normalize quotes
            let cleaned = raw
              .replace(/```json/gi, '')
              .replace(/```/g, '')
              .trim()
              .replace(/[\u2018\u2019]/g, "'")
              .replace(/[\u201C\u201D]/g, '"');
            // Heuristic: extract first JSON array if extra prose present
            if (!cleaned.startsWith('[')) {
              const firstBracket = cleaned.indexOf('[');
              const lastBracket = cleaned.lastIndexOf(']');
              if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                cleaned = cleaned.substring(firstBracket, lastBracket + 1);
              }
            }
            // Final safety: strip trailing commas before array or object close
            cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
            const parsed = JSON.parse(cleaned) as StructuredInsight[];
            // Basic shape validation
            const valid = parsed.filter(p => p && p.category && p.severity && p.insight && p.suggestion);
            if (!valid.length) throw new Error('No valid insight objects');
            setAiInsights(valid);
          } catch (pe) {
            console.error('Parse error', pe, { cleanedSnippet: typeof cleaned === 'string' ? cleaned.slice(0, 500) : cleaned }, 'RAW_RESPONSE:', response.message?.content);
            toast({ variant: 'destructive', title: 'AI JSON parse failed' });
          }
        } else {
          toast({ variant: 'destructive', title: 'AI Error', description: response.error });
        }
      } catch (err:any) {
        console.error('AI call failed', err);
        toast({ variant: 'destructive', title: 'AI Call Failed' });
      }
    } catch (error) {
      console.error('🚨 Analysis error:', error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Failed to generate analysis. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if API key is configured for main UI
  const hasApiKey = appData?.appSettings?.googleApiKey;

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find((t: any) => t.id === taskId);
    if (task) setSelectedTask(task);
  };

  const handleEditClick = () => {
    if (selectedTask) {
      setIsEditingTask(true);
    }
  };

  const handleDeleteClick = async () => {
    if (selectedTask) {
      try {
        await handleDeleteTask(selectedTask.id);
        setSelectedTask(null);
        // Refresh deadline metrics after deletion
        await initializeDeadlineMetrics();
        toast({
          title: 'Task Deleted',
          description: 'Task has been moved to trash successfully.'
        });
      } catch (error) {
        console.error('Failed to delete task:', error);
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: 'Failed to delete task. Please try again.'
        });
      }
    }
  };

  const handleEditSave = async (values: any, quoteColumns: any[], collaboratorQuoteColumns: any[], taskId: string) => {
    try {
      await handleEditTask({ ...values, id: taskId });
      setIsEditingTask(false);
      setSelectedTask({ ...values, id: taskId });
      // Refresh deadline metrics after edit
      await initializeDeadlineMetrics();
      toast({
        title: 'Task Updated',
        description: 'Task has been updated successfully.'
      });
    } catch (error) {
      console.error('Failed to update task:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update task. Please try again.'
      });
    }
  };

  if (isLoading && !deadlineMetrics && aiInsights.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-center">🤖 AI đang phân tích dữ liệu và tạo dự báo thông minh...</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Minimal header: only Analyze button */}
      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          <Button
            onClick={runFullAnalysis}
            disabled={isLoading || !hasApiKey}
            className="flex items-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                {T?.analyzeWithAI || 'Analyze with AI'}
              </>
            )}
          </Button>
          {!hasApiKey && (
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/settings" className="flex items-center gap-1"><Settings className="w-3 h-3" />Settings</a>
            </Button>
          )}
        </div>
      </div>

      {/* API Key Warning */}
      {!hasApiKey && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {T?.apiKeyRequiredDesc || 'API key required for AI analysis'} 
            <Button variant="link" className="p-0 h-auto ml-1" asChild>
              <a href="/dashboard/settings">Configure API key in Settings</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Adaptive layout with animated panel */}
      <div className={cn(
        "flex flex-col lg:flex-row gap-6 items-start transition-all duration-500",
        showAnalysisPanel ? "" : "lg:justify-center"
      )}>
        <div className={cn(
          "space-y-6 transition-all duration-500",
          showAnalysisPanel ? "lg:w-[60%]" : "lg:w-[70%] xl:w-[65%] mx-auto"
        )}>
          <EnhancedWorkTimeStatsCard 
            onStats={setProductivityStats} 
            externalRange={productivityRange} 
            setExternalRange={setProductivityRange}
          />
          <TaskAnalyticsCard onAnalyticsUpdate={setTaskAnalytics} dateRange={taskAnalyticsRange} setDateRange={setTaskAnalyticsRange} />
          <DeadlineAlertsCard
            metrics={deadlineMetrics || getDefaultMetrics()}
            onTaskClick={handleTaskClick}
            onTaskUpdated={initializeDeadlineMetrics}
          />
        </div>
        <div className={cn(
          "space-y-6 transition-all duration-500 origin-right",
          showAnalysisPanel ? "lg:w-[40%] opacity-100 translate-x-0" : "lg:w-0 opacity-0 -translate-x-4 pointer-events-none overflow-hidden"
        )}>
          {(isLoading || aiInsights.length > 0) && (
            <Card className="transition-opacity duration-500">
              <CardHeader className="pb-2 pt-4 px-6">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-primary" />{T?.aiInsights || 'AI Insights'}</h3>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading && aiInsights.length === 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm">Analyzing...</p>
                  </div>
                )}
                <AIInsightsList insights={aiInsights} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Task Details Dialog */}
      {selectedTask && !isEditingTask && (
        <TaskDetailsDialog
          task={selectedTask}
          client={clients.find((c: any) => c.id === selectedTask.clientId)}
          clients={clients}
          collaborators={collaborators}
          categories={categories}
          quote={quotes.find((q: any) => q.id === selectedTask.quoteId)}
          collaboratorQuotes={quotes}
          settings={appData.appSettings}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Edit Task Dialog */}
      {selectedTask && isEditingTask && (
        <TaskEditDialog
          task={selectedTask}
          quote={quotes.find((q: any) => q.id === selectedTask.quoteId)}
          collaboratorQuotes={selectedTask.collaboratorQuotes?.map((link: any) => quotes.find((q: any) => q.id === link.quoteId)).filter(Boolean)}
          clients={clients}
          collaborators={collaborators}
          categories={categories}
          quoteTemplates={[]}
          settings={appData.appSettings}
          isOpen={isEditingTask}
          onOpenChange={(open) => {
            if (!open) {
              setIsEditingTask(false);
              setSelectedTask(null);
            }
          }}
          onSubmit={handleEditSave}
        />
      )}
    </div>
  );
}

export default PredictionDashboard;

"use client";

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Brain, Settings, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { PouchDBService } from '@/lib/pouchdb-service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePersistedToggle, TOGGLE_KEYS } from '@/lib/utils/toggle-persistence';

import { 
  calculateFinancialSummary, 
  calculateRevenueBreakdown, 
  calculateTaskDetails,
  calculateAdditionalFinancials,
  calculateAdditionalTaskDetails,
  getAIBusinessAnalysis,
  calculateMonthlyFinancials
} from '@/ai/analytics/business-intelligence-helpers';
import { FinancialSummaryCard } from './business/FinancialSummaryCard';
import { FinancialInsightsCard } from './business/FinancialInsightsCard';
import { AIBusinessAnalysisCard } from './business/AIBusinessAnalysisCard';
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import { EditTaskForm } from '@/components/edit-task-form';
import type { Task, Quote, CollaboratorQuote, Client, AIAnalysis } from '@/lib/types';

export function BusinessDashboard() {
  const { appData, isDataLoaded, T, updateTask, handleDeleteTask: deleteTask, updateQuote, updateCollaboratorQuote, handleEditTask: editTask, handleAddClientAndSelect, setAppData } = useDashboard() as any;
  
  const [summary, setSummary] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | undefined>(undefined);
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [additionalFinancials, setAdditionalFinancials] = useState<any>(null);
  const [additionalTaskDetails, setAdditionalTaskDetails] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAnalysisPanelVisible, setIsAnalysisPanelVisible] = usePersistedToggle(TOGGLE_KEYS.BUSINESS_AI_PANEL, false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const selectedQuote = selectedTaskId ? appData?.quotes?.find((q: Quote) => q.id === (appData?.tasks?.find((t: Task) => t.id === selectedTaskId)?.quoteId)) : null;
  const selectedCollaboratorQuotes = selectedTaskId ? appData?.tasks?.find((t: Task) => t.id === selectedTaskId)?.collaboratorQuotes?.map((link: { collaboratorId: string; quoteId: string }) => appData?.collaboratorQuotes?.find((cq: CollaboratorQuote) => cq.id === link.quoteId)).filter(Boolean) as any[] : [];

  useEffect(() => {
    if (!appData) return;

    const summaryResult = calculateFinancialSummary(appData, {});
    const taskDetailsResult = calculateTaskDetails(appData, {});
    const additionalResult = calculateAdditionalFinancials(appData, {});
    const additionalTaskDetailsResult = calculateAdditionalTaskDetails(appData, {});
    
    console.log('--- Dashboard Analytics Debug ---');
    console.log('Summary Result:', summaryResult);
    console.log('---------------------------------');

    setSummary(summaryResult);
    setTaskDetails(taskDetailsResult);
    setAdditionalFinancials(additionalResult);
    setAdditionalTaskDetails(additionalTaskDetailsResult);

    if (appData.aiAnalyses && appData.aiAnalyses.length > 0) {
      const lastAnalysis = appData.aiAnalyses[appData.aiAnalyses.length - 1];
      setAnalysis(lastAnalysis.analysis);
      setAnalysisTimestamp(lastAnalysis.timestamp);
      setIsAnalysisPanelVisible(true);
    }
  }, [appData]);

  const handleAiAnalysis = async () => {
    if (!summary || !appData) return;

    setIsAiLoading(true);
    setIsAnalysisPanelVisible(true);
    try {
      const settings = {
        apiKey: appData.appSettings.googleApiKey || '',
        modelName: appData.appSettings.googleModel || 'gemini-pro',
        language: appData.appSettings.language || 'en'
      };

      const breakdown = calculateRevenueBreakdown(appData, {});
      const financialContext = { summary, breakdown };
      const aiResult = await getAIBusinessAnalysis(financialContext, appData, settings);

      if (aiResult) {
        const newTimestamp = new Date().toISOString();
        setAnalysis(aiResult);
        setAnalysisTimestamp(newTimestamp);
        
        const newAnalysisEntry: AIAnalysis = {
          userId: appData.user?.id || 'user-1', // Assuming appData has user.id or provide a default
          id: uuidv4(),
          timestamp: newTimestamp,
          analysis: aiResult,
        };

        const existingAnalyses = appData.aiAnalyses || [];
        const updatedAnalyses = [...existingAnalyses, newAnalysisEntry];

        await PouchDBService.setDocument('aiAnalyses', updatedAnalyses);
        // Update in-memory appData so UI consumers see the new entry immediately
        try {
          if (typeof setAppData === 'function') {
            setAppData((prev: any) => ({ ...prev, aiAnalyses: updatedAnalyses }));
          }
        } catch (e) { console.warn('Failed to update in-memory appData with new aiAnalyses', e); }
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Ensure clicks from FinancialSummaryCard dialogs open the correct task
  // Some list items (e.g., collaborator cost entries) use composite IDs like `${task.id}-${collabQuoteId}`
  // and expense rows may use IDs like `expense-<id>` which don't map to a task at all.
  const handleTaskClick = (itemId: string) => {
    if (!appData?.tasks) return;

    // 1) Direct match (revenue/future/lost items already pass the task id)
    let task = appData.tasks.find((t: Task) => t.id === itemId);

    // 2) Ignore non-task expense rows
    if (!task && itemId.startsWith('expense-')) {
      return;
    }

    // 3) Composite id pattern: `${task.id}-...` (cost items)
    if (!task) {
      task = appData.tasks.find((t: Task) => itemId.startsWith(`${t.id}-`));
    }

    // 4) As a fallback, try locating by embedded collaborator quote id substring
    if (!task) {
      task = appData.tasks.find((t: Task) => (t.collaboratorQuotes || []).some((link: { collaboratorId: string; quoteId: string }) => itemId.includes(link.quoteId)));
    }

    if (task) {
      setSelectedTaskId(task.id);
      setIsTaskDialogOpen(true);
    }
  };

  const handleEditTask = () => {
    setIsEditDialogOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
    setIsTaskDialogOpen(false);
    setSelectedTaskId(null);
  };

  const handleTaskFormSubmit = (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => {
    const taskUpdates = {
      id: taskId,
      name: values.name,
      description: values.description,
      briefLink: values.briefLink,
      driveLink: values.driveLink,
      clientId: values.clientId,
      collaboratorIds: values.collaboratorIds,
      categoryId: values.categoryId,
      status: values.status,
      subStatusId: values.subStatusId,
      startDate: values.dates.from,
      deadline: values.dates.to,
      updatedAt: new Date().toISOString()
    };
    updateTask(taskUpdates);

    if (selectedQuote && values.sections) {
      updateQuote(selectedQuote.id, {
        sections: values.sections,
        columns: quoteColumns
      });
    }

    // Update existing collaborator quotes and create new ones if needed
    if (values.collaboratorQuotes && Array.isArray(values.collaboratorQuotes)) {
      const currentTask = appData?.tasks?.find((t: Task) => t.id === taskId);
      const currentMappings = currentTask?.collaboratorQuotes || [];
      const mappingByCollabId = new Map(currentMappings.map((m: any) => [m.collaboratorId, m.quoteId]));

      values.collaboratorQuotes.forEach((collabQuote: any, index: number) => {
        const mappedQuoteId = mappingByCollabId.get(collabQuote.collaboratorId);
        const existingQuote = mappedQuoteId
          ? appData?.collaboratorQuotes?.find((cq: any) => cq.id === mappedQuoteId)
          : selectedCollaboratorQuotes?.[index];
        if (existingQuote) {
          updateCollaboratorQuote(existingQuote.id, {
            sections: collabQuote.sections,
            columns: collaboratorQuoteColumns,
            collaboratorId: collabQuote.collaboratorId
          });
        } else if (collabQuote.collaboratorId && collabQuote.sections && collabQuote.sections.length > 0) {
          // Create new collaborator quote entity and map it to task
          const newId = `collab-quote-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
          const total = collabQuote.sections.reduce((acc: number, s: any) => acc + (s.items || []).reduce((ai: number, it: any) => ai + (Number(it.unitPrice || 0) * (it.quantity || 1)), 0), 0);
          const newCQ = {
            id: newId,
            collaboratorId: collabQuote.collaboratorId,
            sections: collabQuote.sections,
            total,
            columns: collaboratorQuoteColumns,
            paymentStatus: 'pending'
          } as any;
          // Push into global store
          setAppData((prev: any) => ({
            ...prev,
            collaboratorQuotes: [...(prev.collaboratorQuotes || []), newCQ],
            tasks: (prev.tasks || []).map((t: Task) => t.id === taskId ? {
              ...t,
              collaboratorQuotes: [...(t.collaboratorQuotes || []), { collaboratorId: collabQuote.collaboratorId, quoteId: newId }],
              collaboratorIds: Array.from(new Set([...(t.collaboratorIds || []), collabQuote.collaboratorId]))
            } : t)
          }));
        }
      });
    }
    setIsEditDialogOpen(false);
  };

  const selectedTask = selectedTaskId ? appData?.tasks?.find((t: Task) => t.id === selectedTaskId) : null;
  const selectedClient = selectedTask ? appData?.clients?.find((c: Client) => c.id === selectedTask.clientId) : null;
  
  // Check if API key is configured for main UI
  const hasApiKeyInSettings = appData?.appSettings?.googleApiKey; // Changed variable name to avoid conflict with runFullAnalysis scope

  if (!isDataLoaded) {
      return (
          <div className="flex items-center justify-center p-8">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span>{T.loadingDashboardData || "Loading Dashboard Data..."}</span>
          </div>
      )
  }

  return (
    <div className="space-y-6 overflow-visible">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{T.businessDashboardTitle || "Business Dashboard"}</h2>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleAiAnalysis}
            disabled={isAiLoading || !hasApiKeyInSettings}
            className="flex items-center gap-2 shadow-sm"
          >
            {isAiLoading ? (
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
          {(analysis || isAiLoading) && (
            <Button
              onClick={() => setIsAnalysisPanelVisible(!isAnalysisPanelVisible)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
              title={isAnalysisPanelVisible ? "Hide AI Panel" : "Show AI Panel"}
            >
              {isAnalysisPanelVisible ? (
                <ChevronRight className="w-4 h-4 transition-transform duration-300" />
              ) : (
                <ChevronLeft className="w-4 h-4 transition-transform duration-300" />
              )}
            </Button>
          )}
          {!hasApiKeyInSettings && (
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/settings" className="flex items-center gap-1"><Settings className="w-3 h-3" />Settings</a>
            </Button>
          )}
        </div>
      </div>

      {/* API Key Warning */}
      {!hasApiKeyInSettings && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {T?.apiKeyRequiredDesc || 'API key required for AI analysis'} 
            <Button variant="link" className="p-0 h-auto ml-1" asChild>
              <a href="/dashboard/settings">Configure API key in Settings</a>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className={cn("flex flex-col lg:flex-row gap-6 items-start transition-all duration-500")}>
        <div className={cn("space-y-6 transition-all duration-500", isAnalysisPanelVisible ? "lg:w-[66.67%]" : "lg:w-[100%]")}>
          <FinancialSummaryCard 
            summary={summary}
            currency={appData?.appSettings?.currency || 'USD'}
            locale={appData?.appSettings?.language === 'vi' ? 'vi-VN' : 'en-US'}
            taskDetails={taskDetails}
            additionalFinancials={additionalFinancials}
            additionalTaskDetails={additionalTaskDetails}
            onTaskClick={handleTaskClick}
          />
          <FinancialInsightsCard 
            currency={appData?.appSettings?.currency || 'USD'}
            locale={appData?.appSettings?.language === 'vi' ? 'vi-VN' : 'en-US'}
          />
        </div>
        
        <div className={cn("space-y-6 transition-all duration-500 ease-in-out transform", isAnalysisPanelVisible ? "lg:w-[33.33%] opacity-100 translate-x-0 scale-100" : "lg:w-0 opacity-0 -translate-x-4 scale-95 pointer-events-none overflow-hidden")}>
          {(isAiLoading || analysis) && (
           <AIBusinessAnalysisCard 
                analysis={analysis}
                isLoading={isAiLoading}
                analysisTimestamp={analysisTimestamp}
           />
          )}
        </div>
      </div>

      {selectedTask && !isEditDialogOpen && (
        <TaskDetailsDialog
          task={selectedTask}
          client={selectedClient || undefined}
          clients={appData?.clients || []}
          collaborators={appData?.collaborators || []}
          categories={appData?.categories || []}
          quote={selectedQuote || undefined}
          collaboratorQuotes={selectedCollaboratorQuotes as any[] || []}
          settings={appData?.appSettings || { language: 'en', currency: 'USD', statusColors: {}, statusSettings: [] }}
          isOpen={isTaskDialogOpen}
          onClose={() => {
            setIsTaskDialogOpen(false);
            setSelectedTaskId(null);
          }}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onUpdateQuote={updateQuote}
          onUpdateCollaboratorQuote={updateCollaboratorQuote}
        />
      )}

      {selectedTask && isEditDialogOpen && (
        <Dialog 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{T.editTaskTitle || 'Edit Task'}</DialogTitle>
            </DialogHeader>
            <EditTaskForm
              setOpen={setIsEditDialogOpen}
              onSubmit={handleTaskFormSubmit}
              taskToEdit={selectedTask}
              quote={selectedQuote || undefined}
              collaboratorQuotes={selectedCollaboratorQuotes as any[]}
              clients={appData?.clients || []}
              collaborators={appData?.collaborators || []}
              categories={appData?.categories || []}
              onAddClient={handleAddClientAndSelect}
              quoteTemplates={appData?.quoteTemplates || []}
              settings={appData?.appSettings || { language: 'en', currency: 'USD', statusColors: {}, statusSettings: [] }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

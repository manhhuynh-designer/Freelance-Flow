"use client";

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { TimeRangePicker } from './prediction/TimeRangePicker';
import { Loader2 } from 'lucide-react';

// Step 2: Import new helper functions
import { 
  calculateFinancialSummary, 
  calculateRevenueBreakdown, 
  calculateTaskDetails,
  calculateAdditionalFinancials,
  calculateAdditionalTaskDetails,
  getAIBusinessAnalysis 
} from '@/ai/analytics/business-intelligence-helpers';

// Step 3: Import new card components
import { FinancialSummaryCard } from './business/FinancialSummaryCard';
import { RevenueBreakdownCard } from './business/RevenueBreakdownCard';
import { AIBusinessAnalysisCard } from './business/AIBusinessAnalysisCard';
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import { EditTaskForm } from '@/components/edit-task-form';

export function BusinessDashboard() {
  const { appData, isDataLoaded, updateTask, handleDeleteTask: deleteTask, updateQuote, updateCollaboratorQuote, handleEditTask: editTask, handleAddClientAndSelect } = useDashboard();
  
  // State lifted up to the main dashboard component
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [summary, setSummary] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [additionalFinancials, setAdditionalFinancials] = useState<any>(null);
  const [additionalTaskDetails, setAdditionalTaskDetails] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAnalysisPanelVisible, setIsAnalysisPanelVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Effect to perform calculations when data or date range changes
  useEffect(() => {
    if (isDataLoaded && appData) {
      // Perform local, real-time calculations
      const summaryResult = calculateFinancialSummary(appData, { from: dateRange?.from, to: dateRange?.to });
      const breakdownResult = calculateRevenueBreakdown(appData, { from: dateRange?.from, to: dateRange?.to });
      const taskDetailsResult = calculateTaskDetails(appData, { from: dateRange?.from, to: dateRange?.to });
      const additionalResult = calculateAdditionalFinancials(appData, { from: dateRange?.from, to: dateRange?.to });
      const additionalTaskDetailsResult = calculateAdditionalTaskDetails(appData, { from: dateRange?.from, to: dateRange?.to });
      setSummary(summaryResult);
      setBreakdown(breakdownResult);
      setTaskDetails(taskDetailsResult);
      setAdditionalFinancials(additionalResult);
      setAdditionalTaskDetails(additionalTaskDetailsResult);
    }
  }, [appData, isDataLoaded, dateRange]);

  const handleAiAnalysis = async () => {
    if (!summary || !breakdown) return;

    setIsAiLoading(true);
    setIsAnalysisPanelVisible(true); // Show the right panel
    try {
      // Mock settings, replace with real ones from appSettings if available
      const settings = {
        apiKey: appData.appSettings.googleApiKey || '',
        modelName: appData.appSettings.googleModel || 'gemini-pro',
        language: appData.appSettings.language || 'en'
      };

      const financialContext = { summary, breakdown };
      const aiResult = await getAIBusinessAnalysis(financialContext, settings);
      setAnalysis(aiResult);

    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = () => {
    setIsTaskDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
    setIsTaskDialogOpen(false);
    setSelectedTaskId(null);
  };

  const handleTaskFormSubmit = (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => {
    // Transform form values to task update format
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

    // Update the task
    updateTask(taskUpdates);

    // Update quote if exists
    if (selectedQuote && values.sections) {
      updateQuote(selectedQuote.id, {
        sections: values.sections,
        columns: quoteColumns
      });
    }

    // Update collaborator quotes if exist
    if (values.collaboratorQuotes && selectedCollaboratorQuotes && selectedCollaboratorQuotes.length > 0) {
      values.collaboratorQuotes.forEach((collabQuote: any, index: number) => {
        const existingQuote = selectedCollaboratorQuotes[index];
        if (existingQuote && collabQuote.sections) {
          updateCollaboratorQuote(existingQuote.id, {
            sections: collabQuote.sections,
            columns: collaboratorQuoteColumns,
            collaboratorId: collabQuote.collaboratorId
          });
        }
      });
    }

    setIsEditDialogOpen(false);
    setIsTaskDialogOpen(true); // Return to task details view
  };

  // Get selected task and related data for TaskDetailsDialog
  const selectedTask = selectedTaskId ? appData?.tasks?.find(t => t.id === selectedTaskId) : null;
  const selectedClient = selectedTask ? appData?.clients?.find(c => c.id === selectedTask.clientId) : null;
  const selectedQuote = selectedTask ? appData?.quotes?.find(q => q.id === selectedTask.quoteId) : null;
  const selectedCollaboratorQuotes = selectedTask?.collaboratorQuotes 
    ? appData?.collaboratorQuotes?.filter(cq => selectedTask.collaboratorQuotes?.some(link => link.quoteId === cq.id)) 
    : [];
  
  if (!isDataLoaded) {
      return (
          <div className="flex items-center justify-center p-8">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span>Loading Dashboard Data...</span>
          </div>
      )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Business Dashboard</h2>
        <TimeRangePicker date={dateRange} setDate={setDateRange} />
      </div>
      
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Real-time Analytics) */}
        <div className="lg:col-span-2 space-y-6">
          <FinancialSummaryCard 
            summary={summary}
            currency={appData?.appSettings?.currency || 'USD'}
            locale={appData?.appSettings?.language === 'vi' ? 'vi-VN' : 'en-US'}
            taskDetails={taskDetails}
            additionalFinancials={additionalFinancials}
            additionalTaskDetails={additionalTaskDetails}
            dateRange={dateRange || {}}
            onTaskClick={handleTaskClick}
          />
          <RevenueBreakdownCard breakdown={breakdown} />
        </div>
        
        {/* Right Column (AI Analysis) */}
        <div className="lg:col-span-1">
           {/* The AI card now manages its own trigger button logic */}
           <AIBusinessAnalysisCard 
                analysis={analysis}
                isLoading={isAiLoading}
                onGenerate={handleAiAnalysis}
           />
        </div>
      </div>

      {/* TaskDetailsDialog for clicked tasks */}
      {selectedTask && (
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

      {/* EditTaskForm dialog for editing tasks */}
      {selectedTask && isEditDialogOpen && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-[61]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Edit Task</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                  }}
                >
                  ✕
                </Button>
              </div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

// Step 2: Import new helper functions
import { 
  calculateFinancialSummary, 
  calculateRevenueBreakdown, 
  calculateTaskDetails,
  calculateAdditionalFinancials,
  calculateAdditionalTaskDetails,
  getAIBusinessAnalysis,
  calculateMonthlyFinancials // Import the new function
} from '@/ai/analytics/business-intelligence-helpers';

// Step 3: Import new card components
import { FinancialSummaryCard } from './business/FinancialSummaryCard';
import { FinancialInsightsCard } from './business/FinancialInsightsCard'; // Import the new component
import { AIBusinessAnalysisCard } from './business/AIBusinessAnalysisCard';
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import { EditTaskForm } from '@/components/edit-task-form';
import type { Task, Quote, CollaboratorQuote, Client } from '@/lib/types';

export function BusinessDashboard() {
  const { appData, isDataLoaded, updateTask, handleDeleteTask: deleteTask, updateQuote, updateCollaboratorQuote, handleEditTask: editTask, handleAddClientAndSelect } = useDashboard();
  
  // State lifted up to the main dashboard component
  const [summary, setSummary] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [additionalFinancials, setAdditionalFinancials] = useState<any>(null);
  const [additionalTaskDetails, setAdditionalTaskDetails] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAnalysisPanelVisible, setIsAnalysisPanelVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const selectedQuote = selectedTaskId ? appData?.quotes?.find((q: Quote) => q.id === (appData?.tasks?.find((t: Task) => t.id === selectedTaskId)?.quoteId)) : null;
  const selectedCollaboratorQuotes = selectedTaskId ? appData?.tasks?.find((t: Task) => t.id === selectedTaskId)?.collaboratorQuotes?.map((link: { collaboratorId: string; quoteId: string }) => appData?.collaboratorQuotes?.find((cq: CollaboratorQuote) => cq.id === link.quoteId)).filter(Boolean) as any[] : [];


  // Effect to perform calculations when data changes
  useEffect(() => {
    if (!appData) return;

    // Perform local, real-time calculations for ALL TIME by default (only for FinancialSummaryCard)
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
  }, [appData]);

  const handleAiAnalysis = async () => {
    if (!summary) return;

    setIsAiLoading(true);
    setIsAnalysisPanelVisible(true); // Show the right panel
    try {
      // Mock settings, replace with real ones from appSettings if available
      const settings = {
        apiKey: appData.appSettings.googleApiKey || '',
        modelName: appData.appSettings.googleModel || 'gemini-pro',
        language: appData.appSettings.language || 'en'
      };

      // Calculate breakdown on demand for AI analysis
      const breakdown = calculateRevenueBreakdown(appData, {});
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
    // Keep task dialog open to show updated details
  };

  // Get selected task and related data for TaskDetailsDialog
  const selectedTask = selectedTaskId ? appData?.tasks?.find((t: Task) => t.id === selectedTaskId) : null;
  const selectedClient = selectedTask ? appData?.clients?.find((c: Client) => c.id === selectedTask.clientId) : null;
  
  if (!isDataLoaded) {
      return (
          <div className="flex items-center justify-center p-8">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span>Loading Dashboard Data...</span>
          </div>
      )
  }

  return (
    <div className="space-y-6 overflow-visible">
  <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Business Dashboard</h2>
      </div>
      
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-visible">
        {/* Left Column (Real-time Analytics) */}
        <div className="lg:col-span-2 space-y-6 overflow-visible">
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

      {/* EditTaskForm dialog for editing tasks */}
      {selectedTask && isEditDialogOpen && (
        <Dialog 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
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

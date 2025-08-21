"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from './ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { XCircle, Trash2, Filter, Table, CalendarDays, LayoutGrid, Columns3, Download } from "lucide-react";
import { TaskList } from '@/components/task-list';
import type { Task, Quote, Collaborator, Category, Client, AppEvent, AppSettings, QuoteTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { i18n } from "@/lib/i18n";
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from "./ui/skeleton";
import { FilterChipBar } from '@/components/filter-chip-bar-new';
import { ViewModeToggle } from '@/components/view-mode-toggle';
import { PaginationControls } from "./pagination-controls";
import { TableView } from './table-view';
import { CalendarView, type CalendarDisplayMode } from './calendar-view';
import { EisenhowerView } from './eisenhower/EisenhowerView';
import { KanbanView } from './kanban/KanbanView';
import { GanttView } from './calendar/GanttView';
import { useFilterLogic } from '@/hooks/use-filter-logic';
import { ReadonlyURLSearchParams } from 'next/navigation';
import { SearchCommand } from '@/components/search-command';
import { EditTaskForm } from './edit-task-form';
import { TaskEditDialog } from './task-dialogs/TaskEditDialog';
import { TaskDetailsDialog } from './task-dialogs/TaskDetailsDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DataRestoredNotification } from "@/components/data-restored-notification";

export default function DashboardContent() {
    return (
        <Suspense fallback={<div className="space-y-4"><Skeleton className="h-[250px] w-full" /><Skeleton className="h-[400px] w-full" /></div>}>
            <DashboardContentSearchParamsWrapper />
        </Suspense>
    );
}

function DashboardContentSearchParamsWrapper() {
  const searchParams = useSearchParams();
  return <DashboardContentInner searchParams={searchParams} />;
}

type ViewMode = 'table' | 'calendar' | 'gantt' | 'eisenhower' | 'kanban';

function DashboardContentInner({ searchParams }: { searchParams: ReadonlyURLSearchParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const context = useDashboard();
  
  // 🔧 DEBUG: Log dashboard context data
  console.log('📊 Dashboard Content data status:', {
    hasContext: !!context,
    hasAppData: !!context?.appData,
    tasksCount: context?.appData?.tasks?.length || 0,
    clientsCount: context?.appData?.clients?.length || 0,
    isDataLoaded: context?.isDataLoaded,
  });
  
  const { 
      appData, handleViewTask, handleEditTask, handleAddTask, handleTaskStatusChange,
      handleDeleteTask, handleRestoreTask, handlePermanentDeleteTask,
      handleAddClientAndSelect, handleEmptyTrash, updateTask, updateEvent,
      updateQuote, updateCollaboratorQuote,
      T, showInstallPrompt, installPromptEvent, handleInstallClick, 
      setShowInstallPrompt, viewingTaskDetails, viewingTaskId, handleCloseTaskDetails, 
      handleEditTaskClick, updateTaskEisenhowerQuadrant, reorderTasksInQuadrant,
      reorderTasksInStatus, updateKanbanSettings, actionBuffer
  } = context || {};

  const {
      tasks = [], quotes = [], collaboratorQuotes = [], clients = [], 
      collaborators = [], events = [], appSettings, quoteTemplates = [], categories = []
  } = appData || {};
  const collabQuotesAsQuote = useMemo(() => collaboratorQuotes as unknown as Quote[], [collaboratorQuotes]);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const VIEW_MODE_STORAGE_key = 'dashboardViewMode';

  // Enhanced view mode change handler with action tracking
  const handleViewModeChange = (mode: ViewMode) => {
    const oldMode = currentViewMode;
    setCurrentViewMode(mode);
    
    // Track the view mode change
    if (actionBuffer && oldMode !== mode) {
      actionBuffer.pushAction({
        action: 'settings',
        entityType: 'settings',
        entityId: 'view-mode',
        description: `Changed view from ${oldMode} to ${mode}`,
        canUndo: false // View mode changes don't need undo
      });
    }
  };

  if (!appSettings || !T || !appData || !context || !updateTaskEisenhowerQuadrant || !reorderTasksInQuadrant || !reorderTasksInStatus || !updateKanbanSettings) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-[250px] w-full" /><Skeleton className="h-[400px] w-full" /></div>
    );
  }

  const quoteForEditingTask = useMemo(() => editingTask ? quotes.find((q: Quote) => q.id === editingTask.quoteId) : undefined, [editingTask, quotes]);
  
  const collaboratorQuotesForEditingTask = useMemo(() => {
    if (!editingTask || !editingTask.collaboratorQuotes) return [] as Quote[];
    return editingTask.collaboratorQuotes.map((cq: any) => 
      collabQuotesAsQuote.find((q: Quote) => q.id === cq.quoteId)
    ).filter((q: Quote | undefined): q is Quote => !!q);
  }, [editingTask, collabQuotesAsQuote]);

  const collaboratorQuotesForDetails = useMemo(() => {
    if (!viewingTaskDetails?.task?.collaboratorQuotes) return [] as Quote[];
    return viewingTaskDetails.task.collaboratorQuotes.map((cq: any) =>
      collabQuotesAsQuote.find((q: Quote) => q.id === cq.quoteId)
    ).filter((q: Quote | undefined): q is Quote => !!q);
  }, [viewingTaskDetails, collabQuotesAsQuote]);

  // Auto-open details after save (create or edit)
  useEffect(() => {
    const handleTaskSaved = (e: any) => {
      try {
        const id = e?.detail?.taskId;
        if (id && handleViewTask) {
          handleViewTask(id);
        }
        setEditingTask(null);
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('task:saved', handleTaskSaved);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('task:saved', handleTaskSaved);
      }
    };
  }, [handleViewTask]);
  
  const view = searchParams.get('view') === 'trash' ? 'trash' : 'active';
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');

  const {
    filteredTasks, unsortedFilteredTasks, selectedStatuses, categoryFilter, clientFilter, 
    collaboratorFilter, date, sortFilter, handleStatusFilterChange, handleStatusDoubleClick, 
    handleStatusBatchChange, handleCategoryChange, handleClientChange, handleCollaboratorChange, 
    handleDateRangeChange, handleSortChange, handleClearFilters,
  } = useFilterLogic(tasks, appSettings, view);
  
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(VIEW_MODE_STORAGE_key) as ViewMode) || 'kanban';
    }
    return 'table';
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_STORAGE_key, currentViewMode);
    }
  }, [currentViewMode]);

  const totalPages = Math.ceil(filteredTasks.length / limit);
  const paginatedTasks = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredTasks.slice(startIndex, startIndex + limit);
  }, [filteredTasks, page, limit]);
  
  const handlePageChange = (newPage: number) => {
    const current = new URLSearchParams(searchParams);
    current.set('page', String(newPage));
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const handleLimitChange = (newLimit: number) => {
    const current = new URLSearchParams(searchParams);
    current.set('limit', String(newLimit));
    current.delete('page');
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const calendarDateParam = searchParams.get('calendarDate');
  const calendarViewMode = searchParams.get('calendarMode') as 'week' | 'month' | null;

  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    return calendarDateParam ? new Date(calendarDateParam) : new Date();
  });
  
  const [calendarMode, setCalendarMode] = useState<CalendarDisplayMode>(() => {
    return calendarViewMode || 'month';
  });

  const handleCalendarNavigation = (newDate: Date, newMode: CalendarDisplayMode) => {
    const current = new URLSearchParams(searchParams);
    current.set('calendarDate', newDate.toISOString().split('T')[0]);
    current.set('calendarMode', newMode);
    const query = current.toString() ? `?${current.toString()}` : '';
    router.push(`${pathname}${query}`);
  };

  const handleCalendarDateChange = (newDate: Date) => {
      setCalendarDate(newDate);
      handleCalendarNavigation(newDate, calendarMode);
  };
  
  const handleCalendarModeChange = (newMode: CalendarDisplayMode) => {
      const oldMode = calendarMode;
      setCalendarMode(newMode);
      handleCalendarNavigation(calendarDate, newMode);
      
      // Track calendar view mode change
      if (actionBuffer && oldMode !== newMode) {
        actionBuffer.pushAction({
          action: 'settings',
          entityType: 'settings',
          entityId: 'calendar-view-mode',
          description: `Changed calendar view from ${oldMode} to ${newMode}`,
          canUndo: false
        });
      }
  };

  const effectiveHandleEditTaskClick = (task: Task) => {
    setEditingTask(task);
  };

  if (view === 'trash') {
    return (
      <div className={cn("flex flex-col h-full gap-4", pathname.includes('/chat') || pathname.includes('/settings') || pathname.includes('/widgets') ? 'p-0' : 'p-4')}>
        <div className="flex-shrink-0">
          {filteredTasks.length > 0 && (
            <div className="flex justify-end">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            {T.emptyTrash}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{T.areYouSure}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {T.deletePermanently} {filteredTasks.length} {T.task}(s).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
              <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={handleEmptyTrash}>{T.delete}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
            </div>
          )}
        </div>
        <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="p-0 flex-1 overflow-y-auto">
                <TaskList 
                  tasks={paginatedTasks}
                  quotes={quotes}
                  collaboratorQuotes={collabQuotesAsQuote}
                  clients={clients}
                  collaborators={collaborators}
                  categories={categories}
                  onEditTask={handleEditTask}
                  onViewTask={handleViewTask}
                  onTaskStatusChange={handleTaskStatusChange}
                  onDeleteTask={handleDeleteTask}
                  onAddClient={handleAddClientAndSelect}
                  quoteTemplates={quoteTemplates}
                  view={view}
                  onRestoreTask={handleRestoreTask}
                  onPermanentDeleteTask={handlePermanentDeleteTask}
                  settings={appSettings}
                />
            </CardContent>
        </Card>
        <div className="flex-shrink-0 border-t pt-4">
            <PaginationControls
              page={page} totalPages={totalPages} limit={limit}
              onPageChange={handlePageChange} onLimitChange={handleLimitChange} T={T}
            />
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentViewMode) {
      case 'table':
        return (
          <TableView
            tasks={paginatedTasks} quotes={quotes} collaboratorQuotes={collabQuotesAsQuote} clients={clients}
            collaborators={collaborators} categories={categories} 
            onEditTask={(values, quoteColumns, collaboratorQuoteColumns, taskId) => handleEditTask(values, quoteColumns, collaboratorQuoteColumns, taskId)}
            onViewTask={handleViewTask}
            onTaskStatusChange={handleTaskStatusChange} onDeleteTask={handleDeleteTask} onAddClient={handleAddClientAndSelect}
            quoteTemplates={quoteTemplates} view={view} onRestoreTask={handleRestoreTask} onPermanentDeleteTask={handlePermanentDeleteTask}
            settings={appSettings}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            tasks={filteredTasks} events={events} quotes={quotes} collaboratorQuotes={collabQuotesAsQuote} clients={clients}
            collaborators={collaborators} categories={categories} onEditTask={handleEditTask} onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask} onAddClient={handleAddClientAndSelect} quoteTemplates={quoteTemplates}
            settings={appSettings} currentDate={calendarDate} viewMode={calendarMode}
            onDateChange={handleCalendarDateChange} onViewModeChange={handleCalendarModeChange} updateTask={updateTask}
          />
        );
      case 'eisenhower':
        return ( 
            <EisenhowerView 
                filteredTasks={unsortedFilteredTasks} 
                sortedTasksForUncategorized={filteredTasks}
                allTasks={tasks}
                T={T}
                settings={appSettings}
                updateTaskEisenhowerQuadrant={updateTaskEisenhowerQuadrant}
                reorderTasksInQuadrant={reorderTasksInQuadrant}
                clients={clients}
                collaborators={collaborators}
                categories={categories}
                quoteTemplates={quoteTemplates}
                quotes={quotes}
                collaboratorQuotes={collabQuotesAsQuote}
                handleEditTask={handleEditTask}
                handleDeleteTask={handleDeleteTask}
            /> 
        );
      case 'kanban':
        return ( 
      <KanbanView 
                filteredTasks={filteredTasks}
                appSettings={appSettings}
                handleTaskStatusChange={handleTaskStatusChange}
                reorderTasksInStatus={reorderTasksInStatus}
                updateKanbanSettings={updateKanbanSettings}
                clients={clients}
                categories={categories}
                quotes={quotes}
        collaboratorQuotes={collabQuotesAsQuote}
                collaborators={collaborators}
                quoteTemplates={quoteTemplates}
                handleDeleteTask={handleDeleteTask}
                handleEditTask={handleEditTask}
                handleAddClientAndSelect={handleAddClientAndSelect}
            /> 
        );
      case 'gantt':
        return (
          <GanttView
            tasks={filteredTasks}
            events={events}
            clients={clients}
            categories={categories}
            settings={appSettings}
            statusColors={appSettings.statusColors}
            updateTask={updateTask}
            updateEvent={updateEvent}
            language={appSettings.language}
            quotes={quotes}
            collaboratorQuotes={collabQuotesAsQuote}
            collaborators={collaborators}
            quoteTemplates={quoteTemplates}
            handleDeleteTask={handleDeleteTask}
            handleEditTask={handleEditTask}
            handleAddClientAndSelect={handleAddClientAndSelect}
          />
        );
      default: return <div>Select a view</div>;
    }
  };

  return (
    <div className={cn("flex flex-col h-full gap-4", pathname.includes('/chat') || pathname.includes('/settings') || pathname.includes('/widgets') ? 'p-0' : 'p-4')}>
        {showInstallPrompt && (
            <Alert className="mb-4 relative">
                <Download className="h-4 w-4" />
                <AlertTitle>{T.installPWA}</AlertTitle>
                <AlertDescription>{T.installPWADesc}</AlertDescription>
                <div className="mt-2 flex gap-2">
                    {installPromptEvent && (
                        <Button onClick={handleInstallClick} size="sm">{T.installPWAButton}</Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { if(setShowInstallPrompt) {localStorage.setItem('hidePwaInstallPrompt', 'true'); setShowInstallPrompt(false);} }}>
                        {T.dismiss}
                    </Button>
                </div>
            </Alert>
        )}
        <DataRestoredNotification />

      <SearchCommand
        tasks={tasks} isOpen={isSearchOpen} onOpenChange={setIsSearchOpen}
        onTaskSelect={(task) => handleViewTask(task.id)}
      />

      {viewingTaskDetails && (
        <TaskDetailsDialog
          isOpen={!!viewingTaskId}
          onClose={handleCloseTaskDetails}
          task={viewingTaskDetails.task}
          client={viewingTaskDetails.client}
          clients={appData.clients}
          collaborators={appData.collaborators}
          categories={appData.categories}
          quote={viewingTaskDetails.quote}
          collaboratorQuotes={collaboratorQuotesForDetails}
          settings={appData.appSettings}
          onEdit={() => effectiveHandleEditTaskClick(viewingTaskDetails.task)}
          onDelete={handleDeleteTask}
          onUpdateQuote={updateQuote}
          onUpdateCollaboratorQuote={updateCollaboratorQuote}
          onChangeStatus={(taskId, statusId) => handleTaskStatusChange?.(taskId, statusId as any)}
        />
      )}

      <TaskEditDialog
        task={editingTask}
        quote={quoteForEditingTask}
        collaboratorQuotes={collaboratorQuotesForEditingTask}
        clients={clients}
        collaborators={collaborators}
        categories={categories}
        quoteTemplates={quoteTemplates}
        settings={appSettings}
        isOpen={!!editingTask}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null);
        }}
        onSubmit={handleEditTask}
        onAddClient={handleAddClientAndSelect}
      />

      <div className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
            <FilterChipBar
              selectedStatuses={selectedStatuses} selectedCategory={categoryFilter || 'all'}
              selectedCollaborator={collaboratorFilter || 'all'} selectedClient={clientFilter || 'all'}
              dateRange={date} onSearchClick={() => setIsSearchOpen(true)} onStatusFilterChange={handleStatusFilterChange}
              onStatusDoubleClick={handleStatusDoubleClick} onStatusBatchChange={handleStatusBatchChange}
              onCategoryChange={handleCategoryChange} onCollaboratorChange={handleCollaboratorChange} onClientChange={handleClientChange}
              onDateRangeChange={handleDateRangeChange} onClearFilters={handleClearFilters} sortFilter={sortFilter || 'deadline-asc'}
              handleSortChange={handleSortChange} viewMode={currentViewMode} T={T}
              allCategories={categories} collaborators={collaborators} clients={clients}
              statuses={context?.appData?.appSettings?.statusSettings || []} statusColors={appSettings.statusColors}
            />
            </div>
            
            <div className="flex-shrink-0 self-start sticky top-0 z-10 flex items-center gap-2">
              <ViewModeToggle
                currentMode={currentViewMode}
                onModeChange={handleViewModeChange}
                T={T}
              />
            </div>
          </div>
      </div>

      
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className={cn("flex-1 min-h-0 flex flex-col", currentViewMode === 'calendar' ? "p-0" : currentViewMode === 'table' ? "p-0" : currentViewMode === 'kanban' ? "p-0 overflow-hidden" : "p-0 overflow-y-auto")}>
            {renderView()}
        </CardContent>
      </Card>
      
      {currentViewMode !== 'calendar' && currentViewMode !== 'eisenhower' && currentViewMode !== 'kanban' && currentViewMode !== 'gantt' && (
        <div className="flex-shrink-0 border-t pt-4">
          <PaginationControls
              page={page} totalPages={totalPages} limit={limit}
              onPageChange={handlePageChange} onLimitChange={handleLimitChange} T={T}
          />
        </div>
      )}
    </div>
  );
}

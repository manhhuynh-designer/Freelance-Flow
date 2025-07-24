"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { XCircle, Trash2, Filter, Table, CalendarDays, LayoutGrid, Columns3 } from "lucide-react";
import { TaskList } from '@/components/task-list';
import type { Task } from "@/lib/types";
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

export default function DashboardContent() {
    return (
        <Suspense fallback={<div className="space-y-4"><Skeleton className="h-[250px] w-full" /><Skeleton className="h-[400px] w-full" /></div>}>
            <DashboardContentSearchParamsWrapper />
        </Suspense>
    );
}

// This wrapper ensures useSearchParams is only used inside a Suspense boundary
function DashboardContentSearchParamsWrapper() {
  const { useSearchParams } = require('next/navigation');
  const searchParams = useSearchParams();
  return <DashboardContentInner searchParams={searchParams} />;
}

type ViewMode = 'table' | 'calendar' | 'gantt' | 'eisenhower' | 'kanban';

function DashboardContentInner({ searchParams }: { searchParams: ReadonlyURLSearchParams }) {
  const context = useDashboard();
  const { 
    tasks = [], 
    quotes = [], 
    collaboratorQuotes = [], 
    clients = [], 
    collaborators = [], 
    appSettings,
    setAppSettings = () => {},
    updateKanbanSettings = () => {},
    handleEditTask = () => {}, 
    handleAddTask = () => {}, 
    handleTaskStatusChange = () => {}, 
    handleDeleteTask = () => {}, 
    handleRestoreTask = () => {}, 
    handlePermanentDeleteTask = () => {},
    handleAddClientAndSelect = () => { return { id: '', name: '' }; }, 
    quoteTemplates = [], 
    categories = [], 
    handleEmptyTrash = () => {}, 
    updateTask = () => {}
  } = context || {};
  
  const router = useRouter();
  const pathname = usePathname();

  const VIEW_MODE_STORAGE_key = 'dashboardViewMode';

  if (!appSettings) {
    return (
        <div className="space-y-4">
            <Skeleton className="h-[250px] w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
  }

  const T = i18n[appSettings.language];
  const view = searchParams.get('view') === 'trash' ? 'trash' : 'active';
  const page = Number(searchParams.get('page') || '1');
  const limit = Number(searchParams.get('limit') || '10');

  // Use the centralized filter logic
  const {
    filteredTasks,
    unsortedFilteredTasks,
    selectedStatuses,
    categoryFilter,
    clientFilter,
    collaboratorFilter,
    date,
    sortFilter,
    handleStatusFilterChange,
    handleStatusDoubleClick,
    handleStatusBatchChange,
    handleCategoryChange,
    handleClientChange,
    handleCollaboratorChange,
    handleDateRangeChange,
    handleSortChange,
    handleClearFilters,
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

  // Pagination logic remains here as it's a presentation concern
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

  // Calendar-specific state
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
      setCalendarMode(newMode);
      handleCalendarNavigation(calendarDate, newMode);
  };

  if (view === 'trash') {
    // Trash view has simpler logic
    return (
      <div className="flex flex-col h-full gap-4">
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
                  tasks={paginatedTasks} // Trash is also paginated now
                  quotes={quotes}
                  collaboratorQuotes={collaboratorQuotes}
                  clients={clients}
                  collaborators={collaborators}
                  categories={categories}
                  onEditTask={handleEditTask}
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
              page={page}
              totalPages={totalPages}
              limit={limit}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              T={T}
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
            tasks={paginatedTasks}
            quotes={quotes}
            collaboratorQuotes={collaboratorQuotes}
            clients={clients}
            collaborators={collaborators}
            categories={categories}
            onEditTask={handleEditTask}
            onTaskStatusChange={handleTaskStatusChange}
            onDeleteTask={handleDeleteTask}
            onAddClient={handleAddClientAndSelect}
            quoteTemplates={quoteTemplates}
            view={view}
            onRestoreTask={handleRestoreTask}
            onPermanentDeleteTask={handlePermanentDeleteTask}
            settings={appSettings}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            tasks={filteredTasks}
            quotes={quotes}
            collaboratorQuotes={collaboratorQuotes}
            clients={clients}
            collaborators={collaborators}
            categories={categories}
            onEditTask={handleEditTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onAddClient={handleAddClientAndSelect}
            quoteTemplates={quoteTemplates}
            settings={appSettings}
            currentDate={calendarDate}
            viewMode={calendarMode}
            onDateChange={handleCalendarDateChange}
            onViewModeChange={handleCalendarModeChange}
            updateTask={updateTask}
          />
        );
      case 'eisenhower':
        return (
          <EisenhowerView 
            filteredTasks={unsortedFilteredTasks} // Use unsorted for matrix
            sortedTasksForUncategorized={filteredTasks} // Use sorted for the list
          />
        );
      case 'kanban':
        return (
          <KanbanView 
            filteredTasks={filteredTasks}
          />
        );
      case 'gantt':
        return (
          <GanttView
            tasks={filteredTasks}
            clients={clients}
            categories={categories}
            settings={appSettings}
            statusColors={appSettings.statusColors}
            updateTask={updateTask}
          />
        );
      default:
        return <div>Select a view</div>;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
            <FilterChipBar
              selectedStatuses={selectedStatuses}
              selectedCategory={categoryFilter || 'all'}
              selectedCollaborator={collaboratorFilter || 'all'}
              selectedClient={clientFilter || 'all'}
              dateRange={date}
              onStatusFilterChange={handleStatusFilterChange}
              onStatusDoubleClick={handleStatusDoubleClick}
              onStatusBatchChange={handleStatusBatchChange}
              onCategoryChange={handleCategoryChange}
              onCollaboratorChange={handleCollaboratorChange}
              onClientChange={handleClientChange}
              onDateRangeChange={handleDateRangeChange}
              onClearFilters={handleClearFilters}
              sortFilter={sortFilter}
              handleSortChange={handleSortChange}
              viewMode={currentViewMode}
              T={T}
              allCategories={categories}
              collaborators={collaborators}
              clients={clients}
              statuses={context?.appSettings?.statusSettings || []}
              statusColors={appSettings.statusColors}
            />
            </div>
            
            <div className="flex-shrink-0 self-start sticky top-0 z-10">
              <ViewModeToggle
                currentMode={currentViewMode}
                onModeChange={setCurrentViewMode}
              />
            </div>
          </div>
      </div>
      
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardContent className={cn("flex-1 min-h-0 flex flex-col", currentViewMode === 'calendar' ? "p-0" : currentViewMode === 'table' ? "p-0" : currentViewMode === 'kanban' ? "p-0 overflow-hidden" : "p-0 overflow-y-auto")}>
            {renderView()}
        </CardContent>
      </Card>
      
      {/* Hide pagination in calendar, eisenhower and kanban views */}
      {currentViewMode !== 'calendar' && currentViewMode !== 'eisenhower' && currentViewMode !== 'kanban' && currentViewMode !== 'gantt' && (
        <div className="flex-shrink-0 border-t pt-4">
          <PaginationControls
              page={page}
              totalPages={totalPages}
              limit={limit}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              T={T}
          />
        </div>
      )}
    </div>
  );
}

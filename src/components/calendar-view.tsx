"use client";

import React, { useState } from 'react';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, Category } from '@/lib/types';
import type { TaskFormValues } from './edit-task-form';
import { i18n } from '@/lib/i18n';
import { CalendarGrid } from './calendar/CalendarGrid';
import styles from './calendar-header.module.css';
import { TaskDetailsDialog } from './task-dialogs/TaskDetailsDialog';
import { TaskEditDialog } from './task-dialogs/TaskEditDialog';
import { CreateTaskForm } from './create-task-form';
import { EditTaskForm } from './edit-task-form';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { T } from '@genkit-ai/googleai';

export type CalendarViewMode = 'week' | 'month';

// Helper: get week number in year
function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Helper: format month and year in selected language
function formatMonthYear(date: Date, t: any) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const monthNames = [
    t.months?.january || 'January',
    t.months?.february || 'February', 
    t.months?.march || 'March',
    t.months?.april || 'April',
    t.months?.may || 'May',
    t.months?.june || 'June',
    t.months?.july || 'July',
    t.months?.august || 'August',
    t.months?.september || 'September',
    t.months?.october || 'October',
    t.months?.november || 'November',
    t.months?.december || 'December'
  ];
  
  return `${monthNames[monthIndex]} ${year}`;
}

// Helper: get weekday name in selected language
function getWeekdayName(date: Date, t: any, short: boolean = false) {
  const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  const weekdayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex];
  
  if (short) {
    return t.weekdaysShort?.[weekdayKey] || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex];
  } else {
    return t.weekdays?.[weekdayKey] || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex];
  }
}

export interface CalendarViewProps {
  tasks: Task[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onEditTask: (
    values: TaskFormValues,
    quoteColumns: QuoteColumn[],
    collaboratorQuoteColumns: QuoteColumn[],
    taskId: string
  ) => void;
  onAddTask?: (
    values: TaskFormValues,
    quoteColumns: QuoteColumn[],
    collaboratorQuoteColumns: QuoteColumn[]
  ) => void;
  onTaskStatusChange: (taskId: string, newStatus: Task['status']) => void;
  onDeleteTask: (taskId: string) => void;
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  // Calendar navigation props
  currentDate?: Date;
  viewMode?: CalendarViewMode;
  onDateChange?: (date: Date) => void;
  onViewModeChange?: (mode: CalendarViewMode) => void;
}



export function CalendarView({
  tasks,
  quotes,
  collaboratorQuotes,
  clients,
  collaborators,
  categories,
  onEditTask,
  onAddTask,
  onTaskStatusChange,
  onDeleteTask,
  onAddClient,
  quoteTemplates,
  settings,
  currentDate = new Date(),
  viewMode = 'month',
  onDateChange,
  onViewModeChange
}: CalendarViewProps) {
  // State and handlers
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pendingEdit, setPendingEdit] = useState(false);

  // useEffect: Khi pendingEdit=true và dialog chi tiết đã đóng, tự động mở dialog sửa
  React.useEffect(() => {
    if (pendingEdit && !isTaskDetailsOpen && selectedTask) {
      setIsTaskEditOpen(true);
      setPendingEdit(false);
    }
  }, [pendingEdit, isTaskDetailsOpen, selectedTask]);

  // Handler for opening the edit dialog from details
  const handleEditFromDetails = () => {
    // Chỉ đóng dialog chi tiết, set cờ pendingEdit
    setIsTaskDetailsOpen(false);
    setPendingEdit(true);
    // KHÔNG reset selectedTask về null ở đây
  };

  // Handler for deleting a task
  const handleTaskDelete = (taskId: string) => {
    onDeleteTask(taskId);
    setIsTaskDetailsOpen(false);
    setSelectedTask(null);
    setIsTaskEditOpen(false);
    setPendingEdit(false);
  };

  // Handler for closing the edit dialog
  const handleCloseEditDialog = () => {
    setIsTaskEditOpen(false);
    setSelectedTask(null);
    setSelectedDate(null);
    setPendingEdit(false);
  };

  // Handler for submitting task edits or creation
  const handleTaskEditSubmit = (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[], taskId?: string) => {
    if (taskId) {
      onEditTask(values, quoteColumns, collaboratorQuoteColumns, taskId);
    } else {
      if (typeof onAddTask === 'function') {
        onAddTask(values, quoteColumns, collaboratorQuoteColumns);
      }
    }
    setIsTaskEditOpen(false);
    setSelectedTask(null);
    setSelectedDate(null);
    setPendingEdit(false);
  };
  // i18n translation object: selected language first, then English fallback
  const T = {
    ...(settings.language && i18n[settings.language] ? i18n[settings.language] : {}),
    ...i18n['en'],
  };
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailsOpen(true);
  };
  const handleTaskStatusChange = (taskId: string, status: Task['status']) => {
    onTaskStatusChange(taskId, status);
  };
  const handleDateSelect = (date: Date) => {
    // Open create-task dialog with selected date
    setSelectedTask(null);
    setSelectedDate(date);
    setIsTaskEditOpen(true);
  };

  // --- Navigation logic ---
  // Move calendar forward/backward
  const handleNavigate = (direction: number) => {
    if (onDateChange) {
      let newDate = new Date(currentDate);
      if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + direction * 7);
      } else {
        newDate.setMonth(newDate.getMonth() + direction);
      }
      onDateChange(newDate);
    }
  };

  // Jump to today
  const handleTodayClick = () => {
    if (onDateChange) {
      onDateChange(new Date());
    }
  };

  // View mode change
  const handleViewModeChange = (mode: CalendarViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // --- Dialog title translation fallback ---
  // Use a fallback if T.createTaskDialogTitle is missing
  const dialogTitle = T.createTask || 'Create new task';

  return (
    <>
      {/* Dialogs for task details/edit/create */}
      {(() => {
        if (selectedTask && isTaskDetailsOpen) {
          const task = selectedTask;
          return (
            <TaskDetailsDialog
              task={task}
              client={clients.find(c => c.id === task.clientId)}
              clients={clients}
              collaborators={collaborators}
              categories={categories}
              quote={quotes.find(q => q.id === task.quoteId)}
              collaboratorQuotes={task.collaboratorQuotes && Array.isArray(task.collaboratorQuotes)
                ? task.collaboratorQuotes.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[]
                : (task as any)?.collaboratorQuoteId 
                  ? [collaboratorQuotes.find(q => q.id === (task as any).collaboratorQuoteId)].filter(Boolean) as Quote[]
                  : []
              }
              settings={settings}
              isOpen={isTaskDetailsOpen}
              onClose={() => {
                setIsTaskDetailsOpen(false);
                // Nếu pendingEdit đang bật, mở dialog edit
                if (pendingEdit) {
                  setIsTaskEditOpen(true);
                  setPendingEdit(false);
                }
              }}
              onEdit={handleEditFromDetails}
              onDelete={handleTaskDelete}
            />
          );
        } else if (isTaskEditOpen && selectedTask) {
          const taskToEdit: Task | null = selectedTask ? selectedTask : null;
          const dialogTitle = taskToEdit ? T.editTask : T.createTask || 'Create new task';
          // Tìm quote và collaboratorQuotes cho taskToEdit
          const quote = taskToEdit ? quotes.find(q => q.id === taskToEdit.quoteId) : undefined;
          const collaboratorQuotesForEdit = taskToEdit && Array.isArray(taskToEdit.collaboratorQuotes)
            ? (taskToEdit.collaboratorQuotes.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[])
            : [];
          return (
            <Dialog open={isTaskEditOpen} onOpenChange={open => { if (!open) handleCloseEditDialog(); }}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl md:max-w-5xl">
                <DialogTitle>{dialogTitle}</DialogTitle>
                <EditTaskForm
                  setOpen={open => {
                    if (!open) handleCloseEditDialog();
                  }}
                  onSubmit={handleTaskEditSubmit}
                  taskToEdit={taskToEdit}
                  quote={quote}
                  collaboratorQuotes={collaboratorQuotesForEdit}
                  clients={clients}
                  collaborators={collaborators}
                  categories={categories}
                  onAddClient={onAddClient}
                  quoteTemplates={quoteTemplates}
                  settings={settings}
                  defaultDate={selectedDate}
                />
              </DialogContent>
            </Dialog>
          );
        }
        return null;
      })()}

      <div className="w-full h-full flex flex-col">
        {/* Calendar header với navigation và view mode toggle */}
        <div className="flex items-center justify-between mb-4 px-4 pt-4 flex-shrink-0 gap-4">
          {/* Navigation group - Enhanced UI */}
          <div className={styles.navigationGroup}>
            <button 
              type="button" 
              className={`${styles.navigationButton} btn-outline btn-sm`}
              onClick={() => handleNavigate(-1)} 
              title={viewMode === 'week' ? T.prevWeek || 'Tuần trước' : T.prevMonth || 'Tháng trước'}
              aria-label={viewMode === 'week' ? T.prevWeek || 'Tuần trước' : T.prevMonth || 'Tháng trước'}
            >
              <span className="sr-only">{T.goToPrevious}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6"></polyline>
              </svg>
            </button>
            <button 
              type="button" 
              className={`${styles.todayButton} btn-sm rounded`}
              onClick={handleTodayClick}
              title={T.jumpToToday || 'Nhảy về hôm nay'}
              aria-label={T.jumpToToday || 'Nhảy về hôm nay'}
            >
              {T.todayButton}
            </button>
            <button 
              type="button" 
              className={`${styles.navigationButton} btn-outline btn-sm`}
              onClick={() => handleNavigate(1)} 
              title={viewMode === 'week' ? T.nextWeek || 'Tuần sau' : T.nextMonth || 'Tháng sau'}
              aria-label={viewMode === 'week' ? T.nextWeek || 'Tuần sau' : T.nextMonth || 'Tháng sau'}
            >
              <span className="sr-only">{T.goToNext}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </button>
          </div>
          {/* Title */}
          <div className={styles.titleSection}>
            <h2 className={styles.titleMain}>
              {viewMode === 'week'
                ? `${formatMonthYear(currentDate, T)} (${T.weekNumber} ${getWeekNumber(currentDate)})`
                : formatMonthYear(currentDate, T)}
            </h2>
          </div>
          {/* View mode toggle - Enhanced UI */}
          <div className={styles.viewModeGroup}>
            <button
              type="button"
              className={`${styles.viewModeButton} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => handleViewModeChange('week')}
              title={T.switchToWeekView}
              aria-label={T.switchToWeekView}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="ml-1">{T.weekView || 'Xem theo tuần'}</span>
            </button>
            <button
              type="button"
              className={`${styles.viewModeButton} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => handleViewModeChange('month')}
              title={T.switchToMonthView}
              aria-label={T.switchToMonthView}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <line x1="3" y1="14" x2="21" y2="14"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
              <span className="ml-1">{T.monthView || 'Xem theo tháng'}</span>
            </button>
          </div>
        </div>
        {/* Calendar grid - use all available space without constraints */}
        <div className="flex-1 px-4 pb-4 min-h-0 overflow-hidden">
          <CalendarGrid
            currentDate={currentDate}
            viewMode={viewMode}
            tasks={tasks}
            statusColors={settings.statusColors}
            clients={clients}
            categories={categories}
            onTaskClick={handleTaskClick}
            onDateSelect={handleDateSelect}
            settings={settings}
          />
        </div>
      </div>
    </>
  );
}
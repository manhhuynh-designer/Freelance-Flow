"use client";

import React, { useState } from 'react';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, Category } from '@/lib/types';
import type { TaskFormValues } from './edit-task-form';
import { getTranslations, i18n } from '@/lib/i18n';
import { CalendarGrid } from './calendar/CalendarGrid';
import styles from './calendar-header.module.css';
import { TaskDetailsDialog } from './task-dialogs/TaskDetailsDialog';
import { TaskEditDialog } from './task-dialogs/TaskEditDialog';

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
  const t = (i18n as any)[settings.language] || i18n.en;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);


  // Navigation helpers
  const navigate = (offset: number) => {
    if (!onDateChange) return;
    const d = new Date(currentDate);
    if (viewMode === 'week') {
      d.setDate(d.getDate() + offset * 7);
    } else {
      d.setMonth(d.getMonth() + offset);
    }
    onDateChange(d);
  };

  const handleTodayClick = () => {
    if (onDateChange) {
      onDateChange(new Date());
    }
  };

  const handleViewModeChange = (mode: CalendarViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // Dialog handlers
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailsOpen(true);
    setSelectedDate(null);
  };
  const handleEditFromDetails = () => {
    setIsTaskDetailsOpen(false);
    setIsTaskEditOpen(true);
    setSelectedDate(null);
  };
  const handleCloseEditDialog = () => {
    setIsTaskEditOpen(false);
    setSelectedTask(null);
    setSelectedDate(null);
  };
  const handleTaskEditSubmit = (
    values: TaskFormValues, 
    quoteColumns: QuoteColumn[], 
    collaboratorQuoteColumns: QuoteColumn[],
    taskId: string
  ) => {
    onEditTask(values, quoteColumns, collaboratorQuoteColumns, taskId);
    setIsTaskEditOpen(false);
    setSelectedTask(null);
  };
  const handleTaskDelete = (taskId: string) => {
    onDeleteTask(taskId);
    setIsTaskDetailsOpen(false);
    setSelectedTask(null);
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

  return (
    <div className="w-full h-full flex flex-col">
      {/* Calendar header với navigation và view mode toggle */}
      <div className="flex items-center justify-between mb-4 px-4 pt-4 flex-shrink-0 gap-4">
        {/* Navigation group - Enhanced UI */}
        <div className={styles.navigationGroup}>
          
          <button 
            type="button" 
            className={`${styles.navigationButton} btn-outline btn-sm`}
            onClick={() => navigate(-1)} 
            title={viewMode === 'week' ? t.prevWeek : t.prevMonth}
            aria-label={viewMode === 'week' ? t.prevWeek : t.prevMonth}
          >
            <span className="sr-only">{t.goToPrevious}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </button>
          
          <button 
            type="button" 
            className={`${styles.todayButton} btn-sm rounded`}
            onClick={handleTodayClick}
            title={t.jumpToToday}
            aria-label={t.jumpToToday}
          >
            {t.todayButton}
          </button>
          
          <button 
            type="button" 
            className={`${styles.navigationButton} btn-outline btn-sm`}
            onClick={() => navigate(1)} 
            title={viewMode === 'week' ? t.nextWeek : t.nextMonth}
            aria-label={viewMode === 'week' ? t.nextWeek : t.nextMonth}
          >
            <span className="sr-only">{t.goToNext}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </div>
        
        {/* Title */}
        <div className={styles.titleSection}>
          <h2 className={styles.titleMain}>
            {viewMode === 'week'
              ? `${formatMonthYear(currentDate, t)} (${t.weekNumber} ${getWeekNumber(currentDate)})`
              : formatMonthYear(currentDate, t)}
          </h2>
          
        </div>
        
        {/* View mode toggle - Enhanced UI */}
        <div className={styles.viewModeGroup}>
    
          <button
            type="button"
            className={`${styles.viewModeButton} ${viewMode === 'week' ? styles.active : ''}`}
            onClick={() => handleViewModeChange('week')}
            title={t.switchToWeekView}
            aria-label={t.switchToWeekView}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span className="ml-1">{t.weekView}</span>
          </button>
          <button
            type="button"
            className={`${styles.viewModeButton} ${viewMode === 'month' ? styles.active : ''}`}
            onClick={() => handleViewModeChange('month')}
            title={t.switchToMonthView}
            aria-label={t.switchToMonthView}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
              <line x1="3" y1="14" x2="21" y2="14"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span className="ml-1">{t.monthView}</span>
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
      {/* Dialogs for task details/edit */}
      {(selectedTask || isTaskEditOpen) && (
        <>
          {selectedTask && (
            <TaskDetailsDialog
              task={selectedTask}
              client={clients.find(c => c.id === selectedTask.clientId)}
              clients={clients}
              collaborators={collaborators}
              categories={categories}
              quote={quotes.find(q => q.id === selectedTask.quoteId)}
              collaboratorQuotes={selectedTask.collaboratorQuotes 
                ? selectedTask.collaboratorQuotes.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[]
                : (selectedTask as any).collaboratorQuoteId 
                  ? [collaboratorQuotes.find(q => q.id === (selectedTask as any).collaboratorQuoteId)].filter(Boolean) as Quote[]
                  : []
              }
              settings={settings}
              isOpen={isTaskDetailsOpen}
              onClose={() => setIsTaskDetailsOpen(false)}
              onEdit={handleEditFromDetails}
              onDelete={handleTaskDelete}
            />
          )}
          <TaskEditDialog
            task={selectedTask}
            quote={selectedTask ? quotes.find(q => q.id === selectedTask.quoteId) : undefined}
            collaboratorQuotes={selectedTask?.collaboratorQuotes 
              ? selectedTask.collaboratorQuotes.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[]
              : (selectedTask as any)?.collaboratorQuoteId 
                ? [collaboratorQuotes.find(q => q.id === (selectedTask as any).collaboratorQuoteId)].filter(Boolean) as Quote[]
                : []
            }
            clients={clients}
            collaborators={collaborators}
            categories={categories}
            quoteTemplates={quoteTemplates}
            settings={settings}
            isOpen={isTaskEditOpen}
            onOpenChange={handleCloseEditDialog}
            onSubmit={handleTaskEditSubmit}
            onAddClient={onAddClient}
            defaultDate={selectedDate}
          />
        </>
      )}
    </div>
  );
}
"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, Category, AppEvent } from '@/lib/types';
import { i18n } from '@/lib/i18n';
import { CalendarGrid } from './calendar/CalendarGrid';
import styles from './calendar-header.module.css';
import { TaskDetailsDialog } from './task-dialogs/TaskDetailsDialog';
import { EditTaskForm, type TaskFormValues } from './edit-task-form';
import { CreateTaskForm, type CreateTaskFormRef } from './create-task-form-new';
import { TaskEditDialog } from './task-dialogs/TaskEditDialog';

export type CalendarDisplayMode = 'week' | 'month';

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatMonthYear(date: Date, t: any) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const monthNames = [
    t.months?.january || 'January', t.months?.february || 'February', 
    t.months?.march || 'March', t.months?.april || 'April', t.months?.may || 'May', 
    t.months?.june || 'June', t.months?.july || 'July', t.months?.august || 'August', 
    t.months?.september || 'September', t.months?.october || 'October',
    t.months?.november || 'November', t.months?.december || 'December'
  ];
  return `${monthNames[monthIndex]} ${year}`;
}

export interface CalendarViewProps {
  tasks: Task[];
  events?: AppEvent[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onEditTask: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[], taskId: string) => void;
  onAddTask?: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[]) => void;
  onDeleteTask: (taskId: string) => void;
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  onUpdateQuote?: (quoteId: string, updates: Partial<Quote>) => void;
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  currentDate?: Date;
  viewMode?: CalendarDisplayMode;
  onDateChange?: (date: Date) => void;
  onViewModeChange?: (mode: CalendarDisplayMode) => void;
  updateTask: (task: Partial<Task> & { id: string }) => void;
}

export function CalendarView({
  tasks, events = [], quotes, collaboratorQuotes, clients, collaborators, categories, onEditTask,
  onAddTask, onDeleteTask, onAddClient, onUpdateQuote, quoteTemplates, settings, updateTask,
  currentDate = new Date(), viewMode = 'month', onDateChange, onViewModeChange
}: CalendarViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pendingEdit, setPendingEdit] = useState(false);

  // Using TaskEditDialog guard; no local dirty state needed here

  const t = useMemo(() => {
    const lang = settings.language;
    const baseLang = i18n[lang] || i18n.en;
    return {
      ...baseLang,
  // Use unified unsaved* keys
  unsavedConfirmTitle: (baseLang as any)?.unsavedConfirmTitle || (baseLang as any)?.confirmClose || "Unsaved changes",
  unsavedConfirmDescription: (baseLang as any)?.unsavedConfirmDescription || (baseLang as any)?.confirmCloseDescription || "You have unsaved changes. What would you like to do?",
  unsavedCancel: (baseLang as any)?.unsavedCancel || (baseLang as any)?.cancel || "Cancel",
  unsavedCloseWithoutSaving: (baseLang as any)?.unsavedCloseWithoutSaving || (baseLang as any)?.closeWithoutSaving || "Close Without Saving",
  saveDraft: (baseLang as any)?.saveDraft || "Save Draft",
    }
  }, [settings.language]);

  React.useEffect(() => {
    if (pendingEdit && !isTaskDetailsOpen && selectedTask) {
      setIsTaskEditOpen(true);
      setPendingEdit(false);
    }
  }, [pendingEdit, isTaskDetailsOpen, selectedTask]);

  const handleEditFromDetails = () => {
    setIsTaskDetailsOpen(false);
    setPendingEdit(true);
  };

  const handleTaskDelete = (taskId: string) => {
    onDeleteTask(taskId);
    setIsTaskDetailsOpen(false);
    setSelectedTask(null);
    setIsTaskEditOpen(false);
    setPendingEdit(false);
  };
  
  const handleTaskSubmit = (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[], taskId?: string) => {
    if (taskId) {
      onEditTask(values, quoteColumns, collaboratorQuoteColumns, taskId);
    } else if (onAddTask) {
      onAddTask(values, quoteColumns, collaboratorQuoteColumns);
    }
    setIsTaskEditOpen(false);
    setSelectedTask(null);
    setSelectedDate(null);
    setPendingEdit(false);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailsOpen(true);
  };

  // Keep selectedTask in sync with external task updates (e.g., flag changes)
  useEffect(() => {
    if (!selectedTask) return;
    const updated = tasks.find(t => t.id === selectedTask.id);
    if (updated && updated !== selectedTask) {
      setSelectedTask(updated);
    }
  }, [tasks, selectedTask]);
  
  const handleDateSelect = (date: Date) => {
    setSelectedTask(null);
    setSelectedDate(date);
    setIsTaskEditOpen(true);
  };

  const handleNavigate = (direction: number) => {
    if (onDateChange) {
      let newDate = new Date(currentDate);
      viewMode === 'week' ? newDate.setDate(newDate.getDate() + direction * 7) : newDate.setMonth(newDate.getMonth() + direction);
      onDateChange(newDate);
    }
  };

  const handleTodayClick = () => onDateChange?.(new Date());

  const handleViewModeChange = (mode: CalendarDisplayMode) => onViewModeChange?.(mode);

  // Month/Year picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(currentDate.getFullYear());
  const titleRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (pickerRef.current && pickerRef.current.contains(t)) return;
      if (titleRef.current && titleRef.current.contains(t)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const monthNames: string[] = [
    t.months?.january || 'January', t.months?.february || 'February',
    t.months?.march || 'March', t.months?.april || 'April', t.months?.may || 'May',
    t.months?.june || 'June', t.months?.july || 'July', t.months?.august || 'August',
    t.months?.september || 'September', t.months?.october || 'October',
    t.months?.november || 'November', t.months?.december || 'December'
  ];

  const titleText = viewMode === 'week'
    ? `${formatMonthYear(currentDate, t)} (${t.weekNumber} ${getWeekNumber(currentDate)})`
    : formatMonthYear(currentDate, t);

  const handleOpenPicker = () => {
    setPickerYear(currentDate.getFullYear());
    setPickerOpen((v) => !v);
  };

  const selectMonth = (monthIndex: number) => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    onDateChange?.(newDate);
    setPickerOpen(false);
  };
  
  return (
    <>
      {selectedTask && isTaskDetailsOpen && (
        <TaskDetailsDialog
          task={selectedTask} client={clients.find(c => c.id === selectedTask.clientId)}
          clients={clients} collaborators={collaborators} categories={categories}
          quote={quotes.find(q => q.id === selectedTask.quoteId)}
          quotes={quotes}
          collaboratorQuotes={selectedTask.collaboratorQuotes?.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[] ?? []}
          settings={settings} isOpen={isTaskDetailsOpen} onClose={() => setIsTaskDetailsOpen(false)}
          onEdit={handleEditFromDetails} onDelete={handleTaskDelete}
          onChangeStatus={(taskId, statusId) => updateTask({ id: taskId, status: statusId as any })}
          onUpdateTask={updateTask}
          onUpdateQuote={onUpdateQuote}
        />
      )}

      <TaskEditDialog
        task={selectedTask}
        quote={selectedTask ? quotes.find(q => q.id === selectedTask.quoteId) : undefined}
        collaboratorQuotes={selectedTask?.collaboratorQuotes?.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[] ?? []}
        clients={clients}
        collaborators={collaborators}
        categories={categories}
        quoteTemplates={quoteTemplates}
        settings={settings}
        isOpen={isTaskEditOpen}
        onOpenChange={(open) => {
          setIsTaskEditOpen(open);
          if (!open) {
            setSelectedTask(null);
            setSelectedDate(null);
          }
        }}
        onSubmit={(values, qc, cqc, taskId) => handleTaskSubmit(values, qc, cqc, taskId)}
        onAddClient={onAddClient}
        defaultDate={selectedDate}
      />

      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 px-4 pt-4 flex-shrink-0 gap-4">
          <div className={styles.navigationGroup}>
            <button type="button" className={`${styles.navigationButton} btn-outline btn-sm`} onClick={() => handleNavigate(-1)} title={viewMode === 'week' ? t.prevWeek : t.prevMonth} aria-label={viewMode === 'week' ? t.prevWeek : t.prevMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6"></polyline></svg>
            </button>
            <button type="button" className={`${styles.todayButton} btn-sm rounded`} onClick={handleTodayClick} title={t.jumpToToday} aria-label={t.jumpToToday}>
              {t.todayButton}
            </button>
            <button type="button" className={`${styles.navigationButton} btn-outline btn-sm`} onClick={() => handleNavigate(1)} title={viewMode === 'week' ? t.nextWeek : t.nextMonth} aria-label={viewMode === 'week' ? t.nextWeek : t.nextMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6"></polyline></svg>
            </button>
          </div>
          <div className={`${styles.titleSection} relative`} ref={titleRef}>
            <button
              type="button"
              className={`${styles.titleMain} inline-flex items-center gap-2 cursor-pointer select-none hover:text-primary transition-colors`}
              onClick={handleOpenPicker}
              aria-haspopup="dialog"
              aria-label={'Choose month and year'}
            >
              {titleText}
              <svg
                className={`h-4 w-4 transition-transform ${pickerOpen ? 'rotate-180' : 'rotate-0'}`}
                viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.108l3.71-3.877a.75.75 0 111.08 1.04l-4.24 4.43a.75.75 0 01-1.08 0l-4.24-4.43a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {pickerOpen && (
              <div
                ref={pickerRef}
                role="dialog"
                aria-label={'Choose month and year'}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-80 rounded-md border border-gray-200 bg-white shadow-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    className="px-2 py-1 rounded hover:bg-gray-100"
                    onClick={() => setPickerYear((y) => y - 1)}
                    aria-label={'Previous year'}
                    title={'Previous year'}
                  >
                    ‹
                  </button>
                  <div className="font-medium">{pickerYear}</div>
                  <button
                    type="button"
                    className="px-2 py-1 rounded hover:bg-gray-100"
                    onClick={() => setPickerYear((y) => y + 1)}
                    aria-label={'Next year'}
                    title={'Next year'}
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {monthNames.map((name, idx) => {
                    const isActive = currentDate.getFullYear() === pickerYear && currentDate.getMonth() === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`px-2 py-2 rounded text-sm border border-transparent hover:border-gray-200 hover:bg-gray-50 ${isActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-700'}`}
                        onClick={() => selectMonth(idx)}
                        aria-current={isActive ? 'date' : undefined}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className={styles.viewModeGroup}>
            <button type="button" className={`${styles.viewModeButton} ${viewMode === 'week' ? styles.active : ''}`} onClick={() => handleViewModeChange('week')} title={t.switchToWeekView} aria-label={t.switchToWeekView}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span className="ml-1">{t.weekView}</span>
            </button>
            <button type="button" className={`${styles.viewModeButton} ${viewMode === 'month' ? styles.active : ''}`} onClick={() => handleViewModeChange('month')} title={t.switchToMonthView} aria-label={t.switchToMonthView}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="3" y1="14" x2="21" y2="14"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              <span className="ml-1">{t.monthView}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 pb-4 min-h-0 overflow-auto">
          <CalendarGrid
              currentDate={currentDate} viewMode={viewMode} tasks={tasks}
              events={events} statusColors={settings.statusColors} clients={clients}
              categories={categories} onTaskClick={handleTaskClick}
              onDateSelect={handleDateSelect} settings={settings}
            />
        </div>
      </div>
    </>
  );
}
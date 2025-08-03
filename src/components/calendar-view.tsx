"use client";

import React, { useState, useRef, useMemo } from 'react';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, Category, AppEvent } from '@/lib/types';
import { i18n } from '@/lib/i18n';
import { CalendarGrid } from './calendar/CalendarGrid';
import styles from './calendar-header.module.css';
import { TaskDetailsDialog } from './task-dialogs/TaskDetailsDialog';
import { EditTaskForm, type TaskFormValues } from './edit-task-form';
import { CreateTaskForm, type CreateTaskFormRef } from './create-task-form-new';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

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
  onAddTask, onDeleteTask, onAddClient, quoteTemplates, settings, updateTask,
  currentDate = new Date(), viewMode = 'month', onDateChange, onViewModeChange
}: CalendarViewProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pendingEdit, setPendingEdit] = useState(false);

  const [isCreateTaskDirty, setIsCreateTaskDirty] = useState(false);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const createTaskFormRef = useRef<CreateTaskFormRef>(null);

  const t = useMemo(() => {
    const lang = settings.language;
    const baseLang = i18n[lang] || i18n.en;
    return {
      ...baseLang,
      confirmClose: (baseLang as any)?.confirmClose || "Confirm Close",
      confirmCloseDescription: (baseLang as any)?.confirmCloseDescription || "You have unsaved changes. What would you like to do?",
      saveDraft: (baseLang as any)?.saveDraft || "Save Draft",
      closeWithoutSaving: (baseLang as any)?.closeWithoutSaving || "Close Without Saving",
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
  
  const handleSetCreateTaskOpen = (open: boolean) => {
      if(open) {
          setIsTaskEditOpen(true);
      } else {
          handleCloseCreateDialog();
      }
  }

  const handleCloseCreateDialog = () => {
    if (isCreateTaskDirty && !selectedTask) {
        setIsConfirmCloseOpen(true);
    } else {
        setIsTaskEditOpen(false);
        setSelectedTask(null);
        setSelectedDate(null);
        setIsCreateTaskDirty(false);
    }
  }

  const handleConfirmSaveDraft = () => {
    createTaskFormRef.current?.handleSaveDraft();
    setIsConfirmCloseOpen(false);
  };

  const handleConfirmCloseNoSave = () => {
      setIsCreateTaskDirty(false);
      setIsConfirmCloseOpen(false);
      setIsTaskEditOpen(false);
      setSelectedTask(null);
      setSelectedDate(null);
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
    setIsCreateTaskDirty(false);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailsOpen(true);
  };
  
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
  
  return (
    <>
      {selectedTask && isTaskDetailsOpen && (
        <TaskDetailsDialog
          task={selectedTask} client={clients.find(c => c.id === selectedTask.clientId)}
          clients={clients} collaborators={collaborators} categories={categories}
          quote={quotes.find(q => q.id === selectedTask.quoteId)}
          collaboratorQuotes={selectedTask.collaboratorQuotes?.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[] ?? []}
          settings={settings} isOpen={isTaskDetailsOpen} onClose={() => setIsTaskDetailsOpen(false)}
          onEdit={handleEditFromDetails} onDelete={handleTaskDelete}
        />
      )}

      <Dialog open={isTaskEditOpen} onOpenChange={handleSetCreateTaskOpen}>
          <DialogContent 
              className="max-h-[90vh] overflow-y-auto sm:max-w-2xl md:max-w-5xl"
              onInteractOutside={(e) => {
                  if (isCreateTaskDirty && !selectedTask) {
                    e.preventDefault();
                    handleCloseCreateDialog();
                  }
              }}
               onEscapeKeyDown={(e) => {
                  if (isCreateTaskDirty && !selectedTask) {
                      e.preventDefault();
                      handleCloseCreateDialog();
                  }
              }}
            >
            <DialogTitle>{selectedTask ? t.editTask : t.createTask}</DialogTitle>
            {selectedTask ? (
              <EditTaskForm
                setOpen={setIsTaskEditOpen}
                onSubmit={handleTaskSubmit} taskToEdit={selectedTask}
                quote={selectedTask ? quotes.find(q => q.id === selectedTask.quoteId) : undefined}
                collaboratorQuotes={selectedTask?.collaboratorQuotes?.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[] ?? []}
                clients={clients} collaborators={collaborators} categories={categories}
                onAddClient={onAddClient} quoteTemplates={quoteTemplates} settings={settings}
                defaultDate={selectedDate}
              />
            ) : (
              <CreateTaskForm
                ref={createTaskFormRef}
                setOpen={setIsTaskEditOpen}
                onSubmit={onAddTask ? (values, qc, cqc) => handleTaskSubmit(values, qc, cqc) : () => {}}
                clients={clients} collaborators={collaborators} categories={categories}
                onAddClient={onAddClient} quoteTemplates={quoteTemplates} settings={settings}
                defaultDate={selectedDate ?? undefined}
                onDirtyChange={setIsCreateTaskDirty}
                onRequestConfirmClose={handleCloseCreateDialog}
              />
            )}
          </DialogContent>
        </Dialog>
     

      <AlertDialog open={isConfirmCloseOpen} onOpenChange={setIsConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmClose}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmCloseDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmCloseOpen(false)}>{t.cancel}</AlertDialogCancel>
             <Button variant="outline" onClick={handleConfirmSaveDraft}>{t.saveDraft}</Button>
             <Button variant="destructive" onClick={handleConfirmCloseNoSave}>{t.closeWithoutSaving}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          <div className={styles.titleSection}>
            <h2 className={styles.titleMain}>{viewMode === 'week' ? `${formatMonthYear(currentDate, t)} (${t.weekNumber} ${getWeekNumber(currentDate)})` : formatMonthYear(currentDate, t)}</h2>
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
import React, { useState, useEffect } from 'react';
import { Task, AppSettings, StatusColors, Client, Category, AppEvent, Quote, QuoteTemplate, Collaborator } from '@/lib/types';
import styles from './GanttView.module.css';
import { GanttUnified } from './GanttUnified';
import { DragEndEvent, DndContext, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { EventDetailsDialog } from '@/components/event-dialogs/EventDetailsDialog';
import EventDialog from '@/components/event-dialogs/EventDialog';
import { i18n } from '@/lib/i18n';

export interface GanttViewProps {
  tasks: Task[];
  events?: AppEvent[];
  settings: AppSettings;
  statusColors: StatusColors;
  updateTask: (task: Partial<Task> & { id: string }) => void;
  updateEvent?: (event: AppEvent) => void;
  // Drilled props
  clients: Client[];
  categories: Category[];
  language: keyof typeof i18n;
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  collaborators: Collaborator[];
  quoteTemplates: QuoteTemplate[];
  handleDeleteTask: (taskId: string) => void;
  handleEditTask: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  handleAddClientAndSelect: (data: Omit<Client, 'id'>) => Client;
}

function parseDateSafely(date: string | Date): Date {
    const d = new Date(date);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

const GanttChart: React.FC<GanttViewProps> = ({ 
  tasks,
  events = [],
  settings, 
  updateTask, 
  updateEvent = () => {}, 
  statusColors, 
  // Drilled props
  clients, 
  categories, 
  language,
  quotes,
  collaboratorQuotes,
  collaborators,
  quoteTemplates,
  handleDeleteTask,
  handleEditTask,
  handleAddClientAndSelect,
}) => {
  const rowHeight = 32;
  const [scale, setScale] = useState(48);
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [dragTooltip, setDragTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const [recentlyUpdatedTaskId, setRecentlyUpdatedTaskId] = useState<string | null>(null);

  // State for event dialogs
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isEventEditOpen, setIsEventEditOpen] = useState(false);

  useEffect(() => {
    if (recentlyUpdatedTaskId) {
      const timer = setTimeout(() => {
        setRecentlyUpdatedTaskId(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedTaskId]);
  
  const handleEventClick = (event: AppEvent) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  const handleEditEvent = (event: AppEvent) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(false);
    setIsEventEditOpen(true);
  };

  const handleEventSave = (eventUpdates: Partial<AppEvent>) => {
      if (selectedEvent) {
        // Ensure ID is preserved for updates
        updateEvent({ ...selectedEvent, ...eventUpdates, id: selectedEvent.id });
      }
      setIsEventEditOpen(false);
      setSelectedEvent(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = active.data.current?.task || active.data.current?.event;
    if (item) {
      setDragTooltip(prev => ({ ...prev, visible: true }));
    }
  };
  
  const handleDragMove = (event: DragMoveEvent) => {
    const { active, delta } = event;
    const task = active.data.current?.task as Task | undefined;
    const ev = active.data.current?.event as AppEvent | undefined;

    let dayDelta = 0;
    if (viewMode === 'day') {
        dayDelta = Math.round(delta.x / scale);
    } else {
        const sectionsPerMonth = 6;
        const daysPerSection = 5; 
        const sectionWidth = scale / sectionsPerMonth;
        const movedSections = Math.round(delta.x / sectionWidth);
        dayDelta = movedSections * daysPerSection;
    }

    if (dayDelta === 0 && delta.y === 0) return;

    let newStart: Date | undefined;
    let newEnd: Date | undefined;
    const type = active.data.current?.type;
    
    if (task && task.startDate && task.deadline) {
      newStart = parseDateSafely(task.startDate);
      newEnd = parseDateSafely(task.deadline);
      if (type === 'move') {
          newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
          newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      } else if (type === 'resize-start') {
          newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
      } else if (type === 'resize-end') {
          newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      }
    } else if (ev && ev.startTime && ev.endTime) {
      newStart = parseDateSafely(ev.startTime);
      newEnd = parseDateSafely(ev.endTime);
      const eventDragType = type?.toString().replace('event-', '');

      if (eventDragType === 'move') {
          newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
          newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      } else if (eventDragType === 'resize-start') {
          newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
      } else if (eventDragType === 'resize-end') {
          newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      }
    }
    
    if (newStart && newEnd) {
      const mouseEvent = event.activatorEvent as MouseEvent;
      setDragTooltip({
        visible: true,
        content: `${formatDate(newStart)} - ${formatDate(newEnd)}`,
        x: mouseEvent.clientX + 15,
        y: mouseEvent.clientY + 15,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragTooltip({ visible: false, content: '', x: 0, y: 0 });
    const { active, delta } = event;
    if (delta.x === 0 && delta.y === 0) return;

    let dayDelta = 0;
    if (viewMode === 'day') {
        dayDelta = Math.round(delta.x / scale);
    } else {
        const sectionsPerMonth = 6;
        const daysPerSection = 5;
        const sectionWidth = scale / sectionsPerMonth;
        const movedSections = Math.round(delta.x / sectionWidth);
        dayDelta = movedSections * daysPerSection;
    }

    if (dayDelta === 0) return;

    const task = active.data.current?.task as Task | undefined;
    const ev = active.data.current?.event as AppEvent | undefined;
    const type = active.data.current?.type as string | undefined;

    if (task && task.startDate && task.deadline) {
      let newStart = parseDateSafely(task.startDate);
      let newEnd = parseDateSafely(task.deadline);
      
      if (type === 'move') {
          newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
          newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      } else if (type === 'resize-start') {
          newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
      } else if (type === 'resize-end') {
          newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      }
      
      if (type === 'resize-start' && newStart.getTime() >= newEnd.getTime()) {
          newStart = new Date(newEnd.getTime() - 86400000);
      }
      if (type === 'resize-end' && newEnd.getTime() <= newStart.getTime()) {
          newEnd = new Date(newStart.getTime() + 86400000);
      }

      const hasStartChanged = newStart.getTime() !== parseDateSafely(task.startDate).getTime();
      const hasEndChanged = newEnd.getTime() !== parseDateSafely(task.deadline).getTime();

      if (hasStartChanged || hasEndChanged) {
         updateTask({ id: task.id, startDate: newStart, deadline: newEnd });
         setRecentlyUpdatedTaskId(task.id);
      }
    } else if (ev && ev.startTime && ev.endTime) {
      let newStart = parseDateSafely(ev.startTime);
      let newEnd = parseDateSafely(ev.endTime);
      const eventDragType = type?.toString().replace('event-', '');

      if (eventDragType === 'move') {
          newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
          newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      } else if (eventDragType === 'resize-start') {
          newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
      } else if (eventDragType === 'resize-end') {
          newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
      }

      if (eventDragType === 'resize-start' && newStart.getTime() >= newEnd.getTime()) {
          newStart = new Date(newEnd.getTime() - 86400000);
      }
      if (eventDragType === 'resize-end' && newEnd.getTime() <= newStart.getTime()) {
          newEnd = new Date(newStart.getTime() + 86400000);
      }
      
      const hasStartChanged = newStart.getTime() !== parseDateSafely(ev.startTime).getTime();
      const hasEndChanged = newEnd.getTime() !== parseDateSafely(ev.endTime).getTime();

      if(hasStartChanged || hasEndChanged) {
        updateEvent({ ...ev, startTime: newStart.toISOString(), endTime: newEnd.toISOString() });
      }
    }
  };

  return (
    <>
      <DndContext onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
          {dragTooltip.visible && (
              <div 
                  className={styles.dragPreviewTooltip}
                  style={{ left: `${dragTooltip.x}px`, top: `${dragTooltip.y}px` }}
              >
                  {dragTooltip.content}
              </div>
          )}
          <div className={styles.ganttContainerWrapper}>
              <div className={styles.ganttBody}>
                  <GanttUnified 
                    tasks={tasks} 
                    events={events}
                    onEventClick={handleEventClick}
                    rowHeight={rowHeight} 
                    statusColors={statusColors} 
                    settings={settings}
                    scale={scale} 
                    onScaleChange={setScale}
                    recentlyUpdatedTaskId={recentlyUpdatedTaskId}
                    viewMode={viewMode}
                    displayDate={displayDate}
                    onViewModeChange={setViewMode}
                    onDisplayDateChange={setDisplayDate}
                    // Drill props down
                    language={language}
                    clients={clients}
                    categories={categories}
                    quotes={quotes}
                    collaboratorQuotes={collaboratorQuotes}
                    collaborators={collaborators}
                    quoteTemplates={quoteTemplates}
                    handleDeleteTask={handleDeleteTask}
                    handleEditTask={handleEditTask}
                    handleAddClientAndSelect={handleAddClientAndSelect}
                  />
              </div>
          </div>
      </DndContext>

      <EventDetailsDialog 
        event={selectedEvent}
        tasks={tasks}
        isOpen={isEventDetailsOpen}
        onClose={() => setIsEventDetailsOpen(false)}
        onEdit={handleEditEvent}
      />
      
      {isEventEditOpen && (
        <EventDialog
          eventToEdit={selectedEvent}
          open={isEventEditOpen}
          onClose={() => { setIsEventEditOpen(false); setSelectedEvent(null); }}
          onSubmit={handleEventSave}
          tasks={tasks}
        />
      )}
    </>
  );
};

export const GanttView = GanttChart;
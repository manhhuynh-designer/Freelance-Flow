// Interface for CalendarGrid props
import type { Task, Client, Category, AppEvent } from '@/lib/types';
import type { CalendarDisplayMode } from '../calendar-view';
import { getTranslations, i18n } from '@/lib/i18n';
import type { AppSettings } from '@/lib/types';
import { EventDetailsDialog } from '../event-dialogs/EventDetailsDialog';
import EventDialog from '../event-dialogs/EventDialog';


export interface CalendarGridProps {
  currentDate: Date;
  viewMode: CalendarDisplayMode;
  tasks: Task[];
  events?: AppEvent[]; // Thêm prop events
  statusColors: Record<string, string>;
  clients: Client[];
  categories: Category[];
  onTaskClick?: (task: Task) => void;
  onDateSelect?: (date: Date) => void;
  settings: AppSettings;
}

import React, { useMemo, useRef, useState } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';


import { CalendarCell } from './CalendarCell';
import { TaskCard } from './TaskCard';

import { generateCalendarDays, getTasksForDate } from './calendar-utils';


export const CalendarGrid = (props: CalendarGridProps) => {
  const {
    currentDate,
    viewMode,
    tasks,
    events,
    statusColors,
    clients,
    categories,
    onTaskClick,
    onDateSelect,
    settings,
  } = props;

  const t = (i18n as any)[settings.language] || i18n.en;
  const dashboardContext = useDashboard();
  const allEvents = events ?? dashboardContext?.events ?? [];

    const [selectedEventForDetails, setSelectedEventForDetails] = useState<AppEvent | null>(null);
    const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<AppEvent | null>(null);
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // Get localized weekday names
  const weekdays = [
    t.weekdaysShort?.monday || 'Mon',
    t.weekdaysShort?.tuesday || 'Tue',
    t.weekdaysShort?.wednesday || 'Wed',
    t.weekdaysShort?.thursday || 'Thu',
    t.weekdaysShort?.friday || 'Fri',
    t.weekdaysShort?.saturday || 'Sat',
    t.weekdaysShort?.sunday || 'Sun'
  ];

  const weekdaysFull = [
    t.weekdays?.monday || 'Monday',
    t.weekdays?.tuesday || 'Tuesday',
    t.weekdays?.wednesday || 'Wednesday',
    t.weekdays?.thursday || 'Thursday',
    t.weekdays?.friday || 'Friday',
    t.weekdays?.saturday || 'Saturday',
    t.weekdays?.sunday || 'Sunday'
  ];

  const calendarDays = useMemo(() => {
    return generateCalendarDays(currentDate, viewMode);
  }, [currentDate, viewMode]);

  // Ref for the calendar grid container
  const containerRef = useRef<HTMLDivElement>(null);

  // State for drag overlay
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [activeEventId, setActiveEventId] = React.useState<string | null>(null);

  // Track the current drag-over date (if any)
  const [dragOverDate, setDragOverDate] = React.useState<string | null>(null);
  
  const activeTask = activeTaskId ? tasks.find(t => `task-${t.id}` === activeTaskId) : null;
  const activeEvent = activeEventId ? allEvents.find(e => `event-start-${e.id}` === activeEventId) : null;


  // Handler for drag start event
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { id } = active;
    if (typeof id === 'string') {
        if (id.startsWith('task-')) {
            setActiveTaskId(id);
            setActiveEventId(null);
        } else if (id.startsWith('event-start-')) {
            setActiveEventId(id);
            setActiveTaskId(null);
        }
    }
    setDragOverDate(null);
  };
    
    const handleEventClick = (event: AppEvent) => {
        setSelectedEventForDetails(event);
        setIsEventDetailsOpen(true);
    };

    const handleCloseDetails = () => {
        setIsEventDetailsOpen(false);
        setSelectedEventForDetails(null);
    };
    
    const handleEditEvent = (event: AppEvent) => {
        setEventToEdit(event);
        setIsEventDetailsOpen(false);
        setIsEventDialogOpen(true); 
    };
    
    const handleCloseEditDialog = () => {
        setIsEventDialogOpen(false);
        setEventToEdit(null);
    };

    const handleUpdateEvent = (updatedEvent: Partial<AppEvent>) => {
        if(dashboardContext?.updateEvent) {
            dashboardContext.updateEvent(updatedEvent as AppEvent);
        }
        handleCloseEditDialog();
    }


  // Handler for drag over event to track which date cell is hovered
  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!active?.id || !over?.id || !over.id.startsWith('date-')) {
      setDragOverDate(null);
      return;
    }
    setDragOverDate(over.id.replace('date-', ''));
  };

  // Handler for drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTaskId(null);
    setActiveEventId(null);
    setDragOverDate(null);

    if (!active?.id || !over?.id || typeof active.id !== 'string' || typeof over.id !== 'string' ) return;
    
    const dateStr = over.id.replace('date-', ''); // YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Handle task drop
    if (active.id.startsWith('task-')) {
        const taskId = active.id.replace('task-', '');
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newDeadline = new Date(year, month - 1, day, 23, 59, 59, 999);
        const oldDeadline = new Date(task.deadline);

        if (oldDeadline.getFullYear() !== newDeadline.getFullYear() ||
            oldDeadline.getMonth() !== newDeadline.getMonth() ||
            oldDeadline.getDate() !== newDeadline.getDate()) {
            
            dashboardContext?.updateTask?.({ ...task, deadline: newDeadline.toISOString() });
        }
    }
    // Handle event drop
    else if (active.id.startsWith('event-start-')) {
        const eventId = active.id.replace('event-start-', '');
        const event = allEvents.find(e => e.id === eventId);
        if (!event) return;
        
        const oldStartDate = new Date(event.startTime);
        const newStartDate = new Date(year, month - 1, day, oldStartDate.getHours(), oldStartDate.getMinutes());
        
        const duration = new Date(event.endTime).getTime() - oldStartDate.getTime();
        const newEndDate = new Date(newStartDate.getTime() + duration);

        if (oldStartDate.getFullYear() !== newStartDate.getFullYear() ||
            oldStartDate.getMonth() !== newStartDate.getMonth() ||
            oldStartDate.getDate() !== newStartDate.getDate()) {
                
            dashboardContext?.updateEvent?.({ 
                ...event, 
                startTime: newStartDate.toISOString(), 
                endTime: newEndDate.toISOString() 
            });
        }
    }
  };

  // Compose overlay task with updated deadline if dragging over a new date
  let overlayTask = activeTask;
  if (activeTask && dragOverDate) {
    const [year, month, day] = dragOverDate.split('-').map(Number);
    const newDeadline = new Date(year, month - 1, day, 23, 59, 59, 999);
    overlayTask = { ...activeTask, deadline: newDeadline.toISOString() };
  }
  
  // For overlay of events
  let overlayEvent = activeEvent;
  if(activeEvent && dragOverDate){
     const [year, month, day] = dragOverDate.split('-').map(Number);
     const oldStartDate = new Date(activeEvent.startTime);
     const newStartDate = new Date(year, month - 1, day, oldStartDate.getHours(), oldStartDate.getMinutes());
     overlayEvent = {...activeEvent, startTime: newStartDate.toISOString() }
  }


  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="h-full w-full flex flex-col min-h-0" ref={containerRef}>
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2 flex-shrink-0">
          {weekdays.map((day, index) => (
            <div
              key={index}
              className="calendar-header-cell text-xs font-semibold text-center py-2 bg-muted/30 rounded-sm"
              title={weekdaysFull[index]}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells grid - ensure it takes all remaining space */}
        <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 auto-rows-fr">
          {calendarDays.map(date => (
            <CalendarCell
              key={date.toISOString()}
              date={date}
              tasks={getTasksForDate(tasks, date)}
              events={allEvents} // Truyền events
              onTaskClick={onTaskClick}
              onEventClick={handleEventClick}
              onDateSelect={onDateSelect}
              viewMode={viewMode}
              statusColors={statusColors}
              containerRef={containerRef}
              clients={clients}
              categories={categories}
              currentMonth={viewMode === 'month' ? currentDate.getMonth() : undefined}
              updateTask={(dashboardContext?.updateTask as any)}
            />
          ))}
        </div>
        <DragOverlay>
            {overlayTask ? (
                <div style={{ opacity: 0.7, pointerEvents: 'none' }}>
                    <TaskCard task={overlayTask} showTime />
                </div>
            ) : overlayEvent ? (
                <div 
                    className="p-1.5 rounded-md text-sm border-l-4 flex items-center gap-2 bg-popover"
                    style={{
                        opacity: 0.7,
                        borderLeftColor: overlayEvent.color || 'hsl(var(--primary))',
                        backgroundColor: overlayEvent.color ? `${overlayEvent.color}40` : 'hsl(var(--popover))'
                    }}
                >
                    {overlayEvent.icon && <span className="text-base">{overlayEvent.icon}</span>}
                    <span className="font-medium truncate flex-1">{overlayEvent.name}</span>
                </div>
            ) : null}
        </DragOverlay>
        
        <EventDetailsDialog
                isOpen={isEventDetailsOpen}
                onClose={handleCloseDetails}
                event={selectedEventForDetails}
                tasks={tasks}
                onEdit={handleEditEvent}
        />

        {isEventDialogOpen && (
          <EventDialog
            open={isEventDialogOpen}
            onClose={handleCloseEditDialog}
            onSubmit={handleUpdateEvent}
            tasks={tasks}
            eventToEdit={eventToEdit}
          />
        )}
      </div>
    </DndContext>
  );
};

// Interface for CalendarGrid props
import type { Task, Client, Category } from '@/lib/types';
import type { CalendarDisplayMode } from '../calendar-view';
import { getTranslations, i18n } from '@/lib/i18n';
import type { AppSettings } from '@/lib/types';

export interface CalendarGridProps {
  currentDate: Date;
  viewMode: CalendarDisplayMode;
  tasks: Task[];
  statusColors: Record<string, string>;
  clients: Client[];
  categories: Category[];
  onTaskClick?: (task: Task) => void;
  onDateSelect?: (date: Date) => void;
  settings: AppSettings;
}

import React, { useMemo, useRef } from 'react';
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
    statusColors,
    clients,
    categories,
    onTaskClick,
    onDateSelect,
    settings,
  } = props;

  const t = (i18n as any)[settings.language] || i18n.en;
  const dashboardContext = useDashboard();

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
  // Track the current drag-over date (if any)
  const [dragOverDate, setDragOverDate] = React.useState<string | null>(null);
  const activeTask = activeTaskId ? tasks.find(t => `task-${t.id}` === activeTaskId) : null;


  // Handler for drag start event
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (typeof active.id === 'string' && active.id.startsWith('task-')) {
      setActiveTaskId(active.id);
    }
    setDragOverDate(null);
  };

  // Handler for drag over event to track which date cell is hovered
  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!active?.id || !over?.id) {
      setDragOverDate(null);
      return;
    }
    if (typeof active.id !== 'string' || typeof over.id !== 'string') {
      setDragOverDate(null);
      return;
    }
    if (!active.id.startsWith('task-') || !over.id.startsWith('date-')) {
      setDragOverDate(null);
      return;
    }
    setDragOverDate(over.id.replace('date-', ''));
  };

  // Handler for drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    setDragOverDate(null);
    if (!active?.id || !over?.id) return;
    // active.id: task-taskId, over.id: date-YYYY-MM-DD
    if (typeof active.id !== 'string' || typeof over.id !== 'string') return;
    if (!active.id.startsWith('task-') || !over.id.startsWith('date-')) return;
    const taskId = active.id.replace('task-', '');
    const dateStr = over.id.replace('date-', ''); // YYYY-MM-DD
    // Tìm task hiện tại
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    // Nếu deadline đã đúng thì không cần update
    const [year, month, day] = dateStr.split('-').map(Number);
    const newDeadline = new Date(year, month - 1, day, 23, 59, 59, 999); // set cuối ngày
    const oldDeadline = new Date(task.deadline);
    if (
      oldDeadline.getFullYear() === newDeadline.getFullYear() &&
      oldDeadline.getMonth() === newDeadline.getMonth() &&
      oldDeadline.getDate() === newDeadline.getDate()
    ) {
      return;
    }
    // Gọi updateTask từ dashboardContext
    if (dashboardContext && dashboardContext.updateTask) {
      dashboardContext.updateTask({ ...task, deadline: newDeadline.toISOString() });
    }
  };

  // Compose overlay task with updated deadline if dragging over a new date
  let overlayTask = activeTask;
  if (activeTask && dragOverDate) {
    // Only update if dragOverDate is different from current deadline
    const [year, month, day] = dragOverDate.split('-').map(Number);
    const newDeadline = new Date(year, month - 1, day, 23, 59, 59, 999);
    const oldDeadline = new Date(activeTask.deadline);
    if (
      oldDeadline.getFullYear() !== newDeadline.getFullYear() ||
      oldDeadline.getMonth() !== newDeadline.getMonth() ||
      oldDeadline.getDate() !== newDeadline.getDate()
    ) {
      overlayTask = { ...activeTask, deadline: newDeadline.toISOString() };
    }
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
              onTaskClick={onTaskClick}
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
            <div style={{ opacity: 0.7, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
              <TaskCard task={overlayTask} showTime />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

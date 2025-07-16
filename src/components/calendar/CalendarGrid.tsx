// Interface for CalendarGrid props
import type { Task, Client, Category } from '@/lib/types';
import { CalendarViewMode } from '@/lib/types';
import { getTranslations, i18n } from '@/lib/i18n';
import type { AppSettings } from '@/lib/types';

export interface CalendarGridProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  tasks: Task[];
  statusColors: Record<string, string>;
  clients: Client[];
  categories: Category[];
  onTaskClick?: (task: Task) => void;
  onDateSelect?: (date: Date) => void;
  settings: AppSettings;
}

import React, { useMemo, useRef } from 'react';

import { CalendarCell } from './CalendarCell';

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

  return (
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
          />
        ))}
      </div>
    </div>
  );
};

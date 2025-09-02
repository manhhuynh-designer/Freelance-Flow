// Calendar utility functions and constants
import { Task, AppEvent } from '@/lib/types';

// Local alias for calendar view modes (types.ts does not export this currently)
type CalendarViewMode = 'week' | 'month';

// Helper function to format relative dates with i18n
export function formatRelativeDate(date: Date, t: any): string {
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return t.dateFormats?.today || 'Today';
  if (diffDays === -1) return t.dateFormats?.yesterday || 'Yesterday';
  if (diffDays === 1) return t.dateFormats?.tomorrow || 'Tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)} ${t.dateFormats?.daysAgo || 'days ago'}`;
  if (diffDays > 0) return `${diffDays} ${t.dateFormats?.daysFrom || 'days from now'}`;
  
  return date.toLocaleDateString();
}

// Helper function to get weekday name with i18n
export function getLocalizedWeekday(date: Date, t: any, short: boolean = false): string {
  const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
  const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekdayKey = weekdayKeys[dayIndex];
  
  if (short) {
    return t.weekdaysShort?.[weekdayKey] || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex];
  } else {
    return t.weekdays?.[weekdayKey] || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex];
  }
}

// Generate array of dates for the current week or month
export function generateCalendarDays(currentDate: Date, viewMode: CalendarViewMode): Date[] {
  // Week view: 7 days, starting from Monday
  if (viewMode === 'week') {
    const start = new Date(currentDate);
    const day = start.getDay();
    // Adjust to Monday (0=Sunday, 1=Monday...)
    const diff = (day === 0 ? -6 : 1) - day;
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }
  // Month view: all days in month, padded to full weeks
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // Pad start to Monday
  let start = new Date(firstDay);
  let startDay = start.getDay();
  let pad = (startDay === 0 ? 6 : startDay - 1);
  start.setDate(start.getDate() - pad);
  while (start <= lastDay || days.length % 7 !== 0) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
}

function isSameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}


// Get tasks for a specific date (by deadline)
export function getTasksForDate(tasks: Task[], date: Date): Task[] {
  return tasks.filter(task => {
    const d = new Date(task.deadline);
    return isSameDate(d, date);
  });
}
// Get events for a specific date
export function getEventsForDate(events: AppEvent[], date: Date): AppEvent[] {
    return events.filter(event => {
        const d = new Date(event.startTime);
        return isSameDate(d, date);
    });
}

import React, { useState } from 'react';
import styles from './GanttView.module.css';
import ganttStyles from './GanttUnified.module.css';
import { AppEvent, AppSettings } from '@/lib/types';
import { useDraggable } from '@dnd-kit/core';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';

interface EventBarProps {
  event: AppEvent;
  dayStart: Date;
  dayCount: number;
  scale: number;
  viewMode: 'day' | 'month';
  settings?: AppSettings;
  top?: number;
  onEventClick?: (event: AppEvent) => void;
}

function parseDateSafely(date: string | Date): Date {
    const d = new Date(date);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function getDayDiff(start: Date, end: Date): number {
  if (!start || !end) return 0;
  const startTime = parseDateSafely(start).getTime();
  const endTime = parseDateSafely(end).getTime();
  return (endTime - startTime) / (1000 * 60 * 60 * 24);
}

function formatDateTime(dateStr: string | Date): string {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export const EventBar: React.FC<EventBarProps> = ({ event, dayStart, dayCount, scale, viewMode, settings, top, onEventClick }) => {
  if (!event.startTime || !event.endTime) return null;

  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [isBarHovered, setIsBarHovered] = useState(false);

  const dashboardContext = useDashboard();
  const appSettings = dashboardContext?.appSettings;
  const language = appSettings?.language || 'vi';
  const t = i18n[language] || i18n.vi;

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  let leftUnits = 0;
  let durationUnits = 0;

  if (viewMode === 'day') {
    leftUnits = getDayDiff(dayStart, start);
    durationUnits = getDayDiff(start, end);
  } else {
    const timelineStartYear = dayStart.getFullYear();
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMonth = (startYear - timelineStartYear) * 12 + start.getMonth();
    const daysInStartMonth = new Date(startYear, start.getMonth() + 1, 0).getDate();
    const startDayFraction = (start.getDate() - 1) / daysInStartMonth;
    leftUnits = startMonth + startDayFraction;
    const endMonth = (endYear - timelineStartYear) * 12 + end.getMonth();
    const daysInEndMonth = new Date(endYear, end.getMonth() + 1, 0).getDate();
    const endDayFraction = end.getDate() / daysInEndMonth;
    const endUnits = endMonth + endDayFraction;
    durationUnits = endUnits - leftUnits;
  }
  
  durationUnits = Math.max(durationUnits, 0);

  if (leftUnits < 0) {
    durationUnits += leftUnits;
    leftUnits = 0;
  }
  if (leftUnits + durationUnits > dayCount) {
    durationUnits = dayCount - leftUnits;
  }

  const left = leftUnits * scale;
  const width = Math.max(0, durationUnits * scale);

  const { attributes: moveAttrs, listeners: moveListeners, setNodeRef, transform: moveTransform, isDragging: moveIsDragging } = useDraggable({
    id: `move-${event.id}`, data: { event, type: 'event-move' }
  });

  const { attributes: startResizeAttrs, listeners: startResizeListeners, setNodeRef: setStartResizeRef, transform: startResizeTransform, isDragging: startResizeIsDragging } = useDraggable({
    id: `resize-start-${event.id}`, data: { event, type: 'event-resize-start' }
  });

  const { attributes: endResizeAttrs, listeners: endResizeListeners, setNodeRef: setEndResizeRef, transform: endResizeTransform, isDragging: endResizeIsDragging } = useDraggable({
    id: `resize-end-${event.id}`, data: { event, type: 'event-resize-end' }
  });
  
  const isDragging = moveIsDragging || startResizeIsDragging || endResizeIsDragging;
  const showTooltip = isBarHovered && !isDragging && !isHandleHovered;

  let computedLeft = left;
  let computedWidth = width;

  if (moveIsDragging && moveTransform) {
    computedLeft = left + moveTransform.x;
  }
  if (startResizeIsDragging && startResizeTransform) {
    computedLeft = left + startResizeTransform.x;
    computedWidth = Math.max(0, width - startResizeTransform.x);
  }
  if (endResizeIsDragging && endResizeTransform) {
    computedWidth = Math.max(0, width + endResizeTransform.x);
  }

  const computedOpacity = isDragging ? 0.7 : 1;
  const computedZIndex = isDragging ? 20 : 1;
  const backgroundColor = event.color || '#ccc';

  if (computedWidth <= 0 && !isDragging) return null;

  const timelineStart = dayStart;
  const timelineEnd = new Date(dayStart);
  if (viewMode === 'day') {
    timelineEnd.setDate(dayStart.getDate() + dayCount);
  } else {
    timelineEnd.setFullYear(dayStart.getFullYear() + dayCount);
  }

  const isNotStart = start < timelineStart;
  const isNotEnd = end > timelineEnd;

  const barClasses = [
    ganttStyles.taskBar,
    ganttStyles.eventBar,
    isNotStart ? ganttStyles['taskBar--not-start'] : '',
    isNotEnd ? ganttStyles['taskBar--not-end'] : '',
    isDragging ? ganttStyles['is-dragging'] : ''
  ].filter(Boolean).join(' ');
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={showTooltip}>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            className={barClasses}
            style={{
              '--taskbar-top': top !== undefined ? `${top}px` : '4px',
              '--taskbar-left': `${computedLeft}px`,
              '--taskbar-width': `${computedWidth}px`,
              '--taskbar-opacity': computedOpacity,
              '--taskbar-zindex': computedZIndex,
              '--taskbar-bg': backgroundColor,
            } as React.CSSProperties}
            onMouseEnter={() => setIsBarHovered(true)}
            onMouseLeave={() => setIsBarHovered(false)}
            onClick={() => onEventClick?.(event)}
          >
            <div className={ganttStyles.barLabel} style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '10px' }}>
                {/* Drag Handle for Moving */}
                <span
                    {...moveAttrs}
                    {...moveListeners}
                    className="cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()} // Prevent onClick from firing on the parent div
                    onMouseEnter={() => setIsHandleHovered(true)}
                    onMouseLeave={() => setIsHandleHovered(false)}
                >
                  <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="6" cy="3" r="1.5" fill="#88888880" />
                    <circle cx="6" cy="8" r="1.5" fill="#88888880" />
                    <circle cx="6" cy="13" r="1.5" fill="#88888880" />
                  </svg>
                </span>
                {event.icon} {event.name}
            </div>
            {!isNotStart && (
              <div 
                ref={setStartResizeRef} 
                className={ganttStyles['resize-handle-left']}
                onMouseEnter={() => setIsHandleHovered(true)}
                onMouseLeave={() => setIsHandleHovered(false)}
                {...startResizeListeners}
                {...startResizeAttrs}
              />
            )}
            {!isNotEnd && (
              <div 
                ref={setEndResizeRef}
                className={ganttStyles['resize-handle-right']}
                onMouseEnter={() => setIsHandleHovered(true)}
                onMouseLeave={() => setIsHandleHovered(false)}
                {...endResizeListeners}
                {...endResizeAttrs}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs" side="top" align="start" sideOffset={5} collisionPadding={10}>
            <div className="flex items-center gap-2 font-semibold">
                <p>{event.name}</p>
            </div>
            <div className="text-gray-400 space-y-1 mt-1">
                <p>{t.startDate}: {formatDateTime(start)}</p>
                <p>{t.deadline}: {formatDateTime(end)}</p>
            </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
import React, { useState } from 'react';
import styles from './GanttView.module.css';
import ganttStyles from './GanttUnified.module.css';
import { Task, StatusColors, AppSettings } from '@/lib/types';
import { useDraggable } from '@dnd-kit/core';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';

interface TaskBarProps {
  task: Task;
  dayStart: Date;
  dayCount: number;
  scale: number;
  viewMode: 'day' | 'month';
  statusColors: StatusColors;
  settings?: AppSettings;
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

function formatDate(dateStr: string | Date): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
    });
}

export const TaskBar: React.FC<TaskBarProps> = ({ task, dayStart, dayCount, scale, viewMode, statusColors, settings }) => {
  if (!task.startDate || !task.deadline) return null;

  const [isHandleHovered, setIsHandleHovered] = useState(false);
  const [isBarHovered, setIsBarHovered] = useState(false);

  const dashboardContext = useDashboard();
  const appSettings = dashboardContext?.appSettings;
  const language = appSettings?.language || 'vi';
  const t = i18n[language] || i18n.vi;

  const start = new Date(task.startDate);
  const end = new Date(task.deadline);

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

  if (leftUnits < 0) {
    durationUnits += leftUnits;
    leftUnits = 0;
  }
  if (leftUnits + durationUnits > dayCount) {
    durationUnits = dayCount - leftUnits;
  }

  const left = leftUnits * scale;
  const width = Math.max(0, durationUnits * scale);

  const { attributes, listeners, setNodeRef, transform: moveTransform, isDragging: moveIsDragging } = useDraggable({
    id: `move-${task.id}`, data: { task, type: 'move' }
  });

  const { attributes: startResizeAttrs, listeners: startResizeListeners, setNodeRef: setStartResizeRef, transform: startResizeTransform, isDragging: startResizeIsDragging } = useDraggable({
    id: `resize-start-${task.id}`, data: { task, type: 'resize-start' }
  });

  const { attributes: endResizeAttrs, listeners: endResizeListeners, setNodeRef: setEndResizeRef, transform: endResizeTransform, isDragging: endResizeIsDragging } = useDraggable({
    id: `resize-end-${task.id}`, data: { task, type: 'resize-end' }
  });
  
  const isDragging = moveIsDragging || startResizeIsDragging || endResizeIsDragging;
  const showTooltip = isBarHovered && !isDragging && !isHandleHovered;
  
  const eisenhowerSchemes = {
    colorScheme1: { do: '#ef4444', decide: '#3b82f6', delegate: '#f59e42', delete: '#6b7280' },
    colorScheme2: { do: '#d8b4fe', decide: '#bbf7d0', delegate: '#fed7aa', delete: '#bfdbfe' },
    colorScheme3: { do: '#99f6e4', decide: '#fbcfe8', delegate: '#fde68a', delete: '#c7d2fe' },
  };
  const quadrant = task.eisenhowerQuadrant as keyof typeof eisenhowerSchemes['colorScheme1'] | undefined;
  const scheme = settings?.eisenhowerColorScheme || 'colorScheme1';
  const flagColors = eisenhowerSchemes[scheme as keyof typeof eisenhowerSchemes] || eisenhowerSchemes['colorScheme1'];
  const flagColor = quadrant ? (flagColors[quadrant] || '#e5e7eb') : '#e5e7eb';

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
  const backgroundColor = statusColors[task.status] || '#ccc';

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
    styles.taskBar,
    ganttStyles.taskBar,
    isNotStart ? ganttStyles['taskBar--not-start'] : '',
    isNotEnd ? ganttStyles['taskBar--not-end'] : '',
    isDragging ? ganttStyles['is-dragging'] : ''
  ].filter(Boolean).join(' ');

  const mainStatus = appSettings?.statusSettings?.find(s => s.id === task.status);
  let statusLabel = mainStatus?.label || task.status;
  if (task.subStatusId && mainStatus?.subStatuses) {
    const subStatus = mainStatus.subStatuses.find(ss => ss.id === task.subStatusId);
    if (subStatus) {
        statusLabel = `${statusLabel} (${subStatus.label})`;
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={showTooltip}>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            className={barClasses}
            style={{
              '--taskbar-left': `${computedLeft}px`,
              '--taskbar-width': `${computedWidth}px`,
              '--taskbar-opacity': computedOpacity,
              '--taskbar-zindex': computedZIndex,
              '--taskbar-bg': backgroundColor,
            } as React.CSSProperties}
            onMouseEnter={() => setIsBarHovered(true)}
            onMouseLeave={() => setIsBarHovered(false)}
            {...listeners}
            {...attributes}
          >
            {!isNotStart && (
              <div 
                ref={setStartResizeRef} 
                className={ganttStyles['resize-handle-left']}
                onMouseEnter={() => setIsHandleHovered(true)}
                onMouseLeave={() => setIsHandleHovered(false)}
                {...startResizeListeners}
                {...startResizeAttrs}
                onClick={(e) => e.stopPropagation()}
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
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs" side="top" align="start" sideOffset={5} collisionPadding={10}>
            <div className="flex items-center gap-2 font-semibold">
                <Flag size={14} color={flagColor} fill={flagColor} />
                <p>{task.name}</p>
            </div>
            <div className="my-1">
                <Badge style={{backgroundColor: statusColors[task.status] || '#ccc'}} className="text-white text-xs px-2 py-0.5">{statusLabel}</Badge>
            </div>
            <div className="text-gray-400 space-y-1">
                <p>{t.startDate || 'Bắt đầu'}: {formatDate(start)}</p>
                <p>{t.deadline || 'Kết thúc'}: {formatDate(end)}</p>
            </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

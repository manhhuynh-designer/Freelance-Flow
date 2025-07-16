import { Task } from '@/lib/types';
import { CalendarViewMode } from '@/lib/types';
import React, { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { getStatusColor } from '@/lib/colors';

import type { Client, Category } from '@/lib/types';
import styles from './CalendarCell.module.css';
export type CalendarCellProps = {
  date: Date;
  tasks: Task[];
  viewMode: CalendarViewMode;
  isSelected?: boolean;
  onTaskClick?: (task: Task) => void;
  onDateSelect?: (date: Date) => void;
  onViewAllTasks?: (date: Date, tasks: Task[]) => void;
  statusColors: Record<string, string>;
  containerRef?: React.RefObject<HTMLDivElement>;
  clients: Client[];
  categories: Category[];
  currentMonth?: number; // tháng đang xem (0-11)
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}


export const CalendarCell: React.FC<CalendarCellProps> = ({
  date,
  tasks,
  viewMode = 'week',
  isSelected,
  onTaskClick,
  onDateSelect,
  onViewAllTasks,
  statusColors,
  containerRef,
  clients,
  categories,
  currentMonth,
}) => {
  // Xác định ngày này có thuộc tháng đang xem (currentMonth) không (chỉ dùng cho month view)
  const monthToCompare = typeof currentMonth === 'number' ? currentMonth : (new Date()).getMonth();
  const isOutsideMonth = viewMode === 'month' && date.getMonth() !== monthToCompare;
  const isToday = isSameDay(date, new Date());
  const sortedTasks = useMemo(() => {
    return tasks.slice().sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const pa = ((a as any).priority || 'low') as keyof typeof priorityOrder;
      const pb = ((b as any).priority || 'low') as keyof typeof priorityOrder;
      const priorityDiff = (priorityOrder[pb] || 1) - (priorityOrder[pa] || 1);
      if (priorityDiff !== 0) return priorityDiff;
      const timeA = new Date(a.deadline).getTime();
      const timeB = new Date(b.deadline).getTime();
      return timeA - timeB;
    });
  }, [tasks]);

  const cellRef = useRef<HTMLDivElement>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<'top' | 'bottom'>('bottom');
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  // Detect overflow: if scrollHeight > clientHeight, then tasks are being cropped
  const isOverflowing = () => {
    const el = cellRef.current;
    if (!el) return false;
    const taskList = el.querySelector('.calendar-task-list');
    if (!taskList) return false;
    return (taskList.scrollHeight > taskList.clientHeight);
  };

  // Show popover only if overflow and has tasks
  const handleMouseEnter = () => {
    if (tasks.length > 0 && isOverflowing()) {
      const el = cellRef.current;
      const container = containerRef?.current;
      if (el && container) {
        const cellRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        // Top/bottom
        if (cellRect.bottom > viewportHeight - 200) {
          setPopoverPosition('top');
        } else {
          setPopoverPosition('bottom');
        }
        // Calculate left/right/center relative to container
        const cellLeftInContainer = cellRect.left - containerRect.left;
        const cellRightInContainer = cellRect.right - containerRect.left;
        const popoverWidth = 260; // estimate, should match min-w + padding
        let style: React.CSSProperties = { minWidth: 220, maxWidth: 320 };
        // Calculate overflow amount on the left
        const overflowLeft = popoverWidth / 2 - cellLeftInContainer;
        const overflowRight = cellRightInContainer + popoverWidth / 2 - containerRect.width;
        if (overflowLeft > 0) {
          // Popover would overflow left, so shift right by overflowLeft
          style.left = Math.max(0, cellLeftInContainer - overflowLeft) + 'px';
          style.right = 'auto';
          style.transform = 'none';
        } else if (overflowRight > 0) {
          // Popover would overflow right, so shift left by overflowRight
          style.right = Math.max(0, containerRect.width - cellRightInContainer - overflowRight) + 'px';
          style.left = 'auto';
          style.transform = 'none';
        } else {
          style.left = '50%';
          style.transform = 'translateX(-50%)';
          style.right = 'auto';
        }
        setPopoverStyle(style);
      }
      setShowPopover(true);
    }
  };
  const handleMouseLeave = () => setShowPopover(false);

  return (
    <div
      ref={cellRef}
      className={[
        'calendar-cell p-1 border rounded-md cursor-pointer relative',
        'h-full min-h-0 flex flex-col',
        'hover:bg-muted/50 transition-colors',
        isSelected && 'ring-2 ring-primary',
        isToday && styles['calendar-today'],
        isOutsideMonth && !showPopover && styles['calendar-outside-month'],
        tasks.length > 0 && 'has-tasks',
        'group' // for hover
      ].filter(Boolean).join(' ')}
      onClick={(e) => {
        // Nếu click vào task thì đã stopPropagation, chỉ click vào vùng trống mới tạo task
        if (e.target === e.currentTarget) {
          onDateSelect?.(date);
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Nút + tạo task, chỉ hiện khi hover và KHÔNG có popover */}
      {!showPopover && (
        <button
          className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white opacity-0 group-hover:opacity-100 transition-opacity shadow hover:bg-primary/80"
          style={{ pointerEvents: 'auto' }}
          title="Thêm task mới"
          tabIndex={-1}
          onClick={e => {
            e.stopPropagation();
            onDateSelect?.(date);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
      {/* Date Number */}
      <div className="text-sm font-medium flex justify-between items-center flex-shrink-0 mb-1">
        <span className={isToday ? styles['calendar-today-number'] : 'font-bold'}>{date.getDate()}</span>
      </div>
      {/* Task Cards - always render all, allow overflow hidden */}
      <div className="flex-1 space-y-0.5 overflow-hidden calendar-task-list">
        {sortedTasks.map((task) => {
          const clientName = clients.find((c: Client) => c.id === task.clientId)?.name;
          const categoryName = categories.find((cat: Category) => cat.id === task.categoryId)?.name;
          const extraInfo = (viewMode === 'week' && (clientName || categoryName))
            ? `${clientName || ''}${clientName && categoryName ? ' | ' : ''}${categoryName || ''}`
            : undefined;
          return (
            <TaskCard
              key={task.id}
              task={task}
              onClick={e => {
                e.stopPropagation();
                onTaskClick?.(task);
              }}
              isCompact={viewMode === 'month'}
              showTime={false}
              extraInfo={extraInfo}
            />
          );
        })}
      </div>
      {/* Popover dialog when overflow */}
      {showPopover && (
        <div
          className={cn(
            "absolute z-50 shadow-lg border rounded-md p-6 min-w-[220px] max-h-60 overflow-y-auto",
            popoverPosition === 'top' ? 'bottom-full' : 'top-10',
            "bg-popover text-popover-foreground",
            styles['calendar-popover']
          )}
          style={popoverPosition === 'top' ? { ...popoverStyle, transform: 'translateY(25%)' } : popoverStyle}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="text-s font-semibold">{date.getDate()}/{date.getMonth() + 1}</div>
            {/* Nút + trong popover */}
            <button
              className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white shadow hover:bg-primary/80 transition"
              style={{ pointerEvents: 'auto' }}
              title="Thêm task mới"
              tabIndex={-1}
              onClick={e => {
                e.stopPropagation();
                setShowPopover(false);
                onDateSelect?.(date);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {sortedTasks.map((task) => {
            const statusColor = getStatusColor(task.status, statusColors);
            const clientName = clients.find((c: Client) => c.id === task.clientId)?.name;
            const categoryName = categories.find((cat: Category) => cat.id === task.categoryId)?.name;
            return (
              <div
                key={task.id}
                className={cn(
                  "mb-1 last:mb-0 cursor-pointer rounded px-2 py-1 flex items-center gap-2 border-l-4",
                  statusColor ? undefined : "border-l-muted",
                  "hover:bg-muted/30"
                )}
                style={statusColor ? { borderLeftColor: statusColor, background: statusColor + '22' } : {}}
                onClick={e => {
                  e.stopPropagation();
                  setShowPopover(false);
                  onTaskClick?.(task);
                }}
              >
                <span className="font-medium flex-1 truncate">{task.name}</span>
                {clientName && (
                  <span className="ml-2 text-xs text-muted-foreground">{clientName}</span>
                )}
                {categoryName && (
                  <span className="ml-2 text-xs text-muted-foreground">{categoryName}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

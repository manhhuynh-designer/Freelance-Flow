"use client";
// Component con cho task draggable trong popover, dùng đúng rules of hooks
import { useDraggable } from '@dnd-kit/core';
import { Task, AppEvent } from '@/lib/types';
import type { CalendarDisplayMode } from '../calendar-view';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreateTaskForm, type CreateTaskFormRef } from '@/components/create-task-form-new';
import { addDays } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';
import { getStatusColor } from '@/lib/colors';

import type { Client, Category } from '@/lib/types';
import styles from './CalendarCell.module.css';

interface PopoverTaskDraggableProps {
  task: Task;
  statusColor: string | undefined;
  clientName?: string;
  categoryName?: string;
  onTaskClick?: (task: Task) => void;
  setShowPopover: (show: boolean) => void;
}

const PopoverTaskDraggable: React.FC<PopoverTaskDraggableProps> = ({
  task,
  statusColor,
  clientName,
  categoryName,
  onTaskClick,
  setShowPopover,
}) => {
  const draggableId = `task-${task.id}`;
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: draggableId });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mb-1 last:mb-0 cursor-pointer rounded px-2 py-1 flex items-center gap-2 border-l-4",
        statusColor ? undefined : "border-l-muted",
        isDragging && 'opacity-50',
        "hover:bg-muted/30"
      )}
      style={statusColor ? { borderLeftColor: statusColor, background: statusColor + '22' } : {}}
      onClick={e => {
        e.stopPropagation();
        setShowPopover(false);
        onTaskClick?.(task);
      }}
    >
      {/* Drag handle 3 chấm dọc */}
      <span
        {...attributes}
        {...listeners}
        className="flex items-center justify-start cursor-grab active:cursor-grabbing select-none"
        style={{ marginLeft: '-2px' }}
        tabIndex={-1}
        aria-label="Drag task"
        onClick={e => e.stopPropagation()}
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="3" r="1.5" fill="#888" />
          <circle cx="6" cy="8" r="1.5" fill="#888" />
          <circle cx="6" cy="13" r="1.5" fill="#888" />
        </svg>
      </span>
      <span className="font-medium flex-1 truncate">{task.name}</span>
      {clientName && (
        <span className="ml-2 text-xs text-muted-foreground">{clientName}</span>
      )}
      {categoryName && (
        <span className="ml-2 text-xs text-muted-foreground">{categoryName}</span>
      )}
    </div>
  );
};

// Component for draggable event
interface DraggableEventProps {
  event: AppEvent;
  onClick: (event: AppEvent) => void;
}
const DraggableEvent: React.FC<DraggableEventProps> = ({ event, onClick }) => {
    const draggableId = `event-start-${event.id}`;
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: draggableId,
        data: { eventId: event.id, type: 'event-start-date' } 
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "p-1.5 rounded-md text-sm cursor-pointer border-l-4 flex items-center gap-2",
                isDragging && 'opacity-50'
            )}
            style={{
                backgroundColor: event.color ? `${event.color}25` : 'hsl(var(--muted))',
                borderLeftColor: event.color || 'hsl(var(--primary))',
            }}
            title={event.name}
            onClick={(e) => {
                e.stopPropagation();
                onClick(event);
            }}
        >
            {/* Drag handle */}
            <span
                {...listeners}
                {...attributes}
                className="cursor-grab active:cursor-grabbing"
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
                aria-label="Drag event start date"
            >
                <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="6" cy="3" r="1.5" fill="#888" />
                    <circle cx="6" cy="8" r="1.5" fill="#888" />
                    <circle cx="6" cy="13" r="1.5" fill="#888" />
                </svg>
            </span>
            {event.icon && <span className="text-base">{event.icon}</span>}
            <span className="font-medium truncate flex-1">{event.name}</span>
        </div>
    );
};

export type CalendarCellProps = {
  date: Date;
  tasks: Task[];
  events?: AppEvent[]; // Thêm prop events
  viewMode: CalendarDisplayMode;
  isSelected?: boolean;
  onTaskClick?: (task: Task) => void;
  onEventClick?: (event: AppEvent) => void; // Added
  onDateSelect?: (date: Date) => void;
  onViewAllTasks?: (date: Date, tasks: Task[]) => void;
  statusColors: Record<string, string>;
  containerRef?: React.RefObject<HTMLDivElement>;
  clients: Client[];
  categories: Category[];
  currentMonth?: number; // tháng đang xem (0-11)
  updateTask?: (updates: Partial<Task> & { id: string }) => void;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}


// Đã xóa khai báo thừa CalendarCell, chỉ giữ lại khai báo đúng bên dưới
export const CalendarCell: React.FC<CalendarCellProps> = (props: CalendarCellProps) => {
  const monthToCompare = typeof props.currentMonth === 'number' ? props.currentMonth : (new Date()).getMonth();
  const {
    date,
    tasks,
    events = [], // Nhận events
    viewMode = 'week',
    isSelected,
    onTaskClick,
    onEventClick,
    onDateSelect,
    onViewAllTasks,
    statusColors,
    containerRef,
    clients,
    categories,
    currentMonth,
    updateTask,
  } = props;
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

  const dayEvents = useMemo(() => events.filter(ev => {
    const start = new Date(ev.startTime);
    // Chỉ hiển thị event vào ngày bắt đầu
    return isSameDay(date, start);
  }), [events, date]);

  const cellRef = useRef<HTMLDivElement>(null);
  // Tạo id cho droppable cell theo dạng date-YYYY-MM-DD
  const cellId = `date-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: cellId });
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<'top' | 'bottom'>('bottom');
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  // Dialog / create task form state
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const createTaskFormRef = useRef<CreateTaskFormRef>(null);
  const { appData, handleAddTask, handleAddClientAndSelect, handleViewTask, addProject } = useDashboard();

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
    if ((tasks.length + dayEvents.length) > 0 && isOverflowing()) {
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

  const handleMouseLeave = () => {
    setShowPopover(false);
  };

  return (
    <div
      ref={node => {
        setDroppableRef(node);
        if (cellRef && typeof cellRef !== 'function') {
          try {
            (cellRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          } catch {}
        }
      }}
      className={[
        'calendar-cell p-1 border rounded-md cursor-pointer relative',
        'h-full min-h-0 flex flex-col',
        'hover:bg-muted/50 transition-colors',
        isSelected && 'ring-2 ring-primary',
        isToday && styles['calendar-today'],
        isOutsideMonth && !showPopover && styles['calendar-outside-month'],
        (tasks.length + dayEvents.length) > 0 && 'has-tasks',
        'group',
        isOver && 'ring-2 ring-blue-400 z-10'
      ].filter(Boolean).join(' ')}
      onClick={(e) => {
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
            e.preventDefault();
            e.stopPropagation();
            setShowPopover(false);
            // Open central CreateTaskForm dialog and prefill dates
            setIsTaskFormOpen(true);
            setTimeout(() => {
              try {
                createTaskFormRef.current?.setInitialValues({ dates: { from: date, to: addDays(date, 7) } });
              } catch (err) {}
            }, 50);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 4V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
      {/* Create Task Dialog used by calendar add buttons */}
      <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="sr-only">Create Task</DialogTitle>
            </DialogHeader>
            <CreateTaskForm
            ref={createTaskFormRef}
            setOpen={setIsTaskFormOpen}
            onStartSaving={() => { /* noop */ }}
            onSubmit={(values, quoteColumns, collaboratorQuoteColumns) => {
              return handleAddTask?.(values as any, quoteColumns, collaboratorQuoteColumns);
            }}
            clients={appData.clients}
            onAddClient={handleAddClientAndSelect}
            projects={appData.projects || []}
            onAddProject={(data) => addProject?.(data)}
            quoteTemplates={appData.quoteTemplates}
            collaborators={appData.collaborators}
            settings={appData.appSettings}
            categories={appData.categories}
            onDirtyChange={() => {}}
            onSubmitSuccess={(newId) => {
              setIsTaskFormOpen(false);
              if (newId) setTimeout(() => handleViewTask?.(newId), 0);
            }}
          />
        </DialogContent>
      </Dialog>
      {/* Date Number */}
      <div className="text-sm font-medium flex justify-between items-center flex-shrink-0 mb-1">
        <span className={isToday ? styles['calendar-today-number'] : 'font-bold'}>{date.getDate()}</span>
      </div>
      {/* Task & Event Cards - scrollable container */}
      <div className="flex-1 space-y-0.5 overflow-hidden calendar-task-list relative z-10">
        {/* Render Event Cards */}
        {dayEvents.map((event) => (
            <DraggableEvent
                key={`event-${event.id}`}
                event={event}
                onClick={onEventClick!}
            />
        ))}
        {/* Render Task Cards */}
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
                setIsTaskFormOpen(true);
                setTimeout(() => {
                  try { createTaskFormRef.current?.setInitialValues({ dates: { from: date, to: addDays(date, 7) } }); } catch (err) {}
                }, 50);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {/* Sửa: Hiển thị cả Events và Tasks trong Popover nếu cần */}
          {dayEvents.map((event) => (
             <DraggableEvent
                key={`popover-event-${event.id}`}
                event={event}
                onClick={onEventClick!}
              />
          ))}
          {sortedTasks.map((task: Task) => {
            const statusColor = getStatusColor(task.status);
            const clientName = clients.find((c: Client) => c.id === task.clientId)?.name;
            const categoryName = categories.find((cat: Category) => cat.id === task.categoryId)?.name;
            return (
              <PopoverTaskDraggable
                key={task.id}
                task={task}
                statusColor={statusColor}
                clientName={clientName}
                categoryName={categoryName}
                onTaskClick={onTaskClick}
                setShowPopover={setShowPopover}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

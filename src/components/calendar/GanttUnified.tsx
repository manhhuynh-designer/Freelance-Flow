import React, { useRef, useLayoutEffect, useMemo, useState, useEffect } from 'react';
import { Target, Flag, FlagOff } from 'lucide-react';
import styles from './GanttView.module.css';
import ganttStyles from './GanttUnified.module.css';
import type { Task, StatusColors, Client, Category, Quote, AppSettings, AppEvent, Collaborator, QuoteTemplate } from '@/lib/types';
import { TaskBar } from './TaskBar';
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import { TaskEditDialog } from '@/components/task-dialogs/TaskEditDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { i18n } from '@/lib/i18n';
import { EventBar } from './EventBar';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useDashboard } from '@/contexts/dashboard-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

// HELPER: Chuẩn hóa ngày tháng, loại bỏ giờ và múi giờ
function parseDateSafely(date: string | Date): Date {
    const d = new Date(date);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// Data structure cho header
interface MonthHeaderGroup {
    monthName: string;
    dayCount: number;
}

interface GanttTaskRowProps {
  task: Task;
  rowHeight: number;
  statusColors: StatusColors;
  settings: AppSettings;
  language: keyof typeof i18n;
  clients: Client[];
  categories: Category[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  collaborators: Collaborator[];
  quoteTemplates: QuoteTemplate[];
  handleDeleteTask: (taskId: string) => void;
  handleEditTask: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  handleAddClientAndSelect: (data: Omit<Client, 'id'>) => Client;
  onLocateTask: (task: Task) => void;
  isHighlighted: boolean;
}

const GanttTaskRow: React.FC<GanttTaskRowProps> = ({
    task, rowHeight, statusColors, settings, language, clients, categories, quotes,
    collaboratorQuotes, collaborators, quoteTemplates, handleDeleteTask,
    handleEditTask, handleAddClientAndSelect, onLocateTask, isHighlighted
}) => {
  const dashboard = useDashboard();
  const updateQuote = (dashboard && (dashboard.updateQuote as any)) || undefined;
  const updateTask = (dashboard && (dashboard.updateTask as any)) || undefined;

  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const T = i18n[language as 'en' | 'vi'] || i18n.en;
  const client = clients.find(c => c.id === task.clientId);
  const category = categories.find(c => c.id === task.categoryId);
  const quote = quotes.find(q => q.id === task.quoteId);
  const taskCollaboratorQuotes = collaboratorQuotes.filter(cq => task.collaboratorQuotes?.some(tcq => tcq.quoteId === cq.id));

  const handleEditClick = () => {
    setIsDetailsOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setIsDetailsOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    handleDeleteTask(task.id);
    setIsDeleteDialogOpen(false);
  };

  const eisenhowerSchemes = {
    colorScheme1: { do: '#ef4444', decide: '#3b82f6', delegate: '#f59e42', delete: '#6b7280' },
    colorScheme2: { do: '#d8b4fe', decide: '#bbf7d0', delegate: '#fed7aa', delete: '#bfdbfe' },
    colorScheme3: { do: '#99f6e4', decide: '#fbcfe8', delegate: '#fde68a', delete: '#c7d2fe' },
  };
  const quadrant = task.eisenhowerQuadrant as keyof typeof eisenhowerSchemes['colorScheme1'] | undefined;
  const scheme = settings?.eisenhowerColorScheme || 'colorScheme1';
  const flagColors = eisenhowerSchemes[scheme as keyof typeof eisenhowerSchemes] || eisenhowerSchemes['colorScheme1'];
  const flagColor = quadrant ? (flagColors[quadrant] || '#e5e7eb') : '#e5e7eb';
  
  const rowClasses = cn(
    ganttStyles['gantt-body-tasklist__row'],
    isHighlighted && ganttStyles['task-row--highlight']
  );
  
  return (
    <>
      <div
        className={rowClasses}
        style={{ height: `${rowHeight}px` }}
      >
        <span className={ganttStyles['gantt-flag-icon']}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted"
                title={(T as any)?.eisenhowerPriority || 'Eisenhower priority'}
                onClick={(e)=>e.stopPropagation()}
              >
                {quadrant ? (
                  <Flag size={16} color={flagColor} fill={flagColor} className="drop-shadow" />
                ) : (
                  <FlagOff size={16} className="text-muted-foreground" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start" onOpenAutoFocus={(e)=>e.preventDefault()}>
              <div className="grid grid-cols-2 gap-2" onClick={(e)=>e.stopPropagation()}>
                {(['do','decide','delegate','delete'] as const).map((q) => (
                  <Button
                    key={q}
                    variant={task.eisenhowerQuadrant === q ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-2 flex items-center gap-1 justify-start"
                    onClick={() => {
                      const updater = (dashboard as any)?.updateTaskEisenhowerQuadrant as (id: string, quad?: 'do'|'decide'|'delegate'|'delete') => void;
                      if (typeof updater === 'function') updater(task.id, q);
                    }}
                  >
                    <Flag className="w-3 h-3" color={flagColors[q]} fill={flagColors[q]} />
                    <span className="text-[11px] capitalize">{(T as any)?.[`quadrant_${q}`] || q}</span>
                  </Button>
                ))}
                <Button
                  variant={!task.eisenhowerQuadrant ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-2 col-span-2"
                  onClick={() => {
                    const updater = (dashboard as any)?.updateTaskEisenhowerQuadrant as (id: string, quad?: 'do'|'decide'|'delegate'|'delete') => void;
                    if (typeof updater === 'function') updater(task.id, undefined);
                  }}
                >
                  <FlagOff className="w-3 h-3" />
                  <span className="text-[11px]">{(T as any)?.clearLabel || 'Clear'}</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </span>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <span className={ganttStyles['gantt-body-tasklist__name']} style={{ fontSize: '0.95rem', lineHeight: '22px', verticalAlign: 'middle', display: 'inline-block', maxWidth: 'calc(100% - 60px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {task.name}
            </span>
          </DialogTrigger>
          <TaskDetailsDialog
            task={task} client={client} clients={clients} collaborators={collaborators} categories={categories}
            quote={quote} quotes={quotes} collaboratorQuotes={taskCollaboratorQuotes} settings={settings}
            isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} onEdit={handleEditClick} onDelete={handleDeleteClick}
            onUpdateQuote={updateQuote}
            onUpdateTask={updateTask}
          />
        </Dialog>
        
        <button onClick={() => onLocateTask(task)} title="Locate task" className={ganttStyles['gantt-body-tasklist__locate-btn']}>
          <Target size={18} strokeWidth={2} />
        </button>
      </div>

      <TaskEditDialog
        task={task} quote={quote} collaboratorQuotes={taskCollaboratorQuotes} clients={clients}
        collaborators={collaborators} categories={categories} quoteTemplates={quoteTemplates}
        settings={settings} isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditTask} onAddClient={handleAddClientAndSelect}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T.moveToTrash}?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            {T.moveToTrashDescription}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={confirmDelete}>
              {T.confirmMoveToTrash}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};


export const GanttUnified: React.FC<{
  tasks: Task[];
  events?: AppEvent[];
  rowHeight?: number;
  statusColors: StatusColors;
  settings: AppSettings;
  scale: number;
  onScaleChange: (newScale: number) => void;
  recentlyUpdatedTaskId: string | null;
  viewMode: 'day' | 'month';
  displayDate: Date;
  onViewModeChange: (mode: 'day' | 'month') => void;
  onDisplayDateChange: (date: Date) => void;
  onEventClick?: (event: AppEvent) => void;
  language: keyof typeof i18n;
  clients: Client[];
  categories: Category[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  collaborators: Collaborator[];
  quoteTemplates: QuoteTemplate[];
  handleDeleteTask: (taskId: string) => void;
  handleEditTask: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  handleAddClientAndSelect: (data: Omit<Client, 'id'>) => Client;
}> = ({
  tasks,
  events = [],
  rowHeight = 32,
  statusColors,
  settings,
  scale,
  onScaleChange,
  recentlyUpdatedTaskId,
  viewMode,
  displayDate,
  onViewModeChange,
  onDisplayDateChange,
  onEventClick,
  language,
  clients,
  categories,
  quotes,
  collaboratorQuotes,
  collaborators,
  quoteTemplates,
  handleDeleteTask,
  handleEditTask,
  handleAddClientAndSelect,
}) => {
  const dayColumnRef = useRef<HTMLDivElement>(null);
  const T = i18n[language as 'en' | 'vi'] || i18n.en;
  
  // Month/Year picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(displayDate.getFullYear());
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerButtonRef = useRef<HTMLButtonElement | null>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (pickerRef.current && pickerRef.current.contains(t)) return;
      if (pickerButtonRef.current && pickerButtonRef.current.contains(t)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  // Month names for picker
  const monthNames: string[] = [
    T.months?.january || 'January', T.months?.february || 'February',
    T.months?.march || 'March', T.months?.april || 'April', T.months?.may || 'May',
    T.months?.june || 'June', T.months?.july || 'July', T.months?.august || 'August',
    T.months?.september || 'September', T.months?.october || 'October',
    T.months?.november || 'November', T.months?.december || 'December'
  ];

  const handleOpenPicker = () => {
    setPickerYear(displayDate.getFullYear());
    setPickerOpen(!pickerOpen);
  };

  const selectMonth = (monthIndex: number) => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    onDisplayDateChange(newDate);
    setPickerOpen(false);
  };

  // DraggableDate component for timeline header navigation
  const DraggableDate = ({ 
    children, 
    dayIndex, 
    className 
  }: { 
    children: React.ReactNode; 
    dayIndex: number; 
    className?: string; 
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, initialDate: displayDate.getTime() });
    const lastUpdateRef = useRef<number>(0);

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, initialDate: displayDate.getTime() };
      lastUpdateRef.current = Date.now();
      
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const now = Date.now();
        // Throttle updates to prevent conflicts
        if (now - lastUpdateRef.current < 100) {
          return;
        }
        lastUpdateRef.current = now;
        
        const deltaX = e.clientX - dragStartRef.current.x;
        let daysDelta = 0;
        
        // Adjust sensitivity for navigation controls - slower for better control
        if (viewMode === 'day') {
          // In day view: every 20px = 1 day for finer control
          daysDelta = Math.round(deltaX / 20);
        } else {
          // In month view: every 40px = 1 month for finer control  
          daysDelta = Math.round(deltaX / 40) * 30; // Convert months to days
        }
        
        if (Math.abs(daysDelta) >= 1) {
          const newTime = dragStartRef.current.initialDate + (daysDelta * 24 * 60 * 60 * 1000);
          const newDate = new Date(newTime);
          
          onDisplayDateChange(newDate);
          
          // Update reference point for smooth dragging
          dragStartRef.current.x = e.clientX;
          dragStartRef.current.initialDate = newTime;
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <span
        className={`${className || ''} ${isDragging ? 'cursor-grabbing bg-blue-50' : 'cursor-ew-resize hover:bg-gray-50'} transition-colors select-none inline-block px-1 py-0.5 rounded`}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        title="Kéo trái/phải để thay đổi timeline"
      >
        {children}
      </span>
    );
  };
  
  const timelineStart = parseDateSafely(displayDate);
  const monthHeaderGroups: MonthHeaderGroup[] = [];
  const dayLabels: { day: string; isMonthStart: boolean }[] = [];
  let dayCount: number;

  if (viewMode === 'day') {
    dayCount = 30;
    let currentMonth = -1;
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(timelineStart);
      d.setUTCDate(d.getUTCDate() + i);
      const month = d.getUTCMonth();
      if (month !== currentMonth) {
        currentMonth = month;
        monthHeaderGroups.push({ monthName: `${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`, dayCount: 1 });
      } else {
        monthHeaderGroups[monthHeaderGroups.length - 1].dayCount++;
      }
      dayLabels.push({ day: d.getUTCDate().toString().padStart(2, '0'), isMonthStart: d.getUTCDate() === 1 });
    }
  } else {
    dayCount = 12;
    timelineStart.setUTCMonth(0, 1);
    for (let i = 0; i < dayCount; i++) {
        const d = new Date(Date.UTC(timelineStart.getUTCFullYear(), i, 1));
        dayLabels.push({ day: d.toLocaleDateString('vi-VN', { month: 'short', timeZone: 'UTC' }), isMonthStart: i === 0 });
    }
    monthHeaderGroups.push({ monthName: timelineStart.getUTCFullYear().toString(), dayCount: 12 });
  }

  useLayoutEffect(() => {
    const dayEl = dayColumnRef.current;
    if (!dayEl) return;
    const resizeObserver = new ResizeObserver(() => {
      const newWidth = dayEl.getBoundingClientRect().width;
      if (newWidth > 0 && newWidth !== scale) {
        onScaleChange(newWidth);
      }
    });
    resizeObserver.observe(dayEl);
    
    const initialWidth = dayEl.getBoundingClientRect().width;
    if (initialWidth > 0 && initialWidth !== scale) {
      onScaleChange(initialWidth);
    }
    
    return () => resizeObserver.disconnect();
  }, [viewMode, displayDate, onScaleChange, scale]);

  const gridTemplateColumnsStyle = {
    gridTemplateColumns: `repeat(${dayCount}, 1fr)`
  };
  
  const today = parseDateSafely(new Date());
  const timeDiff = today.getTime() - timelineStart.getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  const todayMarkerPosition = daysDiff * scale;

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(displayDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
    } else {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'prev' ? -1 : 1));
    }
    onDisplayDateChange(newDate);
  };
  
  const handleGoToToday = () => {
    onDisplayDateChange(new Date());
  };
  
  const handleLocateTask = (task: Task) => {
    if (!task.startDate) return;
    const taskStartDate = parseDateSafely(task.startDate);
    onDisplayDateChange(taskStartDate); 
  };

  const formattedDate = viewMode === 'day' 
    ? `Từ ${timelineStart.toLocaleDateString('vi-VN', { day:'2-digit', month: '2-digit', year:'numeric', timeZone:'UTC'})}`
    : timelineStart.getUTCFullYear().toString();

  const timelineEnd = new Date(timelineStart);
    if (viewMode === 'day') {
        timelineEnd.setUTCDate(timelineStart.getUTCDate() + dayCount);
    } else {
        timelineEnd.setUTCFullYear(timelineStart.getUTCFullYear() + 1);
    }

  const visibleEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(event => {
        if (!event.startTime || !event.endTime) return false;
        const start = parseDateSafely(event.startTime);
        const end = parseDateSafely(event.endTime);
        return start < timelineEnd && end > timelineStart;
    });
  }, [events, timelineStart, timelineEnd]);
  
  return (
    <div className={ganttStyles['gantt-unified-wrapper']}>
      <div className={ganttStyles['gantt-controls']}>
        <button
          onClick={() => onViewModeChange('day')}
          className={cn(
            ganttStyles['gantt-controls__btn'],
            viewMode === 'day' && ganttStyles['gantt-controls__btn--active']
          )}
  >{T.Day || 'Day'}</button>
        <button
          onClick={() => onViewModeChange('month')}
          className={cn(
            ganttStyles['gantt-controls__btn'],
            viewMode === 'month' && ganttStyles['gantt-controls__btn--active']
          )}
  >{T.Month || 'Month'}</button>
        <button
          onClick={handleGoToToday}
          className={ganttStyles['gantt-controls__btn']}
  >{T.todayButton || 'Today'}</button>
        <div className={ganttStyles['gantt-controls__date']}>
          <button onClick={() => handleNavigate('prev')} className={ganttStyles['gantt-controls__nav-btn']}>‹</button>
          <DraggableDate
            dayIndex={0}
            className={ganttStyles['gantt-controls__date-label']}
          >
            {formattedDate}
          </DraggableDate>
          <button onClick={() => handleNavigate('next')} className={ganttStyles['gantt-controls__nav-btn']}>›</button>
          
          {/* Month-Year Picker integrated with navigation */}
          <div className="relative ml-2">
            <button
              ref={pickerButtonRef}
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
              onClick={handleOpenPicker}
              aria-haspopup="dialog"
              aria-label="Choose month and year"
              title="Quick jump to month"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
              </svg>
              <svg
                className={`h-2.5 w-2.5 transition-transform ${pickerOpen ? 'rotate-180' : 'rotate-0'}`}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.108l3.71-3.877a.75.75 0 111.08 1.04l-4.24 4.43a.75.75 0 01-1.08 0l-4.24-4.43a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {pickerOpen && (
              <div
                ref={pickerRef}
                role="dialog"
                aria-label="Choose month and year"
                className="absolute top-full right-0 mt-1 z-50 w-72 rounded-md border border-gray-200 bg-white shadow-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    className="px-2 py-1 rounded hover:bg-gray-100 text-sm"
                    onClick={() => setPickerYear((y) => y - 1)}
                    aria-label="Previous year"
                    title="Previous year"
                  >
                    ‹
                  </button>
                  <div className="font-medium text-sm">{pickerYear}</div>
                  <button
                    type="button"
                    className="px-2 py-1 rounded hover:bg-gray-100 text-sm"
                    onClick={() => setPickerYear((y) => y + 1)}
                    aria-label="Next year"
                    title="Next year"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {monthNames.map((name, idx) => {
                    const isActive = displayDate.getFullYear() === pickerYear && displayDate.getMonth() === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`px-2 py-1.5 rounded text-xs border border-transparent hover:border-gray-200 hover:bg-gray-50 ${isActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-700'}`}
                        onClick={() => selectMonth(idx)}
                        aria-current={isActive ? 'date' : undefined}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className={ganttStyles['gantt-grid']}>
        
        {/* Row 1: Headers */}
        <div className={ganttStyles['gantt-header-tasklist']}>
             <div className={ganttStyles['gantt-header-tasklist__title-container']}>
                {T.taskNameHeader || 'Tasks'}
             </div>
        </div>
        <div className={ganttStyles['gantt-header-timeline']}>
            {viewMode === 'day' && todayMarkerPosition >= 0 && todayMarkerPosition < (dayCount * scale) && (
              <div className={ganttStyles['today-marker']} style={{ left: `${todayMarkerPosition}px` }} />
            )}
            <div
              className={ganttStyles['gantt-header-timeline__months']}
              style={gridTemplateColumnsStyle}
            >
              {monthHeaderGroups.map((group, idx) => (
                <div
                  key={idx}
                  className={ganttStyles['gantt-header-timeline__month']}
                  style={{ gridColumn: `span ${group.dayCount}`}}
                >
                  {group.monthName}
                </div>
              ))}
            </div>
            <div
              className={ganttStyles['gantt-header-timeline__days']}
              style={gridTemplateColumnsStyle}
            >
              {dayLabels.map((d, idx) => (
                <div
                  key={idx}
                  ref={idx === 0 ? dayColumnRef : null}
                  className={
                    `${ganttStyles['gantt-header-timeline__day']} ${d.isMonthStart ? ganttStyles['gantt-header-timeline__day--monthstart'] : ''}`
                  }
                >
                  {d.day}
                </div>
              ))}
            </div>
        </div>

        {/* Row 2: Task Body */}
        <div className={ganttStyles['gantt-body-tasklist']}>
          {tasks.map(task => (
            <GanttTaskRow
              key={task.id}
              task={task}
              rowHeight={rowHeight}
              settings={settings}
              language={language}
              onLocateTask={handleLocateTask}
              statusColors={statusColors}
              isHighlighted={task.id === recentlyUpdatedTaskId}
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
          ))}
        </div>
        <div className={ganttStyles['gantt-body-timeline']}>
            {viewMode === 'day' && todayMarkerPosition >= 0 && todayMarkerPosition < (dayCount * scale) && (
              <div className={ganttStyles['today-marker']} style={{ left: `${todayMarkerPosition}px` }} />
            )}
            <div
              className={ganttStyles['gantt-body-timeline__grid']}
              style={gridTemplateColumnsStyle}
            >
               {tasks.map(task => 
                 Array.from({length: dayCount}).map((_, idx) => (
                   <div
                     key={`${task.id}-${idx}`}
                     className={cn(
                        ganttStyles['gantt-body-timeline__cell'], 
                        dayLabels[idx].isMonthStart && ganttStyles['gantt-body-timeline__cell--monthstart'],
                        task.id === recentlyUpdatedTaskId && ganttStyles['task-row--highlight']
                     )}
              style={{ height: `${rowHeight}px`, fontSize: '0.92rem' }}
                   />
                 ))
               )}
            </div>
            <div className={ganttStyles['gantt-body-timeline__taskbar-layer']}>
                {tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className={cn(
                        ganttStyles['gantt-body-timeline__taskbar-row'],
                        task.id === recentlyUpdatedTaskId && ganttStyles['task-row--highlight-transparent']
                      )}
                      style={{ height: `${rowHeight}px` }}
                    >
                        <TaskBar
                            task={task}
                            dayStart={timelineStart}
                            dayCount={dayCount}
                            scale={scale}
                            viewMode={viewMode}
                            statusColors={statusColors}
                            settings={settings}
                        />
                    </div>
                ))}
            </div>
        </div>

        {/* Row 3: Event Timeline */}
        {visibleEvents.length > 0 && (
          <>
            {/* Col 1: Event section title */}
            <div className={ganttStyles['gantt-header-tasklist']} style={{ 
              position: 'sticky', 
              bottom: 0, 
              borderTop: '1px solid hsl(var(--border))', 
              alignContent: 'center',
              backgroundColor: 'hsl(var(--card))',
              zIndex: 10
            }}>
              <div className={ganttStyles['gantt-header-tasklist__title-container']}>
                {'Events'}
              </div>
            </div>

            {/* Col 2: Event timeline body */}
            <div 
              className={ganttStyles['gantt-header-timeline']} 
              style={{ 
                position: 'sticky', 
                bottom: 0,
                height: `${visibleEvents.length * 24 + 8}px`, 
                borderTop: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                zIndex: 10
              }}
            >
               {/* Event grid background */}
               <div
                 className={ganttStyles['gantt-body-timeline__grid']}
                 style={{ ...gridTemplateColumnsStyle, height: '100%' }}
               >
                 {Array.from({ length: dayCount }).map((_, idx) => (
                   <div
                     key={`event-grid-${idx}`}
                     className={cn(
                       ganttStyles['gantt-body-timeline__cell'],
                       dayLabels[idx].isMonthStart && ganttStyles['gantt-body-timeline__cell--monthstart']
                     )}
                     style={{ height: '100%' }}
                   />
                 ))}
               </div>
               {/* Event bars layer */}
               <div style={{ position: 'absolute', top: '4px', left: 0, right: 0, bottom: '4px' }}>
                 {visibleEvents.map((event, idx) => (
                    <EventBar
                        key={event.id}
                        event={event}
                        top={idx * 24}
                        dayStart={timelineStart}
                        dayCount={dayCount}
                        scale={scale}
                        viewMode={viewMode}
                        settings={settings}
                        onEventClick={onEventClick}
                    />
                 ))}
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

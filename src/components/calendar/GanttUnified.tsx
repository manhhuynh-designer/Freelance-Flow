import React, { useRef, useLayoutEffect, Dispatch, SetStateAction } from 'react';
import { Target, Flag } from 'lucide-react';
import styles from './GanttView.module.css';
import ganttStyles from './GanttUnified.module.css';
import { Task, StatusColors, Client, Category, Quote, CollaboratorQuote, AppSettings } from '@/lib/types';
import { TaskBar } from './TaskBar';
import { useDashboard } from '@/contexts/dashboard-context';
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
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

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

// =================================================================================
// Component con cho từng dòng Task trong danh sách bên trái
// =================================================================================
interface GanttTaskRowProps {
  task: Task;
  rowHeight: number;
  statusColors: StatusColors;
  settings?: AppSettings;
  onLocateTask: (task: Task) => void;
  isHighlighted: boolean;
}

const GanttTaskRow: React.FC<GanttTaskRowProps> = ({ task, rowHeight, statusColors, settings, onLocateTask, isHighlighted }) => {
  const dashboardContext = useDashboard();
  if (!dashboardContext) return null;

  const {
    clients,
    categories,
    quotes,
    collaboratorQuotes,
    appSettings,
    collaborators,
    handleDeleteTask,
    handleEditTask,
    handleAddClientAndSelect,
    quoteTemplates,
  } = dashboardContext;

  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const T = i18n[appSettings.language];
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
          <Flag size={16} color={flagColor} fill={flagColor} />
        </span>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <span className={ganttStyles['gantt-body-tasklist__name']} style={{ fontSize: '0.95rem', lineHeight: '22px', verticalAlign: 'middle', display: 'inline-block', maxWidth: 'calc(100% - 60px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {task.name}
            </span>
          </DialogTrigger>
          <TaskDetailsDialog
            task={task} client={client} clients={clients} collaborators={collaborators} categories={categories}
            quote={quote} collaboratorQuotes={taskCollaboratorQuotes} settings={appSettings}
            isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} onEdit={handleEditClick} onDelete={handleDeleteClick}
          />
        </Dialog>
        
        <button onClick={() => onLocateTask(task)} title="Locate task" className={ganttStyles['gantt-body-tasklist__locate-btn']}>
          <Target size={18} strokeWidth={2} />
        </button>
      </div>

      <TaskEditDialog
        task={task} quote={quote} collaboratorQuotes={taskCollaboratorQuotes} clients={clients}
        collaborators={collaborators} categories={categories} quoteTemplates={quoteTemplates}
        settings={appSettings} isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}
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
  rowHeight?: number;
  statusColors: StatusColors;
  settings?: AppSettings;
  scale: number;
  onScaleChange: (newScale: number) => void;
  recentlyUpdatedTaskId: string | null;
  viewMode: 'day' | 'month';
  displayDate: Date;
  onViewModeChange: (mode: 'day' | 'month') => void;
  onDisplayDateChange: (date: Date) => void;
}> = ({
  tasks,
  rowHeight = 32,
  statusColors,
  settings,
  scale,
  onScaleChange,
  recentlyUpdatedTaskId,
  viewMode,
  displayDate,
  onViewModeChange,
  onDisplayDateChange
}) => {
  const dayColumnRef = useRef<HTMLDivElement>(null);
  
  const dashboardContext = useDashboard();
  if (!dashboardContext) return null;
  const language = dashboardContext.appSettings.language as keyof typeof i18n;
  const T = i18n[language];
  
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

  return (
    <div className={ganttStyles['gantt-unified-wrapper']}>
      <div className={ganttStyles['gantt-controls']}>
        <button
          onClick={() => onViewModeChange('day')}
          className={cn(
            ganttStyles['gantt-controls__btn'],
            viewMode === 'day' && ganttStyles['gantt-controls__btn--active']
          )}
        >{T.Day}</button>
        <button
          onClick={() => onViewModeChange('month')}
          className={cn(
            ganttStyles['gantt-controls__btn'],
            viewMode === 'month' && ganttStyles['gantt-controls__btn--active']
          )}
        >{T.Month}</button>
        <button
          onClick={handleGoToToday}
          className={ganttStyles['gantt-controls__btn']}
        >{T.todayButton}</button>
        <div className={ganttStyles['gantt-controls__date']}>
          <button onClick={() => handleNavigate('prev')} className={ganttStyles['gantt-controls__nav-btn']}>‹</button>
          <span className={ganttStyles['gantt-controls__date-label']}>{formattedDate}</span>
          <button onClick={() => handleNavigate('next')} className={ganttStyles['gantt-controls__nav-btn']}>›</button>
        </div>
      </div>
      
      <div className={ganttStyles['gantt-grid']}>
        
        <div className={ganttStyles['gantt-header-tasklist']}>
             <div className={ganttStyles['gantt-header-tasklist__title-container']}>
                {T.taskNameHeader}
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

        <div className={ganttStyles['gantt-body-tasklist']}>
          {tasks.map(task => (
            <GanttTaskRow
              key={task.id}
              task={task}
              rowHeight={rowHeight}
              settings={dashboardContext.appSettings}
              onLocateTask={handleLocateTask}
              statusColors={statusColors}
              isHighlighted={task.id === recentlyUpdatedTaskId}
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
                            settings={dashboardContext.appSettings}
                        />
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

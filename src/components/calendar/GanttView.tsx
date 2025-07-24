import React, { useState, useEffect } from 'react';
import { Task, AppSettings, StatusColors, Client, Category } from '@/lib/types';
import styles from './GanttView.module.css';
import { GanttUnified } from './GanttUnified';
import { DragEndEvent, DndContext, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';

export interface GanttViewProps {
  tasks: Task[];
  clients: Client[];
  categories: Category[];
  settings: AppSettings;
  statusColors: StatusColors;
  updateTask: (task: Partial<Task> & { id: string }) => void;
  onTaskClick?: (task: Task) => void;
}

function parseDateSafely(date: string | Date): Date {
    const d = new Date(date);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

const GanttChart: React.FC<GanttViewProps> = ({ tasks, settings, updateTask, statusColors, clients, categories }) => {
  const rowHeight = 32;
  const [scale, setScale] = useState(48);
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [dragTooltip, setDragTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const [recentlyUpdatedTaskId, setRecentlyUpdatedTaskId] = useState<string | null>(null);
  
  useEffect(() => {
    if (recentlyUpdatedTaskId) {
      const timer = setTimeout(() => {
        setRecentlyUpdatedTaskId(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [recentlyUpdatedTaskId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as Task | undefined;
    if (task) {
      setDragTooltip(prev => ({ ...prev, visible: true }));
    }
  };
  
  const handleDragMove = (event: DragMoveEvent) => {
    const { active, delta } = event;
    const task = active.data.current?.task as Task | undefined;
    if (!task || !task.startDate || !task.deadline) return;

    let newStart = parseDateSafely(task.startDate);
    let newEnd = parseDateSafely(task.deadline);
    const type = active.data.current?.type;
    let dayDelta = 0;

    if (viewMode === 'day') {
        dayDelta = Math.round(delta.x / scale);
    } else { // month view
        const sectionsPerMonth = 6;
        const daysPerSection = 5; 
        const sectionWidth = scale / sectionsPerMonth;
        const movedSections = Math.round(delta.x / sectionWidth);
        dayDelta = movedSections * daysPerSection;
    }

    if (type === 'move') {
        newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
        newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
    } else if (type === 'resize-start') {
        newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
    } else if (type === 'resize-end') {
        newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
    }
    
    const mouseEvent = event.activatorEvent as MouseEvent;
    setDragTooltip({
      visible: true,
      content: `${formatDate(newStart)} - ${formatDate(newEnd)}`,
      x: mouseEvent.clientX + 15,
      y: mouseEvent.clientY + 15,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDragTooltip({ visible: false, content: '', x: 0, y: 0 });
    const { active, delta } = event;
    if (delta.x === 0 && delta.y === 0) return;

    const originalTask = active.data.current?.task as Task | undefined;
    if (!originalTask) return;
    
    const task = tasks.find((t) => t.id === originalTask.id);
    if (!task || !task.startDate || !task.deadline) return;
    
    let newStart = parseDateSafely(task.startDate);
    let newEnd = parseDateSafely(task.deadline);
    const type = active.data.current?.type;
    let dayDelta = 0;

    if (viewMode === 'day') {
        dayDelta = Math.round(delta.x / scale);
    } else { // month view
        const sectionsPerMonth = 6;
        const daysPerSection = 5;
        const sectionWidth = scale / sectionsPerMonth;
        const movedSections = Math.round(delta.x / sectionWidth);
        dayDelta = movedSections * daysPerSection;
    }

    if (dayDelta === 0) return;

    if (type === 'move') {
        newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
        newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
    } else if (type === 'resize-start') {
        newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
    } else if (type === 'resize-end') {
        newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
    }
    
    // Đảm bảo start date không vượt quá end date và ngược lại
    if (type === 'resize-start' && newStart.getTime() >= newEnd.getTime()) {
        newStart = new Date(newEnd.getTime() - 86400000); // Lùi lại 1 ngày
    }
    if (type === 'resize-end' && newEnd.getTime() <= newStart.getTime()) {
        newEnd = new Date(newStart.getTime() + 86400000); // Tiến lên 1 ngày
    }

    const hasStartChanged = newStart.getTime() !== parseDateSafely(task.startDate).getTime();
    const hasEndChanged = newEnd.getTime() !== parseDateSafely(task.deadline).getTime();

    if (hasStartChanged || hasEndChanged) {
       if (typeof updateTask === 'function') {
         updateTask({ id: task.id, startDate: newStart, deadline: newEnd });
         setRecentlyUpdatedTaskId(task.id);
       }
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
        {dragTooltip.visible && (
            <div 
                className={styles.dragPreviewTooltip}
                style={{ left: `${dragTooltip.x}px`, top: `${dragTooltip.y}px` }}
            >
                {dragTooltip.content}
            </div>
        )}
        <div className={styles.ganttContainerWrapper}>
            <div className={styles.ganttBody}>
                <GanttUnified 
                  tasks={tasks} 
                  rowHeight={rowHeight} 
                  statusColors={statusColors} 
                  settings={settings}
                  scale={scale} 
                  onScaleChange={setScale}
                  recentlyUpdatedTaskId={recentlyUpdatedTaskId}
                  viewMode={viewMode}
                  displayDate={displayDate}
                  onViewModeChange={setViewMode}
                  onDisplayDateChange={setDisplayDate}
                />
            </div>
        </div>
    </DndContext>
  );
};

export const GanttView = GanttChart;
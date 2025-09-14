"use client";

import React, { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, rectIntersection } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, AppSettings, Client, Category, Quote, QuoteTemplate, Collaborator } from '@/lib/types';
import { KanbanColumn } from './KanbanColumn';
import { i18n } from '@/lib/i18n';
import { KanbanTaskCard } from './KanbanTaskCard';
import { useSearchParams } from 'next/navigation';
import { useDashboard } from '@/contexts/dashboard-context';

interface KanbanViewProps {
  filteredTasks: Task[];
  // Drilled Props
  appSettings: AppSettings;
  handleTaskStatusChange: (taskId: string, status: Task['status'], subStatusId?: string) => void;
  reorderTasksInStatus: (statusId: string, orderedTaskIds: string[]) => void;
  updateKanbanSettings: (settings: Partial<AppSettings>) => void;
  // Optional external control for which statuses are visible (keeps in sync with global filter hook)
  selectedStatuses?: string[];
  clients: Client[];
  categories: Category[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  collaborators: Collaborator[];
  quoteTemplates: QuoteTemplate[];
  handleDeleteTask: (taskId: string) => void;
  handleEditTask: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  handleAddClientAndSelect: (data: Omit<Client, 'id'>) => Client;
}

export function KanbanView({ 
    filteredTasks, 
    appSettings, 
    handleTaskStatusChange, 
    reorderTasksInStatus,
    updateKanbanSettings,
  selectedStatuses: selectedStatusesProp,
    ...restOfDrilledProps 
}: KanbanViewProps) {
  const searchParams = useSearchParams();
  const T = i18n[appSettings.language as 'en' | 'vi'] || i18n.en;
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<any>(null);
  const dashboard = useDashboard();
  const updateQuote = (dashboard && (dashboard.updateQuote as any)) || undefined;
  const updateTask = (dashboard && (dashboard.updateTask as any)) || undefined;

  // Read the same param name used by the global filter logic ('statuses');
  // fall back to legacy 'status' if present
  const statusFilter = searchParams.get('statuses') ?? searchParams.get('status');
  // Derive default statuses from app settings to support custom sets
  const defaultStatuses = useMemo(() => {
    const ids = Array.isArray(appSettings.statusSettings) && appSettings.statusSettings.length > 0
      ? appSettings.statusSettings.map(s => s.id)
      : ['todo', 'inprogress', 'done', 'onhold', 'archived'];
    return ids;
  }, [appSettings.statusSettings]);
  
  const selectedStatusesFromUrl = useMemo(() => {
    // Keep column visibility in sync with global filters (useFilterLogic):
    // - null => all statuses visible
    // - 'none' => no statuses visible
    // - comma list => those statuses are visible
    if (statusFilter === null) return defaultStatuses;
    if (statusFilter === 'none') return [];
    return statusFilter.split(',');
  }, [statusFilter, defaultStatuses]);

  // Prefer prop from Dashboard (ground truth), fallback to URL
  const selectedStatuses = selectedStatusesProp ?? selectedStatusesFromUrl;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = useMemo(() => {
    const { kanbanColumnVisibility = {}, kanbanColumnOrder = [] } = appSettings;
    // Provide safe default statuses if not configured yet
    const TL = i18n[appSettings.language as 'en' | 'vi'] || i18n.en;
    const safeStatusSettings = (appSettings.statusSettings && Array.isArray(appSettings.statusSettings) ? appSettings.statusSettings : [
      { id: 'todo', label: TL.statuses.todo, subStatuses: [] },
      { id: 'inprogress', label: TL.statuses.inprogress, subStatuses: [] },
      { id: 'done', label: TL.statuses.done, subStatuses: [] },
      { id: 'onhold', label: TL.statuses.onhold, subStatuses: [] },
      { id: 'archived', label: TL.statuses.archived, subStatuses: [] },
    ]);
    const allColumns: { id: string; label: string; statusId: string }[] = [];

    safeStatusSettings.forEach(status => {
      if (selectedStatuses.includes(status.id)) {
        allColumns.push({ id: status.id, label: status.label, statusId: status.id });
      }
    });

    const visibleColumns = allColumns.filter(col => kanbanColumnVisibility[col.id] !== false);

    if (kanbanColumnOrder.length > 0) {
      visibleColumns.sort((a, b) => {
        const indexA = kanbanColumnOrder.indexOf(a.id);
        const indexB = kanbanColumnOrder.indexOf(b.id);
        return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
      });
    }

    return visibleColumns;
  }, [appSettings, selectedStatuses]);

  const tasksByStatus = useMemo(() => {
    const map = new Map<string, Task[]>();
    columns.forEach(col => map.set(col.id, []));

    filteredTasks.forEach(task => {
      const targetColumnId = task.status;
      if (targetColumnId && map.has(targetColumnId)) {
        const columnTasks = map.get(targetColumnId) || [];
        map.set(targetColumnId, [...columnTasks, task]);
      }
    });

    map.forEach((tasks) => {
      tasks.sort((a, b) => (a.kanbanOrder || 0) - (b.kanbanOrder || 0));
    });
    return map;
  }, [filteredTasks, columns]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'COLUMN') {
      setActiveColumn(active.data.current.column);
    } else {
      const task = filteredTasks.find(t => t.id === active.id);
      setActiveTask(task || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveColumn(null);
    if (!over) return;
    
    if (active.data.current?.type === 'COLUMN') {
      const activeColumnId = active.id.toString().replace('sortable-', '');
      const overColumnId = over.id.toString().replace('sortable-', '');
      const oldIndex = columns.findIndex(c => c.id === activeColumnId);
      const newIndex = columns.findIndex(c => c.id === overColumnId);
      if (oldIndex !== newIndex) {
        const newOrder = arrayMove(columns, oldIndex, newIndex).map(c => c.id);
        updateKanbanSettings({ kanbanColumnOrder: newOrder });
      }
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = filteredTasks.find(t => t.id === activeId);
    if (!activeTask) return;

    let currentContainerId: string = activeTask.status;
    let targetContainerId = overId;
    
    const targetTask = filteredTasks.find(t => t.id === overId);
    if (targetTask) {
      targetContainerId = targetTask.status;
    }
    else if (over.data.current?.containerId) {
       targetContainerId = over.data.current.containerId;
    }
    
    if (currentContainerId !== targetContainerId) {
      const targetColumn = columns.find(col => col.id === targetContainerId);
      if (targetColumn) {
        handleTaskStatusChange(activeId, targetColumn.statusId as any);
      }
    } 
    else {
      const columnTasks = tasksByStatus.get(currentContainerId) || [];
      const oldIndex = columnTasks.findIndex(t => t.id === activeId);
      let newIndex = oldIndex;
      if (targetTask) {
        newIndex = columnTasks.findIndex(t => t.id === overId);
      }
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
        reorderTasksInStatus(currentContainerId, newOrderedTasks.map(t => t.id));
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden min-w-0 kanban-view justify-center mx-auto">
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd} 
        collisionDetection={rectIntersection}
      >
        <div className="justify-center mx-auto flex gap-2  p-3  h-full w-full max-w-full min-h-0 min-w-0 ">
          <SortableContext items={columns.map(c => `sortable-${c.id}`)} strategy={horizontalListSortingStrategy}>
            {columns.map(col => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.label}
                tasks={tasksByStatus.get(col.id) || []}
                color={appSettings.statusColors?.[col.statusId as keyof typeof appSettings.statusColors] || '#999'}
                appSettings={appSettings}
                {...restOfDrilledProps}
              />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeTask ? <KanbanTaskCard task={activeTask} appSettings={appSettings} {...restOfDrilledProps} /> : null}
          {activeColumn ? (
            <KanbanColumn
              id={activeColumn.id}
              title={activeColumn.label}
              tasks={tasksByStatus.get(activeColumn.id) || []}
              color={appSettings.statusColors?.[activeColumn.statusId as keyof typeof appSettings.statusColors] || '#999'}
              appSettings={appSettings}
              {...restOfDrilledProps}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
"use client";

import React, { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, rectIntersection } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Task } from '@/lib/types';
import { KanbanColumn } from './KanbanColumn';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';
import { KanbanTaskCard } from './KanbanTaskCard';
import { KanbanSettings } from './KanbanSettings';
import { useSearchParams } from 'next/navigation';

interface KanbanViewProps {
  filteredTasks: Task[];
}

export function KanbanView({ filteredTasks }: KanbanViewProps) {
  const dashboardContext = useDashboard();
  const searchParams = useSearchParams();
  if (!dashboardContext) return null;

  const { appSettings, handleTaskStatusChange, reorderTasksInStatus, updateKanbanSettings } = dashboardContext;
  const T = i18n[appSettings.language];
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<any>(null);

  // Get filtered statuses from URL
  const statusFilter = searchParams.get('status');
  const defaultStatuses = useMemo(() => 
    ['todo', 'inprogress', 'done', 'onhold', 'archived'], 
  []);
  
  const selectedStatuses = useMemo(() => {
    if (statusFilter === null) return defaultStatuses;
    if (statusFilter === 'none') return [];
    return statusFilter.split(',');
  }, [statusFilter, defaultStatuses]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Reduced distance for better responsiveness
      },
    })
  );

  const columns = useMemo(() => {
    const { statusSettings, kanbanColumnVisibility = {}, kanbanColumnOrder = [] } = appSettings;
    const allColumns: { id: string; label: string; statusId: string }[] = [];

    statusSettings.forEach(status => {
      // Only include status if it's in the selected statuses from filter
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
    columns.forEach(col => map.set(col.id, [])); // Initialize map with all visible columns

    filteredTasks.forEach(task => {
      // Always use main status for column assignment
      const targetColumnId = task.status;

      if (targetColumnId && map.has(targetColumnId)) {
        const columnTasks = map.get(targetColumnId) || [];
        map.set(targetColumnId, [...columnTasks, task]);
      }
    });

    // Sort tasks within each column by kanbanOrder
    map.forEach((tasks, columnId) => {
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

    // Debug logging
    console.log('🔍 Drag Debug:', {
      activeId: active.id,
      overId: over.id,
      overData: over.data.current,
      availableColumns: columns.map(c => c.id)
    });

    // Handle column reordering
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

    // Determine current container ID
    let currentContainerId: string = activeTask.status;
    if (appSettings.kanbanSubStatusMode === 'separate' && activeTask.subStatusId) {
      currentContainerId = `${activeTask.status}_${activeTask.subStatusId}`;
    }

    // Determine target container ID
    let targetContainerId = overId;
    
    // If dropped on a task, get its container
    const targetTask = filteredTasks.find(t => t.id === overId);
    if (targetTask) {
      targetContainerId = targetTask.status;
      if (appSettings.kanbanSubStatusMode === 'separate' && targetTask.subStatusId) {
        targetContainerId = `${targetTask.status}_${targetTask.subStatusId}`;
      }
      console.log('📝 Dropped on task:', targetTask.name, 'in column:', targetContainerId);
    }
    // If dropped directly on a column (most common case for empty columns)
    else if (columns.find(col => col.id === overId)) {
      targetContainerId = overId;
      console.log('📂 Dropped directly on column:', targetContainerId);
    }
    // Handle droppable areas within columns
    else if (over.data.current?.containerId) {
      targetContainerId = over.data.current.containerId;
      console.log('🎯 Dropped on droppable area for column:', targetContainerId);
    }
    // Fallback: check if overId matches any column id
    else {
      const matchingColumn = columns.find(col => col.id === overId);
      if (matchingColumn) {
        targetContainerId = matchingColumn.id;
        console.log('🔄 Fallback matched column:', targetContainerId);
      } else {
        console.log('❌ No target found for overId:', overId);
      }
    }

    // Handle status change (moving between columns)
    if (currentContainerId !== targetContainerId) {
      const targetColumn = columns.find(col => col.id === targetContainerId);
      if (targetColumn) {
        const newStatus = targetColumn.statusId;
        // Always use main status, no sub-status handling
        handleTaskStatusChange(activeId, newStatus as any, undefined);
      }
    } 
    // Handle reordering within the same column
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
                color={appSettings.statusColors[col.statusId as keyof typeof appSettings.statusColors]}
              />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeTask ? <KanbanTaskCard task={activeTask} /> : null}
          {activeColumn ? (
            <KanbanColumn
              id={activeColumn.id}
              title={activeColumn.label}
              tasks={tasksByStatus.get(activeColumn.id) || []}
              color={appSettings.statusColors[activeColumn.statusId as keyof typeof appSettings.statusColors]}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
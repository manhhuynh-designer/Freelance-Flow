"use client";

import React from 'react';
import { DndContext, DragEndEvent, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent, pointerWithin } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDashboard } from '@/contexts/dashboard-context';
import { Task } from '@/lib/types';
import { EisenhowerQuadrant } from './EisenhowerQuadrant';
import { CompactTaskCard } from './CompactTaskCard';
import { UncategorizedTasksList } from './UncategorizedTasksList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { i18n } from '@/lib/i18n';

export type EisenhowerQuadrantType = 'do' | 'decide' | 'delegate' | 'delete';

interface EisenhowerViewProps {
  filteredTasks?: Task[];
  sortedTasksForUncategorized?: Task[];
}

export function EisenhowerView({ filteredTasks, sortedTasksForUncategorized }: EisenhowerViewProps = {}) {
  const dashboardContext = useDashboard(); // Lấy toàn bộ context
  if (!dashboardContext) {
    // Xử lý trường hợp context chưa sẵn sàng, ví dụ: hiển thị skeleton hoặc null
    return null; // Hoặc một loading spinner
  }
  const { tasks: allTasks, updateTask, updateTaskEisenhowerQuadrant, reorderTasksInQuadrant, settings, language } = dashboardContext;
  const T = i18n[language];
  const { toast } = useToast();

  // Use filtered tasks if provided, otherwise use all tasks
  const tasks = filteredTasks || allTasks;
  const uncategorizedTasksSource = sortedTasksForUncategorized || filteredTasks || allTasks;

  // Configure sensors for better touch and mouse interaction
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2, // Reduced to 2px for much easier dragging
      },
    })
  );

  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const quadrants: EisenhowerQuadrantType[] = ['do', 'decide', 'delegate', 'delete'];

  const categorizedTasks = React.useMemo(() => {
    const map = new Map<EisenhowerQuadrantType, Task[]>();
    quadrants.forEach(q => map.set(q, []));
    
    // Use different sources for matrix (tasks) and uncategorized (uncategorizedTasksSource)
    const uncategorized: Task[] = uncategorizedTasksSource.filter(task => 
      !task.eisenhowerQuadrant || !quadrants.includes(task.eisenhowerQuadrant as EisenhowerQuadrantType)
    );

    // Keep the order as it appears in the main tasks array for matrix
    map.forEach((taskList, quadrantType) => {
      const orderedTasks = tasks.filter(task => task.eisenhowerQuadrant === quadrantType);
      map.set(quadrantType, orderedTasks);
    });

    return { categorized: map, uncategorized };
  }, [tasks, uncategorizedTasksSource, quadrants]);

  const handleDragStart = (event: any) => {
    const draggedTask = allTasks.find(task => task.id === event.active.id); // Use allTasks instead of tasks
    setActiveTask(draggedTask || null);
    console.log('Drag start:', { 
      taskId: event.active.id, 
      containerId: event.active.data.current?.sortable?.containerId,
      task: draggedTask?.name 
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const draggedTaskId = active.id as string;
    const draggedTask = allTasks.find((task: Task) => task.id === draggedTaskId); // Use allTasks
    if (!draggedTask) return;

    console.log('Drag end:', { 
      draggedTaskId, 
      overId: over.id, 
      activeData: active.data.current,
      overData: over.data.current 
    });

    // Determine the container where the task is being dropped
    let droppedContainerId = over.id as EisenhowerQuadrantType | 'uncategorized';
    
    // If dropping on a task, get the container of that task
    if (over.data.current?.sortable?.containerId) {
      droppedContainerId = over.data.current.sortable.containerId;
    }

    const originalContainerId = active.data.current?.sortable?.containerId || 
      (draggedTask.eisenhowerQuadrant || 'uncategorized');

    // Handle reordering within the same quadrant/container
    if (originalContainerId === droppedContainerId) {
      const currentQuadrantTasks = (droppedContainerId === 'uncategorized' ? 
        categorizedTasks.uncategorized : 
        categorizedTasks.categorized.get(droppedContainerId as EisenhowerQuadrantType)) || [];
      
      const oldIndex = currentQuadrantTasks.findIndex(task => task.id === draggedTaskId);
      let newIndex = oldIndex;
      
      // If dropped on another task, find its index
      if (over.data.current?.sortable && over.id !== draggedTaskId) {
        newIndex = currentQuadrantTasks.findIndex(task => task.id === over.id);
      }
      
      console.log('Manual sorting:', { droppedContainerId, oldIndex, newIndex, draggedTaskId, overId: over.id });
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(currentQuadrantTasks, oldIndex, newIndex);
        console.log('Reordering:', newOrder.map(t => t.name));
        reorderTasksInQuadrant(droppedContainerId, newOrder.map(task => task.id));
      }
      setActiveTask(null);
      return;
    }

    // Handle moving between quadrants or to/from uncategorized
    let newQuadrant: EisenhowerQuadrantType | undefined = undefined;
    if (droppedContainerId !== 'uncategorized') {
      newQuadrant = droppedContainerId;
    }

    // Check task limit for the target quadrant
    const maxTasksPerQuadrant = settings.eisenhowerMaxTasksPerQuadrant || 10;

    if (newQuadrant && (categorizedTasks.categorized.get(newQuadrant) || []).length >= maxTasksPerQuadrant && draggedTask.eisenhowerQuadrant !== newQuadrant) {
      console.warn(`Quadrant ${newQuadrant} is full. Cannot add more than ${maxTasksPerQuadrant} tasks.`);
      toast({ 
        title: T.quadrantFull, 
        description: T.quadrantFullDesc.replace('{count}', maxTasksPerQuadrant.toString()),
        variant: 'destructive'
      });
      setActiveTask(null);
      return;
    }

    updateTaskEisenhowerQuadrant(draggedTask.id, newQuadrant);
    setActiveTask(null);
  };

  const handleClearQuadrant = (taskId: string) => {
    const taskToClear = tasks.find((task: Task) => task.id === taskId); // Explicitly type task
    if (taskToClear) {
      updateTaskEisenhowerQuadrant(taskToClear.id, undefined);
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd} 
      collisionDetection={closestCenter}
    >
      <div className="p-4 h-full flex flex-col max-w-full overflow-hidden">
        {/* Main layout: Matrix on left, Task list on right */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* Matrix Grid - Left side */}
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Header Labels */}
            <div className="grid grid-cols-2 gap-4 mb-2 flex-shrink-0">
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">URGENT</h2>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">NOT URGENT</h2>
              </div>
            </div>
            
            {/* Matrix with side labels */}
            <div className="flex-1 flex min-h-0">
              <div className="flex flex-col justify-center mr-2 space-y-4 w-8 flex-shrink-0">
                <div className="flex items-center justify-center h-full">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide transform -rotate-90 whitespace-nowrap">IMPORTANT</h2>
                </div>
                <div className="flex items-center justify-center h-full">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide transform -rotate-90 whitespace-nowrap">NOT IMPORTANT</h2>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-4 h-full min-h-0">
                {quadrants.map(quadrantType => (
                  <EisenhowerQuadrant
                    key={quadrantType}
                    id={quadrantType}
                    title={T.quadrants[quadrantType].title}
                    description={T.quadrants[quadrantType].description}
                    tasks={categorizedTasks.categorized.get(quadrantType) || []}
                    onClearQuadrant={handleClearQuadrant}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Uncategorized Tasks List - Right side */}
          <div className="w-full lg:w-80 lg:flex-shrink-0 h-full lg:h-auto">
            <UncategorizedTasksList
              tasks={categorizedTasks.uncategorized}
              title={T.uncategorizedTasks.title}
              emptyMessage={T.uncategorizedTasks.empty}
              onClearQuadrant={handleClearQuadrant}
            />
          </div>
        </div>
      </div>
      
      {/* Drag Overlay for smooth animations */}
      <DragOverlay>
        {activeTask ? (
          <CompactTaskCard 
            task={activeTask} 
            onClearQuadrant={handleClearQuadrant}
            variant="matrix"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
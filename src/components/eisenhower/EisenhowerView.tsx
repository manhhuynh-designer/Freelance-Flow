"use client";

import React from 'react';
import { DndContext, DragEndEvent, closestCenter, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { Task, AppSettings, Client, Collaborator, Category, Quote, QuoteTemplate } from '@/lib/types';
import { i18n } from '@/lib/i18n';
import { EisenhowerQuadrant } from './EisenhowerQuadrant';
import { CompactTaskCard } from './CompactTaskCard';
import { UncategorizedTasksList } from './UncategorizedTasksList';
import { useToast } from '@/hooks/use-toast';
import styles from './EisenhowerQuadrant.module.css';

export type EisenhowerQuadrantType = 'do' | 'decide' | 'delegate' | 'delete';

interface EisenhowerViewProps {
  filteredTasks: Task[];
  sortedTasksForUncategorized: Task[];
  allTasks: Task[];
  T: any;
  settings: AppSettings;
  updateTaskEisenhowerQuadrant: (taskId: string, quadrant?: EisenhowerQuadrantType) => void;
  reorderTasksInQuadrant: (quadrant: EisenhowerQuadrantType | "uncategorized", orderedTaskIds: string[]) => void;
  // Props for drilling
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  quoteTemplates: QuoteTemplate[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  handleEditTask: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  handleDeleteTask: (taskId: string) => void;
}

export function EisenhowerView({ 
    filteredTasks, 
    sortedTasksForUncategorized,
    allTasks,
    T,
    settings,
    updateTaskEisenhowerQuadrant,
    reorderTasksInQuadrant,
    clients,
    collaborators,
    categories,
    quoteTemplates,
    quotes,
    collaboratorQuotes,
    handleEditTask,
    handleDeleteTask,
}: EisenhowerViewProps) {
  const { toast } = useToast();

  // Safe i18n fallback
  const TL = (T && (T as any)) || i18n.en;

  const tasks = filteredTasks;
  const uncategorizedTasksSource = sortedTasksForUncategorized;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2,
      },
    })
  );

  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const quadrants: EisenhowerQuadrantType[] = ['do', 'decide', 'delegate', 'delete'];

  const categorizedTasks = React.useMemo(() => {
    const map = new Map<EisenhowerQuadrantType, Task[]>();
    quadrants.forEach(q => map.set(q, []));
    
    const uncategorized: Task[] = uncategorizedTasksSource.filter(task => 
      !task.eisenhowerQuadrant || !quadrants.includes(task.eisenhowerQuadrant as EisenhowerQuadrantType)
    );

    map.forEach((taskList, quadrantType) => {
      const orderedTasks = tasks.filter(task => task.eisenhowerQuadrant === quadrantType);
      map.set(quadrantType, orderedTasks);
    });

    return { categorized: map, uncategorized };
  }, [tasks, uncategorizedTasksSource, quadrants]);

  const handleDragStart = (event: DragStartEvent) => {
    const draggedTask = allTasks.find(task => task.id === event.active.id);
    setActiveTask(draggedTask || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedTaskId = active.id as string;
    const draggedTask = allTasks.find((task: Task) => task.id === draggedTaskId);
    if (!draggedTask) return;

    let droppedContainerId = over.id as EisenhowerQuadrantType | 'uncategorized';
    if (over.data.current?.sortable?.containerId) {
      droppedContainerId = over.data.current.sortable.containerId;
    }

    const originalContainerId = active.data.current?.sortable?.containerId || (draggedTask.eisenhowerQuadrant || 'uncategorized');

    if (originalContainerId === droppedContainerId) {
      const currentQuadrantTasks = (droppedContainerId === 'uncategorized' ? 
        categorizedTasks.uncategorized : 
        categorizedTasks.categorized.get(droppedContainerId as EisenhowerQuadrantType)) || [];
      
      const oldIndex = currentQuadrantTasks.findIndex(task => task.id === draggedTaskId);
      let newIndex = oldIndex;
      
      if (over.data.current?.sortable && over.id !== draggedTaskId) {
        newIndex = currentQuadrantTasks.findIndex(task => task.id === over.id);
      }
      
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(currentQuadrantTasks, oldIndex, newIndex);
        reorderTasksInQuadrant(droppedContainerId, newOrder.map(task => task.id));
      }
      setActiveTask(null);
      return;
    }

    let newQuadrant: EisenhowerQuadrantType | undefined = undefined;
    if (droppedContainerId !== 'uncategorized') {
      newQuadrant = droppedContainerId;
    }

    const maxTasksPerQuadrant = settings.eisenhowerMaxTasksPerQuadrant || 10;
    if (newQuadrant && (categorizedTasks.categorized.get(newQuadrant) || []).length >= maxTasksPerQuadrant && draggedTask.eisenhowerQuadrant !== newQuadrant) {
      toast({ 
        title: TL.quadrantFull || 'Quadrant full', 
        description: (TL.quadrantFullDesc || 'This quadrant already has {count} tasks.').replace('{count}', maxTasksPerQuadrant.toString()),
        variant: 'destructive'
      });
      setActiveTask(null);
      return;
    }

    updateTaskEisenhowerQuadrant(draggedTask.id, newQuadrant);
    setActiveTask(null);
  };

  const handleClearQuadrant = (taskId: string) => {
    const taskToClear = tasks.find((task: Task) => task.id === taskId);
    if (taskToClear) {
      updateTaskEisenhowerQuadrant(taskToClear.id, undefined);
    }
  };

  const colorScheme = settings?.eisenhowerColorScheme || 'colorScheme1';
  
  const getQuadrantColors = (quadrantId: string) => {
    switch (quadrantId) {
      case 'do': return styles.quadrantDo;
      case 'decide': return styles.quadrantDecide;
      case 'delegate': return styles.quadrantDelegate;
      case 'delete': return styles.quadrantDelete;
      default: return '';
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
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          <div className="flex-1 flex flex-col h-full min-h-0">
            <div className="grid grid-cols-2 gap-4 flex-shrink-0">
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">URGENT</h2>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground uppercase tracking-wide">NOT URGENT</h2>
              </div>
            </div>
            
            <div className="flex-1 flex min-h-0">
              <div className="flex flex-col justify-center mr-2 space-y-4 w-8 flex-shrink-0">
                <div className="flex items-center justify-center h-full">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide transform -rotate-90 whitespace-nowrap">IMPORTANT</h2>
                </div>
                <div className="flex items-center justify-center h-full">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide transform -rotate-90 whitespace-nowrap">NOT IMPORTANT</h2>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-4">
                {quadrants.map((quadrantType) => (
                  <div key={quadrantType} className={`min-h-0 ${styles[colorScheme]}`}>
                    <div className="min-h-0 h-full">
                      <EisenhowerQuadrant
                        id={quadrantType}
                        title={(TL?.quadrants?.[quadrantType]?.title) || quadrantType.toUpperCase()}
                        description={(TL?.quadrants?.[quadrantType]?.description) || ''}
                        tasks={categorizedTasks.categorized.get(quadrantType) || []}
                        onClearQuadrant={handleClearQuadrant}
                        className={getQuadrantColors(quadrantType)}
                        settings={settings}
                        clients={clients}
                        collaborators={collaborators}
                        categories={categories}
                        quoteTemplates={quoteTemplates}
                        quotes={quotes}
                        collaboratorQuotes={collaboratorQuotes}
                        handleEditTask={handleEditTask}
                        handleDeleteTask={handleDeleteTask}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-80 lg:flex-shrink-0 h-full lg:h-auto ">
            <UncategorizedTasksList
              tasks={categorizedTasks.uncategorized}
              title={(TL?.uncategorizedTasks?.title) || 'Uncategorized Tasks'}
              emptyMessage={(TL?.uncategorizedTasks?.empty) || 'No uncategorized tasks found.'}
              onClearQuadrant={handleClearQuadrant}
              T={TL}
              settings={settings}
              clients={clients}
              collaborators={collaborators}
              categories={categories}
              quoteTemplates={quoteTemplates}
              quotes={quotes}
              collaboratorQuotes={collaboratorQuotes}
              handleEditTask={handleEditTask}
              handleDeleteTask={handleDeleteTask}
            />
          </div>
        </div>
      </div>
      
      <DragOverlay>
        {activeTask ? (
          <CompactTaskCard 
            task={activeTask} 
            onClearQuadrant={handleClearQuadrant}
            variant="matrix"
            settings={settings}
            clients={clients}
            collaborators={collaborators}
            categories={categories}
            quoteTemplates={quoteTemplates}
            quotes={quotes}
            collaboratorQuotes={collaboratorQuotes}
            handleEditTask={handleEditTask}
            handleDeleteTask={handleDeleteTask}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
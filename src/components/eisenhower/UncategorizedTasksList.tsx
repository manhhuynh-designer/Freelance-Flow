"use client";

import React, { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import type { Task, AppSettings, Client, Collaborator, Category, Quote, QuoteTemplate } from '@/lib/types';
import { CompactTaskCard } from './CompactTaskCard';
import { Button } from '@/components/ui/button';

interface UncategorizedTasksListProps {
  tasks: Task[];
  title: string;
  emptyMessage: string;
  onClearQuadrant: (taskId: string) => void;
  // Props for drilling down to CompactTaskCard
  T: any;
  settings: AppSettings;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  quoteTemplates: QuoteTemplate[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  handleEditTask: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  handleDeleteTask: (taskId: string) => void;
}

export function UncategorizedTasksList({ 
  tasks, 
  title, 
  emptyMessage, 
  onClearQuadrant,
  T,
  settings,
  clients,
  collaborators,
  categories,
  quoteTemplates,
  quotes,
  collaboratorQuotes,
  handleEditTask,
  handleDeleteTask
}: UncategorizedTasksListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { setNodeRef, isOver } = useDroppable({
    id: 'uncategorized',
    data: {
      type: 'quadrant',
      accepts: ['task'],
      id: 'uncategorized'
    }
  });

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    
    const query = searchQuery.toLowerCase().trim();
    return tasks.filter(task => 
      task.name.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      false
    );
  }, [tasks, searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <Card className={`h-full flex flex-col bg-muted/10 border-dashed border-2 transition-all duration-200 ${isOver ? 'border-primary bg-primary/5 scale-102' : 'border-muted-foreground/20'}`}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
          {title}
          <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full font-normal">
            {filteredTasks.length}{tasks.length !== filteredTasks.length && `/${tasks.length}`}
          </span>
        </CardTitle>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={T.searchTasks}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 overflow-hidden p-3" ref={setNodeRef}>
        {filteredTasks.length === 0 ? (
          <div className={`h-full flex items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 min-h-32 ${isOver ? 'border-primary bg-primary/5 text-primary' : 'border-muted-foreground/20'}`}>
            <div className="text-center">
              {searchQuery ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">{T.noTasksFound}</p>
                  <p className="text-xs text-muted-foreground">{T.forKeyword} "{searchQuery}"</p>
                  <Button variant="ghost" size="sm" onClick={clearSearch} className="mt-2">
                    <X className="h-3 w-3 mr-1" />
                    {T.clearSearch}
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{emptyMessage}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 h-full overflow-y-auto pr-2">
            <SortableContext items={filteredTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              {filteredTasks.map(task => (
                <div key={task.id} className="w-full">
                  <CompactTaskCard 
                    task={task} 
                    onClearQuadrant={onClearQuadrant}
                    variant="uncategorized"
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
              ))}
            </SortableContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Task } from '@/lib/types';

interface SearchCommandProps {
  tasks: Task[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTaskSelect: (task: Task) => void;
}

export function SearchCommand({ tasks, isOpen, onOpenChange, onTaskSelect }: SearchCommandProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const filteredTasks = query
    ? tasks.filter(task => !task.deletedAt && task.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleSelect = (task: Task) => {
    onTaskSelect(task);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 top-1/3" hideCloseButton>
        <DialogTitle className="sr-only">Search Tasks</DialogTitle>
        <div className="p-4 border-b">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               placeholder="Search for any task..."
               className="pl-9"
               autoFocus
             />
           </div>
        </div>
        <div className="p-2 max-h-[400px] overflow-y-auto">
          {query.length > 0 && filteredTasks.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No tasks found.</p>
          )}
          {query.length === 0 && (
             <p className="py-6 text-center text-sm text-muted-foreground">Start typing to search for a task.</p>
          )}
          <div className="space-y-1">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                onClick={() => handleSelect(task)}
                className="p-2 rounded-sm cursor-pointer hover:bg-accent text-accent-foreground"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelect(task);
                  }
                }}
              >
                <p className="text-sm font-medium">{task.name}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
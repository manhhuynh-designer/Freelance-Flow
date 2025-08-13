'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  History, 
  Undo, 
  Redo, 
  Trash2, 
  Plus, 
  Edit, 
  RotateCcw,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionBufferEntry, UseActionBufferReturn } from '@/hooks/useActionBuffer';

interface ActionHistoryProps {
  actionBuffer: UseActionBufferReturn;
  onUndo?: (entry: ActionBufferEntry) => Promise<void>;
  onRedo?: (entry: ActionBufferEntry) => Promise<void>;
}

export function ActionHistory({ actionBuffer, onUndo, onRedo }: ActionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      'create': Plus,
      'edit': Edit,
      'delete': Trash2,
      'statusChange': RotateCcw,
    };
    const IconComponent = iconMap[action] || AlertCircle;
    return <IconComponent className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      'create': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'edit': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'delete': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'statusChange': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return colorMap[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUndo = async () => {
    const undoneEntry = await actionBuffer.undoAction();
    if (undoneEntry && onUndo) {
      await onUndo(undoneEntry);
    }
  };

  const handleRedo = async () => {
    const redoneEntry = await actionBuffer.redoAction();
    if (redoneEntry && onRedo) {
      await onRedo(redoneEntry);
    }
  };

  return (
    <>
      {/* Inline Undo/Redo Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUndo}
          disabled={!actionBuffer.canUndo}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Undo last action (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRedo}
          disabled={!actionBuffer.canRedo}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Redo last action (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>

        {/* History Sheet Trigger */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="View action history"
            >
              <History className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Action History
              </SheetTitle>
              <SheetDescription>
                View and manage recent actions. You can undo/redo from here.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={!actionBuffer.canUndo}
                  className="flex items-center gap-2"
                >
                  <Undo className="w-4 h-4" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={!actionBuffer.canRedo}
                  className="flex items-center gap-2"
                >
                  <Redo className="w-4 h-4" />
                  Redo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={actionBuffer.clearHistory}
                  disabled={actionBuffer.actionHistory.length === 0}
                  className="flex items-center gap-2 ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </div>

              {/* History List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {actionBuffer.getActionHistory().length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Clock className="w-8 h-8 mx-auto mb-2" />
                      <p>No actions recorded yet</p>
                    </div>
                  ) : (
                    actionBuffer.getActionHistory().map((entry, index) => (
                      <div
                        key={entry.id}
                        className={cn(
                          "p-3 rounded-lg border border-border/50 bg-card",
                          index === 0 && "ring-2 ring-primary/20" // Highlight most recent
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "rounded-full p-1.5",
                            getActionColor(entry.action)
                          )}>
                            {getActionIcon(entry.action)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {entry.entityType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(entry.timestamp)}
                              </span>
                            </div>
                            
                            <p className="text-sm font-medium mb-1">
                              {entry.description}
                            </p>
                            
                            {entry.canUndo && index === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Can Undo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

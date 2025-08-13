'use client';

import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

export interface ActionBufferEntry {
  id: string;
  timestamp: Date;
  action: 'create' | 'edit' | 'delete' | 'statusChange' | 'reorder' | 'restore' | 'settings';
  entityType: 'task' | 'client' | 'collaborator' | 'quote' | 'category' | 'event' | 'template' | 'settings';
  entityId: string;
  previousData?: any;
  newData?: any;
  description: string;
  canUndo: boolean;
}

export interface UseActionBufferReturn {
  actionHistory: ActionBufferEntry[];
  canUndo: boolean;
  canRedo: boolean;
  pushAction: (entry: Omit<ActionBufferEntry, 'id' | 'timestamp'>) => void;
  undoAction: () => Promise<ActionBufferEntry | null>;
  redoAction: () => Promise<ActionBufferEntry | null>;
  clearHistory: () => void;
  getActionHistory: () => ActionBufferEntry[];
}

export function useActionBuffer(): UseActionBufferReturn {
  const [actionHistory, setActionHistory] = useState<ActionBufferEntry[]>([]);
  const [redoStack, setRedoStack] = useState<ActionBufferEntry[]>([]);

  const pushAction = useCallback((entry: Omit<ActionBufferEntry, 'id' | 'timestamp'>) => {
    const fullEntry: ActionBufferEntry = {
      ...entry,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setActionHistory(prev => [...prev.slice(-49), fullEntry]); // Keep last 50 actions
    setRedoStack([]); // Clear redo stack when new action is performed
    
    console.log('Action pushed to buffer:', fullEntry);
  }, []);

  const undoAction = useCallback(async (): Promise<ActionBufferEntry | null> => {
    const lastAction = actionHistory[actionHistory.length - 1];
    
    if (!lastAction || !lastAction.canUndo) {
      toast({
        title: "Cannot Undo",
        description: "No undoable actions available.",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Move action to redo stack
      setRedoStack(prev => [...prev, lastAction]);
      setActionHistory(prev => prev.slice(0, -1));

      toast({
        title: "Action Undone",
        description: `Undid: ${lastAction.description}`,
      });

      return lastAction;
    } catch (error) {
      console.error('Undo error:', error);
      toast({
        title: "Undo Failed",
        description: "Failed to undo the last action.",
        variant: "destructive"
      });
      return null;
    }
  }, [actionHistory]);

  const redoAction = useCallback(async (): Promise<ActionBufferEntry | null> => {
    const lastUndoAction = redoStack[redoStack.length - 1];
    
    if (!lastUndoAction) {
      toast({
        title: "Cannot Redo",
        description: "No redoable actions available.",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Move action back to history
      setActionHistory(prev => [...prev, lastUndoAction]);
      setRedoStack(prev => prev.slice(0, -1));

      toast({
        title: "Action Redone",
        description: `Redid: ${lastUndoAction.description}`,
      });

      return lastUndoAction;
    } catch (error) {
      console.error('Redo error:', error);
      toast({
        title: "Redo Failed",
        description: "Failed to redo the action.",
        variant: "destructive"
      });
      return null;
    }
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setActionHistory([]);
    setRedoStack([]);
    toast({
      title: "History Cleared",
      description: "Action history has been cleared.",
    });
  }, []);

  const getActionHistory = useCallback(() => {
    return [...actionHistory].reverse(); // Most recent first
  }, [actionHistory]);

  return {
    actionHistory,
    canUndo: actionHistory.length > 0 && actionHistory[actionHistory.length - 1]?.canUndo,
    canRedo: redoStack.length > 0,
    pushAction,
    undoAction,
    redoAction,
    clearHistory,
    getActionHistory
  };
}

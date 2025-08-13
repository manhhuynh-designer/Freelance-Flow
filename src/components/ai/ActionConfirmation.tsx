'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Trash2, Edit, Plus } from 'lucide-react';
import type { InteractiveElement } from '@/lib/ai-types';

interface ActionConfirmationProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  action: InteractiveElement | null;
  actionData?: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActionConfirmation({
  isOpen,
  onOpenChange,
  action,
  actionData,
  onConfirm,
  onCancel
}: ActionConfirmationProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Action confirmation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (actionType: string) => {
    const iconMap: Record<string, any> = {
      'createTask': Plus,
      'editTask': Edit,
      'deleteTask': Trash2,
      'createQuote': Plus,
      'updateStatus': Edit,
    };
    const IconComponent = iconMap[actionType] || Info;
    return <IconComponent className="w-5 h-5" />;
  };

  const getActionVariant = (actionType: string): 'default' | 'destructive' => {
    const destructiveActions = ['deleteTask', 'deleteClient', 'removeCollaborator'];
    return destructiveActions.includes(actionType) ? 'destructive' : 'default';
  };

  const getConfirmationMessage = () => {
    if (!action) return { title: 'Confirm Action', description: 'Are you sure you want to proceed?' };

    switch (action.action) {
      case 'createTask':
        return {
          title: 'Create New Task',
          description: actionData?.title 
            ? `Create task: "${actionData.title}"?`
            : 'Create a new task with the provided information?'
        };
      
      case 'editTask':
        return {
          title: 'Edit Task',
          description: actionData?.title 
            ? `Edit task: "${actionData.title}"?`
            : 'Update the task with new information?'
        };
      
      case 'deleteTask':
        return {
          title: 'Delete Task',
          description: actionData?.title 
            ? `Permanently delete task: "${actionData.title}"?`
            : 'Permanently delete this task? This action cannot be undone.'
        };
      
      case 'createQuote':
        return {
          title: 'Create Quote',
          description: actionData?.clientName 
            ? `Create quote for client: "${actionData.clientName}"?`
            : 'Create a new quote with the provided information?'
        };
      
      case 'updateStatus':
        return {
          title: 'Update Status',
          description: actionData?.status 
            ? `Change status to: "${actionData.status}"?`
            : 'Update the status with new information?'
        };
      
      default:
        return {
          title: action.label || 'Confirm Action',
          description: 'Are you sure you want to proceed with this action?'
        };
    }
  };

  const { title, description } = getConfirmationMessage();
  const variant = getActionVariant(action?.action || '');

  if (!action) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${
              variant === 'destructive' 
                ? 'bg-destructive/10 text-destructive' 
                : 'bg-primary/10 text-primary'
            }`}>
              {variant === 'destructive' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                getActionIcon(action.action || '')
              )}
            </div>
            <div>
              <AlertDialogTitle className="text-left">{title}</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Action Details */}
        {actionData && (
          <div className="space-y-2 py-2">
            <div className="text-sm font-medium text-muted-foreground">Action Details:</div>
            <div className="bg-muted/50 p-3 rounded-lg space-y-1">
              {Object.entries(actionData).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="capitalize text-muted-foreground">{key}:</span>
                  <Badge variant="outline" className="text-xs">
                    {String(value)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={isLoading}
            className={variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            ) : (
              action.label || 'Confirm'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

"use client";

import { createContext, useContext } from 'react';
import type { AppData, Client, QuoteColumn, Collaborator, Category, Task, QuoteTemplate } from '@/lib/types';
import type { TaskFormValues } from '@/components/create-task-form';
import { EisenhowerQuadrantType } from '@/components/eisenhower/EisenhowerView';

type DashboardContextType = AppData & {
  setTasks: React.Dispatch<React.SetStateAction<AppData['tasks']>>;
  setQuotes: React.Dispatch<React.SetStateAction<AppData['quotes']>>;
  setCollaboratorQuotes: React.Dispatch<React.SetStateAction<AppData['collaboratorQuotes']>>;
  setClients: React.Dispatch<React.SetStateAction<AppData['clients']>>;
  setCollaborators: React.Dispatch<React.SetStateAction<AppData['collaborators']>>;
  setQuoteTemplates: React.Dispatch<React.SetStateAction<AppData['quoteTemplates']>>;
  setCategories: React.Dispatch<React.SetStateAction<AppData['categories']>>;
  setAppSettings: React.Dispatch<React.SetStateAction<AppData['appSettings']>>;
  handleAddTask: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[]) => void;
  handleEditTask: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[], taskId: string) => void;
  handleTaskStatusChange: (taskId: string, status: AppData['tasks'][0]['status'], subStatusId?: string) => void;
  handleDeleteTask: (taskId: string) => void;
  handleRestoreTask: (taskId: string) => void;
  handlePermanentDeleteTask: (taskId: string) => void;
  handleEmptyTrash: () => void;
  handleAddClientAndSelect: (data: Omit<Client, 'id'>) => Client;
  handleEditClient: (clientId: string, updates: Partial<Omit<Client, 'id'>>) => void;
  handleDeleteClient: (clientId: string) => void;
  handleAddCollaborator: (data: Omit<Collaborator, 'id'>) => void;
  handleEditCollaborator: (collaboratorId: string, updates: Partial<Omit<Collaborator, 'id'>>) => void;
  handleDeleteCollaborator: (collaboratorId: string) => void;
  handleAddCategory: (data: Omit<Category, 'id'>) => void;
  handleEditCategory: (categoryId: string, updates: Partial<Omit<Category, 'id'>>) => void;
  handleDeleteCategory: (categoryId: string) => void;
  handleAiCreateTask: (data: any) => void;
  handleAiEditTask: (data: any) => void;
  handleClearAllData: () => void;
  updateTask: (updates: Partial<Task> & { id: string }) => void; // Corrected signature
  updateTaskEisenhowerQuadrant: (taskId: string, quadrant: EisenhowerQuadrantType | undefined) => void;
  reorderTasksInQuadrant: (quadrant: EisenhowerQuadrantType | 'uncategorized', orderedTaskIds: string[]) => void;
  reorderTasksInStatus: (statusId: string, orderedTaskIds: string[]) => void;
  updateKanbanSettings: (settings: Partial<{ kanbanColumnOrder: string[], kanbanColumnVisibility: Record<string, boolean>, kanbanSubStatusMode: 'grouped' | 'separate' }>) => void;
  settings: AppData['appSettings'];
  language: AppData['appSettings']['language'];
  quoteTemplates: AppData['quoteTemplates'];
};

export const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        return null;
    }
    return context;
};

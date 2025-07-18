"use client";

import { createContext, useContext } from 'react';
import type { AppData, Client, QuoteColumn, Collaborator, Category } from '@/lib/types';
import type { TaskFormValues } from '@/components/create-task-form';

// Using a more specific type instead of 'any' for better type safety.
// This context will hold all the shared state and functions for the dashboard.
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
};

export const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        // This can happen if the component is not wrapped in DashboardLayout's provider
        // or during some edge cases in server rendering.
        // Returning null and letting components handle it gracefully.
        return null;
    }
    return context;
};

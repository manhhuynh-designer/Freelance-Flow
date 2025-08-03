"use client";

import { TaskList } from '@/components/task-list';
import { SubStatusToggle } from '@/components/sub-status-toggle';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, Category } from '@/lib/types';
import type { TaskFormValues } from './edit-task-form'; // Import TaskFormValues

interface TableViewProps {
  tasks: Task[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onViewTask: (taskId: string) => void;
  onEditTask: (
    values: TaskFormValues,
    quoteColumns: QuoteColumn[],
    collaboratorQuoteColumns: QuoteColumn[],
    taskId: string
  ) => void;
  onTaskStatusChange: (taskId: string, newStatus: Task['status'], subStatusId?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  quoteTemplates: QuoteTemplate[];
  view: 'active' | 'trash';
  onRestoreTask: (taskId: string) => void;
  onPermanentDeleteTask: (taskId: string) => void;
  settings: AppSettings;
}

export function TableView({
  tasks,
  quotes,
  collaboratorQuotes,
  clients,
  collaborators,
  categories,
  onViewTask,
  onEditTask,
  onTaskStatusChange,
  onDeleteTask,
  onAddClient,
  quoteTemplates,
  view,
  onRestoreTask,
  onPermanentDeleteTask,
  settings,
}: TableViewProps) {
  return (
    <div className="h-full flex flex-col">
      <TaskList
        tasks={tasks}
        quotes={quotes}
        collaboratorQuotes={collaboratorQuotes}
        clients={clients}
        collaborators={collaborators}
        categories={categories}
        onViewTask={onViewTask}
        onEditTask={onEditTask}
        onTaskStatusChange={onTaskStatusChange}
        onDeleteTask={onDeleteTask}
        onAddClient={onAddClient}
        quoteTemplates={quoteTemplates}
        view={view}
        onRestoreTask={onRestoreTask}
        onPermanentDeleteTask={onPermanentDeleteTask}
        settings={settings}
      />
    </div>
  );
}
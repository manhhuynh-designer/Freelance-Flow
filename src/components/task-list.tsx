"use client";

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TaskListItem } from './task-list-item';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppData, AppSettings, Category } from '@/lib/types';
import type { TaskFormValues } from './edit-task-form';
import { i18n } from "@/lib/i18n";
import { STATUS_INFO } from '@/lib/data';

type TaskListProps = {
    tasks: Task[];
    quotes: Quote[];
    collaboratorQuotes: Quote[];
    clients: Client[];
    collaborators: Collaborator[];
    categories: Category[];
    view: 'active' | 'trash';
    onViewTask: (taskId: string) => void;
    onEditTask: (
      values: TaskFormValues, 
      quoteColumns: QuoteColumn[],
      collaboratorQuoteColumns: QuoteColumn[],
      taskId: string
    ) => void;
    onTaskStatusChange: (taskId: string, status: Task['status'], subStatusId?: string) => void;
    onDeleteTask: (taskId: string) => void;
    onAddClient: (data: Omit<Client, 'id'>) => Client;
    onRestoreTask: (taskId: string) => void;
    onPermanentDeleteTask: (taskId: string) => void;
    quoteTemplates: QuoteTemplate[];
    settings: AppSettings;
};

export function TaskList({ 
    tasks, 
    quotes, 
    collaboratorQuotes, 
    clients,
    collaborators,
    categories,
    view, 
    onViewTask,
    onEditTask, 
    onTaskStatusChange, 
    onDeleteTask, 
    onAddClient,
    onRestoreTask,
    onPermanentDeleteTask,
    quoteTemplates,
    settings,
}: TaskListProps) {
  const T = i18n[settings.language as 'en' | 'vi'] || i18n.en;
  const visibleColumns = useMemo(() => (settings.dashboardColumns || []).filter(col => col.visible), [settings.dashboardColumns]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 sticky-header min-h-0">
        <div className="relative w-full h-full">
          <table className="w-full caption-bottom text-sm">
            <thead className="hidden md:table-header-group">
              {view === 'active' ? (
                <tr>
                  {visibleColumns.map(col => {
                    const labelKey = col.id === 'name' ? 'taskName' : col.id === 'priceQuote' ? 'priceQuote' : col.id;
                    const columnLabel = T[labelKey as keyof typeof T] || col.label;
                    return (
                      <th 
                        key={col.id} 
                        className={`h-12 px-4 text-left align-middle font-bold text-foreground ${col.id === 'priceQuote' ? 'text-right' : ''}`}
                      >
                        {typeof columnLabel === 'string' ? columnLabel : JSON.stringify(columnLabel)}
                      </th>
                    );
                  })}
                </tr>
              ) : (
                <tr>
                  <th className="h-12 px-4 text-left align-middle font-bold text-foreground">{T.task}</th>
                  <th className="h-12 px-4 text-left align-middle font-bold text-foreground">{T.client}</th>
                  <th className="h-12 px-4 text-left align-middle font-bold text-foreground">{T.delete} Date</th>
                  <th className="h-12 px-4 text-left align-middle font-bold text-foreground">Days Remaining</th>
                  <th className="h-12 px-4 text-left align-middle font-bold text-foreground text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <TaskListItem 
                    key={task.id}
                    task={task}
                    client={clients.find(c => c.id === task.clientId)}
                    collaborators={collaborators}
                    category={categories.find(c => c.id === task.categoryId)}
                    quote={quotes.find(q => q.id === task.quoteId)}
                    status={STATUS_INFO.find(s => s.id === task.status)}
                    onViewTask={onViewTask}
                    onTaskStatusChange={onTaskStatusChange}
                    onRestoreTask={onRestoreTask}
                    onPermanentDeleteTask={onPermanentDeleteTask}
                    settings={settings}
                    view={view}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length || 6} className="p-4 align-middle h-24 text-center">
                    {view === 'active' ? (T.noTasksFound || 'No tasks found') : ((T.trash || 'Trash') + ' is empty.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

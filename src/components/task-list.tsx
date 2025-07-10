
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
    onEditTask: (
      values: TaskFormValues, 
      quoteColumns: QuoteColumn[],
      collaboratorQuoteColumns: QuoteColumn[],
      taskId: string
    ) => void;
    onTaskStatusChange: (taskId: string, status: Task['status']) => void;
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
    onEditTask, 
    onTaskStatusChange, 
    onDeleteTask, 
    onAddClient,
    onRestoreTask,
    onPermanentDeleteTask,
    quoteTemplates,
    settings,
}: TaskListProps) {
  const T = i18n[settings.language];
  const visibleColumns = useMemo(() => (settings.dashboardColumns || []).filter(col => col.visible), [settings.dashboardColumns]);
  
  return (
    <div className="overflow-x-auto">
        <Table>
          <TableHeader className="hidden md:table-header-group">
            {view === 'active' ? (
                <TableRow>
                  {visibleColumns.map(col => {
                      const labelKey = col.id === 'name' ? 'taskName' : col.id === 'priceQuote' ? 'priceQuote' : col.id;
                      const columnLabel = T[labelKey as keyof typeof T] || col.label;
                      return (
                          <TableHead key={col.id} className={col.id === 'priceQuote' ? 'text-right' : ''}>
                              {columnLabel}
                          </TableHead>
                      );
                  })}
                </TableRow>
            ) : (
                <TableRow>
                    <TableHead>{T.task}</TableHead>
                    <TableHead>{T.client}</TableHead>
                    <TableHead>{T.delete} Date</TableHead>
                    <TableHead>Days Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {tasks.length > 0 ? (
                tasks.map(task => (
                    <TaskListItem 
                        key={task.id}
                        task={task}
                        client={clients.find(c => c.id === task.clientId)}
                        clients={clients}
                        collaborators={collaborators}
                        categories={categories}
                        quote={quotes.find(q => q.id === task.quoteId)}
                        collaboratorQuote={collaboratorQuotes.find(q => q.id === task.collaboratorQuoteId)}
                        status={STATUS_INFO.find(s => s.id === task.status)}
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
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        {view === 'active' ? T.noClientsFound : T.trash + ' is empty.'}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
    </div>
  );
}

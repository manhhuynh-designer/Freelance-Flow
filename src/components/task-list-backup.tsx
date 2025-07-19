
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
import {
  StickyTable,
  TableBody as StickyTableBody,
  TableCell as StickyTableCell,
  TableHead as StickyTableHead,
  TableHeader as StickyTableHeader,
  TableRow as StickyTableRow,
} from "@/components/ui/sticky-table";
import { TaskListItem } from './task-list-item';
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppData, AppSettings, Category } from '@/lib/types';
import type { TaskFormValues } from './edit-task-form';
import { i18n } from "@/lib/i18n";
import { STATUS_INFO } from '@/lib/data';
import './task-list.sticky.css';

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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-x-auto md:sticky-header">
        <StickyTable>
          <StickyTableHeader className="hidden md:table-header-group">
            {view === 'active' ? (
                <StickyTableRow>
                  {visibleColumns.map(col => {
                      const labelKey = col.id === 'name' ? 'taskName' : col.id === 'priceQuote' ? 'priceQuote' : col.id;
                      const columnLabel = T[labelKey as keyof typeof T] || col.label;
                      return (
                          <StickyTableHead key={col.id} className={col.id === 'priceQuote' ? 'text-right' : ''}>
                              {typeof columnLabel === 'string' ? columnLabel : JSON.stringify(columnLabel)}
                          </StickyTableHead>
                      );
                  })}
                </StickyTableRow>
            ) : (
                <StickyTableRow>
                    <StickyTableHead>{T.task}</StickyTableHead>
                    <StickyTableHead>{T.client}</StickyTableHead>
                    <StickyTableHead>{T.delete} Date</StickyTableHead>
                    <StickyTableHead>Days Remaining</StickyTableHead>
                    <StickyTableHead className="text-right">Actions</StickyTableHead>
                </StickyTableRow>
            )}
          </StickyTableHeader>
          <StickyTableBody>
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
                        collaboratorQuotes={
                            task.collaboratorQuotes 
                                ? task.collaboratorQuotes.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[]
                                : (task as any).collaboratorQuoteId 
                                    ? [collaboratorQuotes.find(q => q.id === (task as any).collaboratorQuoteId)].filter(Boolean) as Quote[]
                                    : []
                        }
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
                <StickyTableRow>
                    <StickyTableCell colSpan={6} className="h-24 text-center">
                        {view === 'active' ? T.noClientsFound : T.trash + ' is empty.'}
                    </StickyTableCell>
                </StickyTableRow>
            )}
          </StickyTableBody>
        </StickyTable>
      </div>
    </div>
  );
                            task.collaboratorQuotes 
                                ? task.collaboratorQuotes.map(cq => collaboratorQuotes.find(q => q.id === cq.quoteId)).filter(Boolean) as Quote[]
                                : (task as any).collaboratorQuoteId 
                                    ? [collaboratorQuotes.find(q => q.id === (task as any).collaboratorQuoteId)].filter(Boolean) as Quote[]
                                    : []
                        }
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
    </div>
  );
}

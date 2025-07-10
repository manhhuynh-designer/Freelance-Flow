
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { format, differenceInDays } from "date-fns";
import { Pencil, Link as LinkIcon, Folder, Expand, Shrink, Copy, Trash2, ArchiveRestore, Briefcase, ChevronDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Task, Client, Category, Quote, StatusInfo, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, QuoteSection } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { EditTaskForm, type TaskFormValues } from "./edit-task-form";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_INFO } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { Separator } from "./ui/separator";
import { getContrastingTextColor } from "@/lib/colors";

type TaskListItemProps = {
  task: Task;
  client?: Client;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  quote?: Quote;
  collaboratorQuote?: Quote;
  status?: StatusInfo;
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


export function TaskListItem({ 
  task, 
  client, 
  clients,
  collaborators,
  categories,
  quote, 
  collaboratorQuote, 
  status, 
  view,
  onEditTask, 
  onTaskStatusChange, 
  onDeleteTask, 
  onAddClient,
  onRestoreTask,
  onPermanentDeleteTask,
  quoteTemplates,
  settings,
}: TaskListItemProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editDialogSize, setEditDialogSize] = useState('default');
  const { toast } = useToast();
  
  const T = i18n[settings.language];
  const StatusIcon = status?.icon;
  const statusSetting = (settings.statusSettings || []).find(s => s.id === task.status);
  const subStatusLabel = statusSetting?.subStatuses.find(ss => ss.id === task.subStatusId)?.label;

  const isValidDeadline = task.deadline instanceof Date && !isNaN(task.deadline.getTime());
  const isValidStartDate = task.startDate instanceof Date && !isNaN(task.startDate.getTime());
  
  const defaultColumns: QuoteColumn[] = [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'quantity', name: T.quantity, type: 'number' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', sumTotal: false },
  ];

  const category = useMemo(() => (categories || []).find(c => c.id === task.categoryId), [task.categoryId, categories]);

  const assignedCollaborator = useMemo(() => {
    return collaborators.find(c => c.id === task.collaboratorId);
  }, [task.collaboratorId, collaborators]);

  const totalQuote = useMemo(() => quote?.sections?.reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + ((item.quantity || 1) * (item.unitPrice || 0)), 0) || 0), 0) ?? 0, [quote]);
  const totalCollabQuote = useMemo(() => collaboratorQuote?.sections?.reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + ((item.quantity || 1) * (item.unitPrice || 0)), 0) || 0), 0) ?? 0, [collaboratorQuote]);


  const getDeadlineColor = (deadline: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);

    const daysUntil = differenceInDays(deadlineDate, today);

    if (daysUntil < 0) return "text-deadline-overdue font-semibold";
    if (daysUntil <= 3) return "text-deadline-due-soon font-medium";
    if (daysUntil <= 7) return "text-deadline-coming-up";
    return "text-deadline-safe";
  };

  const deadlineColorClass = isValidDeadline ? getDeadlineColor(task.deadline) : "text-deadline-overdue font-semibold";

  const handleTaskFormSubmit = (
    values: TaskFormValues, 
    quoteColumns: QuoteColumn[], 
    collaboratorQuoteColumns: QuoteColumn[],
    taskId: string
  ) => {
    onEditTask(values, quoteColumns, collaboratorQuoteColumns, taskId);
    setIsEditDialogOpen(false);
  };

  const cycleEditDialogSize = useCallback(() => {
    setEditDialogSize(current => {
        if (current === 'default') return 'large';
        if (current === 'large') return 'fullscreen';
        return 'default';
    });
  }, []);

  const copyQuoteToClipboard = useCallback((quoteToCopy: Quote | undefined) => {
    if (!quoteToCopy) return;

    let fullClipboardString = '';
    
    (quoteToCopy.sections || []).forEach(section => {
        if (section.name) {
            fullClipboardString += `${section.name}\n`;
        }
        const headers = (quoteToCopy.columns || defaultColumns).map(c => c.name).join('\t');
        fullClipboardString += `${headers}\n`;

        const itemRows = section.items.map(item => {
            return (quoteToCopy.columns || defaultColumns).map(col => {
                const value = ['description', 'quantity', 'unitPrice'].includes(col.id)
                    ? item[col.id as keyof typeof item]
                    : item.customFields?.[col.id];
                const rawValue = value ?? '';
                if (typeof rawValue === 'number') {
                    return rawValue.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
                }
                return String(rawValue).replace(/\n/g, ' ');
            }).join('\t');
        });
        fullClipboardString += `${itemRows.join('\n')}\n\n`;
    });
    
    const grandTotal = quoteToCopy.sections.reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + ((item.quantity || 1) * (item.unitPrice || 0)), 0) || 0), 0);
    const grandTotalString = [...Array(Math.max(0, (quoteToCopy.columns || defaultColumns).length - 1)).fill(''), T.grandTotal, `${grandTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} ${settings.currency}`].filter(Boolean).join('\t');
    fullClipboardString += `${grandTotalString}\n`;

    navigator.clipboard.writeText(fullClipboardString.trim()).then(() => {
      toast({
        title: T.quoteCopied,
        description: T.quoteCopiedDesc,
      });
    }).catch(err => {
      console.error("Failed to copy quote: ", err);
      toast({
        variant: "destructive",
        title: T.copyFailed,
        description: T.copyFailedDesc,
      });
    });
  }, [toast, T, settings, defaultColumns]);


  const renderQuoteTable = (title: string, quoteData: Quote | undefined) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">{title}</h4>
        {quoteData && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => copyQuoteToClipboard(quoteData)} title="Copy table to clipboard">
            <Copy className="w-4 h-4" />
            <span className="sr-only">Copy {title}</span>
          </Button>
        )}
      </div>
      {(quoteData?.sections || []).map((section, sectionIndex) => (
        <div key={section.id || sectionIndex} className="mb-4 last:mb-0">
          {section.name && <h5 className="font-medium text-sm text-muted-foreground mb-1 pl-1">{section.name}</h5>}
          <div className="rounded-lg border-2 border-foreground bg-card p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  {(quoteData.columns || defaultColumns).map(col => (
                    <TableHead key={col.id} className={cn(col.type === 'number' && 'text-right')}>{col.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    {(quoteData.columns || defaultColumns).map(col => {
                      const value = ['description', 'quantity', 'unitPrice'].includes(col.id)
                        ? item[col.id as keyof typeof item]
                        : item.customFields?.[col.id];
                      const displayValue = value ?? '';

                      let formattedValue: string | number = displayValue;
                      if (typeof displayValue === 'number') {
                        formattedValue = displayValue.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
                      }

                      return (
                        <TableCell key={col.id} className={cn(col.type === 'number' && 'text-right')}>
                          {String(formattedValue)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
  
  const visibleColumns = useMemo(() => (settings.dashboardColumns || []).filter(col => col.visible), [settings.dashboardColumns]);

  if (view === 'trash') {
    const deletedDate = new Date(task.deletedAt!);
    const expiryDate = new Date(deletedDate.getTime() + settings.trashAutoDeleteDays * 24 * 60 * 60 * 1000);
    const daysRemaining = differenceInDays(expiryDate, new Date());
  
    return (
      <TableRow>
        <TableCell>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{T.delete} Permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {T.deletePermanently} {T.task.toLowerCase()} "{task.name}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                    <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => onPermanentDeleteTask(task.id)}>{T.delete} Forever</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <span>{task.name}</span>
            </div>
        </TableCell>
        <TableCell>
            <span>{client?.name}</span>
        </TableCell>
        <TableCell>
            <span>{format(deletedDate, "MMM dd, yyyy")}</span>
        </TableCell>
        <TableCell>
            <span>{daysRemaining > 0 ? `${daysRemaining} days left` : 'Purged soon'}</span>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => onRestoreTask(task.id)}>
              <ArchiveRestore className="w-4 h-4 mr-2" />
              {T.taskRestored.replace(' Task','')}
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  const renderCellContent = (columnId: (typeof visibleColumns)[number]['id']) => {
    switch (columnId) {
        case 'name':
            return <span>{task.name}</span>;
        case 'client':
            return <span>{client?.name}</span>;
        case 'category':
            return <span>{(category?.name && T.categories[category.id as keyof typeof T.categories]) || category?.name || ''}</span>;
        case 'deadline':
            return <span className={deadlineColorClass}>{isValidDeadline ? format(task.deadline, "MMM dd, yyyy") : 'Invalid Date'}</span>;
        case 'status':
            return StatusIcon && status && (
              <DropdownMenu>
                <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} asChild>
                  <Badge
                    className="inline-flex items-center gap-2 cursor-pointer px-2 border-transparent"
                    style={{ 
                      backgroundColor: settings.statusColors[task.status],
                      color: getContrastingTextColor(settings.statusColors[task.status]) 
                    }}
                  >
                    <StatusIcon className="h-3 w-3" />
                    <span>{statusSetting?.label || T.statuses[status.id]}</span>
                    {subStatusLabel && <span className="text-xs opacity-80 ml-1.5">({subStatusLabel})</span>}
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuRadioGroup 
                        value={task.status} 
                        onValueChange={(value) => onTaskStatusChange(task.id, value as Task['status'])}
                    >
                        <DropdownMenuLabel>Set {T.status.toLowerCase()}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(settings.statusSettings || []).map((s) => (
                            <DropdownMenuRadioItem key={s.id} value={s.id}>
                                {s.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            );
        case 'priceQuote':
            return <>{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</>;
        default:
            return null;
    }
  };

  return (
    <>
      <TableRow onClick={() => setIsDetailsOpen(true)} className="cursor-pointer">
        {visibleColumns.map((col) => {
           const labelKey = col.id === 'name' ? 'taskName' : col.id === 'priceQuote' ? 'priceQuote' : col.id;
           const columnLabel = T[labelKey as keyof typeof T] || col.label;
            return (
              <TableCell
                key={col.id}
                className={cn(
                  col.id === 'name' && 'font-medium',
                  col.id === 'priceQuote' && 'text-right font-medium'
                )}
              >
                {renderCellContent(col.id)}
              </TableCell>
            )
        })}
      </TableRow>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{task.name}</DialogTitle>
            <DialogDescription>
              {client?.name} &bull; {(category?.name && T.categories[category.id as keyof typeof T.categories]) || category?.name || ''} &bull; {status?.name ? (statusSetting?.label || T.statuses[status.id]) : ''}
              {subStatusLabel && ` (${subStatusLabel})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="font-semibold mb-2">{T.description}</h4>
              <p className="text-sm text-muted-foreground">{task.description || T.noDescription}</p>
            </div>

            {(task.briefLink || task.driveLink) && (
                <div>
                    <h4 className="font-semibold mb-2">{T.links}</h4>
                    <div className="flex flex-wrap gap-2">
                        {task.briefLink && (
                            <Button asChild variant="outline" size="sm">
                                <a href={task.briefLink} target="_blank" rel="noopener noreferrer">
                                    <LinkIcon className="w-4 h-4 mr-2" />
                                    {T.briefLink}
                                </a>
                            </Button>
                        )}
                        {task.driveLink && (
                            <Button asChild variant="outline" size="sm">
                                <a href={task.driveLink} target="_blank" rel="noopener noreferrer">
                                    <Folder className="w-4 h-4 mr-2" />
                                    {T.driveLink}
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            )}
            
            {assignedCollaborator && (
                <div>
                    <h4 className="font-semibold mb-2">{T.collaborator}</h4>
                    <div className="flex flex-wrap gap-2">
                        <Badge key={assignedCollaborator.id} variant="secondary" className="flex items-center gap-2">
                            <Briefcase className="w-3 h-3" />
                            {assignedCollaborator.name}
                        </Badge>
                    </div>
                </div>
            )}


            <div>
              <h4 className="font-semibold mb-2">{T.dates}</h4>
              <p className="text-sm text-muted-foreground">
                {isValidStartDate ? format(task.startDate, "PPP") : 'Invalid Date'} to {isValidDeadline ? format(task.deadline, "PPP") : 'Invalid Date'}
              </p>
            </div>
            
            {quote && quote.sections && quote.sections.length > 0 && renderQuoteTable(T.priceQuote, quote)}
            
            {collaboratorQuote && collaboratorQuote.sections && collaboratorQuote.sections.length > 0 && (
                renderQuoteTable(T.collaboratorCosts, collaboratorQuote)
            )}
            
            {(totalQuote > 0 || totalCollabQuote > 0) && (
              <div className="flex justify-end pt-4 mt-4 border-t">
                  <div className="text-sm space-y-2 w-full max-w-xs">
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">{T.grandTotal}</span>
                          <span className="font-medium">{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                      </div>
                      {totalCollabQuote > 0 && (
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">{T.collaboratorCosts}</span>
                              <span className="font-medium text-destructive">- {totalCollabQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                          </div>
                      )}
                      <Separator/>
                      <div className="flex justify-between items-center">
                          <span className="text-lg font-bold">{T.netTotal}</span>
                          <span className="text-2xl font-bold text-primary">{(totalQuote - totalCollabQuote).toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                      </div>
                  </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-2 border-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {T.deleteTask}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{T.moveToTrash}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {T.moveToTrashDescription}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      className={cn(buttonVariants({ variant: "destructive" }))}
                      onClick={() => onDeleteTask(task.id)}
                    >
                      {T.confirmMoveToTrash}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" size="sm" onClick={() => { setIsDetailsOpen(false); setIsEditDialogOpen(true); }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  {T.editTask}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn(
                "max-h-[90vh] overflow-y-auto",
                {
                    'sm:max-w-2xl md:max-w-5xl': editDialogSize === 'default',
                    'sm:max-w-4xl md:max-w-7xl': editDialogSize === 'large',
                    'w-screen h-screen max-w-none max-h-none rounded-none border-0': editDialogSize === 'fullscreen',
                }
            )}>
            <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-4 h-6 w-6"
                onClick={cycleEditDialogSize}
            >
                {editDialogSize === 'fullscreen' ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                <span className="sr-only">Toggle dialog size</span>
            </Button>
          <DialogHeader className="text-center pt-6 sm:px-10">
            <DialogTitle>{T.editTask}</DialogTitle>
            <DialogDescription>{T.saveChanges} for your task below.</DialogDescription>
          </DialogHeader>
          <div className="p-1">
            <EditTaskForm 
                key={task.id} 
                setOpen={setIsEditDialogOpen} 
                taskToEdit={task} 
                onSubmit={handleTaskFormSubmit} 
                quote={quote} 
                collaboratorQuote={collaboratorQuote} 
                clients={clients} 
                onAddClient={onAddClient} 
                quoteTemplates={quoteTemplates} 
                collaborators={collaborators} 
                settings={settings}
                categories={categories}
              />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

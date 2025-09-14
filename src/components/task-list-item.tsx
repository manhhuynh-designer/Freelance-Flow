"use client";
import { Progress } from "@/components/ui/progress";
import { i18n } from "@/lib/i18n";
import { Flag, FlagOff } from 'lucide-react';
import React, { useMemo, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Task, Client, Category, Quote, StatusInfo, Collaborator, AppSettings } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getContrastingTextColor } from "@/lib/colors";
import { ArchiveRestore, Trash2, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDashboard } from "@/contexts/dashboard-context";

type TaskListItemProps = {
  task: Task;
  client?: Client;
  category?: Category;
  quote?: Quote;
  status?: StatusInfo;
  view: 'active' | 'trash';
  onViewTask: (taskId: string) => void; // Centralized handler for viewing details
  onTaskStatusChange: (taskId: string, status: Task['status'], subStatusId?: string) => void;
  onRestoreTask: (taskId: string) => void;
  onPermanentDeleteTask: (taskId: string) => void;
  settings: AppSettings;
  // Optional handlers to match various callers
  onEditTask?: (values: any, quoteColumns: any, collaboratorQuoteColumns: any, taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddClient?: (data: Omit<Client, 'id'>) => Client;
  quoteTemplates?: any[];
  // allow callers to omit collaborator arrays
  collaborators?: Collaborator[];
};

export function TaskListItem({ 
  task, 
  client, 
  collaborators,
  category,
  quote, 
  status, 
  view,
  onViewTask,
  onTaskStatusChange, 
  onRestoreTask,
  onPermanentDeleteTask,
  settings,
}: TaskListItemProps) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [hoveredStatusId, setHoveredStatusId] = useState<string | null>(null);
  const { updateTaskEisenhowerQuadrant } = (useDashboard() as any) || {};
  
  const T = useMemo(() => i18n[settings.language] || i18n.en, [settings.language]);

  const deadline = useMemo(() => {
    if (!task.deadline) return null;
    const d = typeof task.deadline === 'string' ? new Date(task.deadline) : task.deadline;
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }, [task.deadline]);

  const isValidDeadline = !!deadline;

  const assignedCollaborators = useMemo(() => {
    if (!task.collaboratorIds) return [];
    const safeCollaborators = Array.isArray(collaborators) ? collaborators : [];
    const uniqueIds = [...new Set(task.collaboratorIds)];
    return uniqueIds
      .map(id => safeCollaborators.find(c => c.id === id))
      .filter(Boolean) as Collaborator[];
  }, [task.collaboratorIds, collaborators]);

  const totalQuote = useMemo(() => {
    if (!quote?.sections) return 0;
    return quote.sections.reduce((acc, section) => 
      acc + (section.items?.reduce((itemAcc, item) => itemAcc + item.unitPrice, 0) || 0), 0);
  }, [quote]);

  const getDeadlineColor = (d: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(d);
    deadlineDate.setHours(0, 0, 0, 0);
    const daysUntil = differenceInDays(deadlineDate, today);
    if (daysUntil < 0) return "text-deadline-overdue font-semibold";
    if (daysUntil <= 3) return "text-deadline-due-soon font-medium";
    if (daysUntil <= 7) return "text-deadline-coming-up";
    return "text-deadline-safe";
  };
  
  const deadlineColorClass = isValidDeadline ? getDeadlineColor(deadline) : "text-muted-foreground";
  const visibleColumns = useMemo(() => settings.dashboardColumns?.filter(col => col.visible) || [], [settings.dashboardColumns]);

  // Eisenhower color schemes (match Kanban and Dialog)
  const eisenhowerSchemes = {
    colorScheme1: { do: '#ef4444', decide: '#3b82f6', delegate: '#f59e42', delete: '#6b7280' },
    colorScheme2: { do: '#d8b4fe', decide: '#bbf7d0', delegate: '#fed7aa', delete: '#bfdbfe' },
    colorScheme3: { do: '#99f6e4', decide: '#fbcfe8', delegate: '#fde68a', delete: '#c7d2fe' },
  } as const;
  type EisenhowerQuadrant = 'do' | 'decide' | 'delegate' | 'delete';
  const scheme = settings?.eisenhowerColorScheme || 'colorScheme1';
  function getFlagColor(quadrant?: EisenhowerQuadrant) {
    if (!quadrant) return '#e5e7eb';
    const map = (eisenhowerSchemes as any)[scheme] || (eisenhowerSchemes as any)['colorScheme1'];
    return map[quadrant] || '#e5e7eb';
  }

  if (view === 'trash') {
    const deletedDate = task.deletedAt ? new Date(task.deletedAt) : new Date();
    const expiryDate = new Date(deletedDate.getTime() + settings.trashAutoDeleteDays * 24 * 60 * 60 * 1000);
    const daysRemaining = differenceInDays(expiryDate, new Date());
    
    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{T.delete} Permanently?</AlertDialogTitle>
                  <AlertDialogDescription>{T.deletePermanently} {T.task.toLowerCase()} "{task.name}".</AlertDialogDescription>
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
        <TableCell><span>{client?.name}</span></TableCell>
        <TableCell><span>{format(deletedDate, "MMM dd, yyyy")}</span></TableCell>
        <TableCell><span>{daysRemaining > 0 ? `${daysRemaining} days left` : 'Purged soon'}</span></TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => onRestoreTask(task.id)}>
            <ArchiveRestore className="w-4 h-4 mr-2" />{T.taskRestored.replace(' Task','')}
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  const renderCellContent = (columnId: string) => {
    switch (columnId) {
        case 'name':
            return (
              <span className="inline-flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0"
                      title={(T as any)?.eisenhowerPriority || 'Eisenhower priority'}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {task.eisenhowerQuadrant ? (
                        <Flag size={16} color={getFlagColor(task.eisenhowerQuadrant)} fill={getFlagColor(task.eisenhowerQuadrant)} className="drop-shadow" />
                      ) : (
                        <FlagOff size={16} className="text-muted-foreground drop-shadow" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2">
                      {(['do','decide','delegate','delete'] as const).map((q) => (
                        <Button
                          key={q}
                          variant={task.eisenhowerQuadrant === q ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 px-2 flex items-center gap-1 justify-start"
                          onClick={(e) => { e.stopPropagation(); updateTaskEisenhowerQuadrant?.(task.id, q); }}
                        >
                          <Flag className="w-3 h-3" color={getFlagColor(q)} fill={getFlagColor(q)} />
                          <span className="text-[11px] capitalize">{(T as any)?.[`quadrant_${q}`] || q}</span>
                        </Button>
                      ))}
                      <Button
                        variant={!task.eisenhowerQuadrant ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 px-2 col-span-2"
                        onClick={(e) => { e.stopPropagation(); updateTaskEisenhowerQuadrant?.(task.id, undefined); }}
                      >
                        <FlagOff className="w-3 h-3" />
                        <span className="text-[11px]">{(T as any)?.clearLabel || 'Clear'}</span>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                {task.name}
              </span>
            );
        case 'client': return <span>{client?.name}</span>;
        case 'category': return <span>{category?.name}</span>;
        case 'collaborator': 
          return assignedCollaborators.length > 0 ? (
            <div className="flex gap-1">
              {assignedCollaborators.slice(0, 3).map((c, i) => (
                <div key={c.id} className="inline-flex items-center gap-1">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full"><span className="text-xs font-medium">{c.name.charAt(0)}</span></div>
                  <span className="text-sm">{c.name}</span>{i < Math.min(assignedCollaborators.length - 1, 2) && <span className="text-muted-foreground">, </span>}
                </div>
              ))}
              {assignedCollaborators.length > 3 && <span className="text-xs text-muted-foreground">+{assignedCollaborators.length - 3} more</span>}
            </div>
          ) : <span className="text-muted-foreground">-</span>;
        case 'deadline': return <span className={deadlineColorClass}>{isValidDeadline ? format(deadline, "MMM dd, yyyy") : '-'}</span>;
        case 'status':
            const StatusIcon = status?.icon;
            const statusSettings = Array.isArray(settings.statusSettings) ? settings.statusSettings : [];
            const statusColors = (settings as any).statusColors || {} as Record<string, string>;
            const currentStatusColor = statusColors[task.status] || '#64748b';
            const statusSetting = statusSettings.find(s => s.id === task.status);
            const subStatusLabel = (statusSetting?.subStatuses || []).find(ss => ss.id === task.subStatusId)?.label;
            return StatusIcon && status && (
            <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
              <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} asChild>
                <Badge className="inline-flex items-center gap-2 cursor-pointer px-3 py-1 border-transparent hover:opacity-80 transition-opacity max-w-full" style={{ backgroundColor: currentStatusColor, color: getContrastingTextColor(currentStatusColor) }}>
                  <StatusIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="font-medium text-xs truncate">{statusSetting?.label || status.name}{subStatusLabel && ` • ${subStatusLabel}`}</span>
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()} className="w-64 status-dropdown-content">
                  <DropdownMenuLabel>{T.status}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statusSettings.map(s => (
                    <div key={s.id} className="relative" onMouseEnter={() => s.subStatuses.length > 0 && setHoveredStatusId(s.id)} onMouseLeave={() => setHoveredStatusId(null)}>
                      <DropdownMenuRadioItem value={s.id} onClick={() => onTaskStatusChange(task.id, s.id)} className={cn("flex items-center justify-between group", task.status === s.id && 'font-semibold bg-accent')}>
                        <div className="flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
                            <circle cx="8" cy="8" r="6" fill={statusColors[s.id] || '#64748b'} />
                          </svg>
                          <span>{s.label}</span>
                        </div>
                      </DropdownMenuRadioItem>
                      {Array.isArray(s.subStatuses) && s.subStatuses.length > 0 && hoveredStatusId === s.id && (
                        <div className="absolute left-full top-0 ml-1 w-48 bg-popover border rounded-md shadow-lg py-1 z-[100] status-sub-menu">
                          {s.subStatuses.map(sub => (
                            <div key={sub.id} onClick={e => { e.stopPropagation(); onTaskStatusChange(task.id, s.id, sub.id); setIsStatusDropdownOpen(false); }} className={cn("px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded-sm mx-1", task.subStatusId === sub.id && 'font-semibold bg-accent')}>
                              {sub.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        case 'priceQuote': return <>{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</>;
        default: return null;
    }
  };

  return (
    <TableRow onClick={() => onViewTask(task.id)} className="cursor-pointer">
      {visibleColumns.map(col => 
        <TableCell key={col.id} className={cn(col.id === 'priceQuote' && 'text-right font-medium')}>
          {renderCellContent(col.id)}
        </TableCell>
      )}
    </TableRow>
  );
}

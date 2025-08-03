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

type TaskListItemProps = {
  task: Task;
  client?: Client;
  collaborators: Collaborator[];
  category?: Category;
  quote?: Quote;
  status?: StatusInfo;
  view: 'active' | 'trash';
  onViewTask: (taskId: string) => void; // Centralized handler for viewing details
  onTaskStatusChange: (taskId: string, status: Task['status'], subStatusId?: string) => void;
  onRestoreTask: (taskId: string) => void;
  onPermanentDeleteTask: (taskId: string) => void;
  settings: AppSettings;
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
  
  const T = useMemo(() => i18n[settings.language] || i18n.en, [settings.language]);

  const deadline = useMemo(() => {
    if (!task.deadline) return null;
    const d = typeof task.deadline === 'string' ? new Date(task.deadline) : task.deadline;
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }, [task.deadline]);

  const isValidDeadline = !!deadline;

  const assignedCollaborators = useMemo(() => {
    if (!task.collaboratorIds) return [];
    const uniqueIds = [...new Set(task.collaboratorIds)];
    return uniqueIds.map(id => collaborators.find(c => c.id === id)).filter(Boolean) as Collaborator[];
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
            const quadrant = task.eisenhowerQuadrant;
            const flagColor = quadrant ? '#e5e7eb' : '#e5e7eb';
            return <span className="inline-flex items-center gap-1">{task.name}</span>;
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
            const statusSetting = settings.statusSettings.find(s => s.id === task.status);
            const subStatusLabel = statusSetting?.subStatuses.find(ss => ss.id === task.subStatusId)?.label;
            return StatusIcon && status && (
            <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
              <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} asChild>
                <Badge className="inline-flex items-center gap-2 cursor-pointer px-3 py-1 border-transparent hover:opacity-80 transition-opacity max-w-full" style={{ backgroundColor: settings.statusColors[task.status], color: getContrastingTextColor(settings.statusColors[task.status]) }}>
                  <StatusIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="font-medium text-xs truncate">{statusSetting?.label || status.name}{subStatusLabel && ` • ${subStatusLabel}`}</span>
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()} className="w-64 status-dropdown-content">
                  <DropdownMenuLabel>{T.status}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {settings.statusSettings.map(s => (
                    <div key={s.id} className="relative" onMouseEnter={() => s.subStatuses.length > 0 && setHoveredStatusId(s.id)} onMouseLeave={() => setHoveredStatusId(null)}>
                      <DropdownMenuRadioItem value={s.id} onClick={() => onTaskStatusChange(task.id, s.id)} className={cn("flex items-center justify-between group", task.status === s.id && 'font-semibold bg-accent')}>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: settings.statusColors[s.id] }} /><span>{s.label}</span></div>
                      </DropdownMenuRadioItem>
                      {s.subStatuses.length > 0 && hoveredStatusId === s.id && (
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

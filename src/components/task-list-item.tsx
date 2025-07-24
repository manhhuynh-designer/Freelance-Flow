"use client";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { i18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";

import { Flag, FlagOff } from 'lucide-react';

// New component for local file/folder links
function LocalLink({ path }: { path: string }) {
  const isFileProtocol = path.toLowerCase().startsWith('file:');
  
  // Attempt to decode the URI to make it more readable and remove protocol
  let displayPath = path;
  try {
    displayPath = decodeURIComponent(path.replace(/^file:\/\//i, ''));
  } catch (e) {
    displayPath = path.replace(/^file:\/\//i, '');
  }

  // Truncate from the start if the path is too long
  const maxLength = 40;
  if (displayPath.length > maxLength) {
    const start = displayPath.length - maxLength;
    displayPath = `...${displayPath.substring(start)}`;
  }

  // Ensure href is a valid file URI with forward slashes
  const href = isFileProtocol ? path : `file:///${path.replace(/\\/g, '/')}`;

  const { toast } = require('@/hooks/use-toast');
  // Provide a fallback translation object for T
  const T = (i18n as any)?.en ?? i18n.vi ?? { pathCopied: "Path copied!" };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (isFileProtocol || /^[a-zA-Z]:[\\/]/.test(path)) {
      e.preventDefault();
      navigator.clipboard.writeText(path).then(() => {
        if (toast) toast({ title: T.pathCopied, description: path, duration: 2000 });
      });
    } else {
      // Nếu không phải local, mở như bình thường
      // Không cần e.preventDefault()
    }
  };
  return (
    <a
      href={href}
      title={`Open folder: ${path}`}
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted transition group text-left w-full"
      onClick={handleClick}
    >
      <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="truncate" title={path}>
        {displayPath}
      </span>
    </a>
  );
}


// LinkPreview: fetches page title and favicon for a given URL
function LinkPreview({ url, fallback, maxLength = 40 }: { url: string; fallback?: string; maxLength?: number }) {
  const [title, setTitle] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<boolean>(false);
  const [favicon, setFavicon] = React.useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setTitle("");
    setFavicon("");
    // Use a public CORS proxy for demo (production: use backend API)
    fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        // Parse title from HTML
        const match = data.contents.match(/<title>(.*?)<\/title>/i);
        let pageTitle = match ? match[1] : url;
        if (pageTitle.length > maxLength) pageTitle = pageTitle.slice(0, maxLength) + "...";
        setTitle(pageTitle);
        // Try to get favicon
        try {
          const dom = document.createElement("html");
          dom.innerHTML = data.contents;
          const iconLink = dom.querySelector('link[rel~="icon"]');
          let iconHref = iconLink?.getAttribute("href") || "";
          if (iconHref && !iconHref.startsWith("http")) {
            const u = new URL(url);
            iconHref = u.origin + (iconHref.startsWith("/") ? iconHref : "/" + iconHref);
          }
          setFavicon(iconHref || `https://www.google.com/s2/favicons?domain=${url}`);
        } catch {
          setFavicon(`https://www.google.com/s2/favicons?domain=${url}`);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [url, maxLength]);

  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted transition group text-left w-full">
      {favicon ? (
        <img src={favicon} alt="favicon" className="w-4 h-4 rounded" onError={e => { (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${url}`; }} />
      ) : null}
      <span className="truncate max-w-[180px]" title={title || domain}>
        {loading ? "Loading..." : error ? (fallback || domain) : (title || domain)}
      </span>
      <span className="text-xs text-muted-foreground hidden group-hover:inline">{domain}</span>
    </a>
  );
}
import { FileText } from "lucide-react";
import { Pencil, Link as LinkIcon, Folder, Expand, Shrink, Copy, Trash2, ArchiveRestore, Briefcase, ChevronDown, Calendar, Building2 } from "lucide-react";


import React, { useState, useMemo, useCallback, useEffect } from "react";
import { format, differenceInDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Task, Client, Category, Quote, StatusInfo, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, QuoteSection, ColumnCalculationType, QuoteItem } from "@/lib/types";
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

import { Separator } from "./ui/separator";
import { getContrastingTextColor } from "@/lib/colors";

type TaskListItemProps = {
  task: Task;
  client?: Client;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  quote?: Quote;
  collaboratorQuotes: Quote[];
  status?: StatusInfo;
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




export function TaskListItem({ 
  task, 
  client, 
  clients,
  collaborators,
  categories,
  quote, 
  collaboratorQuotes, 
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
  // State for status dropdown
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  // State for hover sub-menu
  const [hoveredStatusId, setHoveredStatusId] = useState<string | null>(null);
  const { toast } = useToast();

  // Ensure T is always reactive to language changes
  const T = useMemo(() => {
    const lang = (i18n as any)[settings.language];
    if (!lang) {
      return { ...i18n.vi };
    }
    return { ...lang };
  }, [settings.language]);
  const StatusIcon = status?.icon;
  const statusSetting = (settings.statusSettings || []).find(s => s.id === task.status);
  const subStatusLabel = statusSetting?.subStatuses.find(ss => ss.id === task.subStatusId)?.label;

  // Ensure deadline and startDate are always Date objects
  let deadline: Date | null = null;
  if (typeof task.deadline === 'string') {
    const d = new Date(task.deadline);
    deadline = isNaN(d.getTime()) ? null : d;
  } else if (task.deadline instanceof Date) {
    deadline = task.deadline;
  }
  let startDate: Date | null = null;
  if (typeof task.startDate === 'string') {
    const d = new Date(task.startDate);
    startDate = isNaN(d.getTime()) ? null : d;
  } else if (task.startDate instanceof Date) {
    startDate = task.startDate;
  }
  const isValidDeadline = deadline instanceof Date && !isNaN(deadline.getTime());
  const isValidStartDate = startDate instanceof Date && !isNaN(startDate.getTime());
  
  // Get all collaborator quotes for this task
  const taskCollaboratorQuotes = useMemo(() => {
    if (!collaboratorQuotes || !task.collaboratorQuotes) return [];
    return task.collaboratorQuotes.map(cq => 
      collaboratorQuotes.find(q => q.id === cq.quoteId)
    ).filter(Boolean) as Quote[];
  }, [collaboratorQuotes, task.collaboratorQuotes]);
  
  const defaultColumns: QuoteColumn[] = [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ];

  const category = useMemo(() => (categories || []).find(c => c.id === task.categoryId), [task.categoryId, categories]);

  const assignedCollaborators = useMemo(() => {
    if (!task.collaboratorIds || task.collaboratorIds.length === 0) return [];
    
    const uniqueCollaboratorIds = [...new Set(task.collaboratorIds)];
    
    return uniqueCollaboratorIds.map(id => collaborators.find(c => c.id === id)).filter(Boolean) as Collaborator[];
  }, [task.collaboratorIds, collaborators]);

  const calculateRowValue = useCallback((item: QuoteItem, column: QuoteColumn, allColumns: QuoteColumn[]) => {
    if (column.rowFormula) {
      try {
        const rowVals: Record<string, number> = {};
        allColumns.forEach(c => {
          if (c.type === 'number' && c.id !== column.id) {
            const val = c.id === 'unitPrice'
              ? Number(item.unitPrice) || 0
              : Number(item.customFields?.[c.id]) || 0;
            rowVals[c.id] = val;
          }
        });
        
        let expr = column.rowFormula;
        Object.entries(rowVals).forEach(([cid, val]) => {
          expr = expr.replaceAll(cid, val.toString());
        });
        
        const result = eval(expr);
        return !isNaN(result) ? Number(result) : 0;
      } catch {
        return 0;
      }
    } else {
      if (column.id === 'unitPrice') {
        return Number(item.unitPrice) || 0;
      } else {
        return Number(item.customFields?.[column.id]) || 0;
      }
    }
  }, []);

  const totalQuote = useMemo(() => {
    if (!quote?.sections) return 0;
    const priceColumn = (quote.columns || defaultColumns).find(col => col.id === 'unitPrice');
    if (!priceColumn) return 0;
    
    return quote.sections.reduce((acc, section) => {
      return acc + (section.items?.reduce((itemAcc, item) => {
        return itemAcc + calculateRowValue(item, priceColumn, quote.columns || defaultColumns);
      }, 0) || 0);
    }, 0);
  }, [quote, defaultColumns, calculateRowValue]);
  
  const totalCollabQuote = useMemo(() => {
    if (!taskCollaboratorQuotes || taskCollaboratorQuotes.length === 0) return 0;
    
    return taskCollaboratorQuotes.reduce((totalAcc, collabQuote) => {
      if (!collabQuote?.sections) return totalAcc;
      
      const unitPriceCol = (collabQuote.columns || defaultColumns).find(col => col.id === 'unitPrice');
      if (!unitPriceCol) return totalAcc;
      
      const quoteTotal = collabQuote.sections.reduce((acc, section) => {
        return acc + (section.items?.reduce((itemAcc, item) => {
          return itemAcc + calculateRowValue(item, unitPriceCol, collabQuote.columns || defaultColumns);
        }, 0) || 0);
      }, 0);
      
      return totalAcc + quoteTotal;
    }, 0);
  }, [taskCollaboratorQuotes, defaultColumns, calculateRowValue]);

  const netTotal = useMemo(() => {
    return totalQuote - totalCollabQuote;
  }, [totalQuote, totalCollabQuote]);
  
  const calculationResults = useMemo(() => {
    if (!quote?.sections) return [];
    
    const results: Array<{
      id: string;
      name: string;
      calculation: string;
      result: number | string;
      type: ColumnCalculationType;
    }> = [];

    (quote.columns || defaultColumns).filter(col => 
      col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number'
    ).forEach(col => {
      if (!col.calculation) return;

      const allValues = quote.sections!.flatMap((section) => 
        (section.items || []).map((item) => calculateRowValue(item, col, quote.columns || defaultColumns))
          .filter((v: number) => !isNaN(v))
      );

      let result: number | string = 0;
      let calculation = '';
      const calcType = col.calculation.type;

      switch (calcType) {
        case 'sum':
          result = allValues.reduce((acc, val) => acc + val, 0);
          calculation = 'Sum';
          break;
        case 'average':
          result = allValues.length ? allValues.reduce((acc, val) => acc + val, 0) / allValues.length : 0;
          calculation = 'Average';
          break;
        // Other cases remain the same...
      }

      results.push({ id: col.id, name: col.name, calculation, result, type: calcType });
    });

    return results;
  }, [quote, defaultColumns, calculateRowValue, T]);

  const collaboratorCalculationResults = useMemo(() => {
    if (!taskCollaboratorQuotes || taskCollaboratorQuotes.length === 0) return [];
    
    const results: Array<{ id: string; name: string; calculation: string; result: number | string; type: ColumnCalculationType; }> = [];

    taskCollaboratorQuotes.forEach((collabQuote) => {
      if (!collabQuote?.sections) return;
      
      (collabQuote.columns || defaultColumns).filter(col => col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number')
      .forEach(col => {
        if (!col.calculation) return;

        const allValues = collabQuote.sections!.flatMap(s => (s.items || []).map(i => calculateRowValue(i, col, collabQuote.columns || defaultColumns)).filter(v => !isNaN(v)));

        let result: number | string = 0;
        if (col.calculation.type === 'sum') {
          result = allValues.reduce((a, b) => a + b, 0);
        }

        const existingResult = results.find(r => r.id === col.id);
        if (!existingResult) {
          results.push({ id: col.id, name: col.name, calculation: 'Sum', result, type: col.calculation.type });
        } else if (typeof existingResult.result === 'number' && typeof result === 'number') {
          existingResult.result += result;
        }
      });
    });

    return results;
  }, [taskCollaboratorQuotes, defaultColumns, calculateRowValue]);


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

  const deadlineColorClass = isValidDeadline ? getDeadlineColor(deadline as Date) : "text-deadline-overdue font-semibold";

  const handleTaskFormSubmit = (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[], taskId: string) => {
    onEditTask(values, quoteColumns, collaboratorQuoteColumns, taskId);
    setIsEditDialogOpen(false);
  };

  const cycleEditDialogSize = useCallback(() => {
    setEditDialogSize(current => (current === 'default' ? 'large' : current === 'large' ? 'fullscreen' : 'default'));
  }, []);

  const copyQuoteToClipboard = useCallback((quoteToCopy: Quote | undefined) => {
    if (!quoteToCopy) return;

    let fullClipboardString = (quoteToCopy.sections || []).map(section => {
      const headers = (quoteToCopy.columns || defaultColumns).map(c => c.name).join('\t');
      const itemRows = section.items.map(item => 
        (quoteToCopy.columns || defaultColumns).map(col => {
          const value = ['description', 'quantity', 'unitPrice'].includes(col.id) ? item[col.id as keyof typeof item] : item.customFields?.[col.id];
          const rawValue = value ?? '';
          return typeof rawValue === 'number' ? rawValue.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US') : String(rawValue).replace(/\n/g, ' ');
        }).join('\t')
      ).join('\n');
      return (section.name ? `${section.name}\n${headers}\n` : `${headers}\n`) + itemRows;
    }).join('\n\n');

    const grandTotal = (quoteToCopy.sections || []).reduce((acc, section) => acc + (section.items || []).reduce((itemAcc, item) => itemAcc + (item.unitPrice || 0), 0), 0);
    const grandTotalString = [...Array(Math.max(0, (quoteToCopy.columns || defaultColumns).length - 1)).fill(''), T.grandTotal, `${grandTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} ${settings.currency}`].filter(Boolean).join('\t');
    fullClipboardString += `\n\n${grandTotalString}`;

    navigator.clipboard.writeText(fullClipboardString.trim()).then(() => {
      toast({ title: T.quoteCopied, description: T.quoteCopiedDesc });
    }).catch(err => {
      console.error("Failed to copy quote: ", err);
      toast({ variant: "destructive", title: T.copyFailed, description: T.copyFailedDesc });
    });
  }, [toast, T, settings, defaultColumns]);


  const renderQuoteTable = (title: string, quoteData: Quote | undefined) => {
    if (!quoteData) return null;
    return (
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
                    {(quoteData.columns || defaultColumns).map(col => (<TableHead key={col.id} className={cn(col.type === 'number' && 'text-right')}>{col.name}</TableHead>))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      {(quoteData.columns || defaultColumns).map(col => {
                        const value = (col.type === 'number' && col.rowFormula) ? calculateRowValue(item, col, quoteData.columns || defaultColumns) : (col.id === 'description' || col.id === 'unitPrice') ? item[col.id as keyof QuoteItem] : item.customFields?.[col.id];
                        const formattedValue = typeof value === 'number' ? value.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US') : String(value ?? '');
                        return <TableCell key={col.id} className={cn(col.type === 'number' && 'text-right')}>{formattedValue}</TableCell>;
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
  }
  
  const visibleColumns = useMemo(() => (settings.dashboardColumns || []).filter(col => col.visible), [settings.dashboardColumns]);

  if (view === 'trash') {
    const deletedDate = new Date(task.deletedAt!);
    const expiryDate = new Date(deletedDate.getTime() + settings.trashAutoDeleteDays * 24 * 60 * 60 * 1000);
    const daysRemaining = differenceInDays(expiryDate, new Date());
  
    return (
      <TableRow>
        <TableCell><div className="flex items-center gap-2"><AlertDialog><AlertDialogTrigger asChild><Button variant="secondary" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{T.delete} Permanently?</AlertDialogTitle><AlertDialogDescription>{T.deletePermanently} {T.task.toLowerCase()} "{task.name}".</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{T.cancel}</AlertDialogCancel><AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => onPermanentDeleteTask(task.id)}>{T.delete} Forever</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><span>{task.name}</span></div></TableCell>
        <TableCell><span>{client?.name}</span></TableCell>
        <TableCell><span>{format(deletedDate, "MMM dd, yyyy")}</span></TableCell>
        <TableCell><span>{daysRemaining > 0 ? `${daysRemaining} days left` : 'Purged soon'}</span></TableCell>
        <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onRestoreTask(task.id)}><ArchiveRestore className="w-4 h-4 mr-2" />{T.taskRestored.replace(' Task','')}</Button></TableCell>
      </TableRow>
    );
  }

  const renderCellContent = (columnId: (typeof visibleColumns)[number]['id']) => {
    switch (columnId) {
        case 'name': {
            const quadrant = task.eisenhowerQuadrant;
            const eisenhowerSchemes = { colorScheme1: { do: '#ef4444', decide: '#3b82f6', delegate: '#f59e42', delete: '#6b7280' }, colorScheme2: { do: '#d8b4fe', decide: '#bbf7d0', delegate: '#fed7aa', delete: '#bfdbfe' }, colorScheme3: { do: '#99f6e4', decide: '#fbcfe8', delegate: '#fde68a', delete: '#c7d2fe' }};
            const scheme = settings?.eisenhowerColorScheme || 'colorScheme1';
            const flagColors = eisenhowerSchemes[scheme] || eisenhowerSchemes['colorScheme1'];
            const flagColor = quadrant ? (flagColors[quadrant] || '#e5e7eb') : '#e5e7eb';
            const flagLabel = quadrant ? quadrant : (T.eisenhower?.none || T.noPriority || 'No priority');
            return (<span className="inline-flex items-center gap-1"><span className="group relative">{quadrant ? <Flag size={16} color={flagColor} fill={flagColor} className="mr-1 drop-shadow" /> : <FlagOff size={16} color="#e5e7eb" className="mr-1 opacity-60 drop-shadow" />}<span className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 mt-2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">{flagLabel}</span></span><span>{task.name}</span></span>);
        }
        case 'client': return <span>{client?.name}</span>;
        case 'category': return <span>{(category?.name && T.categories[category.id as keyof typeof T.categories]) || category?.name || ''}</span>;
        case 'collaborator': return assignedCollaborators.length > 0 ? (<div className="flex gap-1">{assignedCollaborators.slice(0, 3).map((c, i) => (<div key={`${c.id}-${i}`} className="inline-flex items-center gap-1"><div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full"><span className="text-xs font-medium">{c.name.charAt(0)}</span></div><span className="text-sm">{c.name}</span>{i < Math.min(assignedCollaborators.length - 1, 2) && <span className="text-muted-foreground">, </span>}</div>))}{assignedCollaborators.length > 3 && <span className="text-xs text-muted-foreground">+{assignedCollaborators.length - 3} more</span>}</div>) : (<span className="text-muted-foreground">-</span>);
        case 'deadline': return <span className={deadlineColorClass}>{isValidDeadline ? format(deadline as Date, "MMM dd, yyyy") : '-'}</span>;
        case 'status':
          return StatusIcon && status && (
            <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
              <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} asChild>
                <Badge className="inline-flex items-center gap-2 cursor-pointer px-3 py-1 border-transparent hover:opacity-80 transition-opacity max-w-full" style={{ backgroundColor: settings.statusColors[task.status], color: getContrastingTextColor(settings.statusColors[task.status]) }}>
                  <StatusIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="font-medium text-xs truncate">{statusSetting?.label || T.statuses[status.id]}{subStatusLabel && ` • ${subStatusLabel}`}</span>
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent onClick={(e) => e.stopPropagation()} className="w-64 status-dropdown-content">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{T.status || 'Status'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(settings.statusSettings || []).map(s => (
                  <div key={s.id} className="relative" onMouseEnter={() => { if (s.subStatuses && s.subStatuses.length > 0) setHoveredStatusId(s.id); }} onMouseLeave={() => setHoveredStatusId(null)}>
                    {s.subStatuses && s.subStatuses.length > 0 ? (
                      <div className={cn("relative cursor-default select-none rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 flex items-center justify-between group", task.status === s.id && 'font-semibold bg-accent')} tabIndex={0} onClick={() => onTaskStatusChange(task.id, s.id, task.status === s.id ? task.subStatusId : undefined)}>
                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">{task.status === s.id && <div className="w-2 h-2 rounded-full bg-current" />}</span>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: settings.statusColors[s.id] }} /><span>{s.label}</span></div>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </div>
                    ) : (
                      <DropdownMenuRadioItem value={s.id} onClick={() => { onTaskStatusChange(task.id, s.id, undefined); setIsStatusDropdownOpen(false); }} className={cn("flex items-center justify-between group", task.status === s.id && 'font-semibold bg-accent')}>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: settings.statusColors[s.id] }} /><span>{s.label}</span></div>
                      </DropdownMenuRadioItem>
                    )}
                    {s.subStatuses && s.subStatuses.length > 0 && hoveredStatusId === s.id && (
                      <div className="absolute left-full top-0 ml-1 w-48 bg-popover border rounded-md shadow-lg py-1 z-[100] status-sub-menu" onMouseEnter={() => setHoveredStatusId(s.id)} onMouseLeave={() => setHoveredStatusId(null)}>
                        <div onClick={e => { e.stopPropagation(); onTaskStatusChange(task.id, s.id, undefined); setIsStatusDropdownOpen(false); setHoveredStatusId(null); }} className={cn("px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded-sm mx-1", task.status === s.id && !task.subStatusId ? 'font-semibold bg-accent' : 'text-muted-foreground')}>
                          {s.label}
                        </div>
                        {s.subStatuses.map(sub => (
                          <div key={sub.id} onClick={e => { e.stopPropagation(); onTaskStatusChange(task.id, s.id, sub.id); setIsStatusDropdownOpen(false); setHoveredStatusId(null); }} className={cn("px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded-sm mx-1", task.status === s.id && task.subStatusId === sub.id && 'font-semibold bg-accent')}>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full opacity-80" style={{ backgroundColor: settings.statusColors[s.id] }} /><span>{sub.label}</span></div>
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

  const [selectedNav, setSelectedNav] = React.useState<'timeline' | 'price' | 'collaborator' | 'analytics'>('timeline');

  return (
    <>
      <TableRow onClick={() => setIsDetailsOpen(true)} className="cursor-pointer">
        {visibleColumns.map(col => <TableCell key={col.id} className={cn(col.id === 'name' && 'font-medium', col.id === 'priceQuote' && 'text-right font-medium')}>{renderCellContent(col.id)}</TableCell>)}
      </TableRow>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[80vw] max-w-5xl h-[80vh] min-h-[600px] max-h-[90vh] flex flex-col">
          <span className="sr-only"><DialogTitle>{task.name}</DialogTitle></span>
          <div className="flex flex-col gap-1 pb-2 border-b mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-bold leading-tight truncate">{task.name}</span>
              {StatusIcon && status && (<Badge style={{ backgroundColor: settings.statusColors[task.status], color: getContrastingTextColor(settings.statusColors[task.status]) }} className="flex items-center gap-1"><StatusIcon className="h-3 w-3" />{statusSetting?.label || T.statuses[status.id]}{subStatusLabel && <span className="text-xs opacity-80">({subStatusLabel})</span>}</Badge>)}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-muted-foreground text-sm">
              <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {client?.name}</span>
              <span className="flex items-center gap-1"><span className="font-medium">{(category?.name && T.categories[category.id as keyof typeof T.categories]) || category?.name || ''}</span></span>
            </div>
          </div>

          <nav className="flex gap-2 mb-2 border-b pb-2">
            <button className={cn("px-4 py-2 rounded-t text-sm font-medium transition border-b-2", selectedNav === 'timeline' ? 'border-primary text-primary bg-muted' : 'border-transparent text-muted-foreground hover:text-primary')} onClick={() => setSelectedNav('timeline')}>{T.overview ?? 'Overview'}</button>
            <button className={cn("px-4 py-2 rounded-t text-sm font-medium transition border-b-2", selectedNav === 'price' ? 'border-primary text-primary bg-muted' : 'border-transparent text-muted-foreground hover:text-primary')} onClick={() => setSelectedNav('price')}>{T.priceQuote ?? 'Price Quote'}</button>
            <button className={cn("px-4 py-2 rounded-t text-sm font-medium transition border-b-2", selectedNav === 'collaborator' ? 'border-primary text-primary bg-muted' : 'border-transparent text-muted-foreground hover:text-primary')} onClick={() => setSelectedNav('collaborator')} disabled={!taskCollaboratorQuotes || taskCollaboratorQuotes.length === 0}>{T.collaboratorCosts ?? 'Collaborator Quote'}</button>
          </nav>

          <div className="flex-1 min-h-0 max-h-full overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
            {selectedNav === 'timeline' && <div className="space-y-4">
              <Card className="p-4"><h4 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" />{T.overview ?? 'Overview'}</h4><div className="space-y-3"><div className="flex items-center justify-between text-sm"><div><div className="font-medium">{T.startDate ?? 'Start Date'}</div><div className="text-muted-foreground">{isValidStartDate ? format(startDate as Date, "MMM dd, yyyy") : (T.invalidDate ?? 'Invalid Date')}</div></div><div className="text-right"><div className="font-medium">{T.deadline ?? 'Deadline'}</div><div className={cn("text-muted-foreground", deadlineColorClass)}>{isValidDeadline ? format(deadline as Date, "MMM dd, yyyy") : (T.invalidDate ?? 'Invalid Date')}</div></div></div>{isValidDeadline && isValidStartDate && <div className="space-y-2"><Progress value={Math.max(0, Math.min(100, (differenceInDays(new Date(), startDate as Date) / differenceInDays(deadline as Date, startDate as Date)) * 100))} className="h-2" /><div className="flex justify-between text-xs text-muted-foreground"><span>{T.progress ?? 'Progress'}</span><span>{Math.max(0, differenceInDays(new Date(), startDate as Date))} / {differenceInDays(deadline as Date, startDate as Date)} {T.days ?? 'days'}</span></div></div>}</div></Card>
              <Card className="p-4"><h4 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4" />{T.description}</h4><div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">{task.description || <em className="text-muted-foreground/70">{T.noDescription}</em>}</div></Card>
              {(totalQuote > 0 || totalCollabQuote > 0) && <Card className="p-4"><h4 className="font-semibold mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4" />{T.grandTotaltit || 'Financial Summary'}</h4><div className="space-y-2 text-sm">{totalQuote > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{T.priceQuote}:</span><span className="font-medium">{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div>}{totalCollabQuote > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{T.collaboratorCosts}:</span><span className="font-medium text-red-600">-{totalCollabQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div>}<div className="flex justify-between pt-2 border-t border-primary"><span className="font-bold text-primary">{T.netTotal}:</span><span className="font-bold text-primary">{netTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div></div></Card>}
              <div className="grid md:grid-cols-2 gap-4">
                {Array.isArray(task.briefLink) && task.briefLink.length > 0 && <Card className="p-4"><h4 className="font-semibold mb-3 flex items-center gap-2"><LinkIcon className="h-4 w-4" />{T.briefLink ?? 'Brief'}</h4><div className="flex flex-col gap-1 max-h-40 overflow-y-auto">{(task.briefLink || []).slice(0, 5).map((link, idx) => <LinkPreview key={link+idx} url={link} />)}{task.briefLink.length > 5 && <span className="text-xs text-muted-foreground mt-1">+{task.briefLink.length - 5} more...</span>}</div></Card>}
                {Array.isArray(task.driveLink) && task.driveLink.length > 0 && <Card className="p-4"><h4 className="font-semibold mb-3 flex items-center gap-2"><Folder className="h-4 w-4" />{T.driveLink ?? 'Storage'}</h4><div className="flex flex-col gap-1 max-h-40 overflow-y-auto">{(task.driveLink || []).slice(0, 5).map((link, idx) => { const isLocal = link.toLowerCase().startsWith('file:') || /^[a-z]:[\\/]/i.test(link); return isLocal ? <LocalLink key={link+idx} path={link} /> : <LinkPreview key={link+idx} url={link} />; })}{task.driveLink.length > 5 && <span className="text-xs text-muted-foreground mt-1">+{task.driveLink.length - 5} more...</span>}</div></Card>}
                {assignedCollaborators.length > 0 && <Card className="p-4"><h4 className="font-semibold mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4" />{assignedCollaborators.length === 1 ? T.collaborator ?? 'Collaborator' : T.collaborators ?? 'Collaborators'}</h4><div className="space-y-3">{assignedCollaborators.map((c, i) => <div key={`${c.id}-${i}`} className="flex items-center gap-3"><div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full"><span className="text-sm font-medium">{c.name.charAt(0)}</span></div><div><div className="font-medium">{c.name}</div>{c.specialty && <div className="text-xs text-muted-foreground">{c.specialty}</div>}</div></div>)}</div></Card>}
              </div>
            </div>}
            {selectedNav === 'price' && <div className="space-y-4">{quote && quote.sections && quote.sections.length > 0 ? <>{renderQuoteTable(T.priceQuote, quote)}<div className="flex justify-end pt-4 mt-4 border-t"><div className="text-sm space-y-2 w-full max-w-xs">{calculationResults.map(c => <div key={c.id} className="flex justify-between"><span className="font-medium">{c.name} ({c.calculation}):</span><span>{typeof c.result === 'number' ? c.result.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US') : c.result}</span></div>)}<div className="flex justify-between mt-2 pt-2 border-t"><span className="font-semibold">{T.grandTotal}:</span><span className="font-semibold">{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div>{totalCollabQuote > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{T.totalCollaboratorCosts || 'Total Collaborator Costs'}:</span><span className="text-muted-foreground">-{totalCollabQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div>}<div className="flex justify-between mt-2 pt-2 border-t border-primary"><span className="font-bold text-primary">{T.netTotal}:</span><span className="font-bold text-primary">{netTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div><Separator/></div></div></> : <div className="text-muted-foreground text-center py-8">{T.noQuoteData ?? 'No quote data available.'}</div>}</div>}
            {selectedNav === 'collaborator' && <div className="space-y-4">{taskCollaboratorQuotes.length > 0 ? <>{taskCollaboratorQuotes.map((cq, i) => { const collaboratorId = task.collaboratorQuotes?.[i]?.collaboratorId; const c = collaborators.find(collab => collab.id === collaboratorId); return <div key={`${cq.id}-${i}`} className="space-y-2"><div className="flex items-center gap-2 mb-2"><div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full"><span className="text-xs font-medium">{c?.name.charAt(0) || 'C'}</span></div><h5 className="font-medium">{c?.name || `Collaborator ${i + 1}`}</h5>{c?.specialty && <span className="text-xs text-muted-foreground">({c.specialty})</span>}</div>{renderQuoteTable(`${T.collaboratorCosts} - ${c?.name || `Collaborator ${i + 1}`}`, cq)}</div>; })}{<div className="flex justify-end pt-4 mt-4 border-t"><div className="text-sm space-y-2 w-full max-w-xs">{collaboratorCalculationResults.map(c => <div key={c.id} className="flex justify-between"><span className="font-medium">{c.name} ({c.calculation}):</span><span>{typeof c.result === 'number' ? c.result.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US') : c.result}</span></div>)}<div className="flex justify-between mt-2 pt-2 border-t"><span className="font-semibold">{T.totalCollaboratorCosts || 'Total Collaborator Costs'}:</span><span className="font-semibold">{totalCollabQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div>{totalQuote > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{T.grandTotal}:</span><span className="text-muted-foreground">{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div>}<div className="flex justify-between mt-2 pt-2 border-t border-primary"><span className="font-bold text-primary">{T.netTotal}:</span><span className="font-bold text-primary">{netTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span></div><Separator/></div></div>}</> : <div className="text-muted-foreground text-center py-8">{T.noCollaboratorQuoteData ?? 'No collaborator quote data available.'}</div>}</div>}
          </div>

          <div className="flex justify-between items-center pt-4 border-t mt-6">
            <AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-2 border-destructive"><Trash2 className="w-4 h-4 mr-2" />{T.deleteTask}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{T.moveToTrash}?</AlertDialogTitle><AlertDialogDescription>{T.moveToTrashDescription}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{T.cancel}</AlertDialogCancel><AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => onDeleteTask(task.id)}>{T.confirmMoveToTrash}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            <Button variant="outline" size="sm" onClick={() => { setIsDetailsOpen(false); setIsEditDialogOpen(true); }}><Pencil className="w-4 h-4 mr-2" />{T.editTask}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn("max-h-[90vh] overflow-y-auto", { 'sm:max-w-2xl md:max-w-5xl': editDialogSize === 'default', 'sm:max-w-xl': editDialogSize === 'small', 'sm:max-w-7xl': editDialogSize === 'large' })}>
          {/* Nội dung Dialog chỉnh sửa task ở đây */}
        </DialogContent>
      </Dialog>

    </>
  );
}

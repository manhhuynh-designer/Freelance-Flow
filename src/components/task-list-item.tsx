"use client";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { i18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";

import { Flag, FlagOff } from 'lucide-react';

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
    console.log('Language changed to:', settings.language); // Debug log
    const lang = (i18n as any)[settings.language];
    if (!lang) {
      console.warn('Language not found, falling back to vi');
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
  
  // Use first quote for backward compatibility
  // Get all collaborator quotes for this task
  const taskCollaboratorQuotes = useMemo(() => {
    if (!collaboratorQuotes || !task.collaboratorQuotes) return [];
    return task.collaboratorQuotes.map(cq => 
      collaboratorQuotes.find(q => q.id === cq.quoteId)
    ).filter(Boolean) as Quote[];
  }, [collaboratorQuotes, task.collaboratorQuotes]);

  // For backward compatibility with single collaborator
  const collaboratorQuote = taskCollaboratorQuotes[0];
  
  const defaultColumns: QuoteColumn[] = [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ];

  const category = useMemo(() => (categories || []).find(c => c.id === task.categoryId), [task.categoryId, categories]);

  const assignedCollaborators = useMemo(() => {
    if (!task.collaboratorIds || task.collaboratorIds.length === 0) return [];
    
    // Get unique collaborator IDs to avoid duplicates
    const uniqueCollaboratorIds = [...new Set(task.collaboratorIds)];
    
    return uniqueCollaboratorIds.map(id => collaborators.find(c => c.id === id)).filter(Boolean) as Collaborator[];
  }, [task.collaboratorIds, collaborators]);

  // Backward compatibility
  const assignedCollaborator = useMemo(() => {
    if (assignedCollaborators.length > 0) return assignedCollaborators[0];
    return null;
  }, [assignedCollaborators]);

  // Helper function to calculate row value with formula support
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
      // Use normal value if no formula
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
  
  // Calculate total for all collaborator quotes
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

  // Calculate Net Total (Price Quote total - Collaborator total)
  const netTotal = useMemo(() => {
    return totalQuote - totalCollabQuote;
  }, [totalQuote, totalCollabQuote]);
  // Enhanced calculation results that match QuoteManager structure
  const calculationResults = useMemo(() => {
    if (!quote?.sections) return [];
    
    const results: Array<{
      id: string;
      name: string;
      calculation: string;
      result: number | string;
      type: ColumnCalculationType;
    }> = [];

    // Process each column with calculations
    (quote.columns || defaultColumns).filter(col => 
      col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number'
    ).forEach(col => {
      if (!col.calculation) return; // Type guard

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
        case 'min':
          result = allValues.length ? Math.min(...allValues) : 0;
          calculation = 'Min';
          break;
        case 'max':
          result = allValues.length ? Math.max(...allValues) : 0;
          calculation = 'Max';
          break;
        case 'custom':
          try {
            if (col.calculation.formula) {
              // Simple eval for custom formulas - in production, use a proper expression parser
              const formula = col.calculation.formula.replace(/values/g, JSON.stringify(allValues));
              result = eval(formula) || 0;
            } else {
              result = 0;
            }
          } catch {
            result = 0;
          }
          calculation = 'Custom';
          break;
        default:
          return;
      }

      results.push({
        id: col.id,
        name: col.name,
        calculation,
        result,
        type: calcType
      });
    });

    return results;
  }, [quote, defaultColumns, calculateRowValue, T]);

  // Enhanced collaborator calculation results for all collaborator quotes
  const collaboratorCalculationResults = useMemo(() => {
    if (!taskCollaboratorQuotes || taskCollaboratorQuotes.length === 0) return [];
    
    const results: Array<{
      id: string;
      name: string;
      calculation: string;
      result: number | string;
      type: ColumnCalculationType;
    }> = [];

    // Aggregate calculations across all collaborator quotes
    taskCollaboratorQuotes.forEach((collabQuote, index) => {
      if (!collabQuote?.sections) return;
      
      (collabQuote.columns || defaultColumns).filter(col => 
        col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number'
      ).forEach(col => {
        if (!col.calculation) return;

        const allValues = collabQuote.sections!.flatMap((section) => 
          (section.items || []).map((item) => calculateRowValue(item, col, collabQuote.columns || defaultColumns))
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
          case 'min':
            result = allValues.length ? Math.min(...allValues) : 0;
            calculation = 'Min';
            break;
          case 'max':
            result = allValues.length ? Math.max(...allValues) : 0;
            calculation = 'Max';
            break;
          case 'custom':
            try {
              if (col.calculation.formula) {
                const formula = col.calculation.formula.replace(/values/g, JSON.stringify(allValues));
                result = eval(formula) || 0;
              } else {
                result = 0;
              }
            } catch {
              result = 0;
            }
            calculation = 'Custom';
            break;
          default:
            return;
        }

        // Only add unique column results (avoid duplicates across collaborator quotes)
        const existingResult = results.find(r => r.id === col.id);
        if (!existingResult) {
          results.push({
            id: col.id,
            name: col.name,
            calculation,
            result,
            type: calcType
          });
        } else {
          // If it's a sum, add to existing result
          if (calcType === 'sum' && typeof existingResult.result === 'number' && typeof result === 'number') {
            existingResult.result += result;
          }
        }
      });
    });

    return results;
  }, [taskCollaboratorQuotes, defaultColumns, calculateRowValue, T]);


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
    
    const grandTotal = quoteToCopy.sections.reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + (item.unitPrice || 0), 0) || 0), 0);
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


  const renderQuoteTable = (title: string, quoteData: Quote | undefined) => {
    if (!quoteData) return null; // Add this check
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
                  {(quoteData.columns || defaultColumns).map(col => (
                    <TableHead key={col.id} className={cn(col.type === 'number' && 'text-right')}>{col.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    {(quoteData.columns || defaultColumns).map(col => {
                      let displayValue: string | number = '';
                      
                      // Calculate value based on column type and formula
                      if (col.type === 'number' && col.rowFormula) {
                        // Use calculated value from formula
                        displayValue = calculateRowValue(item, col, quoteData.columns || defaultColumns);
                      } else {
                        // Use regular value
                        const value = col.id === 'description' || col.id === 'unitPrice'
                          ? item[col.id as keyof QuoteItem]
                          : item.customFields?.[col.id];
                        displayValue = value ?? '';
                      }

                      let formattedValue: string = '';
                      if (typeof displayValue === 'number') {
                        formattedValue = displayValue.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US');
                      } else {
                        formattedValue = String(displayValue);
                      }

                      return (
                        <TableCell key={col.id} className={cn(col.type === 'number' && 'text-right')}>
                          {formattedValue}
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
  }
  
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
        case 'name': {
            // Eisenhower flag color logic
            const quadrant = task.eisenhowerQuadrant;
            // Eisenhower color schemes (should match settings/page.tsx)
            const eisenhowerSchemes = {
              colorScheme1: {
                do: '#ef4444',
                decide: '#3b82f6',
                delegate: '#f59e42',
                delete: '#6b7280',
              },
              colorScheme2: {
                do: '#d8b4fe',
                decide: '#bbf7d0',
                delegate: '#fed7aa',
                delete: '#bfdbfe',
              },
              colorScheme3: {
                do: '#99f6e4',
                decide: '#fbcfe8',
                delegate: '#fde68a',
                delete: '#c7d2fe',
              },
            };
            const scheme = settings?.eisenhowerColorScheme || 'colorScheme1';
            const flagColors = eisenhowerSchemes[scheme] || eisenhowerSchemes['colorScheme1'];
            const flagColor = quadrant ? (flagColors[quadrant] || '#e5e7eb') : '#e5e7eb';
            // Tooltip text: just the raw key (do/decide/delegate/delete)
            const flagLabel = quadrant ? quadrant : (T.eisenhower?.none || T.noPriority || 'No priority');
            return (
              <span className="inline-flex items-center gap-1">
                {/* Flag icon with tooltip - dùng lucide-react giống Kanban */}
                <span className="group relative">
                  {quadrant ? (
                    <Flag size={16} color={flagColor} fill={flagColor} className="mr-1 drop-shadow" />
                  ) : (
                    <FlagOff size={16} color="#e5e7eb" className="mr-1 opacity-60 drop-shadow" />
                  )}
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 mt-2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                    {flagLabel}
                  </span>
                </span>
                <span>{task.name}</span>
              </span>
            );
        }
        case 'client':
            return <span>{client?.name}</span>;
        case 'category':
            return <span>{(category?.name && T.categories[category.id as keyof typeof T.categories]) || category?.name || ''}</span>;
        case 'collaborator':
            return assignedCollaborators.length > 0 ? (
              <div className="flex gap-1">
                {assignedCollaborators.slice(0, 3).map((collaborator, index) => (
                  <div key={`${collaborator.id}-${index}`} className="inline-flex items-center gap-1">
                    <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full">
                      <span className="text-xs font-medium">{collaborator.name.charAt(0)}</span>
                    </div>
                    <span className="text-sm">{collaborator.name}</span>
                    {index < Math.min(assignedCollaborators.length - 1, 2) && <span className="text-muted-foreground">, </span>}
                  </div>
                ))}
                {assignedCollaborators.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{assignedCollaborators.length - 3} more</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            );
        case 'deadline':
            return <span className={deadlineColorClass}>{isValidDeadline ? format(deadline as Date, "MMM dd, yyyy") : '-'}</span>;
        case 'status':
            return StatusIcon && status && (
              <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
                <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} asChild>
                  <Badge
                    className="inline-flex items-center gap-2 cursor-pointer px-3 py-1 border-transparent hover:opacity-80 transition-opacity max-w-full"
                    style={{ 
                      backgroundColor: settings.statusColors[task.status],
                      color: getContrastingTextColor(settings.statusColors[task.status]) 
                    }}
                  >
                    <StatusIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="font-medium text-xs truncate">
                      {statusSetting?.label || T.statuses[status.id]}
                      {subStatusLabel && ` • ${subStatusLabel}`}
                    </span>
                  </Badge>
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={(e) => e.stopPropagation()} className="w-64 status-dropdown-content">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {T.status || 'Status'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(settings.statusSettings || []).map((s) => {
                    console.log(`Status ${s.label} has ${s.subStatuses?.length || 0} sub-statuses:`, s.subStatuses);
                    return (
                    <div 
                      key={s.id} 
                      className="relative"
                      onMouseEnter={() => {
                        if (s.subStatuses && s.subStatuses.length > 0) {
                          console.log(`Hovering over ${s.label} with ${s.subStatuses.length} sub-statuses`);
                          setHoveredStatusId(s.id);
                        }
                      }}
                      onMouseLeave={() => setHoveredStatusId(null)}
                    >
                      {s.subStatuses && s.subStatuses.length > 0 ? (
                        // Status with sub-statuses - use div to avoid DropdownMenuRadioItem conflicts
                        <div
                          className={cn(
                            "relative cursor-default select-none rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 flex items-center justify-between group",
                            task.status === s.id ? 'font-semibold bg-accent' : ''
                          )}
                          tabIndex={0}
                          onClick={() => {
                            // Has sub-statuses, set main status and keep existing sub-status if same
                            const newSubStatusId = task.status === s.id ? task.subStatusId : undefined;
                            onTaskStatusChange(task.id, s.id, newSubStatusId);
                          }}
                        >
                          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                            {task.status === s.id && (
                              <div className="w-2 h-2 rounded-full bg-current" />
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: settings.statusColors[s.id] }}
                            />
                            <span>{s.label}</span>
                          </div>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </div>
                      ) : (
                        // Status without sub-statuses - use normal DropdownMenuRadioItem
                        <DropdownMenuRadioItem
                          value={s.id}
                          onClick={() => {
                            onTaskStatusChange(task.id, s.id, undefined);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between group",
                            task.status === s.id ? 'font-semibold bg-accent' : ''
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: settings.statusColors[s.id] }}
                            />
                            <span>{s.label}</span>
                          </div>
                        </DropdownMenuRadioItem>
                      )}
                      
                      {/* Hover Sub-menu for sub-statuses */}
                      {s.subStatuses && s.subStatuses.length > 0 && hoveredStatusId === s.id && (
                        <div 
                          className="absolute left-full top-0 ml-1 w-48 bg-popover border rounded-md shadow-lg py-1 z-[100] status-sub-menu"
                          onMouseEnter={() => setHoveredStatusId(s.id)}
                          onMouseLeave={() => setHoveredStatusId(null)}
                        >
                          
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskStatusChange(task.id, s.id, undefined);
                              setIsStatusDropdownOpen(false);
                              setHoveredStatusId(null);
                            }}
                            className={cn(
                              "px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded-sm mx-1",
                              task.status === s.id && !task.subStatusId ? 'font-semibold bg-accent' : 'text-muted-foreground'
                            )}
                          >
                            
                          </div>
                          {s.subStatuses.map((sub) => (
                            <div
                              key={sub.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaskStatusChange(task.id, s.id, sub.id);
                                setIsStatusDropdownOpen(false);
                                setHoveredStatusId(null);
                              }}
                              className={cn(
                                "px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded-sm mx-1",
                                task.status === s.id && task.subStatusId === sub.id ? 'font-semibold bg-accent' : ''
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full opacity-80"
                                  style={{ backgroundColor: settings.statusColors[s.id] }}
                                />
                                <span>{sub.label}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
        case 'priceQuote':
            return <>{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</>;
        default:
            return null;
    }
  };

  // Navigation bar state for details dialog
  const [selectedNav, setSelectedNav] = React.useState<'timeline' | 'price' | 'collaborator' | 'analytics'>('timeline');

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
        <DialogContent className="w-[80vw] max-w-5xl h-[80vh] min-h-[600px] max-h-[90vh] flex flex-col">
          {/* Visually hidden DialogTitle for accessibility */}
          <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
            <DialogTitle>{task.name}</DialogTitle>
          </span>
          {/* --- HEADER: Project Info --- */}
          <div className="flex flex-col gap-1 pb-2 border-b mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-bold leading-tight truncate">{task.name}</span>
              {StatusIcon && status && (
                <Badge 
                  style={{ 
                    backgroundColor: settings.statusColors[task.status],
                    color: getContrastingTextColor(settings.statusColors[task.status]) 
                  }}
                  className="flex items-center gap-1"
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusSetting?.label || T.statuses[status.id]}
                  {subStatusLabel && <span className="text-xs opacity-80">({subStatusLabel})</span>}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" /> {client?.name}
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium">{(category?.name && T.categories[category.id as keyof typeof T.categories]) || category?.name || ''}</span>
              </span>
            </div>
          </div>

          {/* --- NAVIGATION BAR --- */}
          <nav className="flex gap-2 mb-2 border-b pb-2">
            <button
              className={cn(
                "px-4 py-2 rounded-t text-sm font-medium transition border-b-2",
                selectedNav === 'timeline' ? 'border-primary text-primary bg-muted' : 'border-transparent text-muted-foreground hover:text-primary'
              )}
              onClick={() => setSelectedNav('timeline')}
              type="button"
            >{T.overview ?? 'Overview'}</button>
            <button
              className={cn(
                "px-4 py-2 rounded-t text-sm font-medium transition border-b-2",
                selectedNav === 'price' ? 'border-primary text-primary bg-muted' : 'border-transparent text-muted-foreground hover:text-primary'
              )}
              onClick={() => setSelectedNav('price')}
              type="button"
            >{T.priceQuote ?? 'Price Quote'}</button>
            <button
              className={cn(
                "px-4 py-2 rounded-t text-sm font-medium transition border-b-2",
                selectedNav === 'collaborator' ? 'border-primary text-primary bg-muted' : 'border-transparent text-muted-foreground hover:text-primary'
              )}
              onClick={() => setSelectedNav('collaborator')}
              type="button"
              disabled={!taskCollaboratorQuotes || taskCollaboratorQuotes.length === 0}
            >{T.collaboratorCosts ?? 'Collaborator Quote'}</button>
          </nav>

          {/* --- MAIN CONTENT: Scrollable, flush left --- */}
          <div className="flex-1 min-h-0 max-h-full overflow-y-auto pr-2" style={{ scrollbarGutter: 'stable' }}>
            {/* Timeline Section */}
            {selectedNav === 'timeline' && (
              <div className="space-y-4">
                {/* Overview Card with Progress Bar */}
                <Card className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {T.overview ?? 'Overview'}
                  </h4>
                  <div className="space-y-3">
                    {/* Progress visualization */}
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{T.startDate ?? 'Start Date'}</div>
                        <div className="text-muted-foreground">
                          {isValidStartDate ? format(startDate as Date, "MMM dd, yyyy") : (T.invalidDate ?? 'Invalid Date')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{T.deadline ?? 'Deadline'}</div>
                        <div className={cn("text-muted-foreground", deadlineColorClass)}>
                          {isValidDeadline ? format(deadline as Date, "MMM dd, yyyy") : (T.invalidDate ?? 'Invalid Date')}
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    {isValidDeadline && isValidStartDate && (
                      <div className="space-y-2">
                        <Progress 
                          value={Math.max(0, Math.min(100, 
                            (differenceInDays(new Date(), startDate as Date) / 
                             differenceInDays(deadline as Date, startDate as Date)) * 100
                          ))} 
                          className="h-2" 
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{T.progress ?? 'Progress'}</span>
                          <span>
                            {Math.max(0, differenceInDays(new Date(), startDate as Date))} / {" "}
                            {differenceInDays(deadline as Date, startDate as Date)} {T.days ?? 'days'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
                {/* Description Card */}
                <Card className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {T.description}
                  </h4>
                  <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
                    {task.description || <em className="text-muted-foreground/70">{T.noDescription}</em>}
                  </div>
                </Card>
                {/* Financial Summary Card */}
                {(totalQuote > 0 || totalCollabQuote > 0) && (
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {T.grandTotaltit || 'Financial Summary'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      {totalQuote > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{T.priceQuote}:</span>
                          <span className="font-medium">{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                        </div>
                      )}
                      {totalCollabQuote > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{T.collaboratorCosts}:</span>
                          <span className="font-medium text-red-600">-{totalCollabQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-primary">
                        <span className="font-bold text-primary">{T.netTotal}:</span>
                        <span className="font-bold text-primary">{netTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                      </div>
                    </div>
                  </Card>
                )}
                {/* Links & Collaborator Grid Layout */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Brief Links Card */}
                  {Array.isArray(task.briefLink) && task.briefLink.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        {T.briefLink ?? 'Brief'}
                      </h4>
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        {(task.briefLink || []).slice(0, 5).map((link, idx) => (
                          <LinkPreview key={link+idx} url={link} />
                        ))}
                        {task.briefLink.length > 5 && (
                          <span className="text-xs text-muted-foreground mt-1">+{task.briefLink.length - 5} more...</span>
                        )}
                      </div>
                    </Card>
                  )}
                  {/* Storage Links Card */}
                  {Array.isArray(task.driveLink) && task.driveLink.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {T.driveLink ?? 'Storage'}
                      </h4>
                      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                        {(task.driveLink || []).slice(0, 5).map((link, idx) => (
                          <LinkPreview key={link+idx} url={link} />
                        ))}
                        {task.driveLink.length > 5 && (
                          <span className="text-xs text-muted-foreground mt-1">+{task.driveLink.length - 5} more...</span>
                        )}
                      </div>
                    </Card>
                  )}
                  {/* Collaborator Card - Updated for multi-collaborator support */}
                  {assignedCollaborators.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {assignedCollaborators.length === 1 ? (T.collaborator ?? 'Collaborator') : (T.collaborators ?? 'Collaborators')}
                      </h4>
                      <div className="space-y-3">
                        {assignedCollaborators.map((collaborator, index) => (
                          <div key={`${collaborator.id}-${index}`} className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                              <span className="text-sm font-medium">{collaborator.name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="font-medium">{collaborator.name}</div>
                              {collaborator.specialty && (
                                <div className="text-xs text-muted-foreground">{collaborator.specialty}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}
            {/* Price Quote Section */}
            {selectedNav === 'price' && (
              <div className="space-y-4">
                {quote && quote.sections && quote.sections.length > 0 ? (
                  <>
                    {renderQuoteTable(T.priceQuote, quote)}
                    <div className="flex justify-end pt-4 mt-4 border-t">
                      <div className="text-sm space-y-2 w-full max-w-xs">
                        {calculationResults.map(calc => (
                          <div key={calc.id} className="flex justify-between">
                            <span className="font-medium">{calc.name} ({calc.calculation}):</span>
                            <span>{typeof calc.result === 'number' ? calc.result.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US') : calc.result}</span>
                          </div>
                        ))}
                        <div className="flex justify-between mt-2 pt-2 border-t">
                          <span className="font-semibold">{T.grandTotal}:</span>
                          <span className="font-semibold">{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                        </div>
                        {totalCollabQuote > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{T.totalCollaboratorCosts || 'Total Collaborator Costs'}:</span>
                            <span className="text-muted-foreground">-{totalCollabQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                          </div>
                        )}
                        <div className="flex justify-between mt-2 pt-2 border-t border-primary">
                          <span className="font-bold text-primary">{T.netTotal}:</span>
                          <span className="font-bold text-primary">{netTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                        </div>
                        <Separator/>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-center py-8">{T.noQuoteData ?? 'No quote data available.'}</div>
                )}
              </div>
            )}
            {/* Collaborator Quote Section */}
            {selectedNav === 'collaborator' && (
              <div className="space-y-4">
                {taskCollaboratorQuotes.length > 0 ? (
                  <>
                    {taskCollaboratorQuotes.map((collabQuote, index) => {
                      const collaboratorId = task.collaboratorQuotes?.[index]?.collaboratorId;
                      const collaborator = collaborators.find(c => c.id === collaboratorId);
                      
                      return (
                        <div key={`${collabQuote.id}-${index}`} className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center justify-center w-6 h-6 bg-primary/10 rounded-full">
                              <span className="text-xs font-medium">{collaborator?.name.charAt(0) || 'C'}</span>
                            </div>
                            <h5 className="font-medium">{collaborator?.name || `Collaborator ${index + 1}`}</h5>
                            {collaborator?.specialty && (
                              <span className="text-xs text-muted-foreground">({collaborator.specialty})</span>
                            )}
                          </div>
                          {renderQuoteTable(`${T.collaboratorCosts} - ${collaborator?.name || `Collaborator ${index + 1}`}`, collabQuote)}
                        </div>
                      );
                    })}
                    
                    <div className="flex justify-end pt-4 mt-4 border-t">
                      <div className="text-sm space-y-2 w-full max-w-xs">
                        {collaboratorCalculationResults.map(calc => (
                          <div key={calc.id} className="flex justify-between">
                            <span className="font-medium">{calc.name} ({calc.calculation}):</span>
                            <span>{typeof calc.result === 'number' ? calc.result.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US') : calc.result}</span>
                          </div>
                        ))}
                        <div className="flex justify-between mt-2 pt-2 border-t">
                          <span className="font-semibold">{T.totalCollaboratorCosts || 'Total Collaborator Costs'}:</span>
                          <span className="font-semibold">{totalCollabQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                        </div>
                        {totalQuote > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{T.grandTotal}:</span>
                            <span className="text-muted-foreground">{totalQuote.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                          </div>
                        )}
                        <div className="flex justify-between mt-2 pt-2 border-t border-primary">
                          <span className="font-bold text-primary">{T.netTotal}:</span>
                          <span className="font-bold text-primary">{netTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</span>
                        </div>
                        <Separator/>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground text-center py-8">{T.noCollaboratorQuoteData ?? 'No collaborator quote data available.'}</div>
                )}
              </div>
            )}
            {/* Analytics Section */}
            {/* Analytics section removed as requested */}
          </div>

          {/* Actions (Delete/Edit) - always visible below main content */}
          <div className="flex justify-between items-center pt-4 border-t mt-6">
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
                collaboratorQuotes={collaboratorQuotes} 
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

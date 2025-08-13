import React, { useState, useMemo, useCallback } from "react";
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
import { cn } from "@/lib/utils";
import { STATUS_INFO } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getContrastingTextColor } from "@/lib/colors";
import { i18n } from "@/lib/i18n";
import { FileText, Pencil, Link as LinkIcon, Folder, Copy, Trash2, Building2, Calendar, Briefcase } from "lucide-react";
import { RichTextViewer } from "@/components/ui/RichTextViewer";

export interface TaskDetailsDialogProps {
  task: Task;
  client?: Client;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  quote?: Quote;
  collaboratorQuotes?: Quote[]; // Changed to array to handle multiple collaborator quotes
  settings: AppSettings;
  isOpen: boolean;
  onClose?: () => void;
  onEdit?: () => void;
  onDelete?: (taskId: string) => void;
}

// Link Preview Component
function LinkPreview({ url, maxLength = 30, fallback }: { url: string; maxLength?: number; fallback?: string }) {
  const [title, setTitle] = React.useState('');
  const [favicon, setFavicon] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const { toast } = useToast();

  // Check if it's a web URL
  const isWebUrl = React.useMemo(() => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }, [url]);

  // Check if it's a local path (Windows or Unix style)
  const isLocalPath = React.useMemo(() => {
    if (isWebUrl) return false;
    // Windows paths: C:\, D:\, \\server\share, etc.
    // Unix paths: /home, /var, etc.
    return /^([a-zA-Z]:\\|\\\\|\/)/i.test(url) || !url.includes('://');
  }, [url, isWebUrl]);

  React.useEffect(() => {
    // Only fetch metadata for web URLs
    if (!isWebUrl) {
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    
    fetch(`https://www.google.com/s2/favicons?domain=${url}`)
      .then(response => {
        if (!cancelled && response.ok) {
          setFavicon(response.url);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    fetch(url)
      .then(response => {
        if (!cancelled && response.ok) {
          return response.text();
        }
        throw new Error('Failed to fetch');
      })
      .then(html => {
        if (!cancelled) {
          const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const extractedTitle = match?.[1]?.trim();
          if (extractedTitle && extractedTitle.length <= maxLength) {
            setTitle(extractedTitle);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [url, maxLength, isWebUrl]);

  const domain = React.useMemo(() => {
    if (isLocalPath) {
      // For local paths, extract meaningful display name
      try {
        // Handle Windows and Unix paths
        const normalizedPath = url.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);
        
        if (parts.length === 0) return url; // fallback to original
        
        // Get the last meaningful part (filename or folder)
        const lastPart = parts[parts.length - 1];
        
        // If it's a file with extension, return filename
        if (lastPart.includes('.')) {
          return lastPart;
        }
        
        // If it's a folder, return folder name with indication
        return lastPart || parts[parts.length - 2] || url;
      } catch {
        return url; // fallback to original URL
      }
    }
    
    // For web URLs
    try { 
      return new URL(url).hostname; 
    } catch { 
      return url; // fallback to original URL
    }
  }, [url, isLocalPath]);

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    if (isLocalPath) {
      e.preventDefault();
      // Copy local path to clipboard
      navigator.clipboard.writeText(url).then(() => {
        toast({
          title: "Path Copied",
          description: `Local path copied to clipboard: ${url}`,
        });
      }).catch(() => {
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Failed to copy path to clipboard",
        });
      });
    }
    // For web URLs, let the default behavior handle opening in new tab
  }, [isLocalPath, url, toast]);

  const displayText = React.useMemo(() => {
    if (isLocalPath) {
      // For local paths, always show the domain (processed path) or fallback
      return domain || fallback || url;
    }
    // For web URLs, show loading/error states
    return loading ? "Loading..." : error ? (fallback || domain || url) : (title || domain || url);
  }, [isLocalPath, domain, loading, error, fallback, title, url]);

  return (
    <>
      {isWebUrl ? (
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted transition group text-left w-full cursor-pointer"
        >
          {favicon ? (
            <img 
              src={favicon} 
              alt="favicon" 
              className="w-4 h-4 rounded" 
              onError={e => { 
                (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${url}`; 
              }} 
            />
          ) : (
            <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">
              <LinkIcon className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
          <span className="truncate max-w-[180px]" title={isWebUrl ? (title || url) : url}>
            {displayText}
          </span>
          <span className="text-xs text-muted-foreground hidden group-hover:inline">
            {isWebUrl ? domain : 'Click to copy'}
          </span>
        </a>
      ) : (
        <div 
          onClick={handleClick}
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted transition group text-left w-full cursor-pointer"
        >
          <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">
            <Folder className="w-3 h-3 text-muted-foreground" />
          </div>
          <span className="truncate max-w-[180px]" title={url}>
            {displayText}
          </span>
          <span className="text-xs text-muted-foreground hidden group-hover:inline">
            Click to copy
          </span>
        </div>
      )}
    </>
  );
}

// Links Display Component
function LinksDisplay({ 
  links, 
  showAll, 
  setShowAll, 
  title, 
  icon: Icon 
}: { 
  links: string[]; 
  showAll: boolean; 
  setShowAll: (show: boolean) => void; 
  title: string;
  icon: React.ComponentType<any>;
}) {
  const displayLinks = showAll ? links : links.slice(0, 5);
  const hasMoreLinks = links.length > 5;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </h4>
        <span className="text-xs text-muted-foreground">
          {links.length} {links.length === 1 ? 'link' : 'links'}
        </span>
      </div>
      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
        {displayLinks.map((link, idx) => (
          <LinkPreview key={`${link}-${idx}`} url={link} />
        ))}
      </div>
      {hasMoreLinks && (
        <div className="mt-2 pt-2 border-t">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {showAll 
              ? `Show less (hiding ${links.length - 5} links)` 
              : `Show all ${links.length} links (+${links.length - 5} more)`
            }
          </button>
        </div>
      )}
    </Card>
  );
}

export function TaskDetailsDialog({
  task,
  client,
  clients,
  collaborators,
  categories,
  quote,
  collaboratorQuotes,
  settings,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailsDialogProps) {
  const [selectedNav, setSelectedNav] = useState<'timeline' | 'price' | 'collaborator' | 'analytics'>('timeline');
  const [showAllBriefLinks, setShowAllBriefLinks] = useState(false);
  const [showAllDriveLinks, setShowAllDriveLinks] = useState(false);
  const { toast } = useToast();

  // Reset link expansion state when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setShowAllBriefLinks(false);
      setShowAllDriveLinks(false);
    }
  }, [isOpen]);

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

  // Resolve status using user custom settings first, fallback to static STATUS_INFO
  const statusSetting = (settings.statusSettings || []).find(s => s.id === task.status);
  const status = statusSetting || STATUS_INFO.find(s => s.id === task.status);
  const StatusIcon = (status as any)?.icon;
  const subStatusLabel = statusSetting?.subStatuses.find(ss => ss.id === task.subStatusId)?.label;


  // Parse deadline and startDate to Date objects for reliable display and calculation
  const parsedDeadline = useMemo(() => {
    if (!task.deadline) return null;
    const d = typeof task.deadline === 'string' ? new Date(task.deadline) : task.deadline;
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }, [task.deadline]);
  const isValidDeadline = !!parsedDeadline;

  const parsedStartDate = useMemo(() => {
    if (!task.startDate) return null;
    const d = typeof task.startDate === 'string' ? new Date(task.startDate) : task.startDate;
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  }, [task.startDate]);
  const isValidStartDate = !!parsedStartDate;
  
  const defaultColumns: QuoteColumn[] = [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ];

  const category = useMemo(() => (categories || []).find(c => c.id === task.categoryId), [task.categoryId, categories]);

  // Get all collaborator quotes for this task
  const taskCollaboratorQuotes = useMemo(() => {
    if (!collaboratorQuotes || !task.collaboratorQuotes) return [];
    return task.collaboratorQuotes.map(cq => 
      collaboratorQuotes.find(q => q.id === cq.quoteId)
    ).filter(Boolean) as Quote[];
  }, [collaboratorQuotes, task.collaboratorQuotes]);

  // Get all assigned collaborators
  const assignedCollaborators = useMemo(() => {
    if (!task.collaboratorIds || task.collaboratorIds.length === 0) return [];
    
    const uniqueCollaboratorIds = [...new Set(task.collaboratorIds)];
    return uniqueCollaboratorIds.map(id => collaborators.find(c => c.id === id)).filter(Boolean) as Collaborator[];
  }, [task.collaboratorIds, collaborators]);

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
      
      const unitPriceCol = (collabQuote.columns || defaultColumns).find((col: any) => col.id === 'unitPrice');
      if (!unitPriceCol) return totalAcc;
      
      const quoteTotal = collabQuote.sections.reduce((acc: any, section: any) => {
        return acc + (section.items?.reduce((itemAcc: any, item: any) => {
          return itemAcc + calculateRowValue(item, unitPriceCol, collabQuote.columns || defaultColumns);
        }, 0) || 0);
      }, 0);
      
      return totalAcc + quoteTotal;
    }, 0);
  }, [taskCollaboratorQuotes, defaultColumns, calculateRowValue]);

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
    taskCollaboratorQuotes.forEach((collabQuote) => {
      if (!collabQuote?.sections) return;
      
      (collabQuote.columns || defaultColumns).filter((col: any) => 
        col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number'
      ).forEach((col: any) => {
        if (!col.calculation) return;

        const allValues = collabQuote.sections!.flatMap((section: any) => 
          (section.items || []).map((item: any) => calculateRowValue(item, col, collabQuote.columns || defaultColumns))
            .filter((v: number) => !isNaN(v))
        );

        let result: number | string = 0;
        let calculation = '';
        const calcType = col.calculation.type;

        switch (calcType) {
          case 'sum':
            result = allValues.reduce((acc: any, val: any) => acc + val, 0);
            calculation = 'Sum';
            break;
          case 'average':
            result = allValues.length ? allValues.reduce((acc: any, val: any) => acc + val, 0) / allValues.length : 0;
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

  const deadlineColorClass = isValidDeadline ? getDeadlineColor(parsedDeadline as Date) : "text-deadline-overdue font-semibold";

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[80vw] max-w-5xl h-[80vh] min-h-[600px] max-h-[90vh] flex flex-col">
        {/* Visually hidden DialogTitle for accessibility */}
  <span className="sr-only">
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
                {statusSetting?.label || (status && (T.statuses as any)?.[status.id]) || task.status}
                {subStatusLabel && <span className="text-xs opacity-80">({subStatusLabel})</span>}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-muted-foreground text-sm">
            <span className="flex items-center gap-1">
              <Building2 className="h-4 w-4" /> {client?.name}
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">{(category?.name && T.categories && (T.categories as any)[category.id]) || category?.name || ''}</span>
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
  <div className="flex-1 min-h-0 max-h-full overflow-y-auto pr-2 scrollbar-gutter-stable">
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
                        {isValidStartDate ? format(parsedStartDate as Date, "MMM dd, yyyy") : (T.invalidDate ?? 'Invalid Date')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{T.deadline ?? 'Deadline'}</div>
                      <div className={cn("text-muted-foreground", deadlineColorClass)}>
                        {isValidDeadline ? format(parsedDeadline as Date, "MMM dd, yyyy") : (T.invalidDate ?? 'Invalid Date')}
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  {isValidDeadline && isValidStartDate && (
                    <div className="space-y-2">
                      <Progress 
                        value={Math.max(0, Math.min(100, 
                          (differenceInDays(new Date(), parsedStartDate as Date) / 
                           differenceInDays(parsedDeadline as Date, parsedStartDate as Date)) * 100
                        ))} 
                        className="h-2" 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{T.progress ?? 'Progress'}</span>
                        <span>
                          {Math.max(0, differenceInDays(new Date(), parsedStartDate as Date))} / {" "}
                          {differenceInDays(parsedDeadline as Date, parsedStartDate as Date)} {T.days ?? 'days'}
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
                <div className="text-sm text-muted-foreground rounded-md">
                  {task.description ? (
                    <RichTextViewer content={task.description} className="bg-muted/30 p-3 rounded-md" />
                  ) : (
                    <div className="bg-muted/30 p-3 rounded-md">
                        <em className="text-muted-foreground/70">{T.noDescription}</em>
                    </div>
                  )}
                </div>
              </Card>
              {/* Links & Collaborator Grid Layout */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Brief Links Card */}
                {Array.isArray(task.briefLink) && task.briefLink.length > 0 && (
                  <LinksDisplay 
                    links={task.briefLink}
                    showAll={showAllBriefLinks}
                    setShowAll={setShowAllBriefLinks}
                    title={T.briefLink ?? 'Brief'}
                    icon={LinkIcon}
                  />
                )}
                {/* Storage Links Card */}
                {Array.isArray(task.driveLink) && task.driveLink.length > 0 && (
                  <LinksDisplay 
                    links={task.driveLink}
                    showAll={showAllDriveLinks}
                    setShowAll={setShowAllDriveLinks}
                    title={T.driveLink ?? 'Storage'}
                    icon={Folder}
                  />
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
                      <Separator/>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground text-center py-8">{T.noCollaboratorQuoteData ?? 'No collaborator quote data available.'}</div>
              )}
            </div>
          )}
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
                  onClick={() => {
                    try {
                      if (onDelete) {
                        onDelete(task.id);
                      }
                      onClose && onClose();
                    } catch (error) {
                      console.error('Error deleting task:', error);
                    }
                  }}
                >
                  {T.confirmMoveToTrash}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                // Trigger parent edit (which sets isEditingTask true)
                // Do NOT call onClose here so selectedTask remains for the edit dialog
                onEdit?.();
              } catch (error) {
                console.error('Error opening edit dialog:', error);
              }
            }}
          >
            <Pencil className="w-4 h-4 mr-2" />
            {T.editTask}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

export interface TaskDetailsDialogProps {
  task: Task;
  client?: Client;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  quote?: Quote;
  collaboratorQuote?: Quote;
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (taskId: string) => void;
}

// Link Preview Component
function LinkPreview({ url, maxLength = 30, fallback }: { url: string; maxLength?: number; fallback?: string }) {
  const [title, setTitle] = React.useState<string>('');
  const [favicon, setFavicon] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
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

export function TaskDetailsDialog({
  task,
  client,
  clients,
  collaborators,
  categories,
  quote,
  collaboratorQuote,
  settings,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: TaskDetailsDialogProps) {
  const [selectedNav, setSelectedNav] = useState<'timeline' | 'price' | 'collaborator' | 'analytics'>('timeline');
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

  const status = STATUS_INFO.find(s => s.id === task.status);
  const StatusIcon = status?.icon;
  const statusSetting = (settings.statusSettings || []).find(s => s.id === task.status);
  const subStatusLabel = statusSetting?.subStatuses.find(ss => ss.id === task.subStatusId)?.label;

  const isValidDeadline = task.deadline instanceof Date && !isNaN(task.deadline.getTime());
  const isValidStartDate = task.startDate instanceof Date && !isNaN(task.startDate.getTime());
  
  const defaultColumns: QuoteColumn[] = [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ];

  const category = useMemo(() => (categories || []).find(c => c.id === task.categoryId), [task.categoryId, categories]);

  const assignedCollaborator = useMemo(() => {
    if (!task.collaboratorId) return null;
    return collaborators.find(c => c.id === task.collaboratorId) || null;
  }, [task.collaboratorId, collaborators]);

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
  
  const totalCollabQuote = useMemo(() => {
    if (!collaboratorQuote?.sections) return 0;
    const unitPriceCol = (collaboratorQuote.columns || defaultColumns).find(col => col.id === 'unitPrice');
    if (!unitPriceCol) return 0;
    
    return collaboratorQuote.sections.reduce((acc, section) => {
      return acc + (section.items?.reduce((itemAcc, item) => {
        return itemAcc + calculateRowValue(item, unitPriceCol, collaboratorQuote.columns || defaultColumns);
      }, 0) || 0);
    }, 0);
  }, [collaboratorQuote, defaultColumns, calculateRowValue]);

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

  // Enhanced collaborator calculation results
  const collaboratorCalculationResults = useMemo(() => {
    if (!collaboratorQuote?.sections) return [];
    
    const results: Array<{
      id: string;
      name: string;
      calculation: string;
      result: number | string;
      type: ColumnCalculationType;
    }> = [];

    (collaboratorQuote.columns || defaultColumns).filter(col => 
      col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number'
    ).forEach(col => {
      if (!col.calculation) return;

      const allValues = collaboratorQuote.sections!.flatMap((section) => 
        (section.items || []).map((item) => calculateRowValue(item, col, collaboratorQuote.columns || defaultColumns))
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

      results.push({
        id: col.id,
        name: col.name,
        calculation,
        result,
        type: calcType
      });
    });

    return results;
  }, [collaboratorQuote, defaultColumns, calculateRowValue, T]);

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

  const deadlineColorClass = isValidDeadline ? getDeadlineColor(task.deadline as Date) : "text-deadline-overdue font-semibold";

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
            disabled={!collaboratorQuote || !collaboratorQuote.sections || collaboratorQuote.sections.length === 0}
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
                        {isValidStartDate ? format(task.startDate, "MMM dd, yyyy") : (T.invalidDate ?? 'Invalid Date')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{T.deadline ?? 'Deadline'}</div>
                      <div className={cn("text-muted-foreground", deadlineColorClass)}>
                        {isValidDeadline ? format(task.deadline, "MMM dd, yyyy") : (T.invalidDate ?? 'Invalid Date')}
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  {isValidDeadline && isValidStartDate && (
                    <div className="space-y-2">
                      <Progress 
                        value={Math.max(0, Math.min(100, 
                          (differenceInDays(new Date(), new Date(task.startDate)) / 
                           differenceInDays(new Date(task.deadline), new Date(task.startDate))) * 100
                        ))} 
                        className="h-2" 
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{T.progress ?? 'Progress'}</span>
                        <span>
                          {Math.max(0, differenceInDays(new Date(), new Date(task.startDate)))} / {" "}
                          {differenceInDays(new Date(task.deadline), new Date(task.startDate))} {T.days ?? 'days'}
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
                {/* Collaborator Card */}
                {assignedCollaborator && (
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {T.collaborator ?? 'Collaborator'}
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                        <span className="text-sm font-medium">{assignedCollaborator.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium">{assignedCollaborator.name}</div>
                        {assignedCollaborator.specialty && (
                          <div className="text-xs text-muted-foreground">{assignedCollaborator.specialty}</div>
                        )}
                      </div>
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
              {collaboratorQuote && collaboratorQuote.sections && collaboratorQuote.sections.length > 0 ? (
                <>
                  {renderQuoteTable(T.collaboratorCosts, collaboratorQuote)}
                  <div className="flex justify-end pt-4 mt-4 border-t">
                    <div className="text-sm space-y-2 w-full max-w-xs">
                      {collaboratorCalculationResults.map(calc => (
                        <div key={calc.id} className="flex justify-between">
                          <span className="font-medium">{calc.name} ({calc.calculation}):</span>
                          <span>{typeof calc.result === 'number' ? calc.result.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US') : calc.result}</span>
                        </div>
                      ))}
                      <div className="flex justify-between mt-2 pt-2 border-t">
                        <span className="font-semibold">{T.collaboratorCosts}:</span>
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
                  onClick={() => onDelete(task.id)}
                >
                  {T.confirmMoveToTrash}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              {T.editTask}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

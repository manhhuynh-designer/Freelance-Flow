"use client";

import * as React from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  PlusCircle, 
  Copy, 
  FolderPlus, 
  SplitSquareVertical,
  Calculator,
  FileText,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { QuoteSectionComponent } from "./quote-section-improved";
import { QuoteSuggestion } from "./quote-suggestion";
import type { QuoteColumn, QuoteTemplate, AppSettings } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { vi, en } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Helper function to create valid timeline data for new items
const createInitialTimelineData = (startDate?: Date, endDate?: Date, itemIndex = 0, totalItems = 1) => {
  const defaultStart = startDate || new Date();
  const defaultEnd = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  
  const totalDays = Math.ceil((defaultEnd.getTime() - defaultStart.getTime()) / (1000 * 60 * 60 * 24));
  const itemDuration = Math.max(1, Math.floor(totalDays / totalItems));
  
  const startOffset = itemIndex * itemDuration;
  const endOffset = Math.min(startOffset + itemDuration, totalDays);
  
  const itemStart = new Date(defaultStart.getTime() + startOffset * 24 * 60 * 60 * 1000);
  const itemEnd = new Date(defaultStart.getTime() + endOffset * 24 * 60 * 60 * 1000);
  
  return JSON.stringify({
    start: itemStart.toISOString(),
    end: itemEnd.toISOString(),
    color: `hsl(${(itemIndex * 60) % 360}, 60%, 55%)`
  });
};

type QuoteManagerProps = {
  control: any;
  form: any;
  fieldArrayName: string; // Updated to accept any string for dynamic fields
  columns: QuoteColumn[];
  setColumns: React.Dispatch<React.SetStateAction<QuoteColumn[]>>;
  title: string;
  quoteTemplates?: QuoteTemplate[];
  settings: AppSettings;
  taskDescription?: string;
  taskCategory?: string;
  onApplySuggestion?: (items: any[]) => void;
  onCopyFromQuote?: (e?: React.MouseEvent) => void;
  showCopyFromQuote?: boolean;
  taskStartDate?: Date;
  taskEndDate?: Date;
  // Controlled grand total formula (optional)
  grandTotalFormula?: string;
  onGrandTotalFormulaChange?: (v: string) => void;
};

export const QuoteManager = ({
  control,
  form,
  fieldArrayName,
  columns,
  setColumns,
  title,
  quoteTemplates = [],
  settings,
  taskDescription = "",
  taskCategory = "",
  onApplySuggestion,
  onCopyFromQuote,
  showCopyFromQuote = false,
  taskStartDate,
  taskEndDate,
  grandTotalFormula,
  onGrandTotalFormulaChange,
}: QuoteManagerProps) => {
  // Áp dụng cách lấy ngôn ngữ đúng theo cấu trúc i18n.ts mới
  const T = settings.language === 'en' ? en : vi;
  // Language setup completed

  const [templateToApply, setTemplateToApply] = React.useState<QuoteTemplate | null>(null);
  const [activeTab, setActiveTab] = React.useState("sections");
  const [isSuggestDialogOpen, setIsSuggestDialogOpen] = React.useState(false);
  
  // Paste options state
  const [pendingPasteData, setPendingPasteData] = React.useState<{
    sectionIndex: number;
    text: string;
    parsedItems: any[];
    parsedColumns: QuoteColumn[];
  } | null>(null);
  const [isPasteOptionsDialogOpen, setIsPasteOptionsDialogOpen] = React.useState(false);
  
  // Undo state for paste operations
  const [undoBackup, setUndoBackup] = React.useState<{
    columns: QuoteColumn[];
    sections: any[];
    sectionIndex: number;
    timeoutId?: NodeJS.Timeout;
  } | null>(null);
  
  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: fieldArrayName,
  });

  const watchedSections = useWatch({
    control,
    name: fieldArrayName,
  });

  // Watch all collaborator quotes for realtime Net Total updates in price quotes
  // This ensures that when users edit Collaborator Costs in collaborator tabs,
  // the Net Total in Price Quotes tab updates immediately.
  // Note: our forms store collaborator data under collaboratorQuotes[].sections
  const watchedCollaboratorQuotes = useWatch({
    control,
    name: "collaboratorQuotes",
  });

  const { toast } = useToast();

  // Summary and calculations - Redesigned to avoid duplicates and include rowFormula values
  const calculationResults = React.useMemo(() => {
    const results: Array<{
      id: string;
      name: string;
      calculation: string;
      result: number | string;
      type: 'sum' | 'average' | 'min' | 'max' | 'custom';
    }> = [];

    // Process each column with calculations
    columns.filter(col => col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number').forEach(col => {
      if (!col.calculation) return; // Type guard

      const allValues = (watchedSections || []).flatMap((section: any) => 
        (section.items || []).map((item: any) => {
          // Check if this column has rowFormula
          if (col.rowFormula) {
            try {
              // Calculate value based on rowFormula and current row values
              const rowVals: Record<string, number> = {};
              columns.forEach(c => {
                if (c.type === 'number' && c.id !== col.id) {
                  const val = ['description', 'unitPrice'].includes(c.id)
                    ? Number(item[c.id]) || 0
                    : Number(item.customFields?.[c.id]) || 0;
                  rowVals[c.id] = val;
                }
              });
              
              // Replace column IDs in formula with actual values
              let expr = col.rowFormula;
              Object.entries(rowVals).forEach(([cid, val]) => {
                expr = expr.replaceAll(cid, val.toString());
              });
              
              // eslint-disable-next-line no-eval
              const result = eval(expr);
              return !isNaN(result) ? Number(result) : 0;
            } catch {
              return 0; // Default to 0 if formula fails
            }
          } else {
            // Use normal value if no formula
            if (col.id === 'unitPrice') return Number(item.unitPrice) || 0;
            return Number(item.customFields?.[col.id]) || 0;
          }
        }).filter((v: number) => !isNaN(v))
      );

      let result: number | string = 0;
      let calculation = '';
      const calcType = col.calculation.type;

      // Skip 'none' type calculations
      if (calcType === 'none') return;

      switch (calcType) {
        case 'sum':
          result = allValues.reduce((acc: number, v: number) => acc + v, 0);
          calculation = T.sum || 'Tổng';
          break;
        case 'average':
          result = allValues.length ? (allValues.reduce((acc: number, v: number) => acc + v, 0) / allValues.length) : 0;
          calculation = T.average || 'Trung bình';
          break;
        case 'min':
          result = allValues.length ? Math.min(...allValues) : 0;
          calculation = T.minimum || 'Nhỏ nhất';
          break;
        case 'max':
          result = allValues.length ? Math.max(...allValues) : 0;
          calculation = T.maximum || 'Lớn nhất';
          break;
        case 'custom':
          if (col.calculation.formula) {
            try {
              let expr = col.calculation.formula;
              const colIds = expr.match(/col\w+/g) || [];
              colIds.forEach(cid => {
                const c = columns.find(c => c.id === cid);
                if (c) {
                  const vals = allValues.filter((v: number) => !isNaN(v));
                  const sum = vals.reduce((acc: number, v: number) => acc + v, 0);
                  expr = expr.replaceAll(cid, sum.toString());
                }
              });
              result = eval(expr);
              calculation = T.customFormula || 'Tùy chỉnh';
            } catch {
              result = T.error || 'Lỗi';
              calculation = T.customFormula || 'Tùy chỉnh';
            }
          }
          break;
      }

      results.push({
        id: col.id,
        name: col.name,
        calculation,
        result,
        type: calcType as 'sum' | 'average' | 'min' | 'max' | 'custom'
      });
    });

    if (typeof window !== 'undefined') {
      // Calculation results computed successfully
    }
    return results;
  }, [watchedSections, columns]);

  // Custom formula for Grand Total
  const [innerGrandTotalFormula, setInnerGrandTotalFormula] = React.useState('');
  const [grandTotalError, setGrandTotalError] = React.useState('');

  // Use controlled value if provided
  const effectiveFormula = (grandTotalFormula ?? innerGrandTotalFormula);

  // priceSum: sum of all price columns (including formula-calculated values)
  const priceSum = React.useMemo(() => {
    // Only calculate sum of unitPrice column (Price column)
    const priceColumn = columns.find(col => col.id === 'unitPrice');
    if (!priceColumn) return 0;
    
    return (watchedSections || []).reduce((acc: number, section: any) =>
      acc + (section.items?.reduce((itemAcc: number, item: any) => {
        let value = 0;
        
        // Check if unitPrice column has a row formula
        if (priceColumn.rowFormula) {
          try {
            // Calculate value based on rowFormula and current row values
            const rowVals: Record<string, number> = {};
            columns.forEach(c => {
              if (c.type === 'number' && c.id !== priceColumn.id) {
                const val = ['description', 'unitPrice'].includes(c.id)
                  ? Number(item[c.id]) || 0
                  : Number(item.customFields?.[c.id]) || 0;
                rowVals[c.id] = val;
              }
            });
            
            // Replace column IDs in formula with actual values
            let expr = priceColumn.rowFormula;
            Object.entries(rowVals).forEach(([cid, val]) => {
              expr = expr.replaceAll(cid, val.toString());
            });
            
            // eslint-disable-next-line no-eval
            const result = eval(expr);
            value = !isNaN(result) ? Number(result) : 0;
          } catch {
            value = 0; // Default to 0 if formula fails
          }
        } else {
          // Use normal unitPrice value if no formula
          value = Number(item.unitPrice) || 0;
        }
        
        return itemAcc + value;
      }, 0) || 0), 0);
  }, [watchedSections, columns]);

  // collabSum: sum of all collaborator unitPrice (including formula-calculated values)
  // This calculates realtime with watchedCollaboratorSections for accurate Net Total updates
  const collabSum = React.useMemo(() => {
    // Aggregate collaborator costs across ALL collaborator quotes in the form
    const allCollabQuotes = watchedCollaboratorQuotes ?? form?.getValues?.('collaboratorQuotes') ?? [];
    if (!Array.isArray(allCollabQuotes) || allCollabQuotes.length === 0) return 0;

    try {
      const total = allCollabQuotes.reduce((quotesAcc: number, q: any) => {
        const sections = Array.isArray(q?.sections) ? q.sections : [];
        const sectionSum = sections.reduce((secAcc: number, section: any) => {
          const items = Array.isArray(section?.items) ? section.items : [];
          const itemsSum = items.reduce((itemAcc: number, item: any) => {
            // For collaborator context, prefer unitPrice; if a rowFormula is set on current columns
            // and this instance is rendering collaborator sections, evaluate it.
            if (fieldArrayName === 'collaboratorSections') {
              const unitPriceCol = columns.find(col => col.id === 'unitPrice');
              if (unitPriceCol?.rowFormula) {
                try {
                  const rowVals: Record<string, number> = {};
                  columns.forEach(c => {
                    if (c.type === 'number' && c.id !== 'unitPrice') {
                      const val = ['description', 'unitPrice'].includes(c.id)
                        ? Number(item[c.id]) || 0
                        : Number(item.customFields?.[c.id]) || 0;
                      rowVals[c.id] = val;
                    }
                  });
                  let expr = unitPriceCol.rowFormula;
                  Object.entries(rowVals).forEach(([cid, val]) => {
                    expr = expr.replaceAll(cid, val.toString());
                  });
                  // eslint-disable-next-line no-eval
                  const result = eval(expr);
                  return itemAcc + (!isNaN(result) ? Number(result) : 0);
                } catch {
                  return itemAcc + (Number(item.unitPrice) || 0);
                }
              }
            }
            return itemAcc + (Number(item.unitPrice) || 0);
          }, 0);
          return secAcc + itemsSum;
        }, 0);
        return quotesAcc + sectionSum;
      }, 0);

      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log(`[QuoteManager] collabSum updated: ${total} (fieldArrayName: ${fieldArrayName})`);
      }
      return total;
    } catch {
      return 0;
    }
  }, [watchedCollaboratorQuotes, form, fieldArrayName, columns]);

  // Grand Total: custom formula or priceSum
  const grandTotal = React.useMemo(() => {
    const formulaSrc = effectiveFormula;
    if (formulaSrc && formulaSrc.trim() !== '') {
      try {
        let formula = formulaSrc;
        
        // Auto-add + between adjacent variables (e.g., {QuantitySum}{PriceAvg} becomes {QuantitySum}+{PriceAvg})
        formula = formula.replace(/(\})\s*(\{)/g, '}+{');
        
        // Support old system variables for backward compatibility only
        formula = formula
          .replace(/\{Price\}/g, priceSum.toString())
          .replace(/\{Collab\}/g, collabSum.toString())
          .replace(/\{P\}/g, priceSum.toString())
          .replace(/\{C\}/g, collabSum.toString())
          .replace(/\{\s*priceSum\s*\}/g, priceSum.toString())
          .replace(/\{\s*collabSum\s*\}/g, collabSum.toString());
        
        // Support column calculation results using column names
        calculationResults.forEach((calc, index) => {
          const value = typeof calc.result === 'number' ? calc.result : 0;
          const varName = calc.name.replace(/\s+/g, '');
          // Use clean variable names without suffix
          formula = formula.replaceAll(`{${varName}}`, value.toString());
          // Also support old formats for backward compatibility
          formula = formula.replaceAll(`{${varName}Calc}`, value.toString());
          formula = formula.replaceAll(`{${String.fromCharCode(65 + index)}}`, value.toString());
          formula = formula.replaceAll(`{${calc.id}}`, value.toString());
        });
        
        // Note: Column totals without calculations are no longer supported
        // Only calculation results and system variables (Price, Collab) are available
        
        // eslint-disable-next-line no-eval
        const result = eval(formula);
        setGrandTotalError('');
        if (typeof result === 'number' && !isNaN(result)) return result;
        setGrandTotalError(T.invalidFormula || 'Công thức không hợp lệ hoặc không trả về số.');
        return priceSum;
      } catch (e) {
        setGrandTotalError(T.invalidFormula || 'Công thức không hợp lệ.');
        return priceSum;
      }
    }
    setGrandTotalError('');
    return priceSum;
  }, [effectiveFormula, priceSum, collabSum, watchedSections, columns, calculationResults]);

  // Net Total: Grand Total - collabSum
  // This automatically updates when collaborator costs change due to watchedCollaboratorSections
  const netTotal = grandTotal - collabSum;

  // Separate sum totals and other calculations for better organization
  const sumTotals = React.useMemo(() => {
    return calculationResults.filter(calc => calc.type === 'sum');
  }, [calculationResults]);

  const otherCalculations = React.useMemo(() => {
    return calculationResults.filter(calc => calc.type !== 'sum');
  }, [calculationResults]);

  // Event handlers
  const handleApplyTemplate = () => {
    if (!templateToApply) return;
    
    const sectionsWithIds = templateToApply.sections.map(s => ({
      ...s,
      id: s.id || `section-tpl-${Date.now()}-${Math.random()}`,
      items: s.items.map(item => ({
        ...item,
        id: `item-tpl-${Date.now()}-${Math.random()}`,
        customFields: item.customFields || {}
      }))
    }));
    
    form.setValue(fieldArrayName, sectionsWithIds);
    setColumns(templateToApply.columns || columns);
    setTemplateToApply(null);
    
    toast({
      title: T.templateApplied || "Template Applied",
      description: T.templateAppliedDesc || "Template has been applied successfully"
    });
  };

  const handleAddSection = () => {
    appendSection({
      id: `section-${Date.now()}`,
      name: T.untitledSection || "Untitled Section",
      items: [{ 
        description: "", 
        unitPrice: 0, 
        customFields: { 
          timeline: createInitialTimelineData(taskStartDate, taskEndDate, 0, 1)
        } 
      }]
    });
  };

  const handleAddColumn = (newColumn: Omit<QuoteColumn, 'id'>) => {
    const newId = `custom_${Date.now()}`;
    const columnWithId = { id: newId, ...newColumn };
    setColumns(prev => [...prev, columnWithId]);
    
    // Add default values to existing items
    (form.getValues(fieldArrayName) || []).forEach((section: any, sectionIndex: number) => {
      section.items.forEach((_: any, itemIndex: number) => {
        form.setValue(
          `${fieldArrayName}.${sectionIndex}.items.${itemIndex}.customFields.${newId}`,
          newColumn.type === 'number' ? 0 : 
          newColumn.type === 'date' ? null : ''
        );
      });
    });
    
    toast({
      title: T.columnAdded || "Column Added",
      description: `${newColumn.name} ${T.column || "column"} ${T.hasBeenAdded || "has been added"}`
    });
  };

  const handleUpdateColumnCalculation = (colId: string, calculation: { type: string; formula?: string }) => {
    setColumns(prev => prev.map(col => 
      col.id === colId ? { 
        ...col, 
        calculation: {
          type: calculation.type as any,
          formula: calculation.formula
        }
      } : col
    ));
  };

  const handleEditColumn = (updatedColumn: QuoteColumn) => {
    setColumns(prev => prev.map(col => 
      col.id === updatedColumn.id ? updatedColumn : col
    ));
  };

  const handleDeleteColumn = (columnToDelete: QuoteColumn) => {
    setColumns(prev => prev.filter(col => col.id !== columnToDelete.id));
    
    // Remove column data from existing items
    const sections = form.getValues(fieldArrayName);
    (sections || []).forEach((section: any, sectionIndex: number) => {
      section.items.forEach((_: any, itemIndex: number) => {
        if (section.items[itemIndex].customFields) {
          const newCustomFields = { ...section.items[itemIndex].customFields };
          delete newCustomFields[columnToDelete.id];
          form.setValue(
            `${fieldArrayName}.${sectionIndex}.items.${itemIndex}.customFields`,
            newCustomFields
          );
        }
      });
    });
    
    toast({
      title: T.columnDeleted || "Column Deleted",
      description: `${columnToDelete.name} ${T.column || "column"} ${T.hasBeenRemoved || "has been removed"}`
    });
  };

  const handleMoveColumn = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    
    setColumns(currentColumns => {
      const newColumns = [...currentColumns];
      const temp = newColumns[index];
      newColumns[index] = newColumns[newIndex];
      newColumns[newIndex] = temp;
      return newColumns;
    });
  };

  // Function to handle undo paste operation
  const handleUndoPaste = React.useCallback(() => {
    console.log('handleUndoPaste called, checking current undoBackup...');
    
    // Use setTimeout to avoid setState during render
    setTimeout(() => {
      // Get current undoBackup state directly from setUndoBackup
      setUndoBackup(currentBackup => {
        console.log('Current undoBackup in callback:', currentBackup);
        
        if (!currentBackup) {
          console.log('No undo backup available');
          toast({
            title: T.undoAction || "Không có hoàn tác",
            description: T.undoAction || "Không có thao tác gần đây để hoàn tác",
            variant: "destructive"
          });
          return currentBackup; // Return unchanged
        }
        
        try {
          // Clear the timeout if it exists
          if (currentBackup.timeoutId) {
            clearTimeout(currentBackup.timeoutId);
          }
          
          console.log('Restoring backup columns:', currentBackup.columns);
          console.log('Restoring backup sections:', currentBackup.sections);
          
          // Restore columns first
          setColumns(currentBackup.columns);
          
          // Restore sections with complete data structure
          // Use setTimeout to ensure columns are set before sections
          setTimeout(() => {
            form.setValue(fieldArrayName, currentBackup.sections);
            console.log('Sections restored successfully');
          }, 10);
          
          toast({
            title: T.undoSuccess || "Hoàn tác thành công",
            description: T.undoSuccessDesc || "Đã khôi phục trạng thái trước khi dán"
          });
          
          console.log('Undo completed successfully');
          
          // Return null to clear the backup
          return null;
        } catch (error) {
          console.error('Undo failed:', error);
          toast({
            variant: 'destructive',
            title: T.undoFailed || "Hoàn tác thất bại",
            description: T.undoFailedDesc || "Không thể khôi phục trạng thái trước đó"
          });
          return currentBackup; // Return unchanged on error
        }
      });
    }, 0); // Execute on next tick
  }, [setColumns, form, fieldArrayName, toast, T]);

  // Helper function for better header detection
  const detectHeaders = React.useCallback((firstRow: string[], allRows: string[][]) => {
    // Multiple criteria for header detection
    const criteria = {
      hasNonNumeric: firstRow.some(cell => {
        const trimmed = cell.trim();
        return trimmed !== '' && isNaN(parseFloat(trimmed)) && trimmed.length > 1;
      }),
      hasTypicalHeaders: firstRow.some(cell => {
        const lower = cell.toLowerCase().trim();
        return ['description', 'item', 'service', 'price', 'cost', 'amount', 'quantity', 'qty', 'date', 'name', 'title'].some(keyword => lower.includes(keyword));
      }),
      differentFromSecondRow: allRows.length > 1 && firstRow.some((cell, index) => {
        const secondRowCell = allRows[1][index] || '';
        const firstTrimmed = cell.trim();
        const secondTrimmed = secondRowCell.trim();
        
        // Different content and not both empty
        return firstTrimmed !== secondTrimmed && (firstTrimmed !== '' || secondTrimmed !== '');
      }),
      hasTextInMostCells: firstRow.filter(cell => {
        const trimmed = cell.trim();
        return trimmed !== '' && isNaN(parseFloat(trimmed));
      }).length >= Math.ceil(firstRow.length * 0.5) // At least 50% non-numeric
    };
    
    // At least 2 criteria must be met for reliable header detection
    const criteriaCount = Object.values(criteria).filter(Boolean).length;
    return criteriaCount >= 2;
  }, []);

  // Helper function for better date detection
  const isDateColumn = React.useCallback((columnData: string[]) => {
    if (columnData.length === 0) return false;
    
    const nonEmptyCells = columnData.filter(cell => cell.trim() !== '');
    if (nonEmptyCells.length === 0) return false;
    
    const validDates = nonEmptyCells.filter(cell => {
      const trimmed = cell.trim();
      
      // Check common date formats
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
        /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
        /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
      ];
      
      if (datePatterns.some(pattern => pattern.test(trimmed))) {
        const date = new Date(trimmed);
        return !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
      }
      
      return false;
    });
    
    // At least 70% should be valid dates for reliable detection
    return validDates.length / nonEmptyCells.length >= 0.7;
  }, []);

  // Helper function for unique column ID generation
  const generateUniqueColumnId = React.useCallback((baseId: string, existingIds: string[], index: number) => {
    // For essential columns (description, unitPrice), always use the base ID without suffix
    if (['description', 'unitPrice'].includes(baseId)) {
      return baseId;
    }
    
    let uniqueId = baseId;
    let suffix = 1;
    
    while (existingIds.includes(uniqueId)) {
      if (['quantity'].includes(baseId)) {
        uniqueId = `${baseId}_${suffix}`;
      } else {
        // Use timestamp and index for truly unique IDs
        uniqueId = `custom_${Date.now()}_${index}_${suffix}`;
      }
      suffix++;
    }
    
    return uniqueId;
  }, []);

  const parsePasteData = React.useCallback((text: string) => {
    // Split by actual newlines and tabs (not escaped strings)
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 1) {
      return null;
    }

    // Parse all rows first to analyze data types
    const allRows = lines.map(line => line.split(/\t/));

    // Use improved header detection
    const firstRow = allRows[0];
    const hasHeaders = detectHeaders(firstRow, allRows);

    let headerRow: string[];
    let dataRows: string[][];

    // Always treat all rows as data rows (including first row)
    // Header detection is only used for column naming and type detection
    if (hasHeaders) {
      headerRow = firstRow;
      dataRows = allRows; // Keep all rows including the first row as data
    } else {
      // Generate default headers if no header row detected
      headerRow = firstRow.map((_, index) => `Column ${index + 1}`);
      dataRows = allRows;
    }

    // Ensure we have at least some data
    if (headerRow.length === 0 || dataRows.length === 0) {
      return null;
    }

    // Get existing column IDs to avoid duplicates
    const existingColumnIds = columns.map(col => col.id);
    const existingColumnNames = columns.map(col => col.name.toLowerCase().trim());

    // Robust: always use first column as description (text), all others as custom fields with auto-detected type
    const newColumns = headerRow.map((header: string, index: number) => {
      const columnData = dataRows.map(row => row[index] || '').filter(cell => cell.trim() !== '');

      let columnId: string;
      let columnType: 'text' | 'number' | 'date';
      if (index === 0) {
        // Always treat first column as description
        columnId = 'description';
        columnType = 'text';
      } else {
        // Auto-detect type for custom fields
        // Check if all non-empty values in this column are numeric (handle Vietnamese number format)
        const isNumeric = columnData.length > 0 && columnData.every(cell => {
          const trimmed = cell.trim();
          if (trimmed === '') return true;
          // Try both Vietnamese (8.000,5) and English (8,000.5) formats
          let cleanNumber = trimmed.replace(/\./g, '').replace(/,/g, '.');
          let num = parseFloat(cleanNumber);
          if (isNaN(num)) {
            cleanNumber = trimmed.replace(/,/g, '');
            num = parseFloat(cleanNumber);
          }
          return !isNaN(num) && isFinite(num) && (/^[\d,.]+$/.test(trimmed) || /^\d+(\s*\(ngày\))?$/i.test(trimmed));
        });
        const isDate = isDateColumn(columnData);
        if (isDate && !isNumeric) {
          columnType = 'date';
        } else if (isNumeric) {
          columnType = 'number';
        } else {
          columnType = 'text';
        }
        columnId = columnType === 'number' ? `custom_number_${Date.now()}_${index}` : `custom_${Date.now()}_${index}`;
      }

      // Generate unique column ID
      const uniqueColumnId = generateUniqueColumnId(columnId, existingColumnIds, index);

      // Ensure unique column name to prevent duplicates
      let uniqueColumnName = header.trim();
      let nameSuffix = 1;
      while (existingColumnNames.includes(uniqueColumnName.toLowerCase().trim())) {
        uniqueColumnName = `${header.trim()} (${nameSuffix})`;
        nameSuffix++;
      }

      // Add to existing arrays to prevent duplicates within the same paste operation
      existingColumnIds.push(uniqueColumnId);
      existingColumnNames.push(uniqueColumnName.toLowerCase().trim());

      return {
        id: uniqueColumnId,
        name: uniqueColumnName,
        type: columnType
      } as QuoteColumn;
    });

    // Create items from data rows
    const newItems = dataRows
      .filter(row => row.some(cell => cell.trim() !== '')) // Skip empty rows
      .map((row: string[]) => {
        const item: { description: string; unitPrice: number; customFields: Record<string, any> } = {
          description: '',
          unitPrice: 0,
          customFields: {}
        };

        // Map data directly based on column index and type
        newColumns.forEach((col, colIdx) => {
          const cellValue = row[colIdx] ?? '';
          const trimmedValue = cellValue.trim();
          
          if (colIdx === 0) {
            // First column is always description
            item.description = trimmedValue;
          } else {
            // All other columns go to customFields
            if (col.type === 'number') {
              if (trimmedValue === '') {
                item.customFields[col.id] = 0;
              } else {
                // Try both Vietnamese and English number formats
                let cleanNumber = trimmedValue.replace(/\./g, '').replace(/,/g, '.');
                let parsed = parseFloat(cleanNumber);
                if (isNaN(parsed)) {
                  cleanNumber = trimmedValue.replace(/,/g, '');
                  parsed = parseFloat(cleanNumber);
                }
                const finalValue = isNaN(parsed) ? 0 : parsed;
                item.customFields[col.id] = finalValue;
              }
            } else if (col.type === 'date') {
              const dateValue = new Date(trimmedValue);
              item.customFields[col.id] = !isNaN(dateValue.getTime()) ? dateValue.toISOString().split('T')[0] : trimmedValue;
            } else {
              // Text columns
              item.customFields[col.id] = trimmedValue !== '' ? trimmedValue : (cellValue || '');
            }
          }
        });

        return item;
      });

    if (newItems.length === 0) {
      return null;
    }

    return { newItems, newColumns };
  }, [columns, detectHeaders, isDateColumn, generateUniqueColumnId]);




  const applyPasteData = React.useCallback((sectionIndex: number, newItems: any[], newColumns: QuoteColumn[], mode: 'replace' | 'add-rows' | 'add-columns') => {
    const existingColumnIds = columns.map(col => col.id);
    let finalColumns = columns;
    let columnsToAdd: QuoteColumn[] = [];

    // Backup current state for rollback capability and undo
    // Make deep copy to avoid reference issues
    const currentSections = form.getValues(fieldArrayName) || [];
    const backup = {
      columns: JSON.parse(JSON.stringify(columns)), // Deep copy columns
      sections: JSON.parse(JSON.stringify(currentSections)), // Deep copy sections with all data
      sectionIndex
    };

    try {
      if (mode === 'replace') {
        // Replace all columns: first column is description, all others are custom fields with detected type
        if (newColumns.length > 0) {
          // Always set first column as description (text)
          const firstCol = { ...newColumns[0], id: 'description', type: 'text' as 'text' };
          // All other columns: assign unique IDs, auto-detect type (number/date/text)
          const customCols = newColumns.slice(1).map((col, idx) => {
            let colType: 'text' | 'number' | 'date' = (['number', 'date', 'text'].includes(col.type as string) ? col.type : 'text') as 'number' | 'date' | 'text';
            // Always generate unique ID for number columns for calculation
            let colId = colType === 'number' ? `custom_number_${Date.now()}_${idx}` : `custom_${Date.now()}_${idx}`;
            return { ...col, id: colId, type: colType };
          });
          finalColumns = [firstCol, ...customCols];
          columnsToAdd = [...finalColumns];
          setColumns(finalColumns);
        } else {
          finalColumns = [];
          columnsToAdd = [];
          setColumns([]);
        }
      } else if (mode === 'add-columns') {
        // Add all pasted columns as new columns, including the first/leftmost column
        columnsToAdd = newColumns.map((col, idx) => {
          let colType: 'text' | 'number' | 'date' = (['number', 'date', 'text'].includes(col.type as string) ? col.type : 'text') as 'number' | 'date' | 'text';
          let colId = colType === 'number' ? `custom_number_${Date.now()}_${idx}` : `custom_${Date.now()}_${idx}`;
          return { ...col, id: colId, type: colType };
        });

        if (columnsToAdd.length === 0) {
          console.log('Add Columns: No new columns to add');
        }

        if (columnsToAdd.length > 0) {
          finalColumns = [...columns, ...columnsToAdd];
          setColumns(finalColumns);
        } else {
          finalColumns = columns;
        }
      } else {
        // add-rows mode: use existing columns only
        finalColumns = columns;
      }

      // Process items based on mode
      let patchedItems: any[] = [];

      if (mode === 'replace') {
        // For replace: remap based on column indices rather than IDs
        patchedItems = newItems.map((item, itemIndex) => {
          const newItem: any = { description: '', unitPrice: 0, customFields: {} };
          
          // Always add timeline data for new items
          newItem.customFields.timeline = createInitialTimelineData(taskStartDate, taskEndDate, itemIndex, newItems.length);
          
          // Always use description from parsed item
          newItem.description = item.description || '';
          
          // Map custom fields by column index, not by ID
          for (let colIdx = 1; colIdx < finalColumns.length; colIdx++) {
            const finalCol = finalColumns[colIdx];
            const originalCol = newColumns[colIdx]; // Get original column at same index
            if (originalCol) {
              let val = item.customFields?.[originalCol.id];
              newItem.customFields[finalCol.id] = processColumnValue(val, finalCol.type);
            } else {
              newItem.customFields[finalCol.id] = getDefaultValue(finalCol.type);
            }
          }
          
          return newItem;
        });
      } else if (mode === 'add-columns') {
        // For add-columns: map new column data correctly
        
        patchedItems = newItems.map((item, itemIndex) => {
          // Keep empty description and unitPrice for add-columns mode
          const newItem: any = { description: '', unitPrice: 0, customFields: {} };
          
          // Always add timeline data for new items
          newItem.customFields.timeline = createInitialTimelineData(taskStartDate, taskEndDate, itemIndex, newItems.length);

          // Initialize all existing columns with default values first
          finalColumns.slice(1).forEach(finalCol => {
            if (finalCol.id !== 'timeline') { // Don't overwrite timeline
              newItem.customFields[finalCol.id] = getDefaultValue(finalCol.type);
            }
          });

          // Map all pasted columns data to the newly added columns
          newColumns.forEach((originalCol, idx) => {
            const correspondingNewCol = columnsToAdd[idx];
            if (correspondingNewCol) {
              // Map data from the original parsed item to the new column
              let val;
              if (idx === 0) {
                // First column data comes from description
                val = item.description || '';
              } else {
                // Other columns come from customFields
                val = item.customFields?.[originalCol.id];
              }
              
              if (val !== undefined) {
                newItem.customFields[correspondingNewCol.id] = processColumnValue(val, correspondingNewCol.type);
              }
            }
          });

          return newItem;
        });
      } else if (mode === 'add-rows') {
        // For add-rows: map data to existing columns using same logic as replace
        
        patchedItems = newItems.map((item, itemIdx) => {
          const newItem: any = { description: '', unitPrice: 0, customFields: {} };
          
          // Always add timeline data for new items
          newItem.customFields.timeline = createInitialTimelineData(taskStartDate, taskEndDate, itemIdx, newItems.length);
          
          // Map description
          newItem.description = item.description || '';
          
          // Map to existing columns by index (same as replace logic)
          finalColumns.slice(1).forEach((finalCol, finalColIdx) => {
            if (finalCol.id === 'timeline') return; // Skip timeline as it's already set
            
            // Find corresponding column in parsed data by index
            const originalColIdx = finalColIdx + 1; // +1 because we skip description
            const originalCol = newColumns[originalColIdx];
            if (originalCol) {
              let val = item.customFields?.[originalCol.id];
              newItem.customFields[finalCol.id] = processColumnValue(val, finalCol.type);
            } else {
              newItem.customFields[finalCol.id] = getDefaultValue(finalCol.type);
            }
          });
          
          return newItem;
        });
      }

      // Helper function to process column values
      function processColumnValue(val: any, colType: 'text' | 'number' | 'date'): any {
        if (colType === 'number') {
          if (typeof val === 'string' && val.trim() !== '') {
            let cleanNumber = val.replace(/\./g, '').replace(/,/g, '.');
            let parsed = parseFloat(cleanNumber);
            if (isNaN(parsed)) {
              cleanNumber = val.replace(/,/g, '');
              parsed = parseFloat(cleanNumber);
            }
            return isNaN(parsed) ? 0 : parsed;
          } else {
            return Number(val) || 0;
          }
        } else if (colType === 'date') {
          const dateValue = new Date(val);
          return !isNaN(dateValue.getTime()) ? dateValue.toISOString().split('T')[0] : val;
        } else {
          return val !== undefined ? val : '';
        }
      }

      // Helper function to get default values
      function getDefaultValue(colType: 'text' | 'number' | 'date'): any {
        if (colType === 'number') return 0;
        if (colType === 'date') return null;
        return '';
      }

      // Map items to current column structure
      const allColumnIds = finalColumns.map(col => col.id);
      const mappedItems = patchedItems.map(item => {
        const mappedItem = {
          description: item.description || '',
          unitPrice: item.unitPrice || 0,
          customFields: {} as Record<string, any>
        };
        // Copy customFields that match current columns (except description/unitPrice)
        Object.entries(item.customFields || {}).forEach(([key, value]) => {
          if (allColumnIds.includes(key) && key !== 'description' && key !== 'unitPrice') {
            mappedItem.customFields[key] = value;
          }
        });
        return mappedItem;
      });

      // Update the form with mapped items
      const allSections = form.getValues(fieldArrayName) || [];
      if (allSections[sectionIndex]) {
        if (mode === 'replace') {
          // Replace all items
          const cleanedItems = mappedItems.map(item => {
            const cleanItem = {
              description: item.description,
              unitPrice: item.unitPrice,
              customFields: {} as Record<string, any>
            };
            Object.entries(item.customFields || {}).forEach(([key, value]) => {
              if (allColumnIds.includes(key) && !['description', 'unitPrice'].includes(key)) {
                cleanItem.customFields[key] = value;
              }
            });
            return cleanItem;
          });
          allSections[sectionIndex].items = cleanedItems;
        } else if (mode === 'add-rows') {
          // Add new rows to existing data - add all items
          const existingItems = allSections[sectionIndex].items || [];
          allSections[sectionIndex].items = [...existingItems, ...mappedItems];
        } else if (mode === 'add-columns') {
          // Update existing items with new column data
          const existingItems = allSections[sectionIndex].items || [];
          
          // Add default values for new columns to existing items
          const updatedExistingItems = existingItems.map((existingItem: any) => {
            const updatedItem = { ...existingItem };
            if (!updatedItem.customFields) updatedItem.customFields = {};
            columnsToAdd.forEach(newCol => {
              updatedItem.customFields[newCol.id] = getDefaultValue(newCol.type);
            });
            return updatedItem;
          });
          
          // Add new items if any, ensuring they have all column values
          let finalItems = updatedExistingItems;
          if (mappedItems.length > 0) {
            // Ensure new items have values for ALL columns (existing + new)
            const newItemsWithAllColumns = mappedItems.map(newItem => {
              const itemWithAllCols = {
                description: newItem.description,
                unitPrice: newItem.unitPrice,
                customFields: {} as Record<string, any>
              };
              
              // Add values for all columns in finalColumns
              finalColumns.slice(1).forEach(col => {
                if (newItem.customFields?.[col.id] !== undefined) {
                  // Use the value from new item if available
                  itemWithAllCols.customFields[col.id] = newItem.customFields[col.id];
                } else {
                  // Use default value for columns not in new data
                  itemWithAllCols.customFields[col.id] = getDefaultValue(col.type);
                }
              });
              
              return itemWithAllCols;
            });
            
            finalItems = [...updatedExistingItems, ...newItemsWithAllColumns];
          }
          
          allSections[sectionIndex].items = finalItems;
        }
        form.setValue(fieldArrayName, allSections);
      }

      // Generate success message
      let toastMessage = '';
      if (mode === 'replace') {
        const totalColumns = finalColumns.length - 1;
        toastMessage = `${mappedItems.length} ${T.items || "items"} ${T.replaced || 'replaced'}`;
        if (totalColumns > 0) {
          toastMessage += ` ${T.and || "and"} ${T.columnsReplacedWith || "columns replaced with"} ${totalColumns} ${T.newColumns || "new columns"}`;
        }
      } else if (mode === 'add-rows') {
        toastMessage = `${mappedItems.length} ${T.items || "items"} ${T.added || "added"}`;
      } else if (mode === 'add-columns') {
        const newColumnsCount = columnsToAdd.length;
        const itemsCount = mappedItems.length;
        if (newColumnsCount > 0 && itemsCount > 0) {
          toastMessage = `${newColumnsCount} ${T.newColumns || "new columns"} ${T.and || "and"} ${itemsCount} ${T.items || "items"} ${T.added || "added"}`;
        } else if (newColumnsCount > 0) {
          toastMessage = `${newColumnsCount} ${T.newColumns || "new columns"} ${T.added || "added"}`;
        } else {
          toastMessage = `${itemsCount} ${T.items || "items"} ${T.added || "added"}`;
        }
      }
      
      // Save backup for undo functionality BEFORE creating toast
      const timeoutId = setTimeout(() => {
        setUndoBackup(prev => {
          // Only clear if this is still the same backup
          if (prev && prev.timeoutId === timeoutId) {
            console.log('Undo backup expired, clearing...');
            return null;
          }
          return prev;
        });
      }, 30000); // Increase to 30 seconds
      
      console.log('Creating undo backup with data:', {
        columnsCount: backup.columns.length,
        sectionsCount: backup.sections.length,
        sampleSection: backup.sections[0] ? {
          name: backup.sections[0].name,
          itemsCount: backup.sections[0].items?.length,
          sampleItem: backup.sections[0].items?.[0]
        } : 'No sections'
      });
      
      setUndoBackup({
        ...backup,
        timeoutId
      });
      
      // Create toast AFTER setting undo backup
      console.log('Creating toast with undo action...');
      
      toast({
        title: T.pastedFromClipboard || "Pasted from Clipboard",
        description: toastMessage,
        action: (
          <ToastAction 
            altText="Hoàn tác thao tác dán"
            onClick={() => {
              console.log('Undo button clicked, executing undo...');
              // Call handleUndoPaste directly - it will use the current undoBackup state
              handleUndoPaste();
            }}
          >
            {T.undoAction || "Hoàn tác"}
          </ToastAction>
        ),
      });
    } catch (error) {
      // Rollback on error
      setColumns(backup.columns);
      form.setValue(fieldArrayName, backup.sections);
      console.error('Paste operation failed:', error);
      toast({
        variant: 'destructive',
        title: T.pasteFailed || "Paste Failed",
        description: error instanceof Error ? error.message : (T.pasteFailed || "An unexpected error occurred")
      });
    }
  }, [T, toast, form, fieldArrayName, setColumns, columns]);

  const handlePasteOption = React.useCallback((mode: 'replace' | 'add-rows' | 'add-columns') => {
    if (!pendingPasteData) return;
    
    const { sectionIndex, parsedItems, parsedColumns } = pendingPasteData;
    
    // Validate conditions for add-rows mode
    if (mode === 'add-rows') {
      const currentColumnCount = columns.length;
      const pastedColumnCount = parsedColumns.length;
      
      if (currentColumnCount !== pastedColumnCount) {
        toast({
          variant: 'destructive',
          title: T.columnMismatch || "Số cột không khớp",
          description: `${T.columnMismatchDesc || "Để thêm hàng, dữ liệu phải có cùng số cột với bảng hiện tại"} (${currentColumnCount} ${T.columnsRequired || "cột"}).`,
        });
        return;
      }
    }
    
    applyPasteData(sectionIndex, parsedItems, parsedColumns, mode);
    
    // Close dialog and clear pending data
    setIsPasteOptionsDialogOpen(false);
    setPendingPasteData(null);
  }, [pendingPasteData, applyPasteData, columns, toast, T]);

  const handlePasteInSection = React.useCallback((sectionIndex: number, text: string) => {
    console.log('handlePasteInSection called with:', { sectionIndex, text });
    
    if (!text || !text.trim()) {
      toast({
        variant: 'destructive',
        title: T.pasteFailed || "Paste Failed",
        description: "No data to paste"
      });
      return;
    }

    const parsed = parsePasteData(text);
    if (!parsed) {
      toast({
        variant: 'destructive',
        title: T.pasteFailed || "Paste Failed",
        description: "Invalid paste data format"
      });
      return;
    }

    const { newItems, newColumns } = parsed;
    
    // Store pending paste data and open options dialog
    setPendingPasteData({
      sectionIndex,
      text,
      parsedItems: newItems,
      parsedColumns: newColumns
    });
    setIsPasteOptionsDialogOpen(true);
  }, [parsePasteData, toast, T]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="outline">
              {sectionFields.length} {T.sections || 'sections'}
            </Badge>
            <Badge variant="secondary">
              {grandTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {quoteTemplates.length > 0 && (
              <div className="w-full max-w-xs">
                <Select onValueChange={(templateId) => {
                  const template = quoteTemplates.find(t => t.id === templateId);
                  if (template) {
                    setTemplateToApply(template);
                  }
                }}>
                  <SelectTrigger>
                    <FileText className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={T.applyTemplate || "Apply Template"} />
                  </SelectTrigger>
                  <SelectContent>
                    {quoteTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Suggest with AI button moved to header */}
            {onApplySuggestion && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSuggestDialogOpen(true)}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {T.suggestions || "AI Suggestions"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{(T as any).suggestionAppliedDesc || "Generate suggested quote items with AI"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {showCopyFromQuote && onCopyFromQuote && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onCopyFromQuote?.(e);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {T.copyFromPriceQuote || "Copy from Quote"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{T.copyFromQuoteDesc || "Copy structure and data from price quote"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full grid-cols-2`}>
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              {T.sections || "Sections"}
            </TabsTrigger>
            <TabsTrigger value="calculations" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              {T.calculationsDesc || "Summary"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-4 mt-6">
            {sectionFields.map((section, index) => (
              <QuoteSectionComponent
                key={section.id}
                sectionIndex={index}
                control={control}
                columns={columns}
                fieldArrayName={fieldArrayName}
                T={T}
                onRemoveSection={() => removeSection(index)}
                canDeleteSection={sectionFields.length > 1}
                onMoveColumn={handleMoveColumn}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                onItemChange={form.setValue}
                onUpdateColumnCalculation={handleUpdateColumnCalculation}
                onAddColumn={handleAddColumn}
                onPaste={handlePasteInSection}
                taskStartDate={taskStartDate}
                taskEndDate={taskEndDate}
              />
            ))}
            
            <div className="flex justify-center pt-4">
              <Button type="button" variant="outline" onClick={handleAddSection}>
                <FolderPlus className="mr-2 h-4 w-4" />
                {T.addSection || "Add Section"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="calculations" className="space-y-6 mt-6">
            

            {/* Grand Total Section - Most Important */}
            <div className="mb-8">
              <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {T.grandTotaltit || "Tổng kết & Tính toán"}
              </h4>
              <Card className="border-primary bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-base font-medium text-primary mb-3">{T.grandTotaltit || "Grand Total"}</p>
                        
                        {/* Formula Input with integrated clear button */}
                        <div className="relative mb-3">
                          <input
                            type="text"
                            className="border rounded-lg px-3 py-2 pr-10 text-sm w-full font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-colors"
                            placeholder={T.selectVariableOrFormula || "Chọn biến hoặc nhập công thức..."}
                            value={effectiveFormula}
                            onChange={e => {
                              if (onGrandTotalFormulaChange) onGrandTotalFormulaChange(e.target.value);
                              else setInnerGrandTotalFormula(e.target.value);
                            }}
                          />
                          {effectiveFormula && (
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                              onClick={() => {
                                if (onGrandTotalFormulaChange) onGrandTotalFormulaChange('');
                                else setInnerGrandTotalFormula('');
                              }}
                              title={T.clearFormula || "Xóa công thức"}
                            >
                              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Variable Selection - Compact Tags */}
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 font-medium mb-2">{T.variablesAvailable || "Kết quả tính toán có thể sử dụng"}</p>
                          {calculationResults.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {calculationResults.map((calc, index) => {
                                const varName = calc.name.replace(/\s+/g, '');
                                return (
                                  <button
                                    key={calc.id}
                                    type="button"
                                    className="inline-flex items-center px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-full transition-colors"
                                    onClick={() => {
                                      const next = (effectiveFormula || '') + `{${varName}}`;
                                      if (onGrandTotalFormulaChange) onGrandTotalFormulaChange(next);
                                      else setInnerGrandTotalFormula(next);
                                    }}
                                    title={`${calc.name} (${calc.calculation})`}
                                  >
                                    <span className="font-medium">{varName}</span>
                                    <span className="mx-1">=</span>
                                    <span>{typeof calc.result === 'number' ? calc.result.toLocaleString() : calc.result}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 p-3 text-center bg-gray-50 rounded border-2 border-dashed border-gray-200">
                              <div className="mb-1">🔢 {T.noCalculationColumns || "Chưa có cột nào thiết lập tính toán"}</div>
                              <div>{T.setupCalculationColumns || "Hãy thiết lập phép tính cho cột để tạo biến sử dụng trong công thức"}</div>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mb-2">💡 {T.variablesAutoSumHint || "Biến cạnh nhau sẽ tự động cộng. Ví dụ: {'{QuantitySum}{PriceAvg}'} = QuantitySum + PriceAvg"}</p>

                        {grandTotalError && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
                            ⚠️ {grandTotalError}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {grandTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {effectiveFormula ? (T.formula || 'Công thức') : (T.default || 'Mặc định')}
                        </p>
                      </div>
                    </div>
                    {fieldArrayName !== "collaboratorSections" && (
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-base font-medium text-primary">{T.netTotal || "Net Total"}</p>
                          <span className="text-xs text-muted-foreground">{T.netTotalDesc || "Grand Total - Tổng collaborator"}</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {netTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sum Totals Section */}
            {sumTotals.length > 0 && (
              <div className="mb-8">
                <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  {T.sumByColumn || "Tổng Theo Cột"} ({sumTotals.length} {T.columns || "cột"})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sumTotals.map(calc => (
                    <Card key={calc.id} className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-900">{calc.name}</p>
                            <p className="text-xs text-green-600">{calc.calculation}</p>
                          </div>
                          <p className="text-lg font-bold text-green-800">
                            {typeof calc.result === 'number' ? calc.result.toLocaleString() : calc.result}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Other Calculations Section */}
            {otherCalculations.length > 0 && (
              <div className="mb-8">
                <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {T.otherCalculations || "Phép Tính Khác"} ({otherCalculations.length} {T.calculationsCount || "phép tính"})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherCalculations.map(calc => (
                    <Card key={calc.id} className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900">{calc.name}</p>
                            <p className="text-xs text-blue-600">{calc.calculation}</p>
                          </div>
                          <p className="text-lg font-bold text-blue-800">
                            {typeof calc.result === 'number' ? calc.result.toLocaleString() : calc.result}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* No Calculations Message */}
            {sumTotals.length === 0 && otherCalculations.length === 0 && (
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {T.noCalculationColumnsMsg || "Chưa có cột nào được thiết lập phép tính. Hãy thêm cột số và thiết lập phép tính để xem kết quả."}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Timeline tab removed as requested */}
        </Tabs>
      </CardContent>

      {/* AI Suggestion Dialog */}
      <Dialog open={isSuggestDialogOpen} onOpenChange={setIsSuggestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{T.suggestions || "AI Suggestions"}</DialogTitle>
          </DialogHeader>
          {onApplySuggestion && (
            <QuoteSuggestion
              settings={settings}
              taskDescription={taskDescription}
              taskCategory={taskCategory}
              onApplySuggestion={(items) => {
                onApplySuggestion(items);
                setIsSuggestDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Paste Options Dialog */}
      <AlertDialog open={isPasteOptionsDialogOpen} onOpenChange={setIsPasteOptionsDialogOpen}>
        <AlertDialogContent className="max-w-2xl w-[90vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">{T.pasteOptions || "Tùy chọn dán"}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {T.pasteHow || "Bạn muốn dán như thế nào?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 flex items-center gap-3 text-left hover:bg-red-50 hover:border-red-300 transition-colors justify-start"
                onClick={() => handlePasteOption('replace')}
              >
                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="font-medium text-red-700 mb-1">{T.replaceAll || "Thay thế tất cả"}</div>
                  <div className="text-xs text-muted-foreground">{T.replaceAllDesc || "Xóa tất cả và thay bằng dữ liệu mới"}</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 flex items-center gap-3 text-left hover:bg-blue-50 hover:border-blue-300 transition-colors justify-start"
                onClick={() => handlePasteOption('add-rows')}
                disabled={!!(pendingPasteData && columns.length !== pendingPasteData.parsedColumns.length)}
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="font-medium text-blue-700 mb-1">{T.addRows || "Thêm hàng"}</div>
                  <div className="text-xs text-muted-foreground">{T.addRowsDesc || "Thêm các hàng mới vào cuối bảng"}</div>
                  {pendingPasteData && columns.length !== pendingPasteData.parsedColumns.length && (
                    <div className="text-xs text-orange-600 mt-1">
                      {T.dataRequirement || "Yêu cầu: dữ liệu phải có"} {columns.length} {T.columnsRequired || "cột"}
                    </div>
                  )}
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 flex items-center gap-3 text-left hover:bg-green-50 hover:border-green-300 transition-colors justify-start"
                onClick={() => handlePasteOption('add-columns')}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="font-medium text-green-700 mb-1">{T.addColumns || "Thêm cột"}</div>
                  <div className="text-xs text-muted-foreground">{T.addColumnsDesc || "Thêm các cột mới vào bên phải bảng"}</div>
                </div>
              </Button>
            </div>
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={() => setIsPasteOptionsDialogOpen(false)}>
              {T.cancel || "Hủy"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Application Dialog */}
      <AlertDialog open={!!templateToApply} onOpenChange={() => setTemplateToApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T.applyTemplate || "Apply Template"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {T.applyTemplateWarning || "This will replace all current sections and items. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToApply(null)}>
              {T.cancel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleApplyTemplate}>
              {(T.applyTemplate || "Apply Template").replace('...', '')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

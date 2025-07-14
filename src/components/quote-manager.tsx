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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { vi, en } from "@/lib/i18n";

type QuoteManagerProps = {
  control: any;
  form: any;
  fieldArrayName: "sections" | "collaboratorSections";
  columns: QuoteColumn[];
  setColumns: React.Dispatch<React.SetStateAction<QuoteColumn[]>>;
  title: string;
  quoteTemplates?: QuoteTemplate[];
  settings: AppSettings;
  taskDescription?: string;
  taskCategory?: string;
  onApplySuggestion?: (items: any[]) => void;
  onCopyFromQuote?: () => void;
  showCopyFromQuote?: boolean;
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
}: QuoteManagerProps) => {
  // Áp dụng cách lấy ngôn ngữ đúng theo cấu trúc i18n.ts mới
  const T = settings.language === 'en' ? en : vi;
  // DEBUG: log giá trị T và settings.language
  if (typeof window !== 'undefined') {
    console.log('QuoteManager: settings.language =', settings.language);
    console.log('QuoteManager: T =', T);
  }

  const [templateToApply, setTemplateToApply] = React.useState<QuoteTemplate | null>(null);
  const [activeTab, setActiveTab] = React.useState("sections");
  
  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: fieldArrayName,
  });

  const watchedSections = useWatch({
    control,
    name: fieldArrayName,
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
      console.log('QuoteManager: calculationResults =', results);
    }
    return results;
  }, [watchedSections, columns]);

  // Custom formula for Grand Total
  const [grandTotalFormula, setGrandTotalFormula] = React.useState('');
  const [grandTotalError, setGrandTotalError] = React.useState('');

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
  const collabSum = React.useMemo(() => {
    if (!form || !form.getValues) return 0;
    
    // Only calculate if this is actually for collaboratorSections
    if (fieldArrayName !== "collaboratorSections") {
      const collabSections = form.getValues('collaboratorSections') || [];
      return (collabSections || []).reduce((acc: number, section: any) =>
        acc + (section.items?.reduce((itemAcc: number, item: any) => {
          return itemAcc + (Number(item.unitPrice) || 0);
        }, 0) || 0), 0);
    }
    
    // For collaboratorSections, use the current columns and calculate with formulas
    const collabSections = form.getValues('collaboratorSections') || [];
    
    return (collabSections || []).reduce((acc: number, section: any) =>
      acc + (section.items?.reduce((itemAcc: number, item: any) => {
        let value = 0;
        
        // Find unitPrice column in current columns to check for rowFormula
        const unitPriceCol = columns.find(col => col.id === 'unitPrice');
        
        if (unitPriceCol?.rowFormula) {
          try {
            // Calculate value based on rowFormula and current row values
            const rowVals: Record<string, number> = {};
            columns.forEach(c => {
              if (c.type === 'number' && c.id !== 'unitPrice') {
                const val = ['description', 'unitPrice'].includes(c.id)
                  ? Number(item[c.id]) || 0
                  : Number(item.customFields?.[c.id]) || 0;
                rowVals[c.id] = val;
              }
            });
            
            // Replace column IDs in formula with actual values
            let expr = unitPriceCol.rowFormula;
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
  }, [form, form?.getValues, form?.watch && form.watch('collaboratorSections'), columns, fieldArrayName]);

  // Grand Total: custom formula or priceSum
  const grandTotal = React.useMemo(() => {
    if (grandTotalFormula && grandTotalFormula.trim() !== '') {
      try {
        let formula = grandTotalFormula;
        
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
  }, [grandTotalFormula, priceSum, collabSum, watchedSections, columns, calculationResults]);

  // Net Total: Grand Total - collabSum
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
      items: [{ description: "", unitPrice: 0, customFields: {} }]
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

  const handlePasteInSection = React.useCallback((sectionIndex: number, text: string) => {
    const rows = text.trim().split('\\n').map((row: string) => row.split('\\t'));
    if (rows.length < 1) {
      toast({ 
        variant: 'destructive', 
        title: T.pasteFailed || "Paste Failed", 
        description: T.clipboardInvalidFormat || "Clipboard is empty or has invalid format" 
      });
      return;
    }

    const headerRow = rows.shift()!;
    const newColumns = headerRow.map((header: string, index: number) => {
      const isNumeric = rows.every((row: string[]) => !isNaN(parseFloat(row[index])));
      return {
        id: `custom_${Date.now()}_${index}`,
        name: header,
        type: isNumeric ? 'number' : 'text'
      } as QuoteColumn;
    });

    const quantityColumnIndex = headerRow.findIndex((header: string) => 
      header.toLowerCase().includes('quantity')
    );
    if (quantityColumnIndex !== -1) {
      newColumns[quantityColumnIndex].id = 'quantity';
    }

    if (sectionIndex === 0) {
      setColumns(newColumns);
    }

    const newItems = rows.map((row: string[]) => {
      const item: { description?: string; unitPrice?: number; customFields: Record<string, any> } = { 
        customFields: {} 
      };
      newColumns.forEach((col, index) => {
        item.customFields[col.id] = row[index];
      });
      return {
        description: item.customFields.description || "",
        unitPrice: parseFloat(item.customFields.unitPrice) || 0,
        customFields: item.customFields || {},
      };
    });

    const allSections = form.getValues(fieldArrayName) || [];
    if (allSections[sectionIndex]) {
      allSections[sectionIndex].items = newItems;
      form.setValue(fieldArrayName, allSections);
    }

    toast({
      title: T.pastedFromClipboard || "Pasted from Clipboard",
      description: `${newItems.length} ${T.items || "items"} ${T.and || "and"} ${newColumns.length} ${T.columns || "columns"} ${T.haveBeenImported || "have been imported."}`
    });
  }, [T, toast, form, fieldArrayName, setColumns]);

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
            
            {showCopyFromQuote && onCopyFromQuote && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="sm" onClick={onCopyFromQuote}>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sections" className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              {T.sections || "Sections"}
            </TabsTrigger>
            <TabsTrigger value="calculations" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              {T.calculationsDesc || "Tổng Kết"}
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {T.suggestions || "AI Suggestions"}
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
                onPaste={handlePasteInSection}
                T={T}
                onRemoveSection={() => removeSection(index)}
                canDeleteSection={sectionFields.length > 1}
                onMoveColumn={handleMoveColumn}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                onItemChange={form.setValue}
                onUpdateColumnCalculation={handleUpdateColumnCalculation}
                onAddColumn={handleAddColumn}
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
                            value={grandTotalFormula}
                            onChange={e => setGrandTotalFormula(e.target.value)}
                          />
                          {grandTotalFormula && (
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                              onClick={() => setGrandTotalFormula('')}
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
                                    onClick={() => setGrandTotalFormula(prev => prev + `{${varName}}`)}
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
                          {grandTotalFormula ? (T.formula || 'Công thức') : (T.default || 'Mặc định')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-base font-medium text-primary">{T.netTotal || "Net Total"}</p>
                        <span className="text-xs text-muted-foreground">{T.netTotalDesc || "Grand Total - Tổng collaborator"}</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {netTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}
                      </p>
                    </div>
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

          <TabsContent value="suggestions" className="space-y-4 mt-6">
            {onApplySuggestion && (
              <QuoteSuggestion
                settings={settings}
                taskDescription={taskDescription}
                taskCategory={taskCategory}
                onApplySuggestion={onApplySuggestion}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

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

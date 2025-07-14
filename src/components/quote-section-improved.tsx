 "use client";

import * as React from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  PlusCircle, 
  Trash2, 
  MoreVertical, 
  ArrowLeft, 
  ArrowRight, 
  Pencil, 
  ClipboardPaste, 
  ChevronUp, 
  ChevronDown,
  Settings,
  Calculator,
  Columns,
  GripVertical,
  Eye,
  EyeOff,
  CalendarIcon
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import type { QuoteColumn } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface QuoteSectionComponentProps {
  sectionIndex: number;
  control: any;
  columns: QuoteColumn[];
  fieldArrayName: string; // `sections` or `collaboratorSections`
  onRemoveSection: (index: number) => void;
  canDeleteSection: boolean;
  onMoveColumn: (index: number, direction: 'left' | 'right') => void;
  onEditColumn: (column: QuoteColumn) => void;
  onDeleteColumn: (column: QuoteColumn) => void;
  onPaste: (sectionIndex: number, text: string) => void;
  onItemChange: any;
  onUpdateColumnCalculation?: (colId: string, calculation: { type: string; formula?: string }) => void;
  onAddColumn?: (column: Omit<QuoteColumn, 'id'>) => void;
  T: any;
}
export const QuoteSectionComponent = (props: QuoteSectionComponentProps) => {
  const {
    sectionIndex,
    control,
    columns,
    fieldArrayName,
    onRemoveSection,
    canDeleteSection,
    onMoveColumn,
    onEditColumn,
    onDeleteColumn,
    onPaste,
    onItemChange,
    onUpdateColumnCalculation,
    onAddColumn,
    T
  } = props;
  // State management
  const [sectionName, setSectionName] = React.useState('');
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  // Column management states
  const [isColumnDialogOpen, setIsColumnDialogOpen] = React.useState(false);
  const [editingColumn, setEditingColumn] = React.useState<QuoteColumn | null>(null);
  const [newColumnName, setNewColumnName] = React.useState('');
  const [newColumnType, setNewColumnType] = React.useState<QuoteColumn['type']>('text');
  const [newColumnDateFormat, setNewColumnDateFormat] = React.useState<'single' | 'range'>('single');
  // For row formula
  const [enableRowFormula, setEnableRowFormula] = React.useState(false);
  const [rowFormula, setRowFormula] = React.useState('');

  
  // Calculation dialog states
  const [isCalcDialogOpen, setIsCalcDialogOpen] = React.useState(false);
  const [configCalcCol, setConfigCalcCol] = React.useState<QuoteColumn | null>(null);
  const [selectedCalc, setSelectedCalc] = React.useState<string>('none');
  const [customFormula, setCustomFormula] = React.useState<string>('');
  
  // Item management
  const [newItemDescription, setNewItemDescription] = React.useState('');
  const [selectedItems, setSelectedItems] = React.useState<number[]>([]);
  
  const calculationTypes = [
    { value: 'none', label: (T as any).noCalculation },
    { value: 'sum', label: (T as any).sum },
    { value: 'average', label: (T as any).average },
    { value: 'min', label: (T as any).minimum },
    { value: 'max', label: (T as any).maximum },
    { value: 'custom', label: (T as any).customFormula },
  ];

  React.useEffect(() => {
    if (configCalcCol) {
      setSelectedCalc(configCalcCol.calculation?.type || 'none');
      setCustomFormula(configCalcCol.calculation?.formula || '');
    }
  }, [configCalcCol]);

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: `${fieldArrayName}.${sectionIndex}.items`,
  });
  
  const watchedItems = useWatch({
    control,
    name: `${fieldArrayName}.${sectionIndex}.items`,
  });

  const watchedSectionName = useWatch({
    control,
    name: `${fieldArrayName}.${sectionIndex}.name`,
  });

  const { toast } = useToast();

  // Calculations
  const sectionTotal = React.useMemo(() => {
    if (!watchedItems || !Array.isArray(watchedItems)) return 0;
    return watchedItems.reduce((acc: number, item: any) => acc + (Number(item.unitPrice) || 0), 0);
  }, [watchedItems]);

  const columnCalculations = React.useMemo(() => {
    return columns.filter(col => col.calculation && col.calculation.type && col.calculation.type !== 'none' && col.type === 'number').map(col => {
      const colValues = (watchedItems || []).map((item: any) => {
        if (col.id === 'description' || col.id === 'unitPrice') return item[col.id];
        return item.customFields?.[col.id];
      }).filter((v: unknown) => v !== undefined && v !== null && v !== '');
      
      let result: number | string = '';
      let calcLabel = '';
      
      if (col.calculation) {
        switch (col.calculation.type) {
          case 'sum':
            result = colValues.reduce((acc: number, v: any) => acc + (parseFloat(v) || 0), 0);
            calcLabel = (T as any).sum;
            break;
          case 'average':
            result = colValues.length ? (colValues.reduce((acc: number, v: any) => acc + (parseFloat(v) || 0), 0) / colValues.length) : '';
            calcLabel = (T as any).average;
            break;
          case 'min':
            result = colValues.length ? Math.min(...colValues.map((v: any) => parseFloat(v) || 0)) : '';
            calcLabel = (T as any).minimum;
            break;
          case 'max':
            result = colValues.length ? Math.max(...colValues.map((v: any) => parseFloat(v) || 0)) : '';
            calcLabel = (T as any).maximum;
            break;
          case 'custom':
            if (col.calculation.formula) {
              try {
                const formula = col.calculation.formula;
                const colIds = formula.match(/col\w+/g) || [];
                let expr = formula;
                colIds.forEach(cid => {
                  const c = columns.find(c => c.id === cid);
                  const vals = (watchedItems || []).map((item: any) => {
                    if (!c) return 0;
                    if (c.id === 'description' || c.id === 'unitPrice') return item[c.id];
                    return item.customFields?.[c.id];
                  }).filter((v: unknown) => v !== undefined && v !== null && v !== '');
                  const sum = vals.reduce((acc: number, v: any) => acc + (parseFloat(v) || 0), 0);
                  expr = expr.replaceAll(cid, sum.toString());
                });
                result = eval(expr);
              } catch {
                result = (T as any).error;
              }
            }
            calcLabel = (T as any).customFormula;
            break;
        }
      }
      
      return {
        columnName: col.name,
        calcLabel,
        result: result !== '' ? result : '-',
        columnId: col.id
      };
    });
  }, [watchedItems, columns, T]);

  // Event handlers
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onPaste(sectionIndex, text);
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
      toast({ variant: 'destructive', title: (T as any).pasteFailed });
    }
  };

  const handleAddItem = () => {
    if (newItemDescription.trim()) {
      // Create default customFields for all existing custom columns
      const customFields: Record<string, any> = {};
      columns.forEach(col => {
        if (!['description', 'unitPrice'].includes(col.id)) {
          customFields[col.id] = col.type === 'number' ? 0 : 
                                 col.type === 'date' ? (col.dateFormat === 'range' ? { from: null, to: null } : null) : 
                                 '';
        }
      });
      
      append({
        description: newItemDescription.trim(),
        unitPrice: 0,
        customFields: Object.keys(customFields).length > 0 ? customFields : {},
      });
      setNewItemDescription('');
    }
  };

  const handleOpenColumnDialog = (column?: QuoteColumn) => {
    if (column) {
      // Editing existing column (including unitPrice)
      setEditingColumn(column);
      setNewColumnName(column.name);
      setNewColumnType(column.type);
      setNewColumnDateFormat(column.dateFormat || 'single');
      setSelectedCalc(column.calculation?.type || 'none');
      setCustomFormula(column.calculation?.formula || '');
      setEnableRowFormula(!!column.rowFormula);
      
      // Convert column IDs back to @columnname format for editing
      let displayFormula = column.rowFormula || '';
      if (displayFormula) {
        columns
          .filter(col => col.type === 'number' && col.id !== column.id)
          .forEach(col => {
            const shortName = col.name.toLowerCase().replace(/\s+/g, '');
            displayFormula = displayFormula.replaceAll(col.id, `@${shortName}`);
          });
      }
      setRowFormula(displayFormula);
    } else {
      // Adding new column - reset everything
      setEditingColumn(null);
      setNewColumnName('');
      setNewColumnType('text');
      setNewColumnDateFormat('single');
      setSelectedCalc('none');
      setCustomFormula('');
      setEnableRowFormula(false);
      setRowFormula('');
    }
    setIsColumnDialogOpen(true);
  };

  const handleSaveColumn = () => {
    let processedRowFormula = rowFormula;
    
    // Convert @columnname to actual column IDs before saving
    if (enableRowFormula && rowFormula.trim()) {
      columns
        .filter(col => col.type === 'number' && col.id !== editingColumn?.id)
        .forEach(col => {
          const shortName = col.name.toLowerCase().replace(/\s+/g, '');
          processedRowFormula = processedRowFormula.replaceAll(`@${shortName}`, col.id);
        });
    }
    
    // Only include rowFormula if enableRowFormula is true and formula is not empty
    const rowFormulaProp = enableRowFormula && processedRowFormula.trim() 
      ? { rowFormula: processedRowFormula.trim() } 
      : { rowFormula: undefined };
    
    if (editingColumn) {
      if (editingColumn.id === 'unitPrice') {
        // Special handling for unitPrice column - only update rowFormula
        const updatedColumn: QuoteColumn = {
          ...editingColumn,
          ...rowFormulaProp
        };
        onEditColumn(updatedColumn);
      } else {
        // Regular column editing
        if (!newColumnName.trim()) return;
        const updatedColumn: QuoteColumn = {
          ...editingColumn,
          name: newColumnName.trim(),
          type: newColumnType,
          dateFormat: newColumnType === 'date' ? newColumnDateFormat : undefined,
          calculation: newColumnType === 'number' && selectedCalc !== 'none' ? {
            type: selectedCalc as any,
            formula: selectedCalc === 'custom' ? customFormula : undefined
          } : undefined,
          ...rowFormulaProp
        };
        onEditColumn(updatedColumn);
      }
    } else {
      // Add new column (unitPrice can't be added, only configured)
      if (!newColumnName.trim()) return;
      if (onAddColumn) {
        const newColumn: Omit<QuoteColumn, 'id'> = {
          name: newColumnName.trim(),
          type: newColumnType,
          dateFormat: newColumnType === 'date' ? newColumnDateFormat : undefined,
          calculation: newColumnType === 'number' && selectedCalc !== 'none' ? {
            type: selectedCalc as any,
            formula: selectedCalc === 'custom' ? customFormula : undefined
          } : undefined,
          ...rowFormulaProp
        };
        onAddColumn(newColumn);
      }
    }
    
    setIsColumnDialogOpen(false);
    setEditingColumn(null);
    setNewColumnName('');
    setNewColumnType('text');
    setNewColumnDateFormat('single');
    setSelectedCalc('none');
    setCustomFormula('');
    setEnableRowFormula(false);
    setRowFormula('');
  };

  const handleOpenCalcDialog = (column: QuoteColumn) => {
    setConfigCalcCol(column);
    setSelectedCalc(column.calculation?.type || 'none');
    setCustomFormula(column.calculation?.formula || '');
    setIsCalcDialogOpen(true);
  };

  const handleSaveCalculation = () => {
    if (!configCalcCol || !onUpdateColumnCalculation) return;
    
    const calculation = { 
      type: selectedCalc as any, 
      formula: selectedCalc === 'custom' ? customFormula : undefined 
    };
    
    onUpdateColumnCalculation(configCalcCol.id, calculation);
    setIsCalcDialogOpen(false);
    setConfigCalcCol(null);
  };

  const handleRemoveSelectedItems = () => {
    selectedItems.sort((a, b) => b - a).forEach(index => remove(index));
    setSelectedItems([]);
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAllItems = () => {
    setSelectedItems(fields.map((_, index) => index));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, colIndex) => (
                <TableHead key={col.id} className={col.id === 'description' ? 'w-1/2' : undefined}>
                  <div className="flex items-center justify-between gap-2 min-w-[120px]">
                    <span>{col.name}</span>
{(col.id.startsWith('custom_') || col.id === 'unitPrice') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Settings className="h-3 w-3" />
                            <span className="sr-only">{(T as any).columnOptions}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenColumnDialog(col)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {col.id === 'unitPrice' ? (T as any).configurePriceFormula : (T as any).editColumn}
                          </DropdownMenuItem>
                          {col.id.startsWith('custom_') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onMoveColumn(colIndex, 'left')}
                                disabled={colIndex === 0}
                              >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {(T as any).moveLeft}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onMoveColumn(colIndex, 'right')}
                                disabled={colIndex === columns.length - 1}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                {(T as any).moveRight}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onDeleteColumn(col)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {(T as any).deleteColumn}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-[50px]">
                {/* New Add Column Button: simple, opens dialog */}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => {
                    // Reset all states when adding new column
                    setEditingColumn(null);
                    setNewColumnName('');
                    setNewColumnType('text');
                    setNewColumnDateFormat('single');
                    setSelectedCalc('none');
                    setCustomFormula('');
                    setEnableRowFormula(false);
                    setRowFormula('');
                    setIsColumnDialogOpen(true);
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="sr-only">{(T as any).addColumn}</span>
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((item, index) => (
              <TableRow key={item.id}>
                {columns.map(col => (
                  <TableCell key={col.id}>
                    {col.type === 'number' && col.rowFormula
                      ? (() => {
                          try {
                            const currentItem = watchedItems?.[index];
                            if (!currentItem) return <span className="text-xs text-gray-500">-</span>;
                            const rowVals: Record<string, number> = {};
                            columns.forEach(c => {
                              if (c.type === 'number' && c.id !== col.id) {
                                const value = ['description', 'unitPrice'].includes(c.id)
                                  ? Number(currentItem[c.id]) || 0
                                  : Number(currentItem.customFields?.[c.id]) || 0;
                                rowVals[c.id] = value;
                              }
                            });
                            let expr = col.rowFormula;
                            Object.entries(rowVals).forEach(([cid, val]) => {
                              expr = expr.replaceAll(cid, val.toString());
                            });
                            // eslint-disable-next-line no-eval
                            const result = eval(expr);
                            return (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-blue-600">
                                  {!isNaN(result) ? Number(result).toLocaleString() : (T as any).error}
                                </span>
                              </div>
                            );
                          } catch {
                            return <span className="text-xs text-red-500">{(T as any).errorInFormula}</span>;
                          }
                        })()
                      : (
                        <FormField
                          control={control}
                          name={`${fieldArrayName}.${sectionIndex}.items.${index}.${['description', 'unitPrice'].includes(col.id) ? col.id as 'description' | 'unitPrice' : `customFields.${col.id}`}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type={col.type === 'date' ? 'text' : col.type} 
                                  {...field}
                                  value={field.value || (col.type === 'number' ? '0' : '')}
                                  className="border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 shadow-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                  </TableCell>
                ))}
                <TableCell>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{(T as any).delete}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Add Column Dialog */}
        <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingColumn?.id === 'unitPrice' 
                  ? (T as any).configurePriceFormula 
                  : editingColumn 
                    ? `${(T as any).editColumn}: ${editingColumn.name}`
                    : (T as any).addColumn
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Only show name/type inputs for non-unitPrice columns */}
              {editingColumn?.id !== 'unitPrice' && (
                <>
                  <div>
                    <Label htmlFor="new-col-name">{(T as any).columnName}</Label>
                    <Input id="new-col-name" value={newColumnName} onChange={e => setNewColumnName(e.target.value)} placeholder={(T as any).columnName} />
                  </div>
                  <div>
                    <Label>{(T as any).columnType}</Label>
                    <RadioGroup value={newColumnType} onValueChange={v => setNewColumnType(v as QuoteColumn['type'])} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="text" id="type-text" />
                        <Label htmlFor="type-text">{(T as any).text}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="number" id="type-number" />
                        <Label htmlFor="type-number">{(T as any).number}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="date" id="type-date" />
                        <Label htmlFor="type-date">{(T as any).date}</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}
                
              {/* Show formula configuration for number columns (including unitPrice) */}
              {(newColumnType === 'number' || editingColumn?.id === 'unitPrice') && (
                <div className="space-y-3">
                  {editingColumn?.id !== 'unitPrice' && (
                    <>
                      <div>
                        <Label>{(T as any).calculationType}</Label>
                        <Select value={selectedCalc} onValueChange={setSelectedCalc}>
                          <SelectTrigger>
                            <SelectValue placeholder={(T as any).calculationType} />
                          </SelectTrigger>
                          <SelectContent>
                            {calculationTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedCalc === 'custom' && (
                        <div>
                          <Label htmlFor="new-custom-formula-improved">{(T as any).customFormula}</Label>
                          <Input
                            id="new-custom-formula-improved"
                            placeholder={(T as any).formulaPlaceholder}
                            value={customFormula}
                            onChange={(e) => setCustomFormula(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {(T as any).formulaHelp}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox id="enable-row-formula" checked={enableRowFormula} onCheckedChange={v => setEnableRowFormula(!!v)} />
                    <Label htmlFor="enable-row-formula" className="text-sm">
                      {editingColumn?.id === 'unitPrice' 
                        ? (T as any).unitPriceRowFormulaDesc
                        : (T as any).rowFormulaDesc
                      }
                    </Label>
                  </div>
                  {enableRowFormula && (
                    <div className="space-y-4">
                      <Label htmlFor="row-formula">
                        {editingColumn?.id === 'unitPrice' 
                          ? (T as any).priceFormulaLabel
                          : (T as any).cellFormulaLabel
                        }
                      </Label>
                      
                      {/* Simplified Formula Builder */}
                      <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
                        {/* Formula Input */}
                        <div className="space-y-2">
                          <Label htmlFor="smart-formula" className="text-sm font-medium">
                            {(T as any).enterFormulaInstruction}
                          </Label>
                          <div className="relative">
                            <Input
                              id="smart-formula"
                              placeholder={(() => {
                                const numberCols = columns.filter(col => col.type === 'number' && col.id !== editingColumn?.id);
                                if (numberCols.length >= 2) {
                                  const col1 = numberCols[0].name.toLowerCase().replace(/\s+/g, '');
                                  const col2 = numberCols[1].name.toLowerCase().replace(/\s+/g, '');
                                  return `${(T as any).formulaExample}: @${col1} * @${col2} + 1000`;
                                } else if (numberCols.length === 1) {
                                  const col1 = numberCols[0].name.toLowerCase().replace(/\s+/g, '');
                                  return `${(T as any).formulaExample}: @${col1} * 2 + 500`;
                                }
                                return (T as any).createNumberColumnsFirst;
                              })()}
                              value={rowFormula}
                              onChange={e => setRowFormula(e.target.value)}
                              className="font-mono text-sm pr-12"
                            />
                            {rowFormula && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setRowFormula('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-xs text-gray-500 hover:text-gray-700"
                              >
                                ✕
                              </Button>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {/* Quick insert buttons for available columns */}
                            {columns
                              .filter(col => col.type === 'number' && col.id !== editingColumn?.id)
                              .slice(0, 3) // Show max 3 quick buttons
                              .map(col => {
                                const shortName = col.name.toLowerCase().replace(/\s+/g, '');
                                return (
                                  <Button
                                    key={col.id}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs bg-gray-200 hover:bg-gray-300 border border-gray-300"
                                    onClick={() => {
                                      const formulaInput = document.getElementById('smart-formula') as HTMLInputElement;
                                      const cursorPos = formulaInput?.selectionStart || rowFormula.length;
                                      const newFormula = rowFormula.slice(0, cursorPos) + `@${shortName}` + rowFormula.slice(cursorPos);
                                      setRowFormula(newFormula);
                                    }}
                                  >
                                    + {col.name}
                                  </Button>
                                );
                              })
                            }
                          </div>
                        </div>
                        
                        {/* Live Preview removed as requested */}
                        
                        {/* Help text */}
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><strong>{(T as any).howToUse}</strong></p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>{(T as any).useColumnReference}</li>
                            <li>{(T as any).useOperators}</li>
                            <li>{(T as any).formulaExample}: <code className="bg-gray-200 px-1 rounded">@sogio * @dongia + 50000</code></li>
                          </ul>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {editingColumn?.id === 'unitPrice' 
                          ? (T as any).unitPriceFormulaNote
                          : (T as any).rowFormulaNote
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
                
              {/* Date format options for date columns */}
              {newColumnType === 'date' && editingColumn?.id !== 'unitPrice' && (
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium">{(T as any).dateFormat}</Label>
                  <Select value={newColumnDateFormat} onValueChange={(value) => setNewColumnDateFormat(value as 'single' | 'range')}>
                    <SelectTrigger>
                      <SelectValue placeholder={(T as any).selectFormat} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{(T as any).singleDate}</SelectItem>
                      <SelectItem value="range">{(T as any).dateRange}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => {
                setNewColumnName('');
                setNewColumnType('text');
                setNewColumnDateFormat('single');
                setSelectedCalc('none');
                setCustomFormula('');
                setEnableRowFormula(false);
                setRowFormula('');
                setIsColumnDialogOpen(false);
              }}>{(T as any).cancel}</Button>
              <Button type="button" onClick={handleSaveColumn}>
                {editingColumn?.id === 'unitPrice' 
                  ? (T as any).savePriceConfig
                  : (editingColumn ? (T as any).saveChanges : (T as any).addColumn)
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Removed duplicate columns.map rendering after Dialog. The main TableBody/TableRow already handles rowFormula logic per cell. */}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Input
              placeholder={(T as any).newItemPlaceholder}
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddItem();
                  }
              }}
              className="h-9 flex-grow"
          />
          <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={handleAddItem}
                          disabled={!newItemDescription.trim()}
                      >
                          <PlusCircle className="h-4 w-4" />
                          <span className="sr-only">{(T as any).addItem}</span>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{(T as any).addItem}</p></TooltipContent>
              </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={handlePaste}>
                          <ClipboardPaste className="h-4 w-4" />
                          <span className="sr-only">{(T as any).pasteTable}</span>
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{(T as any).pasteTable}</p></TooltipContent>
              </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </>
  );
}

QuoteSectionComponent.defaultProps = {
  onUpdateColumnCalculation: () => {},
};


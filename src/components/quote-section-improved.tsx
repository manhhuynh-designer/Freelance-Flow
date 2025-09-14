 "use client";

import * as React from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { 
  PlusCircle, 
  Trash2, 
  MoreVertical, 
  ArrowLeft, 
  ArrowRight, 
  Pencil, 
  ClipboardPaste, 
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

// Timeline Editor Component
const TimelineEditor = ({ field, taskStartDate, taskEndDate }: {
  field: any;
  taskStartDate?: Date;
  taskEndDate?: Date;
}) => {
  // Parse current field value once per change
  const parsedValue = React.useMemo(() => {
    if (!field?.value) return null as any;
    if (typeof field.value === 'string') {
      try { return JSON.parse(field.value); } catch { return null as any; }
    }
    if (typeof field.value === 'object') return field.value as any;
    return null as any;
  }, [field?.value]);

  // Determine if initialization is needed and hold a stable default in a ref
  const needsInit = !parsedValue || !parsedValue.start || !parsedValue.end;
  const defaultRef = React.useRef<any>(null);
  if (needsInit && defaultRef.current == null) {
    const now = new Date();
    const week = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    defaultRef.current = { start: now.toISOString(), end: week.toISOString(), color: 'hsl(210,60%,55%)' };
  }

  // Initialize the field AFTER render to avoid setState during render warnings
  React.useEffect(() => {
    if (needsInit && defaultRef.current) {
      field.onChange(JSON.stringify(defaultRef.current));
    }
    // We intentionally depend only on needsInit to avoid repeated writes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsInit]);

  const timelineObj = (!needsInit || !defaultRef.current) ? parsedValue : defaultRef.current;
  const startDate = new Date(timelineObj.start);
  const endDate = new Date(timelineObj.end);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const updateDate = (isStart: boolean, newDate: Date) => {
    // Clamp within task range if provided
    if (taskStartDate && newDate < taskStartDate) newDate = taskStartDate;
    if (taskEndDate && newDate > taskEndDate) newDate = taskEndDate;
    
    const updates: any = {};
    if (isStart) {
      updates.start = newDate.toISOString();
      // Don't auto-adjust end date - keep it independent
    } else {
      updates.end = newDate.toISOString();
      // Don't auto-adjust start date - keep it independent
    }
    
    const next = { ...timelineObj, ...updates };
    field.onChange(JSON.stringify(next));
  };

  const DraggableDate = ({ date, isStart }: { date: Date; isStart: boolean }) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStartRef = React.useRef({ x: 0, initialDate: date.getTime() });

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, initialDate: date.getTime() };
      
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStartRef.current.x;
        const daysDelta = Math.round(deltaX / 10); // 10px per day
        
        if (Math.abs(daysDelta) >= 1) {
          const newTime = dragStartRef.current.initialDate + (daysDelta * 24 * 60 * 60 * 1000);
          const newDate = new Date(newTime);
          
          updateDate(isStart, newDate);
          
          // Update reference point for smooth dragging
          dragStartRef.current.x = e.clientX;
          dragStartRef.current.initialDate = newTime;
        }
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    return (
      <span
        className={`text-xs cursor-ew-resize select-none px-1 py-0.5 rounded transition-colors ${
          isDragging ? 'bg-blue-100 cursor-grabbing' : 'hover:bg-gray-100'
        }`}
        onMouseDown={handleMouseDown}
        title={`Kéo trái/phải để thay đổi ${isStart ? 'ngày bắt đầu' : 'ngày kết thúc'}`}
      >
        {formatDate(date)}
      </span>
    );
  };

  return (
    <div className="flex gap-1 items-center">
      <DraggableDate date={startDate} isStart={true} />
      <span className="text-[10px] text-gray-400">-</span>
      <DraggableDate date={endDate} isStart={false} />
    </div>
  );
};

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
  onPaste?: (sectionIndex: number, text: string) => void;
  onItemChange: any;
  onUpdateColumnCalculation?: (colId: string, calculation: { type: string; formula?: string }) => void;
  onAddColumn?: (column: Omit<QuoteColumn, 'id'>) => void;
  T: any;
  taskStartDate?: Date;
  taskEndDate?: Date;
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
    T,
    taskStartDate,
    taskEndDate
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
  
  // State for manual paste dialog - moved up to avoid initialization error
  const [isPasteDialogOpen, setIsPasteDialogOpen] = React.useState(false);
  const [pasteText, setPasteText] = React.useState('');
  
  // State for delete section confirmation
  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] = React.useState(false);
  
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
  // DnD state for row reordering
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  
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

  // Improved paste handler with better error handling and user feedback
  const handlePaste = async () => {
    if (!onPaste) {
      toast({
        variant: 'destructive',
        title: (T as any).pasteNotAvailable || 'Paste Not Available',
        description: (T as any).pasteNotAvailableDesc || 'Paste functionality is not available for this section.'
      });
      return;
    }

    try {
      let pasteText = '';
      
      // Try modern Clipboard API with permission handling
      if (navigator.clipboard) {
        try {
          // Check permissions first
          const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
          
          if (permission.state === 'granted') {
            pasteText = await navigator.clipboard.readText();
          } else if (permission.state === 'prompt') {
            // User will be prompted, try to read
            pasteText = await navigator.clipboard.readText();
          } else {
            // Permission denied, fall back to manual input
            throw new Error('Clipboard access denied');
          }
        } catch (clipboardError) {
          console.warn('Clipboard API access failed:', clipboardError);
          // Continue to fallback
        }
      }
      
      // Validate the retrieved text
      if (pasteText && pasteText.trim()) {
        // Basic validation to ensure we have tabular data
        const lines = pasteText.trim().split(/\r?\n/);
        const hasTabularData = lines.some(line => line.includes('\t')) || lines.length > 1;
        
        if (hasTabularData) {
          onPaste(sectionIndex, pasteText);
          return;
        } else {
          toast({ 
            variant: 'destructive', 
            title: (T as any).pasteFailed || 'Paste Failed',
            description: (T as any).clipboardInvalidFormat || 'Clipboard does not contain valid tabular data. Please copy data from a spreadsheet.'
          });
          setIsPasteDialogOpen(true);
          setPasteText('');
          return;
        }
      }
      
      // If we reach here, clipboard was empty or invalid
      toast({ 
        variant: 'destructive', 
        title: (T as any).clipboardEmpty || 'Clipboard Empty',
        description: (T as any).clipboardEmptyDesc || 'Clipboard is empty. Please copy some data first or use manual input.'
      });
      
    } catch (error) {
      console.error('Clipboard access failed:', error);
      toast({
        variant: 'destructive',
        title: (T as any).clipboardAccessFailed || 'Clipboard Access Failed',
        description: (T as any).clipboardAccessFailedDesc || 'Unable to access clipboard. Please use manual input.'
      });
    }
    
    // Always fallback to manual paste dialog
    setIsPasteDialogOpen(true);
    setPasteText('');
  };

  const handleManualPaste = () => {
    if (!onPaste) {
      toast({
        variant: 'destructive',
        title: (T as any).pasteNotAvailable || 'Paste Not Available',
        description: (T as any).pasteNotAvailableDesc || 'Paste functionality is not available for this section.'
      });
      return;
    }

    if (pasteText.trim()) {
      onPaste(sectionIndex, pasteText);
      setIsPasteDialogOpen(false);
      setPasteText('');
    } else {
      toast({ 
        variant: 'destructive', 
        title: (T as any).clipboardInvalidFormat || 'Please enter some data to paste'
      });
    }
  };

  const handleDeleteSection = () => {
    setIsDeleteSectionDialogOpen(true);
  };

  const confirmDeleteSection = () => {
    onRemoveSection(sectionIndex);
    setIsDeleteSectionDialogOpen(false);
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
      
      // Always add timeline data for new items
      const currentItems = watchedItems || [];
      const newItemIndex = currentItems.length;
      const totalItems = newItemIndex + 1;
      
      customFields.timeline = createInitialTimelineData(taskStartDate, taskEndDate, newItemIndex, totalItems);
      
      append({
        description: newItemDescription.trim(),
        unitPrice: 0,
        customFields: customFields,
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

  // Drag & Drop handlers
  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDragIndex(index);
    // Required for Firefox to initiate drag
    try { e.dataTransfer.setData('text/plain', String(index)); } catch {}
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnter = (index: number) => {
    if (dragIndex !== null && index !== dragIndex) {
      setDragOverIndex(index);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    // Allow dropping
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex !== null && index !== dragIndex) {
      move(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 p-4 bg-muted/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-3">
          <FormField
            control={control}
            name={`${fieldArrayName}.${sectionIndex}.name`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    {...field}
                    placeholder={(T as any).sectionName || "Section name..."}
                    className="text-lg font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Badge variant="outline" className="text-xs">
            {fields.length} {(T as any).items || "items"}
          </Badge>
        </div>
        
        {canDeleteSection && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={handleDeleteSection}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{(T as any).deleteSection || "Delete section"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{(T as any).deleteSection || "Delete section"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="overflow-x-auto" data-section-index={sectionIndex}>
        <Table>
          <TableHeader>
            <TableRow>
              {/* Reorder handle header */}
              <TableHead className="p-0 w-[28px] min-w-[28px] max-w-[28px]" />
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
                <TableRow
                key={item.id}
                onDragEnter={() => handleDragEnter(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(index, e)}
                onDragEnd={handleDragEnd}
                className={dragOverIndex === index ? 'bg-muted/40 transition-colors' : undefined}
              >
                {/* Reorder cell with drag handle + up/down buttons */}
                <TableCell className="p-0 w-[28px] min-w-[28px] max-w-[28px]">
                  <div className="flex items-center justify-center h-full">
                    <button
                      type="button"
                      aria-label={(T as any).dragToReorder || 'Drag to reorder'}
                      className={`inline-flex items-center justify-center rounded hover:bg-muted cursor-grab active:cursor-grabbing ${dragIndex === index ? 'opacity-70' : ''} h-5 w-5 p-[2px]`}
                      draggable
                      onDragStart={(e) => handleDragStart(index, e)}
                    >
                      <GripVertical className="h-6 w-6 text-muted-foreground" />
                    </button>
                  </div>
                </TableCell>
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
                                {col.id === 'timeline' ? (
                                  // Draggable timeline editor with date picker
                                  <TimelineEditor 
                                    field={field} 
                                    taskStartDate={taskStartDate} 
                                    taskEndDate={taskEndDate}
                                  />
                                ) : (
                                  <Input 
                                    type={col.type === 'date' ? 'text' : col.type} 
                                    {...field}
                                    value={field.value || (col.type === 'number' ? '0' : '')}
                                    className="border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 shadow-none"
                                  />
                                )}
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
          {onPaste && (
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
          )}
        </div>
      </div>

      {/* Manual Paste Dialog */}
      <Dialog open={isPasteDialogOpen} onOpenChange={setIsPasteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{(T as any).pasteTable || 'Paste Table Data'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {(T as any).pasteInstructions || 'Copy your table data (from Excel, Google Sheets, etc.) and paste it here using Ctrl+V:'}
            </p>
            <Textarea
              placeholder={(T as any).pasteHere || 'Paste your table data here...'}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onPaste={(e) => {
                // Handle paste event more directly
                const clipboardData = e.clipboardData?.getData('text');
                if (clipboardData) {
                  setPasteText(clipboardData);
                  e.preventDefault(); // Prevent default to avoid duplicate handling
                }
              }}
              className="min-h-[200px] font-mono text-sm"
              autoFocus
            />
            <div className="text-xs text-muted-foreground">
              {(T as any).pasteExample || 'Example: Each row on a new line, columns separated by tabs'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasteDialogOpen(false)}>
              {(T as any).cancel || 'Cancel'}
            </Button>
            <Button onClick={handleManualPaste} disabled={!pasteText.trim()}>
              {(T as any).paste || 'Paste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Section Confirmation Dialog */}
      <AlertDialog open={isDeleteSectionDialogOpen} onOpenChange={setIsDeleteSectionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{(T as any).confirmDeleteSection || "Delete Section?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {(T as any).confirmDeleteSectionDesc || "Are you sure you want to delete this section? This action cannot be undone and will remove all items in this section."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{(T as any).cancel || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {(T as any).deleteSection || "Delete Section"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

QuoteSectionComponent.defaultProps = {
  onUpdateColumnCalculation: () => {},
};


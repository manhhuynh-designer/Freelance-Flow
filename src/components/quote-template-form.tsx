"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, ClipboardPaste, FolderPlus, SplitSquareVertical } from "lucide-react";
import React from "react";
import type { QuoteTemplate, QuoteColumn, AppSettings, QuoteSection, ColumnCalculationType } from "@/lib/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { i18n } from "@/lib/i18n";
import { QuoteSectionComponent } from "./quote-section-improved";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const templateFormSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters."),
  sections: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Section name cannot be empty."),
    items: z.array(
        z.object({
            description: z.string().min(1, "Description cannot be empty."),
            unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
            customFields: z.record(z.any()).optional(),
        })
    ).min(1, "A section must have at least one item."),
  })).min(1, "A quote must have at least one section.")
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

type QuoteTemplateFormProps = {
  setOpen: (open: boolean) => void;
  onSubmit: (values: TemplateFormValues, columns: QuoteColumn[]) => void;
  templateToEdit?: QuoteTemplate;
  language: 'en' | 'vi';
  settings: AppSettings;
};

export function QuoteTemplateForm({ setOpen, onSubmit: onFormSubmit, templateToEdit, language, settings }: QuoteTemplateFormProps) {
  const isEditMode = !!templateToEdit;
  const T = i18n[language];
  const { toast } = useToast();

  const defaultColumns: QuoteColumn[] = [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ];

  const [columns, setColumns] = React.useState<QuoteColumn[]>(
    isEditMode && templateToEdit?.columns ? templateToEdit.columns : defaultColumns
  );

  const [isColumnDialogOpen, setIsColumnDialogOpen] = React.useState(false);
  const [editingColumn, setEditingColumn] = React.useState<QuoteColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = React.useState<QuoteColumn | null>(null);
  
  const [newColumnName, setNewColumnName] = React.useState("");
  const [newColumnType, setNewColumnType] = React.useState<QuoteColumn['type']>('text');
  const [newColumnCalculation, setNewColumnCalculation] = React.useState<ColumnCalculationType>('none');
  const [newColumnDateFormat, setNewColumnDateFormat] = React.useState<'single' | 'range'>('single');
  const [customFormula, setCustomFormula] = React.useState<string>('');

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: isEditMode
      ? {
          name: templateToEdit.name,
          sections: templateToEdit.sections.map(section => ({ 
            id: section.id,
            name: section.name, 
            items: section.items.map(item => ({ ...item, id: `item-edit-${Date.now()}-${Math.random()}` })) 
          })),
        }
      : {
          name: "",
          sections: [{ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", unitPrice: 0, customFields: {} }] }],
        },
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection, replace: replaceSections } = useFieldArray({
    control: form.control,
    name: "sections",
  });

  const onSubmit = (data: TemplateFormValues) => {
    onFormSubmit(data, columns);
  };
  
  const handleCloseColumnDialog = () => {
    setIsColumnDialogOpen(false);
    setEditingColumn(null);
    setNewColumnName("");
    setNewColumnType("text");
    setNewColumnCalculation('none');
    setCustomFormula('');
  }

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      const newId = `custom_${Date.now()}`;
      setColumns(prev => [...prev, { 
          id: newId, 
          name: newColumnName.trim(), 
          type: newColumnType,
          calculation: newColumnType === 'number' && newColumnCalculation !== 'none' ? {
            type: newColumnCalculation,
            formula: newColumnCalculation === 'custom' ? customFormula : undefined
          } : undefined,
          dateFormat: newColumnType === 'date' ? newColumnDateFormat : undefined
      }]);
      
      form.getValues('sections').forEach((section, sectionIndex) => {
        section.items.forEach((item, itemIndex) => {
          form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields.${newId}`, 
            newColumnType === 'number' ? 0 : 
            newColumnType === 'date' ? null : 
            '');
        });
      });
      
      handleCloseColumnDialog();
    }
  }
  
  const handleStartEditColumn = (column: QuoteColumn) => {
    setEditingColumn(column);
    setNewColumnName(column.name);
    setNewColumnType(column.type);
    setNewColumnCalculation(column.calculation?.type || 'none');
    setCustomFormula(column.calculation?.formula || '');
    setNewColumnDateFormat(column.dateFormat || 'single');
    setIsColumnDialogOpen(true);
  }
  
  const handleUpdateColumn = () => {
    if (!editingColumn || !newColumnName.trim()) return;
    
    setColumns(prev => prev.map(c => c.id === editingColumn.id ? {
      ...c,
      name: newColumnName.trim(),
      type: newColumnType,
      calculation: newColumnType === 'number' && newColumnCalculation !== 'none' ? {
        type: newColumnCalculation,
        formula: newColumnCalculation === 'custom' ? customFormula : undefined
      } : undefined,
      dateFormat: newColumnType === 'date' ? newColumnDateFormat : undefined
    } : c));
    
    if (editingColumn.type === 'text' && newColumnType === 'number') {
      const sections = form.getValues('sections');
      sections.forEach((section, sectionIndex) => {
        section.items.forEach((item, itemIndex) => {
            const currentVal = item.customFields?.[editingColumn.id];
            if (typeof currentVal === 'string' || typeof currentVal === 'undefined') {
                form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields.${editingColumn.id}`, 0);
            }
        });
      });
    }

    handleCloseColumnDialog();
  }

  const handleConfirmDeleteColumn = () => {
    if (!deletingColumn) return;

    setColumns(prev => prev.filter(c => c.id !== deletingColumn.id));      const sections = form.getValues('sections');
      sections.forEach((section, sectionIndex) => {
        section.items.forEach((item, itemIndex) => {
          if (item.customFields) {
            const newCustomFields = {...item.customFields};
            delete newCustomFields[deletingColumn.id];
            form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields`, newCustomFields);
          }
        });
      });

    setDeletingColumn(null);
  }

  const handleMoveColumn = React.useCallback((index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    setColumns(currentColumns => {
        const newColumns = [...currentColumns];
        const temp = newColumns[index];
        newColumns[index] = newColumns[newIndex];
        newColumns[newIndex] = temp;
        return newColumns;
    });
  }, [columns.length]);

  const handlePasteInSection = React.useCallback((sectionIndex: number, text: string) => {
    const rows = text.trim().split('\n').map(row => row.split('\t'));
    if (rows.length < 1) {
      toast({ variant: 'destructive', title: T.pasteFailed, description: "Clipboard is empty or has invalid format" });
      return;
    }

    const headerRow = rows.shift()!;
    const newColumns: QuoteColumn[] = headerRow.map((header, index) => {
      const isNumeric = rows.every(row => !isNaN(parseFloat(row[index])));
      return { id: `custom_${Date.now()}_${index}`, name: header, type: isNumeric ? 'number' : 'text' };
    });

    const newItems = rows.map(row => {
      const item: any = { customFields: {} };
      newColumns.forEach((col, index) => {
        item.customFields[col.id] = row[index];
      });
      return {
        description: item.description || "",
        unitPrice: parseFloat(item.unitPrice) || 0,
        customFields: item.customFields || {},
      };
    });

    const allSections = form.getValues('sections') || [];
    if (allSections[sectionIndex]) {
      allSections[sectionIndex].items = newItems;
      form.setValue('sections', allSections);
    }

    toast({
      title: T.pastedFromClipboard,
      description: `${newItems.length} items and ${newColumns.length} columns have been imported.`
    });
  }, [T, toast, form]);

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{T.templateName}</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Standard Animation Package" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
        />

        <div className="space-y-4">
            <h3 className="text-lg font-medium">{T.templateQuoteItems}</h3>
            <div className="space-y-4">
              {sectionFields.map((section, index) => (
                  <QuoteSectionComponent
                      key={section.id}
                      sectionIndex={index}
                      control={form.control}
                      columns={columns}
                      fieldArrayName="sections"
                      T={T}
                      onRemoveSection={removeSection}
                      canDeleteSection={sectionFields.length > 1}
                      onMoveColumn={handleMoveColumn}
                      onEditColumn={handleStartEditColumn}
                      onDeleteColumn={setDeletingColumn}
                      onPaste={handlePasteInSection}
                      onItemChange={form.setValue}
                      onUpdateColumnCalculation={(colId, calculation) => {
                        setColumns(cols => cols.map(c => c.id === colId ? { 
                          ...c, 
                          calculation: calculation as {type: ColumnCalculationType; formula?: string}
                        } : c));
                      }}
                  />
              ))}
            </div>
            
            <div className="flex gap-2">
                <TooltipProvider><Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => appendSection({ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", unitPrice: 0, customFields: {} }] })}
                      >
                          <FolderPlus className="h-4 w-4" /><span className="sr-only">{T.addSection}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{T.addSection}</p></TooltipContent>
                </Tooltip></TooltipProvider>
                 <TooltipProvider><Tooltip>
                    <TooltipTrigger asChild>
                        <Button type="button" variant="outline" size="icon" onClick={() => setIsColumnDialogOpen(true)}>
                            <SplitSquareVertical className="h-4 w-4" /><span className="sr-only">{T.addColumn}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{T.addColumn}</p></TooltipContent>
                </Tooltip></TooltipProvider>
            </div>
        </div>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{T.cancel}</Button>
            <Button type="submit">{isEditMode ? T.saveChanges : T.createTemplate}</Button>
        </div>
      </form>
    </Form>
    <Dialog open={isColumnDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseColumnDialog()}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingColumn ? T.edit + " Column" : T.addColumn}</DialogTitle>
                <DialogDescription>{editingColumn ? "Update your column details." : "Enter a name and type for your new column."}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-column-name">Column Name</Label>
                  <Input 
                      id="new-column-name"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {if (e.key === 'Enter') e.preventDefault()}}
                  />
                </div>
                <div className="space-y-2">
                    <Label>Column Type</Label>
                    <RadioGroup value={newColumnType} onValueChange={(value: QuoteColumn['type']) => setNewColumnType(value)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="text" id="type-text" />
                            <Label htmlFor="type-text" className="font-normal">Text</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="number" id="type-number" />
                            <Label htmlFor="type-number" className="font-normal">Number</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="date" id="type-date" />
                            <Label htmlFor="type-date" className="font-normal">Ngày tháng</Label>
                        </div>
                    </RadioGroup>
                </div>
                {newColumnType === 'number' && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Calculation Logic</Label>
                        <Select value={newColumnCalculation} onValueChange={(value) => setNewColumnCalculation(value as ColumnCalculationType)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select calculation type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No calculation</SelectItem>
                                <SelectItem value="sum">Sum total</SelectItem>
                                <SelectItem value="average">Average</SelectItem>
                                <SelectItem value="count">Count items</SelectItem>
                                <SelectItem value="min">Minimum value</SelectItem>
                                <SelectItem value="max">Maximum value</SelectItem>
                                <SelectItem value="custom">Custom formula</SelectItem>
                            </SelectContent>
                        </Select>
                        {newColumnCalculation === 'custom' && (
                            <div className="mt-2">
                                <Input
                                    placeholder="Enter custom formula (e.g., SUM(A:A)*0.1)"
                                    value={customFormula}
                                    onChange={(e) => setCustomFormula(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                )}
                {newColumnType === 'date' && (
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Date Format</Label>
                        <Select value={newColumnDateFormat} onValueChange={(value: 'single' | 'range') => setNewColumnDateFormat(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select date format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single">Single Date</SelectItem>
                                <SelectItem value="range">Date Range</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleCloseColumnDialog}>{T.cancel}</Button>
                <Button type="button" onClick={editingColumn ? handleUpdateColumn : handleAddColumn}>
                    {editingColumn ? T.saveChanges : T.addColumn}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
     <AlertDialog open={!!deletingColumn} onOpenChange={(isOpen) => !isOpen && setDeletingColumn(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{T.areYouSure}?</AlertDialogTitle>
                <AlertDialogDescription>
                    {T.deletePermanently} "{deletingColumn?.name}" column.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingColumn(null)}>{T.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteColumn}>{T.delete}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}


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
import { PlusCircle, ClipboardPaste, FolderPlus, SplitSquareVertical } from "lucide-react";
import React from "react";
import type { QuoteTemplate, QuoteColumn, AppSettings, QuoteSection } from "@/lib/types";
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
import { QuoteSectionComponent } from "./quote-section";
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
            quantity: z.coerce.number().min(0, "Quantity must be at least 0.").optional().default(1),
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
    { id: 'quantity', name: T.quantity, type: 'number' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', sumTotal: false },
  ];

  const [columns, setColumns] = React.useState<QuoteColumn[]>(
    isEditMode && templateToEdit?.columns ? templateToEdit.columns : defaultColumns
  );

  const [isColumnDialogOpen, setIsColumnDialogOpen] = React.useState(false);
  const [editingColumn, setEditingColumn] = React.useState<QuoteColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = React.useState<QuoteColumn | null>(null);
  
  const [newColumnName, setNewColumnName] = React.useState("");
  const [newColumnType, setNewColumnType] = React.useState<QuoteColumn['type']>('text');
  const [newColumnSum, setNewColumnSum] = React.useState(false);

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
          sections: [{ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", quantity: 1, unitPrice: 0, customFields: {} }] }],
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
    setNewColumnSum(false);
  }

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      const newId = `custom_${Date.now()}`;
      setColumns(prev => [...prev, { 
          id: newId, 
          name: newColumnName.trim(), 
          type: newColumnType,
          sumTotal: newColumnType === 'number' ? newColumnSum : undefined,
      }]);
      
      form.getValues('sections').forEach((section, sectionIndex) => {
        section.items.forEach((item, itemIndex) => {
          form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields.${newId}`, newColumnType === 'number' ? 0 : '');
        });
      });
      
      handleCloseColumnDialog();
    }
  }
  
  const handleStartEditColumn = (column: QuoteColumn) => {
    setEditingColumn(column);
    setNewColumnName(column.name);
    setNewColumnType(column.type);
    setNewColumnSum(column.sumTotal || false);
    setIsColumnDialogOpen(true);
  }
  
  const handleUpdateColumn = () => {
    if (!editingColumn || !newColumnName.trim()) return;
    
    setColumns(prev => prev.map(c => c.id === editingColumn.id ? {
      ...c,
      name: newColumnName.trim(),
      type: newColumnType,
      sumTotal: newColumnType === 'number' ? newColumnSum : undefined,
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

    setColumns(prev => prev.filter(c => c.id !== deletingColumn.id));
    
    const sections = form.getValues('sections');
    sections.forEach((section, sectionIndex) => {
        section.items.forEach((item, itemIndex) => {
            if (deletingColumn.id === 'quantity') {
                form.setValue(`sections.${sectionIndex}.items.${itemIndex}.quantity`, 1);
            } else if (item.customFields) {
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
      toast({ variant: 'destructive', title: "Clipboard is empty or has invalid format" });
      return;
    }
  
    const headerRow = rows.shift()!;
    let hasUnitPrice = false;
  
    const newColumns: QuoteColumn[] = headerRow.map((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('quantity') || lowerHeader.includes('số lượng')) return { id: 'quantity', name: header, type: 'number', sumTotal: false };
      if (index === 0) return { id: 'description', name: header, type: 'text' };
      if (!hasUnitPrice && index === headerRow.length - 1) {
        hasUnitPrice = true;
        return { id: 'unitPrice', name: header, type: 'number', sumTotal: false };
      }
      const isNumeric = rows.every(row => {
          const cell = row[index] || '';
          const sanitized = cell.replace(/\./g, '').replace(',', '.');
          return cell.trim() === '' || !isNaN(parseFloat(sanitized));
      });
      return { id: `custom_${Date.now()}_${index}`, name: header, type: isNumeric ? 'number' : 'text', sumTotal: false };
    });
  
    if (!hasUnitPrice && newColumns.length > 1) {
        const lastColIndex = newColumns.length -1;
        newColumns[lastColIndex].id = 'unitPrice';
    }
    
    // Only update columns if it's the first section being pasted into.
    if (sectionIndex === 0) {
        setColumns(newColumns);
    }
  
    const newItems = rows.map(row => {
      const item: any = { customFields: {} };
      newColumns.forEach((col, index) => {
        const cellValue = row[index] || '';
        const value = col.type === 'number' ? parseFloat(cellValue.replace(/\./g, '').replace(',', '.')) || 0 : cellValue;
        
        if (['description', 'quantity', 'unitPrice'].includes(col.id)) {
          item[col.id] = value;
        } else if (col.id.startsWith('custom_')) {
          item.customFields[col.id] = value;
        }
      });
      return {
        description: item.description ?? "",
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        customFields: item.customFields ?? {},
      };
    });
    
    form.setValue(`sections.${sectionIndex}.items`, newItems);

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
                          onClick={() => appendSection({ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", quantity: 1, unitPrice: 0, customFields: {} }] })}
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
                    </RadioGroup>
                </div>
                {newColumnType === 'number' && (
                    <div className="flex items-center space-x-2 pl-1 pt-2">
                        <Checkbox id="sum-total" checked={newColumnSum} onCheckedChange={(checked) => setNewColumnSum(Boolean(checked))} />
                        <Label htmlFor="sum-total" className="text-sm font-normal">
                            Calculate total for this column
                        </Label>
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

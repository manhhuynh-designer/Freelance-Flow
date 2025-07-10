
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CalendarIcon, PlusCircle, Trash2, MoreVertical, Pencil, ClipboardPaste, Copy, ChevronsUpDown, ChevronUp, ChevronDown, ArrowLeft, ArrowRight, Link as LinkIcon, Briefcase, FolderPlus, SplitSquareVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useState, useMemo, useCallback } from "react";
import type { Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, QuoteSection, Category } from "@/lib/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
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
} from "@/components/ui/alert-dialog";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Separator } from "./ui/separator";
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { type SuggestQuoteOutput } from "@/ai/flows/suggest-quote";
import { QuoteSuggestion } from "./quote-suggestion";
import { QuoteSectionComponent } from "./quote-section";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const formSchema = z.object({
  name: z.string().min(2, "Task name must be at least 2 characters."),
  description: z.string().optional(),
  briefLink: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  driveLink: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  clientId: z.string().min(1, "Please select a client."),
  collaboratorId: z.string().optional(),
  categoryId: z.string().min(1, "Please select a category."),
  status: z.enum(["todo", "inprogress", "done", "onhold", "archived"]),
  subStatusId: z.string().optional(),
  dates: z.object({
    from: z.date({ required_error: "Start date is required." }),
    to: z.date({ required_error: "Deadline is required." }),
  }),
  sections: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Section name cannot be empty."),
    items: z.array(
        z.object({
            id: z.string().optional(),
            description: z.string().min(1, "Description cannot be empty."),
            quantity: z.coerce.number().min(0, "Quantity must be at least 0.").optional().default(1),
            unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
            customFields: z.record(z.any()).optional(),
        })
    ).min(1, "A section must have at least one item."),
  })).min(1, "A quote must have at least one section."),
  collaboratorSections: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, "Section name cannot be empty."),
      items: z.array(
        z.object({
          id: z.string().optional(),
          description: z.string().min(1, "Description cannot be empty."),
          quantity: z.coerce.number().min(0, "Quantity must be at least 0.").optional().default(1),
          unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
          customFields: z.record(z.any()).optional(),
        })
      ),
    })
  ).optional(),
});

export type TaskFormValues = z.infer<typeof formSchema>;

type CreateTaskFormProps = {
  setOpen: (open: boolean) => void;
  onSubmit: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[]) => void;
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
};

export function CreateTaskForm({ setOpen, onSubmit: onFormSubmit, clients, collaborators, categories, onAddClient, quoteTemplates, settings }: CreateTaskFormProps) {
  const { toast } = useToast();
  const T = i18n[settings.language];
  
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [isCollaboratorSectionOpen, setIsCollaboratorSectionOpen] = useState(false);
  
  const defaultColumns: QuoteColumn[] = React.useMemo(() => [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'quantity', name: T.quantity, type: 'number' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', sumTotal: false },
  ], [T, settings.currency]);

  const [columns, setColumns] = useState<QuoteColumn[]>(defaultColumns);
  const [collaboratorColumns, setCollaboratorColumns] = useState<QuoteColumn[]>(defaultColumns);
  
  // Column Dialog states
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<QuoteColumn | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<QuoteColumn | null>(null);
  
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<QuoteColumn['type']>('text');
  const [newColumnSum, setNewColumnSum] = useState(false);
  
  // Collab Column Dialog states
  const [isCollabColumnDialogOpen, setIsCollabColumnDialogOpen] = useState(false);
  const [editingCollabColumn, setEditingCollabColumn] = useState<QuoteColumn | null>(null);
  const [deletingCollabColumn, setDeletingCollabColumn] = useState<QuoteColumn | null>(null);
  const [newCollabColumnName, setNewCollabColumnName] = useState("");
  const [newCollabColumnType, setNewCollabColumnType] = useState<QuoteColumn['type']>('text');
  const [newCollabColumnSum, setNewCollabColumnSum] = useState(false);
  
  const [templateToApply, setTemplateToApply] = useState<QuoteTemplate | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", description: "", briefLink: "", driveLink: "", clientId: "",
      collaboratorId: "", categoryId: "", status: "todo", subStatusId: "",
      sections: [{ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", quantity: 1, unitPrice: 0, customFields: {} }] }],
      collaboratorSections: [],
    }
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection, move } = useFieldArray({ control: form.control, name: "sections" });
  const { fields: collabSectionFields, append: collabAppendSection, remove: collabRemoveSection, move: moveCollabItem } = useFieldArray({ control: form.control, name: "collaboratorSections" });

  const onSubmit = (data: TaskFormValues) => {
    onFormSubmit(data, columns, collaboratorColumns);
  };
  
  const handleAddNewClient = () => {
    if (newClientName.trim() && onAddClient) {
        const newClient = onAddClient({ name: newClientName.trim() });
        form.setValue("clientId", newClient.id, { shouldValidate: true });
        setNewClientName("");
        setIsAddClientOpen(false);
    }
  };
  
  const handleApplyTemplate = () => {
    if (!templateToApply) return;
    const sectionsWithIds = templateToApply.sections.map(s => ({ ...s, id: s.id || `section-tpl-${Date.now()}-${Math.random()}`, items: s.items.map(item => ({ ...item, id: `item-tpl-${Date.now()}-${Math.random()}`, customFields: item.customFields || {} })) }));
    form.setValue('sections', sectionsWithIds);
    setColumns(templateToApply.columns || defaultColumns);
    setTemplateToApply(null);
  };
  
  const categoryId = form.watch('categoryId');
  const categoryName = useMemo(() => (categories || []).find(c => c.id === categoryId)?.name || '', [categories, categoryId]);

  const watchedSections = form.watch('sections');
  const watchedCollabSections = form.watch('collaboratorSections');

  const total = useMemo(() => (watchedSections || []).reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + ((item.quantity || 1) * (item.unitPrice || 0)), 0) || 0), 0), [watchedSections]);
  const collaboratorTotal = useMemo(() => (watchedCollabSections || []).reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + ((item.quantity || 1) * (item.unitPrice || 0)), 0) || 0), 0), [watchedCollabSections]);
  
  const customColumnTotals = useMemo(() => {
    const totals: { name: string; total: number }[] = [];
    (columns || []).filter(c => c.type === 'number' && c.sumTotal).forEach(col => {
      const colTotal = (watchedSections || []).reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + (Number(item.customFields?.[col.id]) || 0), 0) || 0), 0);
      totals.push({ name: col.name, total: colTotal });
    });
    return totals;
  }, [watchedSections, columns]);

  const collaboratorCustomColumnTotals = useMemo(() => {
    const totals: { name: string; total: number }[] = [];
    (collaboratorColumns || []).filter(c => c.type === 'number' && c.sumTotal).forEach(col => {
      const colTotal = (watchedCollabSections || []).reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + (Number(item.customFields?.[col.id]) || 0), 0) || 0), 0);
      totals.push({ name: col.name, total: colTotal });
    });
    return totals;
  }, [watchedCollabSections, collaboratorColumns]);

  const handleCloseColumnDialog = () => { setIsColumnDialogOpen(false); setEditingColumn(null); setNewColumnName(""); setNewColumnType("text"); setNewColumnSum(false); }
  const handleAddColumn = () => { if (newColumnName.trim()) { const newId = `custom_${Date.now()}`; setColumns(prev => [...prev, { id: newId, name: newColumnName.trim(), type: newColumnType, sumTotal: newColumnType === 'number' ? newColumnSum : undefined }]); (form.getValues('sections') || []).forEach((section, sectionIndex) => { section.items.forEach((item, itemIndex) => { form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields.${newId}`, newColumnType === 'number' ? 0 : ''); }); }); handleCloseColumnDialog(); } }
  const handleStartEditColumn = (column: QuoteColumn) => { setEditingColumn(column); setNewColumnName(column.name); setNewColumnType(column.type); setNewColumnSum(column.sumTotal || false); setIsColumnDialogOpen(true); }
  const handleUpdateColumn = () => { if (!editingColumn || !newColumnName.trim()) return; setColumns(prev => prev.map(c => c.id === editingColumn.id ? { ...c, name: newColumnName.trim(), type: newColumnType, sumTotal: newColumnType === 'number' ? newColumnSum : undefined, } : c)); if (editingColumn.type === 'text' && newColumnType === 'number') { const sections = form.getValues('sections'); (sections || []).forEach((section, sectionIndex) => { section.items.forEach((item, itemIndex) => { const currentVal = item.customFields?.[editingColumn.id]; if (typeof currentVal === 'string' || typeof currentVal === 'undefined') { form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields.${editingColumn.id}`, 0); } }); }); } handleCloseColumnDialog(); }
  const handleConfirmDeleteColumn = () => { if (!deletingColumn) return; setColumns(prev => prev.filter(c => c.id !== deletingColumn.id)); const sections = form.getValues('sections'); (sections || []).forEach((section, sectionIndex) => { section.items.forEach((item, itemIndex) => { if (deletingColumn.id === 'quantity') { form.setValue(`sections.${sectionIndex}.items.${itemIndex}.quantity`, 1); } else if (item.customFields) { const newCustomFields = {...item.customFields}; delete newCustomFields[deletingColumn.id]; form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields`, newCustomFields); } }); }); setDeletingColumn(null); }
  const handleMoveColumn = useCallback((index: number, direction: 'left' | 'right') => { const newIndex = direction === 'left' ? index - 1 : index + 1; if (newIndex < 0 || newIndex >= columns.length) return; setColumns(currentColumns => { const newColumns = [...currentColumns]; const temp = newColumns[index]; newColumns[index] = newColumns[newIndex]; newColumns[newIndex] = temp; return newColumns; }); }, [columns.length]);
  
  const handleCloseCollabColumnDialog = () => { setIsCollabColumnDialogOpen(false); setEditingCollabColumn(null); setNewCollabColumnName(""); setNewCollabColumnType("text"); setNewCollabColumnSum(false); }
  const handleAddCollabColumn = () => { if (newCollabColumnName.trim()) { const newId = `custom_collab_${Date.now()}`; setCollaboratorColumns(prev => [...prev, { id: newId, name: newCollabColumnName.trim(), type: newCollabColumnType, sumTotal: newCollabColumnType === 'number' ? newCollabColumnSum : undefined, }]); (form.getValues('collaboratorSections') || []).forEach((section, sectionIndex) => { section.items.forEach((item, itemIndex) => { form.setValue(`collaboratorSections.${sectionIndex}.items.${itemIndex}.customFields.${newId}`, newCollabColumnType === 'number' ? 0 : ''); }); }); handleCloseCollabColumnDialog(); } }
  const handleStartEditCollabColumn = (column: QuoteColumn) => { setEditingCollabColumn(column); setNewCollabColumnName(column.name); setNewCollabColumnType(column.type); setNewCollabColumnSum(column.sumTotal || false); setIsCollabColumnDialogOpen(true); }
  const handleUpdateCollabColumn = () => { if (!editingCollabColumn || !newCollabColumnName.trim()) return; setCollaboratorColumns(prev => prev.map(c => c.id === editingCollabColumn.id ? { ...c, name: newCollabColumnName.trim(), type: newCollabColumnType, sumTotal: newCollabColumnType === 'number' ? newCollabColumnSum : undefined, } : c)); handleCloseCollabColumnDialog(); }
  const handleConfirmDeleteCollabColumn = () => { if (!deletingCollabColumn) return; setCollaboratorColumns(prev => prev.filter(c => c.id !== deletingCollabColumn.id)); const sections = form.getValues('collaboratorSections'); if (sections) { sections.forEach((section, sectionIndex) => { section.items.forEach((item, itemIndex) => { if (deletingCollabColumn.id === 'quantity') { form.setValue(`collaboratorSections.${sectionIndex}.items.${itemIndex}.quantity`, 1); } else if (item.customFields) { const newCustomFields = {...item.customFields}; delete newCustomFields[deletingCollabColumn.id]; form.setValue(`collaboratorSections.${sectionIndex}.items.${itemIndex}.customFields`, newCustomFields); } }); }); } setDeletingCollabColumn(null); }
  const handleMoveCollabColumn = useCallback((index: number, direction: 'left' | 'right') => { const newIndex = direction === 'left' ? index - 1 : index + 1; if (newIndex < 0 || newIndex >= collaboratorColumns.length) return; setCollaboratorColumns(currentColumns => { const newColumns = [...currentColumns]; const temp = newColumns[index]; newColumns[index] = newColumns[newIndex]; newColumns[newIndex] = temp; return newColumns; }); }, [collaboratorColumns.length]);

  const handlePasteInSection = useCallback((sectionIndex: number, text: string, fieldArrayName: "sections" | "collaboratorSections", setCols: React.Dispatch<React.SetStateAction<QuoteColumn[]>>) => {
    const rows = text.trim().split('\n').map(row => row.split('\t'));
    if (rows.length < 1) {
      toast({ variant: 'destructive', title: T.pasteFailed, description: "Clipboard is empty or has invalid format" });
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
        setCols(newColumns);
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
    
    const allSections = form.getValues(fieldArrayName) || [];
    if(allSections[sectionIndex]){
      allSections[sectionIndex].items = newItems;
      form.setValue(fieldArrayName, allSections as any);
    }
    toast({
        title: T.pastedFromClipboard,
        description: `${newItems.length} items and ${newColumns.length} columns have been imported.`
    });
  }, [T, toast, form]);
  
  const handleApplySuggestion = (items: SuggestQuoteOutput['suggestedItems']) => {
    const newItems = items.map(item => ({...item, id: `item-sugg-${Date.now()}-${Math.random()}`, customFields: {}}));
    form.setValue('sections', [{id: 'section-ai-1', name: T.untitledSection, items: newItems}]);
    setColumns(defaultColumns);
    toast({ title: T.suggestionApplied, description: T.suggestionAppliedDesc.replace('{count}', String(items.length)) });
  };
  
  const handleCopyFromQuote = () => {
    const currentSections = form.getValues('sections');
    form.setValue('collaboratorSections', currentSections);
    setCollaboratorColumns([...columns]);
    toast({ title: T.copiedFromQuote, description: T.copiedFromQuoteDesc });
  };

  const watchedStatus = form.watch("status");
  const availableSubStatuses = useMemo(() => {
    const mainStatusConfig = (settings.statusSettings || []).find(s => s.id === watchedStatus);
    return mainStatusConfig?.subStatuses || [];
  }, [watchedStatus, settings.statusSettings]);
  
  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Main task details */}
        <div className="space-y-4">
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{T.taskName}</FormLabel><FormControl><Input placeholder="e.g., Animate new logo" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{T.description}</FormLabel><FormControl><Textarea placeholder="Provide a brief description of the task." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="briefLink" render={({ field }) => (<FormItem><FormLabel>{T.briefLink}</FormLabel><FormControl><Input placeholder="e.g., https://docs.google.com/document/..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="driveLink" render={({ field }) => (<FormItem><FormLabel>{T.driveLink}</FormLabel><FormControl><Input placeholder="e.g., https://drive.google.com/drive/..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="clientId" render={({ field }) => ( <FormItem><FormLabel>{T.client}</FormLabel><div className="flex items-center gap-2"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={T.selectClient} /></SelectTrigger></FormControl><SelectContent>{(clients || []).map((client) => (<SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>))}</SelectContent></Select><Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="icon"><PlusCircle className="h-4 w-4" /><span className="sr-only">{T.addNewClient}</span></Button></DialogTrigger><DialogContent className="sm:max-w-[425px]"><DialogHeader><DialogTitle>{T.addNewClient}</DialogTitle><DialogDescription>Enter the name for the new client. It will be automatically selected.</DialogDescription></DialogHeader><div className="py-4"><Label htmlFor="new-client-name" className="sr-only">{T.client}</Label><Input id="new-client-name" placeholder={T.clientNameRequired} value={newClientName} onChange={(e) => setNewClientName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewClient(); } }} /></div><DialogFooter><DialogClose asChild><Button type="button" variant="ghost">{T.cancel}</Button></DialogClose><Button type="button" onClick={handleAddNewClient}>{T.addClient}</Button></DialogFooter></DialogContent></Dialog></div><FormMessage /></FormItem>)} />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{T.category}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={T.selectCategory} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(categories || []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {T.categories[category.id as keyof typeof T.categories] || category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="dates" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{T.dates}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value?.from && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value?.from ? (field.value.to ? (<>{format(field.value.from, "LLL dd, y")} - {format(field.value.to, "LLL dd, y")}</>) : (format(field.value.from, "LLL dd, y"))) : (<span>{T.pickDateRange}</span>)}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="range" selected={{ from: field.value?.from, to: field.value?.to }} onSelect={(range) => field.onChange({ from: range?.from, to: range?.to })} numberOfMonths={2} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
            <div className="space-y-4">
              <div className="flex gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (<FormItem className="flex-1"><FormLabel>{T.status}</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('subStatusId', ''); }} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={T.selectStatus} /></SelectTrigger></FormControl><SelectContent>{(settings.statusSettings || []).map((status) => (<SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                {availableSubStatuses.length > 0 && (<FormField control={form.control} name="subStatusId" render={({ field }) => (<FormItem className="flex-1"><FormLabel>{T.subStatuses}</FormLabel><Select onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)} defaultValue={field.value || '__none__'}><FormControl><SelectTrigger><SelectValue placeholder={T.selectSubStatus} /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">{T.none}</SelectItem>{availableSubStatuses.map((sub) => (<SelectItem key={sub.id} value={sub.id}>{sub.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />)}
              </div>
            </div>
          </div>
        </div>

        {/* Price Quote Section */}
        <Separator />
        <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-lg font-medium">{T.priceQuote}</h3><div className="w-full max-w-xs"><Select onValueChange={(templateId) => { const template = quoteTemplates.find(t => t.id === templateId); if (template) { setTemplateToApply(template); } }}><SelectTrigger><SelectValue placeholder={T.applyTemplate} /></SelectTrigger><SelectContent>{(quoteTemplates || []).map(template => (<SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>))}</SelectContent></Select></div></div>
            <div className="space-y-4">
                {sectionFields.map((section, index) => <QuoteSectionComponent key={section.id} sectionIndex={index} control={form.control} columns={columns} fieldArrayName="sections" onPaste={(text) => handlePasteInSection(index, text, "sections", setColumns)} T={T} onRemoveSection={() => removeSection(index)} canDeleteSection={sectionFields.length > 1} onMoveColumn={handleMoveColumn} onEditColumn={handleStartEditColumn} onDeleteColumn={setDeletingColumn} />)}
            </div>
            
            <div className="flex gap-1">
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => appendSection({ id: `section-${Date.now()}`, name: T.untitledSection, items: [{ description: "", quantity: 1, unitPrice: 0, customFields: {} }] })}><FolderPlus className="h-4 w-4" /><span className="sr-only">{T.addSection}</span></Button></TooltipTrigger><TooltipContent><p>{T.addSection}</p></TooltipContent></Tooltip></TooltipProvider>
                 <TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => setIsColumnDialogOpen(true)}><SplitSquareVertical className="h-4 w-4" /><span className="sr-only">{T.addColumn}</span></Button></TooltipTrigger><TooltipContent><p>{T.addColumn}</p></TooltipContent></Tooltip></TooltipProvider>
            </div>
            <div className="flex justify-between items-start mt-4 pt-4 border-t">
                <QuoteSuggestion settings={settings} taskDescription={form.getValues('description') || ''} taskCategory={categoryName} onApplySuggestion={handleApplySuggestion} />
                <div className="text-right space-y-2">{customColumnTotals.map(t => (<div key={t.name}><p className="text-sm text-muted-foreground">{t.name} Total</p><p className="text-lg font-bold">{t.total.toLocaleString()}</p></div>))}<div><p className="text-sm text-muted-foreground">{T.grandTotal}</p><p className="text-2xl font-bold">{total.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</p></div></div>
            </div>
        </div>
        <Separator />
        {/* Collaborator Section */}
        <Collapsible open={isCollaboratorSectionOpen} onOpenChange={setIsCollaboratorSectionOpen}><div className="space-y-4"><div className="flex justify-between items-center"><CollapsibleTrigger asChild><button type="button" className="flex items-center w-full group"><h3 className="text-lg font-medium">{T.collaboratorCosts}</h3><ChevronDown className="h-4 w-4 ml-2 transition-transform duration-200 group-data-[state=open]:rotate-180" /></button></CollapsibleTrigger><Button type="button" variant="outline" size="sm" onClick={handleCopyFromQuote}><Copy className="mr-2 h-4 w-4" />{T.copyFromPriceQuote}</Button></div><CollapsibleContent className="space-y-4 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <FormField control={form.control} name="collaboratorId" render={({ field }) => (<FormItem><FormLabel>{T.collaborator}</FormLabel><Select onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)} defaultValue={field.value || '__none__'}><FormControl><SelectTrigger><SelectValue placeholder={T.selectCollaborator} /></SelectTrigger></FormControl><SelectContent><SelectItem value="__none__">{T.none}</SelectItem>{(collaborators || []).map((collaborator) => (<SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            <div className="space-y-4">{(collabSectionFields || []).map((section, index) => <QuoteSectionComponent key={section.id} sectionIndex={index} control={form.control} columns={collaboratorColumns} fieldArrayName="collaboratorSections" onPaste={(text) => handlePasteInSection(index, text, "collaboratorSections", setCollaboratorColumns)} T={T} onRemoveSection={() => collabRemoveSection(index)} canDeleteSection={collabSectionFields.length > 1} onMoveColumn={handleMoveCollabColumn} onEditColumn={handleStartEditCollabColumn} onDeleteColumn={setDeletingCollabColumn} />)}</div>
            <div className="flex gap-1"><TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => collabAppendSection({ id: `section-collab-${Date.now()}`, name: T.untitledSection, items: [{ description: "", quantity: 1, unitPrice: 0, customFields: {} }] })}><FolderPlus className="h-4 w-4" /><span className="sr-only">{T.addSection}</span></Button></TooltipTrigger><TooltipContent><p>{T.addSection}</p></TooltipContent></Tooltip></TooltipProvider><TooltipProvider><Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" onClick={() => setIsCollabColumnDialogOpen(true)}><SplitSquareVertical className="h-4 w-4" /><span className="sr-only">{T.addColumn}</span></Button></TooltipTrigger><TooltipContent><p>{T.addColumn}</p></TooltipContent></Tooltip></TooltipProvider></div>
            <div className="flex justify-end items-start mt-4 pt-4 border-t">
              <div className="text-right space-y-2">
                {collaboratorCustomColumnTotals.map(t => (<div key={t.name}><p className="text-sm text-muted-foreground">{t.name} Total</p><p className="text-lg font-bold">{t.total.toLocaleString()}</p></div>))}
                <div><p className="text-sm text-muted-foreground">{T.collaboratorTotal}</p><p className="text-2xl font-bold">{collaboratorTotal.toLocaleString(settings.language === 'vi' ? 'vi-VN' : 'en-US')} {settings.currency}</p></div>
              </div>
            </div>
            </CollapsibleContent></div></Collapsible>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{T.cancel}</Button><Button type="submit">{T.createTask}</Button></div>
      </form>
    </Form>
    {/* Dialogs and AlertDialogs */}
    <AlertDialog open={!!templateToApply} onOpenChange={() => setTemplateToApply(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{T.applyTemplate}?</AlertDialogTitle><AlertDialogDescription>{T.applyTemplateWarning}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setTemplateToApply(null)}>{T.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleApplyTemplate}>{T.applyTemplate.replace('...','')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={isColumnDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseColumnDialog()}><DialogContent><DialogHeader><DialogTitle>{editingColumn ? T.edit + " Column" : T.addColumn}</DialogTitle><DialogDescription>{editingColumn ? "Update your column details." : "Enter a name and type for your new column."}</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label htmlFor="new-column-name">Column Name</Label><Input id="new-column-name" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} onKeyDown={(e) => {if (e.key === 'Enter') e.preventDefault()}}/></div><div className="space-y-2"><Label>Column Type</Label><RadioGroup value={newColumnType} onValueChange={(value: QuoteColumn['type']) => setNewColumnType(value)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="text" id="type-text" /><Label htmlFor="type-text" className="font-normal">Text</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="number" id="type-number" /><Label htmlFor="type-number" className="font-normal">Number</Label></div></RadioGroup></div>{newColumnType === 'number' && (<div className="flex items-center space-x-2 pl-1 pt-2"><Checkbox id="sum-total" checked={newColumnSum} onCheckedChange={(checked) => setNewColumnSum(Boolean(checked))} /><Label htmlFor="sum-total" className="text-sm font-normal">Calculate total for this column</Label></div>)}</div><DialogFooter><Button type="button" variant="ghost" onClick={handleCloseColumnDialog}>{T.cancel}</Button><Button type="button" onClick={editingColumn ? handleUpdateColumn : handleAddColumn}>{editingColumn ? T.saveChanges : T.addColumn}</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={!!deletingColumn} onOpenChange={(isOpen) => !isOpen && setDeletingColumn(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{T.areYouSure}?</AlertDialogTitle><AlertDialogDescription>{T.deletePermanently} "{deletingColumn?.name}" column.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingColumn(null)}>{T.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteColumn}>{T.delete}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <Dialog open={isCollabColumnDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseCollabColumnDialog()}><DialogContent><DialogHeader><DialogTitle>{editingCollabColumn ? T.edit + " " + T.collaborator + " Column" : T.add + " " + T.collaborator + " Column"}</DialogTitle><DialogDescription>{editingCollabColumn ? "Update your column details." : "Enter a name and type for your new column."}</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label htmlFor="new-collab-column-name">Column Name</Label><Input id="new-collab-column-name" value={newCollabColumnName} onChange={(e) => setNewCollabColumnName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}/></div><div className="space-y-2"><Label>Column Type</Label><RadioGroup value={newCollabColumnType} onValueChange={(value: QuoteColumn['type']) => setNewCollabColumnType(value)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="text" id="collab-type-text" /><Label htmlFor="collab-type-text" className="font-normal">Text</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="number" id="collab-type-number" /><Label htmlFor="collab-type-number" className="font-normal">Number</Label></div></RadioGroup></div>{newCollabColumnType === 'number' && (<div className="flex items-center space-x-2 pl-1 pt-2"><Checkbox id="collab-sum-total" checked={newCollabColumnSum} onCheckedChange={(checked) => setNewCollabColumnSum(Boolean(checked))} /><Label htmlFor="collab-sum-total" className="text-sm font-normal">Calculate total for this column</Label></div>)}</div><DialogFooter><Button type="button" variant="ghost" onClick={handleCloseCollabColumnDialog}>{T.cancel}</Button><Button type="button" onClick={editingCollabColumn ? handleUpdateCollabColumn : handleAddCollabColumn}>{editingCollabColumn ? T.saveChanges : T.addColumn}</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={!!deletingCollabColumn} onOpenChange={(isOpen) => !isOpen && setDeletingCollabColumn(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{T.areYouSure}?</AlertDialogTitle><AlertDialogDescription>{T.deletePermanently} "{deletingCollabColumn?.name}" column.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingCollabColumn(null)}>{T.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteCollabColumn}>{T.delete}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}

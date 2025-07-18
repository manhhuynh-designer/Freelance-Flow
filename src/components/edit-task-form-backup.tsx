"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useWatch } from "react-hook-form";
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
import type { Task, Quote, Client, QuoteColumn, QuoteTemplate, Collaborator, AppSettings, QuoteSection, Category } from "@/lib/types";
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
import type { SuggestQuoteOutput } from "@/lib/ai-types";
import { QuoteSuggestion } from "./quote-suggestion";
import { QuoteManager } from "./quote-manager";
import { QuoteSectionComponent } from "./quote-section-improved";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const formSchema = z.object({
  name: z.string().min(2, "Task name must be at least 2 characters."),
  description: z.string().optional(),
  briefLink: z.array(z.string().url({ message: "Please enter a valid URL." })).optional().default([]),
  driveLink: z.array(z.string().refine(
    (val) => {
      // Accept http(s) and file:// links
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:';
      } catch {
        return false;
      }
    },
    { message: "Please enter a valid URL or local file link (file://)." }
  )).optional().default([]),
  clientId: z.string().min(1, "Please select a client."),
  collaboratorIds: z.array(z.string()).optional().default([]), // Changed to array
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
            unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
            customFields: z.record(z.any()).optional(),
        })
    ).min(1, "A section must have at least one item."),
  })).min(1, "A quote must have at least one section."),
  collaboratorQuotes: z.array(
    z.object({
      collaboratorId: z.string().optional(),
      sections: z.array(
        z.object({
          id: z.string(),
          name: z.string().min(1, "Section name cannot be empty."),
          items: z.array(
            z.object({
              id: z.string().optional(),
              description: z.string().min(1, "Description cannot be empty."),
              unitPrice: z.coerce.number().min(0, "Price cannot be negative.").default(0),
              customFields: z.record(z.any()).optional(),
            })
          ).min(1, "A section must have at least one item."),
        })
      ).optional().default([]),
    })
  ).optional().default([]),
});

export type TaskFormValues = z.infer<typeof formSchema>;

type EditTaskFormProps = {
  setOpen: (open: boolean) => void;
  onSubmit: (values: TaskFormValues, quoteColumns: QuoteColumn[], collaboratorQuoteColumns: QuoteColumn[], taskId: string) => void;
  taskToEdit: Task | null;
  quote?: Quote;
  collaboratorQuotes?: Quote[]; // Changed to array
  clients: Client[];
  collaborators: Collaborator[];
  categories: Category[];
  onAddClient: (data: Omit<Client, 'id'>) => Client;
  quoteTemplates: QuoteTemplate[];
  settings: AppSettings;
  defaultDate?: Date | null;
};

export function EditTaskForm({ 
  setOpen, 
  onSubmit: onFormSubmit, 
  taskToEdit, 
  quote, 
  collaboratorQuotes, 
  clients, 
  collaborators, 
  categories, 
  onAddClient, 
  quoteTemplates, 
  settings, 
  defaultDate 
}: EditTaskFormProps) {
  const { toast } = useToast();
  const T = {
    ...i18n[settings.language],
    addLink: ((i18n[settings.language] as any)?.addLink || "Thêm link"),
  };
  
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [isCollaboratorSectionOpen, setIsCollaboratorSectionOpen] = useState(!!collaboratorQuotes && collaboratorQuotes.length > 0);
  
  const defaultColumns: QuoteColumn[] = React.useMemo(() => [
    { id: 'description', name: T.description, type: 'text' },
    { id: 'unitPrice', name: `${T.unitPrice} (${settings.currency})`, type: 'number', calculation: { type: 'sum' } },
  ], [T, settings.currency]);

  const [columns, setColumns] = useState<QuoteColumn[]>(quote?.columns || defaultColumns);
  const [collaboratorColumns, setCollaboratorColumns] = useState<QuoteColumn[]>(collaboratorQuotes?.[0]?.columns || defaultColumns);
  
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

  // Helper function to get initial sections
  const getInitialSections = (): QuoteSection[] => {
    if (quote?.sections && quote.sections.length > 0) {
      return quote.sections.map((section, sectionIndex) => ({
        ...section,
        id: section.id || `section-edit-${sectionIndex}`,
        items: (section.items && section.items.length > 0)
          ? section.items.map((item, itemIndex) => ({ 
              ...item, 
              id: item.id || `item-edit-${sectionIndex}-${itemIndex}`
            }))
          : [{ id: `item-edit-${sectionIndex}-0`, description: "", unitPrice: 0, customFields: {} }]
      }));
    }
    const fallbackId = taskToEdit?.id || `new-${Date.now()}`;
    return [{
      id: `section-edit-${fallbackId}`,
      name: T.untitledSection,
      items: [{ id: `item-edit-${fallbackId}-0`, description: "", unitPrice: 0, customFields: {} }]
    }];
  };

  const getInitialCollabSections = (): QuoteSection[] => {
    if (collaboratorQuotes && collaboratorQuotes.length > 0 && collaboratorQuotes[0]?.sections && collaboratorQuotes[0].sections.length > 0) {
      return collaboratorQuotes[0].sections.map((section, sectionIndex) => ({
        ...section,
        id: section.id || `section-collab-edit-${sectionIndex}`,
        items: (section.items || []).map((item, itemIndex) => ({ 
          ...item, 
          id: item.id || `item-collab-edit-${sectionIndex}-${itemIndex}` 
        }))
      }));
    }
    return [];
  };

  const isCreate = !taskToEdit;
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isCreate ? {
      name: "",
      description: "",
      briefLink: [""],
      driveLink: [""],
      clientId: "",
      collaboratorIds: [],
      categoryId: "",
      status: "todo",
      subStatusId: "",
      dates: {
        from: defaultDate || undefined,
        to: defaultDate || undefined,
      },
      sections: [{ 
        id: `section-create-${Date.now()}`, 
        name: T.untitledSection, 
        items: [{ description: "", unitPrice: 0, customFields: {} }] 
      }],
      collaboratorQuotes: [],
    } : {
      name: taskToEdit.name,
      description: taskToEdit.description || "",
      briefLink: Array.isArray(taskToEdit.briefLink) 
        ? (taskToEdit.briefLink.length > 0 ? taskToEdit.briefLink : [""]) 
        : (taskToEdit.briefLink ? [taskToEdit.briefLink] : [""]),
      driveLink: Array.isArray(taskToEdit.driveLink) 
        ? (taskToEdit.driveLink.length > 0 ? taskToEdit.driveLink : [""]) 
        : (taskToEdit.driveLink ? [taskToEdit.driveLink] : [""]),
      clientId: taskToEdit.clientId,
      collaboratorIds: Array.isArray(taskToEdit.collaboratorIds) ? taskToEdit.collaboratorIds : [],
      categoryId: taskToEdit.categoryId,
      status: taskToEdit.status,
      subStatusId: taskToEdit.subStatusId || "",
      dates: { 
        from: new Date(taskToEdit.startDate), 
        to: new Date(taskToEdit.deadline) 
      },
      sections: getInitialSections(),
      collaboratorQuotes: (collaboratorQuotes || []).map((quote, index) => ({
        collaboratorId: quote.collaboratorId || '',
        sections: quote.sections || [{
          id: `section-collab-${index}-${Date.now()}`,
          name: T.untitledSection,
          items: [{
            id: `item-collab-${index}-${Date.now()}`,
            description: "",
            unitPrice: 0,
            customFields: {}
          }]
        }]
      })),
    }
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection, move } = useFieldArray({ control: form.control, name: "sections" });
  const { fields: collaboratorFields, append: appendCollaborator, remove: removeCollaborator } = useFieldArray({
    control: form.control,
    name: "collaboratorQuotes",
  });

  // No useFieldArray for briefLink and driveLink, use direct array manipulation

  const onSubmit = (data: TaskFormValues) => {
    const fallbackId = taskToEdit?.id || `new-${Date.now()}`;
    const collaboratorIds = data.collaboratorQuotes.map(quote => quote.collaboratorId).filter(Boolean) as string[];
    
    // Debug logging
    console.log('Form submission data:', {
      collaboratorQuotes: data.collaboratorQuotes,
      collaboratorIds,
      hasCollaboratorData: data.collaboratorQuotes.length > 0
    });
    
    onFormSubmit({...data, collaboratorIds}, columns, collaboratorColumns, fallbackId);
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
    const sectionsWithIds = templateToApply.sections.map(s => ({ 
      ...s, 
      id: s.id || `section-tpl-${Date.now()}-${Math.random()}`, 
      items: s.items.map(item => ({ 
        ...item, 
        id: `item-tpl-${Date.now()}-${Math.random()}`, 
        customFields: item.customFields || {} 
      })) 
    }));
    form.setValue('sections', sectionsWithIds);
  
    setTemplateToApply(null);
    setColumns(templateToApply.columns || defaultColumns);
    toast({ title: `Template Applied: ${templateToApply.name}` });
  };

  const handleCopyFromQuote = (targetCollaboratorIndex: number) => {
    console.log('handleCopyFromQuote called with index:', targetCollaboratorIndex);
    
    const currentSections = form.getValues('sections');
    const collaboratorQuotes = form.getValues('collaboratorQuotes');
    
    console.log('Current sections:', currentSections);
    console.log('Collaborator quotes:', collaboratorQuotes);
    
    if (targetCollaboratorIndex >= 0 && targetCollaboratorIndex < collaboratorQuotes.length) {
      const sectionsToAdd = currentSections.map(section => ({
        ...section,
        id: `section-collab-${targetCollaboratorIndex}-${Date.now()}-${Math.random()}`,
        items: section.items.map(item => ({
          ...item,
          id: `item-collab-${targetCollaboratorIndex}-${Date.now()}-${Math.random()}`,
          customFields: item.customFields || {}
        }))
      }));
      
      console.log('Sections to add:', sectionsToAdd);
      
      // Update the specific collaborator quote sections
      form.setValue(`collaboratorQuotes.${targetCollaboratorIndex}.sections`, sectionsToAdd);
      
      toast({
        title: T.copiedFromQuote || "Copied from main quote",
        description: `${sectionsToAdd.length} sections copied to collaborator quote`
      });
    } else {
      console.error('Invalid target collaborator index:', targetCollaboratorIndex);
    }
  };

  const handleAddCollaborator = () => {
    console.log("🚨 handleAddCollaborator called!", {
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
    const newCollaboratorQuote = {
      collaboratorId: '',
      sections: [{
        id: `section-collab-${Date.now()}-${Math.random()}`,
        name: T.untitledSection,
        items: [{
          id: `item-collab-${Date.now()}-${Math.random()}`,
          description: "",
          unitPrice: 0,
          customFields: {}
        }]
      }]
    };
    appendCollaborator(newCollaboratorQuote);
    setIsCollaboratorSectionOpen(true);
  };
  
  const categoryId = form.watch('categoryId');
  const categoryName = useMemo(() => (categories || []).find(c => c.id === categoryId)?.name || '', [categories, categoryId]);

  const watchedSections = useWatch({ control: form.control, name: 'sections' });
  const watchedCollabSections = useWatch({ control: form.control, name: 'collaboratorQuotes' });

  // Calculation results for main sections
  const calculationResults = useMemo(() => {
    return (columns || []).filter(col => col.type === 'number' && !!col.calculation).map(col => {
      const values = (watchedSections || []).flatMap(section =>
        section.items.map((item: any) => {
          if (col.id === 'unitPrice') return Number(item.unitPrice) || 0;
          return Number(item.customFields?.[col.id]) || 0;
        })
      ).filter(v => !isNaN(v));
      let result: number | string = '';
      const calcType = (typeof col.calculation === 'string' ? col.calculation : (col.calculation?.type || '')) as "" | "sum" | "avg" | "min" | "max" | "custom";
      switch (calcType) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result = values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
          break;
        case 'min':
          result = values.length ? Math.min(...values) : '';
          break;
        case 'max':
          result = values.length ? Math.max(...values) : '';
          break;
        case 'custom':
          result = '';
          break;
        default:
          result = '';
      }
      return { id: col.id, name: col.name, calculation: calcType, result };
    });
  }, [columns, watchedSections]);

  // Calculation results for collaborator sections
  const collabCalculationResults = useMemo(() => {
    return (collaboratorColumns || []).filter(col => col.type === 'number' && !!col.calculation).map(col => {
      const values = (watchedCollabSections || []).flatMap(quote =>
        (quote.sections || []).flatMap(section =>
          (section.items || []).map((item: any) => {
            if (col.id === 'unitPrice') return Number(item.unitPrice) || 0;
            return Number(item.customFields?.[col.id]) || 0;
          })
        )
      ).filter(v => !isNaN(v));
      let result: number | string = '';
      const calcType = (typeof col.calculation === 'string' ? col.calculation : (col.calculation?.type || '')) as "" | "sum" | "avg" | "min" | "max" | "custom";
      switch (calcType) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result = values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : 0;
          break;
        case 'min':
          result = values.length ? Math.min(...values) : '';
          break;
        case 'max':
          result = values.length ? Math.max(...values) : '';
          break;
        case 'custom':
          result = '';
          break;
        default:
          result = '';
      }
      return { id: col.id, name: col.name, calculation: calcType, result };
    });
  }, [collaboratorColumns, watchedCollabSections]);

  const total = useMemo(() => (watchedSections || []).reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => itemAcc + (item.unitPrice || 0), 0) || 0), 0), [watchedSections]);
  const collaboratorTotal = useMemo(() => 
    (watchedCollabSections || []).reduce(
      (acc: number, quote: any) => acc + ((quote.sections || []).reduce(
        (sectionAcc: number, section: any) => sectionAcc + ((section.items || []).reduce(
          (itemAcc: number, item: any) => itemAcc + (item.unitPrice || 0),
          0
        ) || 0),
        0
      ) || 0),
      0
    ),
    [watchedCollabSections]
  );

  const customColumnTotals = useMemo(() => {
    const totals: { name: string; total: number }[] = [];
    (columns || []).filter(c => c.type === 'number' && c.calculation?.type === 'sum').forEach(col => {
      const colTotal = (watchedSections || []).reduce((acc, section) => acc + (section.items?.reduce((itemAcc, item) => {
        if (col.id === 'unitPrice') {
          return itemAcc + (Number(item.unitPrice) || 0);
        }
        return itemAcc + (Number(item.customFields?.[col.id]) || 0);
      }, 0) || 0), 0);
      totals.push({ name: col.name, total: colTotal });
    });
    return totals;
  }, [watchedSections, columns]);

  const collaboratorCustomColumnTotals = useMemo(() => {
    const totals: { name: string; total: number }[] = [];
    (collaboratorColumns || []).filter(c => c.type === 'number' && c.calculation?.type === 'sum').forEach(col => {
      const colTotal = (watchedCollabSections || []).reduce((acc: number, quote: any) => acc + ((quote.sections || []).reduce((sectionAcc: number, section: any) => sectionAcc + ((section.items || []).reduce((itemAcc: number, item: any) => {
        if (col.id === 'unitPrice') {
          return itemAcc + (Number(item.unitPrice) || 0);
        }
        return itemAcc + (Number(item.customFields?.[col.id]) || 0);
      }, 0) || 0), 0)), 0);
      totals.push({ name: col.name, total: colTotal });
    });
    return totals;
  }, [watchedCollabSections, collaboratorColumns]);

  // Column management functions
  const handleCloseColumnDialog = () => { 
    setIsColumnDialogOpen(false); 
    setEditingColumn(null); 
    setNewColumnName(""); 
    setNewColumnType("text"); 
    setNewColumnSum(false); 
  };

  const handleAddColumn = () => { 
    if (newColumnName.trim()) { 
      const newId = `custom_${Date.now()}`; 
      setColumns(prev => [...prev, { 
        id: newId, 
        name: newColumnName.trim(), 
        type: newColumnType, 
        calculation: newColumnType === 'number' && newColumnSum ? { type: 'sum' } : undefined 
      }]); 
      (form.getValues('sections') || []).forEach((section, sectionIndex) => { 
        section.items.forEach((item, itemIndex) => { 
          form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields.${newId}`, newColumnType === 'number' ? 0 : ''); 
        }); 
      }); 
      handleCloseColumnDialog(); 
    } 
  };

  const handleStartEditColumn = (column: QuoteColumn) => { 
    setEditingColumn(column); 
    setNewColumnName(column.name); 
    setNewColumnType(column.type); 
    setNewColumnSum(column.calculation?.type === 'sum' || false); 
    setIsColumnDialogOpen(true); 
  };

  const handleUpdateColumn = () => { 
    if (!editingColumn || !newColumnName.trim()) return; 
    setColumns(prev => prev.map(c => c.id === editingColumn.id ? { 
      ...c, 
      name: newColumnName.trim(), 
      type: newColumnType, 
      calculation: newColumnType === 'number' && newColumnSum ? { type: 'sum' } : undefined, 
    } : c)); 
    handleCloseColumnDialog(); 
  };

  const handleConfirmDeleteColumn = () => { 
    if (!deletingColumn) return; 
    setColumns(prev => prev.filter(c => c.id !== deletingColumn.id)); 
    const sections = form.getValues('sections'); 
    (sections || []).forEach((section, sectionIndex) => { 
      section.items.forEach((item, itemIndex) => { 
        if (item.customFields) { 
          const newCustomFields = {...item.customFields}; 
          delete newCustomFields[deletingColumn.id]; 
          form.setValue(`sections.${sectionIndex}.items.${itemIndex}.customFields`, newCustomFields); 
        } 
      }); 
    }); 
    setDeletingColumn(null); 
  };

  const handleMoveColumn = useCallback((index: number, direction: 'left' | 'right') => { 
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
  
  // Collaborator column management functions
  const handleCloseCollabColumnDialog = () => { 
    setIsCollabColumnDialogOpen(false); 
    setEditingCollabColumn(null); 
    setNewCollabColumnName(""); 
    setNewCollabColumnType("text"); 
    setNewCollabColumnSum(false); 
  };

  const handleAddCollabColumn = () => { 
    if (newCollabColumnName.trim()) { 
      const newId = `custom_collab_${Date.now()}`; 
      setCollaboratorColumns(prev => [...prev, { 
        id: newId, 
        name: newCollabColumnName.trim(), 
        type: newCollabColumnType, 
        calculation: newCollabColumnType === 'number' && newCollabColumnSum ? { type: 'sum' } : undefined, 
      }]); 
      // Update customFields for collaboratorQuotes
      (form.getValues('collaboratorQuotes') || []).forEach((quote, quoteIndex) => {
        (quote.sections || []).forEach((section, sectionIndex) => {
          (section.items || []).forEach((item, itemIndex) => {
            form.setValue(`collaboratorQuotes.${quoteIndex}.sections.${sectionIndex}.items.${itemIndex}.customFields.${newId}`, newCollabColumnType === 'number' ? 0 : '');
          });
        });
      });
      handleCloseCollabColumnDialog(); 
    } 
  };

  const handleStartEditCollabColumn = (column: QuoteColumn) => { 
    setEditingCollabColumn(column); 
    setNewCollabColumnName(column.name); 
    setNewCollabColumnType(column.type); 
    setNewCollabColumnSum(column.calculation?.type === 'sum' || false); 
    setIsCollabColumnDialogOpen(true); 
  };

  const handleUpdateCollabColumn = () => { 
    if (!editingCollabColumn || !newCollabColumnName.trim()) return; 
    setCollaboratorColumns(prev => prev.map(c => c.id === editingCollabColumn.id ? { 
      ...c, 
      name: newCollabColumnName.trim(), 
      type: newCollabColumnType, 
      calculation: newCollabColumnType === 'number' && newCollabColumnSum ? { type: 'sum' } : undefined, 
    } : c)); 
    handleCloseCollabColumnDialog(); 
  };

  const handleConfirmDeleteCollabColumn = () => { 
    if (!deletingCollabColumn) return; 
    setCollaboratorColumns(prev => prev.filter(c => c.id !== deletingCollabColumn.id)); 
    // Remove customFields for collaboratorQuotes
    const quotes = form.getValues('collaboratorQuotes');
    if (quotes) {
      quotes.forEach((quote, quoteIndex) => {
        (quote.sections || []).forEach((section, sectionIndex) => {
          (section.items || []).forEach((item, itemIndex) => {
            if (item.customFields) {
              const newCustomFields = {...item.customFields};
              delete newCustomFields[deletingCollabColumn.id];
              form.setValue(`collaboratorQuotes.${quoteIndex}.sections.${sectionIndex}.items.${itemIndex}.customFields`, newCustomFields);
            }
          });
        });
      });
    }
    setDeletingCollabColumn(null); 
  };

  const handleMoveCollabColumn = useCallback((index: number, direction: 'left' | 'right') => { 
    const newIndex = direction === 'left' ? index - 1 : index + 1; 
    if (newIndex < 0 || newIndex >= collaboratorColumns.length) return; 
    setCollaboratorColumns(currentColumns => { 
      const newColumns = [...currentColumns]; 
      const temp = newColumns[index]; 
      newColumns[index] = newColumns[newIndex]; 
      newColumns[newIndex] = temp; 
      return newColumns; 
    }); 
  }, [collaboratorColumns.length]);

  const handlePasteInSection = useCallback((sectionIndex: number, text: string, fieldArrayName: string, setCols: React.Dispatch<React.SetStateAction<QuoteColumn[]>>) => {
    const rows = text.trim().split('\n').map((row: string) => row.split('\t'));
    if (rows.length < 1) {
      toast({ variant: 'destructive', title: T.pasteFailed, description: "Clipboard is empty or has invalid format" });
      return;
    }

    const headerRow = rows.shift()!;
    const newColumns = headerRow.map((header: string, index: number) => {
      const isNumeric = rows.every((row: string[]) => !isNaN(parseFloat(row[index])));
      return { id: `custom_${Date.now()}_${index}`, name: header, type: isNumeric ? 'number' : 'text' } as QuoteColumn;
    });

    const quantityColumnIndex = headerRow.findIndex((header: string) => header.toLowerCase().includes('quantity'));
    if (quantityColumnIndex !== -1) {
      newColumns[quantityColumnIndex].id = 'quantity';
    }

    if (sectionIndex === 0) {
      setCols(newColumns);
    }

    const newItems = rows.map((row: string[]) => {
      const item: { description?: string; unitPrice?: number; customFields: Record<string, any> } = { customFields: {} };
      newColumns.forEach((col, index) => {
        if (col.id === 'unitPrice') {
          item.unitPrice = parseFloat(row[index]) || 0;
        } else if (col.id === 'description') {
          item.description = row[index] || "";
        } else {
          item.customFields[col.id] = row[index];
        }
      });
      return {
        description: item.description || "",
        unitPrice: item.unitPrice || 0,
        customFields: item.customFields || {},
      };
    });

    // Handle different field array paths
    if (fieldArrayName.includes('collaboratorQuotes')) {
      (form.setValue as any)(`${fieldArrayName}.${sectionIndex}.items`, newItems);
    } else {
      (form.setValue as any)(`${fieldArrayName}.${sectionIndex}.items`, newItems);
    }

    toast({
      title: T.pastedFromClipboard,
      description: `${newItems.length} items and ${newColumns.length} columns have been imported.`
    });
  }, [T, toast, form]);
  
  const handleApplySuggestion = (items: SuggestQuoteOutput['suggestedItems']) => {
    const newItems = items.map(item => ({
      description: item.description,
      unitPrice: item.unitPrice,
      id: `item-sugg-${Date.now()}-${Math.random()}`,
      customFields: {},
    }));
    form.setValue('sections', [{ id: 'section-ai-1', name: T.untitledSection, items: newItems }]);
    setColumns(defaultColumns);
    toast({ title: T.suggestionApplied, description: T.suggestionAppliedDesc.replace('{count}', String(items.length)) });
  };
  
  // Removed duplicate handleCopyFromQuote for collaboratorSections

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
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{T.taskName}</FormLabel><FormControl><Input placeholder="e.g., Animate new logo" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{T.description}</FormLabel><FormControl><Textarea placeholder="Provide a brief description of the task." {...field} /></FormControl><FormMessage /></FormItem>)} />
            {/* Brief Link dynamic fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="briefLink"
                render={({ field }) => {
                  const links = field.value || [];
                  // Ensure we always have at least one field to show
                  const linksToRender = links.length > 0 ? links : [""];
                  return (
                    <FormItem>
                      <FormLabel>{T.briefLink}</FormLabel>
                      <div className="space-y-2">
                        {linksToRender.map((_: string, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Input
                              {...form.register(`briefLink.${idx}`)}
                              placeholder="e.g., https://docs.google.com/document/..."
                            />
                            {idx > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (links.length > 1) {
                                    const updated = [...links];
                                    updated.splice(idx, 1);
                                    form.setValue('briefLink', updated);
                                  } else {
                                    form.setValue('briefLink.0', '');
                                  }
                                }}
                                disabled={links.length === 1 && !form.getValues(`briefLink.${idx}`)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            {idx === linksToRender.length - 1 && linksToRender.length < 5 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const currentLinks = form.getValues('briefLink') || [];
                                  form.setValue('briefLink', [...currentLinks, ""]);
                                }}
                                title={T.addLink || "Thêm link"}
                              >
                                <PlusCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="driveLink"
                render={({ field }) => {
                  const links = field.value || [];
                  // Ensure we always have at least one field to show
                  const linksToRender = links.length > 0 ? links : [""];
                  return (
                    <FormItem>
                      <FormLabel>Storage Links</FormLabel>
                      <div className="space-y-2">
                        {linksToRender.map((_: string, idx: number) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Input
                              {...form.register(`driveLink.${idx}`)}
                              placeholder="e.g., https://drive.google.com/drive/... or file:///C:/Users/yourfile.pdf"
                            />
                            {idx > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (links.length > 1) {
                                    const updated = [...links];
                                    updated.splice(idx, 1);
                                    form.setValue('driveLink', updated);
                                  } else {
                                    form.setValue('driveLink.0', '');
                                  }
                                }}
                                disabled={links.length === 1 && !form.getValues(`driveLink.${idx}`)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            {idx === linksToRender.length - 1 && linksToRender.length < 5 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const currentLinks = form.getValues('driveLink') || [];
                                  form.setValue('driveLink', [...currentLinks, ""]);
                                }}
                                title={T.addLink || "Thêm link"}
                              >
                                <PlusCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(clients || []).map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsAddClientOpen(true)}
                        title={T.addClient}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
          <QuoteManager
            control={form.control}
            form={form}
            fieldArrayName="sections"
            columns={columns}
            setColumns={setColumns}
            title={T.priceQuote}
            quoteTemplates={quoteTemplates}
            settings={settings}
            taskDescription={form.getValues('description') || ''}
            taskCategory={categoryName}
            onApplySuggestion={handleApplySuggestion}
          />

          <Separator />
          {/* Collaborator Section */}
          <Collapsible open={isCollaboratorSectionOpen} onOpenChange={setIsCollaboratorSectionOpen}>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <CollapsibleTrigger asChild>
                  <button type="button" className="flex items-center w-full group">
                    <h3 className="text-lg font-medium">{T.collaboratorCosts}</h3>
                    <ChevronDown className="h-4 w-4 ml-2 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent className="space-y-4 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <FormField 
                  control={form.control} 
                  name="collaboratorIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{T.collaborator}</FormLabel>
                      <select multiple title="Select collaborators" value={field.value || []} onChange={e => field.onChange(Array.from(e.target.selectedOptions, option => option.value))} className="w-full border rounded p-2">
                        {(collaborators || []).map((collaborator) => (
                          <option key={collaborator.id} value={collaborator.id}>
                            {collaborator.name}
                          </option>
                        ))}
                      </select>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                
                {/* Individual Collaborator Quotes */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-medium">{T.collaboratorQuotes || "Collaborator Quotes"}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCollaborator}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      {T.addCollaborator || "Add Collaborator"}
                    </Button>
                  </div>
                  
                  {collaboratorFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <FormField
                          control={form.control}
                          name={`collaboratorQuotes.${index}.collaboratorId`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel>{T.collaborator}</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={T.selectCollaborator || "Select collaborator"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(collaborators || []).map((collaborator) => (
                                    <SelectItem key={collaborator.id} value={collaborator.id}>
                                      {collaborator.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCollaborator(index)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <QuoteManager
                        control={form.control}
                        form={form}
                        fieldArrayName={`collaboratorQuotes.${index}.sections`}
                        columns={collaboratorColumns}
                        setColumns={setCollaboratorColumns}
                        title={`${T.collaboratorCosts} - ${collaborators.find(c => c.id === form.watch(`collaboratorQuotes.${index}.collaboratorId`))?.name || 'Collaborator'}`}
                        settings={settings}
                        onCopyFromQuote={(e?: React.MouseEvent) => {
                          if (e) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                          handleCopyFromQuote(index);
                        }}
                        showCopyFromQuote={true}
                      />
                    </div>
                  ))}
                  
                  {collaboratorFields.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p>{T.noCollaborators || "No collaborators added yet"}</p>
                      <p className="text-sm">{T.clickAddCollaborator || "Click 'Add Collaborator' to start"}</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {T.cancel}
            </Button>
            <Button type="submit">{T.saveChanges}</Button>
          </div>
        </form>
      </Form>
      {/* Dialogs and AlertDialogs */}
      <AlertDialog open={!!templateToApply} onOpenChange={() => setTemplateToApply(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{T.applyTemplate}?</AlertDialogTitle><AlertDialogDescription>{T.applyTemplateWarning}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setTemplateToApply(null)}>{T.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleApplyTemplate}>{T.applyTemplate.replace('...','')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={isColumnDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseColumnDialog()}><DialogContent><DialogHeader><DialogTitle>{editingColumn ? T.edit + " Column" : T.addColumn}</DialogTitle><DialogDescription>{editingColumn ? "Update your column details." : "Enter a name and type for your new column."}</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label htmlFor="new-column-name">Column Name</Label><Input id="new-column-name" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} onKeyDown={(e) => {if (e.key === 'Enter') e.preventDefault()}}/></div><div className="space-y-2"><Label>Column Type</Label><RadioGroup value={newColumnType} onValueChange={(value: QuoteColumn['type']) => setNewColumnType(value)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="text" id="type-text" /><Label htmlFor="type-text" className="font-normal">Text</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="number" id="type-number" /><Label htmlFor="type-number" className="font-normal">Number</Label></div></RadioGroup></div>{newColumnType === 'number' && (<div className="flex items-center space-x-2 pl-1 pt-2"><Checkbox id="sum-total" checked={newColumnSum} onCheckedChange={(checked) => setNewColumnSum(Boolean(checked))} /><Label htmlFor="sum-total" className="text-sm font-normal">Calculate total for this column</Label></div>)}</div><DialogFooter><Button type="button" variant="ghost" onClick={handleCloseColumnDialog}>{T.cancel}</Button><Button type="button" onClick={editingColumn ? handleUpdateColumn : handleAddColumn}>{editingColumn ? T.saveChanges : T.addColumn}</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deletingColumn} onOpenChange={(isOpen) => !isOpen && setDeletingColumn(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{T.areYouSure}?</AlertDialogTitle><AlertDialogDescription>{T.deletePermanently} "{deletingColumn?.name}" column.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingColumn(null)}>{T.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteColumn}>{T.delete}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={isCollabColumnDialogOpen} onOpenChange={(isOpen) => !isOpen && handleCloseCollabColumnDialog()}><DialogContent><DialogHeader><DialogTitle>{editingCollabColumn ? T.edit + " " + T.collaborator + " Column" : T.add + " " + T.collaborator + " Column"}</DialogTitle><DialogDescription>{editingCollabColumn ? "Update your column details." : "Enter a name and type for your new column."}</DialogDescription></DialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label htmlFor="new-collab-column-name">Column Name</Label><Input id="new-collab-column-name" value={newCollabColumnName} onChange={(e) => setNewCollabColumnName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}/></div><div className="space-y-2"><Label>Column Type</Label><RadioGroup value={newCollabColumnType} onValueChange={(value: QuoteColumn['type']) => setNewCollabColumnType(value)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="text" id="collab-type-text" /><Label htmlFor="collab-type-text" className="font-normal">Text</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="number" id="collab-type-number" /><Label htmlFor="collab-type-number" className="font-normal">Number</Label></div></RadioGroup></div>{newCollabColumnType === 'number' && (<div className="flex items-center space-x-2 pl-1 pt-2"><Checkbox id="collab-sum-total" checked={newCollabColumnSum} onCheckedChange={(checked) => setNewCollabColumnSum(Boolean(checked))} /><Label htmlFor="collab-sum-total" className="text-sm font-normal">Calculate total for this column</Label></div>)}</div><DialogFooter><Button type="button" variant="ghost" onClick={handleCloseCollabColumnDialog}>{T.cancel}</Button><Button type="button" onClick={editingCollabColumn ? handleUpdateCollabColumn : handleAddCollabColumn}>{editingCollabColumn ? T.saveChanges : T.addColumn}</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deletingCollabColumn} onOpenChange={(isOpen) => !isOpen && setDeletingCollabColumn(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{T.areYouSure}?</AlertDialogTitle><AlertDialogDescription>{T.deletePermanently} "{deletingCollabColumn?.name}" column.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeletingCollabColumn(null)}>{T.cancel}</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteCollabColumn}>{T.delete}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{T.addClient}</DialogTitle>
            <DialogDescription>
              Enter a name for the new client.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={T.clientNameRequired}
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newClientName.trim()) {
                  handleAddNewClient();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => {
              setIsAddClientOpen(false);
              setNewClientName("");
            }}>
              {T.cancel}
            </Button>
            <Button 
              type="button" 
              onClick={handleAddNewClient}
              disabled={!newClientName.trim()}
            >
              {T.addClient}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

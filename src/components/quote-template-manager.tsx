

"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import type { QuoteTemplate, QuoteColumn, AppSettings, QuoteSection } from "@/lib/types";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { QuoteTemplateForm, type TemplateFormValues } from "./quote-template-form";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type QuoteTemplateManagerProps = {
  templates: QuoteTemplate[];
  onAddTemplate: (data: TemplateFormValues, columns: QuoteColumn[]) => void;
  onEditTemplate: (template: QuoteTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  language: 'en' | 'vi';
  settings: AppSettings;
};

export function QuoteTemplateManager({ templates, onAddTemplate, onEditTemplate, onDeleteTemplate, language, settings }: QuoteTemplateManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<QuoteTemplate | null>(null);
  const T = i18n[language];

  const handleOpenFormForCreate = () => {
    setTemplateToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenFormForEdit = (template: QuoteTemplate) => {
    setTemplateToEdit(template);
    setIsFormOpen(true);
  };
  
  const handleFormSubmit = (values: TemplateFormValues, columns: QuoteColumn[]) => {
    const sectionsWithIds = values.sections.map(s => ({
        ...s,
        id: s.id || `section-${Date.now()}-${Math.random()}`
    }));

    if (templateToEdit) {
      // Ensure each section has a required 'name' field
  const normalizedSections = sectionsWithIds.map(s => ({ id: s.id, name: s.name || 'Section', items: (s.items || []).map((it: any) => ({ description: it.description || '', unitPrice: Number(it.unitPrice || 0), customFields: it.customFields || {} })) }));
      onEditTemplate({ id: templateToEdit.id, name: values.name || templateToEdit.name, sections: normalizedSections, columns });
    } else {
      onAddTemplate({name: values.name, sections: sectionsWithIds}, columns);
    }
    setIsFormOpen(false);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-center">
            <Button onClick={handleOpenFormForCreate}><PlusCircle className="mr-2 h-4 w-4" /> {T.createTemplate}</Button>
        </div>

        <div className="space-y-2">
            <h4 className="font-medium">{T.existingTemplates}</h4>
            <div className="border rounded-lg max-h-80 overflow-y-auto">
                {templates.map((template) => (
                    <div key={template.id} className={cn("flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50 odd:bg-muted/50")}>
                    <span className="font-medium">{template.name}</span>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenFormForEdit(template)}>
                        <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>{T.areYouSure}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {T.deletePermanently} template "{template.name}".
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={() => onDeleteTemplate(template.id)}>{T.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    </div>
                ))}
                {templates.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">{T.noTemplatesFound}</p>}
            </div>
        </div>
      </div>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{templateToEdit ? T.editQuoteTemplate : T.createNewQuoteTemplate}</DialogTitle>
            </DialogHeader>
            <div className="p-1">
                <QuoteTemplateForm 
                  setOpen={setIsFormOpen}
                  onSubmit={handleFormSubmit}
                  templateToEdit={templateToEdit || undefined}
                  language={language}
                  settings={settings}
                />
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

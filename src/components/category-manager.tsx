
"use client";

import React, { useState, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Category, Task } from "@/lib/types";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CategoryManagerProps = {
  categories: Category[];
  tasks: Task[];
  onAddCategory: (data: Omit<Category, 'id'>) => void;
  onEditCategory: (id: string, data: Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  language: 'en' | 'vi';
};

export function CategoryManager({ categories, tasks, onAddCategory, onEditCategory, onDeleteCategory, language }: CategoryManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const T = i18n[language];

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory({ name: newCategoryName.trim() });
      toast({ title: T.categoryAdded, description: `"${newCategoryName.trim()}" ${T.categoryAddedDesc}` });
      setNewCategoryName("");
      setIsAddDialogOpen(false);
    }
  };

  const handleEditCategory = () => {
    if (editingCategory && newCategoryName.trim()) {
      onEditCategory(editingCategory.id, { name: newCategoryName.trim() });
      toast({ title: T.categoryUpdated, description: `"${newCategoryName.trim()}" ${T.categoryUpdatedDesc}` });
      setEditingCategory(null);
      setNewCategoryName("");
    }
  };

  const confirmDeleteCategory = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation();
    const isCategoryInUse = tasks.some(task => task.categoryId === categoryId);
    if (isCategoryInUse) {
      toast({
        variant: "destructive",
        title: T.cannotDeleteCategory,
        description: T.cannotDeleteCategoryDesc,
      });
    } else {
      const categoryName = categories.find(c => c.id === categoryId)?.name;
      onDeleteCategory(categoryId);
      toast({ title: T.categoryDeleted, description: `"${T.categories[categoryId as keyof typeof T.categories] || categoryName}" ${T.categoryDeletedDesc}` });
    }
  };

  useEffect(() => {
    if (editingCategory) {
      const categoryName = T.categories[editingCategory.id as keyof typeof T.categories] || editingCategory.name;
      setNewCategoryName(categoryName);
    } else {
      setNewCategoryName("");
    }
  }, [editingCategory, T.categories]);

  const closeDialogs = () => {
    setIsAddDialogOpen(false);
    setEditingCategory(null);
    setNewCategoryName("");
  }
  
  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-center">
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
              setIsAddDialogOpen(isOpen);
              if (!isOpen) closeDialogs();
            }}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> {T.addNewCategory}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{T.addNewCategory}</DialogTitle></DialogHeader>
                    <div className="py-4">
                        <Input placeholder={T.categoryNameRequired} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">{T.cancel}</Button></DialogClose>
                        <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>{T.addCategory}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <div className="space-y-2">
            <h4 className="font-medium">{T.existingCategories}</h4>
            <div className="rounded-lg border max-h-80 overflow-y-auto">
                {categories.map((category) => {
                    const taskCount = tasks.filter(task => task.categoryId === category.id).length;
                    return (
                    <div key={category.id} className={cn("flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50 odd:bg-muted/50")}>
                    <div className="flex items-center gap-2">
                        <p className="font-medium">{T.categories[category.id as keyof typeof T.categories] || category.name}</p>
                        {taskCount > 0 && <Badge variant="outline">{taskCount}</Badge>}
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(category)}>
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
                                {T.deletePermanently} {T.category.toLowerCase()} "{T.categories[category.id as keyof typeof T.categories] || category.name}".
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={(e) => confirmDeleteCategory(e, category.id)}>{T.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    </div>
                )})}
                {categories.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">{T.noCategoriesFound}</p>}
            </div>
        </div>
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(isOpen) => !isOpen && closeDialogs()}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{T.editCategory}</DialogTitle></DialogHeader>
            <div className="py-4">
              <Input placeholder={T.categoryNameRequired} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">{T.cancel}</Button></DialogClose>
                <Button onClick={handleEditCategory} disabled={!newCategoryName.trim()}>{T.saveChanges}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


"use client";

import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Collaborator, Task } from "@/lib/types";
import { Pencil, PlusCircle, Trash2, Link as LinkIcon } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type CollaboratorManagerProps = {
  collaborators: Collaborator[];
  tasks: Task[];
  onAddCollaborator: (data: Omit<Collaborator, "id">) => void;
  onEditCollaborator: (id: string, data: Omit<Collaborator, "id">) => void;
  onDeleteCollaborator: (id: string) => void;
  language: 'en' | 'vi';
};

export function CollaboratorManager({ collaborators, tasks, onAddCollaborator, onEditCollaborator, onDeleteCollaborator, language }: CollaboratorManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCollaboratorName, setNewCollaboratorName] = useState("");
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [newCollaboratorPhone, setNewCollaboratorPhone] = useState("");
  const [newCollaboratorFacebook, setNewCollaboratorFacebook] = useState("");
  const [newCollaboratorSpecialty, setNewCollaboratorSpecialty] = useState("");
  const [newCollaboratorNotes, setNewCollaboratorNotes] = useState("");
  
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [viewingCollaborator, setViewingCollaborator] = useState<Collaborator | null>(null);
  const [editingData, setEditingData] = useState({ name: "", email: "", phone: "", facebookLink: "", specialty: "", notes: "" });
  
  const { toast } = useToast();
  const T = i18n[language];

  const resetAddForm = () => {
    setNewCollaboratorName("");
    setNewCollaboratorEmail("");
    setNewCollaboratorPhone("");
    setNewCollaboratorFacebook("");
    setNewCollaboratorSpecialty("");
    setNewCollaboratorNotes("");
  };

  const handleAddCollaborator = () => {
    if (newCollaboratorName.trim()) {
      onAddCollaborator({
        name: newCollaboratorName.trim(),
        email: newCollaboratorEmail.trim() || undefined,
        phone: newCollaboratorPhone.trim() || undefined,
        facebookLink: newCollaboratorFacebook.trim() || undefined,
        specialty: newCollaboratorSpecialty.trim() || undefined,
        notes: newCollaboratorNotes.trim() || undefined,
      });
      resetAddForm();
      setIsAddDialogOpen(false);
      toast({ title: T.collaboratorAdded, description: `"${newCollaboratorName.trim()}" ${T.collaboratorAddedDesc}` });
    }
  };

  const handleStartEdit = (collaborator: Collaborator) => {
    setEditingCollaborator(collaborator);
    setEditingData({
        name: collaborator.name,
        email: collaborator.email || "",
        phone: collaborator.phone || "",
        facebookLink: collaborator.facebookLink || "",
        specialty: collaborator.specialty || "",
        notes: collaborator.notes || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingCollaborator(null);
    setEditingData({ name: "", email: "", phone: "", facebookLink: "", specialty: "", notes: "" });
  };

  const handleConfirmEdit = () => {
    if (editingCollaborator && editingData.name.trim()) {
      onEditCollaborator(editingCollaborator.id, {
        name: editingData.name.trim(),
        email: editingData.email.trim() || undefined,
        phone: editingData.phone.trim() || undefined,
        facebookLink: editingData.facebookLink.trim() || undefined,
        specialty: editingData.specialty.trim() || undefined,
        notes: editingData.notes.trim() || undefined,
      });
      toast({ title: T.collaboratorUpdated, description: `${T.collaborator} "${editingData.name.trim()}" ${T.collaboratorUpdatedDesc}` });
      handleCancelEdit();
    }
  };

  const confirmDeleteCollaborator = (e: React.MouseEvent, collaboratorId: string) => {
    e.stopPropagation();
    const isCollaboratorInUse = tasks.some(task => Array.isArray(task.collaboratorIds) && task.collaboratorIds.includes(collaboratorId));
    if (isCollaboratorInUse) {
      toast({
        variant: "destructive",
        title: T.cannotDeleteCollaborator,
        description: T.cannotDeleteCollaboratorDesc,
      });
    } else {
      const collaboratorName = collaborators.find(c => c.id === collaboratorId)?.name;
      onDeleteCollaborator(collaboratorId);
      toast({ title: T.collaboratorDeleted, description: `"${collaboratorName}" ${T.collaboratorDeletedDesc}` });
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-center">
            <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
                setIsAddDialogOpen(isOpen);
                if (!isOpen) resetAddForm();
            }}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> {T.addNewCollaborator}</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{T.addNewCollaborator}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Input
                            placeholder={T.collaboratorNameRequired}
                            value={newCollaboratorName}
                            onChange={(e) => setNewCollaboratorName(e.target.value)}
                        />
                        <Input
                            placeholder={T.email}
                            value={newCollaboratorEmail}
                            onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                            type="email"
                        />
                        <Input
                            placeholder={T.phone}
                            value={newCollaboratorPhone}
                            onChange={(e) => setNewCollaboratorPhone(e.target.value)}
                            type="tel"
                        />
                        <Input
                            placeholder={T.facebookLink}
                            value={newCollaboratorFacebook}
                            onChange={(e) => setNewCollaboratorFacebook(e.target.value)}
                            type="url"
                        />
                        <Input
                            placeholder={T.specialty}
                            value={newCollaboratorSpecialty}
                            onChange={(e) => setNewCollaboratorSpecialty(e.target.value)}
                        />
                        <Textarea
                            placeholder={T.notes}
                            value={newCollaboratorNotes}
                            onChange={(e) => setNewCollaboratorNotes(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                           <Button type="button" variant="ghost">{T.cancel}</Button>
                        </DialogClose>
                        <Button 
                          onClick={handleAddCollaborator}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddCollaborator();
                            }
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> {T.add}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        <div className="space-y-2">
            <h4 className="font-medium">{T.existingCollaborators}</h4>
            <div className="border rounded-lg max-h-80 overflow-y-auto">
                {collaborators.map((collaborator) => (
                    <div 
                    key={collaborator.id} 
                    className={cn("flex items-start justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 odd:bg-muted/50")}
                    onClick={() => setViewingCollaborator(collaborator)}
                    >
                    <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{collaborator.name}</p>
                        {collaborator.facebookLink && (
                            <a href={collaborator.facebookLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary">
                                <LinkIcon className="h-3 w-3" />
                            </a>
                        )}
                        </div>
                        {collaborator.specialty && <p className="text-xs text-muted-foreground">{collaborator.specialty}</p>}
                        <div className="text-xs text-muted-foreground mt-1">
                        {collaborator.email && <p>{collaborator.email}</p>}
                        {collaborator.phone && <p>{collaborator.phone}</p>}
                        </div>
                        {collaborator.notes && <p className="text-xs text-muted-foreground italic mt-2 whitespace-pre-wrap">{collaborator.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleStartEdit(collaborator); }}>
                        <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>{T.areYouSure}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {T.deletePermanently} {T.collaborator.toLowerCase()} "{collaborator.name}".
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={(e) => confirmDeleteCollaborator(e, collaborator.id)}>{T.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    </div>
                ))}
                {collaborators.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">{T.noCollaboratorsFound}</p>}
            </div>
        </div>
      </div>
      
      {/* View Collaborator Dialog */}
      <Dialog open={!!viewingCollaborator} onOpenChange={(isOpen) => !isOpen && setViewingCollaborator(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{viewingCollaborator?.name}</DialogTitle>
                <DialogDescription>{viewingCollaborator?.specialty || T.collaborator + " Details"}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
                {viewingCollaborator?.email && (
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label className="text-muted-foreground text-right">{T.email}</Label>
                        <p className="col-span-2 text-sm">{viewingCollaborator.email}</p>
                    </div>
                )}
                 {viewingCollaborator?.phone && (
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label className="text-muted-foreground text-right">{T.phone}</Label>
                        <p className="col-span-2 text-sm">{viewingCollaborator.phone}</p>
                    </div>
                )}
                 {viewingCollaborator?.facebookLink && (
                    <div className="grid grid-cols-3 items-center gap-4">
                        <Label className="text-muted-foreground text-right">{T.facebookLink}</Label>
                        <a href={viewingCollaborator.facebookLink} target="_blank" rel="noopener noreferrer" className="col-span-2 text-sm text-primary hover:underline truncate">{viewingCollaborator.facebookLink}</a>
                    </div>
                )}
                 {viewingCollaborator?.notes && (
                    <div className="grid grid-cols-3 items-start gap-4">
                        <Label className="text-muted-foreground text-right pt-1">{T.notes}</Label>
                        <p className="col-span-2 text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded-md">{viewingCollaborator.notes}</p>
                    </div>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">{T.close}</Button></DialogClose>
                <Button onClick={() => {
                    if (viewingCollaborator) {
                        handleStartEdit(viewingCollaborator);
                        setViewingCollaborator(null);
                    }
                }}>
                    <Pencil className="mr-2 h-4 w-4" /> {T.edit}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Collaborator Dialog */}
      <Dialog open={!!editingCollaborator} onOpenChange={(isOpen) => !isOpen && handleCancelEdit()}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{T.edit} {T.collaborator}</DialogTitle>
                <DialogDescription>
                    {T.saveChanges} for "{editingCollaborator?.name}".
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">{T.taskName}</Label>
                    <Input
                        id="edit-name"
                        value={editingData.name}
                        onChange={(e) => setEditingData({...editingData, name: e.target.value})}
                        className="col-span-3"
                    />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-email" className="text-right">{T.email}</Label>
                    <Input
                        id="edit-email"
                        value={editingData.email}
                        onChange={(e) => setEditingData({...editingData, email: e.target.value})}
                        className="col-span-3"
                        type="email"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-phone" className="text-right">{T.phone}</Label>
                    <Input
                        id="edit-phone"
                        value={editingData.phone}
                        onChange={(e) => setEditingData({...editingData, phone: e.target.value})}
                        className="col-span-3"
                        type="tel"
                    />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-facebook" className="text-right">{T.facebookLink}</Label>
                    <Input
                        id="edit-facebook"
                        value={editingData.facebookLink}
                        onChange={(e) => setEditingData({...editingData, facebookLink: e.target.value})}
                        className="col-span-3"
                        type="url"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-specialty" className="text-right">{T.specialty}</Label>
                    <Input
                        id="edit-specialty"
                        value={editingData.specialty}
                        onChange={(e) => setEditingData({...editingData, specialty: e.target.value})}
                        className="col-span-3"
                    />
                </div>
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="edit-notes" className="text-right pt-2">{T.notes}</Label>
                    <Textarea
                        id="edit-notes"
                        value={editingData.notes}
                        onChange={(e) => setEditingData({...editingData, notes: e.target.value})}
                        className="col-span-3"
                        rows={4}
                    />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="ghost">{T.cancel}</Button>
                </DialogClose>
                <Button onClick={handleConfirmEdit}>{T.saveChanges}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

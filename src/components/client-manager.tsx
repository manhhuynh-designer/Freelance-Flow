
"use client";

import React, { useState, useEffect } from "react";
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
import type { Client, Task } from "@/lib/types";
import { Pencil, PlusCircle, Trash2, Mail, Phone, Info, Link as LinkIcon } from "lucide-react";
import { Badge } from "./ui/badge";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ClientManagerProps = {
  clients: Client[];
  tasks: Task[];
  onAddClient: (data: Omit<Client, 'id'>) => void;
  onEditClient: (id: string, data: Omit<Client, 'id'>) => void;
  onDeleteClient: (id: string) => void;
  language: 'en' | 'vi';
};

const defaultClientData = {
    name: "",
    email: [""],
    phone: [""],
    taxInfo: [""],
    type: "brand" as "agency" | "brand",
    driveLink: [""],
}

export function ClientManager({ clients, tasks, onAddClient, onEditClient, onDeleteClient, language }: ClientManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClientData, setNewClientData] = useState(defaultClientData);

  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [viewingClientTaskCount, setViewingClientTaskCount] = useState(0);
  const { toast } = useToast();

  const T = i18n[language];

  const resetAddForm = () => {
    setNewClientData(defaultClientData);
  }

  const handleAddClient = () => {
    if (typeof newClientData.name === 'string' && newClientData.name.trim()) {
      onAddClient({
        name: newClientData.name.trim(),
        email: newClientData.email.map(e => e.trim()).filter(e => e),
        phone: newClientData.phone.map(e => e.trim()).filter(e => e),
        taxInfo: newClientData.taxInfo.map(e => e.trim()).filter(e => e),
        type: newClientData.type,
        driveLink: newClientData.driveLink.map(e => e.trim()).filter(e => e),
      });
      toast({ title: T.clientAdded, description: `"${newClientData.name.trim()}" ${T.clientAddedDesc}` });
      resetAddForm();
      setIsAddDialogOpen(false);
    }
  };

  const handleStartEdit = (client: Client) => {
    setEditingClient(client);
  };

  const handleCancelEdit = () => {
    setEditingClient(null);
  };

  const handleConfirmEdit = (editedData: Omit<Client, 'id'>) => {
    if (editingClient) {
      // Đảm bảo name là string
      const safeName = typeof editedData.name === 'string' ? editedData.name : Array.isArray(editedData.name) ? editedData.name[0] : '';
      onEditClient(editingClient.id, { ...editedData, name: safeName });
      toast({ title: T.clientUpdated, description: `${T.client} "${safeName}" ${T.clientUpdatedDesc}` });
      handleCancelEdit();
    }
  };

  const confirmDeleteClient = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    const isClientInUse = tasks.some(task => task.clientId === clientId);
    if (isClientInUse) {
      toast({
        variant: "destructive",
        title: T.cannotDeleteClient,
        description: T.cannotDeleteClientDesc,
      });
    } else {
      const clientName = clients.find(c => c.id === clientId)?.name;
      onDeleteClient(clientId);
      toast({ title: T.clientDeleted, description: `"${clientName}" ${T.clientDeletedDesc}` });
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
              <Button><PlusCircle className="mr-2 h-4 w-4" /> {T.addNewClient}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{T.addNewClient}</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Input placeholder={T.clientNameRequired} value={newClientData.name} onChange={(e) => setNewClientData({...newClientData, name: e.target.value})} />
                <Input placeholder={T.email} type="email" value={newClientData.email[0] || ""} onChange={(e) => setNewClientData({...newClientData, email: [e.target.value]})} />
                <Input placeholder={T.phone} type="tel" value={newClientData.phone[0] || ""} onChange={(e) => setNewClientData({...newClientData, phone: [e.target.value]})} />
                <Input placeholder={T.taxInfo} value={newClientData.taxInfo[0] || ""} onChange={(e) => setNewClientData({...newClientData, taxInfo: [e.target.value]})} />
                <Input placeholder={T.driveLink} type="url" value={newClientData.driveLink[0] || ""} onChange={(e) => setNewClientData({...newClientData, driveLink: [e.target.value]})} />
                <div>
                    <Label className="text-sm font-medium text-muted-foreground">{T.clientType}</Label>
                    <RadioGroup value={newClientData.type} onValueChange={(value: "agency" | "brand") => setNewClientData({...newClientData, type: value})} className="flex gap-4 pt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="brand" id="type-brand" /><Label htmlFor="type-brand" className="font-normal">{T.brand}</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="agency" id="type-agency" /><Label htmlFor="type-agency" className="font-normal">{T.agency}</Label></div>
                    </RadioGroup>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="ghost">{T.cancel}</Button></DialogClose>
                <Button onClick={handleAddClient} disabled={!newClientData.name.trim()}>{T.addClient}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
            <h4 className="font-medium">{T.existingClients}</h4>
            <div className="rounded-lg border max-h-80 overflow-y-auto">
              {clients.map((client) => {
                const taskCount = tasks.filter(task => task.clientId === client.id).length;
                return (
                <div key={client.id} className={cn("flex items-start justify-between p-3 border-b last:border-b-0 hover:bg-muted/50 odd:bg-muted/50")} onClick={() => {
                  setViewingClient(client)
                  setViewingClientTaskCount(taskCount)
                }}>
                  <div className="flex-1 pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{client.name}</p>
                      {taskCount > 0 && <Badge variant="outline">{taskCount}</Badge>}
                      {client.type && <Badge variant="secondary" className="capitalize">{client.type === 'brand' ? T.brand : T.agency}</Badge>}
                      {client.driveLink && <a href={Array.isArray(client.driveLink) ? client.driveLink[0] : client.driveLink} target="_blank" rel="noopener noreferrer" title={Array.isArray(client.driveLink) ? client.driveLink[0] : client.driveLink} onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary"><LinkIcon className="h-3 w-3" /></a>}
                    </div>
                    {client.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3" /><span>{client.email}</span></div>}
                    {client.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" /><span>{client.phone}</span></div>}
                    {client.taxInfo && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Info className="h-3 w-3" /><span>{client.taxInfo}</span></div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleStartEdit(client); }}>
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
                            {T.deletePermanently} {T.client.toLowerCase()} "{client.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                          <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={(e) => confirmDeleteClient(e, client.id)}>{T.delete}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )})}
              {clients.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">{T.noClientsFound}</p>}
            </div>
        </div>
      </div>
      
      <ViewClientDialog
        client={viewingClient}
        taskCount={viewingClientTaskCount}
        onClose={() => setViewingClient(null)}
        onEdit={(clientToEdit) => {
          setViewingClient(null);
          handleStartEdit(clientToEdit);
        }}
        language={language}
      />
      
      <EditClientDialog 
        client={editingClient}
        onClose={handleCancelEdit}
        onSave={handleConfirmEdit}
        language={language}
      />
    </>
  );
}

// View Client Dialog Component
function ViewClientDialog({ client, taskCount, onClose, onEdit, language }: { client: Client | null, taskCount: number, onClose: () => void, onEdit: (client: Client) => void, language: 'en' | 'vi' }) {
    if (!client) return null;
    const T = i18n[language];

    return (
        <Dialog open={!!client} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogDescription>
                        {client.type ? <Badge variant="outline" className="capitalize">{client.type === 'brand' ? T.brand : T.agency}</Badge> : T.viewClientDetails}
                    </DialogDescription>
                    <DialogTitle className="flex items-center gap-2">
                      {client.name}
                      {taskCount > 0 && <Badge variant="outline">{taskCount} {T.task.toLowerCase()}{taskCount > 1 ? 's' : ''}</Badge>}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-3">
                    {client.email && (
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label className="text-muted-foreground text-right">{T.email}</Label>
                            <p className="col-span-2 text-sm">{client.email}</p>
                        </div>
                    )}
                    {client.phone && (
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label className="text-muted-foreground text-right">{T.phone}</Label>
                            <p className="col-span-2 text-sm">{client.phone}</p>
                        </div>
                    )}
                    {client.taxInfo && (
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label className="text-muted-foreground text-right">{T.taxInfo}</Label>
                            <p className="col-span-2 text-sm">{client.taxInfo}</p>
                        </div>
                    )}
                    {client.driveLink && (
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label className="text-muted-foreground text-right">{T.driveLink}</Label>
                            <a href={Array.isArray(client.driveLink) ? client.driveLink[0] : client.driveLink} target="_blank" rel="noopener noreferrer" className="col-span-2 text-sm text-primary hover:underline truncate">{Array.isArray(client.driveLink) ? client.driveLink[0] : client.driveLink}</a>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>{T.close}</Button>
                    <Button onClick={() => onEdit(client)}>
                        <Pencil className="mr-2 h-4 w-4" /> {T.edit}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// Separate component for the Edit Dialog for cleaner state management
type EditClientDialogProps = {
    client: Client | null;
    onClose: () => void;
    onSave: (data: Omit<Client, 'id'>) => void;
    language: 'en' | 'vi';
}

function EditClientDialog({ client, onClose, onSave, language }: EditClientDialogProps) {
    const [formData, setFormData] = useState<Omit<Client, 'id'>>({ name: '', email: [""], phone: [""], taxInfo: [""], type: 'brand', driveLink: [""] });
    const T = i18n[language];

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name,
                email: Array.isArray(client.email) ? client.email : typeof client.email === 'string' ? [client.email] : [""] ,
                phone: Array.isArray(client.phone) ? client.phone : typeof client.phone === 'string' ? [client.phone] : [""] ,
                taxInfo: Array.isArray(client.taxInfo) ? client.taxInfo : typeof client.taxInfo === 'string' ? [client.taxInfo] : [""] ,
                type: client.type || 'brand',
                driveLink: Array.isArray(client.driveLink) ? client.driveLink : typeof client.driveLink === 'string' ? [client.driveLink] : [""]
            });
        }
    }, [client]);

    const handleSave = () => {
        if (formData.name.trim()) {
            onSave({
              ...formData,
              name: formData.name.trim(),
              email: (formData.email ?? [""]).map((e: string) => e.trim()).filter(e => e),
              phone: (formData.phone ?? [""]).map((e: string) => e.trim()).filter(e => e),
              taxInfo: (formData.taxInfo ?? [""]).map((e: string) => e.trim()).filter(e => e),
              driveLink: (formData.driveLink ?? [""]).map((e: string) => e.trim()).filter(e => e),
            });
        }
    };

    if (!client) return null;

    return (
        <Dialog open={!!client} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{T.editClient}</DialogTitle>
                    <DialogDescription>{T.saveChanges} for "{client.name}".</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Input placeholder={T.clientNameRequired} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    <Input placeholder={T.email} type="email" value={(formData.email ?? [""])[0] || ""} onChange={(e) => setFormData({...formData, email: [e.target.value]})} />
                    <Input placeholder={T.phone} type="tel" value={(formData.phone ?? [""])[0] || ""} onChange={(e) => setFormData({...formData, phone: [e.target.value]})} />
                    <Input placeholder={T.taxInfo} value={(formData.taxInfo ?? [""])[0] || ""} onChange={(e) => setFormData({...formData, taxInfo: [e.target.value]})} />
                    <Input placeholder={T.driveLink} type="url" value={(formData.driveLink ?? [""])[0] || ""} onChange={(e) => setFormData({...formData, driveLink: [e.target.value]})} />
                    <div>
                        <Label className="text-sm font-medium text-muted-foreground">{T.clientType}</Label>
                        <RadioGroup value={formData.type} onValueChange={(value: "agency" | "brand") => setFormData({...formData, type: value})} className="flex gap-4 pt-2">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="brand" id="edit-type-brand" /><Label htmlFor="edit-type-brand" className="font-normal">{T.brand}</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="agency" id="edit-type-agency" /><Label htmlFor="edit-type-agency" className="font-normal">{T.agency}</Label></div>
                        </RadioGroup>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>{T.cancel}</Button>
                    <Button onClick={handleSave} disabled={!formData.name.trim()}>{T.saveChanges}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

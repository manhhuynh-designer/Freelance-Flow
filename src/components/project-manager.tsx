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
import type { Task, Project } from "@/lib/types";
import { Pencil, PlusCircle, Trash2, Link as LinkIcon, Briefcase } from "lucide-react";
import { Badge } from "./ui/badge";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ProjectManagerProps = {
  projects: Project[];
  tasks: Task[];
  onAddProject: (data: Omit<Project, 'id' | 'tasks'>) => void;
  onEditProject: (id: string, data: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  language: 'en' | 'vi';
};

const emptyProject: Omit<Project, 'id' | 'tasks'> = { name: '', description: '', links: [] } as any;

export function ProjectManager({ projects, tasks, onAddProject, onEditProject, onDeleteProject, language }: ProjectManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<Project, 'id' | 'tasks'>>({ ...emptyProject });
  const [editing, setEditing] = useState<Project | null>(null);
  const { toast } = useToast();
  const TL = (i18n as any)[language];

  const reset = () => setDraft({ ...emptyProject });

  const handleAdd = () => {
    const name = (draft.name || '').trim();
    if (!name) return;
    onAddProject({
      name,
      description: (draft as any).description || '',
      status: (draft as any).status,
      clientId: (draft as any).clientId,
      links: Array.isArray(draft.links) ? draft.links.map((l: any) => String(l).trim()).filter(Boolean) : [],
    });
  toast({ title: TL.projectAdded || 'Project added', description: `"${name}" ${TL.projectAddedDesc || 'has been created.'}` });
    reset();
    setIsAddOpen(false);
  };

  const handleSaveEdit = (updates: Partial<Project>) => {
    if (!editing) return;
    const safeName = typeof updates.name === 'string' ? updates.name : editing.name;
    onEditProject(editing.id, {
      ...updates,
      name: safeName,
      links: Array.isArray(updates.links) ? updates.links.map((l: any) => String(l).trim()).filter(Boolean) : editing.links,
    });
  toast({ title: TL.projectUpdated || 'Project updated', description: `${TL.project || 'Project'} "${safeName}" ${TL.projectUpdatedDesc || 'updated.'}` });
    setEditing(null);
  };

  const confirmDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const inUse = tasks.some(t => (t as any).projectId === projectId);
    if (inUse) {
  toast({ variant: 'destructive', title: TL.cannotDeleteProject || 'Cannot delete project', description: TL.cannotDeleteProjectDesc || 'This project is used by some tasks.' });
      return;
    }
    const name = projects.find(p => p.id === projectId)?.name;
    onDeleteProject(projectId);
  toast({ title: TL.projectDeleted || 'Project deleted', description: `"${name}" ${TL.projectDeletedDesc || 'has been removed.'}` });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Dialog open={isAddOpen} onOpenChange={(o)=>{ setIsAddOpen(o); if(!o) reset(); }}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> {TL.addProject || 'Add Project'}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{TL.addProject || 'Add Project'}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-3">
              <Input placeholder={TL.projectNameRequired || 'Project name'} value={draft.name || ''} onChange={(e)=>setDraft(d=>({...d, name:e.target.value}))} />
              <Input placeholder={TL.projectDescription || 'Description'} value={(draft as any).description || ''} onChange={(e)=>setDraft(d=>({...d, description:e.target.value}))} />
              <Input placeholder={TL.links || 'Links'} value={(draft.links?.[0] as any) || ''} onChange={(e)=>setDraft(d=>({...d, links:[e.target.value]}))} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">{TL.cancel || 'Cancel'}</Button></DialogClose>
              <Button onClick={handleAdd} disabled={!String(draft.name || '').trim()}>{TL.addProject || 'Add Project'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
  <h4 className="font-medium">{TL.existingProjects || 'Existing Projects'}</h4>
        <div className="rounded-lg border max-h-80 overflow-y-auto">
          {projects.map(p => {
            const count = tasks.filter(t => (t as any).projectId === p.id).length;
            return (
              <div key={p.id} className={cn("flex items-start justify-between p-3 border-b last:border-b-0 hover:bg-muted/50 odd:bg-muted/50")} onClick={()=>setEditing(p)}>
                <div className="flex-1 pr-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium flex items-center gap-1"><Briefcase className="h-3 w-3" /> {p.name}</p>
                    {count > 0 && <Badge variant="outline">{count}</Badge>}
                    {Array.isArray(p.links) && p.links[0] && (
                      <a href={p.links[0]} target="_blank" rel="noopener noreferrer" onClick={(e)=>e.stopPropagation()} className="text-muted-foreground hover:text-primary" title={p.links[0]}>
                        <LinkIcon className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {(p as any).description && <p className="text-xs text-muted-foreground truncate">{(p as any).description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e)=>{ e.stopPropagation(); setEditing(p); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e)=>e.stopPropagation()}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{TL.areYouSure || 'Are you sure?'}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {TL.deletePermanently || 'Delete permanently'} {(TL.project || 'project').toLowerCase()} "{p.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{TL.cancel || 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={(e)=>confirmDelete(e, p.id)}>{TL.delete || 'Delete'}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
          {projects.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">{TL.noProjectsFound || 'No projects found'}</p>}
        </div>
      </div>

      <EditProjectDialog project={editing} onClose={()=>setEditing(null)} onSave={handleSaveEdit} language={language} tasks={tasks} />
    </div>
  );
}

function EditProjectDialog({ project, onClose, onSave, language, tasks }: { project: Project | null; onClose: ()=>void; onSave: (updates: Partial<Project>) => void; language: 'en' | 'vi'; tasks: Task[] }) {
  const [form, setForm] = useState<Partial<Project>>({});
  const TL = (i18n as any)[language];

  useEffect(()=>{
    if (project) {
      setForm({ name: project.name, description: (project as any).description || '', links: Array.isArray(project.links) ? project.links : [] });
    } else setForm({});
  }, [project]);

  if (!project) return null;
  const tasksForProject = Array.isArray(tasks) ? tasks.filter(t => (t as any).projectId === project.id) : [];
  return (
    <Dialog open={!!project} onOpenChange={(o)=>{ if(!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TL.editProject || 'Edit Project'}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <Input placeholder={TL.projectNameRequired || 'Project name'} value={String(form.name || '')} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} />
          <Input placeholder={TL.projectDescription || 'Description'} value={String((form as any).description || '')} onChange={(e)=>setForm(f=>({...f, description:e.target.value}))} />
          <Input placeholder={TL.links || 'Links'} value={String(((form.links as any)?.[0]) || '')} onChange={(e)=>setForm(f=>({...f, links:[e.target.value]}))} />
          <div className="mt-2 border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> {TL.tasksInProject || 'Tasks in this project'}
              </p>
              {tasksForProject.length > 0 && (
                <Badge variant="outline">{tasksForProject.length}</Badge>
              )}
            </div>
            {tasksForProject.length === 0 ? (
              <p className="text-sm text-muted-foreground">{TL.noTasksInProject || 'No tasks linked to this project yet.'}</p>
            ) : (
              <div className="max-h-56 overflow-y-auto rounded-md border">
                <ul className="divide-y">
                  {tasksForProject.map(t => (
                    <li key={t.id} className="p-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate" title={t.name}>{t.name}</span>
                        <Badge variant="secondary" className="uppercase text-[10px]">{t.status}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>{TL.cancel || 'Cancel'}</Button>
          <Button onClick={()=>onSave(form)} disabled={!String(form.name || '').trim()}>{TL.saveChanges || 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

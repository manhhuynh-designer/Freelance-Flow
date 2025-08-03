"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2, Bold, Italic, Underline, Strikethrough, List } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import styles from './sticky-notes.module.css';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { AppSettings, Note } from '@/lib/types';
import { vi, en } from '@/lib/i18n';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapUnderline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

type StickyNotesProps = {
    settings: AppSettings;
}

type NoteCardProps = {
    note: Note;
    noteStyle: React.CSSProperties;
    onDelete: (id: number) => void;
    onEdit: (note: Note) => void;
    isDragging?: boolean;
    T: any;
    attributes?: any;
    listeners?: any;
    isOverlay?: boolean;
}

// Component for displaying the note UI, reusable for SortableNote and DragOverlay
function NoteCard({ note, noteStyle, onDelete, onEdit, isDragging, T, attributes, listeners, isOverlay = false }: NoteCardProps) {
  const createMarkup = (htmlString: string) => ({ __html: htmlString });

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && !isOverlay) {
      onEdit(note);
    }
  };

  const cursorStyle = isOverlay ? 'grabbing' : (isDragging ? 'grabbing' : 'grab');

  return (
    <div
      className="flex items-center justify-between gap-2 p-2 rounded-md"
      style={{ ...noteStyle, cursor: cursorStyle }}
      {...attributes}
      {...listeners}
    >
      <div
        className="flex-1 min-w-0"
        onClick={handleContentClick}
        style={{ cursor: isOverlay ? 'grabbing' : 'pointer' }}
      >
        <div
          className={`${styles.noteText} tiptap-rendered-content`}
          dangerouslySetInnerHTML={createMarkup(note.text)}
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        style={{ color: 'inherit', opacity: 0.7 }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }}
        title={T.deleteNote}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}


type SortableNoteProps = {
  note: Note;
  noteStyle: React.CSSProperties;
  onDelete: (id: number) => void;
  onEdit: (note: Note) => void;
  isDragging: boolean;
  T: any;
};

function SortableNote({ note, noteStyle, onDelete, onEdit, isDragging, T }: SortableNoteProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: dndIsDragging,
  } = useSortable({ id: note.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: dndIsDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
       <NoteCard
            note={note}
            noteStyle={noteStyle}
            onDelete={onDelete}
            onEdit={onEdit}
            isDragging={isDragging}
            T={T}
            attributes={attributes}
            listeners={listeners}
        />
    </div>
  );
}

const Toolbar = ({ editor, T }: { editor: Editor | null, T: any }) => {
    if (!editor) {
        return null;
    }

    const getButtonClass = (isActive: boolean) => {
        return `${styles.toolbarButton} ${isActive ? styles.toolbarButtonActive : ''}`;
    };

    return (
        <div className="bg-transparent rounded-md p-1 flex items-center gap-1 mb-2">
            <Button onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} size="icon" className={`${getButtonClass(editor.isActive('bold'))} h-8 w-8`} title={T.bold}> <Bold className="h-4 w-4" /> </Button>
            <Button onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} size="icon" className={`${getButtonClass(editor.isActive('italic'))} h-8 w-8`} title={T.italic}> <Italic className="h-4 w-4" /> </Button>
            <Button onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().chain().focus().toggleUnderline().run()} size="icon" className={`${getButtonClass(editor.isActive('underline'))} h-8 w-8`} title={T.underline}> <Underline className="h-4 w-4" /> </Button>
            <Button onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} size="icon" className={`${getButtonClass(editor.isActive('strike'))} h-8 w-8`} title={T.strikethrough}> <Strikethrough className="h-4 w-4" /> </Button>
            <Button onClick={() => editor.chain().focus().toggleBulletList().run()} disabled={!editor.can().chain().focus().toggleBulletList().run()} size="icon" className={`${getButtonClass(editor.isActive('bulletList'))} h-8 w-8`} title={T.bulletList}> <List className="h-4 w-4" /> </Button>
        </div>
    );
};

export function StickyNotes({ settings }: StickyNotesProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [activeId, setActiveId] = useState<number | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeNote, setActiveNote] = useState<Note | null>(null);
    const [dialogText, setDialogText] = useState("");
    
    const T = (settings.language === 'vi' ? vi : en) as any;
    
    const editor = useEditor({
        extensions: [ 
            StarterKit.configure({ heading: false }), 
            TiptapUnderline,
            Link.configure({
                autolink: true,
                openOnClick: true,
                linkOnPaste: true,
            })
        ],
        content: dialogText,
        onUpdate: ({ editor }) => { setDialogText(editor.getHTML()); },
        immediatelyRender: false,
        editorProps: {
            attributes: { class: 'prose dark:prose-invert min-h-[120px] w-full rounded-md bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50' },
        },
    });
    
    useEffect(() => { if(editor) { editor.commands.setContent(dialogText); } }, [dialogText, editor]);
    useEffect(() => { if (!isDialogOpen) { editor?.commands.clearContent(); } }, [isDialogOpen, editor]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    useEffect(() => {
        try { const storedNotes = localStorage.getItem('freelance-flow-notes'); setNotes(storedNotes ? JSON.parse(storedNotes) : []); }
        catch (error) { console.error("Failed to load notes from localStorage", error); setNotes([]); }
        setIsInitialLoad(false);
    }, []);

    useEffect(() => { if (!isInitialLoad) { localStorage.setItem('freelance-flow-notes', JSON.stringify(notes)); } }, [notes, isInitialLoad]);

    const handleAddNoteClick = () => { setActiveNote(null); setDialogText(""); setIsDialogOpen(true); };
    const handleEditNoteClick = (note: Note) => { setActiveNote(note); setDialogText(note.text); setIsDialogOpen(true); };
    const handleDeleteNote = (id: number) => { setNotes(notes.filter(note => note.id !== id)); };
    
    const handleSaveNote = () => {
      const isEmpty = !editor?.getText().trim();
      if (isEmpty) { if (activeNote) { handleDeleteNote(activeNote.id); } setIsDialogOpen(false); return; };
      const noteContent = editor?.getHTML() || '';
      if (activeNote) { setNotes(notes.map(n => n.id === activeNote.id ? { ...n, text: noteContent } : n)); }
      else { setNotes([...notes, { id: Date.now(), text: noteContent }]); }
      setIsDialogOpen(false);
    };
    
    const handleDragStart = (event: DragStartEvent) => {
        setIsDragging(true);
        setActiveId(event.active.id as number);
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
          const oldIndex = notes.findIndex((n) => n.id === active.id);
          const newIndex = notes.findIndex((n) => n.id === over.id);
          setNotes(arrayMove(notes, oldIndex, newIndex));
        }
        setIsDragging(false);
        setActiveId(null);
    };

    const noteStyle = {
        backgroundColor: settings.stickyNoteColor.background,
        color: settings.stickyNoteColor.foreground,
        '--note-foreground-color': settings.stickyNoteColor.foreground
    } as React.CSSProperties;
    
    const activeNoteForOverlay = activeId ? notes.find(n => n.id === activeId) : null;

    return (
        <div className="h-full w-full">
            <Card className="w-full h-full flex flex-col shadow-lg p-2">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-normal text-muted-foreground"> {T.stickyNotes} </CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleAddNoteClick}>
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">{T.addNote}</span>
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden react-grid-draggable-cancel">
                    <ScrollArea className={`h-full overflow-y-auto ${styles.customScrollbar}`}>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                            <SortableContext items={notes} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2 pr-4">
                                    {notes.length > 0 ? (
                                        notes.map((note) => (
                                            <SortableNote key={note.id} note={note} noteStyle={noteStyle} onDelete={handleDeleteNote} onEdit={handleEditNoteClick} isDragging={isDragging} T={T} />
                                        ))
                                    ) : ( <p className="text-xs text-muted-foreground text-center py-4">{T.noNotesYet}</p> )}
                                </div>
                            </SortableContext>
                            <DragOverlay>
                                {activeNoteForOverlay ? (
                                    <NoteCard
                                        note={activeNoteForOverlay}
                                        noteStyle={noteStyle}
                                        onDelete={()=>{}}
                                        onEdit={()=>{}}
                                        isDragging={true}
                                        T={T}
                                        isOverlay={true}
                                    />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] border-none shadow-xl p-4" style={noteStyle}>
                    <DialogHeader className="p-0 mb-0"> 
                        <DialogTitle className="text-xl font-normal">{activeNote ? T.editNote : T.addNewNote}</DialogTitle> 
                    </DialogHeader>
                    <div className="p-0">
                       <Toolbar editor={editor} T={T} />
                       <EditorContent editor={editor} />
                    </div>
                    <DialogFooter className="flex justify-between w-full sm:justify-between pt-4">
                         <div className="flex-1 flex justify-start">
                            {activeNote && (
                               <Button variant="ghost" className={`${styles.deleteButton} text-destructive`} onClick={() => { handleDeleteNote(activeNote.id); setIsDialogOpen(false); }}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2"> 
                            <Button variant="outline" className={styles.saveButton} onClick={handleSaveNote}>{activeNote ? T.save : T.addNote}</Button> 
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
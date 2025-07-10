

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import type { AppSettings } from '@/lib/types';
import { i18n } from '@/lib/i18n';

type Note = {
    id: number;
    text: string;
};

type StickyNotesProps = {
    settings: AppSettings;
}

export function StickyNotes({ settings }: StickyNotesProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const T = i18n[settings.language];

    useEffect(() => {
        try {
            const storedNotes = localStorage.getItem('freelance-flow-notes');
            setNotes(storedNotes ? JSON.parse(storedNotes) : []);
        } catch (error) {
            console.error("Failed to load notes from localStorage", error);
            setNotes([]);
        }
        setIsInitialLoad(false);
    }, []);

    useEffect(() => {
        if (!isInitialLoad) {
            localStorage.setItem('freelance-flow-notes', JSON.stringify(notes));
        }
    }, [notes, isInitialLoad]);

    const handleAddNote = () => {
        if (newNote.trim()) {
            setNotes([...notes, { id: Date.now(), text: newNote.trim() }]);
            setNewNote('');
            setIsDialogOpen(false);
        }
    };

    const handleDeleteNote = (id: number) => {
        setNotes(notes.filter(note => note.id !== id));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddNote();
        }
    }

    const noteStyle = {
        backgroundColor: settings.stickyNoteColor.background,
        color: settings.stickyNoteColor.foreground
    };

    return (
        <div className="p-2">
             <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                setIsDialogOpen(isOpen);
                if (!isOpen) setNewNote('');
            }}>
                <Card className="w-full max-w-xs mx-auto shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-normal text-muted-foreground">
                            {T.stickyNotes}
                        </CardTitle>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">{T.addNote}</span>
                            </Button>
                        </DialogTrigger>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-48">
                            <div className="space-y-2 pr-4">
                                {notes.length > 0 ? (
                                    notes.map((note) => (
                                        <div key={note.id} className="flex items-start justify-between gap-2 p-2 rounded-md" style={noteStyle}>
                                            <p className="text-sm break-words flex-1">{note.text}</p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0"
                                                style={{ color: 'inherit', opacity: 0.7 }}
                                                onClick={() => handleDeleteNote(note.id)}
                                                title="Delete note"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground text-center py-4">{T.noNotesYet}</p>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{T.addNewNote}</DialogTitle>
                        <DialogDescription>
                            {T.addNewNoteDesc}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder={T.notes}
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={5}
                            className="text-sm"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>{T.cancel}</Button>
                        <Button onClick={handleAddNote}>{T.addNote}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

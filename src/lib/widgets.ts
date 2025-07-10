
import { Calculator } from "@/components/calculator";
import { StickyNotes } from "@/components/sticky-notes";
import { BrainCircuit, StickyNote } from 'lucide-react';

export const WIDGETS = [
    {
        id: 'calculator',
        name: 'Simple Calculator',
        nameKey: 'simpleCalculator',
        description: 'A basic calculator for quick maths.',
        descriptionKey: 'calculatorDesc',
        icon: BrainCircuit,
        component: Calculator,
    },
    {
        id: 'sticky-notes',
        name: 'Sticky Notes',
        nameKey: 'stickyNotes',
        description: 'Jot down quick notes and reminders.',
        descriptionKey: 'stickyNotesDesc',
        icon: StickyNote,
        component: StickyNotes,
    },
] as const;

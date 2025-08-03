import { Calculator } from "@/app/dashboard/widgets/calculator";
import { StickyNotes } from "@/app/dashboard/widgets/sticky-notes";
import { PomodoroWidget } from "@/app/dashboard/widgets/pomodoro";
import { BrainCircuit, StickyNote, Timer } from 'lucide-react';
import { WidgetDefinition } from "./types";

export const WIDGETS: readonly WidgetDefinition[] = [
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
    {
        id: 'pomodoro',
        name: 'Pomodoro Timer',
        nameKey: 'pomodoroWidgetName',
        description: 'A timer to help you focus.',
        descriptionKey: 'pomodoroWidgetDesc',
        icon: Timer,
        component: PomodoroWidget,
        defaultSize: {
            colSpan: 2,
            rowSpan: 2,
        }
    },
];

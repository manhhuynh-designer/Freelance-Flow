import { Circle, CircleCheck, CircleDashed, CircleHelp, Archive } from 'lucide-react';
import type { Client, Category, Task, Quote, StatusInfo, QuoteTemplate, Collaborator, AppData } from './types';

export const initialClients: Client[] = [
  { id: 'client-1', name: 'Stark Industries', email: 'tony@stark.com', phone: '212-970-4133', taxInfo: 'STARK-US-123', type: 'brand', driveLink: ['https://drive.google.com/drive/folders/stark-industries'] },
  { id: 'client-2', name: 'Wayne Enterprises', email: 'bruce@wayne.com', phone: '212-555-0100', taxInfo: 'WAYNE-US-456', type: 'brand' },
  { id: 'client-3', name: 'Ogilvy', email: 'contact@ogilvy.com', taxInfo: 'OGILVY-GL-789', type: 'agency', driveLink: ['https://drive.google.com/drive/folders/ogilvy'] },
  { id: 'client-4', name: 'Acme Corporation', type: 'agency' },
];

export const initialCollaborators: Collaborator[] = [
  { id: 'collab-1', name: 'Peter Parker', email: 'peter.p@dailybugle.com', phone: '555-1234', facebookLink: 'https://facebook.com/peterparker', specialty: 'Photographer', notes: 'Prefers to be paid in cash.' },
  { id: 'collab-2', name: 'Diana Prince', email: 'diana@themyscira.net', phone: '555-5678', specialty: 'Historian' },
  { id: 'collab-3', name: 'Bruce Banner', email: 'bruce.b@culver.edu', specialty: 'Gamma Radiation Expert', notes: "Don't make him angry." },
];

export const categories: Category[] = [
  { id: 'cat-1', name: '2D' },
  { id: 'cat-2', name: '3D' },
];

export const STATUS_INFO: StatusInfo[] = [
    { id: 'todo', name: 'Quotes', icon: CircleDashed },
    { id: 'inprogress', name: 'In Progress', icon: Circle },
    { id: 'done', name: 'Done', icon: CircleCheck },
    { id: 'onhold', name: 'On Hold', icon: CircleHelp },
    { id: 'archived', name: 'Archived', icon: Archive },
]

export const quotes: Quote[] = [
  {
    id: 'quote-1',
    sections: [{
      id: 'section-1',
      name: 'Animation',
      items: [
        { id: 'item-1', description: 'Character Rigging', quantity: 1, unitPrice: 1500000 },
        { id: 'item-2', description: 'Walk Cycle Animation', quantity: 3, unitPrice: 500000 },
      ]
    }],
    total: 3000000,
  },
  {
    id: 'quote-2',
    sections: [{
      id: 'section-2',
      name: 'Modeling',
      items: [
        { id: 'item-3', description: 'Product Mockup', quantity: 5, unitPrice: 200000 },
      ]
    }],
    total: 1000000,
  },
  {
    id: 'quote-3',
    sections: [{
      id: 'section-3',
      name: 'Design',
      items: [
        { id: 'item-4', description: 'Splash Screen Design', quantity: 1, unitPrice: 800000 },
        { id: 'item-5', description: 'Icon Set (10 icons)', quantity: 2, unitPrice: 250000 },
      ]
    }],
    total: 1300000,
  },
  {
    id: 'quote-4',
    sections: [{
      id: 'section-4',
      name: 'Animation',
      items: [
        { id: 'item-6', description: 'Animated Logo Intro', quantity: 1, unitPrice: 1200000 },
      ]
    }],
    total: 1200000,
  },
];

export const tasks: Task[] = [
  {
    id: 'task-1',
    name: 'Iron Man Suit HUD Animation',
    description: 'Animate the Heads-Up Display for the new Mark V suit. Needs to be sleek and responsive.',
    startDate: new Date('2024-08-01'),
    deadline: new Date('2024-08-15'),
    clientId: 'client-1',
    categoryId: 'cat-1',
    status: 'inprogress',
    quoteId: 'quote-1',
    collaboratorIds: ['collab-1'],
    briefLink: ['https://example.com'],
    driveLink: ['https://example.com'],
  },
  {
    id: 'task-2',
    name: 'Batmobile 3D Model',
    description: 'Create a high-poly 3D model of the new Batmobile for cinematic shots.',
    startDate: new Date('2024-08-05'),
    deadline: new Date('2024-09-01'),
    clientId: 'client-2',
    categoryId: 'cat-2',
    status: 'inprogress',
    quoteId: 'quote-2',
    collaboratorIds: ['collab-2'],
    briefLink: ['https://example.com'],
    driveLink: ['https://example.com'],
  },
  {
    id: 'task-3',
    name: 'T-800 Endoskeleton Redesign',
    description: 'Conceptualize and design a more terrifying version of the T-800 endoskeleton.',
    startDate: new Date('2024-07-20'),
    deadline: new Date('2024-08-10'),
    clientId: 'client-3',
    categoryId: 'cat-1',
    status: 'done',
    quoteId: 'quote-3',
    briefLink: ['https://example.com'],
    driveLink: ['https://example.com'],
  },
  {
    id: 'task-4',
    name: 'Rocket-Powered Skates Logo',
    description: 'Design a fun and explosive logo for a new line of rocket-powered skates.',
    startDate: new Date('2024-08-12'),
    deadline: new Date('2024-08-20'),
    clientId: 'client-4',
    categoryId: 'cat-1',
    status: 'todo',
    quoteId: 'quote-4',
    briefLink: ['https://example.com'],
    driveLink: ['https://example.com'],
  },
];


export const initialQuoteTemplates: QuoteTemplate[] = [
  {
    id: 'template-1',
    name: 'Standard 2D Animation',
    columns: [
      { id: 'description', name: 'Item Description', type: 'text' },
      { id: 'quantity', name: 'Quantity', type: 'number' },
      { id: 'unitPrice', name: 'Unit Price (VND)', type: 'number' },
    ],
    sections: [
        { id: 'section_tpl_1_1', name: 'Pre-production', items: [
            { description: 'Storyboarding', quantity: 1, unitPrice: 500000 },
            { description: 'Character Design', quantity: 1, unitPrice: 700000 },
        ]},
        { id: 'section_tpl_1_2', name: 'Production', items: [
            { description: 'Animation (per second)', quantity: 10, unitPrice: 100000 },
            { description: 'Sound Design', quantity: 1, unitPrice: 300000 },
        ]}
    ],
  },
  {
    id: 'template-2',
    name: 'Basic 3D Model',
    columns: [
        { id: 'description', name: 'Item Description', type: 'text' },
        { id: 'quantity', name: 'Quantity', type: 'number' },
        { id: 'unitPrice', name: 'Unit Price (VND)', type: 'number' },
        { id: 'custom_1688888888888', name: 'Est. Hours', type: 'number', calculation: { type: 'sum' } },
    ],
    sections: [{
        id: 'section_tpl_2_1',
        name: '3D Services',
        items: [
          { description: 'Modeling', quantity: 1, unitPrice: 1000000, customFields: { custom_1688888888888: 10 } },
          { description: 'Texturing & Shading', quantity: 1, unitPrice: 800000, customFields: { custom_1688888888888: 8 } },
          { description: 'Rigging', quantity: 1, unitPrice: 600000, customFields: { custom_1688888888888: 6 } },
        ]
    }],
  }
];

export const initialAppData: AppData = {
    tasks,
    quotes,
    collaboratorQuotes: [],
    clients: initialClients,
    collaborators: initialCollaborators,
    quoteTemplates: initialQuoteTemplates,
    categories: categories,
    appSettings: {
        theme: {
            primary: "221 83% 53%",
            accent: "221 83% 53%",
        },
        statusColors: {
            todo: '#a855f7',
            inprogress: '#eab308',
            done: '#22c55e',
            onhold: '#f97316',
            archived: '#64748b',
        },
        stickyNoteColor: { background: '#fef9c3', foreground: '#713f12' },
        trashAutoDeleteDays: 30,
        language: 'en',
        currency: 'VND',
        preferredModelProvider: 'google',
        googleApiKey: '',
        openaiApiKey: '',
        googleModel: 'gemini-1.5-flash',
        openaiModel: 'gpt-4o-mini',
        dashboardColumns: [
            { id: 'name', label: 'Task', visible: true },
            { id: 'client', label: 'Client', visible: true },
            { id: 'category', label: 'Category', visible: true },
            { id: 'collaborator', label: 'Collaborator', visible: true },
            { id: 'deadline', label: 'Deadline', visible: true },
            { id: 'status', label: 'Status', visible: true },
            { id: 'priceQuote', label: 'Quote', visible: true },
        ],
        statusSettings: [],
        widgets: []
    }
};

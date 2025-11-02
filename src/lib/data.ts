import { Circle, CircleCheck, CircleDashed, CircleHelp, Archive } from 'lucide-react';
import type { Client, Category, Task, Quote, StatusInfo, QuoteTemplate, Collaborator, AppData, Project, PertDiagram } from './types'; // Import Project and PertDiagram

export const initialClients: Client[] = [
  { id: 'client-1', name: 'Stark Industries', email: ['tony@stark.com'], phone: ['212-970-4133'], taxInfo: ['STARK-US-123'], type: 'brand', driveLink: ['https://drive.google.com/drive/folders/stark-industries'] },
  { id: 'client-2', name: 'Wayne Enterprises', email: ['bruce@wayne.com'], phone: ['555-555-0100'], taxInfo: ['WAYNE-US-456'], type: 'brand' },
  { id: 'client-3', name: 'Ogilvy', email: ['contact@ogilvy.com'], taxInfo: ['OGILVY-GL-789'], type: 'agency', driveLink: ['https://drive.google.com/drive/folders/ogilvy'] },
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
    status: 'sent'
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
    status: 'accepted'
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
    status: 'paid',
    amountPaid: 650000, // 50% paid
    payments: [
      {
        id: 'payment-1',
        status: 'paid',
        date: '2024-08-10',
        method: 'bank_transfer',
        notes: 'First payment - 50%',
        amountType: 'percent',
        percent: 50
      }
    ]
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
    status: 'draft',
    payments: [
      {
        id: 'payment-2',
        status: 'scheduled',
        date: '2024-08-25',
        method: 'bank_transfer',
        notes: 'Future payment - full amount',
        amountType: 'percent',
        percent: 100
      }
    ]
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
    collaboratorQuotes: [],
    briefLink: ['https://example.com'],
    driveLink: ['https://example.com'],
    createdAt: new Date('2024-07-20').toISOString(),
    deletedAt: undefined,
    eisenhowerQuadrant: undefined,
    kanbanOrder: undefined,
    endDate: undefined,
    duration: undefined,
    progress: undefined,
    dependencies: [],
    projectId: 'stark-iron-man-project', // Added for PERT testing
    // PERT estimates for testing
    optimisticTime: 8,
    mostLikelyTime: 12,
    pessimisticTime: 18,
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
    collaboratorQuotes: [],
    briefLink: ['https://example.com'],
    driveLink: ['https://example.com'],
    createdAt: new Date('2024-08-01').toISOString(),
    deletedAt: undefined,
    eisenhowerQuadrant: undefined,
    kanbanOrder: undefined,
    endDate: undefined,
    duration: undefined,
    progress: undefined,
    // Add dependencies for task-2
    dependencies: ['task-1'],
    projectId: 'stark-iron-man-project', // Using the same project ID as task-1 for the example
    // PERT estimates for testing
    optimisticTime: 15,
    mostLikelyTime: 20,
    pessimisticTime: 30,
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
    collaboratorIds: [],
    collaboratorQuotes: [],
    briefLink: ['https://example.com'],
    driveLink: ['https://example.com'],
    createdAt: new Date('2024-07-10').toISOString(),
    deletedAt: undefined,
    eisenhowerQuadrant: undefined,
    kanbanOrder: undefined,
    endDate: undefined,
    duration: undefined,
    progress: undefined,
    dependencies: [],
    projectId: 'stark-iron-man-project', // Added for PERT testing - same project as task-1
    // PERT estimates for testing
    optimisticTime: 5,
    mostLikelyTime: 8,
    pessimisticTime: 12,
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
    collaboratorIds: [],
    collaboratorQuotes: [],
    briefLink: ['https://example.com'],
    driveLink: ['https://example.com'],
    createdAt: new Date('2024-08-05').toISOString(),
    deletedAt: undefined,
    eisenhowerQuadrant: undefined,
    kanbanOrder: undefined,
    endDate: undefined,
    duration: undefined,
    progress: undefined,
    // Add dependency to create an edge for testing style
    dependencies: ['task-3'],
    projectId: 'acme-skates-project', // New project ID
  },
  {
    id: 'task-5',
    name: 'Final VFX Review',
    description: 'Review final visual effects for Batmobile chase sequence.',
    startDate: new Date('2024-09-02'),
    deadline: new Date('2024-09-05'),
    clientId: 'client-2',
    categoryId: 'cat-2',
    status: 'todo',
    quoteId: 'quote-2',
    collaboratorIds: ['collab-2'],
    dependencies: ['task-2'], // Dependent on Batmobile 3D Model
    projectId: 'stark-iron-man-project', // Using the same project ID as task-1 for the example
    optimisticTime: 3,
    mostLikelyTime: 4,
    pessimisticTime: 6,
  }
];


// Define initial projects
export const initialProjects: Project[] = [
  {
    id: 'stark-iron-man-project',
    name: 'Stark Iron Man HUD Project',
    description: 'Development of HUD for new Iron Man suits and associated VFX.',
    startDate: new Date('2024-07-25'),
    endDate: new Date('2024-09-05'),
    status: 'active',
    clientId: 'client-1',
    tasks: ['task-1', 'task-2', 'task-3', 'task-5'], // Link relevant tasks
    pertDiagram: { // Example empty PERT diagram for this project
      id: 'pert-stark-1',
      projectId: 'stark-iron-man-project',
      nodes: [],
      edges: [
        { id: 'edge-task-1-task-2', source: 'task-1', target: 'task-2', type: 'dependency', data: { dependencyType: 'FS', duration: 1 } },
        { id: 'edge-task-3-task-5', source: 'task-3', target: 'task-5', type: 'dependency', data: { dependencyType: 'SF', duration: 1 } }, // SF dependency example
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'acme-skates-project',
    name: 'Acme Rocket Skates Launch',
    description: 'Branding and design for a new product launch from Acme Corporation.',
    startDate: new Date('2024-08-10'),
    endDate: new Date('2024-08-25'),
    status: 'planning',
    clientId: 'client-4',
    tasks: ['task-4'], // Link relevant tasks
    pertDiagram: { // Example empty PERT diagram for this project
        id: 'pert-acme-1',
        projectId: 'acme-skates-project',
        nodes: [],
        edges: [
            { id: 'edge-task-4-task-5-example', source: 'task-4', target: 'task-5', type: 'dependency', data: { dependencyType: 'FF', duration: 1 } }, // FF dependency example
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }
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
    events: [],
    notes: [],
    workSessions: [], // Initialize empty work sessions
    expenses: [],
    fixedCosts: [],
    quotes,
    collaboratorQuotes: [],
    clients: initialClients,
    collaborators: initialCollaborators,
    quoteTemplates: initialQuoteTemplates,
    categories: categories,
    projects: initialProjects, // Use the new initialProjects
    pertDiagrams: [], // Initialize empty PERT diagrams
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
        googleModel: 'gemini-1.5-flash',
        dashboardColumns: [
            { id: 'name', label: 'Task', visible: true },
            { id: 'client', label: 'Client', visible: true },
            { id: 'category', label: 'Category', visible: true },
            { id: 'collaborator', label: 'Collaborator', visible: true },
            { id: 'deadline', label: 'Deadline', visible: true },
            { id: 'status', label: 'Status', visible: true },
            { id: 'priceQuote', label: 'Quote', visible: true },
        ],
        statusSettings: [
            { id: 'todo', label: 'To Do', subStatuses: [] },
            { id: 'inprogress', label: 'In Progress', subStatuses: [] },
            { id: 'done', label: 'Done', subStatuses: [] },
            { id: 'onhold', label: 'On Hold', subStatuses: [] },
            { id: 'archived', label: 'Archived', subStatuses: [] },
        ],
        widgets: []
    }
};

// A true "empty" dataset used when user requests a full clean (no sample/demo data retained)
// Keep settings structure but allow user to start fresh. We clone settings to avoid accidental mutation.
export const emptyAppData: AppData = {
  tasks: [],
  events: [],
  notes: [],
  workSessions: [],
  expenses: [],
  fixedCosts: [],
  quotes: [],
  collaboratorQuotes: [],
  clients: [],
  collaborators: [],
  quoteTemplates: [],
  categories: [],
  projects: [],
  appSettings: { ...(initialAppData.appSettings ? JSON.parse(JSON.stringify(initialAppData.appSettings)) : {}) }
};

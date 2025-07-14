

export type DashboardColumn = {
  id: 'name' | 'client' | 'category' | 'deadline' | 'status' | 'priceQuote';
  label: string;
  visible: boolean;
};

export type ColumnCalculationType = 'none' | 'sum' | 'average' | 'min' | 'max' | 'custom';
export type QuoteColumn = {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date';
  dateFormat?: 'single' | 'range'; // cho date columns
  calculation?: {
    type: ColumnCalculationType;
    formula?: string; // cho custom
  };
  rowFormula?: string; // công thức cho từng ô (per-row calculation)
};

export type QuoteItem = {
  id: string;
  description: string;
  unitPrice: number;
  customFields?: Record<string, any>;
};

export type QuoteSection = {
  id: string;
  name: string;
  items: QuoteItem[];
};

export type Quote = {
  id: string;
  sections: QuoteSection[];
  total: number;
  columns?: QuoteColumn[];
};

export type QuoteTemplate = {
  id: string;
  name: string;
  sections: { id: string; name: string; items: Omit<QuoteItem, 'id'>[] }[];
  columns?: QuoteColumn[];
};

export type Task = {
  id: string;
  name: string;
  description: string;
  startDate: Date | string;
  deadline: Date | string;
  clientId: string;
  collaboratorId?: string;
  categoryId: string;
  status: 'todo' | 'inprogress' | 'done' | 'onhold' | 'archived';
  subStatusId?: string;
  quoteId: string;
  collaboratorQuoteId?: string;
  briefLink?: string[];
  driveLink?: string[];
  deletedAt?: string;
};

export type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  taxInfo?: string;
  type?: 'agency' | 'brand';
  driveLink?: string[];
};

export type Collaborator = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  facebookLink?: string;
  specialty?: string;
  notes?: string;
};

export type Category = {
  id: string;
  name: string;
};

export type StatusInfo = {
  id: 'todo' | 'inprogress' | 'done' | 'onhold' | 'archived';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type SubStatus = {
  id: string;
  label: string;
};

export type StatusSetting = {
  id: 'todo' | 'inprogress' | 'done' | 'onhold' | 'archived';
  label: string;
  subStatuses: SubStatus[];
};

export type WidgetSetting = {
    id: 'calculator' | 'sticky-notes';
    enabled: boolean;
    showInSidebar: boolean;
    colSpan: number;
    rowSpan: number;
};


export type ThemeSettings = {
  primary: string;
  accent: string;
};

export type StatusColors = {
    todo: string;
    inprogress: string;
    done: string;
    onhold: string;
    archived: string;
};

export type AppSettings = {
  theme: ThemeSettings;
  statusColors: StatusColors;
  stickyNoteColor: { background: string, foreground: string };
  trashAutoDeleteDays: number;
  language: 'en' | 'vi';
  currency: 'VND' | 'USD';
  statusSettings: StatusSetting[];
  preferredModelProvider: 'google' | 'openai';
  googleApiKey?: string;
  openaiApiKey?: string;
  googleModel?: string;
  openaiModel?: string;
  dashboardColumns?: DashboardColumn[];
  widgets: WidgetSetting[];
};

export type AppData = {
  tasks: Task[];
  quotes: Quote[];
  collaboratorQuotes: Quote[];
  clients: Client[];
  collaborators: Collaborator[];
  quoteTemplates: QuoteTemplate[];
  categories: Category[];
  appSettings: AppSettings;
};

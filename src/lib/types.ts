export type DashboardColumn = {
  id: 'name' | 'client' | 'category' | 'collaborator' | 'deadline' | 'status' | 'priceQuote';
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
  quantity?: number;
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

export type CollaboratorQuote = {
  id: string;
  collaboratorId: string;
  sections: QuoteSection[];
  total: number;
  columns?: QuoteColumn[];
};

export type Task = {
  id: string;
  name: string;
  description: string;
  startDate: Date | string;
  deadline: Date | string;
  clientId: string;
  collaboratorIds?: string[]; // Changed to array to support multiple collaborators
  categoryId: string;
  status: 'todo' | 'inprogress' | 'done' | 'onhold' | 'archived';
  subStatusId?: string;
  quoteId: string;
  collaboratorQuotes?: { collaboratorId: string; quoteId: string }[]; // Multiple collaborator quotes
  briefLink?: string[];
  driveLink?: string[];
  deletedAt?: string;
  eisenhowerQuadrant?: 'do' | 'decide' | 'delegate' | 'delete';
kanbanOrder?: number;
endDate?: string; // ISO string, ngày kết thúc của nhiệm vụ
  duration?: number; // số ngày, thời lượng của nhiệm vụ
  progress?: number; // 0-100, tiến độ hoàn thành nhiệm vụ
  dependencies?: string[]; // mảng các task ID mà nhiệm vụ này phụ thuộc vào
createdAt?: string; // Ngày thêm task
};

export type Client = {
  id: string;
  name: string;
  email?: string[];
  phone?: string[];
  taxInfo?: string[];
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
  eisenhowerMaxTasksPerQuadrant?: number; // New setting for Eisenhower matrix
kanbanColumnOrder?: string[];
  kanbanColumnVisibility?: Record<string, boolean>;
  kanbanSubStatusMode?: 'grouped' | 'separate';
  eisenhowerColorScheme?: 'colorScheme1' | 'colorScheme2' | 'colorScheme3'; // Color scheme for Eisenhower matrix
};

export type FilterPreset = {
  id: string;
  name: string;
  filters: {
    status?: string;
    category?: string;
    collaborator?: string;
    client?: string;
    dateRange?: any; // DateRange type
  };
  isDefault?: boolean;
  createdAt: string;
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
  filterPresets?: FilterPreset[]; // Add filter presets to export data
};

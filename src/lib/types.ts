import React from 'react';
import { WIDGETS } from './widgets';
import type { WorkSession } from './helpers/time-analyzer';

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
  // Bổ sung theo Spec
  status: 'draft' | 'sent' | 'accepted' | 'invoiced' | 'paid' | 'rejected';
  paidDate?: string;
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
  // Bổ sung theo Spec
  paymentStatus: 'pending' | 'paid';
  paidDate?: string;
};

// Type mới cho chi phí chung
export type GeneralExpense = { 
  id: string; 
  name: string; 
  amount: number; 
  date: string; // ISO String
  category: 'marketing' | 'software' | 'office' | 'other';
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

export type AppEvent = {
  id: string;
  name: string;
  startTime: Date | string;
  endTime: Date | string;
  taskIds?: string[];
  links?: string[];
  notes?: string;
  color?: string;
  icon?: string;
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

export type Note = {
    id: number;
    text: string;
};

export type WidgetDefinition = {
    id: string;
    name: string;
    nameKey: string;
    description: string;
    descriptionKey: string;
    icon: React.FC<any>;
    component: React.FC<any>;
    defaultSize?: {
        colSpan: number;
        rowSpan: number;
    };
};

export type WidgetId = typeof WIDGETS[number]['id'];

export type WidgetSetting = {
    id: WidgetId;
    enabled: boolean;
    showInSidebar: boolean;
    colSpan: number;
    rowSpan: number;
    x?: number;
    y?: number;
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

export type FilterSettings = {
  selectedStatuses: string[];
  selectedCategory: string;
  selectedCollaborator: string;
  selectedClient: string;
  sortFilter: string;
  isExpanded: boolean;
  dateRange?: {
    from?: string;
    to?: string;
  };
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
  aiFeedback?: any[]; // AI feedback collection
  kanbanColumnOrder?: string[];
  kanbanColumnVisibility?: Record<string, boolean>;
  kanbanSubStatusMode?: 'grouped' | 'separate';
  eisenhowerColorScheme?: 'colorScheme1' | 'colorScheme2' | 'colorScheme3'; // Color scheme for Eisenhower matrix
  filterSettings?: FilterSettings; // Add filter settings to app settings
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
  events: AppEvent[];
  quotes: Quote[];
  collaboratorQuotes: CollaboratorQuote[]; // Sửa lại từ Quote[] để đúng ngữ nghĩa hơn
  clients: Client[];
  collaborators: Collaborator[];
  quoteTemplates: QuoteTemplate[];
  categories: Category[];
  notes: Note[];
  workSessions?: WorkSession[]; // Add work sessions support
  appSettings: AppSettings;
  filterPresets?: FilterPreset[]; // Add filter presets to export data
  expenses?: GeneralExpense[]; // <-- Bổ sung theo Spec
};

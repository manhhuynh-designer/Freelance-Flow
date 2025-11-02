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

// Track each payment entry on a quote
export type PaymentEntry = {
  id: string;
  status: 'paid' | 'scheduled'; // chỉ 2 trạng thái theo yêu cầu
  date?: string; // ISO date for paid/scheduled
  method?: 'cash' | 'bank_transfer' | 'credit_card' | 'paypal' | 'other';
  notes?: string;
  amount?: number; // số tiền của lần thanh toán này (nếu nhập theo tiền)
  amountType?: 'absolute' | 'percent'; // loại nhập liệu
  percent?: number; // nếu nhập theo %, lưu phần trăm ở đây
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
  // Optional formula for summary tab grand total
  grandTotalFormula?: string;
  // Bổ sung theo Spec
  status: 'draft' | 'sent' | 'accepted' | 'invoiced' | 'paid' | 'rejected';
  paidDate?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit_card' | 'paypal' | 'other';
  paymentNotes?: string;
  amountPaid?: number; // Tổng tiền đã nhận cho task (đơn vị theo currency)
  payments?: PaymentEntry[]; // Danh sách các lần thanh toán
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
  // Optional formula for collaborator quote summary (if needed)
  grandTotalFormula?: string;
  // Bổ sung theo Spec
  paymentStatus: 'pending' | 'paid';
  paidDate?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit_card' | 'paypal' | 'other';
  paymentNotes?: string;
  amountPaid?: number; // Amount actually paid (can be partial)
};

// Type mới cho chi phí chung
export type GeneralExpense = { 
  id: string; 
  name: string; 
  amount: number; 
  date: string; // ISO String
  category: 'marketing' | 'software' | 'office' | 'other';
};

// Type cho chi phí cố định
export type FixedCost = {
  id: string;
  name: string;
  amount: number;
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
  startDate: string; // ISO String - ngày bắt đầu áp dụng
  endDate?: string; // ISO String - ngày kết thúc (optional, nếu không có thì áp dụng vô thời hạn)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  milestones?: Milestone[]; // Dữ liệu các mốc thời gian của task
  projectId?: string; // liên kết project, có thể để trống
  
  // PERT-specific fields
  optimisticTime?: number;       // Optimistic time estimate (days)
  mostLikelyTime?: number;       // Most likely time estimate (days)  
  pessimisticTime?: number;      // Pessimistic time estimate (days)
  expectedTime?: number;         // Calculated expected time using PERT formula
  earlyStart?: number;           // Early start time
  earlyFinish?: number;          // Early finish time
  lateStart?: number;            // Late start time
  lateFinish?: number;          // Late finish time
  slack?: number;                // Total slack time
  isCritical?: boolean;          // Is this task on critical path?
  
  // Node positioning for PERT diagram
  pertPosition?: {
    x: number;
    y: number;
  };
  
  // AI vector embedding for semantic search
  vector?: number[];
};
export type Milestone = {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  color?: string; // Optional color for the milestone bar
  content?: string; // Additional details for the milestone
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

// Project entity
export type Project = {
  id: string;
  name: string;
  description?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status: 'planning' | 'active' | 'completed' | 'onhold' | 'archived';
  clientId?: string;
  links?: string[]; // array of URLs, optional
  tasks: string[]; // array of task IDs
  
  // PERT-specific fields
  pertDiagram?: PertDiagram;
  projectDuration?: number;      // Total project duration
  criticalPath?: string[];       // Critical path task IDs
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
  selectedProject: string;
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

// NEW: For saving AI analysis results
export type AIAnalysis = {
  id: string;
  userId: string; // NEW: Associate with user
  timestamp: string; // ISO string
  analysis: any; // The full analysis object from getAIBusinessAnalysis
};

// NEW: For saving Productivity AI analysis results
export type AIProductivityAnalysis = {
  id: string;
  userId: string; // NEW: Associate with user
  timestamp: string; // ISO string
  insights: any[]; // The structured insights
};

// PERT-specific types
export type PertNode = {
  id: string;
  type: 'event' | 'task';
  position: { x: number; y: number };
  
  // Event properties
  name?: string;
  eventNumber?: number;        // For milestone nodes
  isMilestone?: boolean;
  targetDate?: string;         // ISO date string
  
  // Task reference
  taskId?: string;             // Reference to Task
  
  // PERT calculation results
  earlyTime?: number;
  lateTime?: number;
  slack?: number;
  
  // ReactFlow data (for compatibility)
  data?: {
    label: string;
    [key: string]: any;
  };
};

export type PertEdge = {
  id: string;
  source: string;
  target: string;
  type: 'dependency';
  data: {
    duration?: number;
    taskId?: string;
    label?: string;
    dependencyType?: 'FS' | 'SS' | 'FF' | 'SF'; // Thêm dependencyType vào data của edge
  };
};

export type PertDiagram = {
  id: string;
  projectId: string;
  nodes: PertNode[];
  edges: PertEdge[];
  criticalPath?: string[];       // Array of node IDs on critical path
  createdAt: string;
  updatedAt: string;
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
  fixedCosts?: FixedCost[]; // Chi phí cố định
  aiAnalyses?: AIAnalysis[]; // NEW
  aiProductivityAnalyses?: AIProductivityAnalysis[]; // NEW
  projects?: Project[]; // Danh sách project
  pertDiagrams?: PertDiagram[]; // PERT diagrams storage
};

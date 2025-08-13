// AI Types for the application

export interface AskAboutTasksInput {
  userInput: string;
  history?: Array<{
    role: 'user' | 'model';
    content: { text: string }[];
  }>;
  tasks: any[];
  clients: any[];
  collaborators: any[];
  quoteTemplates: any[];
  quotes?: any[]; // Added quotes for financial data
  language: 'en' | 'vi';
  modelName: string;
  apiKey?: string;
  contextMemory?: any[]; // Previous relevant conversations
}

export interface InteractiveElement {
  type: 'button' | 'copyable' | 'openDialog' | 'link' | 'taskPreview';
  id?: string;
  label: string;
  action?: string;
  data?: any;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  icon?: string;
}

export interface AskAboutTasksOutput {
  text: string;
  action: any;
  interactiveElements?: InteractiveElement[];
  metadata?: {
    responseType: 'info' | 'action' | 'error' | 'success';
    confidence?: number;
    processingTime?: number;
  };
}

export interface SuggestQuoteOutput {
  // Define quote output structure here
  [key: string]: any;
}

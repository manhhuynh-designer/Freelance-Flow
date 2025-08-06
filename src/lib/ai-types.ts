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
  language: 'en' | 'vi';
  modelName: string;
  apiKey?: string;
}

export interface AskAboutTasksOutput {
  text: string;
  action: any;
}

export interface SuggestQuoteOutput {
  // Define quote output structure here
  [key: string]: any;
}

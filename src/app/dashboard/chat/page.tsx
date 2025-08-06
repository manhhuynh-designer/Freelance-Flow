"use client";

import { useState, useRef, useEffect, useTransition, useMemo, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { i18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, User, PlusCircle, Trash2, History, PanelRightClose } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Card, CardContent } from '@/components/ui/card';
import { askAboutTasksAction } from '@/app/actions/ai-actions';
import type { AskAboutTasksOutput } from '@/lib/ai-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Task } from '@/lib/types';
import { useDashboard } from '@/contexts/dashboard-context';

// Types
type Message = {
  role: 'user' | 'model';
  content: { text: string }[];
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
};

// LocalStorage Keys
const CONVERSATIONS_KEY = 'freelance-flow-conversations';
const OLD_CHAT_HISTORY_KEY = 'freelance-flow-chat-history';

function ChatView({ isQuickChat = false }: { isQuickChat?: boolean }) {
  const dashboardContext = useDashboard();
  const { toast } = useToast();
  
  // Early return if context not available
  if (!dashboardContext) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Loading AI Chat...</p>
        </div>
      </div>
    );
  }

  const { 
    appData,
    handleTaskStatusChange, handleAiCreateTask, handleAiEditTask,
    handleDeleteTask,
    handleAddClientAndSelect,
    handleEditClient,
    handleDeleteClient,
    handleAddCollaborator,
    handleEditCollaborator,
    handleDeleteCollaborator,
    handleAddCategory,
    handleEditCategory,
    handleDeleteCategory
  } = dashboardContext;

  // Extract data from appData
  const tasks = appData?.tasks || [];
  const clients = appData?.clients || [];
  const collaborators = appData?.collaborators || [];
  const quoteTemplates = appData?.quoteTemplates || [];
  const appSettings = appData?.appSettings;
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load, migrate, and sort conversations from localStorage
  useEffect(() => {
    try {
      const storedConversations = localStorage.getItem(CONVERSATIONS_KEY);
      if (storedConversations) {
        const parsed = JSON.parse(storedConversations) as Conversation[];
        const sorted = parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setConversations(sorted);
        if (sorted.length > 0) {
          setActiveConversationId(sorted[0].id);
        }
      } else {
        const storedOldHistory = localStorage.getItem(OLD_CHAT_HISTORY_KEY);
        if (storedOldHistory) {
          const parsedOldHistory = JSON.parse(storedOldHistory);
          // Migration logic: convert old 'parts' format to 'content' if it exists
          const migratedHistory = parsedOldHistory.map((msg: any) => {
            if (msg.parts && !msg.content) {
              return { role: msg.role, content: [{ text: msg.parts[0].text }] };
            }
            if (Array.isArray(msg.content) && msg.content.length > 0 && msg.content[0].parts) {
              return { role: msg.role, content: [{ text: msg.content[0].parts[0].text }] };
            }
            return msg;
          }).filter((msg: Message) => msg.content && Array.isArray(msg.content) && msg.content.length > 0);

          if (Array.isArray(migratedHistory) && migratedHistory.length > 0) {
            const firstMessage = migratedHistory[0]?.content?.[0]?.text || 'Old Chat';
            const newConversation: Conversation = {
              id: `convo-${Date.now()}`,
              title: firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : ''),
              messages: migratedHistory,
              createdAt: new Date().toISOString(),
            };
            setConversations([newConversation]);
            setActiveConversationId(newConversation.id);
            localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([newConversation]));
            localStorage.removeItem(OLD_CHAT_HISTORY_KEY);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load or migrate chat history from localStorage", error);
    }
    setIsInitialLoad(false);
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (!isInitialLoad) {
      try {
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
      } catch (error) {
        console.error("Failed to save conversations to localStorage", error);
      }
    }
  }, [conversations, isInitialLoad]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [conversations, activeConversationId]);

  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    const activeConvo = conversations.find(c => c.id === activeConversationId);
    return activeConvo ? activeConvo.messages : [];
  }, [conversations, activeConversationId]);

  // Fallback for when essential data is not yet available
  if (!appSettings) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Loading AI Chat...</p>
        </div>
      </div>
    ); 
  }

  const T = i18n[appSettings.language];
  const sortedConversations = useMemo(() => [...conversations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [conversations]);

  const handleNewChat = () => {
    const newConvo: Conversation = {
      id: `convo-${Date.now()}`,
      title: T.newChat,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setConversations(prev => [newConvo, ...prev]);
    setActiveConversationId(newConvo.id);
  };
  
  const handleDeleteConversation = (convoIdToDelete: string) => {
    const updatedConversations = conversations.filter(c => c.id !== convoIdToDelete);
    setConversations(updatedConversations);
    
    if (activeConversationId === convoIdToDelete) {
        const sortedRemaining = updatedConversations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActiveConversationId(sortedRemaining.length > 0 ? sortedRemaining[0].id : null);
    }
  };

  const handleAction = (action: AskAboutTasksOutput['action']) => {
    if (!action || !action.payload) return;
  
    switch (action.type) {
      case 'updateTaskStatus':
        if (handleTaskStatusChange) handleTaskStatusChange(action.payload.taskId, action.payload.status);
        break;
      case 'createTask':
        if (handleAiCreateTask) handleAiCreateTask(action.payload as any);
        break;
      case 'editTask':
        if (handleAiEditTask) handleAiEditTask(action.payload as any);
        break;
      case 'deleteTask':
        if (handleDeleteTask) handleDeleteTask(action.payload.taskId);
        break;
      case 'createClient':
        if (handleAddClientAndSelect) handleAddClientAndSelect(action.payload);
        break;
      case 'editClient':
        if (handleEditClient) handleEditClient(action.payload.clientId, action.payload.updates);
        break;
      case 'deleteClient':
        if (handleDeleteClient) handleDeleteClient(action.payload.clientId);
        break;
      case 'createCollaborator':
        if (handleAddCollaborator) handleAddCollaborator(action.payload);
        break;
      case 'editCollaborator':
        if (handleEditCollaborator) handleEditCollaborator(action.payload.collaboratorId, action.payload.updates);
        break;
      case 'deleteCollaborator':
        if (handleDeleteCollaborator) handleDeleteCollaborator(action.payload.collaboratorId);
        break;
      case 'createCategory':
        if (handleAddCategory) handleAddCategory(action.payload);
        break;
      case 'editCategory':
        if (handleEditCategory) handleEditCategory(action.payload.categoryId, action.payload.updates);
        break;
      case 'deleteCategory':
        if (handleDeleteCategory) handleDeleteCategory(action.payload.categoryId);
        break;
      default:
        console.warn('Unknown AI action:', (action as any).type);
    }
  };

  const handleSendMessage = async () => {
    if (isPending || !input.trim() || !activeConversationId) {
      if (!activeConversationId && input.trim()) {
        handleNewChat();
        // A bit of a hack to wait for state update, then send.
        setTimeout(() => document.getElementById('send-message-button')?.click(), 100);
      }
      return;
    }
    
    const userInput = input;
    setInput('');

    const userMessage: Message = { role: 'user', content: [{ text: userInput }] };
    
    let historyForAI: Message[] = [];
    setConversations(prev =>
        prev.map(c => {
            if (c.id === activeConversationId) {
                const isFirstMessage = c.messages.length === 0;
                historyForAI = [...c.messages]; 
                return {
                    ...c,
                    title: isFirstMessage ? userInput.substring(0, 40) + (userInput.length > 40 ? '...' : '') : c.title,
                    messages: [...c.messages, userMessage],
                };
            }
            return c;
        })
    );
    
    startTransition(async () => {
      try {
        const { googleApiKey, googleModel } = appSettings;
        const apiKey = googleApiKey;
        const modelName = googleModel || 'gemini-1.5-flash';

        const activeTasks = tasks.filter((t: any) => !t.deletedAt);
        
        const response = await askAboutTasksAction({
          userInput: userInput,
          history: historyForAI,
          tasks: activeTasks,
          clients,
          collaborators,
          quoteTemplates,
          language: appSettings.language,
          apiKey,
          modelName,
        });

        if (!response) {
          toast({
            variant: "destructive",
            title: T.aiResponseError,
            description: "The AI did not return a response. Please check your configuration.",
          });
          const modelMessage: Message = { role: 'model', content: [{ text: "I'm sorry, I was unable to process your request." }] };
          setConversations(prev =>
            prev.map(c => {
                if (c.id === activeConversationId) {
                    return { ...c, messages: [...c.messages.slice(0, -1), userMessage, modelMessage] };
                }
                return c;
            })
          );
          return;
        }

        const responseText = response.text || "I'm sorry, I couldn't generate a response.";
        const modelMessage: Message = { role: 'model', content: [{ text: responseText }] };
        
        if (response.action) {
          handleAction(response.action);
        }
        
        setConversations(prev =>
            prev.map(c => {
                if (c.id === activeConversationId) {
                    return { ...c, messages: [...c.messages, modelMessage] };
                }
                return c;
            })
        );

      } catch (error: any) {
        console.error("AI chat error:", error);
        toast({
            variant: "destructive",
            title: T.aiResponseError,
            description: error.message || 'An unknown error occurred.'
        });
        const modelMessage: Message = { role: 'model', content: [{ text: `An error occurred: ${error.message}` }] };
        setConversations(prev =>
            prev.map(c => {
                if (c.id === activeConversationId) {
                    // Add error message to chat and remove the user message that caused it
                    return { ...c, messages: [...c.messages.slice(0, -1), userMessage, modelMessage] };
                }
                return c;
            })
        );
      }
    });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
  }

  return (
    <div className="flex h-full">
       {/* Main Chat Area */}
       <div className="flex-1 flex flex-col min-h-0">
           <header className="flex items-center justify-between p-2 border-b shrink-0">
               <Button variant="outline" size="sm" onClick={handleNewChat}>
                   <PlusCircle className="mr-2 h-4 w-4" />
                   {T.newChat}
               </Button>
               <h2 className="text-sm font-semibold truncate px-2">{T.chatWithAI}</h2>
               {!isQuickChat && (
                <Button variant="ghost" size="icon" onClick={() => setIsHistoryPanelOpen(p => !p)}>
                    {isHistoryPanelOpen ? <PanelRightClose className="h-5 w-5" /> : <History className="h-5 w-5" />}
                    <span className="sr-only">Toggle history panel</span>
                </Button>
               )}
           </header>
           {activeConversationId ? (
            <>
                <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
                    <div className="p-4 space-y-4">
                        {activeMessages.map((msg, index) => (
                            <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'model' && (
                                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                                        <Bot className="h-5 w-5" />
                                    </div>
                                )}
                                <div
                                    className={cn("max-w-xl rounded-lg px-4 py-3 whitespace-pre-wrap break-anywhere", 
                                        msg.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-card border'
                                    )}
                                >
                                    {msg.role === 'model' ? (
                                        <MarkdownRenderer content={msg.content?.[0]?.text || ''} />
                                    ) : (
                                        msg.content?.[0]?.text
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="bg-muted text-muted-foreground rounded-full p-2">
                                        <User className="h-5 w-5" />
                                    </div>
                                )}
                            </div>
                        ))}
                         {isPending && (
                            <div className="flex items-start gap-3 justify-start">
                                <div className="bg-primary text-primary-foreground rounded-full p-2 animate-pulse">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="max-w-xl rounded-lg px-4 py-3 bg-card border animate-pulse">
                                    <div className="h-3 w-12 bg-muted-foreground/30 rounded-full"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="shrink-0 border-t p-4">
                    <div className="relative">
                    <Textarea
                        placeholder={T.chatPlaceholder}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        className="pr-12"
                        disabled={isPending}
                    />
                    <Button
                        id="send-message-button"
                        type="button"
                        size="icon"
                        className="absolute right-2.5 bottom-2.5 h-8 w-8"
                        onClick={handleSendMessage}
                        disabled={isPending || !input.trim()}
                    >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">{T.sendMessage}</span>
                    </Button>
                    </div>
                </div>
            </>
           ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <Card className="p-6 text-center">
                        <CardContent className="p-0">
                            <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Select a chat or start a new one to begin.</p>
                        </CardContent>
                    </Card>
                     <div className="w-full max-w-md mt-4">
                        <div className="relative">
                            <Textarea
                                placeholder={T.chatPlaceholder}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                className="pr-12"
                                disabled={isPending}
                            />
                            <Button
                                id="send-message-button"
                                type="button"
                                size="icon"
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8"
                                onClick={handleSendMessage}
                                disabled={isPending || !input.trim()}
                            >
                                <Send className="h-4 w-4" />
                                <span className="sr-only">{T.sendMessage}</span>
                            </Button>
                        </div>
                    </div>
                </div>
           )}
       </div>

        {/* Right Sidebar for History */}
        {!isQuickChat && (
        <aside className={cn(
            "flex flex-col bg-muted/50 border-l transition-all duration-300",
            isHistoryPanelOpen ? "w-full max-w-xs" : "w-0"
        )}>
           <div className={cn("flex flex-col h-full", !isHistoryPanelOpen && "hidden")}>
                <div className="p-2 border-b shrink-0">
                    <h3 className="font-semibold text-center">{T.chatHistory}</h3>
                </div>
               <ScrollArea className="flex-1">
                   <div className="p-2 space-y-1">
                       {sortedConversations.map(convo => (
                           <div key={convo.id} className="group relative">
                               <Button
                                   variant={activeConversationId === convo.id ? "secondary" : "ghost"}
                                   className="w-full justify-start text-left h-auto min-h-9 pr-8"
                                   onClick={() => setActiveConversationId(convo.id)}
                               >
                                  <span className="truncate whitespace-normal">{convo.title}</span>
                               </Button>
                               <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center">
                                   <AlertDialog>
                                       <AlertDialogTrigger asChild>
                                           <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                               <Trash2 className="h-4 w-4" />
                                           </Button>
                                       </AlertDialogTrigger>
                                       <AlertDialogContent>
                                           <AlertDialogHeader>
                                               <AlertDialogTitle>{T.areYouSure}</AlertDialogTitle>
                                               <AlertDialogDescription>
                                                   This will permanently delete the conversation "{convo.title}". This action cannot be undone.
                                               </AlertDialogDescription>
                                           </AlertDialogHeader>
                                           <AlertDialogFooter>
                                               <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                                               <AlertDialogAction onClick={() => handleDeleteConversation(convo.id)}>{T.delete}</AlertDialogAction>
                                           </AlertDialogFooter>
                                       </AlertDialogContent>
                                   </AlertDialog>
                               </div>
                           </div>
                       ))}
                   </div>
               </ScrollArea>
           </div>
       </aside>
       )}
    </div>
  );
}

export default function ChatPage({ isQuickChat = false }: { isQuickChat?: boolean }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatView isQuickChat={isQuickChat} />
        </Suspense>
    )
}

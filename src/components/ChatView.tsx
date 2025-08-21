'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bot, 
  Send, 
  User, 
  MessageCircle, 
  Trash2, 
  Settings,
  Loader2,
  Copy,
  CheckCircle,
  AlertTriangle,
  History,
  X
} from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';
import { askAboutTasksAction } from '@/app/actions/ai-actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { TaskDetailsDialog } from '@/components/task-dialogs/TaskDetailsDialog';
import { EventDetailsDialog } from '@/components/event-dialogs/EventDetailsDialog';
import { CreateTaskForm } from '@/components/create-task-form-new';
import { EditTaskForm } from '@/components/edit-task-form';
import { InteractiveElements } from '@/components/ai/InteractiveElements';
import type { InteractiveElement } from '@/lib/ai-types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  interactiveElements?: InteractiveElement[];
}

interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatViewProps {
  isQuickChat?: boolean;
  showHistoryPanel?: boolean;
}

export default function ChatView({ isQuickChat = false, showHistoryPanel = true }: ChatViewProps) {
  const { 
    appData, 
    handleAiCreateTask, 
    handleEditTask, 
    handleDeleteTask, 
    handleEditTaskClick,
    editingTask,
    setEditingTask,
  handleAddClientAndSelect
  } = useDashboard();
  const { toast } = useToast();
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  
  // Chat history state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  
  // Dialog states
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get translations
  const T = i18n[appData.appSettings.language];

  // Local storage keys
  const CONVERSATIONS_KEY = 'freelance-flow-conversations';

  const ensureStringContent = (content: any): string => {
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (typeof parsed === 'object' && parsed !== null && parsed.content) {
          return ensureStringContent(parsed.content);
        }
      } catch (e) {
        // Not a JSON string, return as is.
      }
      return content;
    }
    if (typeof content === 'object' && content !== null) {
      if (content.content) {
        return ensureStringContent(content.content);
      }
      return JSON.stringify(content);
    }
    return String(content || '');
  };

  // Load conversations from localStorage
  useEffect(() => {
    try {
      const storedConversations = localStorage.getItem(CONVERSATIONS_KEY);
      if (storedConversations) {
        const parsed = JSON.parse(storedConversations);
        const cleanedConversations = parsed.map((conv: any) => {
          const conversationId = conv.id || `conv-fallback-${Date.now()}-${Math.random()}`;
          return {
            ...conv,
            id: conversationId,
            createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
            updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : new Date(),
            messages: (conv.messages || []).map((msg: any, index: number) => ({
              ...msg,
              id: msg.id || `${conversationId}-msg-${index}`,
              content: ensureStringContent(msg.content),
              timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
            })),
          };
        }).filter((conv: any) => 
          conv.createdAt instanceof Date && !isNaN(conv.createdAt.getTime()) &&
          conv.updatedAt instanceof Date && !isNaN(conv.updatedAt.getTime())
        );
        setConversations(cleanedConversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  // Save conversations to localStorage
  const saveConversations = (convs: ChatConversation[]) => {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
    } catch (error) {
      console.error('Failed to save conversations:', error);
    }
  };

  // Handle task link clicks
  const handleTaskClick = (taskId: string) => {
    const task = appData?.tasks?.find(t => t.id === taskId);
    if (task) {
      setSelectedTask(task);
    } else {
      toast({
        variant: 'destructive',
        title: 'Task Not Found',
        description: `Task #${taskId} could not be found.`
      });
    }
  };

  // Handle event link clicks
  const handleEventClick = (eventId: string) => {
    const event = appData?.events?.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
    } else {
      toast({
        variant: 'destructive',
        title: 'Event Not Found',
        description: `Event #${eventId} could not be found.`
      });
    }
  };

  // Create new conversation
  const createNewConversation = () => {
    // Don't create a new conversation immediately, just reset current state
    setCurrentConversationId(null);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: T.chatPlaceholderWelcome || 'How can I help you manage your tasks today?',
      timestamp: new Date()
    }]);
    setShowHistorySidebar(false);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    toast({
      title: T.newChatStarted || 'New chat started',
      description: T.newChatStartedDesc || 'A new conversation will be created when you send your first message.'
    });
  };

  // Load conversation
  const loadConversation = (conversationId: string) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
      setShowHistorySidebar(false);
    }
  };

  // Clean up empty conversations
  const cleanupEmptyConversations = () => {
    const validConversations = conversations.filter(conv => {
      // Keep conversations that have more than just the welcome message
      const hasRealMessages = conv.messages && conv.messages.length > 0 && 
        conv.messages.some(msg => msg.role === 'user' || (msg.role === 'assistant' && msg.id !== 'welcome'));
      return hasRealMessages;
    });
    
    if (validConversations.length !== conversations.length) {
      setConversations(validConversations);
      saveConversations(validConversations);
    }
  };

  // Delete conversation
  const deleteConversation = (conversationId: string) => {
    const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
    setConversations(updatedConversations);
    saveConversations(updatedConversations);
    
    // If deleting current conversation, reset to empty state
    if (currentConversationId === conversationId) {
      setCurrentConversationId(null);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: T.chatPlaceholderWelcome || 'How can I help you manage your tasks today?',
        timestamp: new Date()
      }]);
    }
    
    toast({
      title: 'Chat Deleted',
      description: 'The conversation has been deleted.'
    });
  };

  // Update current conversation
  const updateCurrentConversation = (newMessages: ChatMessage[]) => {
    if (!currentConversationId) {
      // Create new conversation if none exists
      const newConversation: ChatConversation = {
        id: `conv-${Date.now()}`,
        title: newMessages.length > 0 ? 
          (newMessages[0].content.substring(0, 30) + (newMessages[0].content.length > 30 ? '...' : '')) 
          : 'New Chat',
        messages: newMessages,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const updatedConversations = [newConversation, ...conversations];
      setConversations(updatedConversations);
      saveConversations(updatedConversations);
      setCurrentConversationId(newConversation.id);
      return;
    }

    const now = new Date();
    const updatedConversations = conversations.map(conv => {
      if (conv.id === currentConversationId) {
        return {
          ...conv,
          messages: newMessages,
          updatedAt: now,
          title: newMessages.length > 0 ? 
            (newMessages[0].content.substring(0, 30) + (newMessages[0].content.length > 30 ? '...' : '')) 
            : 'New Chat'
        };
      }
      return conv;
    });

    setConversations(updatedConversations);
    saveConversations(updatedConversations);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-focus input and cleanup on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Cleanup empty conversations on mount
    cleanupEmptyConversations();
  }, []);

  // Cleanup empty conversations when switching conversations
  useEffect(() => {
    const timer = setTimeout(() => {
      cleanupEmptyConversations();
    }, 1000); // Delay to avoid interfering with ongoing operations
    
    return () => clearTimeout(timer);
  }, [conversations.length]);

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: T.chatPlaceholderWelcome || 'How can I help you manage your tasks today?',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [T.chatPlaceholderWelcome]);

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    // Check if API key is configured
    const hasApiKey = appData?.appSettings?.googleApiKey;
    if (!hasApiKey) {
      toast({
        variant: 'destructive',
        title: T.apiKeyRequiredTitle,
        description: T.apiKeyRequiredDesc
      });
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare AI input
      const aiInput = {
        userInput: trimmedInput,
        history: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'model' as const,
          content: [{ text: msg.content }]
        })),
        tasks: appData?.tasks || [],
        clients: appData?.clients || [],
        collaborators: appData?.collaborators || [],
        quoteTemplates: appData?.quoteTemplates || [],
        quotes: appData?.quotes || [],
        language: appData.appSettings.language,
        modelName: appData?.appSettings?.googleModel || 'gemini-1.5-flash',
        apiKey: appData?.appSettings?.googleApiKey
      };

      // Get AI response
      const response = await askAboutTasksAction(aiInput);
      
      // Ensure response.text is a string
      let contentText = '';
      if (typeof response.text === 'string') {
        contentText = response.text;
      } else if (response.text && typeof response.text === 'object' && (response.text as any).text) {
        contentText = (response.text as any).text;
      } else if (response.text) {
        contentText = JSON.stringify(response.text);
      } else {
        contentText = 'No response received.';
      }
      
      // Add AI message
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: contentText,
        timestamp: new Date(),
        interactiveElements: response.interactiveElements
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      updateCurrentConversation(finalMessages);

      // Execute any actions returned by AI
      if (response.action) {
        await handleAiAction(response.action);
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error.message || T.aiResponseError || 'Sorry, something went wrong.',
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      updateCurrentConversation(finalMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiAction = async (action: any) => {
    try {
      switch (action.type) {
        case 'createTask':
          if (handleAiCreateTask) {
            await handleAiCreateTask(action.payload);
            toast({
              title: 'Task Created',
              description: `Created task: ${action.payload.name}`
            });
          }
          break;
        case 'editTask':
          if (handleEditTask) {
            await handleEditTask(action.payload, [], [], action.payload.id);
            toast({
              title: 'Task Updated',
              description: `Updated task: ${action.payload.name}`
            });
          }
          break;
        default:
          console.log('Unknown action type:', action.type);
      }
    } catch (error: any) {
      console.error('Action execution error:', error);
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message
      });
    }
  };

  // Copy message functionality
  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(messageId);
      setTimeout(() => setCopiedMessage(null), 2000);
      toast({
        title: "Copied",
        description: "Message copied to clipboard"
      });
    } catch (error) {
      toast({
        variant: "destructive", 
        title: "Copy failed",
        description: "Failed to copy message to clipboard"
      });
    }
  };

  // Clear conversation functionality
  const clearConversation = () => {
    createNewConversation();
  };

  // Handle task/event dialog opening
  const handleOpenTaskDialog = (taskId: string) => {
    const task = appData?.tasks?.find(t => t.id === taskId);
    if (task) {
      setSelectedTask(task);
    }
  };

  const handleOpenEventDialog = (eventId: string) => {
    const event = appData?.events?.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
    }
  };

  // Handle create task dialog
  const handleOpenCreateTaskDialog = () => {
    setShowCreateTaskDialog(true);
  };

  const handleCloseTaskDialog = () => {
    setSelectedTask(null);
  };

  const handleCloseEventDialog = () => {
    setSelectedEvent(null);
  };

  const handleTaskCreated = () => {
    setShowCreateTaskDialog(false);
    toast({
      title: 'Task Created',
      description: 'New task has been created successfully.'
    });
  };

  // Handle interactive elements
  const handleInteractiveElement = async (element: InteractiveElement) => {
    try {
      switch (element.action) {
        case 'createTask':
          setShowCreateTaskDialog(true);
          break;
        case 'openTask':
          if (element.data?.taskId) {
            const task = appData?.tasks?.find(t => t.id === element.data.taskId);
            if (task) {
              setSelectedTask(task);
            } else {
              toast({
                variant: 'destructive',
                title: 'Task Not Found',
                description: `Task with ID ${element.data.taskId} could not be found.`
              });
            }
          }
          break;
        case 'openEvent':
          if (element.data?.eventId) {
            const event = appData?.events?.find(e => e.id === element.data.eventId);
            if (event) {
              setSelectedEvent(event);
            } else {
              toast({
                variant: 'destructive',
                title: 'Event Not Found',
                description: `Event with ID ${element.data.eventId} could not be found.`
              });
            }
          }
          break;
        case 'createQuote':
          toast({
            title: 'Quote Creation',
            description: 'Quote creation feature coming soon!'
          });
          break;
        case 'openCalendar':
          toast({
            title: 'Calendar',
            description: 'Calendar integration coming soon!'
          });
          break;
        case 'copyable':
          if (element.data) {
            await copyMessage(element.data, `copyable-${Date.now()}`);
          }
          break;
        case 'link':
          if (element.data) {
            window.open(element.data, '_blank');
          }
          break;
        case 'taskPreview':
          if (element.data?.taskId) {
            handleTaskClick(element.data.taskId);
          }
          break;
        default:
          console.log('Unknown interactive element:', element);
          toast({
            title: 'Feature Coming Soon',
            description: `${element.label} functionality is being developed.`
          });
      }
    } catch (error: any) {
      console.error('Interactive element error:', error);
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: error.message || 'Failed to execute action'
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatTime = (timestamp: Date) => {
    try {
      if (!timestamp || !(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
          return '';
      }
      return new Intl.DateTimeFormat(appData.appSettings.language, {
        hour: '2-digit',
        minute: '2-digit'
      }).format(timestamp);
    } catch(e) {
      console.error("Failed to format time", timestamp, e);
      return '';
    }
  };

  return (
    <>
      <div className={cn(
        "flex h-full overflow-hidden",
        isQuickChat ? "bg-background" : ""
      )}>
      {/* Chat History Sidebar - Only show for main chat, not quick chat */}
      {showHistoryPanel && !isQuickChat && showHistorySidebar && (
        <div className="w-80 md:w-80 sm:w-72 border-r bg-card/50 flex flex-col max-w-[90vw] md:max-w-none">
          <div className="p-3 md:p-4 border-b">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="font-medium text-sm md:text-base truncate">{T.chatHistory || 'Chat History'}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistorySidebar(false)}
                className="flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={cn(
                    "flex items-stretch gap-1 md:gap-2 p-1 md:p-2 rounded-lg hover:bg-muted/50 transition-colors group min-w-0",
                    currentConversationId === conversation.id ? "bg-secondary" : ""
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-90 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0 h-auto p-1 md:p-2 w-8 md:w-10 border border-transparent hover:border-destructive/20 bg-red-50/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start text-left h-auto p-1 md:p-2 min-w-0 overflow-hidden"
                    onClick={() => loadConversation(conversation.id)}
                  >
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-medium truncate text-sm md:text-base" title={conversation.title}>
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.updatedAt && conversation.updatedAt instanceof Date && !isNaN(conversation.updatedAt.getTime()) 
                          ? format(conversation.updatedAt, 'MMM d, yyyy')
                          : 'Unknown date'
                        }
                      </p>
                    </div>
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Chat Header */}
        <div className={cn(
          "flex items-center justify-between border-b bg-card/50",
          isQuickChat ? "px-3 py-2" : "p-4"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center",
              isQuickChat ? "p-1.5" : "p-2"
            )}>
              <Bot className={cn(
                "text-primary",
                isQuickChat ? "w-4 h-4" : "w-5 h-5"
              )} />
            </div>
            <div>
              <h3 className={cn(
                "font-medium",
                isQuickChat ? "text-sm" : ""
              )}>AI Hub</h3>
              <p className={cn(
                "text-muted-foreground",
                isQuickChat ? "text-xs" : "text-xs"
              )}>
                {isLoading ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 overflow-hidden">
            {/* New Chat button - for main chat */}
            {!isQuickChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewConversation}
                title="New Chat"
                className="flex-shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">New</span>
              </Button>
            )}
            {/* History button - only for main chat */}
            {showHistoryPanel && !isQuickChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                title="Chat History"
                className="flex-shrink-0"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">History</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              disabled={messages.length <= 1}
              title="Clear current chat"
              className="flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Clear</span>
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className={cn(
          "flex-1",
          isQuickChat ? "p-3" : "p-4"
        )}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "flex-shrink-0 rounded-full flex items-center justify-center text-sm font-medium",
                  isQuickChat ? "w-7 h-7" : "w-8 h-8",
                  message.role === 'user' 
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' 
                    : 'bg-muted text-muted-foreground'
                )}>
                  {message.role === 'user' ? (
                    <User className={isQuickChat ? "w-3 h-3" : "w-4 h-4"} />
                  ) : (
                    <Bot className={isQuickChat ? "w-3 h-3" : "w-4 h-4"} />
                  )}
                </div>

                {/* Message Content */}
                <div className={cn(
                  "flex-1 space-y-2",
                  message.role === 'user' ? 'text-right' : ''
                )}>
                  <Card className={cn(
                    "inline-block max-w-full relative group",
                    message.role === 'user' 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 ml-auto' 
                      : 'bg-card'
                  )}>
                    <CardContent className={cn(
                      isQuickChat ? "p-2.5" : "p-3"
                    )}>
                      <div className="flex justify-between items-start gap-2">
                        <div className={cn(
                          "prose max-w-none dark:prose-invert flex-1",
                          isQuickChat ? "prose-xs" : "prose-sm"
                        )}>
                          {message.role === 'user' ? (
                            <MarkdownRenderer 
                              content={ensureStringContent(message.content)}
                              className="text-inherit [&>*:last-child]:mb-0"
                              onTaskClick={handleTaskClick}
                              onEventClick={handleEventClick}
                              tasks={appData?.tasks || []}
                              events={appData?.events || []}
                            />
                          ) : (
                            <MarkdownRenderer 
                              content={ensureStringContent(message.content)}
                              className="text-foreground [&>*:last-child]:mb-0"
                              onTaskClick={handleTaskClick}
                              onEventClick={handleEventClick}
                              tasks={appData?.tasks || []}
                              events={appData?.events || []}
                            />
                          )}
                        </div>
                        
                        {/* Copy button - appears on hover */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
                            isQuickChat ? "h-5 w-5 p-0" : "h-6 w-6 p-0",
                            message.role === 'user' ? 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200' : ''
                          )}
                          onClick={() => copyMessage(message.content, message.id)}
                        >
                          {copiedMessage === message.id ? (
                            <CheckCircle className={isQuickChat ? "w-2.5 h-2.5" : "w-3 h-3"} />
                          ) : (
                            <Copy className={isQuickChat ? "w-2.5 h-2.5" : "w-3 h-3"} />
                          )}
                        </Button>
                      </div>
                      
                      {/* Interactive Elements */}
                      {message.interactiveElements && message.interactiveElements.length > 0 && (
                        <div className="pt-3 border-t border-border/50">
                          <InteractiveElements 
                            elements={message.interactiveElements}
                            onElementClick={handleInteractiveElement}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <div className={cn(
                    "text-xs text-muted-foreground",
                    message.role === 'user' ? 'text-right' : 'text-left'
                  )}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <Card className="bg-card">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className={cn(
          "border-t bg-card/50",
          isQuickChat ? "p-3" : "p-4"
        )}>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={T.chatPlaceholder}
              disabled={isLoading}
              className={cn(
                "flex-1",
                isQuickChat ? "text-sm" : ""
              )}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Quick suggestions - hide for quick chat to save space */}
          {!isQuickChat && (
            <div className="flex flex-wrap gap-1 mt-2">
              {[
                "What's due this week?",
                "Show my tasks",
                "Create a new task",
                "How am I doing?"
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setInputValue(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Task Details Dialog */}
    {selectedTask && (
      <TaskDetailsDialog
        task={selectedTask}
        client={appData?.clients?.find(c => c.id === selectedTask.clientId)}
        clients={appData?.clients || []}
        collaborators={appData?.collaborators || []}
        categories={appData?.categories || []}
        quote={appData?.quotes?.find(q => q.id === selectedTask.quoteId)}
        collaboratorQuotes={appData?.quotes?.filter(q => 
          selectedTask.collaboratorQuotes?.some((cq: any) => cq.quoteId === q.id)
        )}
        settings={appData?.appSettings}
        isOpen={!!selectedTask}
        onClose={handleCloseTaskDialog}
        onEdit={() => {
          // Handle edit task - use proper edit functionality with error handling
          try {
            if (selectedTask && handleEditTaskClick) {
              handleEditTaskClick(selectedTask);
              handleCloseTaskDialog();
              toast({
                title: 'Edit Task',
                description: 'Opening task editor...'
              });
            } else {
              throw new Error('Edit function not available or no task selected');
            }
          } catch (error: any) {
            console.error('Error opening edit dialog:', error);
            toast({
              variant: 'destructive',
              title: 'Edit Failed',
              description: error.message || 'Failed to open task editor. Please try again.'
            });
          }
  }}
        onDelete={(taskId: string) => {
          // Handle delete task with proper error handling
          try {
            if (handleDeleteTask) {
              handleDeleteTask(taskId);
              handleCloseTaskDialog();
              toast({
                title: 'Task Deleted',
                description: 'The task has been moved to trash successfully.'
              });
            } else {
              throw new Error('Delete function not available');
            }
          } catch (error: any) {
            console.error('Error deleting task:', error);
            toast({
              variant: 'destructive',
              title: 'Delete Failed',
              description: error.message || 'Failed to delete the task. Please try again.'
            });
          }
        }}
      />
    )}

    {/* Event Details Dialog */}
    {selectedEvent && (
      <EventDetailsDialog
        event={selectedEvent}
        tasks={appData?.tasks || []}
        isOpen={!!selectedEvent}
        onClose={handleCloseEventDialog}
        onEdit={(event) => {
          // Handle edit event
          console.log('Edit event:', event);
        }}
      />
    )}

    {/* Edit Task Dialog */}
    {editingTask && (
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <p className="text-sm text-muted-foreground">{editingTask.name}</p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            <EditTaskForm
              setOpen={(open) => !open && setEditingTask(null)}
              onSubmit={(values, quoteColumns, collaboratorQuoteColumns, taskId) => {
                // Handle task edit with proper parameters
                if (handleEditTask) {
                  handleEditTask(values, quoteColumns, collaboratorQuoteColumns, taskId);
                  toast({
                    title: 'Task Updated',
                    description: `Updated task: ${values.name}`
                  });
                }
                setEditingTask(null);
              }}
              taskToEdit={editingTask}
              quote={appData?.quotes?.find(q => q.id === editingTask.quoteId)}
              collaboratorQuotes={appData?.quotes?.filter(q => 
                editingTask.collaboratorQuotes?.some((cq: any) => cq.quoteId === q.id)
              )}
              clients={appData?.clients || []}
              collaborators={appData?.collaborators || []}
              categories={appData?.categories || []}
              onAddClient={handleAddClientAndSelect}
              quoteTemplates={appData?.quoteTemplates || []}
              settings={appData?.appSettings}
            />
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Create Task Dialog */}
    {showCreateTaskDialog && (
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] mx-4 p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{T.createTask || 'Create Task'}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            <CreateTaskForm
              setOpen={setShowCreateTaskDialog}
              onSubmit={(values, quoteColumns, collaboratorQuoteColumns) => {
                // Handle task creation with AI context
                if (handleAiCreateTask) {
                  handleAiCreateTask(values);
                }
                handleTaskCreated();
              }}
              clients={appData?.clients || []}
              collaborators={appData?.collaborators || []}
              categories={appData?.categories || []}
              onAddClient={(clientData) => {
                // Handle add client - would need to implement in dashboard context
                const newClient = { ...clientData, id: `client-${Date.now()}` };
                return newClient;
              }}
              quoteTemplates={appData?.quoteTemplates || []}
              settings={appData?.appSettings}
              onDirtyChange={() => {}}
              onSubmitStart={() => {}}
            />
          </div>
        </DialogContent>
      </Dialog>
    )}

    </>
  );
}
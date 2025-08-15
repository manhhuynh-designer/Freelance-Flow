"use client";

import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Loader2, Wand2, Copy, AlertTriangle, History, Save, Trash2, Star, View, Upload, Expand } from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';
import { useToast } from "@/hooks/use-toast";
import { writingAssistantAction } from '@/app/actions/ai-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapUnderline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { i18n } from '@/lib/i18n';
import '@/styles/tiptap-content.css';

// Add typing animation styles
const typingStyles = `
  .typing-animation {
    white-space: pre-wrap;
    font-family: inherit;
    line-height: 1.6;
    color: inherit;
    min-height: 1.5em;
    padding: 0.5rem;
    border-radius: 0.375rem;
    background: transparent;
  }
  
  .typing-animation .prose {
    max-width: none;
    color: inherit;
  }
  
  .typing-animation .prose h1,
  .typing-animation .prose h2,
  .typing-animation .prose h3 {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }
  
  .typing-animation .prose p {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }
  
  .typing-animation .prose ul,
  .typing-animation .prose ol {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }
  
  .typing-cursor {
    display: inline-block;
    background-color: currentColor;
    width: 2px;
    height: 1.2em;
    margin-left: 1px;
    animation: blink 0.8s infinite;
    vertical-align: baseline;
  }
  
  .typing-cursor-absolute {
    position: absolute;
    top: 0;
    right: 0;
    display: inline-block;
    background-color: currentColor;
    width: 2px;
    height: 1.2em;
    animation: blink 0.8s infinite;
  }
  
  .typing-cursor.hidden {
    display: none;
  }
  
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  .typing-animation.dark .typing-cursor {
    background-color: #fff;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = typingStyles;
  if (!document.head.querySelector('style[data-typing-animation]')) {
    styleElement.setAttribute('data-typing-animation', 'true');
    document.head.appendChild(styleElement);
  }
}

type WritingAction = 'write' | 'edit' | 'reply' | 'summarize' | 'translate';
type WritingTone = 'formal' | 'casual' | 'professional' | 'friendly';
type OutputLength = 'short' | 'medium' | 'long';
type OutputLanguage = 'en' | 'vi';

interface WritingSettings { action: WritingAction; tone: WritingTone; length: OutputLength; outputLanguage: OutputLanguage; }
interface Preset extends WritingSettings { id: string; name: string; }

interface ContextVersion {
  id: string;
  text: string;
  timestamp: string;
  label: string;
  outputText?: string; // Store associated output for this version
}

interface HistoryItem { 
  id: string; 
  timestamp: string; 
  title: string; 
  baseText: string; 
  prompt: string; 
  outputText: string; 
  settings: WritingSettings;
  versions?: ContextVersion[];
  currentVersionId?: string;
}

// Labels are provided by i18n (T) from app settings

// ControlPanel moved outside as a separate component to prevent re-creation
interface ControlPanelProps {
  inDialog?: boolean;
  baseText: string;
  prompt: string;
  settings: WritingSettings;
  isLoading: boolean;
  onBaseTextChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onSettingsChange: (settings: WritingSettings) => void;
  onGenerate: () => void;
  T: any;
}

const ControlPanel = memo<ControlPanelProps>(({ 
  inDialog = false, 
  baseText, 
  prompt, 
  settings, 
  isLoading, 
  onBaseTextChange, 
  onPromptChange, 
  onSettingsChange, 
  onGenerate,
  T
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor={`base-text-${inDialog}`}>{T.inputContextLabel || 'Base content (*)'}</Label>
      <Textarea 
        id={`base-text-${inDialog}`} 
        value={baseText} 
        onChange={(e) => onBaseTextChange(e.target.value)}
        disabled={isLoading} 
        className={inDialog ? "min-h-[150px]" : "min-h-[100px]"} 
        placeholder={T.baseTextPlaceholder || 'Enter the base content for AI to process...'}
      />
      
      <div>
        <Label htmlFor={`prompt-${inDialog}`}>{T.promptLabel || 'Additional request (Optional)'}</Label>
        <Textarea 
          id={`prompt-${inDialog}`} 
          value={prompt} 
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={isLoading} 
          className="min-h-[80px]" 
          placeholder={T.promptPlaceholder || 'Enter additional instructions for AI...'} 
        />
      </div>

      <div>
        <Label>{T.actionLabel || 'Action'}</Label>
        <Select 
          disabled={isLoading} 
          value={settings.action} 
          onValueChange={(v) => onSettingsChange({...settings, action: v as WritingAction})}
        >
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>{[
            ['write', T.aiWrite || 'Write'],
            ['edit', T.aiEdit || 'Edit'],
            ['reply', T.aiReply || 'Reply'],
            ['summarize', T.aiSummarize || 'Summarize'],
            ['translate', T.aiTranslate || 'Translate']
          ].map(([k,v]) => <SelectItem key={k as string} value={k as string}>{v as string}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div>
        <Label>{T.toneLabel || 'Tone'}</Label>
        <Select 
          disabled={isLoading} 
          value={settings.tone} 
          onValueChange={(v) => onSettingsChange({...settings, tone: v as WritingTone})}
        >
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>{[
            ['professional', T.toneProfessional || 'Professional'],
            ['casual', T.toneCasual || 'Casual'],
            ['friendly', T.toneFriendly || 'Friendly'],
            ['formal', T.toneFormal || 'Formal']
          ].map(([k,v]) => <SelectItem key={k as string} value={k as string}>{v as string}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div>
        <Label>{T.lengthLabel || 'Length'}</Label>
        <Select 
          disabled={isLoading} 
          value={settings.length} 
          onValueChange={(v) => onSettingsChange({...settings, length: v as OutputLength})}
        >
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>{[
            ['short', T.lengthShort || 'Short'],
            ['medium', T.lengthMedium || 'Medium'],
            ['long', T.lengthLong || 'Long']
          ].map(([k,v]) => <SelectItem key={k as string} value={k as string}>{v as string}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div>
        <Label>{T.outputLanguageLabel || 'Language'}</Label>
        <Select 
          disabled={isLoading} 
          value={settings.outputLanguage} 
          onValueChange={(v) => onSettingsChange({...settings, outputLanguage: v as OutputLanguage})}
        >
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>{[
            ['vi', T.languageVietnamese || 'Vietnamese'],
            ['en', T.languageEnglish || 'English']
          ].map(([k,v]) => <SelectItem key={k as string} value={k as string}>{v as string}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
    <Button onClick={onGenerate} disabled={isLoading || !baseText.trim()} size="lg" className="w-full !mt-5">
      <Wand2 className="mr-2 h-4 w-4"/> {isLoading ? (T.generating || 'Generating...') : (T.generate || 'Generate')}
    </Button>
  </div>
));

export function AIWritingSupport() {
  const { appData } = useDashboard();
  const { toast } = useToast();
  const T = i18n[appData?.appSettings?.language || 'en'];
  
  const [prompt, setPrompt] = useState('Viết email marketing giới thiệu sản phẩm mới.');
  const [baseText, setBaseText] = useState('Sản phẩm XYZ với công nghệ vượt trội.');
  const [settings, setSettings] = useState<WritingSettings>({ action: 'write', tone: 'professional', length: 'medium', outputLanguage: 'vi' });
  const [outputText, setOutputText] = useState('');
  // Removed isEditingOutput - always editable now
  const [isLoading, setIsLoading] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [isControlDialogOpen, setIsControlDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Version management state
  const [contextVersions, setContextVersions] = useState<ContextVersion[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);

  // Typing animation state
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [fullText, setFullText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  const hasApiKey = !!appData?.appSettings?.googleApiKey;
  const outputEditor = useEditor({ 
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'tiptap-paragraph',
          },
        },
      }),
      TiptapUnderline,
      Link.configure({
        autolink: true,
        openOnClick: true,
        linkOnPaste: true,
      })
    ], 
    content: '', 
    editable: true, 
    editorProps: { 
      attributes: { 
        class: 'prose dark:prose-invert min-h-full max-w-none w-full outline-none focus:outline-none border-none ring-0 focus:ring-0 tiptap-rendered-content' 
      } 
    }, 
    immediatelyRender: false 
  });
  
  useEffect(() => {
    // Di chuyển console.log vào đây để chúng chỉ chạy khi hasApiKey hoặc appData thay đổi, và không trong mỗi render.
    console.log("hasApiKey status:", hasApiKey);
    console.log("googleApiKey from appData:", appData?.appSettings?.googleApiKey); // Kiểm tra giá trị thực tế

    try {
      const presetsData = JSON.parse(localStorage.getItem('ai-writing-presets') || '[]');
      const historyData = JSON.parse(localStorage.getItem('ai-writing-history') || '[]');
      const versionsData = JSON.parse(localStorage.getItem('ai-writing-versions') || '[]');
      
      setPresets(Array.isArray(presetsData) ? presetsData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
      setContextVersions(Array.isArray(versionsData) ? versionsData : []);
    } catch (e) {
      // Reset to defaults if localStorage data is corrupted
      setPresets([]);
      setHistory([]);
      setContextVersions([]);
    }
    setIsInitialLoad(false);
  }, [hasApiKey, appData, isInitialLoad]); // Thêm hasApiKey và appData vào dependency array
  
  useEffect(() => { if (!isInitialLoad) localStorage.setItem('ai-writing-presets', JSON.stringify(presets)); }, [presets, isInitialLoad]);
  useEffect(() => { if (!isInitialLoad) localStorage.setItem('ai-writing-history', JSON.stringify(history)); }, [history, isInitialLoad]);
  useEffect(() => { if (!isInitialLoad) localStorage.setItem('ai-writing-versions', JSON.stringify(contextVersions)); }, [contextVersions, isInitialLoad]);
  useEffect(() => { 
    if (outputEditor) {
      const currentContent = outputEditor.getHTML();
      if (currentContent !== outputText) {
        outputEditor.commands.setContent(outputText || ''); 
      }
    }
  }, [outputText, outputEditor]);

  const addToHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    // Check if there's an existing history item with similar base text (version relationship)
    const existingItem = history.find(h => h.title === item.title || 
      (h.baseText === item.baseText && h.prompt === item.prompt));
    
    if (existingItem) {
      // Update existing item with new output and version info
      const newVersion: ContextVersion = {
        id: `version-${Date.now()}`,
        text: item.baseText,
        timestamp: new Date().toISOString(),
        label: `Version ${(existingItem.versions?.length || 0) + 1}`,
        outputText: item.outputText
      };
      
      setHistory(prev => prev.map(h => 
        h.id === existingItem.id 
          ? {
              ...h,
              outputText: item.outputText,
              timestamp: new Date().toISOString(),
              versions: [...(h.versions || []), newVersion],
              currentVersionId: newVersion.id
            }
          : h
      ));
    } else {
      // Create new history item
      const newHistoryItem: HistoryItem = {
        ...item,
        id: `hist-${Date.now()}`,
        timestamp: new Date().toISOString(),
        versions: currentVersionId ? contextVersions.filter(v => v.id === currentVersionId) : [],
        currentVersionId: currentVersionId || undefined
      };
      
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 49)]);
    }
  };
  // Function to render markdown during typing animation
  const renderTypingContent = (text: string, showCursor: boolean) => {
    if (!text) return { __html: '' };
    
    // Process text as markdown but keep it simple for typing animation
    const processedText = isLikelyMarkdown(text) ? convertMarkdownToHTML(text) : text.replace(/\n/g, '<br>');
    const finalText = processedText + (showCursor ? '<span class="typing-cursor animate-pulse">|</span>' : '');
    
    return { __html: finalText };
  };

  const deleteHistoryItem = (id: string) => setHistory(prev => prev.filter(h => h.id !== id));
  
  // Typing animation function
  const startTypingAnimation = (text: string) => {
    setIsTyping(true);
    setTypingText('');
    setFullText(text);
    setShowCursor(true);
    
    // Keep original text for typing display (including markdown)
    const textToType = text;
    
    let currentIndex = 0;
    
    const typeNextChar = () => {
      if (currentIndex < textToType.length) {
        setTypingText(textToType.substring(0, currentIndex + 1));
        currentIndex++;
        
        // Variable typing speed for more natural feel
        const char = textToType[currentIndex - 1];
        let delay = 16; // Base speed (increased from 25ms to ~16ms for 1.5x speed)
        
        // Slower for punctuation
        if ('.!?'.includes(char)) {
          delay = 200; // Long pause after sentences (reduced from 300ms)
        } else if (',;:'.includes(char)) {
          delay = 100; // Medium pause after commas (reduced from 150ms)
        } else if (char === ' ') {
          delay = 33; // Slight pause for spaces (reduced from 50ms)
        } else if (char === '\n') {
          delay = 133; // Pause for line breaks (reduced from 200ms)
        }
        
        setTimeout(typeNextChar, delay);
      } else {
        // Hide cursor immediately when typing is done
        setShowCursor(false);
        setIsTyping(false);
        
        // Set final content to editor after typing completes
        setTimeout(() => {
          const processedContent = processAIOutput(text);
          setOutputText(processedContent);
        }, 100); // Reduced delay from 500ms to 100ms for faster transition
      }
    };
    
    typeNextChar();
  };

  // Function to stop typing animation
  const stopTypingAnimation = () => {
    setIsTyping(false);
    setTypingText('');
    setShowCursor(false);
    if (fullText) {
      const processedContent = processAIOutput(fullText);
      setOutputText(processedContent);
      setFullText('');
    }
  };
  
  // Helper functions for content processing
  const isLikelyHTML = (content: string): boolean => {
    return /<\/?[a-z][\s\S]*>/i.test(content);
  };

  const isLikelyMarkdown = (content: string): boolean => {
    // Check for common markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s/m,           // Headers
      /\*\*.*?\*\*/,          // Bold
      /\*.*?\*/,              // Italic
      /\[.*?\]\(.*?\)/,       // Links
      /`.*?`/,                // Inline code
      /```[\s\S]*?```/,       // Code blocks
      /^\s*[-*+]\s/m,         // Lists
      /^\s*\d+\.\s/m,         // Numbered lists
    ];
    return markdownPatterns.some(pattern => pattern.test(content));
  };

  const convertMarkdownToHTML = (markdown: string): string => {
    if (!markdown) return '';
    
    let html = markdown
      // Headers (must be at start of line)
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // Code blocks (must come before inline code)
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>');

    // Handle lists more carefully
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inUL = false;
    let inOL = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for unordered list items
      const ulMatch = line.match(/^[-*+]\s+(.*)$/);
      // Check for ordered list items
      const olMatch = line.match(/^\d+\.\s+(.*)$/);
      
      if (ulMatch) {
        if (inOL) {
          processedLines.push('</ol>');
          inOL = false;
        }
        if (!inUL) {
          processedLines.push('<ul>');
          inUL = true;
        }
        processedLines.push(`<li>${ulMatch[1]}</li>`);
      } else if (olMatch) {
        if (inUL) {
          processedLines.push('</ul>');
          inUL = false;
        }
        if (!inOL) {
          processedLines.push('<ol>');
          inOL = true;
        }
        processedLines.push(`<li>${olMatch[1]}</li>`);
      } else {
        // Close any open lists
        if (inUL) {
          processedLines.push('</ul>');
          inUL = false;
        }
        if (inOL) {
          processedLines.push('</ol>');
          inOL = false;
        }
        
        // Add line as paragraph if not empty
        if (line) {
          processedLines.push(`<p>${line}</p>`);
        }
      }
    }
    
    // Close any remaining open lists
    if (inUL) processedLines.push('</ul>');
    if (inOL) processedLines.push('</ol>');

    return processedLines.join('\n');
  };

  const processAIOutput = (content: string): string => {
    if (!content) return '';
    
    if (isLikelyHTML(content)) {
      return content;
    } else if (isLikelyMarkdown(content)) {
      return convertMarkdownToHTML(content);
    } else {
      // Plain text - convert line breaks to HTML
      return content.replace(/\n/g, '<br>');
    }
  };
  
  const handleGenerateText = async () => {
    // Giữ console.log này ở đây vì chúng nằm trong logic điều kiện và hành vi của người dùng
    console.log("Entering handleGenerateText...");
    console.log("Current baseText:", baseText);
    console.log("Checking hasApiKey for handleGenerateText:", hasApiKey);
    console.log("Checking appData.appSettings.googleApiKey for handleGenerateText:", appData?.appSettings?.googleApiKey);

    if (!hasApiKey || !appData?.appSettings?.googleApiKey || !baseText.trim()) {
        console.warn("Generation stopped: Missing API Key or empty base text.");
        if (!hasApiKey || !appData?.appSettings?.googleApiKey) {
            toast({ variant: "destructive", title: "Cấu hình thiếu", description: "Vui lòng cung cấp Google API Key trong cài đặt ứng dụng." });
        } else if (!baseText.trim()) {
            toast({ variant: "destructive", title: "Lỗi đầu vào", description: "Vui lòng nhập nội dung gốc để tạo văn bản." });
        }
        return;
    }
    
    setIsLoading(true);
    
    // Clear output before generating new content
    setOutputText('');
    if (outputEditor) {
      outputEditor.commands.setContent('');
    }
    
    try {
      const result = await writingAssistantAction({
        baseText, prompt, ...settings,
        apiKey: appData.appSettings.googleApiKey, modelName: appData.appSettings.googleModel || 'gemini-1.5-flash',
      });
      console.log("Result from writingAssistantAction:", result); // Log toàn bộ kết quả
      if (result.success && result.result) {
        // Start typing animation instead of setting text directly
        startTypingAnimation(result.result.mainContent);
        
        // Update current version with new output if exists
        if (currentVersionId && result.result) {
          setContextVersions(prev => prev.map(v => 
            v.id === currentVersionId 
              ? { ...v, outputText: result.result!.mainContent }
              : v
          ));
        }
        
        addToHistory({ title: result.result.summaryTitle, baseText, prompt, outputText: result.result.mainContent, settings });
      } else {
        // Đảm bảo thông báo lỗi cụ thể hơn
        const errorMessage = result.error || 'Unknown error occurred during AI writing action.';
        console.error("Error from writingAssistantAction:", errorMessage); // Log lỗi chi tiết
        throw new Error(errorMessage); // Ném lỗi để toast xử lý
      }
    } catch (err: any) {
      console.error("Caught error in handleGenerateText:", err); // Log lỗi chi tiết từ catch
      toast({ variant: "destructive", title: "Lỗi tạo văn bản AI", description: err instanceof Error ? err.message : JSON.stringify(err) });
    } finally { setIsLoading(false); }
  };
  
  const loadHistoryItem = (item: HistoryItem, loadOutput: boolean = true) => { 
    setPrompt(item.prompt); 
    setBaseText(item.baseText); 
    setSettings(item.settings);
    
    // Only load output if explicitly requested (for history viewing)
    if (loadOutput) {
      // Stop any ongoing typing animation
      setIsTyping(false);
      setTypingText('');
      setShowCursor(false);
      
      const processedContent = processAIOutput(item.outputText);
      setOutputText(processedContent); 
    }
    
    // Load associated versions
    if (item.versions) {
      setContextVersions(item.versions);
      setCurrentVersionId(item.currentVersionId || null);
    }
    
    toast({title:`Loaded: ${item.title}`}); 
  };
  const loadPreset = (preset: Preset) => {setSettings(preset); toast({title:`Loaded: ${preset.name}`})};
  const deletePreset = (id: string) => setPresets(presets.filter(p=>p.id !== id));
  const handleOpenSavePresetDialog = () => {setPresetName(''); setIsPresetDialogOpen(true)};
  const confirmSavePreset = () => { if(presetName.trim()){ setPresets(p => [...p, {id:`p-${Date.now()}`, name:presetName.trim(), ...settings}]); setIsPresetDialogOpen(false); toast({title:"Preset Saved!"}) }};
  
  const moveResultToContext = () => {
    const currentHTML = outputEditor?.getHTML() || outputText;
    const plainText = outputEditor?.getText() || '';
    
    console.log('Moving result to context');
    console.log('Current HTML:', currentHTML);
    console.log('Current outputText:', outputText);
    
    // Create a new version from current context if it exists and is different
    if (baseText.trim()) {
      const newVersion: ContextVersion = {
        id: `version-${Date.now()}`,
        text: baseText,
        timestamp: new Date().toISOString(),
        label: `Version ${contextVersions.length + 1}`,
        outputText: currentHTML // Save current output with this version
      };
      
      console.log('Creating new version with outputText:', currentHTML);
      
      // Check if this version already exists
      const existingVersion = contextVersions.find(v => v.text === baseText);
      if (!existingVersion) {
        setContextVersions(prev => [...prev, newVersion]);
        setCurrentVersionId(newVersion.id);
      } else {
        // Update existing version with current output
        setContextVersions(prev => prev.map(v => 
          v.id === existingVersion.id 
            ? { ...v, outputText: currentHTML }
            : v
        ));
        setCurrentVersionId(existingVersion.id);
      }
    }
    
    // Set new context content
    const newContextText = isLikelyHTML(currentHTML) ? plainText : currentHTML;
    setBaseText(newContextText);
    
    toast({ title: 'Đã chuyển kết quả vào Context và tạo version mới' });
  };

  const restoreVersion = (versionId: string) => {
    const version = contextVersions.find(v => v.id === versionId);
    if (!version) return;
    
    console.log('Restoring version:', version);
    console.log('Version has outputText:', !!version.outputText);
    
    // Save current context as new version if different
    if (baseText.trim() && baseText !== version.text) {
      const currentHTML = outputEditor?.getHTML() || outputText;
      const currentVersion: ContextVersion = {
        id: `version-${Date.now()}`,
        text: baseText,
        timestamp: new Date().toISOString(),
        label: `Version ${contextVersions.length + 1} (Auto-saved)`,
        outputText: currentHTML
      };
      setContextVersions(prev => [...prev, currentVersion]);
    }
    
    setBaseText(version.text);
    setCurrentVersionId(version.id);
    
    // Restore associated output if available
    if (version.outputText) {
      const processedContent = processAIOutput(version.outputText);
      console.log('Setting output text to:', processedContent);
      
      // Stop any ongoing typing animation
      setIsTyping(false);
      setTypingText('');
      setShowCursor(false);
      
      setOutputText(processedContent);
      
      // Force update the editor content with a slight delay to ensure state is updated
      setTimeout(() => {
        if (outputEditor) {
          console.log('Updating editor content with delay');
          outputEditor.commands.setContent(processedContent);
        }
      }, 100);
    } else {
      console.log('No output text in version, clearing');
      // Clear output if no output is associated with this version
      setOutputText('');
      if (outputEditor) {
        outputEditor.commands.setContent('');
      }
    }
    
    setIsVersionDialogOpen(false);
    toast({ title: `Đã khôi phục ${version.label}` });
  };

  const deleteVersion = (versionId: string) => {
    setContextVersions(prev => prev.filter(v => v.id !== versionId));
    if (currentVersionId === versionId) {
      setCurrentVersionId(null);
    }
    toast({ title: 'Đã xóa version' });
  };
  
  return (<>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-full">
      <div className="lg:col-span-1 space-y-6">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-lg">{T.controls || 'Controls'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsControlDialogOpen(true)}>
                  <Expand className="w-4 h-4"/>
                </Button>
              </CardHeader>
              <CardContent>
                <ControlPanel 
                  baseText={baseText}
                  prompt={prompt}
                  settings={settings}
                  isLoading={isLoading}
                  onBaseTextChange={setBaseText}
                  onPromptChange={setPrompt}
                  onSettingsChange={setSettings}
      onGenerate={handleGenerateText}
      T={T}
                />
              </CardContent>
          </Card>
          <Card>
    <Tabs defaultValue="presets"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="presets">{T.presetsLabel || 'Presets'}</TabsTrigger><TabsTrigger value="history">{T.historyLabel || 'History'}</TabsTrigger></TabsList>
                <TabsContent value="presets" className="m-0">
        <div className="border-t p-2"><Button onClick={handleOpenSavePresetDialog} className="w-full" size="sm" variant="outline"><Save className="w-4 h-4 mr-2"/>{T.saveCurrent || 'Save Current'}</Button></div>
                    <CardContent className="p-2 max-h-[250px] overflow-y-auto">{presets.length>0 ? presets.map(p=><div key={p.id} className="flex group items-center text-sm"><Button variant="link" onClick={()=>loadPreset(p)} className="flex-1 justify-start h-auto font-normal truncate p-1">{p.name}</Button><Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100" onClick={()=>deletePreset(p.id)}><Trash2 className="w-4 h-4"/></Button></div>):<p className="text-center p-4">No presets.</p>}</CardContent>
                </TabsContent>
                <TabsContent value="history" className="m-0">
                    <CardContent className="p-2 max-h-[280px] overflow-y-auto">{history.length>0?history.map(h=><div key={h.id} className="flex group items-center border-b p-1 text-sm"><div className="flex-1 overflow-hidden cursor-pointer" onClick={()=>loadHistoryItem(h, true)}><p className="font-semibold truncate">{h.title}</p><p className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</p></div><Button variant="ghost" size="icon" className="w-8 h-8 shrink-0 opacity-0 group-hover:opacity-100" onClick={(e)=>{e.stopPropagation();deleteHistoryItem(h.id)}}><Trash2 className="w-4 h-4"/></Button></div>):<p className="text-center p-4">No history.</p>}</CardContent>
                </TabsContent>
            </Tabs>
          </Card>
      </div>
      <div className="lg:col-span-2 h-full">
          <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row justify-between items-center py-3">
                  <CardTitle className="text-lg">{T.resultLabel || 'Result'}</CardTitle>
                  <div className="flex gap-2">
                      {Array.isArray(contextVersions) && contextVersions.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsVersionDialogOpen(true)}
                          className="h-8 text-xs"
                        >
                          <History className="mr-1 h-3 w-3"/>
                          {T.versions || 'Versions'} ({contextVersions.length})
                        </Button>
                      )}
                      <Button variant="outline" size="sm" disabled={!outputText} onClick={moveResultToContext}>
                        <Upload className="mr-2 w-4 h-4"/>
                        {T.useAsContext || 'Use as Context'}
                      </Button>
                      <Button variant="ghost" size="sm" disabled={!outputText} onClick={()=>{const c = outputEditor?.getHTML() || outputText; if(c) navigator.clipboard.writeText(c)}}>
                        <Copy className="mr-2 w-4 h-4"/>
                        {T.copy || 'Copy'}
                      </Button>
                  </div>
              </CardHeader>
              <CardContent className="flex-1 p-2">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin"/>
                    </div>
                  ) : isTyping ? (
                    <div className="p-2 rounded-md outline-none focus:outline-none border-0 ring-0 tiptap-content">
                      <div className="flex justify-between items-start mb-2">
                        <div 
                          className="typing-animation flex-1 prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={renderTypingContent(typingText, showCursor)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={stopTypingAnimation}
                          className="ml-2 text-xs"
                        >
                          {T.skip || 'Skip'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-md outline-none focus:outline-none border-0 ring-0 tiptap-content">
                      <EditorContent 
                        editor={outputEditor}
                        onBlur={() => {
                          const content = outputEditor?.getHTML() || '';
                          setOutputText(content);
                        }}
                      />
                    </div>
                  )}
              </CardContent>
          </Card>
      </div>
    </div>
    <Dialog open={isControlDialogOpen} onOpenChange={setIsControlDialogOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{T.editControlsExpanded || 'Edit Controls (Expanded)'}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <ControlPanel 
            inDialog={true}
            baseText={baseText}
            prompt={prompt}
            settings={settings}
            isLoading={isLoading}
            onBaseTextChange={setBaseText}
            onPromptChange={setPrompt}
            onSettingsChange={setSettings}
            onGenerate={handleGenerateText}
            T={T}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => setIsControlDialogOpen(false)}>{T.done || 'Done'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{T.savePreset || 'Save Preset'}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="preset-name">{T.presetName || 'Preset Name'}</Label>
          <Input 
            id="preset-name" 
            value={presetName} 
            onChange={(e) => setPresetName(e.target.value)}
            placeholder={T.presetNamePlaceholder || 'Enter preset name...'}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsPresetDialogOpen(false)}>{T.cancel || 'Cancel'}</Button>
          <Button onClick={confirmSavePreset} disabled={!presetName.trim()}>{T.save || 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{T.contextVersions || 'Context Versions'}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {!Array.isArray(contextVersions) || contextVersions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{T.noVersionsAvailable || 'No versions available'}</p>
          ) : (
            contextVersions.map((version) => (
              <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{version.label}</p>
                    {version.id === currentVersionId && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{T.current || 'Current'}</span>
                    )}
                    {version.outputText && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{T.hasResult || 'Has Result'}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(version.timestamp).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {T.contextLabel || 'Context'}: {version.text.substring(0, 60)}...
                  </p>
                  {version.outputText && (
                    <p className="text-xs text-green-700 truncate mt-1">
                      {T.resultLabel || 'Result'}: {version.outputText.replace(/<[^>]*>/g, '').substring(0, 60)}...
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  {version.id !== currentVersionId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreVersion(version.id)}
                    >
                      {T.restore || 'Restore'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteVersion(version.id)}
                  >
                    <Trash2 className="w-4 h-4"/>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => setIsVersionDialogOpen(false)}>{T.close || 'Close'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>);
}

export default AIWritingSupport;

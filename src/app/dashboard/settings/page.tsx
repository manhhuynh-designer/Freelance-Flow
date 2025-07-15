
"use client";

// Status color presets (restored, single declaration)
const predefinedStatusColors: { name: string; colors: StatusColors }[] = [
    {
        name: 'Default',
        colors: {
            todo: '#a855f7', // purple-500
            inprogress: '#eab308', // yellow-500
            done: '#22c55e', // green-500
            onhold: '#f97316', // orange-500
            archived: '#64748b', // slate-500
        }
    },
    {
        name: 'Vibrant',
        colors: {
            todo: '#ef4444', // red-500
            inprogress: '#3b82f6', // blue-500
            done: '#16a34a', // green-600
            onhold: '#f59e0b', // amber-500
            archived: '#4b5563', // gray-600
        }
    },
    {
        name: 'Pastel',
        colors: {
            todo: '#f9a8d4', // pink-300
            inprogress: '#93c5fd', // blue-300
            done: '#a7f3d0', // green-200
            onhold: '#fde68a', // amber-200
            archived: '#d1d5db', // gray-300
        }
    }
];

import React, { useState, useRef, useEffect } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { QuestionMarkIcon } from '@/components/ui/question-mark-icon';
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from "@/lib/utils";
import { Slider } from '@/components/ui/slider';
import { i18n } from "@/lib/i18n";
import { Separator } from '@/components/ui/separator';
import type { AppSettings, ThemeSettings, StatusColors, AppData, DashboardColumn, WidgetSetting } from '@/lib/types';
import { categories as initialCategories, STATUS_INFO } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';
import { CollaboratorDataService } from '@/lib/collaborator-data-service';
import { StatusSettings } from '@/components/status-settings';
import { LocalBackupManager } from '@/components/local-backup-manager';
import { getThemeBackgroundColorHsl, getContrastingTextColor } from "@/lib/colors";

import { WIDGETS } from '@/lib/widgets';

const predefinedThemes: { name: string; colors: ThemeSettings & { background: string } }[] = [
    { name: 'Default', colors: { primary: "#2A5EE5", accent: "#ffffff", background: "#f5f6fa" } },
    { name: 'Teal', colors: { primary: "#14B8B8", accent: "#109393", background: "#e6f7f7" } },
    { name: 'Crimson', colors: { primary: "#DC2638", accent: "#C01D2E", background: "#fff5f6" } },
    { name: 'Forest', colors: { primary: "#52A852", accent: "#438A43", background: "#f3f9f3" } },
    { name: 'Violet', colors: { primary: "#6C28E3", accent: "#561EC5", background: "#f7f5fa" } },
    { name: 'Lavender', colors: { primary: "#B5A6F9", accent: "#9885F7", background: "#f8f7fc" } },
    { name: 'Mint', colors: { primary: "#A6F2CF", accent: "#81EAB8", background: "#f5fcf8" } },
    { name: 'Sky', colors: { primary: "#A5DEF9", accent: "#82CBF6", background: "#f5fbfd" } },
    { name: 'Peach', colors: { primary: "#FFC999", accent: "#FFB366", background: "#fff8f3" } },
    { name: 'Monochrome', colors: { primary: "#353B41", accent: "#F2f2f2", background: "#f4f4f4" } }
];

// (Removed duplicate declaration)

const defaultSettings: Omit<AppSettings, 'theme' | 'statusColors' | 'stickyNoteColor' | 'dashboardColumns' | 'statusSettings' | 'widgets'> = {
    trashAutoDeleteDays: 30,
    language: 'en',
    currency: 'VND',
    preferredModelProvider: 'google',
    googleApiKey: '',
    openaiApiKey: '',
    googleModel: 'gemini-1.5-flash',
    openaiModel: 'gpt-4o-mini',
};



import { Suspense } from "react";

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="p-4 md:p-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-96 w-full" /></div>}>
            <SettingsPageContent />
        </Suspense>
    );
}

function SettingsPageContent() {
    const dashboardContext = useDashboard();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
    const [restoredData, setRestoredData] = useState<AppData | null>(null);
    const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
    const [clearConfirmText, setClearConfirmText] = useState("");
    
    const [originalSettings, setOriginalSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
      if (dashboardContext?.appSettings && !originalSettings) {
        setOriginalSettings(JSON.parse(JSON.stringify(dashboardContext.appSettings)));
      }
    }, [dashboardContext?.appSettings, originalSettings]);

    if (!dashboardContext) {
      return (
        <div className="p-4 md:p-6">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    const { 
        appSettings,
        handleClearAllData, 
        tasks, 
        quotes, 
        collaboratorQuotes, 
        clients, 
        collaborators, 
        quoteTemplates, 
        categories,
        setTasks,
        setQuotes,
        setCollaboratorQuotes,
        setClients,
        setCollaborators,
        setQuoteTemplates,
        setCategories,
        setAppSettings
    } = dashboardContext;

    const onSettingsChange = setAppSettings;
    const appData = { tasks, quotes, collaboratorQuotes, clients, collaborators, quoteTemplates, categories, appSettings };

    const T = i18n[appSettings.language];
    
    const handleReset = () => {
        onSettingsChange(currentSettings => ({
            ...currentSettings,
            ...defaultSettings,
            theme: predefinedThemes[0].colors,
            statusColors: predefinedStatusColors[0].colors,
            stickyNoteColor: { background: '#fef9c3', foreground: '#713f12' },
            dashboardColumns: [
                { id: 'name', label: 'Task', visible: true },
                { id: 'client', label: 'Client', visible: true },
                { id: 'category', label: 'Category', visible: true },
                { id: 'deadline', label: 'Deadline', visible: true },
                { id: 'status', label: 'Status', visible: true },
                { id: 'priceQuote', label: 'Quote', visible: true },
            ],
            statusSettings: [
                { id: 'todo', label: i18n.en.statuses.todo, subStatuses: [] },
                { id: 'inprogress', label: i18n.en.statuses.inprogress, subStatuses: [] },
                { id: 'done', label: i18n.en.statuses.done, subStatuses: [] },
                { id: 'onhold', label: i18n.en.statuses.onhold, subStatuses: [] },
                { id: 'archived', label: i18n.en.statuses.archived, subStatuses: [] },
            ],
            widgets: [
              { id: 'calculator', enabled: true, showInSidebar: true, colSpan: 1, rowSpan: 1 },
              { id: 'sticky-notes', enabled: true, showInSidebar: true, colSpan: 2, rowSpan: 2 },
            ]
        }));
        toast({
            title: T.settingsReset,
            description: T.settingsResetDesc,
        });
    }

    const handleThemeChange = (themeName: string) => {
        const selectedTheme = predefinedThemes.find(t => t.name === themeName);
        if (selectedTheme) {
            onSettingsChange(s => ({ ...s, theme: selectedTheme.colors }));
        }
    }

    const handleStatusPresetChange = (name: string) => {
        const selected = predefinedStatusColors.find(p => p.name === name);
        if (selected) {
            onSettingsChange(s => ({ ...s, statusColors: selected.colors }));
        }
    }

    const handleStickyNoteBgChange = (color: string) => {
        onSettingsChange(s => ({
            ...s,
            stickyNoteColor: {
                background: color,
                foreground: getContrastingTextColor(color)
            }
        }));
    }

    const activeThemeName = predefinedThemes.find(t => 
        t.colors.primary === appSettings.theme.primary &&
        t.colors.accent === appSettings.theme.accent
    )?.name || 'Custom';
    
    const activeStatusPresetName = predefinedStatusColors.find(p => 
        JSON.stringify(p.colors) === JSON.stringify(appSettings.statusColors)
    )?.name || 'Custom';

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
        try {
            const text = e.target?.result;
            const data = JSON.parse(text as string) as AppData;
            if (data.tasks && data.clients && data.appSettings) {
            setRestoredData(data);
            setIsConfirmRestoreOpen(true);
            } else {
            throw new Error(T.restoreFailedDesc);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: T.restoreFailed, description: (error as Error).message });
        }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleConfirmRestore = () => {
        if (restoredData) {
            const parsedTasks = restoredData.tasks.map(task => ({
                ...task,
                startDate: new Date(task.startDate),
                deadline: new Date(task.deadline),
                deletedAt: task.deletedAt ? new Date(task.deletedAt).toISOString() : undefined,
            }));

            // Sync collaborator data to ensure integrity using special import processing
            const syncedData = CollaboratorDataService.processImportedData({
                ...restoredData,
                tasks: parsedTasks
            });

            setTasks(syncedData.tasks);
            setQuotes(syncedData.quotes || []);
            setCollaboratorQuotes(syncedData.collaboratorQuotes || []);
            setClients(syncedData.clients || []);
            setCollaborators(syncedData.collaborators);
            setQuoteTemplates(syncedData.quoteTemplates || []);
            setCategories(syncedData.categories || []);
            setAppSettings(syncedData.appSettings || defaultSettings as AppSettings);
            
            setIsConfirmRestoreOpen(false);
            setRestoredData(null);
            toast({ title: T.restoreSuccessful, description: T.restoreSuccessfulDesc });
            setTimeout(() => window.location.reload(), 1000);
        }
    };

    const handleClearData = () => {
        handleClearAllData();
        toast({
            title: T.clearAllData,
            description: T.clearAllDataDesc,
        });
    }

    const confirmationText = appSettings.language === 'vi' ? 'XÓA' : 'DELETE';

    return (
        <>
            <div className="p-4 md:p-6">
                <Tabs defaultValue="appearance" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="appearance">{T.tabAppearance}</TabsTrigger>
                        <TabsTrigger value="general">{T.tabGeneral}</TabsTrigger>
                        <TabsTrigger value="statuses">{T.tabStatuses}</TabsTrigger>
                        <TabsTrigger value="api">{T.tabApi}</TabsTrigger>
                        <TabsTrigger value="data">{T.tabData}</TabsTrigger>
                    </TabsList>
                    {/* --- Appearance Tab --- */}
                    <TabsContent value="appearance">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{T.appearanceSettings}</CardTitle>
                                <CardDescription>{T.appearanceSettingsDesc}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>{T.themeMode}</Label>
                                    <ThemeToggle />
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                    <Label>{T.themeColor}</Label>
                                    <RadioGroup value={activeThemeName} onValueChange={handleThemeChange} className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {predefinedThemes.map(theme => (
                                            <div key={theme.name}>
                                                <RadioGroupItem value={theme.name} id={theme.name} className="peer sr-only" />
                                                <Label
                                                    htmlFor={theme.name}
                                                    className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer","peer-data-[state=checked]:border-primary")}
                                                >
                                                    <div
                                                      className="w-full h-8 rounded"
                                                      style={{ backgroundColor: theme.colors.primary }}
                                                    />
                                                    <span className="mt-2 font-semibold">{theme.name}</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                    <Label>{T.statusColors}</Label>
                                    <RadioGroup value={activeStatusPresetName} onValueChange={handleStatusPresetChange} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {predefinedStatusColors.map(preset => (
                                            <div key={preset.name}>
                                                <RadioGroupItem value={preset.name} id={`status-${preset.name}`} className="peer sr-only" />
                                                <Label
                                                    htmlFor={`status-${preset.name}`}
                                                    className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer","peer-data-[state=checked]:border-primary")}
                                                >
                                                    <div className="flex gap-2 w-full h-8 items-center">
                                                        {Object.values(preset.colors).map((color, index) => (
                                                          <div
                                                            key={index}
                                                            className={`w-1/5 h-5 rounded-full`}
                                                            style={{ background: color, backgroundColor: color }}
                                                          />
                                                        ))}
                                                    </div>
                                                    <span className="mt-2 font-semibold">{preset.name}</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                    <Label>{T.dashboardColumns}</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(appSettings.dashboardColumns || []).map((column) => {
                                            // Ensure label is always a string for type safety
                                            const labelKey = column.id === 'name' ? 'taskName' : column.id === 'priceQuote' ? 'priceQuote' : column.id;
                                            let columnLabel: string = column.label;
                                            const tValue = T[labelKey as keyof typeof T];
                                            if (typeof tValue === 'string') {
                                              columnLabel = tValue;
                                            }
                                            return (
                                                <div key={column.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`col-${column.id}`}
                                                    checked={column.visible}
                                                    onCheckedChange={(checked) => {
                                                        onSettingsChange(s => ({
                                                            ...s,
                                                            dashboardColumns: (s.dashboardColumns || []).map(c => 
                                                            c.id === column.id ? { ...c, visible: !!checked } : c
                                                            )
                                                        }));
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`col-${column.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {columnLabel}
                                                </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                 <Separator />
                                <div className="space-y-2">
                                    <Label htmlFor="sticky-note-color">{T.stickyNoteBackground}</Label>
                                    <Input
                                        id="sticky-note-color"
                                        type="color"
                                        value={appSettings.stickyNoteColor.background}
                                        onChange={(e) => handleStickyNoteBgChange(e.target.value)}
                                        className="p-1 h-10 w-14"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="general">
                        <Card>
                            <CardHeader><CardTitle className="text-base">{T.otherColorsAndSettings}</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <Label>{T.language}</Label>
                                    <RadioGroup value={appSettings.language} onValueChange={(value) => onSettingsChange(s => ({ ...s, language: value as 'en' | 'vi' }))} className="flex gap-4">
                                        <div key="en"><RadioGroupItem value="en" id="lang-en" className="peer sr-only" /><Label htmlFor="lang-en" className={cn("flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 px-3 hover:bg-accent hover:text-accent-foreground cursor-pointer h-10", "peer-data-[state=checked]:border-primary")}><svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-auto mr-2 rounded-sm"><rect width="24" height="16" fill="#012169"/><path d="M0 0L24 16M24 0L0 16" stroke="white" strokeWidth="2"/><path d="M12 0V16M0 8H24" stroke="white" strokeWidth="4"/><path d="M12 0V16M0 8H24" stroke="#C8102E" strokeWidth="2"/></svg><span className="font-medium">English</span></Label></div>
                                        <div key="vi"><RadioGroupItem value="vi" id="lang-vi" className="peer sr-only" /><Label htmlFor="lang-vi" className={cn("flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 px-3 hover:bg-accent hover:text-accent-foreground cursor-pointer h-10", "peer-data-[state=checked]:border-primary")}><svg width="24" height="16" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-auto mr-2 rounded-sm"><rect width="24" height="16" fill="#DA251D"/><path d="M12 2.5L13.657 7.236H18.633L14.488 10.127L16.145 14.864L12 11.973L7.855 14.864L9.512 10.127L5.367 7.236H10.343L12 2.5Z" fill="#FFFF00"/></svg><span className="font-medium">Tiếng Việt</span></Label></div>
                                    </RadioGroup>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label>{T.currency}</Label>
                                    <Select value={appSettings.currency} onValueChange={(value) => onSettingsChange(s => ({ ...s, currency: value as 'VND' | 'USD' }))}>
                                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select a currency" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VND">{T.VND} (₫)</SelectItem>
                                            <SelectItem value="USD">{T.USD} ($)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label htmlFor="trash-days">{T.autoDeleteTrash}: {appSettings.trashAutoDeleteDays} {T.days}</Label>
                                    <Slider id="trash-days" min={7} max={90} step={1} value={[appSettings.trashAutoDeleteDays]} onValueChange={(value) => onSettingsChange(s => ({ ...s, trashAutoDeleteDays: value[0] }))} />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="statuses">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{T.statusSettings}</CardTitle>
                                <CardDescription>{T.statusSettingsDesc}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <StatusSettings settings={appSettings} onSettingsChange={setAppSettings} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="api">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{T.apiSettings}</CardTitle>
                                <CardDescription>{T.apiKeyDescription}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <Label>{T.modelProvider}</Label>
                                    <RadioGroup value={appSettings.preferredModelProvider} onValueChange={(value) => onSettingsChange(s => ({ ...s, preferredModelProvider: value as 'google' | 'openai' }))} className="flex gap-4">
                                        <div key="google"><RadioGroupItem value="google" id="provider-google" className="peer sr-only" /><Label htmlFor="provider-google" className={cn("flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 px-3 hover:bg-accent hover:text-accent-foreground cursor-pointer h-10", "peer-data-[state=checked]:border-primary")}>Google AI</Label></div>
                                        <div key="openai"><RadioGroupItem value="openai" id="provider-openai" className="peer sr-only" /><Label htmlFor="provider-openai" className={cn("flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 px-3 hover:bg-accent hover:text-accent-foreground cursor-pointer h-10", "peer-data-[state=checked]:border-primary")}>OpenAI</Label></div>
                                    </RadioGroup>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="google-model">{T.googleModel}</Label>
                                        <Select value={appSettings.googleModel || 'gemini-1.5-flash'} onValueChange={(value) => onSettingsChange(s => ({ ...s, googleModel: value }))} disabled={appSettings.preferredModelProvider !== 'google'}>
                                            <SelectTrigger id="google-model"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash</SelectItem>
                                                <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="openai-model">{T.openaiModel}</Label>
                                        <Select value={appSettings.openaiModel || 'gpt-4o-mini'} onValueChange={(value) => onSettingsChange(s => ({ ...s, openaiModel: value }))} disabled={appSettings.preferredModelProvider !== 'openai'}>
                                            <SelectTrigger id="openai-model"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                                <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
                                                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="google-api-key">Google AI API Key</Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" tabIndex={-1} title="Hướng dẫn lấy Google API Key">
                                                        <QuestionMarkIcon className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary" />
                                                    </a>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    Dùng để truy cập Gemini. Lấy API key tại Google AI Studio.
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Input id="google-api-key" type="password" placeholder="Enter your Google API Key" value={appSettings.googleApiKey || ''} onChange={(e) => onSettingsChange(s => ({ ...s, googleApiKey: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" tabIndex={-1} title="Hướng dẫn lấy OpenAI API Key">
                                                        <QuestionMarkIcon className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary" />
                                                    </a>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    Dùng để truy cập OpenAI (GPT). Lấy API key tại OpenAI Platform.
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Input id="openai-api-key" type="password" placeholder="Enter your OpenAI API Key" value={appSettings.openaiApiKey || ''} onChange={(e) => onSettingsChange(s => ({ ...s, openaiApiKey: e.target.value }))} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="data">
                        <div className="space-y-6">
                            {/* Header Section */}
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold">{T.dataManagement || 'Data Management'}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {T.dataManagementDesc || 'Backup, restore and manage your data'}
                                </p>
                            </div>

                            {/* Backup & Export Section */}
                            <LocalBackupManager />

                            {/* Import & Restore Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">{T.dataRestore || 'Data Restore'}</CardTitle>
                                    <CardDescription>
                                        {T.restoreDesc}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-medium">{T.selectBackupFile || 'Select backup file'}</p>
                                                <p className="text-sm text-muted-foreground">{T.supportedFormat || 'Supported format: .json'}</p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            {T.selectFile || 'Select File'}
                                        </Button>
                                    </div>
                                        
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        aria-label="Import backup JSON"
                                    />
                                </CardContent>
                            </Card>

                            {/* Danger Zone */}
                            <Card className="border-destructive/20">
                                <CardHeader>
                                    <CardTitle className="text-lg text-destructive">{T.dangerZone}</CardTitle>
                                    <CardDescription>
                                        {T.dangerZoneDesc}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="font-medium">{T.clearAllData}</p>
                                                <p className="text-sm text-muted-foreground">{T.clearAllDataDesc}</p>
                                            </div>
                                        </div>
                                        <AlertDialog open={isConfirmClearOpen} onOpenChange={setIsConfirmClearOpen}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive">
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    {T.clearAllData}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                        </svg>
                                                        {T.clearAllDataWarningTitle}
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription className="space-y-2">
                                                        <p>{T.clearAllDataWarningDesc?.replace('{confirmationText}', confirmationText) || `Type "${confirmationText}" to confirm deleting all data.`}</p>
                                                        <div className="p-3 bg-destructive/10 rounded border border-destructive/20">
                                                            <p className="text-sm text-destructive font-medium">
                                                                ⚠️ {T.warningNotReversible || 'Warning: This action cannot be undone!'}
                                                            </p>
                                                        </div>
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <div className="py-2">
                                                    <Input 
                                                        value={clearConfirmText} 
                                                        onChange={(e) => setClearConfirmText(e.target.value)} 
                                                        placeholder={appSettings.language === 'vi' ? `Gõ "${confirmationText}" để xác nhận` : `Type "${confirmationText}" to confirm`}
                                                        className="border-destructive/20 focus:border-destructive"
                                                    />
                                                </div>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setClearConfirmText('')}>
                                                        {T.cancel}
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        disabled={clearConfirmText !== confirmationText} 
                                                        className={cn(buttonVariants({ variant: "destructive" }))} 
                                                        onClick={handleClearData}
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        {T.confirmClear}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
                <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={handleReset}>{T.resetToDefaults}</Button>
                </div>
            </div>
             <AlertDialog open={isConfirmRestoreOpen} onOpenChange={setIsConfirmRestoreOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{T.importWarningTitle}</AlertDialogTitle>
                    <AlertDialogDescription>{T.importWarningDesc}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRestoredData(null)}>{T.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmRestore}>{T.confirmImport}</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

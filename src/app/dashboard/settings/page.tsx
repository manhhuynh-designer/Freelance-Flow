
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
import { StatusSettings } from '@/components/status-settings';
import { getThemeBackgroundColorHsl, getContrastingTextColor } from "@/lib/colors";

import { WIDGETS } from '@/lib/widgets';

const predefinedThemes: { name: string; colors: ThemeSettings }[] = [
    { name: 'Default', colors: { primary: "221 83% 53%", accent: "221 83% 53%" } },
    { name: 'Teal', colors: { primary: "180 80% 40%", accent: "180 80% 40%" } },
    { name: 'Crimson', colors: { primary: "348 83% 47%", accent: "348 83% 47%" } },
    { name: 'Forest', colors: { primary: "120 39% 49%", accent: "120 39% 49%" } },
    { name: 'Violet', colors: { primary: "262 83% 58%", accent: "262 83% 58%" } },
    { name: 'Lavender', colors: { primary: "250 60% 80%", accent: "250 60% 80%" } },
    { name: 'Mint', colors: { primary: "150 55% 75%", accent: "150 55% 75%" } },
    { name: 'Sky', colors: { primary: "195 75% 78%", accent: "195 75% 78%" } },
    { name: 'Peach', colors: { primary: "28 100% 80%", accent: "28 100% 80%" } },
    { name: 'Monochrome', colors: { primary: "0 0% 50%", accent: "0 0% 50%" } }
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
            setTasks(parsedTasks);
            setQuotes(restoredData.quotes || []);
            setCollaboratorQuotes(restoredData.collaboratorQuotes || []);
            setClients(restoredData.clients || []);
            setCollaborators(restoredData.collaborators || []);
            setQuoteTemplates(restoredData.quoteTemplates || []);
            setCategories(restoredData.categories || []);
            setAppSettings(restoredData.appSettings || defaultSettings as AppSettings);
            
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
                                                    <div className="flex gap-2 w-full h-8">
                                                      <div
                                                        className="w-1/2 rounded"
                                                        style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                                                      />
                                                      <div
                                                        className="w-1/2 rounded border"
                                                        style={{ backgroundColor: getThemeBackgroundColorHsl(theme.colors.primary) }}
                                                      />
                                                    </div>
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
                                        <Label htmlFor="google-api-key">Google AI API Key</Label>
                                        <Input id="google-api-key" type="password" placeholder="Enter your Google API Key" value={appSettings.googleApiKey || ''} onChange={(e) => onSettingsChange(s => ({ ...s, googleApiKey: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                                        <Input id="openai-api-key" type="password" placeholder="Enter your OpenAI API Key" value={appSettings.openaiApiKey || ''} onChange={(e) => onSettingsChange(s => ({ ...s, openaiApiKey: e.target.value }))} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="data">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{T.backupAndRestore}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>{T.exportData}</Label>
                                    <p className="text-sm text-muted-foreground">{T.backupDesc}</p>
                                    <Button onClick={() => {
                                        const jsonString = JSON.stringify(appData, null, 2);
                                        const blob = new Blob([jsonString], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.download = `freelance-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
                                        link.href = url;
                                        link.setAttribute('aria-label', 'Download backup JSON');
                                        link.setAttribute('title', 'Download backup JSON');
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                        toast({ title: T.backupSuccessful, description: T.backupSuccessfulDesc });
                                    }}>{T.exportData}</Button>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <Label>{T.importData}</Label>
                                    <p className="text-sm text-muted-foreground">{T.restoreDesc}</p>
                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>{T.importData}</Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        aria-label="Import backup JSON"
                                        title="Import backup JSON"
                                        placeholder="Import backup JSON"
                                    />
                                </div>
                                <Separator />
                                <Card className="border-destructive">
                                    <CardHeader>
                                        <CardTitle className="text-base text-destructive">{T.dangerZone}</CardTitle>
                                        <CardDescription>{T.dangerZoneDesc}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <AlertDialog open={isConfirmClearOpen} onOpenChange={setIsConfirmClearOpen}>
                                            <AlertDialogTrigger asChild><Button variant="destructive">{T.clearAllData}</Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{T.clearAllDataWarningTitle}</AlertDialogTitle>
                                                    <AlertDialogDescription>{T.clearAllDataWarningDesc.replace('{confirmationText}', confirmationText)}</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <div className="py-2">
                                                    <Input value={clearConfirmText} onChange={(e) => setClearConfirmText(e.target.value)} placeholder={appSettings.language === 'vi' ? 'Gõ XÓA để xác nhận' : 'Type DELETE to confirm'} />
                                                </div>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setClearConfirmText('')}>{T.cancel}</AlertDialogCancel>
                                                    <AlertDialogAction disabled={clearConfirmText !== confirmationText} className={cn(buttonVariants({ variant: "destructive" }))} onClick={handleClearData}>{T.confirmClear}</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <p className="text-sm text-muted-foreground mt-2">{T.clearAllDataDesc}</p>
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
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

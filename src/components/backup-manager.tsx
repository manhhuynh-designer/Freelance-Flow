"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/contexts/dashboard-context";
import { useToast } from "@/hooks/use-toast";
import { BackupService } from "@/lib/backup-service";
import { ExcelBackupService } from "@/lib/excel-backup-service";
import { CollaboratorDataService } from "@/lib/collaborator-data-service";
import { i18n } from "@/lib/i18n";
import { LocalBackupService } from "@/lib/local-backup-service";
import { FileSpreadsheet, FileJson, RefreshCw, Shield, FolderOpen, Download, Trash2, MoreVertical, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { AppData } from "@/lib/types";
import { initialAppData } from "@/lib/data";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';

// Dynamic import for cloud backup component
const CloudBackupManager = React.lazy(() => import('./cloud-backup-manager'));

// Supported formats
type BackupFormat = "json" | "excel";

export function BackupManager() {
  const dashboard = useDashboard();
  const { toast } = useToast();

  const [backups, setBackups] = useState<any[]>([]);
  const [folderFiles, setFolderFiles] = useState<{
    name: string; lastModified: number; size: number; type: 'json'|'excel'
  }[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSelectingFolder, setIsSelectingFolder] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'replace'|'join'>("replace");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fsPermission, setFsPermission] = useState<'granted'|'prompt'|'denied'|'unknown'>('unknown');
  const [page, setPage] = useState(1);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedDeleteName, setSelectedDeleteName] = useState<string | null>(null);
  const [selectedDeleteTimestamp, setSelectedDeleteTimestamp] = useState<number | null>(null);

  const lang = (dashboard as any)?.appData?.appSettings?.language as keyof typeof i18n || 'en';
  const T = (i18n as any)[lang] || i18n.en;

  const { defaultExportFormat, setDefaultExportFormat } = dashboard;

  useEffect(() => {
    setBackups(BackupService.getBackups());
    // Restore any persisted local-folder settings (File System Access API) then check permission
    (async () => {
      try {
        await LocalBackupService.restoreSettings?.();
      } catch {}
      try {
        const state = await LocalBackupService.getPermissionState?.('readwrite');
        if (state) setFsPermission(state);
      } catch {}
      await refreshFolderFiles();
    })();

    // Re-check when user returns to the tab (permissions can change)
    const onVisible = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const state = await LocalBackupService.getPermissionState?.('readwrite');
          if (state) setFsPermission(state);
          await refreshFolderFiles();
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Removed legacy local settings row to avoid duplicate UI

  const formatDate = (ts: number) => new Date(ts).toLocaleString();
  const age = (ts: number) => {
    const diff = Date.now() - ts;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} days ago`;
    if (hours > 0) return `${hours} hours ago`;
    return "Just now";
  };

  const refreshBackups = () => { setBackups(BackupService.getBackups()); setPage(1); };
  const refreshFolderFiles = async () => {
    try {
      const hasHandle = LocalBackupService.hasDirectoryHandle?.();
      if (!hasHandle) { setFolderFiles([]); return; }
      const state = await LocalBackupService.getPermissionState?.('readwrite');
      if (state) setFsPermission(state);
      if (state !== 'granted') { setFolderFiles([]); return; }
      const list = await LocalBackupService.listBackupFiles?.();
      setFolderFiles(list || []);
      setPage(1);
    } catch { setFolderFiles([]); }
  };

  const handleReauthorize = async () => {
    try {
      const res = await LocalBackupService.reauthorize?.();
      const state = await LocalBackupService.getPermissionState?.('readwrite');
      if (state) setFsPermission(state);
      if (res) {
  // ensure autosave is on after reconnect
  try { (LocalBackupService as any).enableAutoSave?.(); } catch {}
        toast({ title: T.connected || 'Connected', description: T.folderAccessGranted || 'Folder access granted.' });
        await refreshFolderFiles();
      } else {
        toast({ variant: 'destructive', title: T.permissionRequired || 'Permission required', description: T.folderAccessDenied || 'Cannot access the selected folder.' });
      }
    } catch {}
  };

  // --- Restore helpers ---
  const openRestorePicker = () => fileInputRef.current?.click();
  const importFromFile = async (file: File): Promise<Partial<AppData>> => {
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      // Pre-validate Excel to provide clearer error messages
      try {
        const validation = await ExcelBackupService.validateExcelBackup?.(file as any);
        if (validation && !validation.valid) {
          throw new Error(validation.message || 'Invalid Excel backup file');
        }
      } catch (err: any) {
        throw new Error(err?.message || 'Invalid Excel backup file');
      }
      const imported = await ExcelBackupService.importFromExcel?.(file as any);
      return imported || {};
    }
    const text = await file.text();
    return JSON.parse(text);
  };
  function mergeById<T extends { id: string }>(existing: T[] = [], incoming: T[] = []): T[] {
    const map = new Map<string, T>();
    existing.forEach((x) => x?.id && map.set(x.id, x));
    incoming.forEach((x) => { if (x?.id && !map.has(x.id)) map.set(x.id, x); });
    return Array.from(map.values());
  }
  function normalizeDates(imported: any): any {
    if (!imported) return imported;
    if (Array.isArray(imported.tasks)) {
      imported.tasks = imported.tasks.map((t: any) => ({
        ...t,
        startDate: t.startDate ? new Date(t.startDate) : undefined,
        deadline: t.deadline ? new Date(t.deadline) : undefined,
        deletedAt: t.deletedAt ? new Date(t.deletedAt).toISOString() : undefined,
      }));
    }
    return imported;
  }
  // Ensure items have IDs; otherwise generate one so Join won't drop them
  function ensureIds<T extends { id?: string }>(arr: T[] | undefined, prefix: string): (T & { id: string })[] {
    const now = Date.now();
    return (arr || []).map((item, idx) => {
      const raw = (item?.id ?? '').toString().trim();
      const id = raw ? raw : `${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}-${idx}`;
      return { ...(item as any), id } as T & { id: string };
    });
  }
  const onRestoreFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      let imported = await importFromFile(file);
      imported = normalizeDates(imported);
      // Hydrate IDs for all collections to avoid dropping entries during Join
      (imported as any).tasks = ensureIds((imported as any).tasks, 'task');
      (imported as any).quotes = ensureIds((imported as any).quotes, 'quote');
      (imported as any).collaboratorQuotes = ensureIds((imported as any).collaboratorQuotes, 'collab-quote');
      (imported as any).clients = ensureIds((imported as any).clients, 'client');
      (imported as any).collaborators = ensureIds((imported as any).collaborators, 'collab');
      (imported as any).quoteTemplates = ensureIds((imported as any).quoteTemplates, 'qt');
      (imported as any).categories = ensureIds((imported as any).categories, 'cat');
      (imported as any).notes = ensureIds((imported as any).notes, 'note');
      (imported as any).events = ensureIds((imported as any).events, 'event');
      (imported as any).workSessions = ensureIds((imported as any).workSessions, 'ws');
      (imported as any).expenses = ensureIds((imported as any).expenses, 'exp');
      (imported as any).fixedCosts = ensureIds((imported as any).fixedCosts, 'fc');
      // Restore AI/local-only blocks to localStorage
      try {
        const aiPairs: Array<[string, string]> = [
          ['aiPersistentData', 'freelance-flow-ai-persistent-data'],
          ['aiWritingPresets', 'ai-writing-presets'],
          ['aiWritingHistory', 'ai-writing-history'],
          ['aiWritingVersions', 'ai-writing-versions'],
          ['filterPresets', 'freelance-flow-filter-presets'],
        ];
        aiPairs.forEach(([k, ls]) => {
          const v = (imported as any)[k];
          if (typeof window !== 'undefined' && v !== undefined) {
            localStorage.setItem(ls, JSON.stringify(v));
          }
        });
      } catch {}

      const saveAppData = (dashboard as any).saveAppData as (u: Partial<AppData>) => Promise<void>;
      if (restoreMode === 'replace') {
        // Build a full AppData snapshot and run collaborator sync for consistency
        const fullReplace: AppData = {
          tasks: (imported as any).tasks || [],
          quotes: (imported as any).quotes || [],
          collaboratorQuotes: (imported as any).collaboratorQuotes || [],
          clients: (imported as any).clients || [],
          collaborators: (imported as any).collaborators || [],
          quoteTemplates: (imported as any).quoteTemplates || [],
          categories: (imported as any).categories || [],
          appSettings: (imported as any).appSettings || (dashboard as any).appData?.appSettings || initialAppData.appSettings,
          notes: (imported as any).notes || [],
          events: (imported as any).events || [],
          workSessions: (imported as any).workSessions || [],
          expenses: (imported as any).expenses || [],
          fixedCosts: (imported as any).fixedCosts || [],
        } as AppData;
        const synced = CollaboratorDataService.processImportedData(fullReplace as any);
        await saveAppData(synced as any);
      } else {
        const current = ((dashboard as any).appData || {}) as Partial<AppData> & Record<string, any>;
        const joined: AppData = {
          tasks: mergeById<any>(current.tasks || [], (imported as any).tasks || []) as any,
          quotes: mergeById<any>(current.quotes || [], (imported as any).quotes || []) as any,
          collaboratorQuotes: mergeById<any>(current.collaboratorQuotes || [], (imported as any).collaboratorQuotes || []) as any,
          clients: mergeById<any>(current.clients || [], (imported as any).clients || []) as any,
          collaborators: mergeById<any>(current.collaborators || [], (imported as any).collaborators || []) as any,
          quoteTemplates: mergeById<any>(current.quoteTemplates || [], (imported as any).quoteTemplates || []) as any,
          categories: mergeById<any>(current.categories || [], (imported as any).categories || []) as any,
          appSettings: (current as any).appSettings || initialAppData.appSettings,
          notes: mergeById<any>(current.notes || [], (imported as any).notes || []) as any,
          events: mergeById<any>(current.events || [], (imported as any).events || []) as any,
          workSessions: mergeById<any>(current.workSessions || [], (imported as any).workSessions || []) as any,
          expenses: mergeById<any>(current.expenses || [], (imported as any).expenses || []) as any,
          fixedCosts: mergeById<any>(current.fixedCosts || [], (imported as any).fixedCosts || []) as any,
        } as AppData;
        const syncedJoined = CollaboratorDataService.syncCollaboratorData(joined as any, true);
        await saveAppData(syncedJoined as any);
      }
      toast({ title: T.restoreSuccessful || 'Restore Successful', description: `${file.name} • ${restoreMode.toUpperCase()}` });
      setTimeout(() => window.location.reload(), 500);
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : (T.restoreFailedDesc || 'The selected file is not a valid backup file or is corrupted.');
      toast({ variant: 'destructive', title: T.restoreFailed || 'Restore Failed', description: msg });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Read AI hub/local-only persisted data for inclusion in backups
  const readLocalJson = (key: string) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : undefined; } catch { return undefined; }
  };

  // Create a backup and download it in selected format
  const handleCreateBackup = async (format: BackupFormat = defaultExportFormat) => {
    const current = ((dashboard as any).appData || {}) as Partial<AppData> & Record<string, any>;
    const appData = {
      tasks: current.tasks || [],
      quotes: (current as any).quotes || [],
      collaboratorQuotes: (current as any).collaboratorQuotes || [],
      clients: current.clients || [],
      collaborators: (current as any).collaborators || [],
      quoteTemplates: (current as any).quoteTemplates || [],
      categories: current.categories || [],
      appSettings: current.appSettings || ({} as any),
      notes: (current as any).notes || [],
      events: (current as any).events || [],
      workSessions: (current as any).workSessions || [],
      // Finance extras
      expenses: (current as any).expenses || [],
      fixedCosts: (current as any).fixedCosts || [],
      // Local-only persisted extras (AI hub & presets)
      aiPersistentData: typeof window !== 'undefined' ? readLocalJson('freelance-flow-ai-persistent-data') : undefined,
      aiWritingPresets: typeof window !== 'undefined' ? readLocalJson('ai-writing-presets') : undefined,
      aiWritingHistory: typeof window !== 'undefined' ? readLocalJson('ai-writing-history') : undefined,
      aiWritingVersions: typeof window !== 'undefined' ? readLocalJson('ai-writing-versions') : undefined,
      filterPresets: typeof window !== 'undefined' ? readLocalJson('freelance-flow-filter-presets') : undefined,
    } as any;

    try {
  const hasHandle = LocalBackupService.hasDirectoryHandle?.();
      const folderMode = hasHandle && fsPermission === 'granted';
      if (folderMode) {
        // Create without touching localStorage history
        if (format === 'excel') {
          const { blob, filename } = await ExcelBackupService.createManualBackup(appData);
          await LocalBackupService.saveBlobToFolder?.(blob, filename);
        } else {
          const jsonString = JSON.stringify(appData, null, 2);
          const date = new Date().toISOString().split('T')[0];
          const filename = `freelance-flow-backup-${date}.json`;
          const blob = new Blob([jsonString], { type: 'application/json' });
          await LocalBackupService.saveBlobToFolder?.(blob, filename);
        }
        await refreshFolderFiles();
      } else {
        // Use existing service and download to browser
        const result = await BackupService.createManualBackup(appData, format);
        if (result.blob) {
          const url = URL.createObjectURL(result.blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } else if (result.jsonString) {
          const blob = new Blob([result.jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
        refreshBackups();
      }
      const name = format === "excel" ? "Excel" : "JSON";
      toast({ title: T.backupSuccessful || `${name} Backup Created`, description: T.backupSuccessfulDesc || `A new ${name} backup has been created.` });
    } catch {
      toast({ variant: "destructive", title: "Backup Failed", description: "Failed to create backup." });
    }
  };

  // Restore from a backup in history (stored internally as JSON)
  const handleRestore = async (timestampOrName: number | string) => {
    setIsRestoring(true);
    try {
      let restored: any = null;
      if (typeof timestampOrName === 'number') {
        restored = BackupService.restoreFromBackup(timestampOrName);
      } else {
        // Folder mode: read file by name and parse (JSON or Excel)
        const file = await LocalBackupService.getFileByName?.(timestampOrName);
        if (file) {
          if (file.name.endsWith('.json')) {
            const text = await file.text();
            restored = JSON.parse(text);
          } else if (file.name.endsWith('.xlsx')) {
            // Validate then import Excel
            const validation = await ExcelBackupService.validateExcelBackup?.(file as any);
            if (validation && !validation.valid) {
              throw new Error(validation.message || 'Invalid Excel backup file');
            }
            const imported = await ExcelBackupService.importFromExcel?.(file as any);
            restored = imported;
          }
        }
      }
      if (restored) {
        // If backup contains AI/local-only blocks, restore them to localStorage first
        try {
          const aiKeys = [
            ['aiPersistentData', 'freelance-flow-ai-persistent-data'],
            ['aiWritingPresets', 'ai-writing-presets'],
            ['aiWritingHistory', 'ai-writing-history'],
            ['aiWritingVersions', 'ai-writing-versions'],
            ['filterPresets', 'freelance-flow-filter-presets'],
          ] as const;
          aiKeys.forEach(([inKey, lsKey]) => {
            const v = (restored as any)[inKey];
            if (typeof window !== 'undefined' && v !== undefined) {
              localStorage.setItem(lsKey, JSON.stringify(v));
            }
          });
        } catch {}

  const parsedTasks = (Array.isArray(restored.tasks) ? restored.tasks : []).map((t: any) => ({
          ...t,
          startDate: new Date(t.startDate),
          deadline: new Date(t.deadline),
          deletedAt: t.deletedAt ? new Date(t.deletedAt).toISOString() : undefined,
        }));
        const synced = CollaboratorDataService.processImportedData({ ...restored, tasks: parsedTasks });
        await (dashboard as any).saveAppData({
          tasks: synced.tasks,
          quotes: synced.quotes || [],
          collaboratorQuotes: synced.collaboratorQuotes || [],
          clients: synced.clients || [],
          collaborators: synced.collaborators || [],
          quoteTemplates: synced.quoteTemplates || [],
          categories: synced.categories || [],
          appSettings: synced.appSettings,
          notes: synced.notes || [],
          events: synced.events || [],
          workSessions: synced.workSessions || [],
          expenses: (synced as any).expenses || [],
          fixedCosts: (synced as any).fixedCosts || [],
        });
        toast({ title: "Data Restored", description: "Your data has been restored." });
  setTimeout(() => window.location.reload(), 500);
      }
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : (T.restoreFailedDesc || 'The selected file is not a valid backup file or is corrupted.');
      toast({ variant: "destructive", title: T.restoreFailed || "Restore Failed", description: msg });
    } finally {
      setIsRestoring(false);
    }
  };

  // Local folder selection (optional, when browser supports File System Access API)
  const isFsSupported = !!LocalBackupService.isFileSystemAccessSupported?.();

  const handleSelectFolder = async () => {
    if (!isFsSupported) {
      toast({
        variant: "destructive",
        title: T.browserNotSupported || "Browser Not Supported",
        description:
          T.folderSelectUnsupportedDesc ||
          "Your browser doesn't support folder selection. Please use Chrome 86+ or Edge 86+.",
      });
      return;
    }
    setIsSelectingFolder(true);
    try {
  const success = await LocalBackupService.selectBackupFolder?.();
    if (success) {
        // Optionally auto-save immediately
        try {
      // ensure autosave is on after selecting folder
      (LocalBackupService as any).enableAutoSave?.();
          await LocalBackupService.autoSaveIfNeeded?.(dashboard);
        } catch {}
  toast({
          title: T.folderSelected || "Folder Selected",
          description:
            T.folderSelectedDesc ||
            "Backup folder has been set. Auto-save is now enabled for this session.",
        });
  await refreshFolderFiles();
      } else {
        toast({
          variant: "destructive",
          title: T.selectionFailed || "Selection Failed",
          description: T.selectionFailedDesc || "Could not select backup folder. Please try again.",
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: T.selectionFailed || "Selection Failed",
        description: T.selectionFailedDesc || "Could not select backup folder. Please try again.",
      });
    } finally {
      setIsSelectingFolder(false);
    }
  };

  // Removed explicit save/disable auto-save row to keep UI single-row

  // Download a specific backup in a given format
  const handleDownloadBackup = async (backup: any, format: BackupFormat) => {
    try {
  const hasHandle = LocalBackupService.hasDirectoryHandle?.();
  if (hasHandle && fsPermission === 'granted') {
        // Nothing to download; files are already in folder
        toast({ title: T.savedToFolder || 'Saved to folder', description: LocalBackupService.getFolderName?.() });
        return;
      }
      if (format === "excel") {
        const { blob } = await ExcelBackupService.createManualBackup(backup.data);
        const filename = `freelance-flow-backup-${new Date(backup.timestamp).toISOString().split("T")[0]}.xlsx`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const json = JSON.stringify(backup.data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const filename = `freelance-flow-backup-${new Date(backup.timestamp).toISOString().split("T")[0]}.json`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      toast({ variant: "destructive", title: "Download Failed", description: "Could not download backup." });
    }
  };

  const handleDeleteBackupFile = async (name: string) => {
    setSelectedDeleteName(name);
    setConfirmDeleteOpen(true);
  };

  const performDeleteLocal = async (name: string) => {
    try {
      // LocalBackupService exposes deleteBackupFile(name)
      await LocalBackupService.deleteBackupFile?.(name);
      refreshBackups();
      toast({ title: T.deleted || 'Deleted', description: name });
    } catch (err: any) {
      toast({ variant: 'destructive', title: T.deleteFailed || 'Delete failed', description: err?.message || '' });
    }
  };
  const performDeleteFolderFile = async (name: string) => {
    try {
      // There is no deleteFolderFile; use deleteBackupFile as the filesystem removal API
      await LocalBackupService.deleteBackupFile?.(name);
      await refreshFolderFiles();
      toast({ title: T.deleted || 'Deleted', description: name });
    } catch (err: any) {
      toast({ variant: 'destructive', title: T.deleteFailed || 'Delete failed', description: err?.message || '' });
    }
  }

  const handleDeleteBackup = (timestamp: number) => {
    setSelectedDeleteTimestamp(timestamp);
    setSelectedDeleteName(null);
    setConfirmDeleteOpen(true);
  }

  const performDeleteBackup = async (timestamp: number) => {
    try {
      BackupService.deleteBackup?.(timestamp);
      refreshBackups();
      toast({ title: T.backupDeleted || 'Backup Deleted' });
    } catch {
      toast({ variant: 'destructive', title: T.deleteFailed || 'Delete Failed' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" /> {T.backupAndRestore || "Backup & Restore"}
              </CardTitle>
              <CardDescription className="mt-1">
                {T.dataManagementDesc || "Backup, restore and manage your data"}
              </CardDescription>
            </div>
            {/* Format toggle in header */}
            <div className="flex items-center gap-3 p-2 border rounded-lg">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <FileSpreadsheet className={`w-4 h-4 ${defaultExportFormat === 'excel' ? '' : 'opacity-40'}`} />
                <span className={`${defaultExportFormat === 'excel' ? 'font-medium' : 'text-muted-foreground'}`}>Excel (.xlsx)</span>
              </div>
              <Switch
                checked={defaultExportFormat === 'excel'}
                onCheckedChange={(checked) => setDefaultExportFormat(checked ? 'excel' : 'json')}
                aria-label="Toggle export format"
                className="data-[state=checked]:bg-green-600"
              />
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <FileJson className={`w-4 h-4 ${defaultExportFormat === 'json' ? '' : 'opacity-40'}`} />
                <span className={`${defaultExportFormat === 'json' ? 'font-medium' : 'text-muted-foreground'}`}>JSON (.json)</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row: Local folder backup + actions */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium flex items-center gap-2">
                  {T.localFolderBackup || 'Local Folder Backup'}
                </p>
                {LocalBackupService.getFolderName?.() && (
                  <p className="text-xs text-muted-foreground truncate max-w-[360px] flex items-center gap-2">
                    {LocalBackupService.getFolderName?.()}
                    {fsPermission === 'granted' ? (
                      <span title={T.connected || 'Connected'} aria-label={T.connected || 'Connected'}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      </span>
                    ) : fsPermission === 'prompt' ? (
                      <span title={T.permissionRequired || 'Permission required'} aria-label={T.permissionRequired || 'Permission required'}>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      </span>
                    ) : (
                      <span title={'Not connected'} aria-label={'Not connected'}>
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      </span>
                    )}
                  </p>
                )}
                {LocalBackupService.getLastAutoSave?.() ? (
                  <p className="text-xs text-muted-foreground">
                    {`Last: ${new Date(LocalBackupService.getLastAutoSave?.() || 0).toLocaleString()}`}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectFolder} disabled={isSelectingFolder}>
                <FolderOpen className="w-4 h-4 mr-2" /> {isSelectingFolder ? (T.selecting || 'Selecting...') : (T.selectFolder || 'Select Folder')}
              </Button>
              {LocalBackupService.hasDirectoryHandle?.() && fsPermission !== 'granted' && (
                <Button variant="outline" size="sm" onClick={handleReauthorize}>{T.reconnect || 'Reconnect'}</Button>
              )}
              <Button size="sm" onClick={() => handleCreateBackup(defaultExportFormat)} disabled={LocalBackupService.hasDirectoryHandle?.() && fsPermission !== 'granted'}>
                {defaultExportFormat === 'excel' ? <FileSpreadsheet className="w-4 h-4 mr-2" /> : <FileJson className="w-4 h-4 mr-2" />}
                {T.backupNow || 'Backup Now'}
              </Button>
            </div>
          </div>

          {/* Data Restore */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{T.dataRestore || 'Data Restore'}</span>
                <div className="ml-3 flex items-center gap-2">
                  <Button size="sm" variant={restoreMode === 'replace' ? 'default' : 'outline'} onClick={() => setRestoreMode('replace')}>
                    {T.replaceData || 'Replace data'}
                  </Button>
                  <Button size="sm" variant={restoreMode === 'join' ? 'default' : 'outline'} onClick={() => setRestoreMode('join')}>
                    {'Join data'}
                  </Button>
                </div>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept=".json,.xlsx" className="hidden" onChange={onRestoreFileChange} aria-label="Select backup file" />
                <Button variant="outline" size="sm" onClick={openRestorePicker} disabled={isImporting}>
                  <Download className="w-4 h-4 mr-2" /> {T.selectFile || 'Select File'}
                </Button>
              </div>
            </div>
          </div>

          {/* Removed duplicated local folder save row */}

          {/* Backup History */}
          <div className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">{T.backupHistory || 'Backup History'} • {(LocalBackupService.hasDirectoryHandle?.() && fsPermission === 'granted') ? folderFiles.length : backups.length}</h4>
              <Button variant="outline" size="sm" onClick={async () => { refreshBackups(); await refreshFolderFiles(); if (LocalBackupService.hasDirectoryHandle?.() && fsPermission !== 'granted') { await handleReauthorize(); } }}>
                {T.loadBackupList || 'Load backup list'}
              </Button>
            </div>
            <div>
              {(LocalBackupService.hasDirectoryHandle?.() && fsPermission === 'granted') ? (
                folderFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{T.noBackups || 'No backups yet.'}</p>
                ) : (
                  (() => {
                    const total = folderFiles.length;
                    const pageSize = 10;
                    const totalPages = Math.max(1, Math.ceil(total / pageSize));
                    const start = (page - 1) * pageSize;
                    const end = start + pageSize;
                    const pageItems = folderFiles.slice(start, end);
                    return (
                      <>
                        <div className="divide-y">
                          {pageItems.map((file) => (
                            <div key={file.name} className="py-3 px-3 flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{file.name}</span>
                                  <Badge variant="secondary" className="text-xs">{file.type.toUpperCase()}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{new Date(file.lastModified).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="outline" size="sm" onClick={() => handleRestore(file.name)} disabled={isRestoring}>
                                  <RefreshCw className="w-4 h-4 mr-1" /> {T.restore || 'Restore'}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="border-none" aria-label="More actions">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuLabel>{T.actions || 'Actions'}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteBackupFile(file.name)}>
                                      <Trash2 className="w-4 h-4 mr-2 text-destructive" /> {T.delete || 'Delete'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center gap-2 mt-3">
                            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>{T.previous || 'Previous'}</Button>
                            <span className="text-sm text-muted-foreground">{(T.page || 'Page')} {page} {(T.of || 'of')} {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>{T.next || 'Next'}</Button>
                          </div>
                        )}
                      </>
                    );
                  })()
                )
              ) : backups.length === 0 ? (
                <p className="text-xs text-muted-foreground">{T.noBackups || 'No backups yet.'}</p>
              ) : (
                (() => {
                  const total = backups.length;
                  const pageSize = 10;
                  const totalPages = Math.max(1, Math.ceil(total / pageSize));
                  const start = (page - 1) * pageSize;
                  const end = start + pageSize;
                  const pageItems = backups.slice(start, end);
                  const singleOnly = backups.length === 1;
                  return (
                    <>
                      <div className="divide-y">
                        {pageItems.map((backup, indexOnPage) => {
                          const globalIndex = start + indexOnPage;
                          return (
                            <div key={backup.timestamp} className="py-3 px-3 flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Backup #{backups.length - globalIndex}</span>
                                  {globalIndex === 0 && <Badge variant="secondary" className="text-xs">Latest</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground">{formatDate(backup.timestamp)} • {age(backup.timestamp)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {!singleOnly && (
                                  <Button variant="outline" size="sm" onClick={() => handleRestore(backup.timestamp)} disabled={isRestoring}>
                                    <RefreshCw className="w-4 h-4 mr-1" /> {T.restore || 'Restore'}
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="border-none" aria-label="More actions">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>{T.actions || 'Actions'}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDownloadBackup(backup, 'excel')}>
                                      <FileSpreadsheet className="w-4 h-4 mr-2" /> {T.downloadExcel || 'Download Excel'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDownloadBackup(backup, 'json')}>
                                      <FileJson className="w-4 h-4 mr-2" /> {T.downloadJSON || 'Download JSON'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteBackup(backup.timestamp)}>
                                      <Trash2 className="w-4 h-4 mr-2 text-destructive" /> {T.delete || 'Delete'}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>{T.previous || 'Previous'}</Button>
                          <span className="text-sm text-muted-foreground">{(T.page || 'Page')} {page} {(T.of || 'of')} {totalPages}</span>
                          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>{T.next || 'Next'}</Button>
                        </div>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cloud Backup Section */}
      <React.Suspense fallback={<div className="p-4 text-center text-muted-foreground">Loading cloud backup...</div>}>
        <CloudBackupManager />
      </React.Suspense>
      <AlertDialog open={confirmDeleteOpen} onOpenChange={(open) => setConfirmDeleteOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{selectedDeleteName}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              setConfirmDeleteOpen(false);
              if (selectedDeleteTimestamp !== null) {
                await performDeleteBackup(selectedDeleteTimestamp);
                setSelectedDeleteTimestamp(null);
                return;
              }
              if (!selectedDeleteName) return;
              // prefer deleting local backup entry if available
              // Delete the file using the local backup API
              await performDeleteLocal(selectedDeleteName);
              setSelectedDeleteName(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


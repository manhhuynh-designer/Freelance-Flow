"use client";

import React, { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/dashboard-context";
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import { ExcelBackupService } from "@/lib/excel-backup-service";
import type { AppData } from "@/lib/types";
import { FileUp, FileSpreadsheet, FileJson } from "lucide-react";

type RestoreMode = "replace" | "join";

export function DataRestoreCard() {
  const dashboard = useDashboard();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<RestoreMode>("replace");
  const [isBusy, setIsBusy] = useState(false);

  const lang = (dashboard?.appSettings?.language || "en") as keyof typeof i18n;
  const T = i18n[lang] || i18n.en;

  const openPicker = () => inputRef.current?.click();

  const importFromFile = async (file: File): Promise<Partial<AppData>> => {
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      return await ExcelBackupService.importFromExcel(file);
    }
    const text = await file.text();
    try {
      return JSON.parse(text) as Partial<AppData>;
    } catch (e) {
      throw new Error("Invalid JSON file");
    }
  };

  function mergeById<T extends { id: string }>(existing: T[] = [], incoming: T[] = []): T[] {
    const map = new Map<string, T>();
    existing.forEach((x) => x && x.id && map.set(x.id, x));
    incoming.forEach((x) => { if (x && x.id && !map.has(x.id)) map.set(x.id, x); });
    return Array.from(map.values()) as T[];
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

  const applyRestore = async (file: File) => {
    if (!dashboard) return;
    setIsBusy(true);
    try {
      let imported = await importFromFile(file);
      imported = normalizeDates(imported);

      // Restore AI/local-only blocks into localStorage if present
      try {
        const aiPairs: Array<[keyof any, string]> = [
          ["aiPersistentData", "freelance-flow-ai-persistent-data"],
          ["aiWritingPresets", "ai-writing-presets"],
          ["aiWritingHistory", "ai-writing-history"],
          ["aiWritingVersions", "ai-writing-versions"],
          ["filterPresets", "freelance-flow-filter-presets"],
        ];
        aiPairs.forEach(([k, ls]) => {
          const v = (imported as any)[k];
          if (typeof window !== "undefined" && v !== undefined) {
            localStorage.setItem(ls, JSON.stringify(v));
          }
        });
      } catch {}

      const saveAppData = (dashboard as any).saveAppData as (u: Partial<AppData>) => Promise<void>;
      if (!saveAppData) return;

  if (mode === "replace") {
        await saveAppData({
          tasks: imported.tasks || [],
          quotes: (imported as any).quotes || [],
          collaboratorQuotes: (imported as any).collaboratorQuotes || [],
          clients: imported.clients || [],
          collaborators: imported.collaborators || [],
          quoteTemplates: imported.quoteTemplates || [],
          categories: imported.categories || [],
          appSettings: imported.appSettings || dashboard.appSettings,
          notes: (imported as any).notes || [],
          events: (imported as any).events || [],
          workSessions: (imported as any).workSessions || [],
          expenses: (imported as any).expenses || [],
          fixedCosts: (imported as any).fixedCosts || [],
        });
    } else {
        // join/merge with existing
        await saveAppData({
      tasks: mergeById<any>((dashboard as any).tasks, imported.tasks as any) as any,
      quotes: mergeById<any>((dashboard as any).quotes, (imported as any).quotes || []) as any,
      collaboratorQuotes: mergeById<any>((dashboard as any).collaboratorQuotes, (imported as any).collaboratorQuotes || []) as any,
      clients: mergeById<any>((dashboard as any).clients, imported.clients as any) as any,
      collaborators: mergeById<any>((dashboard as any).collaborators, imported.collaborators as any) as any,
      quoteTemplates: mergeById<any>((dashboard as any).quoteTemplates, imported.quoteTemplates as any) as any,
      categories: mergeById<any>((dashboard as any).categories, imported.categories as any) as any,
          appSettings: (dashboard as any).appSettings, // keep existing settings on join
      notes: mergeById<any>((dashboard as any).notes || [], ((imported as any).notes || []) as any) as any,
      events: mergeById<any>((dashboard as any).events || [], ((imported as any).events || []) as any) as any,
      workSessions: mergeById<any>((dashboard as any).workSessions || [], ((imported as any).workSessions || []) as any) as any,
      expenses: mergeById<any>((dashboard as any).expenses || [], ((imported as any).expenses || []) as any) as any,
      fixedCosts: mergeById<any>((dashboard as any).fixedCosts || [], ((imported as any).fixedCosts || []) as any) as any,
        });
      }

    toast({ title: "Data Restored", description: `${file.name} • ${mode.toUpperCase()}` });
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast({ variant: "destructive", title: T.restoreFailed || "Restore Failed", description: e?.message || "" });
    } finally {
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void applyRestore(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileUp className="w-5 h-5" /> {T.dataRestore || "Data Restore"}
        </CardTitle>
        <CardDescription>{T.restoreDesc || "Restore from a JSON or Excel backup file. Choose Replace or Join."}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={mode === "replace" ? "default" : "outline"} onClick={() => setMode("replace")}>
              {T.replaceData || "Replace Data"}
            </Button>
            <Button size="sm" variant={mode === "join" ? "default" : "outline"} onClick={() => setMode("join")}>
              {"Join data"}
            </Button>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <input ref={inputRef} type="file" accept=".json,.xlsx" className="hidden" onChange={onFileChange} aria-label="Select backup file" title="Select backup file" />
            <Button variant="outline" size="sm" onClick={openPicker} disabled={isBusy}>
              {mode === "replace" ? <FileJson className="w-4 h-4 mr-2" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              {T.selectFile || "Select File"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DataRestoreCard;

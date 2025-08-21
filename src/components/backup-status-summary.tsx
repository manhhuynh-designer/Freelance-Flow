"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileJson, Download, Settings } from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';

export function BackupStatusSummary() {
  const { backupStatusText, defaultExportFormat, setDefaultExportFormat, handleExport } = useDashboard();

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="w-4 h-4" />
          Backup
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Last</span>
          <span>{backupStatusText}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-md border px-1 py-1">
            <Button
              size="sm"
              variant={defaultExportFormat === 'excel' ? 'secondary' : 'ghost'}
              className="h-7 px-2"
              onClick={() => setDefaultExportFormat('excel')}
              aria-label="Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={defaultExportFormat === 'json' ? 'secondary' : 'ghost'}
              className="h-7 px-2"
              onClick={() => setDefaultExportFormat('json')}
              aria-label="JSON"
            >
              <FileJson className="w-4 h-4" />
            </Button>
          </div>

          <Button size="sm" onClick={() => handleExport(defaultExportFormat)} className="h-8">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import React from 'react';
import { AlertTriangle, Settings, Zap, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppData } from '@/hooks/useAppData';
import { useRouter } from 'next/navigation';

interface VectorDBStatusProps {
  showCompact?: boolean;
}

export function VectorDBStatus({ showCompact = false }: VectorDBStatusProps) {
  const { appData } = useAppData();
  const router = useRouter();
  
  const hasApiKey = !!(appData?.appSettings?.googleApiKey);
  const tasksCount = (appData?.tasks || []).length;
  const indexedCount = (appData?.tasks || []).filter((t: any) => Array.isArray(t.vector) && t.vector.length > 0).length;
  const pendingIndex = tasksCount - indexedCount;

  if (showCompact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Database className="w-4 h-4" />
        <span className="text-muted-foreground">Vector DB:</span>
        {hasApiKey ? (
          <Badge variant="secondary" className="text-xs">
            {indexedCount}/{tasksCount} indexed
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            API key needed
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={hasApiKey ? "border-blue-200 dark:border-blue-800" : "border-yellow-200 dark:border-yellow-800"}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className={`w-5 h-5 ${hasApiKey ? 'text-blue-600' : 'text-yellow-600'}`} />
          Vector Database Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasApiKey ? (
          // API key configured
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Google Gemini API Configured
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Total Tasks</div>
                <div className="font-medium">{tasksCount}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Indexed</div>
                <div className="font-medium text-blue-600">{indexedCount}</div>
              </div>
            </div>
            
            {pendingIndex > 0 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>{pendingIndex} tasks</strong> are being indexed in the background for semantic search.
                </div>
              </div>
            )}
            
            {indexedCount > 0 && (
              <div className="text-sm text-green-600 dark:text-green-400">
                ✅ Semantic search is available for indexed tasks
              </div>
            )}
          </div>
        ) : (
          // No API key
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                  Vector Database Disabled
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                  Configure your Google Gemini API key to enable semantic search and AI-powered task insights.
                  Tasks will work normally without this feature.
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <strong>Available without API key:</strong> Basic task management, filtering, and all core features.
            </div>
            
            <Button 
              onClick={() => router.push('/dashboard/settings')}
              variant="outline"
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure API Key in Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

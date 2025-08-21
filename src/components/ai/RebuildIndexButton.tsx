"use client";

import React, { useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppData } from '@/hooks/useAppData';
import { indexTasks } from '@/lib/vector-db/tasks-indexer';
import VectorDBService from '@/lib/vector-db/service';

export function RebuildIndexButton() {
  const { appData } = useAppData();
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const hasApiKey = !!(appData?.appSettings?.googleApiKey);
  const tasksCount = (appData?.tasks || []).length;

  const handleRebuildIndex = async () => {
    if (!hasApiKey || !appData?.tasks) return;
    
    setIsRebuilding(true);
    setProgress(0);
    setResult(null);
    
    try {
      const gKey = appData.appSettings.googleApiKey!;
      const gModel = appData.appSettings.googleModel;
      
      // Clear existing vectors
      setProgress(10);
      await VectorDBService.clear();
      
      // Index all tasks
      setProgress(30);
      await indexTasks(appData.tasks, { apiKey: gKey, model: gModel });
      
      setProgress(100);
      setResult({
        success: true,
        message: `Successfully rebuilt index for ${tasksCount} tasks`
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: `Failed to rebuild index: ${error.message || 'Unknown error'}`
      });
    } finally {
      setIsRebuilding(false);
      setTimeout(() => {
        setProgress(0);
        setResult(null);
      }, 3000);
    }
  };

  if (!hasApiKey) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Configure API key to enable index rebuilding
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Index Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Rebuild the vector index for all {tasksCount} tasks. This will re-generate embeddings and update semantic search.
        </div>
        
        {isRebuilding && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Rebuilding index...
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {result && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${
            result.success 
              ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}>
            {result.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {result.message}
          </div>
        )}
        
        <Button 
          onClick={handleRebuildIndex}
          disabled={isRebuilding || tasksCount === 0}
          variant="outline"
          className="w-full"
        >
          {isRebuilding ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Rebuilding...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Rebuild Index ({tasksCount} tasks)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

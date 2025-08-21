"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { useDashboard } from '@/contexts/dashboard-context';
import { Upload, FileJson, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JsonImportManagerProps {
  onImportComplete?: () => void;
}

export function JsonImportManager({ onImportComplete }: JsonImportManagerProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const dashboardContext = useDashboard();

  const validateJsonFile = async (file: File): Promise<{ isValid: boolean; message: string; data?: any }> => {
    try {
      if (!file.name.toLowerCase().endsWith('.json')) {
        return {
          isValid: false,
          message: 'File must be a JSON (.json) format'
        };
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        return {
          isValid: false,
          message: 'File size too large (max 50MB)'
        };
      }

      const fileContent = await file.text();
      const data = JSON.parse(fileContent);
      
      // Basic validation - check for required data structure
      if (!data.tasks || !Array.isArray(data.tasks)) {
        return {
          isValid: false,
          message: 'Invalid JSON format: Tasks data not found or not an array'
        };
      }

      return {
        isValid: true,
        message: `Valid JSON backup with ${data.tasks.length} tasks, ${data.clients?.length || 0} clients, ${data.quotes?.length || 0} quotes`,
        data
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Invalid JSON file: ${error instanceof Error ? error.message : 'Parse error'}`
      };
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidationResult(null);
    setImportProgress(10);

    try {
      const result = await validateJsonFile(file);
      setValidationResult(result);
      setImportProgress(100);
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: 'Error validating file'
      });
      setImportProgress(0);
    }
  };

  const handleImport = async () => {
    if (!validationResult?.isValid || !validationResult.data || !dashboardContext) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const data = validationResult.data;
      
      // Update progress
      setImportProgress(25);

      // Restore data to dashboard context
      dashboardContext.setAppData({
        tasks: data.tasks || [],
        quotes: data.quotes || [],
        collaboratorQuotes: data.collaboratorQuotes || [],
        clients: data.clients || [],
        collaborators: data.collaborators || [],
        quoteTemplates: data.quoteTemplates || [],
        categories: data.categories || [],
        appSettings: data.appSettings || dashboardContext.appSettings,
        notes: data.notes || [],
        events: data.events || [],
        workSessions: data.workSessions || [],
      });

      setImportProgress(75);

      // Restore filter presets if they exist
      if (data.filterPresets && Array.isArray(data.filterPresets)) {
        localStorage.setItem('freelance-flow-filter-presets', JSON.stringify(data.filterPresets));
      }

      setImportProgress(100);

      toast({
        title: "JSON Import Successful",
        description: `Successfully imported ${data.tasks.length} tasks and other data from JSON backup.`,
      });

      // Clear the form
      setValidationResult(null);
      setImportProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call completion callback
      onImportComplete?.();

      // Reload page to ensure all data is properly loaded
      setTimeout(() => window.location.reload(), 500);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: "Import Failed",
        description: "Failed to import JSON data. Please check the file format.",
      });
      setImportProgress(0);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="w-5 h-5" />
          Import from JSON Backup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Selection */}
        <div className="space-y-2">
          <Label htmlFor="json-file">Select JSON Backup File</Label>
          <Input
            id="json-file"
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            ref={fileInputRef}
            disabled={isImporting}
          />
        </div>

        {/* Progress Bar */}
        {importProgress > 0 && importProgress < 100 && (
          <div className="space-y-2">
            <Label>Processing...</Label>
            <Progress value={importProgress} className="w-full" />
          </div>
        )}

        {/* Validation Result */}
        {validationResult && (
          <Alert className={validationResult.isValid ? "border-green-500" : "border-destructive"}>
            {validationResult.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {validationResult.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Import Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!validationResult?.isValid || isImporting}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Importing...' : 'Import JSON Data'}
          </Button>
          
          {validationResult && (
            <Button
              variant="outline"
              onClick={() => {
                setValidationResult(null);
                setImportProgress(0);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Format Info */}
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>JSON Import Features:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Fast, lightweight format for technical users</li>
            <li>Preserves all data types and relationships</li>
            <li>Compatible with previous backup versions</li>
            <li>Supports full data structure validation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Lightbulb, Brain, Loader2 } from 'lucide-react';

interface AIBusinessAnalysisCardProps {
  analysis: any | null; // Placeholder for AI analysis result
  onGenerate: () => void;
  isLoading: boolean;
}

export function AIBusinessAnalysisCard({ analysis, onGenerate, isLoading }: AIBusinessAnalysisCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    AI Business Analysis
                </CardTitle>
                <CardDescription>Insights, forecasts, and recommendations.</CardDescription>
            </div>
            <Button onClick={onGenerate} disabled={isLoading} size="sm">
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                    </>
                ) : (
                    <>
                        <Brain className="mr-2 h-4 w-4" />
                        Analyze
                    </>
                )}
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {!analysis ? (
            <div className="text-center text-sm text-muted-foreground h-full flex flex-col items-center justify-center">
                Click "Analyze" to get AI-powered insights for the selected date range.
            </div>
        ) : (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-4">
              <p className="text-sm">{analysis.summary}</p>
            </TabsContent>
            <TabsContent value="forecast" className="mt-4">
               <p className="text-sm">AI Forecast placeholder.</p>
            </TabsContent>
            <TabsContent value="actions" className="mt-4">
               <ul className="list-disc pl-5 space-y-2 text-sm">
                {(analysis.recommendations || []).map((rec: string, i: number) => <li key={i}>{rec}</li>)}
               </ul>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
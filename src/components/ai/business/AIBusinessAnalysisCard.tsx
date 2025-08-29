"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, Brain, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Insight {
  category: 'Risk' | 'Opportunity' | 'Optimization';
  severity: 'low' | 'medium' | 'high';
  insight: string;
  suggestion: string;
  justification: string;
}

interface AIBusinessAnalysisResult {
  summary?: string; // summary is optional now
  recommendations: string[]; // These are suggestions
  insights: Insight[]; // Full structured insights
  raw?: string; // Raw AI response
}

interface AIBusinessAnalysisCardProps {
  analysis: AIBusinessAnalysisResult | null; // Use the structured type
  onGenerate?: () => void; // Make onGenerate optional
  isLoading: boolean;
  analysisTimestamp?: string; // Add timestamp prop
}

// Helper to determine color based on severity
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return 'border-red-500';
    case 'medium': return 'border-orange-500';
    case 'low': return 'border-yellow-500';
    case 'Opportunity': return 'border-green-500';
    case 'Optimization': return 'border-blue-500';
    default: return 'border-gray-400';
  }
};

// Helper to determine color class for category
const getCategoryColorClass = (category: string) => {
  switch (category) {
    case 'Risk': return 'text-red-600';
    case 'Opportunity': return 'text-green-600';
    case 'Optimization': return 'text-blue-600';
    default: return 'text-gray-600';
  }
};

export function AIBusinessAnalysisCard({ analysis, onGenerate, isLoading, analysisTimestamp }: AIBusinessAnalysisCardProps) {
  return (
    <div className="space-y-4">
      {/* Removed the internal Analyze button from here */}

      {/* Main Analysis Card */}
      <Card className="h-full flex flex-col pt-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              AI Business Analysis
            </CardTitle>
            {analysisTimestamp ? (
              <CardDescription>Last analyzed: {new Date(analysisTimestamp).toLocaleString()}</CardDescription>
            ) : (
              <CardDescription>Generate insights from your business data.</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {!analysis ? (
            <div className="text-center text-sm text-muted-foreground h-full flex flex-col items-center justify-center">
                {/* Changed text, as the button is now external */}
                No analysis generated. Click "Analyze" to get AI-powered insights for the selected date range.
            </div>
        ) : (
          <div className="space-y-4">
            {/* Display Summary (if it exists) */}
            {analysis.summary && (
              <div>
                <p className="text-sm">{analysis.summary}</p>
                <Separator className="my-4" />
              </div>
            )}
            
            {/* Display Actions/Insights */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Insights & Suggestions</h4>
              <div className="space-y-4">
                  {(analysis.insights || []).length > 0 ? (
                      (analysis.insights || []).map((insight: Insight, i: number) => (
                          <div key={i} className={`border-l-4 pl-3 py-1 ${getSeverityColor(insight.severity)}`}>
                              <p className="text-xs text-muted-foreground">
                                  <span className={`font-semibold ${getCategoryColorClass(insight.category)}`}>
                                      {insight.category}
                                  </span>
                                  <span className="ml-2 text-muted-foreground">(Severity: {insight.severity})</span>
                              </p>
                              <p className="font-medium text-sm mt-1">{insight.insight}</p>
                              <p className="text-sm mt-1"><strong>Suggestion:</strong> {insight.suggestion}</p>
                              <p className="text-xs text-gray-500 mt-1">({insight.justification})</p>
                          </div>
                      ))
                  ) : (
                      <p className="text-sm text-muted-foreground">No actionable insights generated. Try adjusting your data or the analysis period.</p>
                  )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      </Card>
    </div>
    );
}
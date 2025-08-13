"use client";

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { TimeRangePicker } from './prediction/TimeRangePicker';
import { Loader2 } from 'lucide-react';

// Step 2: Import new helper functions
import { 
  calculateFinancialSummary, 
  calculateRevenueBreakdown, 
  getAIBusinessAnalysis 
} from '@/ai/analytics/business-intelligence-helpers';

// Step 3: Import new card components
import { FinancialSummaryCard } from './business/FinancialSummaryCard';
import { RevenueBreakdownCard } from './business/RevenueBreakdownCard';
import { AIBusinessAnalysisCard } from './business/AIBusinessAnalysisCard';

export function BusinessDashboard() {
  const { appData, isDataLoaded } = useDashboard();
  
  // State lifted up to the main dashboard component
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [summary, setSummary] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAnalysisPanelVisible, setIsAnalysisPanelVisible] = useState(false);

  // Effect to perform calculations when data or date range changes
  useEffect(() => {
    if (isDataLoaded && appData) {
      // Perform local, real-time calculations
      const summaryResult = calculateFinancialSummary(appData, { from: dateRange?.from, to: dateRange?.to });
      const breakdownResult = calculateRevenueBreakdown(appData, { from: dateRange?.from, to: dateRange?.to });
      setSummary(summaryResult);
      setBreakdown(breakdownResult);
    }
  }, [appData, isDataLoaded, dateRange]);

  const handleAiAnalysis = async () => {
    if (!summary || !breakdown) return;

    setIsAiLoading(true);
    setIsAnalysisPanelVisible(true); // Show the right panel
    try {
      // Mock settings, replace with real ones from appSettings if available
      const settings = {
        apiKey: appData.appSettings.googleApiKey || '',
        modelName: appData.appSettings.googleModel || 'gemini-pro',
        language: appData.appSettings.language || 'en'
      };

      const financialContext = { summary, breakdown };
      const aiResult = await getAIBusinessAnalysis(financialContext, settings);
      setAnalysis(aiResult);

    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAiLoading(false);
    }
  };
  
  if (!isDataLoaded) {
      return (
          <div className="flex items-center justify-center p-8">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              <span>Loading Dashboard Data...</span>
          </div>
      )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Business Dashboard</h2>
        <TimeRangePicker date={dateRange} setDate={setDateRange} />
      </div>
      
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Real-time Analytics) */}
        <div className="lg:col-span-2 space-y-6">
          <FinancialSummaryCard summary={summary} />
          <RevenueBreakdownCard breakdown={breakdown} />
        </div>
        
        {/* Right Column (AI Analysis) */}
        <div className="lg:col-span-1">
           {/* The AI card now manages its own trigger button logic */}
           <AIBusinessAnalysisCard 
                analysis={analysis}
                isLoading={isAiLoading}
                onGenerate={handleAiAnalysis}
           />
        </div>
      </div>
    </div>
  );
}

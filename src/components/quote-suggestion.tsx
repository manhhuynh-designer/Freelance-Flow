"use client";

import React, { useState, useTransition } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askAboutTasksAction } from "@/app/actions/ai-actions";
import { useToast } from "@/hooks/use-toast";
import { i18n } from "@/lib/i18n";
import type { AppSettings } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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

type QuoteSuggestionProps = {
  taskDescription: string;
  taskCategory: string;
  settings: AppSettings;
  onApplySuggestion: (items: Array<{ description: string; unitPrice: number }>) => void;
};

export function QuoteSuggestion({ taskDescription, taskCategory, settings, onApplySuggestion }: QuoteSuggestionProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<Array<{ description: string; unitPrice: number }> | null>(null);
  const { toast } = useToast();
  const T = i18n[settings.language];

  // Try to extract JSON from AI text (handles fenced code blocks)
  const extractJson = (text: string): any | null => {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {}
    // Try to find a fenced JSON block
    const match = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      try { return JSON.parse(match[1]); } catch {}
    }
    // Try to find first {...}
    const braceStart = text.indexOf('{');
    const braceEnd = text.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      const candidate = text.slice(braceStart, braceEnd + 1);
      try { return JSON.parse(candidate); } catch {}
    }
    return null;
  };

  const handleSuggestQuote = () => {
    if (!taskDescription || !taskCategory) {
      toast({
        variant: "destructive",
        title: T.missingInfo,
        description: T.missingInfoDesc,
      });
      return;
    }
    
    const { preferredModelProvider, googleApiKey, openaiApiKey, googleModel, openaiModel } = settings;
    const apiKey = preferredModelProvider === 'google' ? googleApiKey : openaiApiKey;
    const modelName = preferredModelProvider === 'openai' 
      ? (openaiModel || 'gpt-4o-mini')
      : (googleModel || 'gemini-1.5-flash');

    if (!apiKey) {
      toast({
        variant: "destructive",
        title: T.apiKeyRequiredTitle,
        description: T.apiKeyRequiredDesc.replace('on the server', 'in your settings'),
      });
      return;
    }

    startTransition(async () => {
      try {
        // Build a structured prompt like ChatView does (server action handles provider)
        const userInput = [
          'You are an expert project estimator for freelance work. Based on the following task information, suggest 3-5 realistic quote line items.',
          `Task description: "${taskDescription}"`,
          `Task category: "${taskCategory}"`,
          '',
          'IMPORTANT: Return ONLY valid JSON with this exact schema:',
          '{"suggestedItems":[{"description": "Clear service description", "unitPrice": 1000000}]}',
          '',
          'Rules:',
          '- Each description should be specific and professional',
          '- Unit prices should be in VND (Vietnamese Dong)',
          '- Include typical freelance services like design, development, consultation, revisions',
          '- Make prices realistic for Vietnamese market',
          '- Do not include any explanation or text outside the JSON'
        ].join('\n');

        const response = await askAboutTasksAction({
          userInput,
          history: [],
          tasks: [],
          clients: [],
          collaborators: [],
          quoteTemplates: [],
          quotes: [],
          language: settings.language,
          modelName,
          apiKey,
        });

        let parsed: any | null = null;
        const txt = typeof response.text === 'string' ? response.text : JSON.stringify(response.text ?? '');
        parsed = extractJson(txt);
        const items: Array<{ description: string; unitPrice: number }> | undefined = parsed?.suggestedItems;

        if (Array.isArray(items) && items.length > 0) {
          // Normalize items
          const normalized = items
            .filter(it => it && typeof it.description === 'string')
            .map(it => ({ description: it.description, unitPrice: Number(it.unitPrice) || 0 }));
          setSuggestion(normalized);
        } else {
          setSuggestion(null);
          toast({
            variant: "destructive",
            title: T.aiSuggestionFailed,
            description: T.aiSuggestionFailedDesc,
          });
        }
      } catch (error: any) {
        console.error("Failed to suggest quote:", error);
        
        const errorMessage = error.message || T.aiSuggestionFailedDesc;
        let toastTitle = T.aiSuggestionFailed;
        let toastDescription = errorMessage;

        if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded')) {
            toastDescription = "The AI model is currently overloaded. Please try again shortly.";
        }
        
        toast({
          variant: "destructive",
          title: toastTitle,
          description: toastDescription,
        });
      }
    });
  };

  const handleApply = () => {
    if (suggestion) {
      onApplySuggestion(suggestion);
      setSuggestion(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSuggestQuote}
        disabled={isPending}
        className="relative"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Lightbulb className="mr-2 h-4 w-4" />
        )}
        {isPending ? T.gettingSuggestion : T.suggestQuoteWithAI}
      </Button>
      
      {/* Loading state display */}
      {isPending && (
        <Card className="mt-2 p-4 w-full bg-secondary/50 border-dashed">
          <CardContent className="p-0">
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="text-sm text-muted-foreground">
                <div className="font-medium">{T.gettingSuggestion || "Getting suggestions..."}</div>
                <div className="text-xs opacity-75">
                  {(T as any).aiProcessing || "AI is analyzing your task requirements..."}
                </div>
              </div>
            </div>
            {/* Animated dots */}
            <div className="flex justify-center space-x-1 mt-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {suggestion && suggestion.length > 0 && !isPending && (
         <Card className="mt-2 p-4 w-full bg-secondary/50">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base">{T.aiSuggestion}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="space-y-1 text-sm text-muted-foreground">
                {suggestion.map((item, index) => (
                  <li key={index} className="flex justify-between items-center gap-2">
                    <span className="flex-1">{item.description}</span>
                    <span className="font-mono text-foreground whitespace-nowrap">{item.unitPrice.toLocaleString('vi-VN')} VND</span>
                  </li>
                ))}
              </ul>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="mt-4 w-full">{T.applySuggestion}</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{T.applySuggestion}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {T.applySuggestionWarning}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{T.cancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleApply}>{T.confirmApply}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
      )}
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestQuote, type SuggestQuoteOutput } from "@/ai/flows/suggest-quote";
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
  onApplySuggestion: (items: SuggestQuoteOutput['suggestedItems']) => void;
};

export function QuoteSuggestion({ taskDescription, taskCategory, settings, onApplySuggestion }: QuoteSuggestionProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<SuggestQuoteOutput['suggestedItems'] | null>(null);
  const { toast } = useToast();
  const T = i18n[settings.language];

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
        const result = await suggestQuote({ 
            taskDescription, 
            taskCategory,
            provider: preferredModelProvider,
            apiKey,
            modelName,
        });
        
        if (result) {
            setSuggestion(result.suggestedItems);
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
      >
        <Lightbulb className="mr-2 h-4 w-4" />
        {isPending ? T.gettingSuggestion : T.suggestQuoteWithAI}
      </Button>
      {suggestion && suggestion.length > 0 && (
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

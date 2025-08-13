/**
 * AI Model Status Component
 * Shows current selected model and its capabilities
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GeminiModel, 
  GEMINI_MODELS, 
  ModelFallbackManager 
} from '@/ai/utils/gemini-models';
import { AIConfigManager } from '@/ai/utils/ai-config-manager';
import { Zap, Star, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AppSettings } from '@/lib/types';

interface AIModelStatusProps {
  appSettings?: AppSettings;
  compact?: boolean;
}

export const AIModelStatus: React.FC<AIModelStatusProps> = ({
  appSettings,
  compact = false
}) => {
  const router = useRouter();
  const aiConfig = AIConfigManager.getAIConfig(appSettings);
  const modelConfig = GEMINI_MODELS[aiConfig.modelName];
  const fallbackChain = ModelFallbackManager.getFallbackChain(aiConfig.modelName);

  // 🔧 CHỈ HIỂN THỊ KHI CHƯA CÓ API KEY
  if (aiConfig.isConfigured) {
    return null; // Ẩn component khi đã có API key
  }

  const getModelIcon = (model: GeminiModel) => {
    if (ModelFallbackManager.is25Model(model)) {
      return <Zap className="w-4 h-4 text-yellow-500" />;
    }
    return <Star className="w-4 h-4 text-blue-500" />;
  };

  const getStatusIcon = () => {
    if (!aiConfig.isConfigured) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusColor = () => {
    if (!aiConfig.isConfigured) return 'text-red-600 dark:text-red-400';
    if (ModelFallbackManager.is25Model(aiConfig.modelName)) {
      return 'text-yellow-600 dark:text-yellow-400';
    }
    return 'text-blue-600 dark:text-blue-400';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
        <span className="text-destructive-foreground text-xs font-medium">
          API Key Required
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/settings')}
          className="h-6 px-2 text-xs text-destructive hover:bg-destructive/20 ml-auto"
        >
          <Settings className="w-3 h-3 mr-1" />
          Setup
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 text-red-500" />
          API Key Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Message */}
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-red-700 dark:text-red-300 mb-1">
              Configure Google Gemini API Key
            </div>
            <div className="text-sm text-red-600 dark:text-red-400">
              AI features are disabled until you provide a valid Google Gemini API key. 
              Once configured, you'll have access to advanced AI predictions and insights.
            </div>
          </div>
        </div>

        {/* Available Models Preview */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Available Models:</div>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Gemini 2.5 Pro, Flash, Flash Lite</span>
              <Badge variant="default" className="ml-auto">Latest</Badge>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
              <Star className="w-4 h-4 text-blue-500" />
              <span>Gemini 1.5 Pro, Flash, Flash 8B</span>
              <Badge variant="secondary" className="ml-auto">Stable</Badge>
            </div>
          </div>
        </div>

        {/* Setup Button */}
        <Button
          onClick={() => router.push('/dashboard/settings')}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          <Settings className="w-4 h-4 mr-2" />
          Configure API Key
        </Button>
      </CardContent>
    </Card>
  );
};

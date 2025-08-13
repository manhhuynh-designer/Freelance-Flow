/**
 * Active AI Model Display
 * Shows current model info when API key is configured (read-only)
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  GeminiModel, 
  GEMINI_MODELS, 
  ModelFallbackManager 
} from '@/ai/utils/gemini-models';
import { AIConfigManager } from '@/ai/utils/ai-config-manager';
import { Zap, Star, Settings, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AppSettings } from '@/lib/types';

interface ActiveAIModelDisplayProps {
  appSettings?: AppSettings;
  showSettings?: boolean;
}

export const ActiveAIModelDisplay: React.FC<ActiveAIModelDisplayProps> = ({
  appSettings,
  showSettings = false
}) => {
  const router = useRouter();
  const aiConfig = AIConfigManager.getAIConfig(appSettings);
  const modelConfig = GEMINI_MODELS[aiConfig.modelName];

  // Chỉ hiển thị khi ĐÃ CÓ API key
  if (!aiConfig.isConfigured) {
    return null;
  }

  const getModelIcon = (model: GeminiModel) => {
    if (ModelFallbackManager.is25Model(model)) {
      return <Zap className="w-4 h-4 text-yellow-500" />;
    }
    return <Star className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md text-sm">
      <CheckCircle className="w-3.5 h-3.5 text-primary" />
      <div className="flex items-center gap-1">
        {getModelIcon(aiConfig.modelName)}
        <span className="text-primary text-xs font-medium">
          {modelConfig.displayName}
        </span>
        <Badge 
          variant="outline"
          className={`h-4 text-xs px-1 ${modelConfig.category === '2.5' ? 'border-yellow-500 text-yellow-600' : 'border-blue-500 text-blue-600'}`}
        >
          {modelConfig.category}
        </Badge>
      </div>
      {showSettings && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/settings')}
          className="h-6 px-2 text-xs text-primary hover:bg-primary/20 ml-auto"
        >
          <Settings className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

/**
 * Gemini Model Selection Component
 * Allows users to choose their preferred Gemini model with fallback information
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  GeminiModel, 
  GEMINI_MODELS, 
  ModelFallbackManager 
} from '@/ai/utils/gemini-models';
import { Zap, Star, Clock, DollarSign, Info } from 'lucide-react';

interface ModelSelectionProps {
  currentModel?: string;
  onModelChange: (model: GeminiModel) => void;
  disabled?: boolean;
}

export const GeminiModelSelector: React.FC<ModelSelectionProps> = ({
  currentModel,
  onModelChange,
  disabled = false
}) => {
  const models25 = ModelFallbackManager.get25Models();
  const models15 = ModelFallbackManager.get15Models();
  
  const selectedModel = currentModel ? 
    (Object.values(GeminiModel).includes(currentModel as GeminiModel) ? 
      currentModel as GeminiModel : 
      GeminiModel.GEMINI_2_5_FLASH) :
    GeminiModel.GEMINI_2_5_FLASH;

  const selectedConfig = GEMINI_MODELS[selectedModel];

  const formatCost = (cost: number) => `$${cost.toFixed(3)}/1M tokens`;

  const getModelIcon = (model: GeminiModel) => {
    if (ModelFallbackManager.is25Model(model)) {
      return <Zap className="w-4 h-4 text-yellow-500" />;
    }
    return <Star className="w-4 h-4 text-blue-500" />;
  };

  const getModelBadge = (model: GeminiModel) => {
    const config = GEMINI_MODELS[model];
    return (
      <Badge 
        variant={config.category === '2.5' ? 'default' : 'secondary'}
        className={config.category === '2.5' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : ''}
      >
        Gemini {config.category}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Chọn Mô Hình AI
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Chọn mô hình Gemini ưa thích. Hệ thống sẽ tự động fallback nếu mô hình không khả dụng.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={selectedModel}
            onValueChange={(value) => onModelChange(value as GeminiModel)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn mô hình AI..." />
            </SelectTrigger>
            <SelectContent>
              {/* Gemini 2.5 Models */}
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                🚀 Gemini 2.5 (Mới nhất - Recommended)
              </div>
              {models25.map((config) => (
                <SelectItem key={config.name} value={config.name}>
                  <div className="flex items-center gap-2">
                    {getModelIcon(config.name)}
                    <span>{config.displayName}</span>
                    {getModelBadge(config.name)}
                  </div>
                </SelectItem>
              ))}
              
              {/* Gemini 1.5 Models */}
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-2 pt-2">
                ⚡ Gemini 1.5 (Ổn định)
              </div>
              {models15.map((config) => (
                <SelectItem key={config.name} value={config.name}>
                  <div className="flex items-center gap-2">
                    {getModelIcon(config.name)}
                    <span>{config.displayName}</span>
                    {getModelBadge(config.name)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Current Selection Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                {getModelIcon(selectedModel)}
                {selectedConfig.displayName}
              </h4>
              {getModelBadge(selectedModel)}
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Max tokens: {selectedConfig.capabilities.maxTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span>Input: {formatCost(selectedConfig.capabilities.inputCost)}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-red-500" />
                <span>Output: {formatCost(selectedConfig.capabilities.outputCost)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>Rate: {selectedConfig.capabilities.rateLimit}/min</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fallback Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Hệ Thống Fallback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Nếu mô hình được chọn không khả dụng, hệ thống sẽ tự động thử các mô hình theo thứ tự:
            </p>
            
            <div className="space-y-2">
              {ModelFallbackManager.getFallbackChain(selectedModel).map((model, index) => {
                const config = GEMINI_MODELS[model];
                const isSelected = index === 0;
                
                return (
                  <div 
                    key={model}
                    className={`flex items-center gap-3 p-2 rounded-md ${
                      isSelected ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
                    }`}
                  >
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {index + 1}
                    </span>
                    {getModelIcon(model)}
                    <span className="font-medium">{config.displayName}</span>
                    {getModelBadge(model)}
                    {isSelected && (
                      <Badge variant="outline" className="ml-auto">
                        Ưu tiên
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg mt-4">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Lưu ý:</strong> Hệ thống luôn ưu tiên mô hình bạn chọn trước. 
                Chỉ khi có lỗi API mới chuyển sang mô hình thấp hơn.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

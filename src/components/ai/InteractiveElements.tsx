'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Calendar, DollarSign, Plus, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { InteractiveElement } from '@/lib/ai-types';

interface InteractiveElementsProps {
  elements: InteractiveElement[];
  onElementClick?: (element: InteractiveElement) => void;
}

export function InteractiveElements({ elements, onElementClick }: InteractiveElementsProps) {
  const [copiedElements, setCopiedElements] = useState<Set<string>>(new Set());

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      '➕': Plus,
      '💰': DollarSign,
      '📅': Calendar,
      '📋': Copy,
      '🔄': RotateCcw,
      '🔗': ExternalLink
    };
    
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : <span>{iconName}</span>;
  };

  const handleCopy = async (element: InteractiveElement) => {
    if (!element.data) return;
    
    try {
      await navigator.clipboard.writeText(element.data);
      setCopiedElements(prev => new Set(prev).add(element.id || element.label));
      toast({
        title: "Success",
        description: "Copied to clipboard!",
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedElements(prev => {
          const newSet = new Set(prev);
          newSet.delete(element.id || element.label);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: "Error",
        description: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const handleElementClick = (element: InteractiveElement) => {
    if (element.type === 'copyable') {
      handleCopy(element);
    } else if (element.type === 'link' && element.data) {
      window.open(element.data, '_blank');
    } else if (onElementClick) {
      onElementClick(element);
    }
  };

  if (!elements || elements.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {elements.map((element, index) => {
        const elementId = element.id || `${element.type}-${index}`;
        const isCopied = copiedElements.has(elementId);
        
        return (
          <Button
            key={elementId}
            variant={element.variant || 'default'}
            size={element.size || 'sm'}
            onClick={() => handleElementClick(element)}
            className="flex items-center gap-2 text-xs"
            disabled={element.type === 'copyable' && isCopied}
          >
            {element.type === 'copyable' && isCopied ? (
              <Check className="w-4 h-4" />
            ) : (
              element.icon && getIcon(element.icon)
            )}
            <span>
              {element.type === 'copyable' && isCopied ? 'Copied!' : element.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

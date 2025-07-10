
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import type { AppSettings } from '@/lib/types';
import { i18n } from '@/lib/i18n';

// A safer way to evaluate mathematical expressions without using eval()
const evaluateExpression = (expr: string): number => {
  // Sanitize expression: remove anything that is not a digit, operator, dot, or parenthesis.
  const sanitizedExpr = expr.replace(/[^0-9+\-*/().\s]/g, '');

  if (sanitizedExpr !== expr) {
    throw new Error("Invalid characters in expression.");
  }
  
  // Prevent function calls and other malicious code
  if (/[a-zA-Z]/.test(sanitizedExpr)) {
    throw new Error("Invalid expression: contains letters.");
  }

  try {
    // Use Function constructor for safer evaluation than direct eval()
    return new Function(`return ${sanitizedExpr}`)();
  } catch (e) {
    throw new Error("Invalid mathematical expression.");
  }
};

type CalculatorProps = {
    settings: AppSettings;
}

export function Calculator({ settings }: CalculatorProps) {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const T = i18n[settings.language];

  const handleCalculate = () => {
    if (!expression.trim()) {
      setResult(null);
      return;
    }
    try {
      const calculationResult = evaluateExpression(expression);
      if (typeof calculationResult !== 'number' || !isFinite(calculationResult)) {
        setResult('Invalid result.');
      } else {
        setResult(calculationResult.toLocaleString());
      }
    } catch (error: any) {
      setResult(error.message || 'Error calculating.');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleCalculate();
    }
  }

  const handleClear = () => {
    setExpression('');
    setResult(null);
  }

  const handleCopy = () => {
    if (result && !isNaN(parseFloat(result.replace(/,/g, '')))) {
      navigator.clipboard.writeText(result.replace(/,/g, ''));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="p-2">
      <Card className="w-full max-w-xs mx-auto shadow-lg">
         <CardHeader>
            <CardTitle 
              className="text-sm font-normal text-muted-foreground cursor-pointer hover:text-foreground"
              onClick={handleClear}
              title="Clear calculation"
            >
              {T.simpleCalculator}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="expression-input" className="text-xs text-muted-foreground">{T.expression}</Label>
            <Input
              id="expression-input"
              placeholder="e.g., 2 * (10 + 5)"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{T.result}</Label>
            <div className="relative">
                <div className="bg-muted text-muted-foreground text-right text-2xl font-mono p-3 rounded-md overflow-x-auto break-all min-h-[52px] flex items-center justify-end pr-10">
                    {result ?? '0'}
                </div>
                 {result && !isNaN(parseFloat(result.replace(/,/g, ''))) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={handleCopy}
                        title="Copy result"
                    >
                        {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

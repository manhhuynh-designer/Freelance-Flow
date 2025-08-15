import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import styles from './payment-progress-bar.module.css';

interface PaymentProgressBarProps {
  totalAmount: number;
  amountPaid: number;
  currency: string;
  onAmountChange: (newAmount: number) => void;
  className?: string;
  disabled?: boolean;
}

export function PaymentProgressBar({
  totalAmount,
  amountPaid,
  currency,
  onAmountChange,
  className,
  disabled = false
}: PaymentProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const percentage = totalAmount > 0 ? Math.min((amountPaid / totalAmount) * 100, 100) : 0;
  const remainingAmount = Math.max(totalAmount - amountPaid, 0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!progressBarRef.current) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const newPercentage = (x / rect.width) * 100;
      const newAmount = Math.round((newPercentage / 100) * totalAmount);
      
      onAmountChange(Math.max(0, Math.min(newAmount, totalAmount)));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, totalAmount, onAmountChange]);

  const handleBarClick = useCallback((e: React.MouseEvent) => {
    if (disabled || isDragging) return;
    
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPercentage = (x / rect.width) * 100;
    const newAmount = Math.round((newPercentage / 100) * totalAmount);
    
    onAmountChange(Math.max(0, Math.min(newAmount, totalAmount)));
  }, [disabled, isDragging, totalAmount, onAmountChange]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress Bar */}
      <div className="relative">
        <div
          ref={progressBarRef}
          className={cn(
            "relative h-6 bg-muted rounded-lg overflow-hidden cursor-pointer border-2 border-transparent",
            !disabled && "hover:border-primary/20",
            isDragging && "border-primary/40"
          )}
          onClick={handleBarClick}
        >
          {/* Paid amount (green) */}
          <div
            className={cn(
              "absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-200 ease-out",
              styles.paymentProgressFill
            )}
            style={{ '--progress-width': `${percentage}%` } as React.CSSProperties}
          />
          
          {/* Drag handle */}
          {!disabled && (
            <div
              className={cn(
                "absolute top-0 h-full w-4 bg-primary/80 cursor-col-resize shadow-lg transition-all duration-200",
                "hover:bg-primary hover:w-5",
                isDragging && "bg-primary w-5 shadow-xl",
                styles.paymentProgressHandle
              )}
              style={{ '--handle-position': `calc(${percentage}% - 8px)` } as React.CSSProperties}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/60 transform -translate-x-1/2" />
            </div>
          )}
          
          {/* Amount labels inside bar */}
          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium text-white/90">
            <span className="drop-shadow-sm">
              {amountPaid.toLocaleString()} {currency}
            </span>
            <span className="drop-shadow-sm">
              {totalAmount.toLocaleString()} {currency}
            </span>
          </div>
        </div>
        
        {/* Percentage indicator */}
        <div 
          className={cn(
            "absolute -top-8 text-xs font-medium text-muted-foreground",
            styles.paymentProgressIndicator
          )}
          style={{ '--indicator-position': `calc(${percentage}% - 20px)` } as React.CSSProperties}
        >
          {percentage.toFixed(1)}%
        </div>
      </div>
      
      {/* Summary info */}
      <div className="flex justify-between text-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span className="font-medium">Đã thanh toán:</span>
            <span>{amountPaid.toLocaleString()} {currency}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted border rounded-sm" />
            <span className="font-medium">Còn lại:</span>
            <span>{remainingAmount.toLocaleString()} {currency}</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-lg font-bold">
            {percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">
            hoàn thành
          </div>
        </div>
      </div>
      
      {!disabled && (
        <div className="text-xs text-muted-foreground italic">
          💡 Kéo thanh hoặc click để điều chỉnh số tiền đã thanh toán
        </div>
      )}
    </div>
  );
}

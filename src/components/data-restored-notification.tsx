"use client";

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, X } from 'lucide-react';

interface DataRestoredNotificationProps {
  onDismiss?: () => void;
}

export function DataRestoredNotification({ onDismiss }: DataRestoredNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Kiểm tra nếu có flag đánh dấu data đã được restore
    const wasDataRestored = sessionStorage.getItem('data-was-restored');
    if (wasDataRestored) {
      setIsVisible(true);
      // Xóa flag sau khi đã hiển thị
      sessionStorage.removeItem('data-was-restored');
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
      <Shield className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Data Successfully Recovered
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        Your data was automatically restored from backup after detecting potential data loss. 
        All your tasks, clients, and settings have been recovered successfully.
      </AlertDescription>
    </Alert>
  );
}


"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { AppSettings } from '@/lib/types';
import { i18n } from '@/lib/i18n';

export default function NotFound() {
  const [language, setLanguage] = useState<'en' | 'vi'>('en');

  useEffect(() => {
    const storedSettings = localStorage.getItem('freelance-flow-settings');
    if (storedSettings) {
        try {
            const parsedSettings: AppSettings = JSON.parse(storedSettings);
            if (parsedSettings.language) {
                setLanguage(parsedSettings.language);
            }
        } catch(e) {
            console.error("Failed to parse settings from localStorage", e);
        }
    }
  }, []);
  
  const T = i18n[language];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AlertTriangle className="h-16 w-16 text-primary" />
        <h1 className="text-6xl font-bold font-headline">404</h1>
        <h2 className="text-2xl font-semibold">{T.notFoundTitle}</h2>
        <p className="max-w-md text-muted-foreground">
          {T.notFoundDesc}
        </p>
        <Button asChild>
          <Link href="/">{T.returnToDashboard}</Link>
        </Button>
      </div>
    </div>
  );
}

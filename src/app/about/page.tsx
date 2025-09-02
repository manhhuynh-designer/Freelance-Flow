
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { browserLocal } from '@/lib/browser';
import type { AppSettings } from '@/lib/types';
import { i18n } from '@/lib/i18n';

export default function AboutPage() {
    const [language, setLanguage] = useState<'en' | 'vi'>('en');

    useEffect(() => {
        try {
            const storedSettings = browserLocal.getItem('freelance-flow-settings');
            if (storedSettings) {
                const parsedSettings: AppSettings = JSON.parse(storedSettings);
                if (parsedSettings.language) setLanguage(parsedSettings.language);
            }
        } catch(e) { console.error("Failed to parse settings from localStorage", e); }
    }, []);

    const T = i18n[language];

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">{T.aboutTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                    <p>
                        {T.aboutDesc1}
                    </p>
                    <p>
                        {T.aboutDesc2}
                    </p>
                    <Button asChild>
                        <Link href="/dashboard">{T.backToDashboard}</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

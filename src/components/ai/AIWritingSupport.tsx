"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import { useDashboard } from '@/contexts/dashboard-context';

// Placeholder component for upcoming AI Writing Support features.
// Reuses existing translation system; minimal structure to avoid rework later.
export function AIWritingSupport() {
  const { appData } = useDashboard();
  const language = appData?.appSettings?.language || 'en';
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Pencil className="w-5 h-5 text-sky-600" />
        <CardTitle className="text-lg">AI Writing Support</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-3">
        <p>Placeholder area for AI-assisted writing tools (drafting, refining, summarizing, translating).</p>
        <p className="text-xs">Language: {language}</p>
      </CardContent>
    </Card>
  );
}

export default AIWritingSupport;

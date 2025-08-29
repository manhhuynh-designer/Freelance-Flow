"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';

export function PageTitle() {
  const { appData } = useDashboard();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const lang = (appData?.appSettings?.language ?? 'en') as keyof typeof i18n;
  const T = i18n[lang];
  const view = searchParams.get('view');

  // Enhanced page title logic with more specific titles
  if (pathname === '/dashboard/ai-hub') {
    return <>{T.aiHub}</>;
  }
  if (pathname === '/dashboard/chat') {
    return <>AI Chat</>;
  }
  if (pathname === '/dashboard/settings') {
    return <>Settings</>;
  }
  if (pathname === '/dashboard/calendar') {
    return <>Calendar</>;
  }
  if (pathname === '/dashboard/clients') {
    return <>Clients</>;
  }
  if (pathname === '/dashboard/quotes') {
    return <>Quotes</>;
  }
  if (pathname === '/dashboard/collaborators') {
    return <>Team</>;
  }
  if (pathname === '/dashboard' && view === 'trash') {
    return <>Trash</>;
  }
  if (pathname === '/dashboard' && view === 'calendar') {
    return <>Calendar View</>;
  }
  if (pathname === '/dashboard/widgets') {
    return <>Widgets</>;
  }
  if (pathname === '/dashboard') {
    return <>Tasks</>;
  }
  
  return <>Dashboard</>;
}

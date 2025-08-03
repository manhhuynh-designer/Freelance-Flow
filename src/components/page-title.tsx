"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';

export function PageTitle() {
  const { appData } = useDashboard();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const T = i18n[appData.appSettings.language];
  const view = searchParams.get('view');

  if (pathname === '/dashboard/chat') {
    return <>{T.chatWithAI}</>;
  }
  if (pathname === '/dashboard/settings') {
    return <>{T.settings}</>;
  }
  if (pathname === '/dashboard' && view === 'trash') {
    return <>{T.trashCan}</>;
  }
  if (pathname === '/dashboard/widgets') {
    return <>{T.widgets}</>;
  }
  if (pathname === '/dashboard') {
    return <>{T.tasksDashboard}</>;
  }
  
  return <>{T.dashboard}</>;
}

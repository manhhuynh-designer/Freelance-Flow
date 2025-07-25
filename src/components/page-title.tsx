
"use client";

import { usePathname } from 'next/navigation';
import { useDashboard } from '@/contexts/dashboard-context';
import { i18n } from '@/lib/i18n';
import { Suspense } from 'react';

export function PageTitle() {
  return (
    <Suspense fallback={<>Dashboard</>}>
      <PageTitleSuspense />
    </Suspense>
  );
}

function PageTitleSuspense() {
  // Only import useSearchParams here, inside Suspense
  const { useSearchParams } = require('next/navigation');
  const dashboardContext = useDashboard();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // If context is not available yet, we can show a loading or default state.
  if (!dashboardContext) {
    return <>Dashboard</>;
  }

  const { appSettings } = dashboardContext;
  const T = i18n[appSettings.language];
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
  if (pathname === '/dashboard') {
    return <>{T.tasksDashboard}</>;
  }
  
  return <>{T.dashboard}</>;
}

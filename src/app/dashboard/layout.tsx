"use client";

import { Suspense, useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { DashboardProvider } from '@/contexts/dashboard-context';
import { ThemeApplicator } from '@/components/theme-applicator';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { WorkTimeTracker } from '@/components/features/WorkTimeTracker';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ThemeProvider } from "@/components/theme-provider";
import { Skeleton } from '@/components/ui/skeleton';
import QuickChat from '@/components/quick-chat';

// Wrapper to ensure components are only rendered on the client side
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
     return (
        <div className="flex h-screen w-screen">
            <Skeleton className="h-full w-64 hidden md:block" />
            <div className="flex-1 p-4 space-y-4">
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-full w-full" />
            </div>
        </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  return (
    <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
    >
        <DashboardProvider>
          <ClientOnly>
            <ThemeApplicator />
            <Suspense fallback={<div>Loading...</div>}>
              <DashboardLayoutShell pathname={pathname}>{children}</DashboardLayoutShell>
            </Suspense>
          </ClientOnly>
        </DashboardProvider>
    </ThemeProvider>
  )
}

function DashboardLayoutShell({ children, pathname }: { children: React.ReactNode; pathname: string | null }) {
  const searchParams = useSearchParams();
  const isFullView = searchParams?.get('full') === '1';

  const shouldShowQuickChat = !isFullView &&
    !pathname?.includes('/dashboard/chat') &&
    !pathname?.includes('/dashboard/ai-hub') &&
    !pathname?.includes('/dashboard/ai-assistant');

  return (
    <>
      <SidebarProvider>
        {!isFullView && <AppSidebar />}
        <SidebarInset className="flex flex-col h-svh">
          {!isFullView && <DashboardHeader />}
          <main className={isFullView ? "flex-1 min-h-0 overflow-hidden" : "flex-1 min-h-0 overflow-y-auto"}>
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      {shouldShowQuickChat && <QuickChat />}
    </>
  );
}
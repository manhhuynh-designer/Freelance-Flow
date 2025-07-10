
"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { LayoutGrid, MessageCircle, Puzzle } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSkeleton } from "@/components/ui/sidebar";
import { i18n } from "@/lib/i18n";
import { useDashboard } from "@/contexts/dashboard-context";

import { Suspense } from 'react';

export function SidebarNavigation() {
    return (
        <Suspense fallback={<SidebarMenu><SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem><SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem><SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem></SidebarMenu>}>
            <SidebarMenuNavigationSuspense />
        </Suspense>
    );
}

function SidebarMenuNavigationSuspense() {
    // Only import useSearchParams here, inside Suspense
    const { useSearchParams } = require('next/navigation');
    const dashboardContext = useDashboard();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (!dashboardContext) {
        // Render a skeleton while context is loading.
        return (
          <SidebarMenu>
            <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuSkeleton showIcon /></SidebarMenuItem>
          </SidebarMenu>
        );
    }
    
    const { appSettings } = dashboardContext;
    const T = i18n[appSettings.language];

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard' && !searchParams.get('view')}>
                    <Link href="/dashboard"><LayoutGrid />{T.dashboard}</Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/widgets'}>
                    <Link href="/dashboard/widgets"><Puzzle />{T.widgets}</Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/dashboard/chat'}>
                    <Link href="/dashboard/chat"><MessageCircle />{T.chatWithAI}</Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

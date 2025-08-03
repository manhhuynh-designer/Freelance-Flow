"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, MessageCircle, Puzzle } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { i18n } from "@/lib/i18n";
import { useDashboard } from "@/contexts/dashboard-context";

export function SidebarNavigation() {
    const { appData } = useDashboard();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const T = i18n[appData.appSettings.language];

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

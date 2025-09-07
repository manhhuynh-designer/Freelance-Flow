"use client";

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDashboard } from '@/contexts/dashboard-context';
import {
    Sidebar, SidebarHeader, SidebarContent, SidebarSeparator, SidebarGroup, SidebarGroupLabel,
    SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSkeleton
} from '@/components/ui/sidebar';
import {
    Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Users, FileText, Briefcase, LayoutGrid, Cog, Trash2, LogIn, LogOut, User, DollarSign } from "lucide-react";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { ClientManager } from "@/components/client-manager";
import { CollaboratorManager } from "@/components/collaborator-manager";
import { CategoryManager } from "@/components/category-manager";
import { QuoteTemplateManager } from "@/components/quote-template-manager";
import ShareManagerDialog from "@/components/share/ShareManagerDialog";
import { FixedCostsCard } from '@/components/ai/business/FixedCostsCard';
import { WIDGETS } from '@/lib/widgets';
import type { AppSettings } from '@/lib/types';
import { useSession, signIn, signOut } from 'next-auth/react';

function SidebarTrashMenuItem({ T }: { T: any }) {
  const searchParams = useSearchParams();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={searchParams.get('view') === 'trash'}>
        <Link href="/dashboard?view=trash"><Trash2 />{T.trash}</Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
    const dashboardContext = useDashboard();
    const pathname = usePathname();
    const { data: session, status } = useSession();

    if (!dashboardContext || !dashboardContext.appData || !dashboardContext.appData.appSettings) {
        return (
            <Sidebar collapsible="offcanvas">
                <SidebarHeader>
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <Image src="/icons/logo.png" alt="Freelance Flow Logo" width={24} height={24} className="h-6 w-6" />
                        <h1 className="text-xl font-semibold font-headline group-data-[state=collapsed]:hidden">Freelance Flow</h1>
                    </Link>
                </SidebarHeader>
                <SidebarContent>
                    <div className="flex h-full flex-col">
                        <div className="flex-1">
                            <SidebarMenu>
                                <SidebarMenuSkeleton showIcon />
                                <SidebarMenuSkeleton showIcon />
                                <SidebarMenuSkeleton showIcon />
                                <SidebarMenuSkeleton showIcon />
                                <SidebarMenuSkeleton showIcon />
                            </SidebarMenu>
                        </div>
                    </div>
                </SidebarContent>
            </Sidebar>
        );
    }

  const { T, appData, isClientManagerOpen, setIsClientManagerOpen, handleAddClientAndSelect, handleEditClient, handleDeleteClient, 
      isCollaboratorManagerOpen, setIsCollaboratorManagerOpen, handleAddCollaborator, handleEditCollaborator, handleDeleteCollaborator,
      isCategoryManagerOpen, setIsCategoryManagerOpen, handleAddCategory, handleEditCategory, handleDeleteCategory,
      isTemplateManagerOpen, setIsTemplateManagerOpen, setAppData,
      isFixedCostManagerOpen, setIsFixedCostManagerOpen } = dashboardContext;

    const [isShareManagerOpen, setIsShareManagerOpen] = useState(false);

    const sidebarWidgets = (appData.appSettings.widgets || [])
        .filter(w => w.showInSidebar)
        .map(w => {
            const widgetDef = WIDGETS.find(def => def.id === w.id);
            return widgetDef ? { ...w, ...widgetDef } : null;
        })
        .filter((w): w is NonNullable<typeof w> => w !== null);

    return (
        <Sidebar collapsible="offcanvas">
          <SidebarHeader>
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image src="/icons/logo.png" alt="Freelance Flow Logo" width={24} height={24} className="h-6 w-6" />
                <h1 className="text-xl font-semibold font-headline group-data-[state=collapsed]:hidden">Freelance Flow</h1>
              </Link>
          </SidebarHeader>
          <SidebarContent>
              <div className="flex h-full flex-col">
                <div className="flex-1">
                  <SidebarGroup>
                       <SidebarGroupLabel>{T.views}</SidebarGroupLabel>
                       <SidebarGroupContent>
                           <Suspense fallback={<SidebarMenu><SidebarMenuSkeleton showIcon /><SidebarMenuSkeleton showIcon /></SidebarMenu>}>
                               <SidebarNavigation />
                           </Suspense>
                       </SidebarGroupContent>
                   </SidebarGroup>
                   <SidebarGroup>
                       <SidebarGroupLabel>{T.manage}</SidebarGroupLabel>
                       <SidebarGroupContent>
                       <SidebarMenu>
                           <SidebarMenuItem>
                             <SidebarMenuButton onClick={() => setIsShareManagerOpen(true)}>
                               <FileText />{T.manageShares || 'Manage Shares'}
                             </SidebarMenuButton>
                           </SidebarMenuItem>
                           <SidebarMenuItem><Dialog open={isClientManagerOpen} onOpenChange={setIsClientManagerOpen}><DialogTrigger asChild><SidebarMenuButton><Users />{T.manageClients}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.clientManagement}</DialogTitle></DialogHeader><ClientManager clients={appData.clients} tasks={appData.tasks} onAddClient={handleAddClientAndSelect} onEditClient={handleEditClient} onDeleteClient={handleDeleteClient} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                           <SidebarMenuItem><Dialog open={isCollaboratorManagerOpen} onOpenChange={setIsCollaboratorManagerOpen}><DialogTrigger asChild><SidebarMenuButton><Briefcase />{T.manageCollaborators}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.collaboratorManagement}</DialogTitle></DialogHeader><CollaboratorManager collaborators={appData.collaborators} tasks={appData.tasks} onAddCollaborator={handleAddCollaborator} onEditCollaborator={handleEditCollaborator} onDeleteCollaborator={handleDeleteCollaborator} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                           <SidebarMenuItem>
                             <Dialog open={isFixedCostManagerOpen} onOpenChange={setIsFixedCostManagerOpen}>
                               <DialogTrigger asChild>
                                 <SidebarMenuButton><DollarSign />{T.fixedCosts || 'Fixed Costs'}</SidebarMenuButton>
                               </DialogTrigger>
                               <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                                 <DialogHeader><DialogTitle>{T.fixedCosts || 'Fixed Costs'}</DialogTitle></DialogHeader>
                                 <FixedCostsCard 
                                   dateRange={{}} 
                                   embedded 
                                   hideSummary 
                                   defaultOpen 
                                   currency={appData.appSettings.currency}
                                   locale={appData.appSettings.language === 'vi' ? 'vi-VN' : 'en-US'}
                                 />
                               </DialogContent>
                             </Dialog>
                           </SidebarMenuItem>
                           <SidebarMenuItem><Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}><DialogTrigger asChild><SidebarMenuButton><LayoutGrid />{T.manageCategories}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.categoryManagement}</DialogTitle></DialogHeader><CategoryManager categories={appData.categories} tasks={appData.tasks} onAddCategory={handleAddCategory} onEditCategory={handleEditCategory} onDeleteCategory={handleDeleteCategory} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                           <SidebarMenuItem>
                             <Dialog open={isTemplateManagerOpen} onOpenChange={setIsTemplateManagerOpen}>
                               <DialogTrigger asChild><SidebarMenuButton><FileText />{T.manageTemplates}</SidebarMenuButton></DialogTrigger>
                               <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{T.quoteTemplateManagement}</DialogTitle></DialogHeader><QuoteTemplateManager templates={appData.quoteTemplates} onAddTemplate={(values, columns) => setAppData(prev => ({...prev, quoteTemplates: [...prev.quoteTemplates, {id: `template-${Date.now()}`, name: values.name, sections: values.sections, columns}]}))} onEditTemplate={(template) => setAppData(prev => ({...prev, quoteTemplates: prev.quoteTemplates.map(t => t.id === template.id ? template : t)}))} onDeleteTemplate={(id) => setAppData(prev => ({...prev, quoteTemplates: prev.quoteTemplates.filter(t => t.id !== id)}))} language={appData.appSettings.language} settings={appData.appSettings} /></DialogContent>
                             </Dialog>
                           </SidebarMenuItem>
                       </SidebarMenu>
                       </SidebarGroupContent>
                   </SidebarGroup>
                   
                   {sidebarWidgets.length > 0 && (
                        <>
                            <SidebarSeparator />
                            <SidebarGroup>
                                <SidebarGroupLabel>{T.widgets}</SidebarGroupLabel>
                                <SidebarGroupContent>
                                    <div className="space-y-4 p-2">
                                        {sidebarWidgets.map(widget => {
                                            const WidgetComponent = widget.component;
                                            return (
                                                <div key={widget.id}>
                                                   <WidgetComponent settings={appData.appSettings as AppSettings} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </>
                   )}

                   <SidebarSeparator />
                   
                 </div>
                 <div className="mt-auto">
                   <SidebarSeparator />
                    
                    {/* Authentication Section */}
                    <SidebarGroup>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {status === 'loading' ? (
                            <SidebarMenuItem>
                              <SidebarMenuButton disabled>
                                <User />Loading...
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ) : session ? (
                            <>
                              <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                  <div className="flex items-center gap-2 px-2 py-1 text-sm">
                                    <User className="h-4 w-4" />
                                    <span className="truncate">{session.user?.email || session.user?.name || 'User'}</span>
                                  </div>
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                              <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => signOut()}>
                                  <LogOut />
                                  {T.signOut || 'Sign Out'}
                                </SidebarMenuButton>
                              </SidebarMenuItem>
                            </>
                          ) : (
                            <SidebarMenuItem>
                              <SidebarMenuButton onClick={() => signIn()}>
                                <LogIn />
                                {T.signIn || 'Sign In'}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                    
                    <SidebarSeparator />
                    
                    <SidebarGroup>
                       <SidebarGroupContent>
                         <SidebarMenu>
                           <SidebarMenuItem>
                             <SidebarMenuButton asChild isActive={pathname === '/dashboard/settings'}>
                               <Link href="/dashboard/settings"><Cog />{T.settings}</Link>
                             </SidebarMenuButton>
                           </SidebarMenuItem>
                           <Suspense fallback={<SidebarMenuItem><SidebarMenuButton asChild isActive={false}><Link href="/dashboard?view=trash"><Trash2 />{T.trash}</Link></SidebarMenuButton></SidebarMenuItem>}>
                             <SidebarTrashMenuItem T={T} />
                           </Suspense>
                         </SidebarMenu>
                       </SidebarGroupContent>
                     </SidebarGroup>
                    {/* Global Share Manager Dialog (renders its own DialogContent/Title) */}
                    <ShareManagerDialog open={isShareManagerOpen} onOpenChange={setIsShareManagerOpen} />
                 </div>
               </div>
           </SidebarContent>
         </Sidebar>
    );
}
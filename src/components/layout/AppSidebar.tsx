"use client";

import { Suspense, useState, useEffect } from 'react';
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
import { Users, LayoutGrid, Cog, Trash2, LogIn, LogOut, User, DollarSign, ChevronDown, UserCheck, FolderOpen, Share2, FileCode } from "lucide-react";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { ClientManager } from "@/components/client-manager";
import { CollaboratorManager } from "@/components/collaborator-manager";
import { CategoryManager } from "@/components/category-manager";
import { ProjectManager } from "@/components/project-manager";
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
    isProjectManagerOpen, setIsProjectManagerOpen, handleAddProject, handleEditProject, handleDeleteProject,
      isFixedCostManagerOpen, setIsFixedCostManagerOpen } = dashboardContext;

    const [isShareManagerOpen, setIsShareManagerOpen] = useState(false);
    // Collapsible state for sidebar groups (persist to localStorage)
    const [isViewsOpen, setIsViewsOpen] = useState<boolean>(() => {
      if (typeof window === 'undefined') return true;
      const v = localStorage.getItem('ff-sidebar-views-open');
      return v === null ? true : v === 'true';
    });
    const [isManageOpen, setIsManageOpen] = useState<boolean>(() => {
      if (typeof window === 'undefined') return true;
      const v = localStorage.getItem('ff-sidebar-manage-open');
      return v === null ? true : v === 'true';
    });

    // Persist on change
    useEffect(() => {
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('ff-sidebar-views-open', String(isViewsOpen)); } catch {}
      }
    }, [isViewsOpen]);
    useEffect(() => {
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('ff-sidebar-manage-open', String(isManageOpen)); } catch {}
      }
    }, [isManageOpen]);

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
                       <SidebarGroupLabel>
                         <button
                           type="button"
                           onClick={() => setIsViewsOpen(v => !v)}
                           className="w-full flex items-center justify-between gap-2 text-left"
                         >
                           <span>{T.views}</span>
                           <ChevronDown className={`h-4 w-4 transition-transform ${isViewsOpen ? '' : '-rotate-90'}`} />
                         </button>
                       </SidebarGroupLabel>
                       {isViewsOpen && (
                         <SidebarGroupContent id="sidebar-group-views">
                           <Suspense fallback={<SidebarMenu><SidebarMenuSkeleton showIcon /><SidebarMenuSkeleton showIcon /></SidebarMenu>}>
                               <SidebarNavigation />
                           </Suspense>
                         </SidebarGroupContent>
                       )}
                   </SidebarGroup>
                   <SidebarGroup>
                       <SidebarGroupLabel>
                         <button
                           type="button"
                           onClick={() => setIsManageOpen(v => !v)}
                           className="w-full flex items-center justify-between gap-2 text-left"
                         >
                           <span>{T.manage}</span>
                           <ChevronDown className={`h-4 w-4 transition-transform ${isManageOpen ? '' : '-rotate-90'}`} />
                         </button>
                       </SidebarGroupLabel>
                       {isManageOpen && (
                         <SidebarGroupContent id="sidebar-group-manage">
                       <SidebarMenu>
                           <SidebarMenuItem>
                             <SidebarMenuButton onClick={() => setIsShareManagerOpen(true)}>
                               <Share2 />{T.manageShares || 'Shares'}
                             </SidebarMenuButton>
                           </SidebarMenuItem>
                           <SidebarMenuItem><Dialog open={isClientManagerOpen} onOpenChange={setIsClientManagerOpen}><DialogTrigger asChild><SidebarMenuButton><Users />{T.client || 'Clients'}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.clientManagement}</DialogTitle></DialogHeader><ClientManager clients={appData.clients} tasks={appData.tasks} onAddClient={handleAddClientAndSelect} onEditClient={handleEditClient} onDeleteClient={handleDeleteClient} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                           <SidebarMenuItem><Dialog open={isCollaboratorManagerOpen} onOpenChange={setIsCollaboratorManagerOpen}><DialogTrigger asChild><SidebarMenuButton><UserCheck />{T.collaborator || 'Collaborators'}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.collaboratorManagement}</DialogTitle></DialogHeader><CollaboratorManager collaborators={appData.collaborators} tasks={appData.tasks} onAddCollaborator={handleAddCollaborator} onEditCollaborator={handleEditCollaborator} onDeleteCollaborator={handleDeleteCollaborator} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                           <SidebarMenuItem><Dialog open={isProjectManagerOpen} onOpenChange={setIsProjectManagerOpen}><DialogTrigger asChild><SidebarMenuButton><FolderOpen />{T.project || 'Projects'}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{T.projectManagement || 'Project Management'}</DialogTitle></DialogHeader><ProjectManager projects={appData.projects || []} tasks={appData.tasks} onAddProject={handleAddProject} onEditProject={handleEditProject} onDeleteProject={handleDeleteProject} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
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
                           <SidebarMenuItem><Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}><DialogTrigger asChild><SidebarMenuButton><LayoutGrid />{T.category || 'Categories'}</SidebarMenuButton></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{T.categoryManagement}</DialogTitle></DialogHeader><CategoryManager categories={appData.categories} tasks={appData.tasks} onAddCategory={handleAddCategory} onEditCategory={handleEditCategory} onDeleteCategory={handleDeleteCategory} language={appData.appSettings.language} /></DialogContent></Dialog></SidebarMenuItem>
                           <SidebarMenuItem>
                             <Dialog open={isTemplateManagerOpen} onOpenChange={setIsTemplateManagerOpen}>
                               <DialogTrigger asChild><SidebarMenuButton><FileCode />{T.templates || 'Templates'}</SidebarMenuButton></DialogTrigger>
                               <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{T.quoteTemplateManagement}</DialogTitle></DialogHeader><QuoteTemplateManager templates={appData.quoteTemplates} onAddTemplate={(values, columns) => setAppData(prev => ({...prev, quoteTemplates: [...prev.quoteTemplates, {id: `template-${Date.now()}`, name: values.name, sections: values.sections, columns}]}))} onEditTemplate={(template) => setAppData(prev => ({...prev, quoteTemplates: prev.quoteTemplates.map(t => t.id === template.id ? template : t)}))} onDeleteTemplate={(id) => setAppData(prev => ({...prev, quoteTemplates: prev.quoteTemplates.filter(t => t.id !== id)}))} language={appData.appSettings.language} settings={appData.appSettings} /></DialogContent>
                             </Dialog>
                           </SidebarMenuItem>
                       </SidebarMenu>
                         </SidebarGroupContent>
                       )}
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
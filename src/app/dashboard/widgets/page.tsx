"use client";

import React, { useState, Suspense, useCallback } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from '@/components/ui/skeleton';
import { i18n } from '@/lib/i18n';
import { WIDGETS } from '@/lib/widgets';
import type { AppSettings, WidgetSetting, AppData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { MoreVertical, Move } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const GridLayout = WidthProvider(RGL);

function WidgetsView() {
    const dashboardContext = useDashboard();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const appData = dashboardContext?.appData;
    const setAppData = dashboardContext?.setAppData;

    if (!appData || !appData.appSettings || !setAppData) {
        return (
            <div className="p-4 md:p-6 h-full">
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    const { appSettings } = appData;
    const T = i18n[appSettings.language];
    
    const handleWidgetSettingChange = (id: string, key: keyof WidgetSetting, value: boolean) => {
        setAppData((prev: AppData) => {
            const currentSettings = prev.appSettings;
            const existingSettings = currentSettings.widgets || [];
            const settingIndex = existingSettings.findIndex(w => w.id === id);
            let newWidgets: WidgetSetting[];

            if (settingIndex > -1) {
                newWidgets = existingSettings.map((w, index) =>
                    index === settingIndex ? { ...w, [key]: value } : w
                );
            } else {
                 const widgetDef = WIDGETS.find(w => w.id === id);
                 const newWidget: WidgetSetting = {
                    id: id as any,
                    enabled: false,
                    showInSidebar: false,
                    colSpan: widgetDef?.defaultSize?.colSpan || 1,
                    rowSpan: widgetDef?.defaultSize?.rowSpan || 1,
                    [key]: value
                };
                newWidgets = [...existingSettings, newWidget];
            }

            if (key === 'enabled' && !value) {
                const targetWidget = newWidgets.find(w => w.id === id);
                if (targetWidget) targetWidget.showInSidebar = false;
            }

            return { 
                ...prev, 
                appSettings: { ...currentSettings, widgets: newWidgets } 
            };
        });
    };

    const handleLayoutChange = useCallback((layout: Layout[]) => {
        if (!isEditMode) return;
        setAppData((prev: AppData) => {
            const currentSettings = prev.appSettings;
            const updatedWidgets = (currentSettings.widgets || []).map(widget => {
                const layoutItem = layout.find(l => l.i === widget.id);
                if (layoutItem) {
                    return {
                        ...widget,
                        colSpan: layoutItem.w,
                        rowSpan: layoutItem.h,
                        x: layoutItem.x,
                        y: layoutItem.y
                    };
                }
                return widget;
            });
            return {
                ...prev,
                appSettings: { ...currentSettings, widgets: updatedWidgets }
            };
        });
    }, [setAppData, isEditMode]);


    const enabledWidgets = (appSettings.widgets || []).filter(w => w.enabled);

    const layout: Layout[] = enabledWidgets.map(widget => ({
        i: widget.id,
        x: widget.x || 0,
        y: widget.y || 0,
        w: widget.colSpan || 1,
        h: widget.rowSpan || 1,
    }));


    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h1 className="text-2xl font-bold font-headline">{T.widgets}</h1>
                <div className="flex items-center space-x-2">
                    <Button 
                        variant={isEditMode ? "default" : "outline"} 
                        size="icon" 
                        onClick={() => setIsEditMode(!isEditMode)}
                        title={isEditMode ? "Lock Layout" : "Edit Layout"}
                    >
                        <Move className="h-4 w-4" />
                    </Button>
                     <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                        <DialogTrigger asChild>
                             <Button variant="outline" size="icon" title="Widget Settings">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{T.manageWidgets}</DialogTitle>
                                <DialogDescription>{T.manageWidgetsDesc}</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-4">
                                {WIDGETS.map((widget) => {
                                    const widgetSetting = (appSettings.widgets || []).find(w => w.id === widget.id) || { 
                                        id: widget.id, 
                                        enabled: false, 
                                        showInSidebar: false, 
                                        colSpan: widget.defaultSize?.colSpan || 1, 
                                        rowSpan: widget.defaultSize?.rowSpan || 1 
                                    };
                                    return (
                                        <div key={widget.id} className="flex items-start justify-between rounded-lg border p-3">
                                            <div className="flex items-center gap-3">
                                                <widget.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                                <div className="space-y-0.5">
                                                    <Label htmlFor={`widget-enabled-${widget.id}`} className="text-sm">
                                                        {(T[widget.nameKey as keyof typeof T] as string) || widget.name}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        {(T[widget.descriptionKey as keyof typeof T] as string) || widget.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Switch
                                                    id={`widget-enabled-${widget.id}`}
                                                    checked={widgetSetting.enabled}
                                                    onCheckedChange={(checked) => handleWidgetSettingChange(widget.id, 'enabled', checked)}
                                                />
                                                <div className="flex items-center space-x-2">
                                                    <Label htmlFor={`widget-sidebar-${widget.id}`} className="text-xs text-muted-foreground">{T.showInSidebar}</Label>
                                                    <Switch
                                                        id={`widget-sidebar-${widget.id}`}
                                                        checked={widgetSetting.showInSidebar}
                                                        onCheckedChange={(checked) => handleWidgetSettingChange(widget.id, 'showInSidebar', checked)}
                                                        disabled={!widgetSetting.enabled}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button onClick={() => setIsSettingsOpen(false)}>{T.close}</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
             {enabledWidgets.length > 0 ? (
                <GridLayout
                    className={`layout ${isEditMode ? 'edit-mode' : ''}`}
                    layout={layout}
                    cols={4}
                    rowHeight={120}
                    onLayoutChange={handleLayoutChange}
                    isDraggable={isEditMode}
                    isResizable={isEditMode}
                >
                    {enabledWidgets.map(widgetConfig => {
                        const widgetDef = WIDGETS.find(w => w.id === widgetConfig.id);
                        if (!widgetDef) return null;
                        const WidgetComponent = widgetDef.component;
                        
                        return (
                            <div key={widgetConfig.id} className="bg-card rounded-lg shadow h-full">
                                <WidgetComponent settings={appSettings} />
                            </div>
                        );
                    })}
                </GridLayout>
            ) : (
                <div className="flex-1 flex items-center justify-center h-full rounded-lg border-2 border-dashed border-muted-foreground/30">
                    <p className="text-muted-foreground">{T.noWidgetsEnabled}</p>
                </div>
            )}
        </div>
    );
}

export default function WidgetsPage() {
    return (
        <Suspense fallback={<div className="p-4 md:p-6 h-full"><Skeleton className="h-[600px] w-full" /></div>}>
            <WidgetsView />
        </Suspense>
    );
}

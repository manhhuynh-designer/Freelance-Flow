
"use client";

import React, { useState, Suspense } from 'react';
import { useDashboard } from '@/contexts/dashboard-context';
import { Skeleton } from '@/components/ui/skeleton';
import { i18n } from '@/lib/i18n';
import { WIDGETS } from '@/lib/widgets';
import type { AppSettings, WidgetSetting } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Cog } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

function WidgetsView() {
    const dashboardContext = useDashboard();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    if (!dashboardContext) {
        return (
            <div className="p-4 md:p-6 h-full">
                <Skeleton className="h-[600px] w-full" />
            </div>
        );
    }

    const { appSettings, setAppSettings } = dashboardContext;
    const T = i18n[appSettings.language];

    const handleWidgetSettingChange = (id: string, key: keyof WidgetSetting, value: boolean) => {
        setAppSettings(prev => {
            const newWidgets = (prev.widgets || []).map(w =>
                w.id === id ? { ...w, [key]: value } : w
            );
            // If we're disabling a widget, also disable showing it in sidebar
            if (key === 'enabled' && !value) {
                const targetWidget = newWidgets.find(w => w.id === id);
                if (targetWidget) targetWidget.showInSidebar = false;
            }
            return { ...prev, widgets: newWidgets };
        });
    };

    const enabledWidgets = (appSettings.widgets || []).filter(w => w.enabled);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h1 className="text-2xl font-bold font-headline">{T.widgets}</h1>
                 <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Cog className="mr-2 h-4 w-4" />
                            {T.settings}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{T.manageWidgets}</DialogTitle>
                            <DialogDescription>{T.manageWidgetsDesc}</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            {WIDGETS.map((widget) => {
                                const widgetSetting = (appSettings.widgets || []).find(w => w.id === widget.id) || { id: widget.id, enabled: false, showInSidebar: false, colSpan: 1, rowSpan: 1 };
                                return (
                                    <div key={widget.id} className="flex items-start justify-between rounded-lg border p-3">
                                        <div className="flex items-center gap-3">
                                            <widget.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div className="space-y-0.5">
                                                <Label htmlFor={`widget-enabled-${widget.id}`} className="text-sm">
                                                    {T[widget.nameKey as keyof typeof T] || widget.name}
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    {T[widget.descriptionKey as keyof typeof T] || widget.description}
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
             {enabledWidgets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ gridAutoRows: '120px' }}>
                    {enabledWidgets.map(widgetConfig => {
                        const widgetDef = WIDGETS.find(w => w.id === widgetConfig.id);
                        if (!widgetDef) return null;
                        const WidgetComponent = widgetDef.component;
                        
                        const style: React.CSSProperties = {
                            gridColumn: `span ${widgetConfig.colSpan || 1}`,
                            gridRow: `span ${widgetConfig.rowSpan || 1}`,
                            minHeight: (widgetConfig.rowSpan || 1) * 120, // ensure min height
                        };

                        return (
                            <div key={widgetConfig.id} style={style} className="h-full">
                                <WidgetComponent settings={appSettings} />
                            </div>
                        );
                    })}
                </div>
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

"use client";

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useDashboard } from '@/contexts/dashboard-context';
import { hexToHsl } from '@/lib/colors';
import { getContrastingTextColor } from "@/lib/colors";

export function ThemeApplicator() {
    const { theme: mode } = useTheme();
    const dashboardContext = useDashboard();
    const appSettings = dashboardContext?.appData?.appSettings;

    useEffect(() => {
        if (!appSettings?.theme || !mode) return;

        const root = document.documentElement;
        const { primary, accent } = appSettings.theme;

        const resolvedMode = mode === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : mode;

        const primaryHsl = hexToHsl(primary);
        
        if (primaryHsl) {
            const { h, s, l } = primaryHsl;
            
            // --- Set Global Theme Variables ---
            root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
            root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
            
            const accentColor = accent || primary;
            const accentHsl = hexToHsl(accentColor);
            if (accentHsl) {
                const primaryFgColor = getContrastingTextColor(primary) === '#FFFFFF' ? '0 0% 100%' : '215 39% 10%';
                const accentFgColor = getContrastingTextColor(accentColor) === '#FFFFFF' ? '0 0% 100%' : '215 39% 10%';
                root.style.setProperty('--primary-foreground', primaryFgColor);
                root.style.setProperty('--accent', `${accentHsl.h} ${accentHsl.s}% ${accentHsl.l}%`);
                root.style.setProperty('--accent-foreground', accentFgColor);
            }

            // --- Set Sidebar Specific Variables (derived from global theme) ---
            const bgLightness = resolvedMode === 'dark' ? 15 : 94;
            const accentLightness = resolvedMode === 'dark' ? 22 : 88;
            const fgColor = resolvedMode === 'dark' ? '210 40% 98%' : '215 39% 27%';

            root.style.setProperty('--sidebar-background', `${h} ${s}% ${bgLightness}%`);
            root.style.setProperty('--sidebar-accent', `${h} ${s * 0.9}% ${accentLightness}%`);
            root.style.setProperty('--sidebar-primary', `${h} ${s}% ${l}%`);
            root.style.setProperty('--sidebar-foreground', fgColor);
            root.style.setProperty('--sidebar-accent-foreground', fgColor);
            root.style.setProperty('--sidebar-ring', `${h} ${s}% ${l}%`);
            root.style.setProperty('--sidebar-primary-foreground', getContrastingTextColor(primary) === '#FFFFFF' ? '0 0% 100%' : '215 39% 10%');
        }

    }, [appSettings?.theme, mode]);

    return null;
}
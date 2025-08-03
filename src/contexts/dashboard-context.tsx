"use client";

import { createContext, ReactNode, useContext } from 'react';
import { useAppData } from '@/hooks/useAppData';

type DashboardContextType = ReturnType<typeof useAppData>;

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const data = useAppData();
    
    // The check for isDataLoaded will be moved to the layout
    return (
        <DashboardContext.Provider value={data}>
            {children}
        </DashboardContext.Provider>
    );
}

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
};

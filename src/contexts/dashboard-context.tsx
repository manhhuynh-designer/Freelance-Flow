"use client";

import { createContext, ReactNode, useContext } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useWorkTimeData } from '@/hooks/useWorkTimeData';

type DashboardContextType = ReturnType<typeof useAppData> & { workTime: ReturnType<typeof useWorkTimeData> };

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const data = useAppData();
    const workTime = useWorkTimeData(data.appData?.workSessions);
    
    // The check for isDataLoaded will be moved to the layout
    return (
    <DashboardContext.Provider value={{ ...data, workTime }}>
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

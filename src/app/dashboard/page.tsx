"use client";

import { Suspense } from 'react';
import DashboardContent from '@/components/dashboard-content';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardLoading() {
    return (
        <div className="space-y-4">
            <Skeleton className="h-[250px] w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

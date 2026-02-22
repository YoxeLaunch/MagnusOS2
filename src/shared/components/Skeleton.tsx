import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`}></div>
    );
};

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-32 rounded-xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
            </div>

            {/* Row 1 Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Skeleton className="h-40 rounded-2xl" />
                <div className="lg:col-span-3">
                    <Skeleton className="h-40 rounded-2xl" />
                </div>
            </div>

            {/* Row 2 Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
            </div>

            {/* Row 3 Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Skeleton className="h-80 rounded-2xl" />
                </div>
                <Skeleton className="h-80 rounded-2xl" />
            </div>
        </div>
    );
};

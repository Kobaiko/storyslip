import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin text-gray-400',
        sizeClasses[size],
        className
      )} 
    />
  );
}

interface LoadingStateProps {
  loading: boolean;
  error?: Error | string | null;
  isEmpty?: boolean;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function LoadingState({
  loading,
  error,
  isEmpty,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        {loadingComponent || (
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        {errorComponent || (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-sm text-gray-500">
              {typeof error === 'string' ? error : error?.message || 'An unexpected error occurred'}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center py-12">
        {emptyComponent || (
          <div className="text-center">
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No data available
            </h3>
            <p className="text-sm text-gray-500">
              There's no data to display at the moment
            </p>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

interface InlineLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function InlineLoading({ loading, children, size = 'sm' }: InlineLoadingProps) {
  if (loading) {
    return <LoadingSpinner size={size} />;
  }

  return <>{children}</>;
}

interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoading({ loading, children, loadingText }: ButtonLoadingProps) {
  if (loading) {
    return (
      <div className="flex items-center">
        <LoadingSpinner size="sm" className="mr-2" />
        {loadingText || 'Loading...'}
      </div>
    );
  }

  return <>{children}</>;
}

// Skeleton components for loading states
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        'animate-pulse bg-gray-200 rounded',
        className
      )} 
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b">
        <div className="flex space-x-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4">
            <div className="flex space-x-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
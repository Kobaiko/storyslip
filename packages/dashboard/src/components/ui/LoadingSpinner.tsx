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
  error?: Error | null;
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
              {error.message || 'An unexpected error occurred'}
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
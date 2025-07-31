import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className 
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    secondary: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'success';
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ 
  status, 
  children, 
  size = 'md', 
  className 
}: StatusBadgeProps) {
  const statusConfig = {
    active: { variant: 'success' as const, label: 'Active' },
    inactive: { variant: 'secondary' as const, label: 'Inactive' },
    pending: { variant: 'warning' as const, label: 'Pending' },
    error: { variant: 'error' as const, label: 'Error' },
    success: { variant: 'success' as const, label: 'Success' },
  };

  const config = statusConfig[status];

  return (
    <Badge 
      variant={config.variant} 
      size={size} 
      className={className}
    >
      {children || config.label}
    </Badge>
  );
}

interface DotBadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

export function DotBadge({ 
  variant = 'default', 
  children, 
  className 
}: DotBadgeProps) {
  const dotColors = {
    default: 'bg-gray-400',
    success: 'bg-green-400',
    warning: 'bg-yellow-400',
    error: 'bg-red-400',
    info: 'bg-blue-400',
  };

  return (
    <div className={cn('flex items-center', className)}>
      <div className={cn('w-2 h-2 rounded-full mr-2', dotColors[variant])} />
      {children}
    </div>
  );
}

interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'error';
  className?: string;
}

export function CountBadge({ 
  count, 
  max = 99, 
  variant = 'default', 
  className 
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString();
  
  const variantClasses = {
    default: 'bg-blue-500 text-white',
    error: 'bg-red-500 text-white',
  };

  if (count === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full',
        variantClasses[variant],
        className
      )}
    >
      {displayCount}
    </span>
  );
}
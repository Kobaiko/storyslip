import React from 'react';
import { clsx } from 'clsx';

export interface FormContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  centered?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function FormContainer({
  children,
  className,
  maxWidth = 'md',
  centered = true,
  padding = 'md'
}: FormContainerProps) {
  // Maximum width classes with responsive behavior
  const maxWidthClasses = {
    sm: 'max-w-sm',      // 384px
    md: 'max-w-md',      // 448px  
    lg: 'max-w-2xl',     // 672px
    xl: 'max-w-4xl',     // 896px
    full: 'max-w-none'
  };

  // Padding classes with responsive behavior
  const paddingClasses = {
    none: '',
    sm: 'p-4 sm:p-6',
    md: 'p-6 sm:p-8',
    lg: 'p-8 sm:p-10'
  };

  return (
    <div className={clsx(
      // Base container styles
      'w-full',
      
      // Maximum width
      maxWidthClasses[maxWidth],
      
      // Centering
      centered && 'mx-auto',
      
      // Padding
      paddingClasses[padding],
      
      // Responsive behavior
      'px-4 sm:px-6 lg:px-8',
      
      // Custom className
      className
    )}>
      <div className="w-full space-y-6">
        {children}
      </div>
    </div>
  );
}

// Specialized form containers for common use cases
export function AuthFormContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <FormContainer 
      maxWidth="sm" 
      centered 
      padding="md"
      className={clsx('min-h-screen flex items-center justify-center', className)}
    >
      <div className="w-full max-w-sm space-y-6">
        {children}
      </div>
    </FormContainer>
  );
}

export function SettingsFormContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <FormContainer 
      maxWidth="lg" 
      centered={false} 
      padding="lg"
      className={className}
    >
      {children}
    </FormContainer>
  );
}

export function ContentFormContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <FormContainer 
      maxWidth="xl" 
      centered={false} 
      padding="md"
      className={className}
    >
      {children}
    </FormContainer>
  );
}
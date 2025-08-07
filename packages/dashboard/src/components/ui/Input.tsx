import React, { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'outlined';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    fullWidth = true, 
    leftIcon, 
    rightIcon,
    size = 'md',
    variant = 'default',
    id, 
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`;

    // Size variants with responsive behavior
    const sizeClasses = {
      sm: 'h-9 px-3 py-2 text-sm',
      md: 'h-12 px-4 py-3 text-base', // Enhanced for split-screen layout
      lg: 'h-14 px-6 py-4 text-lg'
    };

    // Variant styles
    const variantClasses = {
      default: 'border-gray-300 bg-white hover:border-gray-400',
      filled: 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300',
      outlined: 'border-2 border-gray-300 bg-white hover:border-gray-400'
    };

    // Width classes with responsive behavior
    const widthClasses = fullWidth 
      ? 'w-full min-w-0' 
      : 'w-full sm:w-auto sm:min-w-[320px] md:min-w-[400px]';

    return (
      <div className={clsx('flex flex-col space-y-2', fullWidth && 'w-full')}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-sm font-medium text-gray-700 leading-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-400 text-sm">{leftIcon}</span>
            </div>
          )}
          <input
            id={inputId}
            className={clsx(
              // Base styles
              'border rounded-lg shadow-sm placeholder-gray-400 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              // Enhanced focus state for split-screen layout
              'focus:ring-offset-0',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60',
              
              // Size classes
              sizeClasses[size],
              
              // Variant classes
              variantClasses[variant],
              
              // Width classes
              widthClasses,
              
              // Icon padding
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              
              // Error state
              error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
              
              // Custom className
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-400 text-sm">{rightIcon}</span>
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600 leading-tight" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 leading-tight">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
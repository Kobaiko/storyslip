import React from 'react';
import { cn } from '../../lib/utils';
import { Input } from './Input';
import { Button } from './Button';
import { Switch, SwitchWithLabel } from './Switch';
import { FormContainer } from './FormContainer';
import { FormFieldGroup } from './FormFieldGroup';

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  error?: string;
}

export function FormField({ children, className, required, error }: FormFieldProps) {
  return (
    <div className={cn(
      'space-y-2',
      error && 'form-field-error',
      required && 'form-field-required',
      className
    )}>
      {children}
    </div>
  );
}

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  layout?: 'default' | 'responsive' | 'compact';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  spacing?: 'tight' | 'normal' | 'loose';
  noValidate?: boolean;
}

export function Form({ 
  children, 
  onSubmit, 
  className, 
  layout = 'default',
  maxWidth = 'md',
  spacing = 'normal',
  noValidate = true,
  ...props 
}: FormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  // Spacing classes
  const spacingClasses = {
    tight: 'space-y-4',
    normal: 'space-y-6',
    loose: 'space-y-8'
  };

  // Layout-specific classes
  const layoutClasses = {
    default: spacingClasses[spacing],
    responsive: `${spacingClasses[spacing]} max-w-none`,
    compact: 'space-y-3'
  };

  const formContent = (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'form',
        layoutClasses[layout],
        className
      )}
      noValidate={noValidate}
      {...props}
    >
      {children}
    </form>
  );

  // Wrap in FormContainer for responsive layouts
  if (layout === 'responsive') {
    return (
      <FormContainer maxWidth={maxWidth} centered={false}>
        {formContent}
      </FormContainer>
    );
  }

  return formContent;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    size = 'md',
    fullWidth = true,
    id, 
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 11)}`;

    // Size variants
    const sizeClasses = {
      sm: 'min-h-[60px] px-3 py-2 text-sm',
      md: 'min-h-[80px] px-4 py-3 text-base',
      lg: 'min-h-[120px] px-5 py-4 text-lg'
    };

    // Width classes
    const widthClasses = fullWidth 
      ? 'w-full' 
      : 'w-full sm:w-auto sm:min-w-[320px] md:min-w-[400px]';

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={textareaId}
            className="text-sm font-medium text-gray-700 leading-none"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex rounded-lg border border-gray-300 bg-white shadow-sm placeholder-gray-400 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50',
            'resize-y',
            sizeClasses[size],
            widthClasses,
            error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, placeholder, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substring(2, 11)}`;

    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={selectId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substring(2, 11)}`;

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={checkboxId}
            className={cn(
              'h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500',
              error && 'border-destructive',
              className
            )}
            ref={ref}
            {...props}
          />
          {label && (
            <label 
              htmlFor={checkboxId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface RadioGroupProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  onChange?: (value: string) => void;
  name: string;
}

export function RadioGroup({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  name,
}: RadioGroupProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium leading-none">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={option.disabled}
              className={cn(
                'h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500',
                error && 'border-destructive'
              )}
            />
            <label 
              htmlFor={`${name}-${option.value}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn('flex justify-end space-x-3 pt-4 border-t', className)}>
      {children}
    </div>
  );
}

// Hook for form validation
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: any) => string | undefined>>
) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const setValue = React.useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const setFieldTouched = React.useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validateField = React.useCallback((field: keyof T) => {
    const rule = validationRules[field];
    if (!rule) return;

    const error = rule(values[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
    return error;
  }, [values, validationRules]);

  const validateAll = React.useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasErrors = false;

    Object.keys(validationRules).forEach((field) => {
      const rule = validationRules[field as keyof T];
      if (rule) {
        const error = rule(values[field as keyof T]);
        if (error) {
          newErrors[field as keyof T] = error;
          hasErrors = true;
        }
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(validationRules).reduce((acc, field) => ({
        ...acc,
        [field]: true,
      }), {})
    );

    return !hasErrors;
  }, [values, validationRules]);

  const reset = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateField,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0,
  };
}

// Re-export Switch components
export { Switch, SwitchWithLabel };

// Re-export Input component for convenience
export { Input } from './Input';

// Re-export new layout components
export { FormContainer, AuthFormContainer, SettingsFormContainer, ContentFormContainer } from './FormContainer';
export { FormFieldGroup, PersonalInfoFieldGroup, ContactInfoFieldGroup, SecurityFieldGroup, ContentMetadataFieldGroup, SEOFieldGroup } from './FormFieldGroup';
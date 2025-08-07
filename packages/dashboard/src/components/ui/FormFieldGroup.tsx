import React from 'react';
import { clsx } from 'clsx';

export interface FormFieldGroupProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  layout?: 'single' | 'two-column' | 'three-column' | 'auto';
  spacing?: 'tight' | 'normal' | 'loose';
  divider?: boolean;
}

export function FormFieldGroup({
  children,
  title,
  description,
  className,
  layout = 'single',
  spacing = 'normal',
  divider = false
}: FormFieldGroupProps) {
  // Layout classes with responsive behavior
  const layoutClasses = {
    single: 'grid grid-cols-1 gap-4',
    'two-column': 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6',
    'three-column': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
    auto: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-fit'
  };

  // Spacing classes
  const spacingClasses = {
    tight: 'space-y-3',
    normal: 'space-y-4',
    loose: 'space-y-6'
  };

  return (
    <div className={clsx(
      'form-field-group',
      spacingClasses[spacing],
      divider && 'border-b border-gray-200 pb-6 mb-6',
      className
    )}>
      {/* Group Header */}
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-gray-900 leading-6">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 leading-5">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Fields Container */}
      <div className={layoutClasses[layout]}>
        {children}
      </div>
    </div>
  );
}

// Specialized field group components
export function PersonalInfoFieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <FormFieldGroup
      title="Personal Information"
      description="Basic information about your account"
      layout="two-column"
      spacing="normal"
      divider
      className={className}
    >
      {children}
    </FormFieldGroup>
  );
}

export function ContactInfoFieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <FormFieldGroup
      title="Contact Information"
      description="How we can reach you"
      layout="two-column"
      spacing="normal"
      divider
      className={className}
    >
      {children}
    </FormFieldGroup>
  );
}

export function SecurityFieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <FormFieldGroup
      title="Security Settings"
      description="Manage your account security"
      layout="single"
      spacing="normal"
      divider
      className={className}
    >
      {children}
    </FormFieldGroup>
  );
}

export function ContentMetadataFieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <FormFieldGroup
      title="Content Details"
      description="Basic information about your content"
      layout="two-column"
      spacing="normal"
      className={className}
    >
      {children}
    </FormFieldGroup>
  );
}

export function SEOFieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <FormFieldGroup
      title="SEO Settings"
      description="Optimize your content for search engines"
      layout="single"
      spacing="normal"
      divider
      className={className}
    >
      {children}
    </FormFieldGroup>
  );
}
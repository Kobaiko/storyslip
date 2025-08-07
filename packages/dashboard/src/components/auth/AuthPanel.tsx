import React from 'react';
import { Logo } from '../ui/Logo';

interface AuthPanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AuthPanel: React.FC<AuthPanelProps> = ({
  title,
  subtitle,
  children
}) => {
  return (
    <>
      {/* Mobile Logo - Only shown on small screens */}
      <div className="lg:hidden mb-8 text-center">
        <Logo size="md" />
      </div>
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
        )}
      </div>
      
      {/* Form Content */}
      <div className="space-y-6">
        {children}
      </div>
    </>
  );
};
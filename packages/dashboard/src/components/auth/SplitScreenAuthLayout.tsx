import React from 'react';

interface SplitScreenAuthLayoutProps {
  children: React.ReactNode;
  preview?: React.ReactNode;
}

export const SplitScreenAuthLayout: React.FC<SplitScreenAuthLayoutProps> = ({
  children,
  preview
}) => {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Product Preview (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {preview}
      </div>
      
      {/* Right Panel - Authentication Form */}
      <div className="flex-1 lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {children}
        </div>
      </div>
    </div>
  );
};
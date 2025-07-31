import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'full' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const sizeValues = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="StorySlip Logo"
        className={sizeClasses[size]}
        width={sizeValues[size]}
        height={sizeValues[size]}
      />
    </div>
  );
};

// Icon-only version for sidebar
export const LogoIcon: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'sm' 
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const sizeValues = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64
  };

  return (
    <img
      src="/logo.png"
      alt="StorySlip Icon"
      className={`${sizeClasses[size]} ${className}`}
      width={sizeValues[size]}
      height={sizeValues[size]}
    />
  );
};
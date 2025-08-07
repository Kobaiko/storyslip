import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    label: 'Contains uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: 'Contains lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: 'Contains number',
    test: (password) => /\d/.test(password),
  },
  {
    label: 'Contains special character',
    test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = '',
}) => {
  const metRequirements = requirements.filter(req => req.test(password));
  const strength = metRequirements.length;
  
  const getStrengthColor = () => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 3) return 'bg-yellow-500';
    if (strength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Password strength</span>
          <span className={`text-sm font-medium ${
            strength <= 2 ? 'text-red-600' :
            strength <= 3 ? 'text-yellow-600' :
            strength <= 4 ? 'text-blue-600' :
            'text-green-600'
          }`}>
            {getStrengthText()}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(strength / requirements.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1">
        {requirements.map((requirement, index) => {
          const isMet = requirement.test(password);
          
          return (
            <div
              key={index}
              className={`flex items-center space-x-2 text-sm ${
                isMet ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {isMet ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span>{requirement.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
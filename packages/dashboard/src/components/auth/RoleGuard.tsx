import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
}) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Access Restricted
          </h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this feature.
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Required role: {allowedRoles.join(' or ')}</p>
            <p>Your role: {user?.role}</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
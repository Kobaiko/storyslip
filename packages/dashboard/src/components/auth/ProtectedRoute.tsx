import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireRole,
  redirectTo = '/login',
}) => {
  const { user, loading, isAuthenticated, refreshSession } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Try to refresh session if not authenticated but not loading
    if (!loading && !isAuthenticated) {
      refreshSession();
    }
  }, [loading, isAuthenticated, refreshSession]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role requirements
  if (requireRole && user) {
    const hasRequiredRole = requireRole.includes(user.role);
    
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required role: {requireRole.join(' or ')}
            </p>
            <p className="text-sm text-gray-500">
              Your role: {user.role}
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
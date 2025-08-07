import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SessionManagerProps {
  children: React.ReactNode;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ children }) => {
  const { isAuthenticated, logout, refreshSession } = useAuth();
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let warningTimer: NodeJS.Timeout;
    let expirationTimer: NodeJS.Timeout;

    const setupSessionTimers = () => {
      // Show warning 5 minutes before session expires (55 minutes)
      warningTimer = setTimeout(() => {
        setShowSessionWarning(true);
      }, 55 * 60 * 1000);

      // Auto-logout after 1 hour
      expirationTimer = setTimeout(() => {
        setSessionExpired(true);
        logout();
      }, 60 * 60 * 1000);
    };

    const resetTimers = () => {
      clearTimeout(warningTimer);
      clearTimeout(expirationTimer);
      setupSessionTimers();
    };

    // Set up initial timers
    setupSessionTimers();

    // Reset timers on user activity
    const handleUserActivity = () => {
      if (showSessionWarning) {
        setShowSessionWarning(false);
      }
      resetTimers();
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expirationTimer);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [isAuthenticated, logout, showSessionWarning]);

  const handleExtendSession = async () => {
    try {
      const success = await refreshSession();
      if (success) {
        setShowSessionWarning(false);
      } else {
        setSessionExpired(true);
        logout();
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      setSessionExpired(true);
      logout();
    }
  };

  const handleLogout = () => {
    setShowSessionWarning(false);
    logout();
  };

  return (
    <>
      {children}
      
      {/* Session warning modal */}
      <Modal
        isOpen={showSessionWarning}
        onClose={() => setShowSessionWarning(false)}
        title="Session Expiring Soon"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Your session will expire in 5 minutes due to inactivity. Would you like to extend your session?
          </p>
          
          <div className="flex space-x-3">
            <Button
              onClick={handleExtendSession}
              className="flex-1"
            >
              Extend Session
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1"
            >
              Logout
            </Button>
          </div>
        </div>
      </Modal>

      {/* Session expired modal */}
      <Modal
        isOpen={sessionExpired}
        onClose={() => setSessionExpired(false)}
        title="Session Expired"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Your session has expired due to inactivity. Please sign in again to continue.
          </p>
          
          <Button
            onClick={() => {
              setSessionExpired(false);
              window.location.href = '/login';
            }}
            className="w-full"
          >
            Sign In Again
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default SessionManager;
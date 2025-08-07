import { supabase } from './supabase';

export interface SessionInfo {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  expires_at?: number;
}

export class SessionManager {
  private static readonly SESSION_COOKIE = 'sb-user-session';
  private static readonly API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  /**
   * Get session info from cookie
   */
  static getSessionInfo(): SessionInfo | null {
    try {
      const sessionCookie = this.getCookie(this.SESSION_COOKIE);
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie);
        
        // Check if session is expired
        if (session.expires_at && Date.now() > session.expires_at) {
          return null;
        }
        
        return session;
      }
    } catch (error) {
      console.error('Error parsing session cookie:', error);
    }
    
    return null;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const session = this.getSessionInfo();
    return !!session?.user;
  }

  /**
   * Get current user from session
   */
  static getCurrentUser() {
    const session = this.getSessionInfo();
    return session?.user || null;
  }

  /**
   * Check session status with API
   */
  static async checkSessionStatus(): Promise<{
    authenticated: boolean;
    user?: any;
    sessionInfo?: SessionInfo;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/session/status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
    } catch (error) {
      console.error('Error checking session status:', error);
    }

    return { authenticated: false };
  }

  /**
   * Refresh session using API
   */
  static async refreshSession(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/session/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Clear session (logout from all applications)
   */
  static async clearSession(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/session/clear`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Also sign out from Supabase client
      await supabase.auth.signOut();

      return response.ok;
    } catch (error) {
      console.error('Error clearing session:', error);
      return false;
    }
  }

  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          user: result.data.user,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Error during login:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * Register new user
   */
  static async register(email: string, password: string, name: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          user: result.data.user,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Registration failed',
        };
      }
    } catch (error) {
      console.error('Error during registration:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Also clear session
      await this.clearSession();

      return response.ok;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  }

  /**
   * Set up automatic session refresh
   */
  static setupAutoRefresh(intervalMs: number = 5 * 60 * 1000) { // 5 minutes
    setInterval(async () => {
      const session = this.getSessionInfo();
      if (session && session.expires_at) {
        const timeUntilExpiry = session.expires_at - Date.now();
        
        // Refresh if expiring within 2 minutes
        if (timeUntilExpiry < 2 * 60 * 1000) {
          await this.refreshSession();
        }
      }
    }, intervalMs);
  }

  /**
   * Utility function to get cookie value
   */
  private static getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }
}

export default SessionManager;
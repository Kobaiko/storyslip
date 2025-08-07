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
  private static readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  /**
   * Get session info from cookie (server-side compatible)
   */
  static getSessionInfo(cookieString?: string): SessionInfo | null {
    try {
      let sessionCookie: string | null = null;
      
      if (typeof window !== 'undefined') {
        // Client-side
        sessionCookie = this.getCookie(this.SESSION_COOKIE);
      } else if (cookieString) {
        // Server-side
        const cookies = this.parseCookies(cookieString);
        sessionCookie = cookies[this.SESSION_COOKIE] || null;
      }

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
  static isAuthenticated(cookieString?: string): boolean {
    const session = this.getSessionInfo(cookieString);
    return !!session?.user;
  }

  /**
   * Get current user from session
   */
  static getCurrentUser(cookieString?: string) {
    const session = this.getSessionInfo(cookieString);
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
   * Redirect to dashboard if authenticated
   */
  static redirectToDashboardIfAuthenticated(cookieString?: string) {
    if (this.isAuthenticated(cookieString)) {
      const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';
      if (typeof window !== 'undefined') {
        window.location.href = dashboardUrl;
      }
      return true;
    }
    return false;
  }

  /**
   * Get dashboard URL with optional redirect
   */
  static getDashboardUrl(redirectPath?: string): string {
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';
    if (redirectPath) {
      return `${dashboardUrl}${redirectPath}`;
    }
    return dashboardUrl;
  }

  /**
   * Get login URL with optional redirect
   */
  static getLoginUrl(redirectPath?: string): string {
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';
    const loginUrl = `${dashboardUrl}/login`;
    if (redirectPath) {
      return `${loginUrl}?redirect=${encodeURIComponent(redirectPath)}`;
    }
    return loginUrl;
  }

  /**
   * Get register URL with optional redirect
   */
  static getRegisterUrl(redirectPath?: string): string {
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3000';
    const registerUrl = `${dashboardUrl}/register`;
    if (redirectPath) {
      return `${registerUrl}?redirect=${encodeURIComponent(redirectPath)}`;
    }
    return registerUrl;
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
   * Utility function to get cookie value (client-side)
   */
  private static getCookie(name: string): string | null {
    if (typeof window === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  /**
   * Utility function to parse cookies (server-side)
   */
  private static parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }
}

export default SessionManager;
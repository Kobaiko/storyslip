import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import DatabaseService from './database';

export interface SessionConfig {
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean;
  maxAge?: number;
}

export class SessionService {
  private static readonly ACCESS_TOKEN_COOKIE = 'sb-access-token';
  private static readonly REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
  private static readonly USER_SESSION_COOKIE = 'sb-user-session';

  /**
   * Get session configuration based on environment
   */
  private static getSessionConfig(): SessionConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = process.env.SESSION_DOMAIN || (isProduction ? '.storyslip.com' : 'localhost');

    return {
      domain,
      secure: isProduction,
      sameSite: isProduction ? 'lax' : 'lax',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  /**
   * Set authentication cookies
   */
  static setAuthCookies(res: Response, accessToken: string, refreshToken: string, userSession?: any) {
    const config = this.getSessionConfig();

    // Set access token cookie (shorter expiry)
    res.cookie(this.ACCESS_TOKEN_COOKIE, accessToken, {
      ...config,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Set refresh token cookie (longer expiry)
    res.cookie(this.REFRESH_TOKEN_COOKIE, refreshToken, {
      ...config,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set user session info cookie (for client-side access)
    if (userSession) {
      res.cookie(this.USER_SESSION_COOKIE, JSON.stringify({
        user: {
          id: userSession.id,
          email: userSession.email,
          name: userSession.name || userSession.user_metadata?.name,
        },
        expires_at: Date.now() + (60 * 60 * 1000), // 1 hour
      }), {
        ...config,
        httpOnly: false, // Allow client-side access
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    }
  }

  /**
   * Clear authentication cookies
   */
  static clearAuthCookies(res: Response) {
    const config = this.getSessionConfig();

    res.clearCookie(this.ACCESS_TOKEN_COOKIE, config);
    res.clearCookie(this.REFRESH_TOKEN_COOKIE, config);
    res.clearCookie(this.USER_SESSION_COOKIE, { ...config, httpOnly: false });
  }

  /**
   * Get tokens from cookies
   */
  static getTokensFromCookies(req: Request): { accessToken?: string; refreshToken?: string } {
    return {
      accessToken: req.cookies[this.ACCESS_TOKEN_COOKIE],
      refreshToken: req.cookies[this.REFRESH_TOKEN_COOKIE],
    };
  }

  /**
   * Create or update user session in database
   */
  static async createUserSession(userId: string, accessToken: string, refreshToken: string, req: Request) {
    try {
      const sessionData = {
        user_id: userId,
        session_token: accessToken,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        is_active: true,
      };

      const { data, error } = await supabase
        .from('user_sessions')
        .upsert(sessionData, { 
          onConflict: 'session_token',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating user session:', error);
      return null;
    }
  }

  /**
   * Invalidate user session
   */
  static async invalidateUserSession(sessionToken: string) {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);

      if (error) {
        console.error('Error invalidating session:', error);
      }
    } catch (error) {
      console.error('Error invalidating session:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions() {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
      }
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Refresh session tokens
   */
  static async refreshSession(refreshToken: string): Promise<{
    accessToken?: string;
    refreshToken?: string;
    user?: any;
    error?: any;
  }> {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        return { error };
      }

      return {
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
        user: data.user,
      };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Middleware to handle session refresh automatically
   */
  static sessionRefreshMiddleware() {
    return async (req: Request, res: Response, next: Function) => {
      const { accessToken, refreshToken } = this.getTokensFromCookies(req);

      // If no access token but we have refresh token, try to refresh
      if (!accessToken && refreshToken) {
        try {
          const result = await this.refreshSession(refreshToken);
          
          if (!result.error && result.accessToken) {
            // Set new cookies
            this.setAuthCookies(res, result.accessToken, result.refreshToken!, result.user);
            
            // Add token to request for downstream middleware
            req.headers.authorization = `Bearer ${result.accessToken}`;
          }
        } catch (error) {
          console.error('Session refresh failed:', error);
        }
      } else if (accessToken) {
        // Add existing token to request
        req.headers.authorization = `Bearer ${accessToken}`;
      }

      next();
    };
  }

  /**
   * Get user session info from cookie (client-side accessible)
   */
  static getUserSessionFromCookie(req: Request): any {
    try {
      const sessionCookie = req.cookies[this.USER_SESSION_COOKIE];
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie);
        
        // Check if session is expired
        if (session.expires_at && Date.now() > session.expires_at) {
          return null;
        }
        
        return session;
      }
    } catch (error) {
      console.error('Error parsing user session cookie:', error);
    }
    
    return null;
  }
}

export default SessionService;
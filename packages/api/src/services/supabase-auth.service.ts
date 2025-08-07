import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../config/supabase';
import { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export class SupabaseAuthService {
  private static instance: SupabaseAuthService;

  static getInstance(): SupabaseAuthService {
    if (!SupabaseAuthService.instance) {
      SupabaseAuthService.instance = new SupabaseAuthService();
    }
    return SupabaseAuthService.instance;
  }
  /**
   * Middleware to verify JWT token from Supabase
   */
  static async verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Verify the JWT token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Add user to request object
      req.user = user;
      req.userId = user.id;

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ error: 'Token verification failed' });
    }
  }

  /**
   * Register a new user
   */
  static async register(email: string, password: string, userData?: any) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userData || {}
      });

      if (error) {
        throw error;
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Registration error:', error);
      return { user: null, error };
    }
  }

  /**
   * Sign in a user
   */
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      return { 
        user: data.user, 
        session: data.session,
        error: null 
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return { user: null, session: null, error };
    }
  }

  /**
   * Sign out a user
   */
  static async signOut(token: string) {
    try {
      // Set the session for the client
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: '' // We don't have refresh token in this context
      });

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  /**
   * Refresh a user's session
   */
  static async refreshSession(refreshToken: string) {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        throw error;
      }

      return {
        session: data.session,
        user: data.user,
        error: null
      };
    } catch (error) {
      console.error('Refresh session error:', error);
      return { session: null, user: null, error };
    }
  }

  /**
   * Get user by ID (admin function)
   */
  static async getUserById(userId: string) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (error) {
        throw error;
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Get user error:', error);
      return { user: null, error };
    }
  }

  /**
   * Update user metadata
   */
  static async updateUser(userId: string, updates: any) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        updates
      );

      if (error) {
        throw error;
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error('Update user error:', error);
      return { user: null, error };
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(userId: string) {
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Delete user error:', error);
      return { error };
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.VITE_DASHBOARD_URL || 'http://localhost:3000'}/reset-password`
      });

      if (error) {
        throw error;
      }

      return { error: null };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string, type: string) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any
      });

      if (error) {
        throw error;
      }

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error('Verify email error:', error);
      return { user: null, session: null, error };
    }
  }

  /**
   * Get current user from token
   */
  static async getCurrentUser(token: string) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        throw error;
      }

      return { user, error: null };
    } catch (error) {
      console.error('Get current user error:', error);
      return { user: null, error };
    }
  }
}

export default SupabaseAuthService;
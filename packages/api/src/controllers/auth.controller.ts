import { Request, Response } from 'express';
import { SupabaseAuthService, AuthenticatedRequest } from '../services/supabase-auth.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import DatabaseService from '../services/database';
import SessionService from '../services/session.service';
import { logSecurityEvent } from '../middleware/logger';

export class AuthController {
  /**
   * Register a new user
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    try {
      const result = await SupabaseAuthService.register(email, password, { name });
      
      if (result.error) {
        logSecurityEvent('Registration failed', { email, error: result.error.message }, req);
        
        if (result.error.message.includes('already registered')) {
          return ResponseUtil.conflict(res, 'User with this email already exists');
        }
        
        return ResponseUtil.badRequest(res, result.error.message);
      }

      logSecurityEvent('User registered', { email, userId: result.user!.id }, req);
      
      ResponseUtil.created(res, {
        user: result.user,
        message: 'Registration successful. Please check your email to verify your account.'
      });
    } catch (error: any) {
      logSecurityEvent('Registration failed', { email, error: error.message }, req);
      ResponseUtil.internalError(res, 'Registration failed');
    }
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      const result = await SupabaseAuthService.signIn(email, password);
      
      if (result.error) {
        logSecurityEvent('Login failed', { email, error: result.error.message }, req);
        return ResponseUtil.unauthorized(res, 'Invalid email or password');
      }

      // Get user profile from our database
      const userProfile = await DatabaseService.getCurrentUserProfile(result.user!.id);
      
      // Set secure cookies for cross-application session management
      SessionService.setAuthCookies(
        res, 
        result.session!.access_token, 
        result.session!.refresh_token,
        result.user
      );

      // Create session record in database
      await SessionService.createUserSession(
        result.user!.id,
        result.session!.access_token,
        result.session!.refresh_token,
        req
      );
      
      logSecurityEvent('User logged in', { email, userId: result.user!.id }, req);
      
      ResponseUtil.success(res, {
        user: result.user,
        profile: userProfile.data,
        session: result.session,
        accessToken: result.session!.access_token,
        refreshToken: result.session!.refresh_token,
      });
    } catch (error: any) {
      logSecurityEvent('Login failed', { email, error: error.message }, req);
      ResponseUtil.unauthorized(res, 'Invalid email or password');
    }
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseUtil.badRequest(res, 'Refresh token is required');
    }

    try {
      const result = await SupabaseAuthService.refreshSession(refreshToken);
      
      if (result.error) {
        logSecurityEvent('Token refresh failed', { error: result.error.message }, req);
        return ResponseUtil.unauthorized(res, 'Invalid refresh token');
      }
      
      ResponseUtil.success(res, {
        session: result.session,
        accessToken: result.session!.access_token,
        refreshToken: result.session!.refresh_token,
        user: result.user
      });
    } catch (error: any) {
      logSecurityEvent('Token refresh failed', { error: error.message }, req);
      ResponseUtil.unauthorized(res, 'Invalid refresh token');
    }
  });

  /**
   * Get current user profile
   */
  static getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    try {
      const userProfile = await DatabaseService.getCurrentUserProfile(userId);
      
      if (userProfile.error || !userProfile.data) {
        return ResponseUtil.notFound(res, 'User profile not found');
      }

      ResponseUtil.success(res, { 
        user: req.user,
        profile: userProfile.data 
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch user profile');
    }
  });

  /**
   * Update user profile
   */
  static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const updates = req.body;

    try {
      const result = await SupabaseAuthService.updateUser(userId, updates);
      
      if (result.error) {
        return ResponseUtil.badRequest(res, result.error.message);
      }
      
      logSecurityEvent('Profile updated', { userId }, req);
      
      ResponseUtil.success(res, { user: result.user });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to update profile');
    }
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    try {
      // TODO: Implement password change with current password verification
      // For now, we'll use Supabase's admin function to update password
      const result = await SupabaseAuthService.updateUser(userId, { password: newPassword });
      
      if (result.error) {
        logSecurityEvent('Password change failed', { userId, error: result.error.message }, req);
        return ResponseUtil.badRequest(res, 'Failed to change password');
      }
      
      logSecurityEvent('Password changed', { userId }, req);
      
      ResponseUtil.success(res, { message: 'Password changed successfully' });
    } catch (error: any) {
      logSecurityEvent('Password change failed', { userId, error: error.message }, req);
      ResponseUtil.internalError(res, 'Failed to change password');
    }
  });

  /**
   * Logout user
   */
  static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    
    try {
      // Invalidate session in database
      await SessionService.invalidateUserSession(token);
      
      // Clear authentication cookies
      SessionService.clearAuthCookies(res);
      
      // Sign out from Supabase
      const result = await SupabaseAuthService.signOut(token);
      
      logSecurityEvent('User logged out', { userId }, req);
      
      ResponseUtil.success(res, { message: 'Logged out successfully' });
    } catch (error: any) {
      // Even if logout fails, we still return success for security
      SessionService.clearAuthCookies(res);
      logSecurityEvent('Logout completed', { userId }, req);
      ResponseUtil.success(res, { message: 'Logged out successfully' });
    }
  });

  /**
   * Request password reset
   */
  static requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      const result = await SupabaseAuthService.resetPassword(email);
      
      logSecurityEvent('Password reset requested', { email }, req);
      
      // Always return success to prevent email enumeration
      ResponseUtil.success(res, { 
        message: 'If an account with that email exists, a password reset link has been sent' 
      });
    } catch (error: any) {
      logSecurityEvent('Password reset request failed', { email, error: error.message }, req);
      
      // Still return success to prevent email enumeration
      ResponseUtil.success(res, { 
        message: 'If an account with that email exists, a password reset link has been sent' 
      });
    }
  });

  /**
   * Reset password (placeholder for future implementation)
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    // TODO: Implement token-based password reset in future
    ResponseUtil.success(res, { message: 'Password reset functionality will be implemented in future' });
  });

  /**
   * Verify email (placeholder for future implementation)
   */
  static verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    // TODO: Implement email verification in future
    ResponseUtil.success(res, { message: 'Email verification functionality will be implemented in future' });
  });
}

export default AuthController;
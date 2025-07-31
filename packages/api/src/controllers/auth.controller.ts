import { Request, Response } from 'express';
import { AuthService } from '../services/auth';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { logSecurityEvent } from '../middleware/logger';

export class AuthController {
  /**
   * Register a new user
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    try {
      const result = await AuthService.register({ email, password, name });
      
      logSecurityEvent('User registered', { email, userId: result.user.id }, req);
      
      ResponseUtil.created(res, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      if (error.message === 'User already exists') {
        logSecurityEvent('Registration attempt with existing email', { email }, req);
        ResponseUtil.conflict(res, 'User with this email already exists');
      } else {
        logSecurityEvent('Registration failed', { email, error: error.message }, req);
        ResponseUtil.internalError(res, 'Registration failed');
      }
    }
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
      const result = await AuthService.login({ email, password });
      
      logSecurityEvent('User logged in', { email, userId: result.user.id }, req);
      
      ResponseUtil.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
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
      const result = await AuthService.refreshToken(refreshToken);
      
      ResponseUtil.success(res, {
        accessToken: result.accessToken,
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
    const userId = req.user!.userId;

    try {
      const user = await AuthService.getUserById(userId);
      
      if (!user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      ResponseUtil.success(res, { user });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch user profile');
    }
  });

  /**
   * Update user profile
   */
  static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const updates = req.body;

    try {
      const user = await AuthService.updateProfile(userId, updates);
      
      logSecurityEvent('Profile updated', { userId }, req);
      
      ResponseUtil.success(res, { user });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to update profile');
    }
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    try {
      await AuthService.changePassword(userId, currentPassword, newPassword);
      
      logSecurityEvent('Password changed', { userId }, req);
      
      ResponseUtil.success(res, { message: 'Password changed successfully' });
    } catch (error: any) {
      if (error.message === 'Current password is incorrect') {
        logSecurityEvent('Password change failed - incorrect current password', { userId }, req);
        ResponseUtil.badRequest(res, 'Current password is incorrect');
      } else {
        logSecurityEvent('Password change failed', { userId, error: error.message }, req);
        ResponseUtil.internalError(res, 'Failed to change password');
      }
    }
  });

  /**
   * Logout user (invalidate tokens - placeholder for now)
   */
  static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    
    // TODO: Implement token blacklisting in future if needed
    logSecurityEvent('User logged out', { userId }, req);
    
    ResponseUtil.success(res, { message: 'Logged out successfully' });
  });

  /**
   * Request password reset (placeholder for future implementation)
   */
  static requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    // TODO: Implement email-based password reset in future
    logSecurityEvent('Password reset requested', { email }, req);
    
    // Always return success to prevent email enumeration
    ResponseUtil.success(res, { 
      message: 'If an account with that email exists, a password reset link has been sent' 
    });
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
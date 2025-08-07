import { Request, Response, NextFunction } from 'express';
import { SupabaseAuthService, AuthenticatedRequest } from '../services/supabase-auth.service';
import DatabaseService from '../services/database';

/**
 * Middleware to authenticate JWT tokens using Supabase
 */
export const authenticateToken = SupabaseAuthService.verifyToken;

/**
 * Middleware to check if user has required role
 */
export const requireRole = (roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Get user role from database
    try {
      const userProfile = await DatabaseService.getCurrentUserProfile(req.user.id);
      
      if (userProfile.error || !userProfile.data) {
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
          },
        });
        return;
      }

      const userRole = userProfile.data.role;
      
      if (!roles.includes(userRole)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify user permissions',
        },
      });
    }
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const result = await SupabaseAuthService.getCurrentUser(token);
      if (!result.error && result.user) {
        req.user = result.user;
        req.userId = result.user.id;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

export default {
  authenticateToken,
  requireRole,
  optionalAuth,
};
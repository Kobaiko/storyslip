import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent } from '../middleware/logger';

export class UserController {
  /**
   * Get all users (admin only)
   */
  static getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 10, sort = 'created_at', order = 'desc', search } = req.query;
    
    const { page: pageNum, limit: limitNum, offset } = HelperUtil.parsePagination({ page, limit });
    const { sort: sortField, order: sortOrder } = HelperUtil.parseSort(
      { sort, order }, 
      ['name', 'email', 'created_at', 'last_login_at', 'role', 'subscription_tier']
    );

    try {
      let query = supabase
        .from('users')
        .select('id, email, name, role, subscription_tier, created_at, updated_at, last_login_at, email_verified, avatar_url', { count: 'exact' });

      // Add search filter if provided
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Add sorting
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Add pagination
      query = query.range(offset, offset + limitNum - 1);

      const { data: users, error, count } = await query;

      if (error) {
        throw error;
      }

      ResponseUtil.paginated(res, users || [], count || 0, pageNum, limitNum);
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch users');
    }
  });

  /**
   * Get user by ID (admin only)
   */
  static getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;

    if (!HelperUtil.isValidUuid(userId)) {
      return ResponseUtil.badRequest(res, 'Invalid user ID format');
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name, role, subscription_tier, created_at, updated_at, last_login_at, email_verified, avatar_url, metadata')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      ResponseUtil.success(res, { user });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch user');
    }
  });

  /**
   * Update user (admin only)
   */
  static updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const updates = req.body;
    const currentUserId = req.user!.userId;

    if (!HelperUtil.isValidUuid(userId)) {
      return ResponseUtil.badRequest(res, 'Invalid user ID format');
    }

    // Prevent users from updating their own role
    if (userId === currentUserId && updates.role) {
      return ResponseUtil.forbidden(res, 'Cannot change your own role');
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .update({
          ...HelperUtil.removeUndefined(updates),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id, email, name, role, subscription_tier, created_at, updated_at, last_login_at, email_verified, avatar_url, metadata')
        .single();

      if (error || !user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      logSecurityEvent('User updated by admin', { 
        updatedUserId: userId, 
        adminUserId: currentUserId,
        updates: Object.keys(updates)
      }, req);

      ResponseUtil.success(res, { user });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to update user');
    }
  });

  /**
   * Delete user (admin only)
   */
  static deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const currentUserId = req.user!.userId;

    if (!HelperUtil.isValidUuid(userId)) {
      return ResponseUtil.badRequest(res, 'Invalid user ID format');
    }

    // Prevent users from deleting themselves
    if (userId === currentUserId) {
      return ResponseUtil.forbidden(res, 'Cannot delete your own account');
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        throw error;
      }

      logSecurityEvent('User deleted by admin', { 
        deletedUserId: userId, 
        adminUserId: currentUserId 
      }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to delete user');
    }
  });

  /**
   * Get user statistics (admin only)
   */
  static getUserStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get total users count
      const { count: totalUsers, error: totalError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Get users by role
      const { data: roleStats, error: roleError } = await supabase
        .from('users')
        .select('role')
        .then(({ data, error }) => {
          if (error) throw error;
          
          const stats = data?.reduce((acc: any, user: any) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          }, {}) || {};
          
          return { data: stats, error: null };
        });

      if (roleError) throw roleError;

      // Get users by subscription tier
      const { data: subscriptionStats, error: subError } = await supabase
        .from('users')
        .select('subscription_tier')
        .then(({ data, error }) => {
          if (error) throw error;
          
          const stats = data?.reduce((acc: any, user: any) => {
            acc[user.subscription_tier] = (acc[user.subscription_tier] || 0) + 1;
            return acc;
          }, {}) || {};
          
          return { data: stats, error: null };
        });

      if (subError) throw subError;

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentRegistrations, error: recentError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (recentError) throw recentError;

      ResponseUtil.success(res, {
        totalUsers: totalUsers || 0,
        recentRegistrations: recentRegistrations || 0,
        roleDistribution: roleStats,
        subscriptionDistribution: subscriptionStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch user statistics');
    }
  });

  /**
   * Update user subscription tier (admin only)
   */
  static updateSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const { subscriptionTier } = req.body;
    const currentUserId = req.user!.userId;

    if (!HelperUtil.isValidUuid(userId)) {
      return ResponseUtil.badRequest(res, 'Invalid user ID format');
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .update({
          subscription_tier: subscriptionTier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('id, email, name, subscription_tier')
        .single();

      if (error || !user) {
        return ResponseUtil.notFound(res, 'User not found');
      }

      logSecurityEvent('User subscription updated by admin', { 
        updatedUserId: userId, 
        adminUserId: currentUserId,
        newTier: subscriptionTier
      }, req);

      ResponseUtil.success(res, { user });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to update subscription');
    }
  });
}

export default UserController;
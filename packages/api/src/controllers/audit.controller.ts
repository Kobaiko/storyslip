import { Request, Response } from 'express';
import { auditService } from '../services/audit.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';
import { teamService } from '../services/team.service';

export class AuditController {
  /**
   * Get audit logs for a website
   */
  static getAuditLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      action,
      user_id,
      target_user_id,
      target_resource_type,
      date_from,
      date_to
    } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to view audit logs
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_team');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view audit logs');
      }

      const { page: pageNum, limit: limitNum } = HelperUtil.parsePagination({ page, limit });

      const filters = {
        action: action as string,
        user_id: user_id as string,
        target_user_id: target_user_id as string,
        target_resource_type: target_resource_type as string,
        date_from: date_from as string,
        date_to: date_to as string,
      };

      const result = await auditService.getAuditLogs(websiteId, filters, pageNum, limitNum);

      logDatabaseOperation('SELECT', 'audit_logs', {
        websiteId,
        userId,
        count: result.logs.length,
        filters: Object.keys(filters).filter(key => filters[key as keyof typeof filters]),
      });

      ResponseUtil.paginated(res, result.logs, result.total, result.page, limitNum);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch audit logs');
    }
  });

  /**
   * Get audit statistics for a website
   */
  static getAuditStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { days = '30' } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to view audit logs
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_team');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view audit statistics');
      }

      const daysNum = parseInt(days as string) || 30;
      const stats = await auditService.getAuditStats(websiteId, daysNum);

      logDatabaseOperation('SELECT', 'audit_logs', {
        websiteId,
        userId,
        action: 'stats',
        days: daysNum,
      });

      ResponseUtil.success(res, stats);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch audit statistics');
    }
  });

  /**
   * Get user activity timeline
   */
  static getUserActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, targetUserId } = req.params;
    const { days = '30' } = req.query;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(targetUserId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to view audit logs
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_team');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view user activity');
      }

      const daysNum = parseInt(days as string) || 30;
      const activity = await auditService.getUserActivity(websiteId, targetUserId, daysNum);

      logDatabaseOperation('SELECT', 'audit_logs', {
        websiteId,
        userId,
        targetUserId,
        action: 'user_activity',
        days: daysNum,
      });

      ResponseUtil.success(res, { activity });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch user activity');
    }
  });

  /**
   * Clean up old audit logs (admin only)
   */
  static cleanupOldLogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { days = '365' } = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user is website owner (only owners can cleanup logs)
      const userRole = await teamService.getUserRole(websiteId, userId);
      if (userRole !== 'owner') {
        return ResponseUtil.forbidden(res, 'Only website owners can cleanup audit logs');
      }

      const daysNum = parseInt(days) || 365;
      const deletedCount = await auditService.cleanupOldLogs(daysNum);

      // Log the cleanup action
      await auditService.logWebsiteAction(
        websiteId,
        userId,
        'settings_updated',
        { action: 'audit_logs_cleanup', deleted_count: deletedCount, older_than_days: daysNum },
        req
      );

      logDatabaseOperation('DELETE', 'audit_logs', {
        websiteId,
        userId,
        action: 'cleanup',
        deletedCount,
        days: daysNum,
      });

      ResponseUtil.success(res, { 
        message: `Cleaned up ${deletedCount} old audit log entries`,
        deletedCount,
        olderThanDays: daysNum,
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to cleanup audit logs');
    }
  });
}

export default AuditController;
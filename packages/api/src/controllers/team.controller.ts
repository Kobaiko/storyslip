import { Request, Response } from 'express';
import { teamService } from '../services/team.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';

export class TeamController {
  /**
   * Get team members for a website
   */
  static getTeamMembers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_team');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view team members');
      }

      const members = await teamService.getTeamMembers(websiteId);

      logDatabaseOperation('SELECT', 'website_users', {
        websiteId,
        userId,
        count: members.length,
      });

      ResponseUtil.success(res, { members });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch team members');
    }
  });

  /**
   * Get team member by user ID
   */
  static getTeamMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, memberId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(memberId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_team');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view team member');
      }

      const member = await teamService.getTeamMember(websiteId, memberId);

      logDatabaseOperation('SELECT', 'website_users', {
        websiteId,
        userId,
        memberId,
      });

      ResponseUtil.success(res, { member });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to fetch team member');
    }
  });

  /**
   * Update team member role
   */
  static updateTeamMemberRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, memberId } = req.params;
    const { role } = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(memberId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'change_roles');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to change roles');
      }

      const member = await teamService.updateTeamMemberRole(websiteId, memberId, userId, { role });

      logDatabaseOperation('UPDATE', 'website_users', {
        websiteId,
        userId,
        memberId,
        newRole: role,
      });

      logSecurityEvent('Team member role updated', {
        websiteId,
        memberId,
        newRole: role,
        updatedBy: userId,
      }, req);

      ResponseUtil.success(res, { member });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to update team member role');
    }
  });

  /**
   * Remove team member
   */
  static removeTeamMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, memberId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(memberId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'remove_users');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to remove team members');
      }

      await teamService.removeTeamMember(websiteId, memberId, userId);

      logDatabaseOperation('DELETE', 'website_users', {
        websiteId,
        userId,
        memberId,
      });

      logSecurityEvent('Team member removed', {
        websiteId,
        memberId,
        removedBy: userId,
      }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to remove team member');
    }
  });

  /**
   * Get team statistics
   */
  static getTeamStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_team');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view team statistics');
      }

      const stats = await teamService.getTeamStats(websiteId);

      logDatabaseOperation('SELECT', 'website_users', {
        websiteId,
        userId,
        action: 'stats',
      });

      ResponseUtil.success(res, stats);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch team statistics');
    }
  });

  /**
   * Get audit log
   */
  static getAuditLog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_team');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view audit log');
      }

      const { page: pageNum, limit: limitNum } = HelperUtil.parsePagination({ page, limit });
      const result = await teamService.getAuditLog(websiteId, pageNum, limitNum);

      logDatabaseOperation('SELECT', 'audit_logs', {
        websiteId,
        userId,
        count: result.logs.length,
      });

      ResponseUtil.paginated(res, result.logs, result.total, result.page, limitNum);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch audit log');
    }
  });

  /**
   * Get current user's role for the website
   */
  static getUserRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const role = await teamService.getUserRole(websiteId, userId);

      if (!role) {
        return ResponseUtil.forbidden(res, 'User is not a member of this website');
      }

      ResponseUtil.success(res, { role });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch user role');
    }
  });

  /**
   * Check user permissions
   */
  static checkPermissions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { actions } = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    if (!Array.isArray(actions)) {
      return ResponseUtil.badRequest(res, 'Actions must be an array');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const permissions: Record<string, boolean> = {};

      for (const action of actions) {
        permissions[action] = await teamService.hasPermission(websiteId, userId, action);
      }

      ResponseUtil.success(res, { permissions });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to check permissions');
    }
  });
}

export default TeamController;
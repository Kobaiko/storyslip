import { Request, Response } from 'express';
import { invitationService } from '../services/invitation.service';
import { teamService } from '../services/team.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';
import { supabase } from '../config/supabase';

export class InvitationController {
  /**
   * Send invitation to join website
   */
  static sendInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { email, role } = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website and permission to invite
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'invite_users');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to invite users');
      }

      const invitation = await invitationService.createInvitation(userId, {
        email,
        role,
        websiteId,
      });

      logDatabaseOperation('INSERT', 'user_invitations', {
        invitationId: invitation.id,
        websiteId,
        userId,
        email,
        role,
      });

      logSecurityEvent('User invitation sent', {
        invitationId: invitation.id,
        websiteId,
        email,
        role,
      }, req);

      ResponseUtil.created(res, { invitation });
    } catch (error: any) {
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to send invitation');
    }
  });

  /**
   * Accept invitation
   */
  static acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const { token, name, password } = req.body;

    try {
      const result = await invitationService.acceptInvitation({
        token,
        name,
        password,
      });

      logDatabaseOperation('INSERT', 'users', {
        userId: result.user.id,
        email: result.user.email,
        websiteId: result.website.id,
        action: 'invitation_accepted',
      });

      logSecurityEvent('Invitation accepted', {
        userId: result.user.id,
        email: result.user.email,
        websiteId: result.website.id,
      }, req);

      ResponseUtil.success(res, result);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to accept invitation');
    }
  });

  /**
   * Get invitations for a website
   */
  static getInvitations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view invitations');
      }

      const invitations = await invitationService.getInvitationsByWebsite(websiteId);

      logDatabaseOperation('SELECT', 'user_invitations', {
        websiteId,
        userId,
        count: invitations.length,
      });

      ResponseUtil.success(res, { invitations });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch invitations');
    }
  });

  /**
   * Cancel invitation
   */
  static cancelInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, invitationId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(invitationId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'invite_users');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to cancel invitations');
      }

      await invitationService.cancelInvitation(invitationId, websiteId);

      logDatabaseOperation('DELETE', 'user_invitations', {
        invitationId,
        websiteId,
        userId,
      });

      logSecurityEvent('Invitation cancelled', {
        invitationId,
        websiteId,
      }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to cancel invitation');
    }
  });

  /**
   * Resend invitation
   */
  static resendInvitation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, invitationId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(invitationId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const hasPermission = await teamService.hasPermission(websiteId, userId, 'invite_users');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to resend invitations');
      }

      const invitation = await invitationService.resendInvitation(invitationId, websiteId);

      logDatabaseOperation('UPDATE', 'user_invitations', {
        invitationId,
        websiteId,
        userId,
        action: 'resend',
      });

      logSecurityEvent('Invitation resent', {
        invitationId,
        websiteId,
        email: invitation.email,
      }, req);

      ResponseUtil.success(res, { invitation });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to resend invitation');
    }
  });

  /**
   * Get invitation details by token (for invitation acceptance page)
   */
  static getInvitationByToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
      // This is a simplified version - in a real implementation you'd want to
      // validate the token and return invitation details without sensitive info
      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .select(`
          id,
          email,
          role,
          expires_at,
          website:websites(id, name, domain)
        `)
        .eq('token', token)
        .is('accepted_at', null)
        .single();

      if (error || !invitation) {
        return ResponseUtil.notFound(res, 'Invalid or expired invitation');
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        return ResponseUtil.badRequest(res, 'Invitation has expired');
      }

      ResponseUtil.success(res, { invitation });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch invitation details');
    }
  });
}

export default InvitationController;
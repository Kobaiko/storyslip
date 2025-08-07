import { Request, Response } from 'express';
import { OrganizationService, CreateOrganizationData, UpdateOrganizationData, InviteMemberData } from '../services/organization.service';
import { successResponse, errorResponse } from '../utils/response';

export class OrganizationController {
  /**
   * Get user's organizations
   */
  static async getUserOrganizations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { data, error } = await OrganizationService.getUserOrganizations(userId);

      if (error) {
        console.error('Get user organizations error:', error);
        return errorResponse(res, 'Failed to get organizations', 500);
      }

      return successResponse(res, data, 'Organizations retrieved successfully');
    } catch (error) {
      console.error('Get user organizations error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { organizationId } = req.params;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!organizationId) {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      const { data, error } = await OrganizationService.getOrganization(userId, organizationId);

      if (error) {
        console.error('Get organization error:', error);
        return errorResponse(res, 'Failed to get organization', 500);
      }

      if (!data) {
        return errorResponse(res, 'Organization not found', 404);
      }

      return successResponse(res, data, 'Organization retrieved successfully');
    } catch (error) {
      console.error('Get organization error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Create new organization
   */
  static async createOrganization(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const organizationData: CreateOrganizationData = req.body;

      // Validate required fields
      if (!organizationData.name || organizationData.name.trim().length === 0) {
        return errorResponse(res, 'Organization name is required', 400);
      }

      if (organizationData.name.length > 255) {
        return errorResponse(res, 'Organization name too long (max 255 characters)', 400);
      }

      if (organizationData.description && organizationData.description.length > 1000) {
        return errorResponse(res, 'Description too long (max 1000 characters)', 400);
      }

      if (organizationData.website_url && !/^https?:\/\/.+/.test(organizationData.website_url)) {
        return errorResponse(res, 'Invalid website URL format', 400);
      }

      const { data, error } = await OrganizationService.createOrganization(userId, organizationData);

      if (error) {
        console.error('Create organization error:', error);
        return errorResponse(res, 'Failed to create organization', 500);
      }

      return successResponse(res, data, 'Organization created successfully', 201);
    } catch (error) {
      console.error('Create organization error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { organizationId } = req.params;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!organizationId) {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      const updateData: UpdateOrganizationData = req.body;

      // Validate fields if provided
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
          return errorResponse(res, 'Organization name cannot be empty', 400);
        }
        if (updateData.name.length > 255) {
          return errorResponse(res, 'Organization name too long (max 255 characters)', 400);
        }
      }

      if (updateData.description !== undefined && updateData.description.length > 1000) {
        return errorResponse(res, 'Description too long (max 1000 characters)', 400);
      }

      if (updateData.website_url !== undefined && updateData.website_url && !/^https?:\/\/.+/.test(updateData.website_url)) {
        return errorResponse(res, 'Invalid website URL format', 400);
      }

      const { data, error } = await OrganizationService.updateOrganization(userId, organizationId, updateData);

      if (error) {
        console.error('Update organization error:', error);
        if (error.message === 'Insufficient permissions') {
          return errorResponse(res, 'Insufficient permissions', 403);
        }
        return errorResponse(res, 'Failed to update organization', 500);
      }

      return successResponse(res, data, 'Organization updated successfully');
    } catch (error) {
      console.error('Update organization error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Delete organization
   */
  static async deleteOrganization(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { organizationId } = req.params;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!organizationId) {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      // Require confirmation
      const { confirm } = req.body;
      if (confirm !== 'DELETE') {
        return errorResponse(res, 'Organization deletion requires confirmation', 400);
      }

      const { data, error } = await OrganizationService.deleteOrganization(userId, organizationId);

      if (error) {
        console.error('Delete organization error:', error);
        if (error.message === 'Only organization owners can delete organizations') {
          return errorResponse(res, 'Only organization owners can delete organizations', 403);
        }
        if (error.message === 'Cannot delete organization with existing websites') {
          return errorResponse(res, 'Cannot delete organization with existing websites', 400);
        }
        return errorResponse(res, 'Failed to delete organization', 500);
      }

      return successResponse(res, { deleted: true }, 'Organization deleted successfully');
    } catch (error) {
      console.error('Delete organization error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Switch current organization
   */
  static async switchOrganization(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { organizationId } = req.params;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!organizationId) {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      const { data, error } = await OrganizationService.switchOrganization(userId, organizationId);

      if (error) {
        console.error('Switch organization error:', error);
        if (error.message === 'User is not a member of this organization') {
          return errorResponse(res, 'User is not a member of this organization', 403);
        }
        return errorResponse(res, 'Failed to switch organization', 500);
      }

      return successResponse(res, { switched: true }, 'Organization switched successfully');
    } catch (error) {
      console.error('Switch organization error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { organizationId } = req.params;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!organizationId) {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      const { data, error } = await OrganizationService.getOrganizationMembers(userId, organizationId);

      if (error) {
        console.error('Get organization members error:', error);
        return errorResponse(res, 'Failed to get organization members', 500);
      }

      return successResponse(res, data, 'Organization members retrieved successfully');
    } catch (error) {
      console.error('Get organization members error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Invite member to organization
   */
  static async inviteMember(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { organizationId } = req.params;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!organizationId) {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      const inviteData: InviteMemberData = req.body;

      // Validate required fields
      if (!inviteData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteData.email)) {
        return errorResponse(res, 'Valid email address is required', 400);
      }

      if (!inviteData.role || !['admin', 'member'].includes(inviteData.role)) {
        return errorResponse(res, 'Valid role is required (admin or member)', 400);
      }

      const { data, error } = await OrganizationService.inviteMember(userId, organizationId, inviteData);

      if (error) {
        console.error('Invite member error:', error);
        if (error.message === 'Insufficient permissions') {
          return errorResponse(res, 'Insufficient permissions', 403);
        }
        if (error.message === 'User not found') {
          return errorResponse(res, 'User not found', 404);
        }
        if (error.message === 'User is already a member of this organization') {
          return errorResponse(res, 'User is already a member of this organization', 400);
        }
        return errorResponse(res, 'Failed to invite member', 500);
      }

      return successResponse(res, { invited: true }, 'Member invited successfully');
    } catch (error) {
      console.error('Invite member error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { organizationId, memberId } = req.params;
      const { role } = req.body;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!organizationId) {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      if (!memberId) {
        return errorResponse(res, 'Member ID is required', 400);
      }

      if (!role || !['admin', 'member'].includes(role)) {
        return errorResponse(res, 'Valid role is required (admin or member)', 400);
      }

      const { data, error } = await OrganizationService.updateMemberRole(userId, organizationId, memberId, role);

      if (error) {
        console.error('Update member role error:', error);
        if (error.message === 'Insufficient permissions') {
          return errorResponse(res, 'Insufficient permissions', 403);
        }
        if (error.message === 'Member not found') {
          return errorResponse(res, 'Member not found', 404);
        }
        if (error.message === 'Cannot change organization owner role') {
          return errorResponse(res, 'Cannot change organization owner role', 400);
        }
        return errorResponse(res, 'Failed to update member role', 500);
      }

      return successResponse(res, { updated: true }, 'Member role updated successfully');
    } catch (error) {
      console.error('Update member role error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Remove member from organization
   */
  static async removeMember(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { organizationId, memberId } = req.params;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!organizationId) {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      if (!memberId) {
        return errorResponse(res, 'Member ID is required', 400);
      }

      const { data, error } = await OrganizationService.removeMember(userId, organizationId, memberId);

      if (error) {
        console.error('Remove member error:', error);
        if (error.message === 'Insufficient permissions') {
          return errorResponse(res, 'Insufficient permissions', 403);
        }
        if (error.message === 'Member not found') {
          return errorResponse(res, 'Member not found', 404);
        }
        if (error.message === 'Cannot remove organization owner') {
          return errorResponse(res, 'Cannot remove organization owner', 400);
        }
        return errorResponse(res, 'Failed to remove member', 500);
      }

      return successResponse(res, { removed: true }, 'Member removed successfully');
    } catch (error) {
      console.error('Remove member error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }
}

export default OrganizationController;
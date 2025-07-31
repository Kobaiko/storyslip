import { supabase } from '../config/supabase';
import { UserRole, WebsiteUser } from '../types/database';
import { ApiError } from '../utils/response';

export interface TeamMember {
  user_id: string;
  website_id: string;
  role: UserRole;
  added_by: string;
  added_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    last_login_at?: string;
  };
  added_by_user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TeamUpdateInput {
  role: UserRole;
}

export class TeamService {
  /**
   * Get team members for a website
   */
  async getTeamMembers(websiteId: string): Promise<TeamMember[]> {
    try {
      const { data: members, error } = await supabase
        .from('website_users')
        .select(`
          *,
          user:users!user_id(id, name, email, avatar_url, last_login_at),
          added_by_user:users!added_by(id, name, email)
        `)
        .eq('website_id', websiteId)
        .order('added_at', { ascending: false });

      if (error) {
        throw new ApiError('Failed to fetch team members', 500, 'DATABASE_ERROR', error);
      }

      return members || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch team members', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get team member by user ID
   */
  async getTeamMember(websiteId: string, userId: string): Promise<TeamMember> {
    try {
      const { data: member, error } = await supabase
        .from('website_users')
        .select(`
          *,
          user:users!user_id(id, name, email, avatar_url, last_login_at),
          added_by_user:users!added_by(id, name, email)
        `)
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .single();

      if (error || !member) {
        throw new ApiError('Team member not found', 404, 'MEMBER_NOT_FOUND');
      }

      return member;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch team member', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Update team member role
   */
  async updateTeamMemberRole(
    websiteId: string,
    userId: string,
    updatedBy: string,
    input: TeamUpdateInput
  ): Promise<TeamMember> {
    try {
      // Check if member exists
      await this.getTeamMember(websiteId, userId);

      // Check if trying to update website owner
      const { data: website } = await supabase
        .from('websites')
        .select('owner_id')
        .eq('id', websiteId)
        .single();

      if (website?.owner_id === userId) {
        throw new ApiError('Cannot modify website owner role', 400, 'CANNOT_MODIFY_OWNER');
      }

      // Update role
      const { data: updatedMember, error } = await supabase
        .from('website_users')
        .update({
          role: input.role,
        })
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .select(`
          *,
          user:users!user_id(id, name, email, avatar_url, last_login_at),
          added_by_user:users!added_by(id, name, email)
        `)
        .single();

      if (error || !updatedMember) {
        throw new ApiError('Failed to update team member role', 500, 'DATABASE_ERROR', error);
      }

      // Log audit event
      await this.logAuditEvent({
        website_id: websiteId,
        user_id: updatedBy,
        action: 'role_updated',
        target_user_id: userId,
        details: {
          new_role: input.role,
        },
      });

      return updatedMember;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update team member role', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(
    websiteId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    try {
      // Check if member exists
      const member = await this.getTeamMember(websiteId, userId);

      // Check if trying to remove website owner
      const { data: website } = await supabase
        .from('websites')
        .select('owner_id')
        .eq('id', websiteId)
        .single();

      if (website?.owner_id === userId) {
        throw new ApiError('Cannot remove website owner', 400, 'CANNOT_REMOVE_OWNER');
      }

      // Remove member
      const { error } = await supabase
        .from('website_users')
        .delete()
        .eq('website_id', websiteId)
        .eq('user_id', userId);

      if (error) {
        throw new ApiError('Failed to remove team member', 500, 'DATABASE_ERROR', error);
      }

      // Log audit event
      await this.logAuditEvent({
        website_id: websiteId,
        user_id: removedBy,
        action: 'member_removed',
        target_user_id: userId,
        details: {
          removed_role: member.role,
          removed_user_email: member.user.email,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to remove team member', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get user's role for a website
   */
  async getUserRole(websiteId: string, userId: string): Promise<UserRole | null> {
    try {
      // Check if user is website owner
      const { data: website } = await supabase
        .from('websites')
        .select('owner_id')
        .eq('id', websiteId)
        .single();

      if (website?.owner_id === userId) {
        return 'owner';
      }

      // Check if user is team member
      const { data: member } = await supabase
        .from('website_users')
        .select('role')
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .single();

      return member?.role || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user has permission for an action
   */
  async hasPermission(
    websiteId: string,
    userId: string,
    action: string
  ): Promise<boolean> {
    try {
      const role = await this.getUserRole(websiteId, userId);
      if (!role) return false;

      return this.checkRolePermission(role, action);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(websiteId: string): Promise<{
    totalMembers: number;
    roleDistribution: Record<UserRole, number>;
    recentAdditions: number;
  }> {
    try {
      // Get all team members
      const members = await this.getTeamMembers(websiteId);

      // Calculate role distribution
      const roleDistribution = members.reduce((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      }, {} as Record<UserRole, number>);

      // Get recent additions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAdditions = members.filter(
        member => new Date(member.added_at) >= thirtyDaysAgo
      ).length;

      return {
        totalMembers: members.length,
        roleDistribution,
        recentAdditions,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get team statistics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get audit log for team actions
   */
  async getAuditLog(
    websiteId: string,
    page = 1,
    limit = 20
  ): Promise<{
    logs: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      const { data: logs, error, count } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:users!user_id(name, email),
          target_user:users!target_user_id(name, email)
        `, { count: 'exact' })
        .eq('website_id', websiteId)
        .in('action', ['member_added', 'member_removed', 'role_updated', 'invitation_sent', 'invitation_cancelled'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new ApiError('Failed to fetch audit log', 500, 'DATABASE_ERROR', error);
      }

      return {
        logs: logs || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch audit log', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Check role permissions
   */
  private checkRolePermission(role: UserRole, action: string): boolean {
    const permissions = {
      owner: [
        'manage_team',
        'invite_users',
        'remove_users',
        'change_roles',
        'manage_content',
        'publish_content',
        'manage_settings',
        'view_analytics',
      ],
      admin: [
        'manage_team',
        'invite_users',
        'remove_users',
        'change_roles',
        'manage_content',
        'publish_content',
        'view_analytics',
      ],
      editor: [
        'manage_content',
        'publish_content',
      ],
      author: [
        'manage_content',
      ],
    };

    return permissions[role]?.includes(action) || false;
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(event: {
    website_id: string;
    user_id: string;
    action: string;
    target_user_id?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    try {
      // Import audit service dynamically to avoid circular dependencies
      const { auditService } = await import('./audit.service');
      await auditService.logTeamAction(
        event.website_id,
        event.user_id,
        event.action as any,
        event.target_user_id,
        event.details
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}

export const teamService = new TeamService();
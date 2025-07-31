import { supabase } from '../config/supabase';
import HelperUtil from '../utils/helpers';
import { UserRole, UserInvitation } from '../types/database';
import { ApiError } from '../utils/response';
import crypto from 'crypto';

export interface InvitationCreateInput {
  email: string;
  role: UserRole;
  websiteId: string;
}

export interface InvitationAcceptInput {
  token: string;
  name: string;
  password: string;
}

export class InvitationService {
  /**
   * Create and send invitation
   */
  async createInvitation(
    invitedBy: string,
    input: InvitationCreateInput
  ): Promise<UserInvitation> {
    try {
      // Check if user is already invited or exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', input.email)
        .single();

      if (existingUser) {
        // Check if user is already part of this website
        const { data: existingMember } = await supabase
          .from('website_users')
          .select('*')
          .eq('website_id', input.websiteId)
          .eq('user_id', existingUser.id)
          .single();

        if (existingMember) {
          throw new ApiError('User is already a member of this website', 409, 'USER_ALREADY_MEMBER');
        }

        // Add existing user directly to website
        const { error: memberError } = await supabase
          .from('website_users')
          .insert({
            website_id: input.websiteId,
            user_id: existingUser.id,
            role: input.role,
            added_by: invitedBy,
            added_at: new Date().toISOString(),
          });

        if (memberError) {
          throw new ApiError('Failed to add user to website', 500, 'DATABASE_ERROR', memberError);
        }

        // Return a mock invitation object for existing users
        return {
          id: HelperUtil.generateUuid(),
          email: input.email,
          role: input.role,
          website_id: input.websiteId,
          invited_by: invitedBy,
          token: '', // No token needed for existing users
          expires_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(), // Mark as accepted immediately
          created_at: new Date().toISOString(),
        };
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', input.email)
        .eq('website_id', input.websiteId)
        .is('accepted_at', null)
        .single();

      if (existingInvitation) {
        // Update existing invitation
        const token = this.generateInvitationToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const { data: updatedInvitation, error } = await supabase
          .from('user_invitations')
          .update({
            role: input.role,
            token,
            expires_at: expiresAt.toISOString(),
            invited_by: invitedBy,
            created_at: new Date().toISOString(), // Reset creation time
          })
          .eq('id', existingInvitation.id)
          .select()
          .single();

        if (error || !updatedInvitation) {
          throw new ApiError('Failed to update invitation', 500, 'DATABASE_ERROR', error);
        }

        // TODO: Send invitation email
        await this.sendInvitationEmail(updatedInvitation);

        return updatedInvitation;
      }

      // Create new invitation
      const token = this.generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitationData = {
        email: input.email,
        role: input.role,
        website_id: input.websiteId,
        invited_by: invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
      };

      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .insert(invitationData)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create invitation', 500, 'DATABASE_ERROR', error);
      }

      // TODO: Send invitation email
      await this.sendInvitationEmail(invitation);

      return invitation;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create invitation', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation(input: InvitationAcceptInput): Promise<{ user: any; website: any }> {
    try {
      // Find and validate invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select(`
          *,
          website:websites(*)
        `)
        .eq('token', input.token)
        .is('accepted_at', null)
        .single();

      if (invitationError || !invitation) {
        throw new ApiError('Invalid or expired invitation', 404, 'INVITATION_NOT_FOUND');
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new ApiError('Invitation has expired', 400, 'INVITATION_EXPIRED');
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', invitation.email)
        .single();

      if (existingUser) {
        throw new ApiError('User with this email already exists', 409, 'USER_EXISTS');
      }

      // Create user account
      const hashedPassword = await HelperUtil.hashPassword(input.password);
      const userData = {
        email: invitation.email,
        name: input.name,
        password_hash: hashedPassword,
        role: 'owner', // Default role for new users
        subscription_tier: 'free',
        email_verified: true, // Auto-verify invited users
      };

      const { data: user, error: userError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (userError) {
        throw new ApiError('Failed to create user account', 500, 'DATABASE_ERROR', userError);
      }

      // Add user to website
      const { error: memberError } = await supabase
        .from('website_users')
        .insert({
          website_id: invitation.website_id,
          user_id: user.id,
          role: invitation.role,
          added_by: invitation.invited_by,
          added_at: new Date().toISOString(),
        });

      if (memberError) {
        // Rollback user creation if website membership fails
        await supabase.from('users').delete().eq('id', user.id);
        throw new ApiError('Failed to add user to website', 500, 'DATABASE_ERROR', memberError);
      }

      // Mark invitation as accepted
      await supabase
        .from('user_invitations')
        .update({
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      // Remove password from response
      const { password_hash, ...userResponse } = user;

      return {
        user: userResponse,
        website: invitation.website,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to accept invitation', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get invitations for a website
   */
  async getInvitationsByWebsite(websiteId: string): Promise<UserInvitation[]> {
    try {
      const { data: invitations, error } = await supabase
        .from('user_invitations')
        .select(`
          *,
          inviter:users!invited_by(name, email)
        `)
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new ApiError('Failed to fetch invitations', 500, 'DATABASE_ERROR', error);
      }

      return invitations || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch invitations', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string, websiteId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('website_id', websiteId)
        .is('accepted_at', null);

      if (error) {
        throw new ApiError('Failed to cancel invitation', 500, 'DATABASE_ERROR', error);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to cancel invitation', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId: string, websiteId: string): Promise<UserInvitation> {
    try {
      // Get invitation
      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('website_id', websiteId)
        .is('accepted_at', null)
        .single();

      if (error || !invitation) {
        throw new ApiError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
      }

      // Generate new token and extend expiry
      const token = this.generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data: updatedInvitation, error: updateError } = await supabase
        .from('user_invitations')
        .update({
          token,
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (updateError || !updatedInvitation) {
        throw new ApiError('Failed to resend invitation', 500, 'DATABASE_ERROR', updateError);
      }

      // TODO: Send invitation email
      await this.sendInvitationEmail(updatedInvitation);

      return updatedInvitation;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to resend invitation', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .is('accepted_at', null);

      if (error) {
        console.error('Failed to cleanup expired invitations:', error);
      }
    } catch (error) {
      console.error('Failed to cleanup expired invitations:', error);
    }
  }

  /**
   * Generate secure invitation token
   */
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(invitation: UserInvitation): Promise<void> {
    try {
      // Get website and inviter information
      const { data: websiteData } = await supabase
        .from('websites')
        .select('name')
        .eq('id', invitation.website_id)
        .single();

      const { data: inviterData } = await supabase
        .from('users')
        .select('name')
        .eq('id', invitation.invited_by)
        .single();

      const websiteName = websiteData?.name || 'Unknown Website';
      const inviterName = inviterData?.name || 'Someone';
      const invitationUrl = this.generateInvitationUrl(invitation.token);

      // Import email service dynamically to avoid circular dependencies
      const { emailService } = await import('./email.service');
      
      await emailService.sendInvitationEmail(invitation.email, {
        inviterName,
        websiteName,
        role: invitation.role,
        invitationUrl,
        expiresAt: invitation.expires_at,
      }, invitation.website_id);
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // Don't throw error as invitation creation should still succeed
    }
  }

  /**
   * Generate invitation URL
   */
  generateInvitationUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.storyslip.com';
    return `${baseUrl}/accept-invitation?token=${token}`;
  }
}

export const invitationService = new InvitationService();
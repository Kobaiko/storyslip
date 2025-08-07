import { supabase } from '../config/supabase';
import { DatabaseResult } from '../types/database';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  joined_at: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

export interface CreateOrganizationData {
  name: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  settings?: Record<string, any>;
}

export interface InviteMemberData {
  email: string;
  role: 'admin' | 'member';
}

export class OrganizationService {
  /**
   * Get user's organizations
   */
  static async getUserOrganizations(authUserId: string): Promise<DatabaseResult<Organization[]>> {
    try {
      // First get the Supabase user to get their email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser.user) {
        return { data: null, error: authError || new Error('Auth user not found') };
      }

      // Find local user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, current_organization_id')
        .eq('email', authUser.user.email)
        .single();

      if (userError || !user) {
        return { data: null, error: userError || new Error('User not found') };
      }

      // Get user's organizations
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members!inner(
            role,
            joined_at
          )
        `)
        .eq('organization_members.user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        return { data: null, error };
      }

      // Transform data to include role and current status
      const organizations = data.map(org => ({
        ...org,
        role: org.organization_members[0]?.role,
        is_current: org.id === user.current_organization_id,
        joined_at: org.organization_members[0]?.joined_at,
      }));

      return { data: organizations, error: null };
    } catch (error) {
      console.error('Get user organizations error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(
    authUserId: string,
    organizationId: string
  ): Promise<DatabaseResult<Organization & { role: string }>> {
    try {
      // First get the Supabase user to get their email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser.user) {
        return { data: null, error: authError || new Error('Auth user not found') };
      }

      // Find local user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.user.email)
        .single();

      if (userError || !user) {
        return { data: null, error: userError || new Error('User not found') };
      }

      // Get organization with user's role
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members!inner(
            role
          )
        `)
        .eq('id', organizationId)
        .eq('organization_members.user_id', user.id)
        .single();

      if (error) {
        return { data: null, error };
      }

      const organization = {
        ...data,
        role: data.organization_members[0]?.role,
      };

      return { data: organization, error: null };
    } catch (error) {
      console.error('Get organization error:', error);
      return { data: null, error };
    }
  }

  /**
   * Create new organization
   */
  static async createOrganization(
    authUserId: string,
    organizationData: CreateOrganizationData
  ): Promise<DatabaseResult<Organization>> {
    try {
      // First get the Supabase user to get their email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser.user) {
        return { data: null, error: authError || new Error('Auth user not found') };
      }

      // Find local user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.user.email)
        .single();

      if (userError || !user) {
        return { data: null, error: userError || new Error('User not found') };
      }

      // Generate unique slug
      const { data: slugData, error: slugError } = await supabase.rpc(
        'generate_organization_slug',
        { base_name: organizationData.name }
      );

      if (slugError) {
        return { data: null, error: slugError };
      }

      // Create organization
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          ...organizationData,
          slug: slugData,
          settings: organizationData.settings || {},
        })
        .select()
        .single();

      if (orgError) {
        return { data: null, error: orgError };
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: 'owner',
          invited_by: user.id,
        });

      if (memberError) {
        // Rollback organization creation
        await supabase.from('organizations').delete().eq('id', organization.id);
        return { data: null, error: memberError };
      }

      return { data: organization, error: null };
    } catch (error) {
      console.error('Create organization error:', error);
      return { data: null, error };
    }
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    authUserId: string,
    organizationId: string,
    updateData: UpdateOrganizationData
  ): Promise<DatabaseResult<Organization>> {
    try {
      // Check if user has admin access
      const { data: orgAccess, error: accessError } = await this.getOrganization(authUserId, organizationId);
      
      if (accessError || !orgAccess) {
        return { data: null, error: accessError || new Error('Organization not found') };
      }

      if (!['owner', 'admin'].includes(orgAccess.role)) {
        return { data: null, error: new Error('Insufficient permissions') };
      }

      // Update organization
      const { data, error } = await supabase
        .from('organizations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Update organization error:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete organization
   */
  static async deleteOrganization(
    authUserId: string,
    organizationId: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      // Check if user is owner
      const { data: orgAccess, error: accessError } = await this.getOrganization(authUserId, organizationId);
      
      if (accessError || !orgAccess) {
        return { data: null, error: accessError || new Error('Organization not found') };
      }

      if (orgAccess.role !== 'owner') {
        return { data: null, error: new Error('Only organization owners can delete organizations') };
      }

      // Check if organization has websites
      const { data: websites, error: websitesError } = await supabase
        .from('websites')
        .select('id')
        .eq('organization_id', organizationId)
        .limit(1);

      if (websitesError) {
        return { data: null, error: websitesError };
      }

      if (websites && websites.length > 0) {
        return { data: null, error: new Error('Cannot delete organization with existing websites') };
      }

      // Delete organization (cascade will handle members)
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);

      if (error) {
        return { data: null, error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Delete organization error:', error);
      return { data: null, error };
    }
  }

  /**
   * Switch user's current organization
   */
  static async switchOrganization(
    authUserId: string,
    organizationId: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      // First get the Supabase user to get their email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser.user) {
        return { data: null, error: authError || new Error('Auth user not found') };
      }

      // Find local user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.user.email)
        .single();

      if (userError || !user) {
        return { data: null, error: userError || new Error('User not found') };
      }

      // Check if user is member of the organization
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        return { data: null, error: new Error('User is not a member of this organization') };
      }

      // Update current organization
      const { error: updateError } = await supabase
        .from('users')
        .update({ current_organization_id: organizationId })
        .eq('id', user.id);

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Switch organization error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(
    authUserId: string,
    organizationId: string
  ): Promise<DatabaseResult<OrganizationMember[]>> {
    try {
      // Check if user has access to organization
      const { data: orgAccess, error: accessError } = await this.getOrganization(authUserId, organizationId);
      
      if (accessError || !orgAccess) {
        return { data: null, error: accessError || new Error('Organization not found') };
      }

      // Get organization members
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          users!inner(
            id,
            email,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('organization_id', organizationId)
        .order('joined_at');

      if (error) {
        return { data: null, error };
      }

      // Transform data
      const members = data.map(member => ({
        ...member,
        user: member.users,
      }));

      return { data: members, error: null };
    } catch (error) {
      console.error('Get organization members error:', error);
      return { data: null, error };
    }
  }

  /**
   * Invite user to organization
   */
  static async inviteMember(
    authUserId: string,
    organizationId: string,
    inviteData: InviteMemberData
  ): Promise<DatabaseResult<boolean>> {
    try {
      // Check if user has admin access
      const { data: orgAccess, error: accessError } = await this.getOrganization(authUserId, organizationId);
      
      if (accessError || !orgAccess) {
        return { data: null, error: accessError || new Error('Organization not found') };
      }

      if (!['owner', 'admin'].includes(orgAccess.role)) {
        return { data: null, error: new Error('Insufficient permissions') };
      }

      // Find user by email
      const { data: invitedUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteData.email)
        .single();

      if (userError || !invitedUser) {
        return { data: null, error: new Error('User not found') };
      }

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', invitedUser.id)
        .single();

      if (!memberError && existingMember) {
        return { data: null, error: new Error('User is already a member of this organization') };
      }

      // Get inviting user
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser.user) {
        return { data: null, error: authError || new Error('Auth user not found') };
      }

      const { data: invitingUser, error: invitingUserError } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.user.email)
        .single();

      if (invitingUserError || !invitingUser) {
        return { data: null, error: invitingUserError || new Error('Inviting user not found') };
      }

      // Add user to organization
      const { error: addError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: invitedUser.id,
          role: inviteData.role,
          invited_by: invitingUser.id,
        });

      if (addError) {
        return { data: null, error: addError };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Invite member error:', error);
      return { data: null, error };
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    authUserId: string,
    organizationId: string,
    memberId: string,
    newRole: 'admin' | 'member'
  ): Promise<DatabaseResult<boolean>> {
    try {
      // Check if user has admin access
      const { data: orgAccess, error: accessError } = await this.getOrganization(authUserId, organizationId);
      
      if (accessError || !orgAccess) {
        return { data: null, error: accessError || new Error('Organization not found') };
      }

      if (!['owner', 'admin'].includes(orgAccess.role)) {
        return { data: null, error: new Error('Insufficient permissions') };
      }

      // Get member details
      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .select('role, user_id')
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .single();

      if (memberError || !member) {
        return { data: null, error: new Error('Member not found') };
      }

      // Cannot change owner role
      if (member.role === 'owner') {
        return { data: null, error: new Error('Cannot change organization owner role') };
      }

      // Update member role
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Update member role error:', error);
      return { data: null, error };
    }
  }

  /**
   * Remove member from organization
   */
  static async removeMember(
    authUserId: string,
    organizationId: string,
    memberId: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      // Check if user has admin access
      const { data: orgAccess, error: accessError } = await this.getOrganization(authUserId, organizationId);
      
      if (accessError || !orgAccess) {
        return { data: null, error: accessError || new Error('Organization not found') };
      }

      if (!['owner', 'admin'].includes(orgAccess.role)) {
        return { data: null, error: new Error('Insufficient permissions') };
      }

      // Get member details
      const { data: member, error: memberError } = await supabase
        .from('organization_members')
        .select('role, user_id')
        .eq('id', memberId)
        .eq('organization_id', organizationId)
        .single();

      if (memberError || !member) {
        return { data: null, error: new Error('Member not found') };
      }

      // Cannot remove owner
      if (member.role === 'owner') {
        return { data: null, error: new Error('Cannot remove organization owner') };
      }

      // Remove member
      const { error: removeError } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (removeError) {
        return { data: null, error: removeError };
      }

      // If user's current organization was this one, switch to another
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('current_organization_id')
        .eq('id', member.user_id)
        .single();

      if (!userError && user && user.current_organization_id === organizationId) {
        // Find another organization for the user
        const { data: otherOrg, error: otherOrgError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', member.user_id)
          .limit(1)
          .single();

        if (!otherOrgError && otherOrg) {
          await supabase
            .from('users')
            .update({ current_organization_id: otherOrg.organization_id })
            .eq('id', member.user_id);
        } else {
          // No other organizations, set to null
          await supabase
            .from('users')
            .update({ current_organization_id: null })
            .eq('id', member.user_id);
        }
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Remove member error:', error);
      return { data: null, error };
    }
  }
}

export default OrganizationService;
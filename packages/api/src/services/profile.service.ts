import { supabase } from '../config/supabase';
import { DatabaseResult } from '../types/database';

export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  timezone: string;
  language: string;
  preferences: Record<string, any>;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  preferences?: Record<string, any>;
}

export interface OnboardingProgress {
  step: number;
  completed: boolean;
  data?: Record<string, any>;
}

export class ProfileService {
  /**
   * Get user profile by user ID (Supabase Auth user ID)
   */
  static async getProfile(authUserId: string): Promise<DatabaseResult<UserProfile>> {
    try {
      // Find the local user record by email (since we don't have auth_user_id field yet)
      // First get the Supabase user to get their email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser.user) {
        return { data: null, error: authError || new Error('Auth user not found') };
      }

      // Find local user by email
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.user.email)
        .single();

      if (error) {
        return { data: null, error };
      }

      // Transform basic user data to profile format
      const profile: UserProfile = {
        id: data.id,
        user_id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        display_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email.split('@')[0],
        avatar_url: data.avatar_url,
        bio: data.bio,
        phone: data.phone,
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        preferences: data.preferences || {},
        onboarding_completed: data.onboarding_completed || false,
        onboarding_step: data.onboarding_step || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return { data: profile, error: null };
    } catch (error) {
      console.error('Get profile error:', error);
      return { data: null, error };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    authUserId: string,
    profileData: UpdateProfileData
  ): Promise<DatabaseResult<UserProfile>> {
    try {
      // First get the Supabase user to get their email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser.user) {
        return { data: null, error: authError || new Error('Auth user not found') };
      }

      // Update the user record by email
      const { data, error } = await supabase
        .from('users')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('email', authUser.user.email)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Transform to profile format
      const profile: UserProfile = {
        id: data.id,
        user_id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        display_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email.split('@')[0],
        avatar_url: data.avatar_url,
        bio: data.bio,
        phone: data.phone,
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        preferences: data.preferences || {},
        onboarding_completed: data.onboarding_completed || false,
        onboarding_step: data.onboarding_step || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return { data: profile, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { data: null, error };
    }
  }

  /**
   * Update onboarding progress
   */
  static async updateOnboardingProgress(
    authUserId: string,
    progress: OnboardingProgress
  ): Promise<DatabaseResult<UserProfile>> {
    try {
      // First get the Supabase user to get their email
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(authUserId);
      
      if (authError || !authUser.user) {
        return { data: null, error: authError || new Error('Auth user not found') };
      }

      // Update onboarding progress in users table
      const updateData: any = {
        onboarding_step: progress.step,
        updated_at: new Date().toISOString(),
      };

      if (progress.completed) {
        updateData.onboarding_completed = true;
      }

      if (progress.data) {
        // Get current preferences and merge
        const { data: currentUser } = await supabase
          .from('users')
          .select('preferences')
          .eq('email', authUser.user.email)
          .single();

        updateData.preferences = {
          ...currentUser?.preferences,
          onboarding: progress.data,
        };
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', authUser.user.email)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Transform to profile format
      const profile: UserProfile = {
        id: data.id,
        user_id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        display_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email.split('@')[0],
        avatar_url: data.avatar_url,
        bio: data.bio,
        phone: data.phone,
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        preferences: data.preferences || {},
        onboarding_completed: data.onboarding_completed || false,
        onboarding_step: data.onboarding_step || 0,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return { data: profile, error: null };
    } catch (error) {
      console.error('Update onboarding progress error:', error);
      return { data: null, error };
    }
  }

  /**
   * Upload and update avatar
   */
  static async updateAvatar(
    userId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<DatabaseResult<{ avatar_url: string }>> {
    try {
      // First get the user's internal ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', userId)
        .single();

      if (userError || !user) {
        return { data: null, error: userError || new Error('User not found') };
      }

      // Generate unique filename
      const fileExt = fileName.split('.').pop();
      const uniqueFileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${uniqueFileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-assets')
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        return { data: null, error: uploadError };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-assets')
        .getPublicUrl(filePath);

      const avatar_url = urlData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { data: { avatar_url }, error: null };
    } catch (error) {
      console.error('Update avatar error:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete user profile and associated data
   */
  static async deleteProfile(userId: string): Promise<DatabaseResult<boolean>> {
    try {
      // First get the user's internal ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', userId)
        .single();

      if (userError || !user) {
        return { data: null, error: userError || new Error('User not found') };
      }

      // Delete user profile (cascade will handle related data)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        return { data: null, error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Delete profile error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get profile completion percentage
   */
  static async getProfileCompletion(userId: string): Promise<DatabaseResult<{ percentage: number; missing_fields: string[] }>> {
    try {
      const { data: profile, error } = await this.getProfile(userId);

      if (error || !profile) {
        return { data: null, error: error || new Error('Profile not found') };
      }

      const requiredFields = [
        'first_name',
        'last_name',
        'display_name',
        'avatar_url',
        'bio',
        'timezone',
      ];

      const completedFields = requiredFields.filter(field => {
        const value = profile[field as keyof UserProfile];
        return value && value.toString().trim() !== '';
      });

      const missing_fields = requiredFields.filter(field => {
        const value = profile[field as keyof UserProfile];
        return !value || value.toString().trim() === '';
      });

      const percentage = Math.round((completedFields.length / requiredFields.length) * 100);

      return {
        data: { percentage, missing_fields },
        error: null,
      };
    } catch (error) {
      console.error('Get profile completion error:', error);
      return { data: null, error };
    }
  }

  /**
   * Search users by name or email (for team invitations)
   */
  static async searchUsers(
    query: string,
    organizationId: string,
    limit: number = 10
  ): Promise<DatabaseResult<Array<{ id: string; display_name: string; email: string; avatar_url?: string }>>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          display_name,
          avatar_url,
          users!inner(
            id,
            email
          )
        `)
        .or(`display_name.ilike.%${query}%,users.email.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        return { data: null, error };
      }

      // Filter out users already in the organization
      const { data: existingMembers } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId);

      const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);

      const filteredData = data
        ?.filter(user => !existingUserIds.has(user.users.id))
        .map(user => ({
          id: user.users.id,
          display_name: user.display_name || '',
          email: user.users.email,
          avatar_url: user.avatar_url,
        })) || [];

      return { data: filteredData, error: null };
    } catch (error) {
      console.error('Search users error:', error);
      return { data: null, error };
    }
  }
}

export default ProfileService;
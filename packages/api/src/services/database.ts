import { supabase, supabaseAdmin } from '../config/supabase';
import { DatabaseResult, PaginationParams } from '../types/database';

export class DatabaseService {
  /**
   * Execute a query with pagination
   */
  static async paginate<T>(
    query: any,
    params: PaginationParams = {}
  ): Promise<DatabaseResult<{ data: T[]; total: number; page: number; limit: number }>> {
    const { page = 1, limit = 10, sort = 'created_at', order = 'desc' } = params;
    const offset = (page - 1) * limit;

    try {
      // Get total count
      const { count, error: countError } = await query.select('*', { count: 'exact', head: true });
      
      if (countError) {
        return { data: null, error: countError };
      }

      // Get paginated data
      const { data, error } = await query
        .select('*')
        .order(sort, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

      if (error) {
        return { data: null, error };
      }

      return {
        data: {
          data,
          total: count || 0,
          page,
          limit,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Check if user has access to website
   */
  static async checkWebsiteAccess(userId: string, websiteId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('websites')
        .select('id')
        .eq('id', websiteId)
        .or(`owner_id.eq.${userId},id.in.(select website_id from website_users where user_id = '${userId}')`)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get user role for a website
   */
  static async getUserWebsiteRole(userId: string, websiteId: string): Promise<string | null> {
    try {
      // Check if user is owner
      const { data: website } = await supabase
        .from('websites')
        .select('owner_id')
        .eq('id', websiteId)
        .single();

      if (website?.owner_id === userId) {
        return 'owner';
      }

      // Check if user is team member
      const { data: teamMember } = await supabase
        .from('website_users')
        .select('role')
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .single();

      return teamMember?.role || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate unique slug for a table
   */
  static async generateUniqueSlug(
    baseSlug: string,
    websiteId: string,
    tableName: 'content' | 'categories' | 'tags'
  ): Promise<string> {
    try {
      const { data } = await supabase.rpc('generate_unique_slug', {
        base_slug: baseSlug,
        website_id: websiteId,
        table_name: tableName,
      });

      return data || baseSlug;
    } catch {
      return baseSlug;
    }
  }

  /**
   * Increment content view count
   */
  static async incrementContentViews(contentId: string): Promise<void> {
    try {
      await supabase.rpc('increment_content_views', {
        content_id: contentId,
      });
    } catch (error) {
      console.error('Failed to increment content views:', error);
    }
  }

  /**
   * Get website by API key (for widget requests)
   */
  static async getWebsiteByApiKey(apiKey: string): Promise<DatabaseResult<any>> {
    return await supabaseAdmin
      .from('websites')
      .select('*')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();
  }

  /**
   * Track analytics event
   */
  static async trackAnalyticsEvent(event: {
    website_id: string;
    content_id?: string;
    event_type: string;
    user_id?: string;
    session_id: string;
    ip_address?: string;
    user_agent?: string;
    referrer?: string;
    page_url?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await supabaseAdmin.from('analytics_events').insert(event);
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }
}

export default DatabaseService;
import { supabase } from '../config/supabase';
import { analyticsService } from './analytics.service';
import { ApiError } from '../utils/response';

export interface WidgetContent {
  id: string;
  title: string;
  excerpt: string;
  published_at: string;
  slug: string;
  featured_image_url?: string;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
}

export interface WidgetConfiguration {
  display_mode: 'inline' | 'popup' | 'sidebar';
  theme: 'auto' | 'light' | 'dark';
  show_categories: boolean;
  show_tags: boolean;
  items_per_page: number;
  custom_css?: string;
}

export class WidgetService {
  /**
   * Get website configuration and validate API key
   */
  async getWebsiteConfig(apiKey: string): Promise<{
    website: any;
    configuration: WidgetConfiguration;
  }> {
    try {
      const { data: website, error } = await supabase
        .from('websites')
        .select('*')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (error || !website) {
        throw new ApiError('Invalid API key or inactive website', 401, 'INVALID_API_KEY');
      }

      const defaultConfig: WidgetConfiguration = {
        display_mode: 'inline',
        theme: 'auto',
        show_categories: true,
        show_tags: true,
        items_per_page: 10,
      };

      const configuration = {
        ...defaultConfig,
        ...website.configuration,
      };

      return { website, configuration };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get website configuration', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get published content for widget
   */
  async getWidgetContent(
    apiKey: string,
    page = 1,
    limit = 10,
    categoryId?: string,
    tagId?: string
  ): Promise<{
    content: WidgetContent[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Validate API key and get website
      const { website } = await this.getWebsiteConfig(apiKey);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('content')
        .select(`
          id,
          title,
          excerpt,
          published_at,
          slug,
          featured_image_url,
          categories:content_categories(
            category:categories(id, name, slug)
          ),
          tags:content_tags(
            tag:tags(id, name, slug, color)
          )
        `, { count: 'exact' })
        .eq('website_id', website.id)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });

      // Apply category filter
      if (categoryId) {
        query = query.in('id', 
          supabase
            .from('content_categories')
            .select('content_id')
            .eq('category_id', categoryId)
        );
      }

      // Apply tag filter
      if (tagId) {
        query = query.in('id',
          supabase
            .from('content_tags')
            .select('content_id')
            .eq('tag_id', tagId)
        );
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: content, error, count } = await query;

      if (error) {
        throw new ApiError('Failed to fetch content', 500, 'DATABASE_ERROR', error);
      }

      // Transform the data to match WidgetContent interface
      const transformedContent: WidgetContent[] = (content || []).map(item => ({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        published_at: item.published_at,
        slug: item.slug,
        featured_image_url: item.featured_image_url,
        categories: item.categories?.map((c: any) => c.category).filter(Boolean) || [],
        tags: item.tags?.map((t: any) => t.tag).filter(Boolean) || [],
      }));

      return {
        content: transformedContent,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get widget content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get single content item for widget
   */
  async getWidgetContentItem(apiKey: string, contentId: string): Promise<WidgetContent> {
    try {
      // Validate API key and get website
      const { website } = await this.getWebsiteConfig(apiKey);

      const { data: content, error } = await supabase
        .from('content')
        .select(`
          id,
          title,
          excerpt,
          published_at,
          slug,
          featured_image_url,
          categories:content_categories(
            category:categories(id, name, slug)
          ),
          tags:content_tags(
            tag:tags(id, name, slug, color)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', website.id)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .single();

      if (error || !content) {
        throw new ApiError('Content not found', 404, 'CONTENT_NOT_FOUND');
      }

      // Track content view
      await this.trackContentView(website.id, contentId);

      return {
        id: content.id,
        title: content.title,
        excerpt: content.excerpt,
        published_at: content.published_at,
        slug: content.slug,
        featured_image_url: content.featured_image_url,
        categories: content.categories?.map((c: any) => c.category).filter(Boolean) || [],
        tags: content.tags?.map((t: any) => t.tag).filter(Boolean) || [],
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get content item', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get categories for widget
   */
  async getWidgetCategories(apiKey: string): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    content_count: number;
  }>> {
    try {
      // Validate API key and get website
      const { website } = await this.getWebsiteConfig(apiKey);

      const { data: categories, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          slug,
          content_categories(count)
        `)
        .eq('website_id', website.id)
        .order('name');

      if (error) {
        throw new ApiError('Failed to fetch categories', 500, 'DATABASE_ERROR', error);
      }

      return (categories || []).map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        content_count: category.content_categories?.length || 0,
      }));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get widget categories', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get tags for widget
   */
  async getWidgetTags(apiKey: string): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
    content_count: number;
  }>> {
    try {
      // Validate API key and get website
      const { website } = await this.getWebsiteConfig(apiKey);

      const { data: tags, error } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          slug,
          color,
          content_tags(count)
        `)
        .eq('website_id', website.id)
        .order('name');

      if (error) {
        throw new ApiError('Failed to fetch tags', 500, 'DATABASE_ERROR', error);
      }

      return (tags || []).map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
        content_count: tag.content_tags?.length || 0,
      }));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get widget tags', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Search content for widget
   */
  async searchWidgetContent(
    apiKey: string,
    query: string,
    page = 1,
    limit = 10
  ): Promise<{
    content: WidgetContent[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Validate API key and get website
      const { website } = await this.getWebsiteConfig(apiKey);
      const offset = (page - 1) * limit;

      const { data: content, error, count } = await supabase
        .from('content')
        .select(`
          id,
          title,
          excerpt,
          published_at,
          slug,
          featured_image_url,
          categories:content_categories(
            category:categories(id, name, slug)
          ),
          tags:content_tags(
            tag:tags(id, name, slug, color)
          )
        `, { count: 'exact' })
        .eq('website_id', website.id)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,body.ilike.%${query}%`)
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new ApiError('Failed to search content', 500, 'DATABASE_ERROR', error);
      }

      // Transform the data
      const transformedContent: WidgetContent[] = (content || []).map(item => ({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        published_at: item.published_at,
        slug: item.slug,
        featured_image_url: item.featured_image_url,
        categories: item.categories?.map((c: any) => c.category).filter(Boolean) || [],
        tags: item.tags?.map((t: any) => t.tag).filter(Boolean) || [],
      }));

      return {
        content: transformedContent,
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to search widget content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Track content view (internal method)
   */
  private async trackContentView(websiteId: string, contentId: string): Promise<void> {
    try {
      // Generate a session ID for tracking
      const sessionId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await analyticsService.trackEvent({
        website_id: websiteId,
        content_id: contentId,
        event_type: 'content_view',
        session_id: sessionId,
        metadata: {
          source: 'widget',
        },
      });
    } catch (error) {
      // Don't throw error for analytics tracking failures
      console.error('Failed to track content view:', error);
    }
  }
}

export const widgetService = new WidgetService();
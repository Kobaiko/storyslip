import { supabase } from '../config/supabase';
import HelperUtil from '../utils/helpers';
import { Content, ContentStatus, Category, Tag } from '../types/database';
import { ApiError } from '../utils/response';

export interface ContentCreateInput {
  title: string;
  slug?: string;
  body: string;
  excerpt?: string;
  status?: ContentStatus;
  scheduled_at?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  featured_image_url?: string;
  category_ids?: string[];
  tag_ids?: string[];
}

export interface ContentUpdateInput {
  title?: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  status?: ContentStatus;
  scheduled_at?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  featured_image_url?: string;
  category_ids?: string[];
  tag_ids?: string[];
}

export interface ContentFilters {
  status?: ContentStatus;
  category_id?: string;
  tag_id?: string;
  search?: string;
  author_id?: string;
  date_from?: string;
  date_to?: string;
}

export class ContentService {
  /**
   * Create new content
   */
  async createContent(
    websiteId: string,
    authorId: string,
    input: ContentCreateInput
  ): Promise<Content> {
    try {
      // Generate slug if not provided
      const slug = input.slug || HelperUtil.generateSlug(input.title);
      
      // Check if slug already exists for this website
      const { data: existingContent } = await supabase
        .from('content')
        .select('id')
        .eq('website_id', websiteId)
        .eq('slug', slug)
        .single();

      if (existingContent) {
        throw new ApiError('Content with this slug already exists', 409, 'SLUG_EXISTS');
      }

      // Generate excerpt if not provided
      const excerpt = input.excerpt || HelperUtil.generateExcerpt(input.body);

      // Prepare content data
      const contentData = {
        title: input.title,
        slug,
        body: input.body,
        excerpt,
        status: input.status || 'draft',
        scheduled_at: input.scheduled_at,
        author_id: authorId,
        website_id: websiteId,
        seo_title: input.seo_title,
        seo_description: input.seo_description,
        seo_keywords: input.seo_keywords,
        featured_image_url: input.featured_image_url,
        view_count: 0,
        published_at: input.status === 'published' ? new Date().toISOString() : null,
      };

      // Insert content
      const { data: content, error } = await supabase
        .from('content')
        .insert(contentData)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create content', 500, 'DATABASE_ERROR', error);
      }

      // Handle category and tag associations
      if (input.category_ids?.length) {
        await this.associateCategories(content.id, input.category_ids);
      }

      if (input.tag_ids?.length) {
        await this.associateTags(content.id, input.tag_ids);
      }

      return content;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get content by ID
   */
  async getContentById(contentId: string, websiteId: string): Promise<Content> {
    try {
      const { data: content, error } = await supabase
        .from('content')
        .select(`
          *,
          categories:content_categories(
            category:categories(*)
          ),
          tags:content_tags(
            tag:tags(*)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .single();

      if (error || !content) {
        throw new ApiError('Content not found', 404, 'CONTENT_NOT_FOUND');
      }

      return content;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get content list with filters and pagination
   */
  async getContentList(
    websiteId: string,
    filters: ContentFilters = {},
    page = 1,
    limit = 10,
    sort = 'created_at',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<{
    content: Content[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      let query = supabase
        .from('content')
        .select(`
          *,
          categories:content_categories(
            category:categories(*)
          ),
          tags:content_tags(
            tag:tags(*)
          )
        `, { count: 'exact' })
        .eq('website_id', websiteId);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.author_id) {
        query = query.eq('author_id', filters.author_id);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,body.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply sorting and pagination
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range(offset, offset + limit - 1);

      const { data: content, error, count } = await query;

      if (error) {
        throw new ApiError('Failed to fetch content', 500, 'DATABASE_ERROR', error);
      }

      return {
        content: content || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch content list', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Update content
   */
  async updateContent(
    contentId: string,
    websiteId: string,
    input: ContentUpdateInput
  ): Promise<Content> {
    try {
      // Verify content exists
      await this.getContentById(contentId, websiteId);

      // Check slug uniqueness if being updated
      if (input.slug) {
        const { data: existingContent } = await supabase
          .from('content')
          .select('id')
          .eq('website_id', websiteId)
          .eq('slug', input.slug)
          .neq('id', contentId)
          .single();

        if (existingContent) {
          throw new ApiError('Content with this slug already exists', 409, 'SLUG_EXISTS');
        }
      }

      // Prepare update data
      const updateData: any = HelperUtil.removeUndefined(input);
      
      // Handle status changes
      if (input.status === 'published' && input.status !== undefined) {
        updateData.published_at = new Date().toISOString();
      } else if (input.status && input.status !== 'published') {
        updateData.published_at = null;
      }

      // Update content
      const { data: content, error } = await supabase
        .from('content')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .select()
        .single();

      if (error || !content) {
        throw new ApiError('Failed to update content', 500, 'DATABASE_ERROR', error);
      }

      // Handle category and tag associations
      if (input.category_ids !== undefined) {
        await this.updateCategories(contentId, input.category_ids);
      }

      if (input.tag_ids !== undefined) {
        await this.updateTags(contentId, input.tag_ids);
      }

      return content;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Delete content
   */
  async deleteContent(contentId: string, websiteId: string): Promise<void> {
    try {
      // Verify content exists
      await this.getContentById(contentId, websiteId);

      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', contentId)
        .eq('website_id', websiteId);

      if (error) {
        throw new ApiError('Failed to delete content', 500, 'DATABASE_ERROR', error);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Publish scheduled content
   */
  async publishScheduledContent(): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('content')
        .update({
          status: 'published',
          published_at: now,
          updated_at: now,
        })
        .eq('status', 'scheduled')
        .lte('scheduled_at', now);

      if (error) {
        throw new ApiError('Failed to publish scheduled content', 500, 'DATABASE_ERROR', error);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to publish scheduled content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Increment content view count
   */
  async incrementViewCount(contentId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_content_views', {
        content_id: contentId,
      });

      if (error) {
        console.error('Failed to increment view count:', error);
      }
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  }

  /**
   * Associate categories with content
   */
  private async associateCategories(contentId: string, categoryIds: string[]): Promise<void> {
    if (!categoryIds.length) return;

    const associations = categoryIds.map(categoryId => ({
      content_id: contentId,
      category_id: categoryId,
    }));

    const { error } = await supabase
      .from('content_categories')
      .insert(associations);

    if (error) {
      throw new ApiError('Failed to associate categories', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Associate tags with content
   */
  private async associateTags(contentId: string, tagIds: string[]): Promise<void> {
    if (!tagIds.length) return;

    const associations = tagIds.map(tagId => ({
      content_id: contentId,
      tag_id: tagId,
    }));

    const { error } = await supabase
      .from('content_tags')
      .insert(associations);

    if (error) {
      throw new ApiError('Failed to associate tags', 500, 'DATABASE_ERROR', error);
    }
  }

  /**
   * Update category associations
   */
  private async updateCategories(contentId: string, categoryIds: string[]): Promise<void> {
    // Remove existing associations
    await supabase
      .from('content_categories')
      .delete()
      .eq('content_id', contentId);

    // Add new associations
    if (categoryIds.length) {
      await this.associateCategories(contentId, categoryIds);
    }
  }

  /**
   * Update tag associations
   */
  private async updateTags(contentId: string, tagIds: string[]): Promise<void> {
    // Remove existing associations
    await supabase
      .from('content_tags')
      .delete()
      .eq('content_id', contentId);

    // Add new associations
    if (tagIds.length) {
      await this.associateTags(contentId, tagIds);
    }
  }
}

export const contentService = new ContentService();
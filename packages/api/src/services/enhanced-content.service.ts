import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { HelperUtil } from '../utils/helpers';
import { schedulerService } from './scheduler.service';
import { mediaService } from './media.service';
import { seoService } from './seo.service';

export interface RichContentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'image' | 'video' | 'code' | 'quote' | 'list' | 'embed';
  content: any;
  metadata?: Record<string, any>;
}

export interface ContentRevision {
  id: string;
  content_id: string;
  title: string;
  body: string;
  excerpt?: string;
  revision_number: number;
  created_by: string;
  created_at: string;
  change_summary?: string;
}

export interface ContentSchedule {
  id: string;
  content_id: string;
  scheduled_at: string;
  action: 'publish' | 'unpublish' | 'archive';
  status: 'pending' | 'completed' | 'failed';
  created_by: string;
  created_at: string;
}

export interface EnhancedContentCreateInput {
  title: string;
  slug?: string;
  body: string;
  rich_content?: RichContentBlock[];
  excerpt?: string;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  scheduled_at?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  featured_image_url?: string;
  category_ids?: string[];
  tag_ids?: string[];
  meta_data?: Record<string, any>;
  enable_comments?: boolean;
  template?: string;
}

export interface ContentSearchOptions {
  query?: string;
  status?: string[];
  categories?: string[];
  tags?: string[];
  authors?: string[];
  date_from?: string;
  date_to?: string;
  content_type?: string;
  has_featured_image?: boolean;
  sort_by?: 'created_at' | 'updated_at' | 'published_at' | 'title' | 'view_count';
  sort_order?: 'asc' | 'desc';
  include_drafts?: boolean;
}

export class EnhancedContentService {
  /**
   * Create content with rich editor support
   */
  async createRichContent(
    websiteId: string,
    authorId: string,
    input: EnhancedContentCreateInput
  ): Promise<any> {
    try {
      // Generate slug if not provided
      const slug = input.slug || HelperUtil.generateSlug(input.title);
      
      // Validate slug uniqueness
      await this.validateSlugUniqueness(websiteId, slug);

      // Process rich content blocks
      const processedRichContent = await this.processRichContentBlocks(input.rich_content || []);
      
      // Generate excerpt from rich content if not provided
      const excerpt = input.excerpt || this.generateExcerptFromRichContent(processedRichContent);

      // Prepare content data
      const contentData = {
        title: input.title,
        slug,
        body: input.body,
        rich_content: processedRichContent,
        excerpt,
        status: input.status || 'draft',
        scheduled_at: input.scheduled_at,
        author_id: authorId,
        website_id: websiteId,
        seo_title: input.seo_title || input.title,
        seo_description: input.seo_description || excerpt,
        seo_keywords: input.seo_keywords,
        featured_image_url: input.featured_image_url,
        meta_data: input.meta_data || {},
        enable_comments: input.enable_comments ?? true,
        template: input.template || 'default',
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

      // Create initial revision
      await this.createRevision(content.id, {
        title: content.title,
        body: content.body,
        excerpt: content.excerpt,
        created_by: authorId,
        change_summary: 'Initial creation',
      });

      // Handle associations
      if (input.category_ids?.length) {
        await this.associateCategories(content.id, input.category_ids);
      }

      if (input.tag_ids?.length) {
        await this.associateTags(content.id, input.tag_ids);
      }

      // Schedule publishing if needed
      if (input.status === 'scheduled' && input.scheduled_at) {
        await this.scheduleContentAction(content.id, 'publish', input.scheduled_at, authorId);
      }

      // Generate SEO sitemap entry
      if (input.status === 'published') {
        await seoService.updateSitemap(websiteId);
      }

      return content;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create rich content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Process rich content blocks (handle media uploads, embeds, etc.)
   */
  private async processRichContentBlocks(blocks: RichContentBlock[]): Promise<RichContentBlock[]> {
    const processedBlocks: RichContentBlock[] = [];

    for (const block of blocks) {
      let processedBlock = { ...block };

      switch (block.type) {
        case 'image':
          if (block.content.file && !block.content.url) {
            // Upload image if file is provided
            const uploadResult = await mediaService.uploadImage(block.content.file, {
              optimize: true,
              generateThumbnails: true,
            });
            processedBlock.content = {
              ...block.content,
              url: uploadResult.url,
              thumbnails: uploadResult.thumbnails,
              alt: block.content.alt || '',
              caption: block.content.caption || '',
            };
          }
          break;

        case 'video':
          if (block.content.file && !block.content.url) {
            // Upload video if file is provided
            const uploadResult = await mediaService.uploadVideo(block.content.file);
            processedBlock.content = {
              ...block.content,
              url: uploadResult.url,
              thumbnail: uploadResult.thumbnail,
              duration: uploadResult.duration,
            };
          }
          break;

        case 'embed':
          // Process embed URLs (YouTube, Twitter, etc.)
          processedBlock.content = await this.processEmbedContent(block.content);
          break;

        case 'code':
          // Syntax highlighting and validation
          processedBlock.content = {
            ...block.content,
            highlighted: this.highlightCode(block.content.code, block.content.language),
          };
          break;

        default:
          // No special processing needed
          break;
      }

      processedBlocks.push(processedBlock);
    }

    return processedBlocks;
  }

  /**
   * Advanced content search with full-text search
   */
  async searchContent(
    websiteId: string,
    options: ContentSearchOptions,
    page = 1,
    limit = 20
  ): Promise<{
    content: any[];
    total: number;
    page: number;
    totalPages: number;
    facets: {
      categories: Array<{ id: string; name: string; count: number }>;
      tags: Array<{ id: string; name: string; count: number }>;
      authors: Array<{ id: string; name: string; count: number }>;
      statuses: Array<{ status: string; count: number }>;
    };
  }> {
    try {
      const offset = (page - 1) * limit;

      // Build base query
      let query = supabase
        .from('content')
        .select(`
          *,
          author:users!author_id(id, name, email),
          categories:content_categories(
            category:categories(id, name, slug)
          ),
          tags:content_tags(
            tag:tags(id, name, slug)
          )
        `, { count: 'exact' })
        .eq('website_id', websiteId);

      // Apply filters
      if (options.query) {
        // Full-text search across title, body, and excerpt
        query = query.or(`
          title.ilike.%${options.query}%,
          body.ilike.%${options.query}%,
          excerpt.ilike.%${options.query}%,
          seo_keywords.cs.{${options.query}}
        `);
      }

      if (options.status?.length) {
        query = query.in('status', options.status);
      }

      if (options.authors?.length) {
        query = query.in('author_id', options.authors);
      }

      if (options.date_from) {
        query = query.gte('created_at', options.date_from);
      }

      if (options.date_to) {
        query = query.lte('created_at', options.date_to);
      }

      if (options.has_featured_image !== undefined) {
        if (options.has_featured_image) {
          query = query.not('featured_image_url', 'is', null);
        } else {
          query = query.is('featured_image_url', null);
        }
      }

      // Apply sorting
      const sortBy = options.sort_by || 'created_at';
      const sortOrder = options.sort_order || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: content, error, count } = await query;

      if (error) {
        throw new ApiError('Failed to search content', 500, 'DATABASE_ERROR', error);
      }

      // Get facets for filtering
      const facets = await this.getSearchFacets(websiteId, options);

      return {
        content: content || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        facets,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to search content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Content scheduling system
   */
  async scheduleContentAction(
    contentId: string,
    action: 'publish' | 'unpublish' | 'archive',
    scheduledAt: string,
    userId: string
  ): Promise<ContentSchedule> {
    try {
      const scheduleData = {
        content_id: contentId,
        scheduled_at: scheduledAt,
        action,
        status: 'pending' as const,
        created_by: userId,
      };

      const { data: schedule, error } = await supabase
        .from('content_schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to schedule content action', 500, 'DATABASE_ERROR', error);
      }

      // Register with scheduler service
      await schedulerService.scheduleJob({
        id: schedule.id,
        type: 'content_action',
        scheduledAt: new Date(scheduledAt),
        data: {
          contentId,
          action,
          scheduleId: schedule.id,
        },
      });

      return schedule;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to schedule content action', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Content revision system
   */
  async createRevision(
    contentId: string,
    revisionData: {
      title: string;
      body: string;
      excerpt?: string;
      created_by: string;
      change_summary?: string;
    }
  ): Promise<ContentRevision> {
    try {
      // Get current revision number
      const { data: lastRevision } = await supabase
        .from('content_revisions')
        .select('revision_number')
        .eq('content_id', contentId)
        .order('revision_number', { ascending: false })
        .limit(1)
        .single();

      const revisionNumber = (lastRevision?.revision_number || 0) + 1;

      const { data: revision, error } = await supabase
        .from('content_revisions')
        .insert({
          content_id: contentId,
          title: revisionData.title,
          body: revisionData.body,
          excerpt: revisionData.excerpt,
          revision_number: revisionNumber,
          created_by: revisionData.created_by,
          change_summary: revisionData.change_summary,
        })
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create revision', 500, 'DATABASE_ERROR', error);
      }

      return revision;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create revision', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get content revisions
   */
  async getContentRevisions(contentId: string): Promise<ContentRevision[]> {
    try {
      const { data: revisions, error } = await supabase
        .from('content_revisions')
        .select(`
          *,
          author:users!created_by(id, name, email)
        `)
        .eq('content_id', contentId)
        .order('revision_number', { ascending: false });

      if (error) {
        throw new ApiError('Failed to fetch revisions', 500, 'DATABASE_ERROR', error);
      }

      return revisions || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch revisions', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Restore content from revision
   */
  async restoreFromRevision(
    contentId: string,
    revisionId: string,
    userId: string
  ): Promise<any> {
    try {
      // Get revision data
      const { data: revision, error: revisionError } = await supabase
        .from('content_revisions')
        .select('*')
        .eq('id', revisionId)
        .eq('content_id', contentId)
        .single();

      if (revisionError || !revision) {
        throw new ApiError('Revision not found', 404, 'REVISION_NOT_FOUND');
      }

      // Update content with revision data
      const { data: content, error } = await supabase
        .from('content')
        .update({
          title: revision.title,
          body: revision.body,
          excerpt: revision.excerpt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contentId)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to restore from revision', 500, 'DATABASE_ERROR', error);
      }

      // Create new revision for the restore
      await this.createRevision(contentId, {
        title: revision.title,
        body: revision.body,
        excerpt: revision.excerpt,
        created_by: userId,
        change_summary: `Restored from revision #${revision.revision_number}`,
      });

      return content;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to restore from revision', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Bulk content operations
   */
  async bulkUpdateContent(
    websiteId: string,
    contentIds: string[],
    updates: {
      status?: string;
      category_ids?: string[];
      tag_ids?: string[];
      scheduled_at?: string;
    },
    userId: string
  ): Promise<{ updated: number; errors: Array<{ id: string; error: string }> }> {
    const results = { updated: 0, errors: [] as Array<{ id: string; error: string }> };

    for (const contentId of contentIds) {
      try {
        // Verify content belongs to website
        const { data: content } = await supabase
          .from('content')
          .select('id')
          .eq('id', contentId)
          .eq('website_id', websiteId)
          .single();

        if (!content) {
          results.errors.push({ id: contentId, error: 'Content not found' });
          continue;
        }

        // Apply updates
        const updateData: any = {};
        
        if (updates.status) {
          updateData.status = updates.status;
          if (updates.status === 'published') {
            updateData.published_at = new Date().toISOString();
          }
        }

        if (updates.scheduled_at) {
          updateData.scheduled_at = updates.scheduled_at;
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          
          const { error } = await supabase
            .from('content')
            .update(updateData)
            .eq('id', contentId);

          if (error) {
            results.errors.push({ id: contentId, error: error.message });
            continue;
          }
        }

        // Handle category associations
        if (updates.category_ids !== undefined) {
          await this.updateCategories(contentId, updates.category_ids);
        }

        // Handle tag associations
        if (updates.tag_ids !== undefined) {
          await this.updateTags(contentId, updates.tag_ids);
        }

        results.updated++;
      } catch (error: any) {
        results.errors.push({ id: contentId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Content analytics and insights
   */
  async getContentAnalytics(
    websiteId: string,
    contentId?: string,
    period = '30d'
  ): Promise<{
    views: Array<{ date: string; count: number }>;
    topContent: Array<{ id: string; title: string; views: number; engagement: number }>;
    categoryPerformance: Array<{ category: string; views: number; content_count: number }>;
    searchTerms: Array<{ term: string; count: number }>;
  }> {
    try {
      // This would integrate with the analytics service
      // For now, return mock data structure
      return {
        views: [],
        topContent: [],
        categoryPerformance: [],
        searchTerms: [],
      };
    } catch (error) {
      throw new ApiError('Failed to get content analytics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Helper methods
   */
  private async validateSlugUniqueness(websiteId: string, slug: string, excludeId?: string): Promise<void> {
    let query = supabase
      .from('content')
      .select('id')
      .eq('website_id', websiteId)
      .eq('slug', slug);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data: existingContent } = await query.single();

    if (existingContent) {
      throw new ApiError('Content with this slug already exists', 409, 'SLUG_EXISTS');
    }
  }

  private generateExcerptFromRichContent(blocks: RichContentBlock[]): string {
    const textBlocks = blocks.filter(block => 
      block.type === 'paragraph' || block.type === 'heading'
    );
    
    const text = textBlocks
      .map(block => block.content.text || block.content)
      .join(' ')
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .substring(0, 200);

    return text + (text.length === 200 ? '...' : '');
  }

  private async processEmbedContent(content: any): Promise<any> {
    // Process different embed types (YouTube, Twitter, etc.)
    if (content.url) {
      // Extract metadata from URL
      // This would integrate with oEmbed or similar services
      return {
        ...content,
        metadata: await this.getEmbedMetadata(content.url),
      };
    }
    return content;
  }

  private async getEmbedMetadata(url: string): Promise<any> {
    // Implement oEmbed or URL metadata extraction
    return {};
  }

  private highlightCode(code: string, language: string): string {
    // Implement syntax highlighting
    // This would integrate with a library like Prism.js
    return code;
  }

  private async getSearchFacets(websiteId: string, options: ContentSearchOptions): Promise<any> {
    // Get aggregated data for search facets
    // This would return counts for categories, tags, authors, etc.
    return {
      categories: [],
      tags: [],
      authors: [],
      statuses: [],
    };
  }

  private async associateCategories(contentId: string, categoryIds: string[]): Promise<void> {
    if (categoryIds.length === 0) return;

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

  private async associateTags(contentId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

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

  private async updateCategories(contentId: string, categoryIds: string[]): Promise<void> {
    // Remove existing associations
    await supabase
      .from('content_categories')
      .delete()
      .eq('content_id', contentId);

    // Add new associations
    if (categoryIds.length > 0) {
      await this.associateCategories(contentId, categoryIds);
    }
  }

  private async updateTags(contentId: string, tagIds: string[]): Promise<void> {
    // Remove existing associations
    await supabase
      .from('content_tags')
      .delete()
      .eq('content_id', contentId);

    // Add new associations
    if (tagIds.length > 0) {
      await this.associateTags(contentId, tagIds);
    }
  }
}

export const enhancedContentService = new EnhancedContentService();
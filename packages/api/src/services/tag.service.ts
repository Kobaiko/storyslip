import { supabase } from '../config/supabase';
import HelperUtil from '../utils/helpers';
import { Tag } from '../types/database';
import { ApiError } from '../utils/response';

export interface TagCreateInput {
  name: string;
  slug?: string;
  color?: string;
}

export interface TagUpdateInput {
  name?: string;
  slug?: string;
  color?: string;
}

export class TagService {
  /**
   * Create new tag
   */
  async createTag(websiteId: string, input: TagCreateInput): Promise<Tag> {
    try {
      // Generate slug if not provided
      const slug = input.slug || HelperUtil.generateSlug(input.name);

      // Check if slug already exists for this website
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('website_id', websiteId)
        .eq('slug', slug)
        .single();

      if (existingTag) {
        throw new ApiError('Tag with this slug already exists', 409, 'SLUG_EXISTS');
      }

      const tagData = {
        name: input.name,
        slug,
        color: input.color || '#3b82f6', // Default blue color
        website_id: websiteId,
      };

      const { data: tag, error } = await supabase
        .from('tags')
        .insert(tagData)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create tag', 500, 'DATABASE_ERROR', error);
      }

      return tag;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create tag', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get tag by ID
   */
  async getTagById(tagId: string, websiteId: string): Promise<Tag> {
    try {
      const { data: tag, error } = await supabase
        .from('tags')
        .select('*')
        .eq('id', tagId)
        .eq('website_id', websiteId)
        .single();

      if (error || !tag) {
        throw new ApiError('Tag not found', 404, 'TAG_NOT_FOUND');
      }

      return tag;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch tag', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get tags list
   */
  async getTagsByWebsite(
    websiteId: string,
    search?: string,
    limit?: number
  ): Promise<Tag[]> {
    try {
      let query = supabase
        .from('tags')
        .select('*')
        .eq('website_id', websiteId)
        .order('name');

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data: tags, error } = await query;

      if (error) {
        throw new ApiError('Failed to fetch tags', 500, 'DATABASE_ERROR', error);
      }

      return tags || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch tags', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get popular tags (by usage count)
   */
  async getPopularTags(websiteId: string, limit = 10): Promise<Array<Tag & { usage_count: number }>> {
    try {
      const { data: tags, error } = await supabase
        .from('tags')
        .select(`
          *,
          content_tags(count)
        `)
        .eq('website_id', websiteId);

      if (error) {
        throw new ApiError('Failed to fetch popular tags', 500, 'DATABASE_ERROR', error);
      }

      // Calculate usage count and sort
      const tagsWithCount = (tags || [])
        .map(tag => ({
          ...tag,
          usage_count: tag.content_tags?.length || 0,
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, limit);

      return tagsWithCount;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch popular tags', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Update tag
   */
  async updateTag(
    tagId: string,
    websiteId: string,
    input: TagUpdateInput
  ): Promise<Tag> {
    try {
      // Verify tag exists
      await this.getTagById(tagId, websiteId);

      // Check slug uniqueness if being updated
      if (input.slug) {
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('website_id', websiteId)
          .eq('slug', input.slug)
          .neq('id', tagId)
          .single();

        if (existingTag) {
          throw new ApiError('Tag with this slug already exists', 409, 'SLUG_EXISTS');
        }
      }

      const updateData = HelperUtil.removeUndefined(input);

      const { data: tag, error } = await supabase
        .from('tags')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tagId)
        .eq('website_id', websiteId)
        .select()
        .single();

      if (error || !tag) {
        throw new ApiError('Failed to update tag', 500, 'DATABASE_ERROR', error);
      }

      return tag;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update tag', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Delete tag
   */
  async deleteTag(tagId: string, websiteId: string): Promise<void> {
    try {
      // Verify tag exists
      await this.getTagById(tagId, websiteId);

      // Check if tag is used by content
      const { data: content } = await supabase
        .from('content_tags')
        .select('content_id')
        .eq('tag_id', tagId)
        .limit(1);

      if (content && content.length > 0) {
        throw new ApiError('Cannot delete tag that is used by content', 400, 'TAG_IN_USE');
      }

      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)
        .eq('website_id', websiteId);

      if (error) {
        throw new ApiError('Failed to delete tag', 500, 'DATABASE_ERROR', error);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete tag', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Find or create tags by names
   */
  async findOrCreateTags(websiteId: string, tagNames: string[]): Promise<Tag[]> {
    try {
      const tags: Tag[] = [];

      for (const name of tagNames) {
        const slug = HelperUtil.generateSlug(name);

        // Try to find existing tag
        const { data: existingTag } = await supabase
          .from('tags')
          .select('*')
          .eq('website_id', websiteId)
          .eq('slug', slug)
          .single();

        if (existingTag) {
          tags.push(existingTag);
        } else {
          // Create new tag
          const newTag = await this.createTag(websiteId, { name, slug });
          tags.push(newTag);
        }
      }

      return tags;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to find or create tags', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get tag cloud data
   */
  async getTagCloud(websiteId: string): Promise<Array<Tag & { usage_count: number; weight: number }>> {
    try {
      const popularTags = await this.getPopularTags(websiteId, 50);

      if (popularTags.length === 0) return [];

      // Calculate weights (1-5 scale)
      const maxCount = Math.max(...popularTags.map(tag => tag.usage_count));
      const minCount = Math.min(...popularTags.map(tag => tag.usage_count));
      const range = maxCount - minCount || 1;

      const tagCloud = popularTags.map(tag => ({
        ...tag,
        weight: Math.ceil(((tag.usage_count - minCount) / range) * 4) + 1,
      }));

      return tagCloud;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to generate tag cloud', 500, 'INTERNAL_ERROR', error);
    }
  }
}

export const tagService = new TagService();
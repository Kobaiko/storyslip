import { Request, Response } from 'express';
import { contentService } from '../services/content.service';
import { enhancedContentService } from '../services/enhanced-content.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';
import { teamService } from '../services/team.service';
import { supabase } from '../config/supabase';

export class ContentController {
  /**
   * Create new content
   */
  static createContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const contentData = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const content = await contentService.createContent(websiteId, userId, contentData);

      logDatabaseOperation('INSERT', 'content', { 
        contentId: content.id, 
        websiteId, 
        userId,
        status: content.status 
      });
      
      logSecurityEvent('Content created', { 
        contentId: content.id, 
        websiteId,
        title: content.title,
        status: content.status 
      }, req);

      ResponseUtil.created(res, { content });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to create content');
    }
  });

  /**
   * Get content by ID
   */
  static getContentById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const content = await contentService.getContentById(contentId, websiteId);

      logDatabaseOperation('SELECT', 'content', { contentId, websiteId, userId });

      ResponseUtil.success(res, { content });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to fetch content');
    }
  });

  /**
   * Get content list with filters and pagination
   */
  static getContentList = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      sort = 'created_at', 
      order = 'desc',
      status,
      category_id,
      tag_id,
      search,
      author_id,
      date_from,
      date_to
    } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const { page: pageNum, limit: limitNum } = HelperUtil.parsePagination({ page, limit });
      const { sort: sortField, order: sortOrder } = HelperUtil.parseSort(
        { sort, order },
        ['title', 'status', 'created_at', 'updated_at', 'published_at', 'view_count']
      );

      const filters = {
        status: status as string,
        category_id: category_id as string,
        tag_id: tag_id as string,
        search: search as string,
        author_id: author_id as string,
        date_from: date_from as string,
        date_to: date_to as string,
      };

      const result = await contentService.getContentList(
        websiteId,
        filters,
        pageNum,
        limitNum,
        sortField,
        sortOrder
      );

      logDatabaseOperation('SELECT', 'content', { 
        websiteId, 
        userId, 
        count: result.content.length,
        filters: Object.keys(filters).filter(key => filters[key as keyof typeof filters])
      });

      ResponseUtil.paginated(res, result.content, result.total, result.page, limitNum);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch content list');
    }
  });

  /**
   * Update content
   */
  static updateContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;
    const updateData = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const content = await contentService.updateContent(contentId, websiteId, updateData);

      logDatabaseOperation('UPDATE', 'content', { 
        contentId, 
        websiteId, 
        userId,
        updates: Object.keys(updateData),
        status: content.status
      });
      
      logSecurityEvent('Content updated', { 
        contentId, 
        websiteId,
        title: content.title,
        status: content.status,
        updates: Object.keys(updateData)
      }, req);

      ResponseUtil.success(res, { content });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to update content');
    }
  });

  /**
   * Delete content
   */
  static deleteContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      await contentService.deleteContent(contentId, websiteId);

      logDatabaseOperation('DELETE', 'content', { contentId, websiteId, userId });
      logSecurityEvent('Content deleted', { contentId, websiteId }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to delete content');
    }
  });

  /**
   * Publish content
   */
  static publishContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const content = await contentService.updateContent(contentId, websiteId, {
        status: 'published'
      });

      logDatabaseOperation('UPDATE', 'content', { 
        contentId, 
        websiteId, 
        userId,
        action: 'publish'
      });
      
      logSecurityEvent('Content published', { 
        contentId, 
        websiteId,
        title: content.title
      }, req);

      ResponseUtil.success(res, { content });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to publish content');
    }
  });

  /**
   * Unpublish content
   */
  static unpublishContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const content = await contentService.updateContent(contentId, websiteId, {
        status: 'draft'
      });

      logDatabaseOperation('UPDATE', 'content', { 
        contentId, 
        websiteId, 
        userId,
        action: 'unpublish'
      });
      
      logSecurityEvent('Content unpublished', { 
        contentId, 
        websiteId,
        title: content.title
      }, req);

      ResponseUtil.success(res, { content });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to unpublish content');
    }
  });

  /**
   * Schedule content for publishing
   */
  static scheduleContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;
    const { scheduled_at } = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    if (!scheduled_at) {
      return ResponseUtil.badRequest(res, 'Scheduled date is required');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const content = await contentService.updateContent(contentId, websiteId, {
        status: 'scheduled',
        scheduled_at
      });

      logDatabaseOperation('UPDATE', 'content', { 
        contentId, 
        websiteId, 
        userId,
        action: 'schedule',
        scheduled_at
      });
      
      logSecurityEvent('Content scheduled', { 
        contentId, 
        websiteId,
        title: content.title,
        scheduled_at
      }, req);

      ResponseUtil.success(res, { content });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to schedule content');
    }
  });

  /**
   * Duplicate content
   */
  static duplicateContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get original content
      const originalContent = await contentService.getContentById(contentId, websiteId);

      // Create duplicate with modified title and slug
      const duplicateData = {
        title: `${originalContent.title} (Copy)`,
        body: originalContent.body,
        excerpt: originalContent.excerpt,
        status: 'draft' as const,
        seo_title: originalContent.seo_title,
        seo_description: originalContent.seo_description,
        seo_keywords: originalContent.seo_keywords,
        featured_image_url: originalContent.featured_image_url,
        // Note: categories and tags would need to be handled separately
      };

      const duplicatedContent = await contentService.createContent(websiteId, userId, duplicateData);

      logDatabaseOperation('INSERT', 'content', { 
        contentId: duplicatedContent.id, 
        websiteId, 
        userId,
        action: 'duplicate',
        originalContentId: contentId
      });
      
      logSecurityEvent('Content duplicated', { 
        contentId: duplicatedContent.id, 
        websiteId,
        originalContentId: contentId,
        title: duplicatedContent.title
      }, req);

      ResponseUtil.created(res, { content: duplicatedContent });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to duplicate content');
    }
  });

  /**
   * Get content statistics
   */
  static getContentStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get content counts by status
      const { data: statusCounts } = await supabase
        .from('content')
        .select('status')
        .eq('website_id', websiteId);

      const stats = (statusCounts || []).reduce((acc: any, item: any) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});

      // Get total view count
      const { data: viewData } = await supabase
        .from('content')
        .select('view_count')
        .eq('website_id', websiteId);

      const totalViews = (viewData || []).reduce((sum, item) => sum + (item.view_count || 0), 0);

      // Get recent content count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentCount } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })
        .eq('website_id', websiteId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      ResponseUtil.success(res, {
        statusDistribution: stats,
        totalContent: Object.values(stats).reduce((sum: number, count: any) => sum + count, 0),
        totalViews,
        recentContent: recentCount || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch content statistics');
    }
  });

  /**
   * Create rich content with enhanced features
   */
  static createRichContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const contentData = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to create content
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_content');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to create content');
      }

      const content = await enhancedContentService.createRichContent(websiteId, userId, contentData);

      logDatabaseOperation('INSERT', 'content', {
        contentId: content.id,
        websiteId,
        userId,
        title: content.title,
        status: content.status,
      });

      logSecurityEvent('Rich content created', {
        contentId: content.id,
        websiteId,
        title: content.title,
      }, req);

      ResponseUtil.created(res, { content });
    } catch (error: any) {
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to create rich content');
    }
  });

  /**
   * Advanced content search
   */
  static searchContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const {
      query,
      status,
      categories,
      tags,
      authors,
      date_from,
      date_to,
      content_type,
      has_featured_image,
      sort_by,
      sort_order,
      page = 1,
      limit = 20,
    } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const { page: pageNum, limit: limitNum } = HelperUtil.parsePagination({ page, limit });

      const searchOptions = {
        query: query as string,
        status: status ? (status as string).split(',') : undefined,
        categories: categories ? (categories as string).split(',') : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
        authors: authors ? (authors as string).split(',') : undefined,
        date_from: date_from as string,
        date_to: date_to as string,
        content_type: content_type as string,
        has_featured_image: has_featured_image === 'true',
        sort_by: sort_by as any,
        sort_order: sort_order as any,
      };

      const result = await enhancedContentService.searchContent(
        websiteId,
        searchOptions,
        pageNum,
        limitNum
      );

      logDatabaseOperation('SELECT', 'content', {
        websiteId,
        userId,
        searchQuery: query,
        resultsCount: result.content.length,
      });

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to search content');
    }
  });

  /**
   * Schedule content action
   */
  static scheduleContentAction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;
    const { action, scheduled_at } = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    if (!action || !scheduled_at) {
      return ResponseUtil.badRequest(res, 'Action and scheduled_at are required');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage content
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_content');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to schedule content');
      }

      const schedule = await enhancedContentService.scheduleContentAction(
        contentId,
        action,
        scheduled_at,
        userId
      );

      logDatabaseOperation('INSERT', 'content_schedules', {
        scheduleId: schedule.id,
        contentId,
        websiteId,
        userId,
        action,
        scheduledAt: scheduled_at,
      });

      logSecurityEvent('Content action scheduled', {
        contentId,
        websiteId,
        action,
        scheduledAt: scheduled_at,
      }, req);

      ResponseUtil.created(res, { schedule });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to schedule content action');
    }
  });

  /**
   * Get content revisions
   */
  static getContentRevisions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const revisions = await enhancedContentService.getContentRevisions(contentId);

      logDatabaseOperation('SELECT', 'content_revisions', {
        contentId,
        websiteId,
        userId,
        revisionsCount: revisions.length,
      });

      ResponseUtil.success(res, { revisions });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch content revisions');
    }
  });

  /**
   * Restore content from revision
   */
  static restoreFromRevision = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId, revisionId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId) || !HelperUtil.isValidUuid(revisionId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage content
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_content');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to restore content');
      }

      const content = await enhancedContentService.restoreFromRevision(contentId, revisionId, userId);

      logDatabaseOperation('UPDATE', 'content', {
        contentId,
        websiteId,
        userId,
        action: 'restore_from_revision',
        revisionId,
      });

      logSecurityEvent('Content restored from revision', {
        contentId,
        websiteId,
        revisionId,
      }, req);

      ResponseUtil.success(res, { content });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to restore content from revision');
    }
  });

  /**
   * Bulk update content
   */
  static bulkUpdateContent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { content_ids, updates } = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    if (!content_ids || !Array.isArray(content_ids) || content_ids.length === 0) {
      return ResponseUtil.badRequest(res, 'content_ids array is required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      return ResponseUtil.badRequest(res, 'updates object is required');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage content
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_content');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to bulk update content');
      }

      const result = await enhancedContentService.bulkUpdateContent(
        websiteId,
        content_ids,
        updates,
        userId
      );

      logDatabaseOperation('UPDATE', 'content', {
        websiteId,
        userId,
        action: 'bulk_update',
        contentIds: content_ids,
        updatedCount: result.updated,
        errorCount: result.errors.length,
      });

      logSecurityEvent('Bulk content update', {
        websiteId,
        contentCount: content_ids.length,
        updatedCount: result.updated,
      }, req);

      ResponseUtil.success(res, result);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to bulk update content');
    }
  });

  /**
   * Get content analytics
   */
  static getContentAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;
    const { period = '30d' } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    if (contentId && !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid content ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to view analytics
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'view_analytics');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view analytics');
      }

      const analytics = await enhancedContentService.getContentAnalytics(
        websiteId,
        contentId,
        period as string
      );

      logDatabaseOperation('SELECT', 'analytics', {
        websiteId,
        userId,
        contentId,
        period,
      });

      ResponseUtil.success(res, { analytics });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch content analytics');
    }
  });
}

export default ContentController;
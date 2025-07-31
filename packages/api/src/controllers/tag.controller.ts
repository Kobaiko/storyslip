import { Request, Response } from 'express';
import { tagService } from '../services/tag.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';

export class TagController {
  /**
   * Create new tag
   */
  static createTag = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const tagData = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const tag = await tagService.createTag(websiteId, tagData);

      logDatabaseOperation('INSERT', 'tags', { 
        tagId: tag.id, 
        websiteId, 
        userId,
        name: tag.name
      });
      
      logSecurityEvent('Tag created', { 
        tagId: tag.id, 
        websiteId,
        name: tag.name
      }, req);

      ResponseUtil.created(res, { tag });
    } catch (error: any) {
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to create tag');
    }
  });

  /**
   * Get tag by ID
   */
  static getTagById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, tagId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(tagId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const tag = await tagService.getTagById(tagId, websiteId);

      logDatabaseOperation('SELECT', 'tags', { tagId, websiteId, userId });

      ResponseUtil.success(res, { tag });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to fetch tag');
    }
  });

  /**
   * Get tags list
   */
  static getTags = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { search, limit } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const tags = await tagService.getTagsByWebsite(
        websiteId,
        search as string,
        limit ? parseInt(limit as string) : undefined
      );

      logDatabaseOperation('SELECT', 'tags', { 
        websiteId, 
        userId, 
        count: tags.length,
        search: !!search,
        limit
      });

      ResponseUtil.success(res, { tags });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch tags');
    }
  });

  /**
   * Get popular tags
   */
  static getPopularTags = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { limit = '10' } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const tags = await tagService.getPopularTags(websiteId, parseInt(limit as string));

      logDatabaseOperation('SELECT', 'tags', { 
        websiteId, 
        userId, 
        action: 'popular',
        count: tags.length,
        limit
      });

      ResponseUtil.success(res, { tags });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch popular tags');
    }
  });

  /**
   * Get tag cloud
   */
  static getTagCloud = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      const tagCloud = await tagService.getTagCloud(websiteId);

      logDatabaseOperation('SELECT', 'tags', { 
        websiteId, 
        userId, 
        action: 'cloud',
        count: tagCloud.length
      });

      ResponseUtil.success(res, { tags: tagCloud });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate tag cloud');
    }
  });

  /**
   * Update tag
   */
  static updateTag = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, tagId } = req.params;
    const updateData = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(tagId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const tag = await tagService.updateTag(tagId, websiteId, updateData);

      logDatabaseOperation('UPDATE', 'tags', { 
        tagId, 
        websiteId, 
        userId,
        updates: Object.keys(updateData),
        name: tag.name
      });
      
      logSecurityEvent('Tag updated', { 
        tagId, 
        websiteId,
        name: tag.name,
        updates: Object.keys(updateData)
      }, req);

      ResponseUtil.success(res, { tag });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to update tag');
    }
  });

  /**
   * Delete tag
   */
  static deleteTag = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, tagId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(tagId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      await tagService.deleteTag(tagId, websiteId);

      logDatabaseOperation('DELETE', 'tags', { tagId, websiteId, userId });
      logSecurityEvent('Tag deleted', { tagId, websiteId }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to delete tag');
    }
  });

  /**
   * Find or create tags
   */
  static findOrCreateTags = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { names } = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    if (!Array.isArray(names) || names.length === 0) {
      return ResponseUtil.badRequest(res, 'Tag names array is required');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const tags = await tagService.findOrCreateTags(websiteId, names);

      logDatabaseOperation('INSERT/SELECT', 'tags', { 
        websiteId, 
        userId,
        action: 'find_or_create',
        requestedCount: names.length,
        resultCount: tags.length
      });

      ResponseUtil.success(res, { tags });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to find or create tags');
    }
  });
}

export default TagController;
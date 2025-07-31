import { Request, Response } from 'express';
import { mediaService, MediaService } from '../services/media.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';

export class MediaController {
  /**
   * Upload media file
   */
  static uploadFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { alt_text, caption } = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    if (!req.file) {
      return ResponseUtil.badRequest(res, 'No file provided');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const result = await mediaService.uploadFile(websiteId, userId, req.file, {
        alt_text,
        caption,
      });

      logDatabaseOperation('INSERT', 'media_files', {
        fileId: result.file.id,
        websiteId,
        userId,
        filename: result.file.filename,
        fileSize: result.file.file_size,
        mimeType: result.file.mime_type,
      });

      logSecurityEvent('Media file uploaded', {
        fileId: result.file.id,
        websiteId,
        filename: result.file.original_filename,
        fileSize: result.file.file_size,
      }, req);

      ResponseUtil.created(res, result);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to upload file');
    }
  });

  /**
   * Get media files list
   */
  static getMediaFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      type,
      search
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

      const filters = {
        type: type as 'image' | 'document' | undefined,
        search: search as string | undefined,
      };

      const result = await mediaService.getMediaFiles(websiteId, filters, pageNum, limitNum);

      logDatabaseOperation('SELECT', 'media_files', {
        websiteId,
        userId,
        count: result.files.length,
        filters: Object.keys(filters).filter(key => filters[key as keyof typeof filters]),
      });

      ResponseUtil.paginated(res, result.files, result.total, result.page, limitNum);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch media files');
    }
  });

  /**
   * Get media file by ID
   */
  static getMediaFileById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, fileId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(fileId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const file = await mediaService.getMediaFileById(fileId, websiteId);
      const url = mediaService.getMediaFileUrl(file.file_path);

      logDatabaseOperation('SELECT', 'media_files', { fileId, websiteId, userId });

      ResponseUtil.success(res, { file, url });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to fetch media file');
    }
  });

  /**
   * Update media file metadata
   */
  static updateMediaFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, fileId } = req.params;
    const { alt_text, caption } = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(fileId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const file = await mediaService.updateMediaFile(fileId, websiteId, {
        alt_text,
        caption,
      });

      logDatabaseOperation('UPDATE', 'media_files', {
        fileId,
        websiteId,
        userId,
        updates: ['alt_text', 'caption'].filter(field => req.body[field] !== undefined),
      });

      logSecurityEvent('Media file updated', {
        fileId,
        websiteId,
        filename: file.original_filename,
      }, req);

      ResponseUtil.success(res, { file });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to update media file');
    }
  });

  /**
   * Delete media file
   */
  static deleteMediaFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, fileId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(fileId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get file info for logging before deletion
      const file = await mediaService.getMediaFileById(fileId, websiteId);

      await mediaService.deleteMediaFile(fileId, websiteId);

      logDatabaseOperation('DELETE', 'media_files', { fileId, websiteId, userId });
      
      logSecurityEvent('Media file deleted', {
        fileId,
        websiteId,
        filename: file.original_filename,
      }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to delete media file');
    }
  });

  /**
   * Get media statistics
   */
  static getMediaStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      const stats = await mediaService.getMediaStats(websiteId);

      logDatabaseOperation('SELECT', 'media_files', {
        websiteId,
        userId,
        action: 'stats',
      });

      ResponseUtil.success(res, stats);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch media statistics');
    }
  });
}

export default MediaController;
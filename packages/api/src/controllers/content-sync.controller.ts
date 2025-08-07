import { Request, Response } from 'express';
import { ContentVersioningService } from '../services/content-versioning.service';
import { supabase } from '../config/supabase';
import { successResponse, errorResponse } from '../utils/response';

export class ContentSyncController {
  /**
   * Get version history for content
   */
  static async getVersionHistory(req: Request, res: Response) {
    try {
      const { websiteId, contentId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const userId = req.user?.id;

      // Verify user has access to this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (contentError || !content) {
        return errorResponse(res, 'Content not found', 404);
      }

      const result = await ContentVersioningService.getVersionHistory(
        contentId,
        Number(limit),
        Number(offset)
      );

      if (result.error) {
        return errorResponse(res, 'Failed to get version history', 500, result.error);
      }

      return successResponse(res, result.data, 'Version history retrieved successfully');
    } catch (error) {
      console.error('Error getting version history:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get specific version of content
   */
  static async getVersion(req: Request, res: Response) {
    try {
      const { websiteId, contentId, versionNumber } = req.params;
      const userId = req.user?.id;

      // Verify user has access to this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (contentError || !content) {
        return errorResponse(res, 'Content not found', 404);
      }

      const result = await ContentVersioningService.getVersion(
        contentId,
        Number(versionNumber)
      );

      if (result.error) {
        return errorResponse(res, 'Version not found', 404, result.error);
      }

      return successResponse(res, result.data, 'Version retrieved successfully');
    } catch (error) {
      console.error('Error getting version:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Compare two versions of content
   */
  static async compareVersions(req: Request, res: Response) {
    try {
      const { websiteId, contentId } = req.params;
      const { version1, version2 } = req.query;
      const userId = req.user?.id;

      // Verify user has access to this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (contentError || !content) {
        return errorResponse(res, 'Content not found', 404);
      }

      const result = await ContentVersioningService.compareVersions(
        contentId,
        Number(version1),
        Number(version2)
      );

      if (result.error) {
        return errorResponse(res, 'Failed to compare versions', 500, result.error);
      }

      return successResponse(res, result.data, 'Version comparison completed successfully');
    } catch (error) {
      console.error('Error comparing versions:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Restore content to specific version
   */
  static async restoreVersion(req: Request, res: Response) {
    try {
      const { websiteId, contentId, versionNumber } = req.params;
      const userId = req.user?.id;

      // Verify user has edit permissions
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (contentError || !content) {
        return errorResponse(res, 'Content not found', 404);
      }

      const userRole = content.website.website_members[0]?.role;
      if (!['owner', 'admin', 'editor'].includes(userRole)) {
        return errorResponse(res, 'Insufficient permissions to restore content', 403);
      }

      const result = await ContentVersioningService.restoreVersion(
        contentId,
        Number(versionNumber),
        userId
      );

      if (result.error) {
        return errorResponse(res, 'Failed to restore version', 500, result.error);
      }

      return successResponse(res, result.data, 'Content restored successfully');
    } catch (error) {
      console.error('Error restoring version:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Acquire edit lock for content
   */
  static async acquireLock(req: Request, res: Response) {
    try {
      const { websiteId, contentId } = req.params;
      const userId = req.user?.id;

      // Verify user has edit permissions
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (contentError || !content) {
        return errorResponse(res, 'Content not found', 404);
      }

      const userRole = content.website.website_members[0]?.role;
      if (!['owner', 'admin', 'editor'].includes(userRole)) {
        return errorResponse(res, 'Insufficient permissions to edit content', 403);
      }

      // Check for existing lock
      const { data: existingLock } = await supabase
        .from('content_locks')
        .select('*')
        .eq('content_id', contentId)
        .eq('website_id', websiteId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingLock && existingLock.user_id !== userId) {
        return errorResponse(res, 'Content is currently locked by another user', 409, {
          lockedBy: existingLock.user_id,
          expiresAt: existingLock.expires_at,
        });
      }

      // Create or update lock
      const lockData = {
        content_id: contentId,
        website_id: websiteId,
        user_id: userId,
        locked_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      };

      const { data: lock, error: lockError } = await supabase
        .from('content_locks')
        .upsert(lockData, { onConflict: 'content_id' })
        .select()
        .single();

      if (lockError) {
        return errorResponse(res, 'Failed to acquire lock', 500, lockError);
      }

      return successResponse(res, lock, 'Lock acquired successfully');
    } catch (error) {
      console.error('Error acquiring lock:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Release edit lock for content
   */
  static async releaseLock(req: Request, res: Response) {
    try {
      const { websiteId, contentId } = req.params;
      const userId = req.user?.id;

      // Delete lock if owned by user
      const { data: deletedLock, error: deleteError } = await supabase
        .from('content_locks')
        .delete()
        .eq('content_id', contentId)
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .select()
        .single();

      if (deleteError || !deletedLock) {
        return errorResponse(res, 'Lock not found or not owned by user', 404);
      }

      return successResponse(res, { released: true }, 'Lock released successfully');
    } catch (error) {
      console.error('Error releasing lock:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Extend edit lock for content
   */
  static async extendLock(req: Request, res: Response) {
    try {
      const { websiteId, contentId } = req.params;
      const { minutes = 10 } = req.body;
      const userId = req.user?.id;

      // Update lock expiration if owned by user
      const { data: updatedLock, error: updateError } = await supabase
        .from('content_locks')
        .update({
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
        })
        .eq('content_id', contentId)
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError || !updatedLock) {
        return errorResponse(res, 'Lock not found or not owned by user', 404);
      }

      return successResponse(res, updatedLock, 'Lock extended successfully');
    } catch (error) {
      console.error('Error extending lock:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Detect conflicts in content changes
   */
  static async detectConflicts(req: Request, res: Response) {
    try {
      const { websiteId, contentId } = req.params;
      const { title, body, excerpt, baseVersion } = req.body;
      const userId = req.user?.id;

      // Verify user has access to this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (contentError || !content) {
        return errorResponse(res, 'Content not found', 404);
      }

      const result = await ContentVersioningService.detectConflicts(
        contentId,
        { title, body, excerpt },
        baseVersion
      );

      if (result.error) {
        return errorResponse(res, 'Failed to detect conflicts', 500, result.error);
      }

      return successResponse(res, result.data, 'Conflict detection completed');
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get version statistics for content
   */
  static async getVersionStats(req: Request, res: Response) {
    try {
      const { websiteId, contentId } = req.params;
      const userId = req.user?.id;

      // Verify user has access to this content
      const { data: content, error: contentError } = await supabase
        .from('content')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', contentId)
        .eq('website_id', websiteId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (contentError || !content) {
        return errorResponse(res, 'Content not found', 404);
      }

      const result = await ContentVersioningService.getVersionStats(contentId);

      if (result.error) {
        return errorResponse(res, 'Failed to get version statistics', 500, result.error);
      }

      return successResponse(res, result.data, 'Version statistics retrieved successfully');
    } catch (error) {
      console.error('Error getting version stats:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Clean up old versions and expired locks
   */
  static async cleanup(req: Request, res: Response) {
    try {
      const { keepVersions = 50 } = req.body;
      const userId = req.user?.id;

      // Only allow admins to run cleanup
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (!user || user.role !== 'admin') {
        return errorResponse(res, 'Insufficient permissions', 403);
      }

      // Clean up expired locks
      const { data: expiredLocks, error: lockError } = await supabase
        .from('content_locks')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (lockError) {
        console.error('Error cleaning up expired locks:', lockError);
      }

      // Get all content IDs to clean up versions
      const { data: contentIds } = await supabase
        .from('content')
        .select('id');

      let totalVersionsDeleted = 0;

      if (contentIds) {
        for (const content of contentIds) {
          const cleanupResult = await ContentVersioningService.cleanupOldVersions(
            content.id,
            keepVersions
          );
          
          if (cleanupResult.data) {
            totalVersionsDeleted += cleanupResult.data.deletedCount;
          }
        }
      }

      return successResponse(res, {
        expiredLocksDeleted: expiredLocks?.length || 0,
        oldVersionsDeleted: totalVersionsDeleted,
      }, 'Cleanup completed successfully');
    } catch (error) {
      console.error('Error during cleanup:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }
}

export default ContentSyncController;
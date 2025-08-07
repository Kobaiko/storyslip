import { Request, Response } from 'express';
import { ProfileService, UpdateProfileData, OnboardingProgress } from '../services/profile.service';
import { successResponse, errorResponse } from '../utils/response';
import multer from 'multer';

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export class ProfileController {
  /**
   * Get current user's profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { data, error } = await ProfileService.getProfile(userId);

      if (error) {
        console.error('Get profile error:', error);
        return errorResponse(res, 'Failed to get profile', 500);
      }

      if (!data) {
        return errorResponse(res, 'Profile not found', 404);
      }

      return successResponse(res, data, 'Profile retrieved successfully');
    } catch (error) {
      console.error('Get profile error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Update current user's profile
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const profileData: UpdateProfileData = req.body;

      // Validate required fields if provided
      if (profileData.first_name && profileData.first_name.trim().length === 0) {
        return errorResponse(res, 'First name cannot be empty', 400);
      }

      if (profileData.last_name && profileData.last_name.trim().length === 0) {
        return errorResponse(res, 'Last name cannot be empty', 400);
      }

      if (profileData.display_name && profileData.display_name.trim().length === 0) {
        return errorResponse(res, 'Display name cannot be empty', 400);
      }

      if (profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
        return errorResponse(res, 'Invalid email format', 400);
      }

      if (profileData.phone && profileData.phone.length > 20) {
        return errorResponse(res, 'Phone number too long', 400);
      }

      if (profileData.bio && profileData.bio.length > 500) {
        return errorResponse(res, 'Bio too long (max 500 characters)', 400);
      }

      const { data, error } = await ProfileService.updateProfile(userId, profileData);

      if (error) {
        console.error('Update profile error:', error);
        return errorResponse(res, 'Failed to update profile', 500);
      }

      return successResponse(res, data, 'Profile updated successfully');
    } catch (error) {
      console.error('Update profile error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Update onboarding progress
   */
  static async updateOnboardingProgress(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const progress: OnboardingProgress = req.body;

      // Validate progress data
      if (typeof progress.step !== 'number' || progress.step < 0) {
        return errorResponse(res, 'Invalid step number', 400);
      }

      if (typeof progress.completed !== 'boolean') {
        return errorResponse(res, 'Completed must be a boolean', 400);
      }

      const { data, error } = await ProfileService.updateOnboardingProgress(userId, progress);

      if (error) {
        console.error('Update onboarding progress error:', error);
        return errorResponse(res, 'Failed to update onboarding progress', 500);
      }

      return successResponse(res, data, 'Onboarding progress updated successfully');
    } catch (error) {
      console.error('Update onboarding progress error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Upload and update avatar
   */
  static uploadAvatar = upload.single('avatar');

  static async updateAvatar(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const { data, error } = await ProfileService.updateAvatar(
        userId,
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      if (error) {
        console.error('Update avatar error:', error);
        return errorResponse(res, 'Failed to update avatar', 500);
      }

      return successResponse(res, data, 'Avatar updated successfully');
    } catch (error) {
      console.error('Update avatar error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Delete current user's profile
   */
  static async deleteProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // Require confirmation
      const { confirm } = req.body;
      if (confirm !== 'DELETE') {
        return errorResponse(res, 'Profile deletion requires confirmation', 400);
      }

      const { data, error } = await ProfileService.deleteProfile(userId);

      if (error) {
        console.error('Delete profile error:', error);
        return errorResponse(res, 'Failed to delete profile', 500);
      }

      return successResponse(res, { deleted: true }, 'Profile deleted successfully');
    } catch (error) {
      console.error('Delete profile error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get profile completion status
   */
  static async getProfileCompletion(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { data, error } = await ProfileService.getProfileCompletion(userId);

      if (error) {
        console.error('Get profile completion error:', error);
        return errorResponse(res, 'Failed to get profile completion', 500);
      }

      return successResponse(res, data, 'Profile completion retrieved successfully');
    } catch (error) {
      console.error('Get profile completion error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Search users for team invitations
   */
  static async searchUsers(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { q: query, organization_id: organizationId, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        return errorResponse(res, 'Search query is required', 400);
      }

      if (!organizationId || typeof organizationId !== 'string') {
        return errorResponse(res, 'Organization ID is required', 400);
      }

      if (query.length < 2) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
      }

      const { data, error } = await ProfileService.searchUsers(
        query,
        organizationId,
        Math.min(Number(limit), 50) // Cap at 50 results
      );

      if (error) {
        console.error('Search users error:', error);
        return errorResponse(res, 'Failed to search users', 500);
      }

      return successResponse(res, data, 'Users retrieved successfully');
    } catch (error) {
      console.error('Search users error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }
}

export default ProfileController;
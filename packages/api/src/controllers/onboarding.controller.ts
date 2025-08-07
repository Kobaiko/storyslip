import { Request, Response } from 'express';
import { OnboardingService, CompleteStepData } from '../services/onboarding.service';
import { successResponse, errorResponse } from '../utils/response';

export class OnboardingController {
  /**
   * Get user's onboarding progress
   */
  static async getProgress(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { data, error } = await OnboardingService.getOnboardingProgress(userId);

      if (error) {
        console.error('Get onboarding progress error:', error);
        return errorResponse(res, 'Failed to get onboarding progress', 500);
      }

      return successResponse(res, data, 'Onboarding progress retrieved successfully');
    } catch (error) {
      console.error('Get onboarding progress error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Complete an onboarding step
   */
  static async completeStep(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const stepData: CompleteStepData = req.body;

      // Validate required fields
      if (!stepData.step_id || typeof stepData.step_id !== 'string') {
        return errorResponse(res, 'Step ID is required', 400);
      }

      const { data, error } = await OnboardingService.completeStep(userId, stepData);

      if (error) {
        console.error('Complete step error:', error);
        if (error.message === 'Invalid step ID') {
          return errorResponse(res, 'Invalid step ID', 400);
        }
        return errorResponse(res, 'Failed to complete step', 500);
      }

      return successResponse(res, data, 'Step completed successfully');
    } catch (error) {
      console.error('Complete step error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Complete the entire onboarding process
   */
  static async completeOnboarding(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { data, error } = await OnboardingService.completeOnboarding(userId);

      if (error) {
        console.error('Complete onboarding error:', error);
        if (error.message.includes('required steps must be completed')) {
          return errorResponse(res, error.message, 400);
        }
        return errorResponse(res, 'Failed to complete onboarding', 500);
      }

      return successResponse(res, { completed: true }, 'Onboarding completed successfully');
    } catch (error) {
      console.error('Complete onboarding error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Skip onboarding
   */
  static async skipOnboarding(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { data, error } = await OnboardingService.skipOnboarding(userId);

      if (error) {
        console.error('Skip onboarding error:', error);
        return errorResponse(res, 'Failed to skip onboarding', 500);
      }

      return successResponse(res, { skipped: true }, 'Onboarding skipped successfully');
    } catch (error) {
      console.error('Skip onboarding error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Reset onboarding progress
   */
  static async resetOnboarding(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { data, error } = await OnboardingService.resetOnboarding(userId);

      if (error) {
        console.error('Reset onboarding error:', error);
        return errorResponse(res, 'Failed to reset onboarding', 500);
      }

      return successResponse(res, { reset: true }, 'Onboarding reset successfully');
    } catch (error) {
      console.error('Reset onboarding error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Check if user should see onboarding
   */
  static async shouldShowOnboarding(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const { data, error } = await OnboardingService.shouldShowOnboarding(userId);

      if (error) {
        console.error('Should show onboarding error:', error);
        return errorResponse(res, 'Failed to check onboarding status', 500);
      }

      return successResponse(res, { should_show: data }, 'Onboarding status checked successfully');
    } catch (error) {
      console.error('Should show onboarding error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get onboarding statistics (admin only)
   */
  static async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // TODO: Add admin role check here
      // For now, anyone can access stats

      const { data, error } = await OnboardingService.getOnboardingStats();

      if (error) {
        console.error('Get onboarding stats error:', error);
        return errorResponse(res, 'Failed to get onboarding statistics', 500);
      }

      return successResponse(res, data, 'Onboarding statistics retrieved successfully');
    } catch (error) {
      console.error('Get onboarding stats error:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }
}

export default OnboardingController;
import { supabase } from '../config/supabase';
import { DatabaseResult } from '../types/database';
import { ProfileService } from './profile.service';
import { OrganizationService } from './organization.service';
import { SampleContentService } from './sample-content.service';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
  data?: Record<string, any>;
}

export interface OnboardingProgress {
  user_id: string;
  current_step: number;
  completed_steps: string[];
  is_completed: boolean;
  completed_at?: string;
  steps: OnboardingStep[];
}

export interface CompleteStepData {
  step_id: string;
  data?: Record<string, any>;
}

export class OnboardingService {
  private static readonly ONBOARDING_STEPS = [
    {
      id: 'welcome',
      title: 'Welcome to StorySlip',
      description: 'Get familiar with the platform',
      is_required: true,
    },
    {
      id: 'profile_setup',
      title: 'Complete Your Profile',
      description: 'Add your personal information and preferences',
      is_required: true,
    },
    {
      id: 'organization_setup',
      title: 'Set Up Your Organization',
      description: 'Configure your organization settings',
      is_required: true,
    },
    {
      id: 'create_website',
      title: 'Create Your First Website',
      description: 'Set up your website to start managing content',
      is_required: true,
    },
    {
      id: 'add_content',
      title: 'Add Your First Content',
      description: 'Create and publish your first article or page',
      is_required: true,
    },
    {
      id: 'customize_widget',
      title: 'Customize Your Widget',
      description: 'Style your content widget to match your brand',
      is_required: false,
    },
    {
      id: 'invite_team',
      title: 'Invite Team Members',
      description: 'Collaborate with your team on content creation',
      is_required: false,
    },
    {
      id: 'analytics_setup',
      title: 'Set Up Analytics',
      description: 'Track your content performance and engagement',
      is_required: false,
    },
  ];

  /**
   * Get user's onboarding progress
   */
  static async getOnboardingProgress(authUserId: string): Promise<DatabaseResult<OnboardingProgress>> {
    try {
      // Get user profile to check onboarding status
      const { data: profile, error: profileError } = await ProfileService.getProfile(authUserId);
      
      if (profileError || !profile) {
        return { data: null, error: profileError || new Error('Profile not found') };
      }

      // Get completed steps from preferences
      const completedSteps = profile.preferences?.onboarding?.completed_steps || [];
      const currentStep = profile.onboarding_step || 0;
      const isCompleted = profile.onboarding_completed || false;

      // Build steps with completion status
      const steps: OnboardingStep[] = this.ONBOARDING_STEPS.map(step => ({
        ...step,
        is_completed: completedSteps.includes(step.id),
        completed_at: profile.preferences?.onboarding?.step_completion?.[step.id],
        data: profile.preferences?.onboarding?.step_data?.[step.id],
      }));

      const progress: OnboardingProgress = {
        user_id: profile.user_id,
        current_step: currentStep,
        completed_steps: completedSteps,
        is_completed: isCompleted,
        completed_at: profile.preferences?.onboarding?.completed_at,
        steps,
      };

      return { data: progress, error: null };
    } catch (error) {
      console.error('Get onboarding progress error:', error);
      return { data: null, error };
    }
  }

  /**
   * Complete an onboarding step
   */
  static async completeStep(
    authUserId: string,
    stepData: CompleteStepData
  ): Promise<DatabaseResult<OnboardingProgress>> {
    try {
      // Get current progress
      const { data: currentProgress, error: progressError } = await this.getOnboardingProgress(authUserId);
      
      if (progressError || !currentProgress) {
        return { data: null, error: progressError || new Error('Failed to get current progress') };
      }

      // Validate step exists
      const stepExists = this.ONBOARDING_STEPS.find(s => s.id === stepData.step_id);
      if (!stepExists) {
        return { data: null, error: new Error('Invalid step ID') };
      }

      // Handle special step logic
      await this.handleStepSpecialLogic(authUserId, stepData);

      // Update completed steps
      const completedSteps = [...new Set([...currentProgress.completed_steps, stepData.step_id])];
      const stepIndex = this.ONBOARDING_STEPS.findIndex(s => s.id === stepData.step_id);
      const newCurrentStep = Math.max(currentProgress.current_step, stepIndex + 1);

      // Prepare onboarding data
      const onboardingData = {
        completed_steps: completedSteps,
        step_completion: {
          ...currentProgress.steps.reduce((acc, step) => {
            if (step.completed_at) {
              acc[step.id] = step.completed_at;
            }
            return acc;
          }, {} as Record<string, string>),
          [stepData.step_id]: new Date().toISOString(),
        },
        step_data: {
          ...currentProgress.steps.reduce((acc, step) => {
            if (step.data) {
              acc[step.id] = step.data;
            }
            return acc;
          }, {} as Record<string, any>),
          ...(stepData.data && { [stepData.step_id]: stepData.data }),
        },
      };

      // Update profile with onboarding progress
      const { data: updatedProfile, error: updateError } = await ProfileService.updateOnboardingProgress(
        authUserId,
        {
          step: newCurrentStep,
          completed: false, // Will be set to true when all required steps are done
          data: onboardingData,
        }
      );

      if (updateError) {
        return { data: null, error: updateError };
      }

      // Get updated progress
      return await this.getOnboardingProgress(authUserId);
    } catch (error) {
      console.error('Complete step error:', error);
      return { data: null, error };
    }
  }

  /**
   * Handle special logic for specific onboarding steps
   */
  private static async handleStepSpecialLogic(
    authUserId: string,
    stepData: CompleteStepData
  ): Promise<void> {
    try {
      switch (stepData.step_id) {
        case 'create_website':
          // Create sample content when website is created
          if (stepData.data?.website_id) {
            await SampleContentService.createSampleContent(
              stepData.data.website_id,
              authUserId
            );
            await SampleContentService.createSampleCategories(stepData.data.website_id);
            await SampleContentService.createSampleTags(stepData.data.website_id);
          }
          break;

        case 'add_content':
          // Additional content creation logic if needed
          break;

        default:
          // No special logic needed
          break;
      }
    } catch (error) {
      console.error('Error in step special logic:', error);
      // Don't throw error here to avoid breaking the onboarding flow
    }
  }

  /**
   * Complete the entire onboarding process
   */
  static async completeOnboarding(authUserId: string): Promise<DatabaseResult<boolean>> {
    try {
      // Get current progress
      const { data: currentProgress, error: progressError } = await this.getOnboardingProgress(authUserId);
      
      if (progressError || !currentProgress) {
        return { data: null, error: progressError || new Error('Failed to get current progress') };
      }

      // Check if all required steps are completed
      const requiredSteps = this.ONBOARDING_STEPS.filter(s => s.is_required);
      const completedRequiredSteps = requiredSteps.filter(s => 
        currentProgress.completed_steps.includes(s.id)
      );

      if (completedRequiredSteps.length < requiredSteps.length) {
        return { 
          data: null, 
          error: new Error('All required steps must be completed before finishing onboarding') 
        };
      }

      // Mark onboarding as completed
      const onboardingData = {
        ...currentProgress.steps.reduce((acc, step) => {
          if (step.data) {
            acc.step_data = acc.step_data || {};
            acc.step_data[step.id] = step.data;
          }
          if (step.completed_at) {
            acc.step_completion = acc.step_completion || {};
            acc.step_completion[step.id] = step.completed_at;
          }
          return acc;
        }, {} as any),
        completed_steps: currentProgress.completed_steps,
        completed_at: new Date().toISOString(),
      };

      const { error: updateError } = await ProfileService.updateOnboardingProgress(
        authUserId,
        {
          step: this.ONBOARDING_STEPS.length,
          completed: true,
          data: onboardingData,
        }
      );

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Complete onboarding error:', error);
      return { data: null, error };
    }
  }

  /**
   * Reset onboarding progress
   */
  static async resetOnboarding(authUserId: string): Promise<DatabaseResult<boolean>> {
    try {
      const { error } = await ProfileService.updateOnboardingProgress(
        authUserId,
        {
          step: 0,
          completed: false,
          data: {
            completed_steps: [],
            step_completion: {},
            step_data: {},
          },
        }
      );

      if (error) {
        return { data: null, error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Reset onboarding error:', error);
      return { data: null, error };
    }
  }

  /**
   * Skip onboarding (mark as completed without completing all steps)
   */
  static async skipOnboarding(authUserId: string): Promise<DatabaseResult<boolean>> {
    try {
      const onboardingData = {
        completed_steps: [],
        step_completion: {},
        step_data: {},
        completed_at: new Date().toISOString(),
        skipped: true,
      };

      const { error } = await ProfileService.updateOnboardingProgress(
        authUserId,
        {
          step: this.ONBOARDING_STEPS.length,
          completed: true,
          data: onboardingData,
        }
      );

      if (error) {
        return { data: null, error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Skip onboarding error:', error);
      return { data: null, error };
    }
  }

  /**
   * Get onboarding statistics (for admin/analytics)
   */
  static async getOnboardingStats(): Promise<DatabaseResult<{
    total_users: number;
    completed_onboarding: number;
    completion_rate: number;
    average_completion_time: number;
    step_completion_rates: Record<string, number>;
  }>> {
    try {
      // This would require admin access and aggregate queries
      // For now, return mock data
      const stats = {
        total_users: 0,
        completed_onboarding: 0,
        completion_rate: 0,
        average_completion_time: 0,
        step_completion_rates: {},
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Get onboarding stats error:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if user should see onboarding
   */
  static async shouldShowOnboarding(authUserId: string): Promise<DatabaseResult<boolean>> {
    try {
      const { data: progress, error } = await this.getOnboardingProgress(authUserId);
      
      if (error) {
        return { data: null, error };
      }

      // Show onboarding if not completed and user hasn't explicitly skipped
      const shouldShow = !progress?.is_completed && 
                        !progress?.steps.find(s => s.data?.skipped);

      return { data: shouldShow, error: null };
    } catch (error) {
      console.error('Should show onboarding error:', error);
      return { data: null, error };
    }
  }
}

export default OnboardingService;
import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { emailService } from './email.service';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: 'action' | 'info' | 'tutorial';
  required: boolean;
  order: number;
  action_url?: string;
  tutorial_content?: string;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  role: string;
  steps: OnboardingStep[];
  estimated_time: number; // in minutes
}

export interface MemberOnboarding {
  id: string;
  website_id: string;
  user_id: string;
  template_id: string;
  checklist_items: OnboardingStep[];
  completed_items: string[];
  completion_percentage: number;
  started_at: string;
  completed_at?: string;
  current_step?: string;
}

export class TeamOnboardingService {
  private readonly defaultTemplates: OnboardingTemplate[] = [
    {
      id: 'admin_onboarding',
      name: 'Admin Onboarding',
      description: 'Complete setup guide for website administrators',
      role: 'admin',
      estimated_time: 30,
      steps: [
        {
          id: 'profile_setup',
          title: 'Complete Your Profile',
          description: 'Add your name, avatar, and bio to help team members recognize you',
          type: 'action',
          required: true,
          order: 1,
          action_url: '/profile',
        },
        {
          id: 'website_settings',
          title: 'Configure Website Settings',
          description: 'Set up your website name, description, and basic configuration',
          type: 'action',
          required: true,
          order: 2,
          action_url: '/websites/{websiteId}/settings',
        },
        {
          id: 'invite_team',
          title: 'Invite Team Members',
          description: 'Add your team members and assign appropriate roles',
          type: 'action',
          required: false,
          order: 3,
          action_url: '/websites/{websiteId}/team',
        },
        {
          id: 'first_content',
          title: 'Create Your First Content',
          description: 'Write and publish your first article to test the system',
          type: 'action',
          required: false,
          order: 4,
          action_url: '/websites/{websiteId}/content/new',
        },
        {
          id: 'widget_setup',
          title: 'Set Up Your Widget',
          description: 'Configure and embed your content widget on your website',
          type: 'tutorial',
          required: false,
          order: 5,
          action_url: '/websites/{websiteId}/widgets',
          tutorial_content: 'Learn how to embed the StorySlip widget on your website...',
        },
        {
          id: 'analytics_overview',
          title: 'Explore Analytics',
          description: 'Understand your content performance and audience insights',
          type: 'info',
          required: false,
          order: 6,
          action_url: '/websites/{websiteId}/analytics',
        },
      ],
    },
    {
      id: 'editor_onboarding',
      name: 'Editor Onboarding',
      description: 'Getting started guide for content editors',
      role: 'editor',
      estimated_time: 20,
      steps: [
        {
          id: 'profile_setup',
          title: 'Complete Your Profile',
          description: 'Add your name, avatar, and bio',
          type: 'action',
          required: true,
          order: 1,
          action_url: '/profile',
        },
        {
          id: 'content_overview',
          title: 'Content Management Overview',
          description: 'Learn about the content creation and editing process',
          type: 'tutorial',
          required: true,
          order: 2,
          tutorial_content: 'Understanding the content workflow...',
        },
        {
          id: 'first_content',
          title: 'Create Your First Content',
          description: 'Write and publish your first article',
          type: 'action',
          required: true,
          order: 3,
          action_url: '/websites/{websiteId}/content/new',
        },
        {
          id: 'collaboration_tools',
          title: 'Collaboration Features',
          description: 'Learn about comments, reviews, and team collaboration',
          type: 'info',
          required: false,
          order: 4,
        },
        {
          id: 'seo_basics',
          title: 'SEO Optimization',
          description: 'Learn how to optimize your content for search engines',
          type: 'tutorial',
          required: false,
          order: 5,
          tutorial_content: 'SEO best practices for content creators...',
        },
      ],
    },
    {
      id: 'author_onboarding',
      name: 'Author Onboarding',
      description: 'Getting started guide for content authors',
      role: 'author',
      estimated_time: 15,
      steps: [
        {
          id: 'profile_setup',
          title: 'Complete Your Profile',
          description: 'Add your name, avatar, and bio',
          type: 'action',
          required: true,
          order: 1,
          action_url: '/profile',
        },
        {
          id: 'writing_guidelines',
          title: 'Review Writing Guidelines',
          description: 'Learn about the content style and guidelines',
          type: 'info',
          required: true,
          order: 2,
        },
        {
          id: 'first_draft',
          title: 'Write Your First Draft',
          description: 'Create your first article draft',
          type: 'action',
          required: true,
          order: 3,
          action_url: '/websites/{websiteId}/content/new',
        },
        {
          id: 'review_process',
          title: 'Understand Review Process',
          description: 'Learn how content review and approval works',
          type: 'tutorial',
          required: false,
          order: 4,
          tutorial_content: 'Understanding the content review workflow...',
        },
      ],
    },
    {
      id: 'viewer_onboarding',
      name: 'Viewer Onboarding',
      description: 'Basic introduction for content viewers',
      role: 'viewer',
      estimated_time: 10,
      steps: [
        {
          id: 'profile_setup',
          title: 'Complete Your Profile',
          description: 'Add your name and avatar',
          type: 'action',
          required: true,
          order: 1,
          action_url: '/profile',
        },
        {
          id: 'navigation_tour',
          title: 'Platform Navigation',
          description: 'Learn how to navigate and find content',
          type: 'tutorial',
          required: true,
          order: 2,
          tutorial_content: 'Getting around the platform...',
        },
        {
          id: 'notification_preferences',
          title: 'Set Notification Preferences',
          description: 'Configure how you want to be notified about updates',
          type: 'action',
          required: false,
          order: 3,
          action_url: '/settings/notifications',
        },
      ],
    },
  ];

  /**
   * Get onboarding template for a role
   */
  async getOnboardingTemplate(role: string): Promise<OnboardingTemplate | null> {
    const template = this.defaultTemplates.find(t => t.role === role);
    return template || null;
  }

  /**
   * Create onboarding for a new team member
   */
  async createMemberOnboarding(
    websiteId: string,
    userId: string,
    role: string
  ): Promise<MemberOnboarding> {
    try {
      const template = await this.getOnboardingTemplate(role);
      if (!template) {
        throw new ApiError('No onboarding template found for role', 404, 'TEMPLATE_NOT_FOUND');
      }

      // Customize steps with website-specific URLs
      const customizedSteps = template.steps.map(step => ({
        ...step,
        action_url: step.action_url?.replace('{websiteId}', websiteId),
      }));

      const { data, error } = await supabase
        .from('team_member_onboarding')
        .insert({
          website_id: websiteId,
          user_id: userId,
          template_id: template.id,
          checklist_items: customizedSteps,
          completed_items: [],
        })
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create onboarding', 500, 'DATABASE_ERROR', error);
      }

      // Send welcome notification
      await this.sendWelcomeNotification(websiteId, userId, template);

      return {
        id: data.id,
        website_id: data.website_id,
        user_id: data.user_id,
        template_id: data.template_id,
        checklist_items: data.checklist_items,
        completed_items: data.completed_items,
        completion_percentage: data.completion_percentage,
        started_at: data.started_at,
        completed_at: data.completed_at,
        current_step: this.getCurrentStep(data.checklist_items, data.completed_items),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create member onboarding', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get member onboarding status
   */
  async getMemberOnboarding(websiteId: string, userId: string): Promise<MemberOnboarding | null> {
    try {
      const { data, error } = await supabase
        .from('team_member_onboarding')
        .select('*')
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new ApiError('Failed to get onboarding status', 500, 'DATABASE_ERROR', error);
      }

      return {
        id: data.id,
        website_id: data.website_id,
        user_id: data.user_id,
        template_id: data.template_id,
        checklist_items: data.checklist_items,
        completed_items: data.completed_items,
        completion_percentage: data.completion_percentage,
        started_at: data.started_at,
        completed_at: data.completed_at,
        current_step: this.getCurrentStep(data.checklist_items, data.completed_items),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get member onboarding', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(
    websiteId: string,
    userId: string,
    completedItems: string[]
  ): Promise<MemberOnboarding> {
    try {
      const { data, error } = await supabase
        .from('team_member_onboarding')
        .update({ completed_items: completedItems })
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to update onboarding progress', 500, 'DATABASE_ERROR', error);
      }

      // Check if onboarding is completed
      if (data.completion_percentage === 100 && !data.completed_at) {
        await this.sendCompletionNotification(websiteId, userId);
      }

      return {
        id: data.id,
        website_id: data.website_id,
        user_id: data.user_id,
        template_id: data.template_id,
        checklist_items: data.checklist_items,
        completed_items: data.completed_items,
        completion_percentage: data.completion_percentage,
        started_at: data.started_at,
        completed_at: data.completed_at,
        current_step: this.getCurrentStep(data.checklist_items, data.completed_items),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update onboarding progress', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get team onboarding overview
   */
  async getTeamOnboardingOverview(websiteId: string): Promise<{
    total_members: number;
    completed_onboarding: number;
    in_progress: number;
    not_started: number;
    average_completion_time: number;
    completion_rate: number;
    members: Array<{
      user_id: string;
      name: string;
      email: string;
      role: string;
      completion_percentage: number;
      current_step?: string;
      started_at: string;
      completed_at?: string;
    }>;
  }> {
    try {
      // Get all team members with their onboarding status
      const { data: members, error: membersError } = await supabase
        .from('website_users')
        .select(`
          user_id,
          role,
          joined_at,
          user:users(name, email),
          onboarding:team_member_onboarding(
            completion_percentage,
            started_at,
            completed_at,
            checklist_items,
            completed_items
          )
        `)
        .eq('website_id', websiteId);

      if (membersError) {
        throw new ApiError('Failed to fetch team members', 500, 'DATABASE_ERROR', membersError);
      }

      const totalMembers = members?.length || 0;
      let completedOnboarding = 0;
      let inProgress = 0;
      let notStarted = 0;
      let totalCompletionTime = 0;
      let completedCount = 0;

      const memberDetails = members?.map(member => {
        const onboarding = member.onboarding?.[0];
        const completionPercentage = onboarding?.completion_percentage || 0;

        if (completionPercentage === 100) {
          completedOnboarding++;
          if (onboarding?.started_at && onboarding?.completed_at) {
            const startTime = new Date(onboarding.started_at).getTime();
            const endTime = new Date(onboarding.completed_at).getTime();
            totalCompletionTime += (endTime - startTime) / (1000 * 60 * 60); // hours
            completedCount++;
          }
        } else if (completionPercentage > 0) {
          inProgress++;
        } else {
          notStarted++;
        }

        return {
          user_id: member.user_id,
          name: member.user.name,
          email: member.user.email,
          role: member.role,
          completion_percentage: completionPercentage,
          current_step: onboarding ? this.getCurrentStep(
            onboarding.checklist_items,
            onboarding.completed_items
          ) : undefined,
          started_at: onboarding?.started_at || member.joined_at,
          completed_at: onboarding?.completed_at,
        };
      }) || [];

      const averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;
      const completionRate = totalMembers > 0 ? (completedOnboarding / totalMembers) * 100 : 0;

      return {
        total_members: totalMembers,
        completed_onboarding: completedOnboarding,
        in_progress: inProgress,
        not_started: notStarted,
        average_completion_time: Math.round(averageCompletionTime * 100) / 100,
        completion_rate: Math.round(completionRate * 100) / 100,
        members: memberDetails,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get team onboarding overview', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Send reminder for incomplete onboarding
   */
  async sendOnboardingReminder(websiteId: string, userId: string): Promise<void> {
    try {
      const onboarding = await this.getMemberOnboarding(websiteId, userId);
      if (!onboarding || onboarding.completion_percentage === 100) {
        return;
      }

      // Get user and website details
      const [userResult, websiteResult] = await Promise.all([
        supabase.from('users').select('name, email').eq('id', userId).single(),
        supabase.from('websites').select('name').eq('id', websiteId).single(),
      ]);

      if (userResult.data && websiteResult.data) {
        const currentStep = this.getCurrentStep(onboarding.checklist_items, onboarding.completed_items);
        
        await emailService.sendEmail({
          to: userResult.data.email,
          subject: `Complete your onboarding for ${websiteResult.data.name}`,
          template: 'onboarding-reminder',
          data: {
            userName: userResult.data.name,
            websiteName: websiteResult.data.name,
            completionPercentage: onboarding.completion_percentage,
            currentStep: currentStep,
            onboardingUrl: `${process.env.DASHBOARD_URL}/websites/${websiteId}/onboarding`,
          },
        });

        // Create notification
        await supabase.rpc('create_team_notification', {
          website_id: websiteId,
          user_id: userId,
          notification_type: 'onboarding_reminder',
          title: 'Complete your onboarding',
          message: `You're ${onboarding.completion_percentage}% done with your onboarding. Continue where you left off!`,
          data: {
            completion_percentage: onboarding.completion_percentage,
            current_step: currentStep,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send onboarding reminder:', error);
    }
  }

  /**
   * Private helper methods
   */
  private getCurrentStep(checklistItems: OnboardingStep[], completedItems: string[]): string | undefined {
    const completedSet = new Set(completedItems);
    const nextStep = checklistItems
      .sort((a, b) => a.order - b.order)
      .find(step => !completedSet.has(step.id));
    
    return nextStep?.id;
  }

  private async sendWelcomeNotification(
    websiteId: string,
    userId: string,
    template: OnboardingTemplate
  ): Promise<void> {
    try {
      await supabase.rpc('create_team_notification', {
        website_id: websiteId,
        user_id: userId,
        notification_type: 'welcome',
        title: 'Welcome to the team!',
        message: `Complete your ${template.name.toLowerCase()} to get started. Estimated time: ${template.estimated_time} minutes.`,
        data: {
          template_id: template.id,
          estimated_time: template.estimated_time,
        },
      });
    } catch (error) {
      console.error('Failed to send welcome notification:', error);
    }
  }

  private async sendCompletionNotification(websiteId: string, userId: string): Promise<void> {
    try {
      await supabase.rpc('create_team_notification', {
        website_id: websiteId,
        user_id: userId,
        notification_type: 'onboarding_completed',
        title: 'Onboarding completed!',
        message: 'Congratulations! You have successfully completed your onboarding. Welcome to the team!',
        data: {
          completed_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to send completion notification:', error);
    }
  }
}

export const teamOnboardingService = new TeamOnboardingService();
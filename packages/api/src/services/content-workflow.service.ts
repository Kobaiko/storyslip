import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { contentService } from './content.service';
import { emailService } from './email.service';

export interface ContentWorkflow {
  id: string;
  content_id: string;
  current_status: 'draft' | 'review' | 'approved' | 'rejected';
  assigned_reviewer?: string;
  reviewer_notes?: string;
  submitted_by: string;
  submitted_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowAction {
  action: 'submit_for_review' | 'approve' | 'reject' | 'request_changes';
  notes?: string;
  assigned_reviewer?: string;
}

export class ContentWorkflowService {
  /**
   * Submit content for review
   */
  async submitForReview(
    contentId: string,
    websiteId: string,
    userId: string,
    assignedReviewer?: string
  ): Promise<ContentWorkflow> {
    try {
      // Check if content exists and user has access
      const content = await contentService.getContentById(contentId, websiteId);
      
      if (content.status !== 'draft') {
        throw new ApiError('Only draft content can be submitted for review', 400, 'INVALID_STATUS');
      }

      // Create workflow entry
      const workflowData = {
        content_id: contentId,
        current_status: 'review' as const,
        assigned_reviewer: assignedReviewer,
        submitted_by: userId,
        submitted_at: new Date().toISOString(),
      };

      const { data: workflow, error } = await supabase
        .from('content_workflows')
        .insert(workflowData)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create workflow', 500, 'DATABASE_ERROR', error);
      }

      // Update content status
      await contentService.updateContent(contentId, websiteId, {
        status: 'review'
      });

      // Send notification to reviewer
      if (assignedReviewer) {
        await this.notifyReviewer(workflow, content);
      }

      return workflow;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to submit content for review', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Review content (approve/reject)
   */
  async reviewContent(
    workflowId: string,
    reviewerId: string,
    action: WorkflowAction
  ): Promise<ContentWorkflow> {
    try {
      // Get workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('content_workflows')
        .select('*, content:content(*)')
        .eq('id', workflowId)
        .single();

      if (workflowError || !workflow) {
        throw new ApiError('Workflow not found', 404, 'WORKFLOW_NOT_FOUND');
      }

      if (workflow.current_status !== 'review') {
        throw new ApiError('Content is not in review status', 400, 'INVALID_STATUS');
      }

      // Check if user is assigned reviewer or has admin permissions
      if (workflow.assigned_reviewer && workflow.assigned_reviewer !== reviewerId) {
        // Check if user has admin permissions for the website
        const hasAdminAccess = await this.checkAdminAccess(reviewerId, workflow.content.website_id);
        if (!hasAdminAccess) {
          throw new ApiError('Not authorized to review this content', 403, 'UNAUTHORIZED');
        }
      }

      // Update workflow
      const newStatus = action.action === 'approve' ? 'approved' : 
                       action.action === 'reject' ? 'rejected' : 'review';

      const { data: updatedWorkflow, error: updateError } = await supabase
        .from('content_workflows')
        .update({
          current_status: newStatus,
          reviewer_notes: action.notes,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId)
        .select()
        .single();

      if (updateError) {
        throw new ApiError('Failed to update workflow', 500, 'DATABASE_ERROR', updateError);
      }

      // Update content status based on review action
      let contentStatus: 'draft' | 'published' | 'review' = 'draft';
      if (action.action === 'approve') {
        contentStatus = 'published';
      } else if (action.action === 'reject' || action.action === 'request_changes') {
        contentStatus = 'draft';
      }

      await contentService.updateContent(workflow.content.id, workflow.content.website_id, {
        status: contentStatus
      });

      // Send notification to content author
      await this.notifyAuthor(updatedWorkflow, workflow.content, action);

      return updatedWorkflow;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to review content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get workflow history for content
   */
  async getContentWorkflowHistory(contentId: string): Promise<ContentWorkflow[]> {
    try {
      const { data: workflows, error } = await supabase
        .from('content_workflows')
        .select(`
          *,
          submitter:users!submitted_by(id, name, email),
          reviewer:users!assigned_reviewer(id, name, email)
        `)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new ApiError('Failed to fetch workflow history', 500, 'DATABASE_ERROR', error);
      }

      return workflows || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch workflow history', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get pending reviews for a reviewer
   */
  async getPendingReviews(
    reviewerId: string,
    websiteId?: string
  ): Promise<Array<ContentWorkflow & { content: any }>> {
    try {
      let query = supabase
        .from('content_workflows')
        .select(`
          *,
          content:content(*),
          submitter:users!submitted_by(id, name, email)
        `)
        .eq('current_status', 'review')
        .eq('assigned_reviewer', reviewerId);

      if (websiteId) {
        query = query.eq('content.website_id', websiteId);
      }

      const { data: workflows, error } = await query.order('submitted_at', { ascending: true });

      if (error) {
        throw new ApiError('Failed to fetch pending reviews', 500, 'DATABASE_ERROR', error);
      }

      return workflows || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch pending reviews', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get workflow statistics for a website
   */
  async getWorkflowStats(websiteId: string): Promise<{
    totalSubmissions: number;
    pendingReviews: number;
    approvedContent: number;
    rejectedContent: number;
    averageReviewTime: number;
  }> {
    try {
      const { data: workflows, error } = await supabase
        .from('content_workflows')
        .select('current_status, submitted_at, reviewed_at, content!inner(website_id)')
        .eq('content.website_id', websiteId);

      if (error) {
        throw new ApiError('Failed to fetch workflow stats', 500, 'DATABASE_ERROR', error);
      }

      if (!workflows || workflows.length === 0) {
        return {
          totalSubmissions: 0,
          pendingReviews: 0,
          approvedContent: 0,
          rejectedContent: 0,
          averageReviewTime: 0,
        };
      }

      const totalSubmissions = workflows.length;
      const pendingReviews = workflows.filter(w => w.current_status === 'review').length;
      const approvedContent = workflows.filter(w => w.current_status === 'approved').length;
      const rejectedContent = workflows.filter(w => w.current_status === 'rejected').length;

      // Calculate average review time for completed reviews
      const completedReviews = workflows.filter(w => 
        w.reviewed_at && w.submitted_at && w.current_status !== 'review'
      );

      let averageReviewTime = 0;
      if (completedReviews.length > 0) {
        const totalReviewTime = completedReviews.reduce((sum, workflow) => {
          const submitted = new Date(workflow.submitted_at).getTime();
          const reviewed = new Date(workflow.reviewed_at!).getTime();
          return sum + (reviewed - submitted);
        }, 0);

        averageReviewTime = Math.round(totalReviewTime / completedReviews.length / (1000 * 60 * 60)); // Convert to hours
      }

      return {
        totalSubmissions,
        pendingReviews,
        approvedContent,
        rejectedContent,
        averageReviewTime,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch workflow stats', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Private helper methods
   */
  private async checkAdminAccess(userId: string, websiteId: string): Promise<boolean> {
    const { data: access } = await supabase
      .from('website_users')
      .select('role')
      .eq('user_id', userId)
      .eq('website_id', websiteId)
      .single();

    return access?.role === 'admin';
  }

  private async notifyReviewer(workflow: ContentWorkflow, content: any): Promise<void> {
    try {
      if (!workflow.assigned_reviewer) return;

      const { data: reviewer } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', workflow.assigned_reviewer)
        .single();

      if (reviewer) {
        await emailService.sendEmail({
          to: reviewer.email,
          subject: 'Content Review Request',
          template: 'content-review-request',
          data: {
            reviewerName: reviewer.name,
            contentTitle: content.title,
            contentUrl: `${process.env.DASHBOARD_URL}/content/${content.id}`,
            workflowUrl: `${process.env.DASHBOARD_URL}/workflows/${workflow.id}`,
          },
        });
      }
    } catch (error) {
      console.error('Failed to notify reviewer:', error);
    }
  }

  private async notifyAuthor(workflow: ContentWorkflow, content: any, action: WorkflowAction): Promise<void> {
    try {
      const { data: author } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', workflow.submitted_by)
        .single();

      if (author) {
        const isApproved = action.action === 'approve';
        const subject = isApproved ? 'Content Approved' : 'Content Review Completed';
        const template = isApproved ? 'content-approved' : 'content-rejected';

        await emailService.sendEmail({
          to: author.email,
          subject,
          template,
          data: {
            authorName: author.name,
            contentTitle: content.title,
            reviewerNotes: workflow.reviewer_notes,
            contentUrl: `${process.env.DASHBOARD_URL}/content/${content.id}`,
            isApproved,
          },
        });
      }
    } catch (error) {
      console.error('Failed to notify author:', error);
    }
  }
}

export const contentWorkflowService = new ContentWorkflowService();
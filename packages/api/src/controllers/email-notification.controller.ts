import { Request, Response } from 'express';
import { emailNotificationOrchestratorService } from '../services/email-notification-orchestrator.service';
import { ApiResponse } from '../utils/response';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';
import { supabase } from '../config/supabase';

// Validation schemas
const sendNotificationSchema = Joi.object({
  trigger: Joi.string().required(),
  data: Joi.object().default({}),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  send_at: Joi.string().isoDate().optional(),
  expires_at: Joi.string().isoDate().optional(),
});

const updatePreferencesSchema = Joi.object({
  email_enabled: Joi.boolean().optional(),
  categories: Joi.object({
    system: Joi.boolean().optional(),
    content: Joi.boolean().optional(),
    team: Joi.boolean().optional(),
    analytics: Joi.boolean().optional(),
    security: Joi.boolean().optional(),
  }).optional(),
  frequency: Joi.object({
    immediate: Joi.boolean().optional(),
    daily_digest: Joi.boolean().optional(),
    weekly_summary: Joi.boolean().optional(),
  }).optional(),
  quiet_hours: Joi.object({
    enabled: Joi.boolean().optional(),
    start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    end_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: Joi.string().optional(),
  }).optional(),
});

const createTemplateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().valid('system', 'content', 'team', 'analytics', 'security').required(),
  trigger_event: Joi.string().max(255).required(),
  subject_template: Joi.string().max(500).required(),
  body_template: Joi.string().max(10000).required(),
  variables: Joi.array().items(Joi.string()).default([]),
  is_active: Joi.boolean().default(true),
  send_immediately: Joi.boolean().default(true),
  delay_minutes: Joi.number().integer().min(0).max(10080).default(0), // Max 1 week
  frequency: Joi.string().valid('once', 'daily', 'weekly', 'monthly').optional(),
  conditions: Joi.object().default({}),
});

export class EmailNotificationController {
  /**
   * Send notification to user
   */
  async sendNotification(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { websiteId } = req.query;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      // Check if user can send notifications to the target user
      if (userId !== currentUserId) {
        // Only allow if user is admin of the website
        if (websiteId) {
          const { data: membership, error } = await supabase
            .from('website_users')
            .select('role')
            .eq('website_id', websiteId)
            .eq('user_id', currentUserId)
            .single();

          if (error || !membership || membership.role !== 'admin') {
            return ApiResponse.forbidden(res, 'Insufficient permissions to send notifications');
          }
        } else {
          return ApiResponse.forbidden(res, 'Cannot send notifications to other users');
        }
      }

      const validatedData = await validateRequest(sendNotificationSchema, req.body);
      
      await emailNotificationOrchestratorService.sendNotification({
        user_id: userId,
        website_id: websiteId as string,
        trigger: validatedData.trigger,
        data: validatedData.data,
        priority: validatedData.priority,
        send_at: validatedData.send_at ? new Date(validatedData.send_at) : undefined,
        expires_at: validatedData.expires_at ? new Date(validatedData.expires_at) : undefined,
      });
      
      return ApiResponse.success(res, null, 'Notification sent successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { websiteId } = req.query;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const preferences = await emailNotificationOrchestratorService.getUserNotificationPreferences(
        userId,
        websiteId as string
      );
      
      return ApiResponse.success(res, preferences, 'Notification preferences retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { websiteId } = req.query;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      const validatedData = await validateRequest(updatePreferencesSchema, req.body);
      
      const preferences = await emailNotificationOrchestratorService.updateNotificationPreferences(
        userId,
        websiteId as string,
        validatedData
      );
      
      return ApiResponse.success(res, preferences, 'Notification preferences updated successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { websiteId, limit = 50, offset = 0, status, template_id } = req.query;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      let query = supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (websiteId) {
        query = query.eq('website_id', websiteId);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (template_id) {
        query = query.eq('template_id', template_id);
      }

      const { data: history, error } = await query;

      if (error) {
        throw error;
      }
      
      return ApiResponse.success(res, history, 'Notification history retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStatistics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { websiteId, days = 30 } = req.query;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      // Check if user can view website statistics
      if (websiteId) {
        const { data: membership, error } = await supabase
          .from('website_users')
          .select('role')
          .eq('website_id', websiteId)
          .eq('user_id', userId)
          .single();

        if (error || !membership) {
          return ApiResponse.forbidden(res, 'Access denied to website statistics');
        }
      }

      const { data: stats, error } = await supabase
        .rpc('get_notification_statistics', {
          user_id_param: websiteId ? null : userId,
          website_id_param: websiteId || null,
          days_param: Number(days),
        });

      if (error) {
        throw error;
      }
      
      return ApiResponse.success(res, stats, 'Notification statistics retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Get notification templates
   */
  async getNotificationTemplates(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { websiteId } = req.query;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      let query = supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (websiteId) {
        // Get both global and website-specific templates
        query = query.or(`website_id.is.null,website_id.eq.${websiteId}`);
      } else {
        // Only global templates
        query = query.is('website_id', null);
      }

      const { data: templates, error } = await query;

      if (error) {
        throw error;
      }
      
      return ApiResponse.success(res, templates, 'Notification templates retrieved successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Create notification template
   */
  async createNotificationTemplate(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { websiteId } = req.query;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      // Check permissions for website templates
      if (websiteId) {
        const { data: membership, error } = await supabase
          .from('website_users')
          .select('role')
          .eq('website_id', websiteId)
          .eq('user_id', userId)
          .single();

        if (error || !membership || !['admin', 'editor'].includes(membership.role)) {
          return ApiResponse.forbidden(res, 'Insufficient permissions to create templates');
        }
      }

      const validatedData = await validateRequest(createTemplateSchema, req.body);
      
      const { data: template, error } = await supabase
        .from('notification_templates')
        .insert({
          ...validatedData,
          website_id: websiteId || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      return ApiResponse.success(res, template, 'Notification template created successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Update notification template
   */
  async updateNotificationTemplate(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { templateId } = req.params;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      // Get template to check permissions
      const { data: existingTemplate, error: fetchError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError || !existingTemplate) {
        return ApiResponse.notFound(res, 'Template not found');
      }

      // Check permissions
      if (existingTemplate.website_id) {
        const { data: membership, error } = await supabase
          .from('website_users')
          .select('role')
          .eq('website_id', existingTemplate.website_id)
          .eq('user_id', userId)
          .single();

        if (error || !membership || !['admin', 'editor'].includes(membership.role)) {
          return ApiResponse.forbidden(res, 'Insufficient permissions to update template');
        }
      } else {
        // Global templates can only be updated by system admins
        return ApiResponse.forbidden(res, 'Cannot update global templates');
      }

      const validatedData = await validateRequest(createTemplateSchema, req.body);
      
      const { data: template, error } = await supabase
        .from('notification_templates')
        .update(validatedData)
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      return ApiResponse.success(res, template, 'Notification template updated successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Delete notification template
   */
  async deleteNotificationTemplate(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { templateId } = req.params;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      // Get template to check permissions
      const { data: existingTemplate, error: fetchError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError || !existingTemplate) {
        return ApiResponse.notFound(res, 'Template not found');
      }

      // Check permissions
      if (existingTemplate.website_id) {
        const { data: membership, error } = await supabase
          .from('website_users')
          .select('role')
          .eq('website_id', existingTemplate.website_id)
          .eq('user_id', userId)
          .single();

        if (error || !membership || membership.role !== 'admin') {
          return ApiResponse.forbidden(res, 'Insufficient permissions to delete template');
        }
      } else {
        // Global templates cannot be deleted
        return ApiResponse.forbidden(res, 'Cannot delete global templates');
      }

      const { error } = await supabase
        .from('notification_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        throw error;
      }
      
      return ApiResponse.success(res, null, 'Notification template deleted successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Send daily digest to user
   */
  async sendDailyDigest(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      // Only allow users to trigger their own digest or system admin
      if (userId !== currentUserId) {
        return ApiResponse.forbidden(res, 'Cannot send digest for other users');
      }

      await emailNotificationOrchestratorService.sendDailyDigest(userId);
      
      return ApiResponse.success(res, null, 'Daily digest sent successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Send weekly digest to user
   */
  async sendWeeklyDigest(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      // Only allow users to trigger their own digest or system admin
      if (userId !== currentUserId) {
        return ApiResponse.forbidden(res, 'Cannot send digest for other users');
      }

      await emailNotificationOrchestratorService.sendWeeklyDigest(userId);
      
      return ApiResponse.success(res, null, 'Weekly digest sent successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }

  /**
   * Test notification template
   */
  async testNotificationTemplate(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { templateId } = req.params;
      const { test_data = {} } = req.body;
      
      if (!userId) {
        return ApiResponse.unauthorized(res, 'User not authenticated');
      }

      // Get template
      const { data: template, error: fetchError } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError || !template) {
        return ApiResponse.notFound(res, 'Template not found');
      }

      // Check permissions
      if (template.website_id) {
        const { data: membership, error } = await supabase
          .from('website_users')
          .select('role')
          .eq('website_id', template.website_id)
          .eq('user_id', userId)
          .single();

        if (error || !membership) {
          return ApiResponse.forbidden(res, 'Access denied to template');
        }
      }

      // Send test notification
      await emailNotificationOrchestratorService.sendNotification({
        user_id: userId,
        website_id: template.website_id,
        trigger: template.trigger_event,
        data: {
          ...test_data,
          user_name: req.user?.name || 'Test User',
          test_mode: true,
        },
        priority: 'normal',
      });
      
      return ApiResponse.success(res, null, 'Test notification sent successfully');
    } catch (error) {
      return ApiResponse.error(res, error);
    }
  }
}

export const emailNotificationController = new EmailNotificationController();
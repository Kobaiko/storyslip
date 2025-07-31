import request from 'supertest';
import { app } from '../server';
import { supabase } from '../config/supabase';
import { emailNotificationOrchestratorService } from '../services/email-notification-orchestrator.service';
import { emailService } from '../services/email.service';

// Mock external services
jest.mock('../services/email.service');
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEmailService = emailService as jest.Mocked<typeof emailService>;

describe('Email Notification System', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockWebsite = {
    id: 'website-123',
    name: 'Test Website',
  };

  const mockAuthToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    (global as any).mockUser = mockUser;
    
    // Mock Supabase responses
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as any);
  });

  describe('Notification Preferences', () => {
    it('should get user notification preferences', async () => {
      const mockPreferences = {
        user_id: mockUser.id,
        email_enabled: true,
        categories: {
          system: true,
          content: true,
          team: true,
          analytics: true,
          security: true,
        },
        frequency: {
          immediate: true,
          daily_digest: false,
          weekly_summary: true,
        },
        quiet_hours: {
          enabled: false,
          start_time: '22:00',
          end_time: '08:00',
          timezone: 'UTC',
        },
      };

      mockSupabase.from().single.mockResolvedValue({
        data: mockPreferences,
        error: null,
      });

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPreferences);
    });

    it('should update user notification preferences', async () => {
      const updates = {
        email_enabled: false,
        categories: {
          system: true,
          content: false,
        },
      };

      const updatedPreferences = {
        ...updates,
        user_id: mockUser.id,
      };

      mockSupabase.from().single.mockResolvedValue({
        data: updatedPreferences,
        error: null,
      });

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedPreferences);
    });

    it('should create default preferences for new user', async () => {
      // First call returns no existing preferences
      mockSupabase.from().single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        .mockResolvedValueOnce({
          data: {
            user_id: mockUser.id,
            email_enabled: true,
            categories: {
              system: true,
              content: true,
              team: true,
              analytics: true,
              security: true,
            },
          },
          error: null,
        });

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email_enabled).toBe(true);
    });
  });

  describe('Send Notifications', () => {
    it('should send notification to user', async () => {
      const notificationData = {
        trigger: 'content.published',
        data: {
          content_title: 'Test Article',
          website_name: 'Test Website',
        },
        priority: 'normal',
      };

      // Mock user lookup
      mockSupabase.from().single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      // Mock email service
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/notifications/users/${mockUser.id}/send`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification sent successfully');
    });

    it('should prevent sending notifications to other users without permission', async () => {
      const otherUserId = 'other-user-123';
      
      const response = await request(app)
        .post(`/api/notifications/users/${otherUserId}/send`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          trigger: 'test.notification',
          data: {},
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot send notifications to other users');
    });

    it('should allow website admin to send notifications to team members', async () => {
      const teamMemberId = 'team-member-123';
      
      // Mock website membership check
      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      // Mock user lookup
      mockSupabase.from().single.mockResolvedValueOnce({
        data: { id: teamMemberId, email: 'member@example.com', name: 'Team Member' },
        error: null,
      });

      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/notifications/users/${teamMemberId}/send?websiteId=${mockWebsite.id}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          trigger: 'team.invitation_sent',
          data: {
            website_name: 'Test Website',
            role: 'editor',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Notification History', () => {
    it('should get user notification history', async () => {
      const mockHistory = [
        {
          id: 'notification-1',
          user_id: mockUser.id,
          template_id: 'content_published',
          trigger_event: 'content.published',
          status: 'sent',
          sent_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'notification-2',
          user_id: mockUser.id,
          template_id: 'team_invitation',
          trigger_event: 'team.invitation_sent',
          status: 'opened',
          sent_at: '2024-01-01T09:00:00Z',
        },
      ];

      mockSupabase.from().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockHistory,
          error: null,
        }),
      } as any);

      const response = await request(app)
        .get('/api/notifications/history')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHistory);
    });

    it('should filter notification history by status', async () => {
      const mockHistory = [
        {
          id: 'notification-1',
          status: 'opened',
        },
      ];

      mockSupabase.from().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockHistory,
          error: null,
        }),
      } as any);

      const response = await request(app)
        .get('/api/notifications/history?status=opened')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockHistory);
    });
  });

  describe('Notification Statistics', () => {
    it('should get notification statistics', async () => {
      const mockStats = {
        period_days: 30,
        total_sent: 25,
        success_rate: 96.0,
        open_rate: 68.0,
        click_rate: 24.0,
        by_template: {
          content_published: { sent: 15, opened: 10, clicked: 3 },
          team_invitation: { sent: 10, opened: 7, clicked: 3 },
        },
        daily_breakdown: [
          { date: '2024-01-01', sent: 5, opened: 3, clicked: 1 },
          { date: '2024-01-02', sent: 8, opened: 5, clicked: 2 },
        ],
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const response = await request(app)
        .get('/api/notifications/statistics?days=30')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should get website-specific statistics for admin', async () => {
      // Mock website membership check
      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const mockStats = {
        period_days: 7,
        total_sent: 10,
        success_rate: 100.0,
      };

      mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const response = await request(app)
        .get(`/api/notifications/statistics?websiteId=${mockWebsite.id}&days=7`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });
  });

  describe('Notification Templates', () => {
    it('should get notification templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Welcome Email',
          category: 'system',
          trigger_event: 'user.registered',
          is_active: true,
        },
        {
          id: 'template-2',
          name: 'Content Published',
          category: 'content',
          trigger_event: 'content.published',
          is_active: true,
        },
      ];

      mockSupabase.from().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockTemplates,
          error: null,
        }),
      } as any);

      const response = await request(app)
        .get('/api/notifications/templates')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTemplates);
    });

    it('should create custom notification template', async () => {
      const templateData = {
        name: 'Custom Welcome',
        description: 'Custom welcome email for website',
        category: 'system',
        trigger_event: 'user.website_registered',
        subject_template: 'Welcome to {{website_name}}!',
        body_template: '<h1>Welcome {{user_name}}!</h1>',
        variables: ['user_name', 'website_name'],
      };

      // Mock website membership check
      mockSupabase.from().single.mockResolvedValue({
        data: { role: 'admin' },
        error: null,
      });

      const createdTemplate = {
        id: 'template-123',
        ...templateData,
        website_id: mockWebsite.id,
        created_by: mockUser.id,
      };

      mockSupabase.from().single.mockResolvedValue({
        data: createdTemplate,
        error: null,
      });

      const response = await request(app)
        .post(`/api/notifications/templates?websiteId=${mockWebsite.id}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(templateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdTemplate);
    });

    it('should update notification template', async () => {
      const templateId = 'template-123';
      const updates = {
        name: 'Updated Template Name',
        subject_template: 'Updated subject',
      };

      // Mock existing template
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            id: templateId,
            website_id: mockWebsite.id,
            name: 'Original Name',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: templateId, ...updates },
          error: null,
        });

      const response = await request(app)
        .put(`/api/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
    });

    it('should delete notification template', async () => {
      const templateId = 'template-123';

      // Mock existing template and permissions
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            id: templateId,
            website_id: mockWebsite.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { role: 'admin' },
          error: null,
        });

      mockSupabase.from().delete.mockResolvedValue({
        error: null,
      });

      const response = await request(app)
        .delete(`/api/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification template deleted successfully');
    });

    it('should prevent deletion of global templates', async () => {
      const templateId = 'global-template-123';

      // Mock global template
      mockSupabase.from().single.mockResolvedValue({
        data: {
          id: templateId,
          website_id: null, // Global template
        },
        error: null,
      });

      const response = await request(app)
        .delete(`/api/notifications/templates/${templateId}`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot delete global templates');
    });
  });

  describe('Digest Management', () => {
    it('should send daily digest', async () => {
      jest.spyOn(emailNotificationOrchestratorService, 'sendDailyDigest')
        .mockResolvedValue();

      const response = await request(app)
        .post(`/api/notifications/users/${mockUser.id}/digest/daily`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Daily digest sent successfully');
      expect(emailNotificationOrchestratorService.sendDailyDigest)
        .toHaveBeenCalledWith(mockUser.id);
    });

    it('should send weekly digest', async () => {
      jest.spyOn(emailNotificationOrchestratorService, 'sendWeeklyDigest')
        .mockResolvedValue();

      const response = await request(app)
        .post(`/api/notifications/users/${mockUser.id}/digest/weekly`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Weekly digest sent successfully');
      expect(emailNotificationOrchestratorService.sendWeeklyDigest)
        .toHaveBeenCalledWith(mockUser.id);
    });

    it('should prevent sending digest for other users', async () => {
      const otherUserId = 'other-user-123';

      const response = await request(app)
        .post(`/api/notifications/users/${otherUserId}/digest/daily`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot send digest for other users');
    });
  });

  describe('Template Testing', () => {
    it('should send test notification', async () => {
      const templateId = 'template-123';
      const testData = {
        test_data: {
          content_title: 'Test Article',
          website_name: 'Test Website',
        },
      };

      // Mock template lookup
      mockSupabase.from().single
        .mockResolvedValueOnce({
          data: {
            id: templateId,
            trigger_event: 'content.published',
            website_id: mockWebsite.id,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { role: 'editor' },
          error: null,
        });

      jest.spyOn(emailNotificationOrchestratorService, 'sendNotification')
        .mockResolvedValue();

      const response = await request(app)
        .post(`/api/notifications/templates/${templateId}/test`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Test notification sent successfully');
      expect(emailNotificationOrchestratorService.sendNotification)
        .toHaveBeenCalledWith(expect.objectContaining({
          user_id: mockUser.id,
          trigger: 'content.published',
          data: expect.objectContaining({
            ...testData.test_data,
            test_mode: true,
          }),
        }));
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on notification sending', async () => {
      // Mock successful responses for first few requests
      mockSupabase.from().single.mockResolvedValue({
        data: mockUser,
        error: null,
      });
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      // Send multiple notifications quickly
      const promises = Array.from({ length: 12 }, () =>
        request(app)
          .post(`/api/notifications/users/${mockUser.id}/send`)
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send({
            trigger: 'test.notification',
            data: {},
          })
      );

      const responses = await Promise.all(promises);
      
      // First 10 should succeed, rest should be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBeLessThanOrEqual(10);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('error');
    });

    it('should handle email service failures', async () => {
      mockSupabase.from().single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      mockEmailService.sendEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );

      const response = await request(app)
        .post(`/api/notifications/users/${mockUser.id}/send`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          trigger: 'test.notification',
          data: {},
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should validate notification data', async () => {
      const response = await request(app)
        .post(`/api/notifications/users/${mockUser.id}/send`)
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          // Missing required 'trigger' field
          data: {},
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });
});
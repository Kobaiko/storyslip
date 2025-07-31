import request from 'supertest';
import { app } from '../server';
import { supabase } from '../config/supabase';
import { teamManagementEnhancedService } from '../services/team-management-enhanced.service';
import { teamOnboardingService } from '../services/team-onboarding.service';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../services/email.service');
jest.mock('../services/audit.service');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Enhanced Team Management', () => {
  let authToken: string;
  let websiteId: string;
  let userId: string;
  let teamMemberId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = 'mock-auth-token';
    websiteId = 'website-123';
    userId = 'user-123';
    teamMemberId = 'member-456';

    // Mock authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  describe('Team Analytics', () => {
    describe('GET /api/websites/:websiteId/team/analytics', () => {
      it('should return comprehensive team analytics', async () => {
        const mockMembers = [
          {
            role: 'admin',
            user: { id: userId, name: 'Admin User', email: 'admin@test.com', created_at: '2024-01-01' },
          },
          {
            role: 'editor',
            user: { id: teamMemberId, name: 'Editor User', email: 'editor@test.com', created_at: '2024-01-02' },
          },
        ];

        const mockInvitations = [
          { id: 'inv-1', email: 'pending@test.com', status: 'pending' },
        ];

        const mockActivity = [
          {
            id: 'activity-1',
            user_id: userId,
            action: 'content_created',
            resource_type: 'content',
            created_at: '2024-01-15T10:00:00Z',
            user: { name: 'Admin User', email: 'admin@test.com', avatar_url: null },
          },
        ];

        mockSupabase.from.mockImplementation((table: string) => {
          const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
          };

          if (table === 'website_users') {
            mockQuery.select.mockResolvedValue({ data: mockMembers, error: null });
          } else if (table === 'invitations') {
            mockQuery.select.mockResolvedValue({ data: mockInvitations, error: null });
          } else if (table === 'audit_logs') {
            mockQuery.select.mockResolvedValue({ data: mockActivity, error: null });
          }

          return mockQuery;
        });

        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/analytics`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('total_members', 2);
        expect(response.body.data).toHaveProperty('pending_invitations', 1);
        expect(response.body.data).toHaveProperty('role_distribution');
        expect(response.body.data).toHaveProperty('recent_activity');
        expect(response.body.data).toHaveProperty('member_growth');
      });

      it('should handle database errors gracefully', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }));

        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/analytics`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('DATABASE_ERROR');
      });
    });

    describe('GET /api/websites/:websiteId/team/health-score', () => {
      it('should return team health score', async () => {
        const mockHealthScore = {
          total_members: 5,
          active_members: 4,
          recent_activity: 25,
          collaboration_score: 85,
          health_score: 85,
          health_status: 'excellent',
        };

        mockSupabase.rpc.mockResolvedValue({ data: mockHealthScore, error: null });

        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/health-score`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockHealthScore);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_team_health_score', {
          website_id: websiteId,
        });
      });
    });
  });

  describe('Bulk Invitations', () => {
    describe('POST /api/websites/:websiteId/team/bulk-invite', () => {
      it('should successfully process bulk invitations', async () => {
        const inviteRequest = {
          emails: ['user1@test.com', 'user2@test.com', 'user3@test.com'],
          role: 'editor',
          message: 'Welcome to our team!',
        };

        // Mock existing members check
        mockSupabase.from.mockImplementation((table: string) => {
          const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };

          if (table === 'website_users') {
            mockQuery.select.mockResolvedValue({ data: [], error: null });
          } else if (table === 'invitations') {
            mockQuery.select.mockResolvedValue({ data: [], error: null });
          }

          return mockQuery;
        });

        // Mock invitation service
        const mockInvitationService = require('../services/invitation.service');
        mockInvitationService.invitationService.createInvitation = jest.fn()
          .mockResolvedValueOnce({ id: 'inv-1' })
          .mockResolvedValueOnce({ id: 'inv-2' })
          .mockResolvedValueOnce({ id: 'inv-3' });

        const response = await request(app)
          .post(`/api/websites/${websiteId}/team/bulk-invite`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(inviteRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.successful).toHaveLength(3);
        expect(response.body.data.failed).toHaveLength(0);
        expect(response.body.data.duplicates).toHaveLength(0);
      });

      it('should handle duplicate emails', async () => {
        const inviteRequest = {
          emails: ['existing@test.com', 'new@test.com'],
          role: 'editor',
        };

        // Mock existing members
        mockSupabase.from.mockImplementation((table: string) => {
          const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
          };

          if (table === 'website_users') {
            mockQuery.select.mockResolvedValue({
              data: [{ user: { email: 'existing@test.com' } }],
              error: null,
            });
          } else if (table === 'invitations') {
            mockQuery.select.mockResolvedValue({ data: [], error: null });
          }

          return mockQuery;
        });

        const mockInvitationService = require('../services/invitation.service');
        mockInvitationService.invitationService.createInvitation = jest.fn()
          .mockResolvedValue({ id: 'inv-1' });

        const response = await request(app)
          .post(`/api/websites/${websiteId}/team/bulk-invite`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(inviteRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.successful).toHaveLength(1);
        expect(response.body.data.duplicates).toContain('existing@test.com');
      });

      it('should validate email format', async () => {
        const inviteRequest = {
          emails: ['invalid-email', 'valid@test.com'],
          role: 'editor',
        };

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }));

        const mockInvitationService = require('../services/invitation.service');
        mockInvitationService.invitationService.createInvitation = jest.fn()
          .mockResolvedValue({ id: 'inv-1' });

        const response = await request(app)
          .post(`/api/websites/${websiteId}/team/bulk-invite`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(inviteRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.successful).toHaveLength(1);
        expect(response.body.data.failed).toHaveLength(1);
        expect(response.body.data.failed[0].error).toBe('Invalid email format');
      });

      it('should enforce rate limiting', async () => {
        const inviteRequest = {
          emails: ['test@test.com'],
          role: 'editor',
        };

        // Make multiple requests to trigger rate limit
        for (let i = 0; i < 6; i++) {
          await request(app)
            .post(`/api/websites/${websiteId}/team/bulk-invite`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(inviteRequest);
        }

        const response = await request(app)
          .post(`/api/websites/${websiteId}/team/bulk-invite`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(inviteRequest)
          .expect(429);

        expect(response.body.error).toContain('rate limit');
      });
    });
  });

  describe('Ownership Transfer', () => {
    describe('POST /api/websites/:websiteId/team/transfer-ownership', () => {
      it('should successfully transfer ownership', async () => {
        const transferRequest = {
          new_owner_id: teamMemberId,
        };

        // Mock current owner verification
        mockSupabase.from.mockImplementation((table: string) => {
          const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
          };

          if (table === 'website_users') {
            mockQuery.single
              .mockResolvedValueOnce({ data: { role: 'admin' }, error: null }) // Current owner
              .mockResolvedValueOnce({ data: { role: 'editor' }, error: null }); // New owner
          }

          return mockQuery;
        });

        // Mock RPC call
        mockSupabase.rpc.mockResolvedValue({ error: null });

        const response = await request(app)
          .post(`/api/websites/${websiteId}/team/transfer-ownership`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(transferRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('transfer_website_ownership', {
          website_id: websiteId,
          current_owner_id: userId,
          new_owner_id: teamMemberId,
        });
      });

      it('should reject transfer from non-owner', async () => {
        const transferRequest = {
          new_owner_id: teamMemberId,
        };

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { role: 'editor' }, error: null }),
        }));

        const response = await request(app)
          .post(`/api/websites/${websiteId}/team/transfer-ownership`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(transferRequest)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('should reject transfer to non-member', async () => {
        const transferRequest = {
          new_owner_id: 'non-member-id',
        };

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn()
            .mockResolvedValueOnce({ data: { role: 'admin' }, error: null }) // Current owner
            .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }), // New owner not found
        }));

        const response = await request(app)
          .post(`/api/websites/${websiteId}/team/transfer-ownership`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(transferRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_REQUEST');
      });

      it('should enforce rate limiting for ownership transfer', async () => {
        const transferRequest = {
          new_owner_id: teamMemberId,
        };

        // Mock successful verification
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn()
            .mockResolvedValue({ data: { role: 'admin' }, error: null }),
        }));

        mockSupabase.rpc.mockResolvedValue({ error: null });

        // First request should succeed
        await request(app)
          .post(`/api/websites/${websiteId}/team/transfer-ownership`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(transferRequest)
          .expect(200);

        // Second request within the hour should be rate limited
        const response = await request(app)
          .post(`/api/websites/${websiteId}/team/transfer-ownership`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(transferRequest)
          .expect(429);

        expect(response.body.error).toContain('rate limit');
      });
    });
  });

  describe('Member Permissions', () => {
    describe('GET /api/websites/:websiteId/team/members/:userId/permissions', () => {
      it('should return member permissions', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { role: 'editor' }, error: null }),
        }));

        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/members/${teamMemberId}/permissions`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('role', 'editor');
        expect(response.body.data).toHaveProperty('permissions');
        expect(response.body.data).toHaveProperty('can_invite', true);
        expect(response.body.data).toHaveProperty('can_manage_content', true);
        expect(response.body.data).toHaveProperty('can_manage_settings', false);
      });

      it('should return 404 for non-member', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }));

        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/members/non-member/permissions`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });
  });

  describe('Collaboration Statistics', () => {
    describe('GET /api/websites/:websiteId/team/collaboration-stats', () => {
      it('should return collaboration statistics', async () => {
        const mockActivities = [
          { user_id: userId, action: 'content_created', user: { name: 'User 1' } },
          { user_id: userId, action: 'content_updated', user: { name: 'User 1' } },
          { user_id: teamMemberId, action: 'comment_created', user: { name: 'User 2' } },
          { user_id: teamMemberId, action: 'file_uploaded', user: { name: 'User 2' } },
        ];

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: mockActivities, error: null }),
        }));

        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/collaboration-stats?days=30`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('content_collaborations', 2);
        expect(response.body.data).toHaveProperty('comments_exchanged', 1);
        expect(response.body.data).toHaveProperty('files_shared', 1);
        expect(response.body.data).toHaveProperty('most_active_collaborators');
        expect(response.body.data.most_active_collaborators).toHaveLength(2);
      });
    });
  });

  describe('Team Onboarding', () => {
    describe('GET /api/websites/:websiteId/team/onboarding', () => {
      it('should return member onboarding status', async () => {
        const mockOnboarding = {
          id: 'onboarding-1',
          website_id: websiteId,
          user_id: userId,
          template_id: 'admin_onboarding',
          checklist_items: [
            { id: 'profile_setup', title: 'Complete Profile', completed: false },
          ],
          completed_items: [],
          completion_percentage: 0,
          started_at: '2024-01-01T00:00:00Z',
        };

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockOnboarding, error: null }),
        }));

        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/onboarding`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockOnboarding);
      });

      it('should return null for non-existent onboarding', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        }));

        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/onboarding`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeNull();
      });
    });

    describe('PUT /api/websites/:websiteId/team/onboarding', () => {
      it('should update onboarding progress', async () => {
        const updateRequest = {
          completed_items: ['profile_setup', 'first_content'],
        };

        const mockUpdatedOnboarding = {
          id: 'onboarding-1',
          website_id: websiteId,
          user_id: userId,
          completed_items: ['profile_setup', 'first_content'],
          completion_percentage: 50,
        };

        mockSupabase.from.mockImplementation(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUpdatedOnboarding, error: null }),
        }));

        const response = await request(app)
          .put(`/api/websites/${websiteId}/team/onboarding`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.completion_percentage).toBe(50);
        expect(response.body.data.completed_items).toEqual(['profile_setup', 'first_content']);
      });
    });
  });

  describe('Team Notifications', () => {
    describe('GET /api/team/notifications', () => {
      it('should return team notifications', async () => {
        const mockNotifications = [
          {
            id: 'notif-1',
            type: 'welcome',
            title: 'Welcome to the team!',
            message: 'Complete your onboarding...',
            read_at: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ];

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: mockNotifications, error: null }),
        }));

        const response = await request(app)
          .get('/api/team/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockNotifications);
      });

      it('should filter unread notifications', async () => {
        const mockUnreadNotifications = [
          {
            id: 'notif-1',
            read_at: null,
          },
        ];

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          is: jest.fn().mockResolvedValue({ data: mockUnreadNotifications, error: null }),
        }));

        const response = await request(app)
          .get('/api/team/notifications?unread_only=true')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockUnreadNotifications);
      });
    });

    describe('PUT /api/team/notifications/:notificationId/read', () => {
      it('should mark notification as read', async () => {
        const notificationId = 'notif-1';
        const mockUpdatedNotification = {
          id: notificationId,
          read_at: '2024-01-01T12:00:00Z',
        };

        mockSupabase.from.mockImplementation(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockUpdatedNotification, error: null }),
        }));

        const response = await request(app)
          .put(`/api/team/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.read_at).toBeTruthy();
      });
    });
  });
});

describe('Team Onboarding Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOnboardingTemplate', () => {
    it('should return template for valid role', async () => {
      const template = await teamOnboardingService.getOnboardingTemplate('admin');
      
      expect(template).toBeTruthy();
      expect(template?.id).toBe('admin_onboarding');
      expect(template?.role).toBe('admin');
      expect(template?.steps).toHaveLength(6);
    });

    it('should return null for invalid role', async () => {
      const template = await teamOnboardingService.getOnboardingTemplate('invalid');
      
      expect(template).toBeNull();
    });
  });

  describe('createMemberOnboarding', () => {
    it('should create onboarding for new member', async () => {
      const mockOnboardingData = {
        id: 'onboarding-1',
        website_id: websiteId,
        user_id: userId,
        template_id: 'admin_onboarding',
        checklist_items: [],
        completed_items: [],
        completion_percentage: 0,
        started_at: '2024-01-01T00:00:00Z',
        completed_at: null,
      };

      mockSupabase.from.mockImplementation(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOnboardingData, error: null }),
      }));

      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await teamOnboardingService.createMemberOnboarding(
        websiteId,
        userId,
        'admin'
      );

      expect(result).toBeTruthy();
      expect(result.template_id).toBe('admin_onboarding');
      expect(result.completion_percentage).toBe(0);
    });

    it('should throw error for invalid role', async () => {
      await expect(
        teamOnboardingService.createMemberOnboarding(websiteId, userId, 'invalid')
      ).rejects.toThrow('No onboarding template found for role');
    });
  });

  describe('updateOnboardingProgress', () => {
    it('should update progress and calculate percentage', async () => {
      const mockUpdatedData = {
        id: 'onboarding-1',
        website_id: websiteId,
        user_id: userId,
        template_id: 'admin_onboarding',
        checklist_items: [
          { id: 'step1', title: 'Step 1' },
          { id: 'step2', title: 'Step 2' },
        ],
        completed_items: ['step1'],
        completion_percentage: 50,
        started_at: '2024-01-01T00:00:00Z',
        completed_at: null,
      };

      mockSupabase.from.mockImplementation(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedData, error: null }),
      }));

      const result = await teamOnboardingService.updateOnboardingProgress(
        websiteId,
        userId,
        ['step1']
      );

      expect(result.completion_percentage).toBe(50);
      expect(result.completed_items).toEqual(['step1']);
    });
  });

  describe('getTeamOnboardingOverview', () => {
    it('should return comprehensive onboarding overview', async () => {
      const mockMembers = [
        {
          user_id: userId,
          role: 'admin',
          joined_at: '2024-01-01T00:00:00Z',
          user: { name: 'Admin User', email: 'admin@test.com' },
          onboarding: [{
            completion_percentage: 100,
            started_at: '2024-01-01T00:00:00Z',
            completed_at: '2024-01-01T01:00:00Z',
            checklist_items: [],
            completed_items: [],
          }],
        },
        {
          user_id: teamMemberId,
          role: 'editor',
          joined_at: '2024-01-02T00:00:00Z',
          user: { name: 'Editor User', email: 'editor@test.com' },
          onboarding: [{
            completion_percentage: 50,
            started_at: '2024-01-02T00:00:00Z',
            completed_at: null,
            checklist_items: [],
            completed_items: [],
          }],
        },
      ];

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMembers, error: null }),
      }));

      const result = await teamOnboardingService.getTeamOnboardingOverview(websiteId);

      expect(result.total_members).toBe(2);
      expect(result.completed_onboarding).toBe(1);
      expect(result.in_progress).toBe(1);
      expect(result.not_started).toBe(0);
      expect(result.completion_rate).toBe(50);
      expect(result.members).toHaveLength(2);
    });
  });
});
import request from 'supertest';
import app from '../index';

// Mock all external dependencies
jest.mock('../config/supabase');
jest.mock('../services/database');
jest.mock('../services/team.service');
jest.mock('../services/invitation.service');
jest.mock('../services/audit.service');
jest.mock('../services/email.service');

describe('Team Management Integration', () => {
  const mockUser = {
    userId: 'user-123',
    email: 'owner@example.com',
    role: 'owner'
  };

  const mockWebsiteId = 'website-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    jest.spyOn(require('../middleware/auth'), 'authenticateToken').mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });

    // Mock database access check
    const mockDatabaseService = require('../services/database');
    mockDatabaseService.DatabaseService = {
      checkWebsiteAccess: jest.fn().mockResolvedValue(true)
    };

    // Mock team service
    const mockTeamService = require('../services/team.service');
    mockTeamService.teamService = {
      hasPermission: jest.fn().mockResolvedValue(true),
      getTeamMembers: jest.fn().mockResolvedValue([
        {
          user_id: 'member-1',
          website_id: mockWebsiteId,
          role: 'editor',
          added_by: mockUser.userId,
          added_at: '2024-01-01T00:00:00Z',
          user: {
            id: 'member-1',
            name: 'Team Member',
            email: 'member@example.com'
          },
          added_by_user: {
            id: mockUser.userId,
            name: 'Owner',
            email: mockUser.email
          }
        }
      ]),
      getTeamStats: jest.fn().mockResolvedValue({
        totalMembers: 2,
        roleDistribution: { owner: 1, editor: 1 },
        recentAdditions: 1
      }),
      updateTeamMemberRole: jest.fn().mockResolvedValue({
        user_id: 'member-1',
        role: 'admin'
      }),
      removeTeamMember: jest.fn().mockResolvedValue(undefined),
      getAuditLog: jest.fn().mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0
      })
    };

    // Mock invitation service
    const mockInvitationService = require('../services/invitation.service');
    mockInvitationService.invitationService = {
      createInvitation: jest.fn().mockResolvedValue({
        id: 'invitation-123',
        email: 'invited@example.com',
        role: 'editor',
        website_id: mockWebsiteId,
        invited_by: mockUser.userId,
        token: 'a'.repeat(64),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: '2024-01-01T00:00:00Z'
      }),
      getInvitationsByWebsite: jest.fn().mockResolvedValue([]),
      cancelInvitation: jest.fn().mockResolvedValue(undefined),
      resendInvitation: jest.fn().mockResolvedValue({
        id: 'invitation-123',
        token: 'b'.repeat(64)
      }),
      acceptInvitation: jest.fn().mockResolvedValue({
        user: {
          id: 'new-user-123',
          email: 'invited@example.com',
          name: 'New User'
        },
        website: {
          id: mockWebsiteId,
          name: 'Test Website'
        }
      })
    };
  });

  describe('Team Management Endpoints', () => {
    it('should get team members', async () => {
      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/team`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toHaveLength(1);
    });

    it('should get team statistics', async () => {
      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/team/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalMembers', 2);
      expect(response.body.data).toHaveProperty('roleDistribution');
    });

    it('should update team member role', async () => {
      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/team/member-1/role`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.member.role).toBe('admin');
    });

    it('should remove team member', async () => {
      await request(app)
        .delete(`/api/websites/${mockWebsiteId}/team/member-1`)
        .expect(204);
    });
  });

  describe('Invitation Management Endpoints', () => {
    it('should send invitation', async () => {
      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send({
          email: 'invited@example.com',
          role: 'editor'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitation).toHaveProperty('id');
      expect(response.body.data.invitation.email).toBe('invited@example.com');
    });

    it('should get invitations', async () => {
      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/invitations`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toBeDefined();
    });

    it('should cancel invitation', async () => {
      await request(app)
        .delete(`/api/websites/${mockWebsiteId}/invitations/invitation-123`)
        .expect(204);
    });

    it('should resend invitation', async () => {
      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations/invitation-123/resend`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitation).toHaveProperty('token');
    });
  });

  describe('Public Invitation Endpoints', () => {
    it('should accept invitation', async () => {
      const response = await request(app)
        .post('/api/invitations/accept')
        .send({
          token: 'a'.repeat(64),
          name: 'New User',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.website).toHaveProperty('id');
    });
  });

  describe('Validation', () => {
    it('should validate invitation email format', async () => {
      await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send({
          email: 'invalid-email',
          role: 'editor'
        })
        .expect(400);
    });

    it('should validate invitation role', async () => {
      await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send({
          email: 'test@example.com',
          role: 'invalid-role'
        })
        .expect(400);
    });

    it('should validate team member role update', async () => {
      await request(app)
        .put(`/api/websites/${mockWebsiteId}/team/member-1/role`)
        .send({ role: 'invalid-role' })
        .expect(400);
    });
  });
});
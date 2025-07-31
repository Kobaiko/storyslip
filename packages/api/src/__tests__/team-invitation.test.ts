import request from 'supertest';
import app from '../index';
import { supabase } from '../config/supabase';

// Mock Supabase
jest.mock('../config/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Test helper functions
const createTestUser = () => ({
  id: `user-${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  role: 'owner' as const,
  subscription_tier: 'free' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  email_verified: true,
});

const createTestWebsite = (ownerId: string) => ({
  id: `website-${Date.now()}`,
  name: 'Test Website',
  domain: 'test.example.com',
  api_key: `api-key-${Date.now()}`,
  owner_id: ownerId,
  integration_status: 'pending' as const,
  embed_code: '<script>test</script>',
  configuration: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
});

const getAuthToken = async (email: string) => {
  // Mock JWT token for testing
  return `mock-jwt-token-${email}`;
};

describe('Team and Invitation Management', () => {
  let ownerAuthToken: string;
  let ownerUserId: string;
  let websiteId: string;
  let testUserEmail: string;
  let invitationId: string;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'owner'
  };

  beforeAll(async () => {
    // Create test owner and website
    const owner = createTestUser();
    ownerUserId = owner.id;
    ownerAuthToken = await getAuthToken(owner.email);
    
    const website = createTestWebsite(ownerUserId);
    websiteId = website.id;

    testUserEmail = `test-invite-${Date.now()}@example.com`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    jest.spyOn(require('../middleware/auth'), 'authenticateToken').mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });

    // Mock database service
    jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
      checkWebsiteAccess: jest.fn().mockResolvedValue(true)
    }));
  });

  describe('Team Invitations', () => {
    describe('POST /api/websites/:websiteId/invitations', () => {
      it('should create invitation successfully', async () => {
        const invitationData = {
          email: testUserEmail,
          role: 'editor',
        };

        const response = await request(app)
          .post(`/api/websites/${websiteId}/invitations`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .send(invitationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.invitation).toHaveProperty('id');
        expect(response.body.data.invitation.email).toBe(testUserEmail);
        expect(response.body.data.invitation.role).toBe('editor');
        expect(response.body.data.invitation).toHaveProperty('token');
        expect(response.body.data.invitation).toHaveProperty('expires_at');

        invitationId = response.body.data.invitation.id;
      });

      it('should handle duplicate invitation by updating existing one', async () => {
        const invitationData = {
          email: testUserEmail,
          role: 'author', // Different role
        };

        const response = await request(app)
          .post(`/api/websites/${websiteId}/invitations`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .send(invitationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.invitation.email).toBe(testUserEmail);
        expect(response.body.data.invitation.role).toBe('author'); // Updated role
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post(`/api/websites/${websiteId}/invitations`)
          .send({ email: 'test@example.com', role: 'editor' })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      it('should validate email format', async () => {
        const response = await request(app)
          .post(`/api/websites/${websiteId}/invitations`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .send({ email: 'invalid-email', role: 'editor' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should validate role', async () => {
        const response = await request(app)
          .post(`/api/websites/${websiteId}/invitations`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .send({ email: 'test@example.com', role: 'invalid-role' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/websites/:websiteId/invitations', () => {
      it('should return invitations list', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/invitations`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).toHaveProperty('id');
        expect(response.body.data[0]).toHaveProperty('email');
        expect(response.body.data[0]).toHaveProperty('role');
        expect(response.body.data[0]).toHaveProperty('inviter');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/invitations`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });

    describe('POST /api/websites/:websiteId/invitations/:invitationId/resend', () => {
      it('should resend invitation', async () => {
        const response = await request(app)
          .post(`/api/websites/${websiteId}/invitations/${invitationId}/resend`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.invitation).toHaveProperty('id', invitationId);
        expect(response.body.data.invitation).toHaveProperty('token');
      });

      it('should handle invitation not found', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
        
        const response = await request(app)
          .post(`/api/websites/${websiteId}/invitations/${nonExistentId}/resend`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Invitation not found');
      });
    });

    describe('DELETE /api/websites/:websiteId/invitations/:invitationId', () => {
      it('should cancel invitation', async () => {
        const response = await request(app)
          .delete(`/api/websites/${websiteId}/invitations/${invitationId}`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(204);

        // Verify invitation is deleted
        const checkResponse = await request(app)
          .get(`/api/websites/${websiteId}/invitations`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(200);

        const deletedInvitation = checkResponse.body.data.find(
          (inv: any) => inv.id === invitationId
        );
        expect(deletedInvitation).toBeUndefined();
      });
    });
  });

  describe('Invitation Acceptance', () => {
    let invitationToken: string;

    beforeAll(async () => {
      // Create a new invitation for acceptance testing
      const invitationData = {
        email: `accept-test-${Date.now()}@example.com`,
        role: 'editor',
      };

      const response = await request(app)
        .post(`/api/websites/${websiteId}/invitations`)
        .set('Authorization', `Bearer ${ownerAuthToken}`)
        .send(invitationData);

      invitationToken = response.body.data.invitation.token;
    });

    describe('POST /api/invitations/accept', () => {
      it('should accept invitation and create user account', async () => {
        const acceptData = {
          token: invitationToken,
          name: 'Test User',
          password: 'SecurePassword123!',
        };

        const response = await request(app)
          .post('/api/invitations/accept')
          .send(acceptData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user).toHaveProperty('id');
        expect(response.body.data.user.name).toBe('Test User');
        expect(response.body.data.user).not.toHaveProperty('password_hash');
        expect(response.body.data.website).toHaveProperty('id', websiteId);
      });

      it('should handle invalid token', async () => {
        const acceptData = {
          token: 'invalid-token',
          name: 'Test User',
          password: 'SecurePassword123!',
        };

        const response = await request(app)
          .post('/api/invitations/accept')
          .send(acceptData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Invalid or expired invitation');
      });

      it('should validate password strength', async () => {
        const acceptData = {
          token: invitationToken,
          name: 'Test User',
          password: 'weak',
        };

        const response = await request(app)
          .post('/api/invitations/accept')
          .send(acceptData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Team Management', () => {
    let teamMemberUserId: string;
    let memberAuthToken: string;

    beforeAll(async () => {
      // Create a team member user
      const member = await createTestUser();
      teamMemberUserId = member.id;
      memberAuthToken = await getAuthToken(member.email);

      // Add member to website
      await supabase.from('website_users').insert({
        website_id: websiteId,
        user_id: teamMemberUserId,
        role: 'editor',
        added_by: ownerUserId,
      });
    });

    describe('GET /api/websites/:websiteId/team', () => {
      it('should return team members', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/team`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0]).toHaveProperty('user_id');
        expect(response.body.data[0]).toHaveProperty('role');
        expect(response.body.data[0]).toHaveProperty('user');
        expect(response.body.data[0]).toHaveProperty('added_by_user');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/team`)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });

    describe('GET /api/websites/:websiteId/team/:memberId', () => {
      it('should return team member details', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/${teamMemberUserId}`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.member.user_id).toBe(teamMemberUserId);
        expect(response.body.data.member.role).toBe('editor');
        expect(response.body.data.member).toHaveProperty('user');
      });

      it('should handle member not found', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
        
        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/${nonExistentId}`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Team member not found');
      });
    });

    describe('PUT /api/websites/:websiteId/team/:memberId/role', () => {
      it('should update team member role', async () => {
        const response = await request(app)
          .put(`/api/websites/${websiteId}/team/${teamMemberUserId}/role`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .send({ role: 'admin' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.member.role).toBe('admin');
      });

      it('should prevent non-owners from changing roles', async () => {
        const response = await request(app)
          .put(`/api/websites/${websiteId}/team/${teamMemberUserId}/role`)
          .set('Authorization', `Bearer ${memberAuthToken}`)
          .send({ role: 'owner' })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Insufficient permissions');
      });

      it('should validate role', async () => {
        const response = await request(app)
          .put(`/api/websites/${websiteId}/team/${teamMemberUserId}/role`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .send({ role: 'invalid-role' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('DELETE /api/websites/:websiteId/team/:memberId', () => {
      it('should remove team member', async () => {
        const response = await request(app)
          .delete(`/api/websites/${websiteId}/team/${teamMemberUserId}`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(204);

        // Verify member is removed
        const checkResponse = await request(app)
          .get(`/api/websites/${websiteId}/team/${teamMemberUserId}`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(404);
      });

      it('should prevent removing website owner', async () => {
        const response = await request(app)
          .delete(`/api/websites/${websiteId}/team/${ownerUserId}`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Cannot remove website owner');
      });
    });

    describe('GET /api/websites/:websiteId/team/stats', () => {
      it('should return team statistics', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/team/stats`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalMembers');
        expect(response.body.data).toHaveProperty('roleDistribution');
        expect(response.body.data).toHaveProperty('recentAdditions');
        expect(typeof response.body.data.totalMembers).toBe('number');
      });
    });
  });

  describe('Audit Logs', () => {
    describe('GET /api/websites/:websiteId/audit/logs', () => {
      it('should return audit logs', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/audit/logs`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        // Should have logs from team management actions
        expect(response.body.data.length).toBeGreaterThan(0);
        
        if (response.body.data.length > 0) {
          expect(response.body.data[0]).toHaveProperty('action');
          expect(response.body.data[0]).toHaveProperty('user');
          expect(response.body.data[0]).toHaveProperty('created_at');
        }
      });

      it('should support filtering by action', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/audit/logs`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .query({ action: 'member_removed' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should require team management permission', async () => {
        // Create a user with limited permissions
        const limitedUser = await createTestUser();
        const limitedAuthToken = await getAuthToken(limitedUser.email);

        // Add as author (no team management permission)
        await supabase.from('website_users').insert({
          website_id: websiteId,
          user_id: limitedUser.id,
          role: 'author',
          added_by: ownerUserId,
        });

        const response = await request(app)
          .get(`/api/websites/${websiteId}/audit/logs`)
          .set('Authorization', `Bearer ${limitedAuthToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Insufficient permissions to view audit logs');

        // Cleanup
        await supabase.from('website_users').delete().eq('user_id', limitedUser.id);
        await supabase.from('users').delete().eq('id', limitedUser.id);
      });
    });

    describe('GET /api/websites/:websiteId/audit/stats', () => {
      it('should return audit statistics', async () => {
        const response = await request(app)
          .get(`/api/websites/${websiteId}/audit/stats`)
          .set('Authorization', `Bearer ${ownerAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalEvents');
        expect(response.body.data).toHaveProperty('eventsByAction');
        expect(response.body.data).toHaveProperty('eventsByUser');
        expect(response.body.data).toHaveProperty('recentActivity');
        expect(typeof response.body.data.totalEvents).toBe('number');
      });
    });
  });
});
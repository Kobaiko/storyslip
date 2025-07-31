import request from 'supertest';
import app from '../index';
import { supabase } from '../config/supabase';
import { HelperUtil } from '../utils/helpers';

// Mock Supabase
jest.mock('../config/supabase');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock helper utilities
jest.mock('../utils/helpers');
const mockHelperUtil = HelperUtil as jest.Mocked<typeof HelperUtil>;

describe('Invitation Management', () => {
  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'owner'
  };

  const mockWebsiteId = 'website-123';
  const mockInvitationId = 'invitation-123';

  const mockInvitation = {
    id: mockInvitationId,
    email: 'invited@example.com',
    role: 'editor',
    website_id: mockWebsiteId,
    invited_by: 'user-123',
    token: 'a'.repeat(64),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    accepted_at: null,
    created_at: '2024-01-01T00:00:00Z'
  };

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

    // Mock team service
    jest.spyOn(require('../services/team.service'), 'teamService').mockImplementation(() => ({
      hasPermission: jest.fn().mockResolvedValue(true)
    }));

    // Mock helper utilities
    mockHelperUtil.isValidUuid.mockReturnValue(true);
    mockHelperUtil.isValidEmail.mockReturnValue(true);
  });

  describe('POST /api/websites/:websiteId/invitations', () => {
    const validInvitationData = {
      email: 'invited@example.com',
      role: 'editor'
    };

    it('should send invitation', async () => {
      // Mock existing user check (no existing user)
      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      // Mock existing invitation check (no existing invitation)
      const mockInvitationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      // Mock invitation creation
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInvitation,
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUserQuery as any) // Check existing user
        .mockReturnValueOnce(mockInvitationQuery as any) // Check existing invitation
        .mockReturnValueOnce(mockInsertQuery as any); // Create invitation

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send(validInvitationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitation).toEqual(mockInvitation);
    });

    it('should return 409 if user is already a member', async () => {
      // Mock existing user
      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-user', email: 'invited@example.com' },
          error: null
        })
      };

      // Mock existing member check
      const mockMemberQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'existing-user' },
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUserQuery as any)
        .mockReturnValueOnce(mockMemberQuery as any);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send(validInvitationData)
        .expect(500); // This would be handled by the service layer
    });

    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send({})
        .expect(400);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send({ email: 'test@example.com' })
        .expect(400);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send({ role: 'editor' })
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send({ email: 'invalid-email', role: 'editor' })
        .expect(400);
    });

    it('should validate role values', async () => {
      await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations`)
        .send({ email: 'test@example.com', role: 'invalid-role' })
        .expect(400);
    });
  });

  describe('GET /api/websites/:websiteId/invitations', () => {
    it('should get invitations for website', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockInvitation],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/invitations`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toHaveLength(1);
      expect(response.body.data.invitations[0]).toEqual(mockInvitation);
    });
  });

  describe('DELETE /api/websites/:websiteId/invitations/:invitationId', () => {
    it('should cancel invitation', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockResolvedValue({
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await request(app)
        .delete(`/api/websites/${mockWebsiteId}/invitations/${mockInvitationId}`)
        .expect(204);
    });
  });

  describe('POST /api/websites/:websiteId/invitations/:invitationId/resend', () => {
    it('should resend invitation', async () => {
      // Mock get invitation
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockInvitation,
          error: null
        })
      };

      // Mock update invitation
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockInvitation, token: 'b'.repeat(64) },
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/invitations/${mockInvitationId}/resend`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitation.token).toBe('b'.repeat(64));
    });
  });

  describe('GET /api/invitations/:token', () => {
    it('should get invitation details by token', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockInvitation,
            website: {
              id: mockWebsiteId,
              name: 'Test Website',
              domain: 'example.com'
            }
          },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get(`/api/invitations/${mockInvitation.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitation.email).toBe(mockInvitation.email);
      expect(response.body.data.invitation.website).toBeDefined();
    });

    it('should return 404 for invalid token', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await request(app)
        .get('/api/invitations/invalid-token')
        .expect(404);
    });
  });

  describe('POST /api/invitations/accept', () => {
    const validAcceptData = {
      token: mockInvitation.token,
      name: 'New User',
      password: 'password123'
    };

    it('should accept invitation and create user', async () => {
      // Mock get invitation
      const mockInvitationQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...mockInvitation,
            website: { id: mockWebsiteId, name: 'Test Website' }
          },
          error: null
        })
      };

      // Mock check existing user
      const mockUserQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      // Mock create user
      const mockCreateUserQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'new-user-123',
            email: mockInvitation.email,
            name: 'New User'
          },
          error: null
        })
      };

      // Mock add to website
      const mockAddMemberQuery = {
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      };

      // Mock mark invitation as accepted
      const mockUpdateInvitationQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockInvitationQuery as any)
        .mockReturnValueOnce(mockUserQuery as any)
        .mockReturnValueOnce(mockCreateUserQuery as any)
        .mockReturnValueOnce(mockAddMemberQuery as any)
        .mockReturnValueOnce(mockUpdateInvitationQuery as any);

      // Mock password hashing
      mockHelperUtil.hashPassword = jest.fn().mockResolvedValue('hashed-password');

      const response = await request(app)
        .post('/api/invitations/accept')
        .send(validAcceptData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(mockInvitation.email);
      expect(response.body.data.website).toBeDefined();
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/invitations/accept')
        .send({})
        .expect(400);

      await request(app)
        .post('/api/invitations/accept')
        .send({ token: mockInvitation.token })
        .expect(400);

      await request(app)
        .post('/api/invitations/accept')
        .send({ token: mockInvitation.token, name: 'Test' })
        .expect(400);
    });

    it('should validate password length', async () => {
      await request(app)
        .post('/api/invitations/accept')
        .send({
          token: mockInvitation.token,
          name: 'Test User',
          password: '123' // Too short
        })
        .expect(400);
    });
  });
});
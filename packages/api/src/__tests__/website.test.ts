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

// Mock integration service
jest.mock('../services/integration.service');

describe('Website Management', () => {
  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'owner'
  };

  const mockWebsite = {
    id: 'website-123',
    name: 'Test Website',
    domain: 'example.com',
    api_key: 'test-api-key-123',
    owner_id: 'user-123',
    embed_code: '<script>test</script>',
    configuration: {},
    integration_status: 'pending',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    jest.spyOn(require('../middleware/auth'), 'authenticateToken').mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });

    // Mock helper utilities
    mockHelperUtil.isValidUuid.mockReturnValue(true);
    mockHelperUtil.isValidDomain.mockReturnValue(true);
    mockHelperUtil.extractDomain.mockReturnValue('example.com');
    mockHelperUtil.generateApiKey.mockReturnValue('test-api-key-123');
    mockHelperUtil.generateRandomString.mockReturnValue('verification-token-123');
  });

  describe('GET /api/websites', () => {
    it('should get all websites for authenticated user', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockWebsite],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get('/api/websites')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle search and pagination parameters', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockWebsite],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await request(app)
        .get('/api/websites?page=2&limit=5&search=example&sort=name&order=asc')
        .expect(200);

      expect(mockQuery.or).toHaveBeenCalledWith('name.ilike.%example%,domain.ilike.%example%');
      expect(mockQuery.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(mockQuery.range).toHaveBeenCalledWith(5, 9); // page 2, limit 5
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
          count: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await request(app)
        .get('/api/websites')
        .expect(500);
    });
  });

  describe('GET /api/websites/:websiteId', () => {
    it('should get website by ID', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockWebsite,
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get('/api/websites/website-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.website).toEqual(mockWebsite);
    });

    it('should return 404 for non-existent website', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await request(app)
        .get('/api/websites/non-existent')
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      mockHelperUtil.isValidUuid.mockReturnValue(false);

      await request(app)
        .get('/api/websites/invalid-uuid')
        .expect(400);
    });
  });

  describe('POST /api/websites', () => {
    const validWebsiteData = {
      name: 'Test Website',
      domain: 'example.com',
      configuration: {}
    };

    it('should create a new website', async () => {
      // Mock domain validation
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      // Mock website creation
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockWebsite,
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any) // For domain check
        .mockReturnValueOnce(mockInsertQuery as any); // For website creation

      const response = await request(app)
        .post('/api/websites')
        .send(validWebsiteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.website).toEqual(mockWebsite);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: validWebsiteData.name,
          domain: 'example.com',
          api_key: 'test-api-key-123',
          owner_id: mockUser.userId,
          integration_status: 'pending',
          is_active: true
        })
      );
    });

    it('should return 400 for invalid domain', async () => {
      mockHelperUtil.isValidDomain.mockReturnValue(false);

      await request(app)
        .post('/api/websites')
        .send({ ...validWebsiteData, domain: 'invalid-domain' })
        .expect(400);
    });

    it('should return 409 for duplicate domain', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-website' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockSelectQuery as any);

      await request(app)
        .post('/api/websites')
        .send(validWebsiteData)
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/websites')
        .send({})
        .expect(400);

      await request(app)
        .post('/api/websites')
        .send({ name: 'Test' })
        .expect(400);

      await request(app)
        .post('/api/websites')
        .send({ domain: 'example.com' })
        .expect(400);
    });
  });

  describe('PUT /api/websites/:websiteId', () => {
    it('should update website', async () => {
      // Mock access check
      jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
        checkWebsiteAccess: jest.fn().mockResolvedValue(true)
      }));

      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockWebsite, name: 'Updated Website' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const updateData = { name: 'Updated Website' };

      const response = await request(app)
        .put('/api/websites/website-123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.website.name).toBe('Updated Website');
    });

    it('should regenerate embed code when domain is updated', async () => {
      // Mock access check
      jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
        checkWebsiteAccess: jest.fn().mockResolvedValue(true)
      }));

      // Mock current website query
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { api_key: 'test-api-key-123' },
          error: null
        })
      };

      // Mock update query
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockWebsite, domain: 'newdomain.com' },
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const updateData = { domain: 'newdomain.com' };

      await request(app)
        .put('/api/websites/website-123')
        .send(updateData)
        .expect(200);

      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'newdomain.com',
          embed_code: expect.stringContaining('newdomain.com')
        })
      );
    });

    it('should return 404 for non-existent website', async () => {
      jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
        checkWebsiteAccess: jest.fn().mockResolvedValue(false)
      }));

      await request(app)
        .put('/api/websites/non-existent')
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/websites/:websiteId', () => {
    it('should delete website', async () => {
      jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
        checkWebsiteAccess: jest.fn().mockResolvedValue(true)
      }));

      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await request(app)
        .delete('/api/websites/website-123')
        .expect(204);
    });

    it('should return 404 for non-existent website', async () => {
      jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
        checkWebsiteAccess: jest.fn().mockResolvedValue(false)
      }));

      await request(app)
        .delete('/api/websites/non-existent')
        .expect(404);
    });
  });

  describe('POST /api/websites/:websiteId/regenerate-key', () => {
    it('should regenerate API key', async () => {
      jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
        checkWebsiteAccess: jest.fn().mockResolvedValue(true)
      }));

      // Mock current website query
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { domain: 'example.com' },
          error: null
        })
      };

      // Mock update query
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockWebsite, api_key: 'new-api-key-456' },
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      mockHelperUtil.generateApiKey.mockReturnValue('new-api-key-456');

      const response = await request(app)
        .post('/api/websites/website-123/regenerate-key')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          api_key: 'new-api-key-456',
          integration_status: 'pending'
        })
      );
    });
  });

  describe('POST /api/websites/:websiteId/test-integration', () => {
    it('should test website integration', async () => {
      jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
        checkWebsiteAccess: jest.fn().mockResolvedValue(true)
      }));

      // Mock website query
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockWebsite,
          error: null
        })
      };

      // Mock update query
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      // Mock integration service
      const mockTestResults = {
        status: 'success',
        tests: [
          { name: 'Domain validation', status: 'passed', message: 'Domain is valid' }
        ],
        timestamp: '2024-01-01T00:00:00Z',
        duration: 1000,
        overallScore: 100
      };

      jest.spyOn(require('../services/integration.service'), 'IntegrationService').mockImplementation(() => ({
        testWebsiteIntegration: jest.fn().mockResolvedValue(mockTestResults),
        generateRecommendations: jest.fn().mockReturnValue(['Great! Your integration is ready'])
      }));

      const response = await request(app)
        .post('/api/websites/website-123/test-integration')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.testResults).toEqual(mockTestResults);
      expect(response.body.data.recommendations).toBeDefined();
    });
  });

  describe('GET /api/websites/stats', () => {
    it('should get website statistics', async () => {
      const mockQueries = [
        // Total websites
        {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: 5, error: null })
        },
        // Status stats
        {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn().mockResolvedValue({
            data: { success: 3, pending: 1, failed: 1 },
            error: null
          })
        },
        // Active websites
        {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: 4, error: null })
        },
        // Recent websites
        {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockResolvedValue({ count: 2, error: null })
        }
      ];

      mockSupabase.from
        .mockReturnValueOnce(mockQueries[0] as any)
        .mockReturnValueOnce(mockQueries[1] as any)
        .mockReturnValueOnce(mockQueries[2] as any)
        .mockReturnValueOnce(mockQueries[3] as any);

      const response = await request(app)
        .get('/api/websites/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          totalWebsites: 5,
          activeWebsites: 4,
          recentWebsites: 2,
          integrationStatusDistribution: expect.any(Object),
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('Domain Verification', () => {
    describe('POST /api/websites/:websiteId/validate-domain', () => {
      it('should initiate domain validation', async () => {
        jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
          checkWebsiteAccess: jest.fn().mockResolvedValue(true)
        }));

        // Mock website query
        const mockSelectQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockWebsite,
            error: null
          })
        };

        // Mock update query
        const mockUpdateQuery = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        };

        mockSupabase.from
          .mockReturnValueOnce(mockSelectQuery as any)
          .mockReturnValueOnce(mockUpdateQuery as any);

        const response = await request(app)
          .post('/api/websites/website-123/validate-domain')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.verificationToken).toBe('verification-token-123');
        expect(response.body.data.instructions).toBeDefined();
      });
    });

    describe('POST /api/websites/:websiteId/verify-domain', () => {
      it('should verify domain ownership', async () => {
        jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
          checkWebsiteAccess: jest.fn().mockResolvedValue(true)
        }));

        // Mock website query
        const mockSelectQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockWebsite, verification_token: 'verification-token-123' },
            error: null
          })
        };

        // Mock update query
        const mockUpdateQuery = {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        };

        mockSupabase.from
          .mockReturnValueOnce(mockSelectQuery as any)
          .mockReturnValueOnce(mockUpdateQuery as any);

        const response = await request(app)
          .post('/api/websites/website-123/verify-domain')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.verified).toBe(true);
      });

      it('should return 400 if no verification token exists', async () => {
        jest.spyOn(require('../services/database'), 'DatabaseService').mockImplementation(() => ({
          checkWebsiteAccess: jest.fn().mockResolvedValue(true)
        }));

        const mockSelectQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockWebsite, verification_token: null },
            error: null
          })
        };

        mockSupabase.from.mockReturnValue(mockSelectQuery as any);

        await request(app)
          .post('/api/websites/website-123/verify-domain')
          .expect(400);
      });
    });
  });
});
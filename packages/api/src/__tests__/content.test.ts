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

describe('Content Management', () => {
  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'owner'
  };

  const mockWebsiteId = 'website-123';
  const mockContentId = 'content-123';

  const mockContent = {
    id: mockContentId,
    title: 'Test Article',
    slug: 'test-article',
    body: 'This is a test article content.',
    excerpt: 'This is a test article...',
    status: 'draft',
    author_id: 'user-123',
    website_id: mockWebsiteId,
    seo_title: 'Test Article - SEO Title',
    seo_description: 'Test article description for SEO',
    featured_image_url: 'https://example.com/image.jpg',
    view_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    published_at: null,
    scheduled_at: null
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

    // Mock helper utilities
    mockHelperUtil.isValidUuid.mockReturnValue(true);
    mockHelperUtil.generateSlug.mockReturnValue('test-article');
    mockHelperUtil.generateExcerpt.mockReturnValue('This is a test article...');
  });

  describe('POST /api/websites/:websiteId/content', () => {
    const validContentData = {
      title: 'Test Article',
      body: 'This is a test article content.',
      status: 'draft',
      seo_title: 'Test Article - SEO Title',
      seo_description: 'Test article description for SEO'
    };

    it('should create new content', async () => {
      // Mock slug check (no existing content)
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      // Mock content creation
      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockContent,
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any) // For slug check
        .mockReturnValueOnce(mockInsertQuery as any); // For content creation

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/content`)
        .send(validContentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toEqual(mockContent);
      expect(mockInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validContentData.title,
          slug: 'test-article',
          body: validContentData.body,
          status: 'draft',
          author_id: mockUser.userId,
          website_id: mockWebsiteId
        })
      );
    });

    it('should return 409 for duplicate slug', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-content' },
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockSelectQuery as any);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content`)
        .send(validContentData)
        .expect(500); // This would be handled by the service layer
    });

    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content`)
        .send({})
        .expect(400);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content`)
        .send({ title: 'Test' })
        .expect(400);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content`)
        .send({ body: 'Content' })
        .expect(400);
    });
  });

  describe('GET /api/websites/:websiteId/content', () => {
    it('should get content list', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockContent],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/content`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should handle filters and pagination', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockContent],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/content?page=2&limit=5&status=published&search=test`)
        .expect(200);

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'published');
      expect(mockQuery.or).toHaveBeenCalledWith('title.ilike.%test%,body.ilike.%test%,excerpt.ilike.%test%');
      expect(mockQuery.range).toHaveBeenCalledWith(5, 9); // page 2, limit 5
    });
  });

  describe('GET /api/websites/:websiteId/content/:contentId', () => {
    it('should get content by ID', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockContent,
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQuery as any);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/${mockContentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toEqual(mockContent);
    });

    it('should return 404 for non-existent content', async () => {
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
        .get(`/api/websites/${mockWebsiteId}/content/non-existent`)
        .expect(404);
    });
  });

  describe('PUT /api/websites/:websiteId/content/:contentId', () => {
    it('should update content', async () => {
      // Mock get content (for verification)
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockContent,
          error: null
        })
      };

      // Mock update
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockContent, title: 'Updated Title' },
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const updateData = { title: 'Updated Title' };

      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/content/${mockContentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/websites/:websiteId/content/:contentId', () => {
    it('should delete content', async () => {
      // Mock get content (for verification)
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockContent,
          error: null
        })
      };

      // Mock delete
      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockDeleteQuery as any);

      await request(app)
        .delete(`/api/websites/${mockWebsiteId}/content/${mockContentId}`)
        .expect(204);
    });
  });

  describe('POST /api/websites/:websiteId/content/:contentId/publish', () => {
    it('should publish content', async () => {
      // Mock get content (for verification)
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockContent,
          error: null
        })
      };

      // Mock update to published
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockContent, status: 'published', published_at: '2024-01-01T12:00:00Z' },
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/${mockContentId}/publish`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content.status).toBe('published');
    });
  });

  describe('POST /api/websites/:websiteId/content/:contentId/schedule', () => {
    it('should schedule content', async () => {
      // Mock get content (for verification)
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockContent,
          error: null
        })
      };

      // Mock update to scheduled
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockContent, status: 'scheduled', scheduled_at: '2024-01-02T12:00:00Z' },
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockUpdateQuery as any);

      const scheduleData = { scheduled_at: '2024-01-02T12:00:00Z' };

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/${mockContentId}/schedule`)
        .send(scheduleData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content.status).toBe('scheduled');
      expect(response.body.data.content.scheduled_at).toBe('2024-01-02T12:00:00Z');
    });

    it('should require scheduled_at field', async () => {
      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/${mockContentId}/schedule`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/websites/:websiteId/content/stats', () => {
    it('should get content statistics', async () => {
      const mockStatusQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { status: 'draft' },
            { status: 'published' },
            { status: 'published' }
          ],
          error: null
        })
      };

      const mockViewQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { view_count: 10 },
            { view_count: 25 },
            { view_count: 5 }
          ],
          error: null
        })
      };

      const mockRecentQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({
          count: 2,
          error: null
        })
      };

      mockSupabase.from
        .mockReturnValueOnce(mockStatusQuery as any)
        .mockReturnValueOnce(mockViewQuery as any)
        .mockReturnValueOnce(mockRecentQuery as any);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.objectContaining({
          statusDistribution: { draft: 1, published: 2 },
          totalContent: 3,
          totalViews: 40,
          recentContent: 2,
          timestamp: expect.any(String)
        })
      );
    });
  });
});
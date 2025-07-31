import request from 'supertest';
import { app } from '../server';
import { enhancedContentService } from '../services/enhanced-content.service';
import { supabase } from '../config/supabase';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../services/enhanced-content.service');
jest.mock('../services/team.service');
jest.mock('../services/database');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEnhancedContentService = enhancedContentService as jest.Mocked<typeof enhancedContentService>;

describe('Enhanced Content Management', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockWebsiteId = '123e4567-e89b-12d3-a456-426614174001';
  const mockContentId = '123e4567-e89b-12d3-a456-426614174002';
  const mockToken = 'mock-jwt-token';

  const mockRichContent = {
    id: mockContentId,
    title: 'Rich Content Article',
    slug: 'rich-content-article',
    body: 'This is the body content',
    rich_content: [
      {
        id: 'block-1',
        type: 'paragraph',
        content: { text: 'This is a paragraph' }
      },
      {
        id: 'block-2',
        type: 'image',
        content: { 
          url: 'https://example.com/image.jpg',
          alt: 'Example image',
          caption: 'An example image'
        }
      }
    ],
    excerpt: 'This is an excerpt',
    status: 'draft',
    author_id: mockUserId,
    website_id: mockWebsiteId,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication
    (require('../middleware/auth').authenticateToken as jest.Mock) = jest.fn((req, res, next) => {
      req.user = { userId: mockUserId };
      next();
    });

    // Mock database access check
    (require('../services/database').DatabaseService.checkWebsiteAccess as jest.Mock) = jest.fn()
      .mockResolvedValue(true);

    // Mock team permissions
    (require('../services/team.service').teamService.hasPermission as jest.Mock) = jest.fn()
      .mockResolvedValue(true);
  });

  describe('POST /api/websites/:websiteId/content/rich', () => {
    const richContentData = {
      title: 'Rich Content Article',
      body: 'This is the body content',
      rich_content: [
        {
          id: 'block-1',
          type: 'paragraph',
          content: { text: 'This is a paragraph' }
        },
        {
          id: 'block-2',
          type: 'image',
          content: { 
            url: 'https://example.com/image.jpg',
            alt: 'Example image',
            caption: 'An example image'
          }
        }
      ],
      status: 'draft',
      seo_keywords: ['content', 'rich', 'editor'],
      category_ids: ['cat-1'],
      tag_ids: ['tag-1'],
    };

    it('should create rich content successfully', async () => {
      mockEnhancedContentService.createRichContent.mockResolvedValue(mockRichContent);

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/rich`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(richContentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toEqual(mockRichContent);
      expect(mockEnhancedContentService.createRichContent).toHaveBeenCalledWith(
        mockWebsiteId,
        mockUserId,
        richContentData
      );
    });

    it('should validate rich content blocks', async () => {
      const invalidData = {
        ...richContentData,
        rich_content: [
          {
            id: 'block-1',
            type: 'invalid-type', // Invalid block type
            content: { text: 'This is a paragraph' }
          }
        ]
      };

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/rich`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should require scheduled_at when status is scheduled', async () => {
      const scheduledData = {
        ...richContentData,
        status: 'scheduled',
        // Missing scheduled_at
      };

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/rich`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(scheduledData)
        .expect(400);
    });

    it('should check user permissions', async () => {
      (require('../services/team.service').teamService.hasPermission as jest.Mock)
        .mockResolvedValue(false);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/rich`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(richContentData)
        .expect(403);
    });
  });

  describe('GET /api/websites/:websiteId/content/search', () => {
    const mockSearchResult = {
      content: [mockRichContent],
      total: 1,
      page: 1,
      totalPages: 1,
      facets: {
        categories: [{ id: 'cat-1', name: 'Technology', count: 5 }],
        tags: [{ id: 'tag-1', name: 'JavaScript', count: 3 }],
        authors: [{ id: mockUserId, name: 'John Doe', count: 2 }],
        statuses: [{ status: 'published', count: 10 }],
      },
    };

    it('should search content with query', async () => {
      mockEnhancedContentService.searchContent.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/search`)
        .query({ query: 'javascript', page: 1, limit: 20 })
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResult);
      expect(mockEnhancedContentService.searchContent).toHaveBeenCalledWith(
        mockWebsiteId,
        expect.objectContaining({
          query: 'javascript',
          sort_by: 'created_at',
          sort_order: 'desc',
        }),
        1,
        20
      );
    });

    it('should search with multiple filters', async () => {
      mockEnhancedContentService.searchContent.mockResolvedValue(mockSearchResult);

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/search`)
        .query({
          query: 'react',
          status: 'published,draft',
          categories: 'cat-1,cat-2',
          tags: 'tag-1',
          has_featured_image: 'true',
          sort_by: 'view_count',
          sort_order: 'desc',
        })
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockEnhancedContentService.searchContent).toHaveBeenCalledWith(
        mockWebsiteId,
        expect.objectContaining({
          query: 'react',
          status: ['published', 'draft'],
          categories: ['cat-1', 'cat-2'],
          tags: ['tag-1'],
          has_featured_image: true,
          sort_by: 'view_count',
          sort_order: 'desc',
        }),
        1,
        20
      );
    });

    it('should return facets for filtering', async () => {
      mockEnhancedContentService.searchContent.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/search`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.data.facets).toBeDefined();
      expect(response.body.data.facets.categories).toHaveLength(1);
      expect(response.body.data.facets.tags).toHaveLength(1);
    });
  });

  describe('POST /api/websites/:websiteId/content/:contentId/schedule', () => {
    const mockSchedule = {
      id: 'schedule-1',
      content_id: mockContentId,
      scheduled_at: '2024-12-31T23:59:59Z',
      action: 'publish',
      status: 'pending',
      created_by: mockUserId,
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should schedule content action', async () => {
      mockEnhancedContentService.scheduleContentAction.mockResolvedValue(mockSchedule);

      const scheduleData = {
        action: 'publish',
        scheduled_at: '2024-12-31T23:59:59Z',
      };

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/${mockContentId}/schedule`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.schedule).toEqual(mockSchedule);
      expect(mockEnhancedContentService.scheduleContentAction).toHaveBeenCalledWith(
        mockContentId,
        'publish',
        '2024-12-31T23:59:59Z',
        mockUserId
      );
    });

    it('should validate schedule action', async () => {
      const invalidData = {
        action: 'invalid-action',
        scheduled_at: '2024-12-31T23:59:59Z',
      };

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/${mockContentId}/schedule`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should require valid ISO date', async () => {
      const invalidData = {
        action: 'publish',
        scheduled_at: 'invalid-date',
      };

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/${mockContentId}/schedule`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/websites/:websiteId/content/:contentId/revisions', () => {
    const mockRevisions = [
      {
        id: 'revision-1',
        content_id: mockContentId,
        title: 'Updated Title',
        body: 'Updated body content',
        revision_number: 2,
        change_summary: 'Updated title and content',
        created_by: mockUserId,
        created_at: '2024-01-02T00:00:00Z',
      },
      {
        id: 'revision-2',
        content_id: mockContentId,
        title: 'Original Title',
        body: 'Original body content',
        revision_number: 1,
        change_summary: 'Initial creation',
        created_by: mockUserId,
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should get content revisions', async () => {
      mockEnhancedContentService.getContentRevisions.mockResolvedValue(mockRevisions);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/${mockContentId}/revisions`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.revisions).toEqual(mockRevisions);
      expect(mockEnhancedContentService.getContentRevisions).toHaveBeenCalledWith(mockContentId);
    });

    it('should check website access', async () => {
      (require('../services/database').DatabaseService.checkWebsiteAccess as jest.Mock)
        .mockResolvedValue(false);

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/${mockContentId}/revisions`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });
  });

  describe('POST /api/websites/:websiteId/content/:contentId/revisions/:revisionId/restore', () => {
    const mockRevisionId = 'revision-1';

    it('should restore content from revision', async () => {
      mockEnhancedContentService.restoreFromRevision.mockResolvedValue(mockRichContent);

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/${mockContentId}/revisions/${mockRevisionId}/restore`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toEqual(mockRichContent);
      expect(mockEnhancedContentService.restoreFromRevision).toHaveBeenCalledWith(
        mockContentId,
        mockRevisionId,
        mockUserId
      );
    });

    it('should check user permissions for restore', async () => {
      (require('../services/team.service').teamService.hasPermission as jest.Mock)
        .mockResolvedValue(false);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/content/${mockContentId}/revisions/${mockRevisionId}/restore`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/websites/:websiteId/content/bulk', () => {
    const mockBulkResult = {
      updated: 2,
      errors: [
        { id: 'content-3', error: 'Content not found' }
      ],
    };

    it('should bulk update content', async () => {
      mockEnhancedContentService.bulkUpdateContent.mockResolvedValue(mockBulkResult);

      const bulkData = {
        content_ids: ['content-1', 'content-2', 'content-3'],
        updates: {
          status: 'published',
          category_ids: ['cat-1'],
        },
      };

      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/content/bulk`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockBulkResult);
      expect(mockEnhancedContentService.bulkUpdateContent).toHaveBeenCalledWith(
        mockWebsiteId,
        ['content-1', 'content-2', 'content-3'],
        { status: 'published', category_ids: ['cat-1'] },
        mockUserId
      );
    });

    it('should validate bulk update data', async () => {
      const invalidData = {
        content_ids: [], // Empty array
        updates: { status: 'published' },
      };

      await request(app)
        .put(`/api/websites/${mockWebsiteId}/content/bulk`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should require at least one update field', async () => {
      const invalidData = {
        content_ids: ['content-1'],
        updates: {}, // Empty updates
      };

      await request(app)
        .put(`/api/websites/${mockWebsiteId}/content/bulk`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/websites/:websiteId/content/analytics', () => {
    const mockAnalytics = {
      views: [
        { date: '2024-01-01', count: 100 },
        { date: '2024-01-02', count: 150 },
      ],
      topContent: [
        { id: 'content-1', title: 'Popular Article', views: 500, engagement: 0.75 },
      ],
      categoryPerformance: [
        { category: 'Technology', views: 1000, content_count: 5 },
      ],
      searchTerms: [
        { term: 'javascript', count: 50 },
      ],
    };

    it('should get content analytics for website', async () => {
      mockEnhancedContentService.getContentAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/analytics`)
        .query({ period: '30d' })
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analytics).toEqual(mockAnalytics);
      expect(mockEnhancedContentService.getContentAnalytics).toHaveBeenCalledWith(
        mockWebsiteId,
        undefined,
        '30d'
      );
    });

    it('should get analytics for specific content', async () => {
      mockEnhancedContentService.getContentAnalytics.mockResolvedValue(mockAnalytics);

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/${mockContentId}/analytics`)
        .query({ period: '7d' })
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockEnhancedContentService.getContentAnalytics).toHaveBeenCalledWith(
        mockWebsiteId,
        mockContentId,
        '7d'
      );
    });

    it('should check analytics permissions', async () => {
      (require('../services/team.service').teamService.hasPermission as jest.Mock)
        .mockImplementation((websiteId, userId, permission) => {
          return permission === 'view_analytics' ? false : true;
        });

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/content/analytics`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });
  });
});
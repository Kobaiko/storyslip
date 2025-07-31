import request from 'supertest';
import { app } from '../server';
import { supabase } from '../config/supabase';
import { enhancedWidgetService } from '../services/enhanced-widget.service';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../services/enhanced-widget.service');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockEnhancedWidgetService = enhancedWidgetService as jest.Mocked<typeof enhancedWidgetService>;

describe('Enhanced Widget System', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockWebsiteId = '123e4567-e89b-12d3-a456-426614174001';
  const mockWidgetId = '123e4567-e89b-12d3-a456-426614174002';
  const mockToken = 'mock-jwt-token';

  const mockWidget = {
    id: mockWidgetId,
    website_id: mockWebsiteId,
    widget_name: 'Test Widget',
    widget_type: 'content_list' as const,
    title: 'Latest Articles',
    description: 'Recent blog posts',
    items_per_page: 10,
    show_images: true,
    show_excerpts: true,
    show_dates: true,
    show_authors: false,
    show_categories: true,
    show_tags: false,
    content_filters: { category_ids: ['cat1'] },
    sort_order: 'created_at_desc',
    theme: 'default',
    width: '100%',
    height: 'auto',
    border_radius: '8px',
    padding: '16px',
    auto_refresh: false,
    refresh_interval: 300,
    enable_search: false,
    enable_pagination: true,
    enable_infinite_scroll: false,
    open_links_in_new_tab: true,
    enable_seo: true,
    track_clicks: true,
    track_views: true,
    custom_events: [],
    is_public: true,
    require_authentication: false,
    embed_code: '<div>embed code</div>',
    usage_count: 0,
    created_by: mockUserId,
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

  describe('POST /api/websites/:websiteId/widgets', () => {
    const widgetData = {
      widget_name: 'Test Widget',
      widget_type: 'content_list',
      title: 'Latest Articles',
      items_per_page: 10,
      is_public: true,
    };

    it('should create a new widget successfully', async () => {
      mockEnhancedWidgetService.createWidget.mockResolvedValue(mockWidget);

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/widgets`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(widgetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.widget).toEqual(mockWidget);
      expect(mockEnhancedWidgetService.createWidget).toHaveBeenCalledWith(
        mockWebsiteId,
        mockUserId,
        widgetData
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        widget_type: 'content_list',
        // missing widget_name
      };

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/widgets`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should validate widget_type enum', async () => {
      const invalidData = {
        widget_name: 'Test Widget',
        widget_type: 'invalid_type',
      };

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/widgets`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should check website access', async () => {
      (require('../services/database').DatabaseService.checkWebsiteAccess as jest.Mock)
        .mockResolvedValue(false);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/widgets`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(widgetData)
        .expect(404);
    });

    it('should check user permissions', async () => {
      (require('../services/team.service').teamService.hasPermission as jest.Mock)
        .mockResolvedValue(false);

      await request(app)
        .post(`/api/websites/${mockWebsiteId}/widgets`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(widgetData)
        .expect(403);
    });
  });

  describe('GET /api/websites/:websiteId/widgets', () => {
    const mockWidgets = {
      widgets: [mockWidget],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    it('should get widgets for a website', async () => {
      mockEnhancedWidgetService.getWidgets.mockResolvedValue(mockWidgets);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([mockWidget]);
      expect(response.body.pagination.total).toBe(1);
    });

    it('should support filtering by widget_type', async () => {
      mockEnhancedWidgetService.getWidgets.mockResolvedValue(mockWidgets);

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets?widget_type=content_list`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockEnhancedWidgetService.getWidgets).toHaveBeenCalledWith(
        mockWebsiteId,
        { widget_type: 'content_list', is_public: undefined },
        1,
        20
      );
    });

    it('should support filtering by is_public', async () => {
      mockEnhancedWidgetService.getWidgets.mockResolvedValue(mockWidgets);

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets?is_public=true`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockEnhancedWidgetService.getWidgets).toHaveBeenCalledWith(
        mockWebsiteId,
        { widget_type: undefined, is_public: true },
        1,
        20
      );
    });

    it('should support pagination', async () => {
      mockEnhancedWidgetService.getWidgets.mockResolvedValue(mockWidgets);

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets?page=2&limit=10`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockEnhancedWidgetService.getWidgets).toHaveBeenCalledWith(
        mockWebsiteId,
        { widget_type: undefined, is_public: undefined },
        2,
        10
      );
    });
  });

  describe('GET /api/websites/:websiteId/widgets/:widgetId', () => {
    it('should get a specific widget', async () => {
      mockEnhancedWidgetService.getWidget.mockResolvedValue(mockWidget);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.widget).toEqual(mockWidget);
      expect(mockEnhancedWidgetService.getWidget).toHaveBeenCalledWith(mockWidgetId, mockWebsiteId);
    });

    it('should return 404 for non-existent widget', async () => {
      mockEnhancedWidgetService.getWidget.mockRejectedValue({
        statusCode: 404,
        message: 'Widget not found',
      });

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/websites/:websiteId/widgets/:widgetId', () => {
    const updateData = {
      title: 'Updated Title',
      items_per_page: 15,
    };

    it('should update a widget successfully', async () => {
      const updatedWidget = { ...mockWidget, ...updateData };
      mockEnhancedWidgetService.updateWidget.mockResolvedValue(updatedWidget);

      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.widget.title).toBe('Updated Title');
      expect(mockEnhancedWidgetService.updateWidget).toHaveBeenCalledWith(
        mockWidgetId,
        mockWebsiteId,
        updateData
      );
    });

    it('should validate update data', async () => {
      const invalidData = {
        items_per_page: -1, // Invalid: must be positive
      };

      await request(app)
        .put(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /api/websites/:websiteId/widgets/:widgetId', () => {
    it('should delete a widget successfully', async () => {
      mockEnhancedWidgetService.getWidget.mockResolvedValue(mockWidget);
      mockEnhancedWidgetService.deleteWidget.mockResolvedValue(undefined);

      await request(app)
        .delete(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(204);

      expect(mockEnhancedWidgetService.deleteWidget).toHaveBeenCalledWith(mockWidgetId, mockWebsiteId);
    });
  });

  describe('GET /api/websites/:websiteId/widgets/:widgetId/embed-code', () => {
    it('should generate embed code', async () => {
      const embedCode = '<div>embed code</div>';
      mockEnhancedWidgetService.generateEmbedCode.mockResolvedValue(embedCode);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}/embed-code`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embedCode).toBe(embedCode);
    });
  });

  describe('GET /api/websites/:websiteId/widgets/:widgetId/analytics', () => {
    const mockAnalytics = {
      total_views: 100,
      total_clicks: 25,
      total_interactions: 5,
      views_by_day: [
        { date: '2024-01-01', count: 50 },
        { date: '2024-01-02', count: 50 },
      ],
      clicks_by_day: [
        { date: '2024-01-01', count: 15 },
        { date: '2024-01-02', count: 10 },
      ],
      top_referrers: [
        { referrer: 'google.com', count: 60 },
        { referrer: 'direct', count: 40 },
      ],
      popular_content: [
        { content_id: 'content1', title: 'Popular Article', clicks: 15 },
      ],
    };

    it('should get widget analytics', async () => {
      mockEnhancedWidgetService.getWidgetAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}/analytics`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analytics).toEqual(mockAnalytics);
    });

    it('should support custom date range', async () => {
      mockEnhancedWidgetService.getWidgetAnalytics.mockResolvedValue(mockAnalytics);

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}/analytics?days=7`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(mockEnhancedWidgetService.getWidgetAnalytics).toHaveBeenCalledWith(
        mockWidgetId,
        mockWebsiteId,
        7
      );
    });

    it('should check analytics permissions', async () => {
      (require('../services/team.service').teamService.hasPermission as jest.Mock)
        .mockImplementation((websiteId, userId, permission) => {
          return permission === 'view_analytics' ? false : true;
        });

      await request(app)
        .get(`/api/websites/${mockWebsiteId}/widgets/${mockWidgetId}/analytics`)
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);
    });
  });

  describe('GET /api/widgets/:widgetId/render (Public)', () => {
    const mockRenderResult = {
      html: '<div>widget content</div>',
      css: '.widget { color: blue; }',
      data: { items: [] },
      meta: { title: 'Widget Title' },
    };

    it('should render widget for public access', async () => {
      mockEnhancedWidgetService.renderWidget.mockResolvedValue(mockRenderResult);

      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRenderResult);
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should support pagination', async () => {
      mockEnhancedWidgetService.renderWidget.mockResolvedValue(mockRenderResult);

      await request(app)
        .get(`/api/widgets/${mockWidgetId}/render?page=2`)
        .expect(200);

      expect(mockEnhancedWidgetService.renderWidget).toHaveBeenCalledWith(mockWidgetId, {
        page: 2,
        search: undefined,
        referrer: undefined,
      });
    });

    it('should support search', async () => {
      mockEnhancedWidgetService.renderWidget.mockResolvedValue(mockRenderResult);

      await request(app)
        .get(`/api/widgets/${mockWidgetId}/render?search=test`)
        .expect(200);

      expect(mockEnhancedWidgetService.renderWidget).toHaveBeenCalledWith(mockWidgetId, {
        page: undefined,
        search: 'test',
        referrer: undefined,
      });
    });

    it('should handle domain restrictions', async () => {
      mockEnhancedWidgetService.renderWidget.mockRejectedValue({
        statusCode: 403,
        message: 'Domain not allowed',
      });

      await request(app)
        .get(`/api/widgets/${mockWidgetId}/render`)
        .expect(403);
    });
  });

  describe('POST /api/widgets/:widgetId/track (Public)', () => {
    const trackData = {
      event_type: 'click',
      event_data: { content_id: 'content1' },
      website_id: mockWebsiteId,
    };

    it('should track widget events', async () => {
      mockEnhancedWidgetService.trackWidgetEvent.mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/track`)
        .send(trackData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockEnhancedWidgetService.trackWidgetEvent).toHaveBeenCalledWith(
        mockWidgetId,
        mockWebsiteId,
        'click',
        { content_id: 'content1' },
        expect.objectContaining({
          referrer: undefined,
          userAgent: expect.any(String),
          ipAddress: expect.any(String),
        })
      );
    });

    it('should validate tracking data', async () => {
      const invalidData = {
        event_type: 'invalid_event',
        website_id: mockWebsiteId,
      };

      await request(app)
        .post(`/api/widgets/${mockWidgetId}/track`)
        .send(invalidData)
        .expect(400);
    });

    it('should require website_id', async () => {
      const invalidData = {
        event_type: 'click',
        // missing website_id
      };

      await request(app)
        .post(`/api/widgets/${mockWidgetId}/track`)
        .send(invalidData)
        .expect(400);
    });

    it('should gracefully handle tracking failures', async () => {
      mockEnhancedWidgetService.trackWidgetEvent.mockRejectedValue(new Error('Tracking failed'));

      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/track`)
        .send(trackData)
        .expect(200);

      // Should still return success to not break widget functionality
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/widgets/:widgetId/preview (Public)', () => {
    const mockRenderResult = {
      html: '<div>widget content</div>',
      css: '.widget { color: blue; }',
      data: { items: [] },
      meta: { title: 'Widget Title' },
    };

    it('should return HTML preview', async () => {
      mockEnhancedWidgetService.renderWidget.mockResolvedValue(mockRenderResult);

      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/preview`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('Widget Preview');
      expect(response.text).toContain('<div>widget content</div>');
      expect(response.text).toContain('.widget { color: blue; }');
    });
  });
});
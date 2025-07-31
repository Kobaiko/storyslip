import request from 'supertest';
import app from '../index';

// Mock all external dependencies
jest.mock('../config/supabase');
jest.mock('../services/widget-content-delivery.service');
jest.mock('../services/widget-optimization.service');
jest.mock('../utils/cdn');
jest.mock('ioredis');

describe('Enhanced Widget Delivery API', () => {
  const mockWidgetId = 'widget-123';

  const mockWidgetResponse = {
    html: '<div class="storyslip-widget">Test Content</div>',
    css: '.storyslip-widget { color: blue; }',
    data: {
      items: [
        { id: '1', title: 'Test Article', slug: 'test-article' }
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      hasMore: false,
    },
    meta: {
      title: 'Test Widget',
      description: 'Test Description',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': 'Test Widget',
      },
    },
    performance: {
      cacheHit: false,
      renderTime: 50,
      queryTime: 25,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock widget content delivery service
    const mockWidgetContentDeliveryService = require('../services/widget-content-delivery.service');
    mockWidgetContentDeliveryService.widgetContentDeliveryService = {
      deliverContent: jest.fn().mockResolvedValue(mockWidgetResponse),
      invalidateWidgetCache: jest.fn().mockResolvedValue(undefined),
    };

    // Mock widget optimization service
    const mockOptimizationService = require('../services/widget-optimization.service');
    mockOptimizationService.default = {
      optimizeCSSForViewport: jest.fn().mockReturnValue('.optimized { color: red; }'),
      calculatePerformanceScore: jest.fn().mockReturnValue({
        score: 85,
        breakdown: { renderTime: 25, queryTime: 20, cacheUtilization: 20, contentSize: 15, optimizations: 5 },
        recommendations: ['Enable caching'],
      }),
      generateAMPVersion: jest.fn().mockReturnValue({
        html: '<amp-img src="test.jpg" width="300" height="200"></amp-img>',
        css: '.amp-widget { color: green; }',
      }),
    };

    // Mock CDN utilities
    const mockCDNUtil = require('../utils/cdn');
    mockCDNUtil.CDNUtil = {
      getOptimalRegion: jest.fn().mockReturnValue('us-east-1'),
      supportsModernFormats: jest.fn().mockReturnValue({ webp: true, avif: false, brotli: true }),
      getCacheHeaders: jest.fn().mockReturnValue({ 'Cache-Control': 'public, max-age=300' }),
      generateETag: jest.fn().mockReturnValue('"test-etag"'),
      getSecurityHeaders: jest.fn().mockReturnValue({ 'X-Content-Type-Options': 'nosniff' }),
      shouldCompress: jest.fn().mockReturnValue(true),
      getPerformanceMetrics: jest.fn().mockReturnValue({
        cacheHitRate: 0.85,
        averageResponseTime: 45,
        bandwidthSaved: 0.70,
      }),
      purgeCacheByTag: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('GET /api/widgets/:widgetId/render-optimized', () => {
    it('should render optimized widget with default settings', async () => {
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.html).toBe('<div class="storyslip-widget">Test Content</div>');
      expect(response.body.data.css).toBe('.optimized { color: red; }'); // Optimized CSS
      expect(response.body.data.performance.score).toBe(85);
      expect(response.body.data.performance.region).toBe('us-east-1');
      
      // Check performance headers
      expect(response.headers['x-cache-status']).toBe('MISS');
      expect(response.headers['x-render-time']).toBe('50');
      expect(response.headers['x-performance-score']).toBe('85');
      expect(response.headers['x-region']).toBe('us-east-1');
    });

    it('should handle different output formats', async () => {
      // Test HTML format
      const htmlResponse = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized?format=html`)
        .expect(200);

      expect(htmlResponse.headers['content-type']).toContain('text/html');
      expect(htmlResponse.text).toBe('<div class="storyslip-widget">Test Content</div>');

      // Test CSS format
      const cssResponse = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized?format=css`)
        .expect(200);

      expect(cssResponse.headers['content-type']).toContain('text/css');
      expect(cssResponse.text).toBe('.optimized { color: red; }');
    });

    it('should generate AMP version', async () => {
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized?format=amp`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('<!doctype html>');
      expect(response.text).toContain('<html ⚡>');
      expect(response.text).toContain('<amp-img');
      expect(response.text).toContain('.amp-widget { color: green; }');
    });

    it('should handle viewport-specific optimization', async () => {
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized?viewport=mobile&optimize=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.css).toBe('.optimized { color: red; }');
      
      const mockOptimizationService = require('../services/widget-optimization.service');
      expect(mockOptimizationService.default.optimizeCSSForViewport).toHaveBeenCalledWith(
        '.storyslip-widget { color: blue; }',
        'mobile'
      );
    });

    it('should handle search and filtering parameters', async () => {
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized`)
        .query({
          page: 2,
          limit: 5,
          search: 'test query',
          category: 'category-123',
          tag: 'tag-456',
          sort: 'title_asc',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const mockWidgetContentDeliveryService = require('../services/widget-content-delivery.service');
      expect(mockWidgetContentDeliveryService.widgetContentDeliveryService.deliverContent).toHaveBeenCalledWith(
        mockWidgetId,
        expect.objectContaining({
          page: 2,
          limit: 5,
          search: 'test query',
          category: 'category-123',
          tag: 'tag-456',
          sort: 'title_asc',
        })
      );
    });

    it('should validate widget ID format', async () => {
      const response = await request(app)
        .get('/api/widgets/invalid-uuid/render-optimized')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid widget ID format');
    });

    it('should validate query parameters', async () => {
      // Invalid page number
      const response1 = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized?page=0`)
        .expect(400);

      expect(response1.body.success).toBe(false);

      // Invalid limit
      const response2 = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized?limit=100`)
        .expect(400);

      expect(response2.body.success).toBe(false);

      // Invalid format
      const response3 = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized?format=invalid`)
        .expect(400);

      expect(response3.body.success).toBe(false);

      // Invalid viewport
      const response4 = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized?viewport=invalid`)
        .expect(400);

      expect(response4.body.success).toBe(false);
    });

    it('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized`)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, OPTIONS');
      expect(response.headers['access-control-expose-headers']).toContain('X-Cache-Status');
    });
  });

  describe('GET /api/widgets/:widgetId/performance', () => {
    it('should return performance metrics', async () => {
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/performance`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('widgetId', mockWidgetId);
      expect(response.body.data).toHaveProperty('period', '7 days');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('optimization');
      expect(response.body.data).toHaveProperty('cdn');
      expect(response.body.data).toHaveProperty('recommendations');
      
      expect(response.body.data.performance).toHaveProperty('averageRenderTime');
      expect(response.body.data.performance).toHaveProperty('cacheHitRate');
      expect(response.body.data.performance).toHaveProperty('errorRate');
      expect(response.body.data.performance).toHaveProperty('throughput');
    });

    it('should handle custom time period', async () => {
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/performance?days=30`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('30 days');
    });

    it('should validate time period bounds', async () => {
      // Too short
      const response1 = await request(app)
        .get(`/api/widgets/${mockWidgetId}/performance?days=0`)
        .expect(400);

      expect(response1.body.success).toBe(false);

      // Too long
      const response2 = await request(app)
        .get(`/api/widgets/${mockWidgetId}/performance?days=100`)
        .expect(400);

      expect(response2.body.success).toBe(false);
    });
  });

  describe('POST /api/widgets/:widgetId/prefetch', () => {
    it('should prefetch multiple pages', async () => {
      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/prefetch?pages=1,2,3`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.widgetId).toBe(mockWidgetId);
      expect(response.body.data.prefetched).toHaveLength(3);
      expect(response.body.data.totalPages).toBe(3);
      
      expect(response.headers['x-prefetch-count']).toBe('3');
      
      const mockWidgetContentDeliveryService = require('../services/widget-content-delivery.service');
      expect(mockWidgetContentDeliveryService.widgetContentDeliveryService.deliverContent).toHaveBeenCalledTimes(3);
    });

    it('should handle default pages', async () => {
      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/prefetch`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.prefetched).toHaveLength(3); // Default: 1,2,3
    });

    it('should limit prefetch to 5 pages', async () => {
      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/prefetch?pages=1,2,3,4,5,6,7,8`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.prefetched).toHaveLength(5); // Limited to 5
    });

    it('should validate pages format', async () => {
      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/prefetch?pages=invalid`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/widgets/:widgetId/invalidate-cache', () => {
    it('should invalidate widget cache', async () => {
      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/invalidate-cache`)
        .send({ type: 'all' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.widgetId).toBe(mockWidgetId);
      expect(response.body.data.invalidated).toBe(true);
      expect(response.body.data.type).toBe('all');
      
      const mockWidgetContentDeliveryService = require('../services/widget-content-delivery.service');
      expect(mockWidgetContentDeliveryService.widgetContentDeliveryService.invalidateWidgetCache).toHaveBeenCalledWith(mockWidgetId);
      
      const mockCDNUtil = require('../utils/cdn');
      expect(mockCDNUtil.CDNUtil.purgeCacheByTag).toHaveBeenCalledWith([`widget:${mockWidgetId}`]);
    });

    it('should handle different cache types', async () => {
      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/invalidate-cache`)
        .send({ type: 'content' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('content');
    });

    it('should validate cache type', async () => {
      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/invalidate-cache`)
        .send({ type: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/widgets/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/widgets/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('version');
      
      expect(response.body.data.services).toHaveProperty('database', 'healthy');
      expect(response.body.data.services).toHaveProperty('cache', 'healthy');
      expect(response.body.data.services).toHaveProperty('cdn', 'healthy');
      
      // Should not cache health check
      expect(response.headers['cache-control']).toContain('no-cache');
    });
  });

  describe('Legacy compatibility', () => {
    it('should redirect legacy widget endpoint', async () => {
      const response = await request(app)
        .get(`/api/widget/${mockWidgetId}?page=2&search=test`)
        .expect(301);

      expect(response.headers.location).toBe(`/api/widgets/${mockWidgetId}/render-optimized?page=2&search=test`);
    });
  });

  describe('CORS preflight', () => {
    it('should handle OPTIONS requests', async () => {
      const response = await request(app)
        .options(`/api/widgets/${mockWidgetId}/render-optimized`)
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET, POST, OPTIONS');
      expect(response.headers['access-control-max-age']).toBe('86400');
    });
  });

  describe('Error handling', () => {
    it('should handle widget not found', async () => {
      const mockWidgetContentDeliveryService = require('../services/widget-content-delivery.service');
      mockWidgetContentDeliveryService.widgetContentDeliveryService.deliverContent.mockRejectedValue({
        statusCode: 404,
        message: 'Widget not found',
      });

      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Widget not found');
    });

    it('should handle domain restrictions', async () => {
      const mockWidgetContentDeliveryService = require('../services/widget-content-delivery.service');
      mockWidgetContentDeliveryService.widgetContentDeliveryService.deliverContent.mockRejectedValue({
        statusCode: 403,
        message: 'Domain not allowed',
      });

      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Domain not allowed');
    });

    it('should handle internal server errors', async () => {
      const mockWidgetContentDeliveryService = require('../services/widget-content-delivery.service');
      mockWidgetContentDeliveryService.widgetContentDeliveryService.deliverContent.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render-optimized`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Failed to render widget');
    });
  });
});
import request from 'supertest';
import { app } from '../index';
import { supabase } from '../config/supabase';
import { widgetContentDeliveryService } from '../services/widget-content-delivery.service';
import { widgetPerformanceMonitorService } from '../services/widget-performance-monitor.service';
import WidgetOptimizationService from '../services/widget-optimization.service';
import { CDNUtil } from '../utils/cdn';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../services/brand.service');
jest.mock('../utils/cdn');
jest.mock('ioredis');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Enhanced Widget Content Delivery', () => {
  let widgetId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    widgetId = 'widget-123';

    // Mock Redis
    const mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      zadd: jest.fn(),
      zcount: jest.fn(),
      zremrangebyscore: jest.fn(),
      expire: jest.fn(),
      hgetall: jest.fn(),
      hmset: jest.fn(),
    };

    require('ioredis').mockImplementation(() => mockRedis);
  });

  describe('Widget Content Delivery Service', () => {
    describe('deliverContent', () => {
      it('should deliver optimized widget content with caching', async () => {
        const mockWidget = {
          id: widgetId,
          website_id: 'website-123',
          widget_type: 'content_list',
          is_public: true,
          allowed_domains: [],
          items_per_page: 10,
          show_excerpts: true,
          show_images: true,
          show_authors: true,
          theme: 'default',
        };

        const mockContent = [
          {
            id: 'content-1',
            title: 'Test Article',
            slug: 'test-article',
            excerpt: 'This is a test article',
            featured_image_url: 'https://example.com/image.jpg',
            created_at: '2024-01-01T00:00:00Z',
            published_at: '2024-01-01T00:00:00Z',
            author: { name: 'John Doe', avatar_url: null },
          },
        ];

        const mockBrandConfig = {
          primary_color: '#3b82f6',
          secondary_color: '#1e40af',
          font_family: 'Inter, sans-serif',
          hide_storyslip_branding: false,
        };

        // Mock database queries
        mockSupabase.from.mockImplementation((table: string) => {
          const mockQuery = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            range: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
          };

          if (table === 'widget_configurations') {
            mockQuery.single.mockResolvedValue({ data: mockWidget, error: null });
          } else if (table === 'content') {
            mockQuery.single.mockResolvedValue({ 
              data: mockContent, 
              error: null, 
              count: mockContent.length 
            });
          }

          return mockQuery;
        });

        // Mock brand service
        const mockBrandService = require('../services/brand.service');
        mockBrandService.brandService.getBrandConfiguration.mockResolvedValue(mockBrandConfig);

        const result = await widgetContentDeliveryService.deliverContent(widgetId, {
          page: 1,
          limit: 10,
        });

        expect(result).toHaveProperty('html');
        expect(result).toHaveProperty('css');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('meta');
        expect(result).toHaveProperty('performance');
        expect(result.data.items).toHaveLength(1);
        expect(result.performance.renderTime).toBeGreaterThan(0);
      });

      it('should handle domain restrictions', async () => {
        const mockWidget = {
          id: widgetId,
          website_id: 'website-123',
          widget_type: 'content_list',
          is_public: true,
          allowed_domains: ['example.com'],
        };

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
        }));

        await expect(
          widgetContentDeliveryService.deliverContent(widgetId, {
            referrer: 'https://unauthorized.com',
          })
        ).rejects.toThrow('Domain not allowed');
      });

      it('should handle non-public widgets', async () => {
        const mockWidget = {
          id: widgetId,
          is_public: false,
        };

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockWidget, error: null }),
        }));

        await expect(
          widgetContentDeliveryService.deliverContent(widgetId)
        ).rejects.toThrow('Widget not found or not public');
      });
    });

    describe('cache management', () => {
      it('should invalidate widget cache', async () => {
        const mockRedis = require('ioredis')();
        mockRedis.keys.mockResolvedValue(['widget:widget-123:1', 'widget:widget-123:2']);
        mockRedis.del.mockResolvedValue(2);

        await widgetContentDeliveryService.invalidateWidgetCache(widgetId);

        expect(mockRedis.keys).toHaveBeenCalledWith('widget:widget-123:*');
        expect(mockRedis.del).toHaveBeenCalled();
      });

      it('should invalidate brand cache', async () => {
        const mockRedis = require('ioredis')();
        mockRedis.del.mockResolvedValue(1);
        mockRedis.keys.mockResolvedValue(['css:widget-1', 'css:widget-2']);

        await widgetContentDeliveryService.invalidateBrandCache('website-123');

        expect(mockRedis.del).toHaveBeenCalledWith('brand_config:website-123');
        expect(mockRedis.keys).toHaveBeenCalledWith('css:*');
      });
    });
  });

  describe('Widget Optimization Service', () => {
    describe('optimizeContent', () => {
      it('should optimize HTML and CSS content', async () => {
        const html = `
          <div class="widget">
            <h1>Title</h1>
            <p>Content with   extra   spaces</p>
            <img src="image.jpg" alt="Test">
          </div>
        `;

        const css = `
          .widget {
            color: red;
            background: white;
          }
          
          .widget h1 {
            font-size: 24px;
          }
        `;

        const result = await WidgetOptimizationService.optimizeContent(html, css, {
          minifyHTML: true,
          minifyCSS: true,
          enableLazyLoading: true,
        });

        expect(result.html.length).toBeLessThan(html.length);
        expect(result.css.length).toBeLessThan(css.length);
        expect(result.html).toContain('loading="lazy"');
        expect(result.performance.compressionRatio).toBeGreaterThan(0);
        expect(result.performance.optimizations).toContain('HTML minification');
        expect(result.performance.optimizations).toContain('CSS minification');
      });

      it('should extract critical CSS', async () => {
        const html = '<div class="storyslip-widget"><h1>Title</h1></div>';
        const css = `
          .storyslip-widget { color: blue; }
          .storyslip-item { color: red; }
          .footer { color: gray; }
        `;

        const result = await WidgetOptimizationService.optimizeContent(html, css, {
          inlineCriticalCSS: true,
        });

        expect(result.criticalCSS).toContain('.storyslip-widget');
        expect(result.css).not.toContain('.storyslip-widget');
      });

      it('should generate AMP version', () => {
        const html = `
          <div>
            <img src="image.jpg" width="300" height="200" alt="Test">
            <script>alert('test');</script>
          </div>
        `;
        const css = '.test { color: red; }';

        const result = WidgetOptimizationService.generateAMPVersion(html, css);

        expect(result.html).toContain('<amp-img');
        expect(result.html).not.toContain('<script>');
        expect(result.html).toContain('layout="responsive"');
      });
    });

    describe('calculatePerformanceScore', () => {
      it('should calculate performance score correctly', () => {
        const metrics = {
          renderTime: 150,
          queryTime: 30,
          cacheHit: true,
          contentSize: 25000,
          imageCount: 3,
          optimizations: ['minification', 'caching', 'cdn', 'lazy-loading'],
        };

        const result = WidgetOptimizationService.calculatePerformanceScore(metrics);

        expect(result.score).toBeGreaterThan(80); // Should be high score
        expect(result.breakdown).toHaveProperty('renderTime');
        expect(result.breakdown).toHaveProperty('queryTime');
        expect(result.breakdown).toHaveProperty('cacheUtilization');
        expect(result.breakdown).toHaveProperty('contentSize');
        expect(result.breakdown).toHaveProperty('optimizations');
        expect(result.recommendations).toBeInstanceOf(Array);
      });

      it('should provide recommendations for poor performance', () => {
        const metrics = {
          renderTime: 2000, // Very slow
          queryTime: 500,   // Slow query
          cacheHit: false,  // No cache
          contentSize: 500000, // Large content
          imageCount: 10,
          optimizations: [], // No optimizations
        };

        const result = WidgetOptimizationService.calculatePerformanceScore(metrics);

        expect(result.score).toBeLessThan(50); // Should be low score
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.recommendations.some(r => r.includes('render time'))).toBe(true);
        expect(result.recommendations.some(r => r.includes('caching'))).toBe(true);
      });
    });
  });

  describe('Widget Performance Monitor Service', () => {
    describe('recordMetric', () => {
      it('should record performance metric', async () => {
        const metric = {
          widgetId,
          timestamp: '2024-01-01T00:00:00Z',
          renderTime: 150,
          queryTime: 30,
          cacheHit: true,
          contentSize: 25000,
          imageCount: 2,
          errorCount: 0,
          userAgent: 'Mozilla/5.0...',
          region: 'us-east-1',
          viewport: 'desktop',
          referrer: 'https://example.com',
        };

        mockSupabase.from.mockImplementation(() => ({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }));

        await widgetPerformanceMonitorService.recordMetric(metric);

        expect(mockSupabase.from).toHaveBeenCalledWith('widget_performance_metrics');
      });
    });

    describe('getPerformanceAnalytics', () => {
      it('should return performance analytics', async () => {
        const mockMetrics = [
          {
            widget_id: widgetId,
            timestamp: '2024-01-01T00:00:00Z',
            render_time: 100,
            query_time: 20,
            cache_hit: true,
            error_count: 0,
            referrer: 'https://example.com',
          },
          {
            widget_id: widgetId,
            timestamp: '2024-01-01T01:00:00Z',
            render_time: 150,
            query_time: 30,
            cache_hit: false,
            error_count: 0,
            referrer: 'https://test.com',
          },
        ];

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockMetrics, error: null }),
        }));

        const result = await widgetPerformanceMonitorService.getPerformanceAnalytics(widgetId, '24h');

        expect(result.widgetId).toBe(widgetId);
        expect(result.period).toBe('24h');
        expect(result.metrics.totalRequests).toBe(2);
        expect(result.metrics.averageRenderTime).toBe(125);
        expect(result.metrics.cacheHitRate).toBe(0.5);
        expect(result.metrics.uniqueVisitors).toBe(2);
        expect(result.trends).toHaveProperty('renderTime');
        expect(result.breakdown).toHaveProperty('byRegion');
        expect(result.recommendations).toBeInstanceOf(Array);
      });

      it('should handle empty metrics', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }));

        const result = await widgetPerformanceMonitorService.getPerformanceAnalytics(widgetId, '24h');

        expect(result.metrics.totalRequests).toBe(0);
        expect(result.metrics.averageRenderTime).toBe(0);
        expect(result.recommendations).toContain('No data available for the selected period');
      });
    });

    describe('getRealTimeMetrics', () => {
      it('should return real-time metrics', async () => {
        const mockRedis = require('ioredis')();
        mockRedis.hgetall.mockResolvedValue({
          avgRenderTime: '120',
          cacheHitRate: '0.8',
          errorRate: '0.02',
          activeConnections: '5',
          queueLength: '2',
        });
        mockRedis.zcount.mockResolvedValue(150); // 150 requests in 5 minutes

        const result = await widgetPerformanceMonitorService.getRealTimeMetrics(widgetId);

        expect(result.widgetId).toBe(widgetId);
        expect(result.currentRPS).toBe(0.5); // 150 requests / 300 seconds
        expect(result.averageRenderTime).toBe(120);
        expect(result.cacheHitRate).toBe(0.8);
        expect(result.systemHealth).toMatch(/healthy|warning|critical/);
      });
    });
  });

  describe('API Endpoints', () => {
    describe('GET /api/widgets/:widgetId/render-optimized', () => {
      it('should render optimized widget', async () => {
        const mockResult = {
          html: '<div class="storyslip-widget">Content</div>',
          css: '.storyslip-widget { color: blue; }',
          data: {
            items: [{ id: '1', title: 'Test' }],
            total: 1,
            page: 1,
            totalPages: 1,
            hasMore: false,
          },
          meta: { title: 'Test Widget' },
          performance: {
            cacheHit: false,
            renderTime: 85,
            queryTime: 25,
          },
        };

        jest.spyOn(widgetContentDeliveryService, 'deliverContent').mockResolvedValue(mockResult);
        jest.spyOn(widgetPerformanceMonitorService, 'recordMetric').mockResolvedValue();

        const response = await request(app)
          .get(`/api/widgets/${widgetId}/render-optimized`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('html');
        expect(response.body.data).toHaveProperty('css');
        expect(response.body.data).toHaveProperty('performance');
        expect(response.headers['x-cache-status']).toBe('MISS');
        expect(response.headers['x-render-time']).toBe('85');
      });

      it('should return HTML format when requested', async () => {
        const mockResult = {
          html: '<div class="storyslip-widget">Content</div>',
          css: '.storyslip-widget { color: blue; }',
          data: { items: [] },
          meta: {},
          performance: { cacheHit: false, renderTime: 85, queryTime: 25 },
        };

        jest.spyOn(widgetContentDeliveryService, 'deliverContent').mockResolvedValue(mockResult);
        jest.spyOn(widgetPerformanceMonitorService, 'recordMetric').mockResolvedValue();

        const response = await request(app)
          .get(`/api/widgets/${widgetId}/render-optimized`)
          .query({ format: 'html' })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/html');
        expect(response.text).toBe('<div class="storyslip-widget">Content</div>');
      });

      it('should return CSS format when requested', async () => {
        const mockResult = {
          html: '<div>Content</div>',
          css: '.storyslip-widget { color: blue; }',
          data: { items: [] },
          meta: {},
          performance: { cacheHit: false, renderTime: 85, queryTime: 25 },
        };

        jest.spyOn(widgetContentDeliveryService, 'deliverContent').mockResolvedValue(mockResult);
        jest.spyOn(widgetPerformanceMonitorService, 'recordMetric').mockResolvedValue();

        const response = await request(app)
          .get(`/api/widgets/${widgetId}/render-optimized`)
          .query({ format: 'css' })
          .expect(200);

        expect(response.headers['content-type']).toContain('text/css');
        expect(response.text).toBe('.storyslip-widget { color: blue; }');
      });
    });

    describe('GET /api/widgets/:widgetId/performance', () => {
      it('should return performance analytics', async () => {
        const mockAnalytics = {
          widgetId,
          period: '24h',
          metrics: {
            averageRenderTime: 125,
            p95RenderTime: 200,
            cacheHitRate: 0.8,
            errorRate: 0.02,
            throughput: 10.5,
            totalRequests: 1000,
            uniqueVisitors: 150,
          },
          trends: {
            renderTime: [{ timestamp: '2024-01-01T00:00:00Z', value: 120 }],
            cacheHitRate: [{ timestamp: '2024-01-01T00:00:00Z', value: 0.8 }],
            errorRate: [{ timestamp: '2024-01-01T00:00:00Z', value: 0.02 }],
            throughput: [{ timestamp: '2024-01-01T00:00:00Z', value: 10 }],
          },
          breakdown: {
            byRegion: { 'us-east-1': { requests: 500, avgRenderTime: 120 } },
            byViewport: { desktop: { requests: 800, avgRenderTime: 115 } },
            byReferrer: { 'example.com': { requests: 600, avgRenderTime: 125 } },
          },
          recommendations: ['Performance is within acceptable ranges'],
        };

        jest.spyOn(widgetPerformanceMonitorService, 'getPerformanceAnalytics')
          .mockResolvedValue(mockAnalytics);

        const response = await request(app)
          .get(`/api/widgets/${widgetId}/performance`)
          .query({ period: '24h' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.widgetId).toBe(widgetId);
        expect(response.body.data.metrics.averageRenderTime).toBe(125);
        expect(response.body.data.trends).toHaveProperty('renderTime');
        expect(response.body.data.breakdown).toHaveProperty('byRegion');
      });
    });

    describe('GET /api/widgets/:widgetId/realtime-metrics', () => {
      it('should return real-time metrics', async () => {
        const mockRealTimeMetrics = {
          widgetId,
          currentRPS: 2.5,
          averageRenderTime: 120,
          cacheHitRate: 0.85,
          errorRate: 0.01,
          activeConnections: 15,
          queueLength: 3,
          systemHealth: 'healthy' as const,
        };

        jest.spyOn(widgetPerformanceMonitorService, 'getRealTimeMetrics')
          .mockResolvedValue(mockRealTimeMetrics);

        const response = await request(app)
          .get(`/api/widgets/${widgetId}/realtime-metrics`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.currentRPS).toBe(2.5);
        expect(response.body.data.systemHealth).toBe('healthy');
        expect(response.headers['x-system-health']).toBe('healthy');
      });
    });

    describe('POST /api/widgets/:widgetId/track', () => {
      it('should track usage event', async () => {
        mockSupabase.from.mockImplementation(() => ({
          insert: jest.fn().mockResolvedValue({ error: null }),
        }));

        const response = await request(app)
          .post(`/api/widgets/${widgetId}/track`)
          .send({
            eventType: 'view',
            eventData: { section: 'header' },
            userSessionId: 'session-123',
            pageUrl: 'https://example.com/page',
            viewportWidth: 1920,
            viewportHeight: 1080,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.tracked).toBe(true);
      });

      it('should handle tracking errors gracefully', async () => {
        mockSupabase.from.mockImplementation(() => ({
          insert: jest.fn().mockResolvedValue({ error: new Error('Database error') }),
        }));

        const response = await request(app)
          .post(`/api/widgets/${widgetId}/track`)
          .send({
            eventType: 'click',
            eventData: {},
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.tracked).toBe(false);
      });
    });
  });

  describe('CDN Integration', () => {
    beforeEach(() => {
      (CDNUtil.getOptimalRegion as jest.Mock).mockReturnValue('us-east-1');
      (CDNUtil.supportsModernFormats as jest.Mock).mockReturnValue({
        webp: true,
        avif: false,
        brotli: true,
      });
      (CDNUtil.getCacheHeaders as jest.Mock).mockReturnValue({
        'Cache-Control': 'public, max-age=300',
      });
      (CDNUtil.generateETag as jest.Mock).mockReturnValue('"abc123"');
      (CDNUtil.getSecurityHeaders as jest.Mock).mockReturnValue({
        'X-Content-Type-Options': 'nosniff',
      });
    });

    it('should set appropriate CDN headers', async () => {
      const mockResult = {
        html: '<div>Content</div>',
        css: '.test { color: red; }',
        data: { items: [] },
        meta: {},
        performance: { cacheHit: true, renderTime: 45, queryTime: 15 },
      };

      jest.spyOn(widgetContentDeliveryService, 'deliverContent').mockResolvedValue(mockResult);
      jest.spyOn(widgetPerformanceMonitorService, 'recordMetric').mockResolvedValue();

      const response = await request(app)
        .get(`/api/widgets/${widgetId}/render-optimized`)
        .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8')
        .expect(200);

      expect(response.headers['x-cache-status']).toBe('HIT');
      expect(response.headers['x-region']).toBe('us-east-1');
      expect(response.headers['etag']).toBe('"abc123"');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
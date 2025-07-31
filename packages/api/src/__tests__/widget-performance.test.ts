import request from 'supertest';
import { app } from '../server';
import { widgetContentDeliveryService } from '../services/widget-content-delivery.service';
import { performance } from 'perf_hooks';

// Mock dependencies
jest.mock('../services/widget-content-delivery.service');

const mockWidgetContentDeliveryService = widgetContentDeliveryService as jest.Mocked<typeof widgetContentDeliveryService>;

describe('Widget Performance Tests', () => {
  const mockWidgetId = '123e4567-e89b-12d3-a456-426614174002';

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
    },
    performance: {
      cacheHit: false,
      renderTime: 50,
      queryTime: 25,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Widget Rendering Performance', () => {
    it('should render widget within acceptable time limits', async () => {
      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(mockWidgetResponse);

      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Response should be under 500ms
      expect(responseTime).toBeLessThan(500);
      
      // Check performance headers
      expect(response.headers['x-cache-status']).toBe('MISS');
      expect(response.headers['x-render-time']).toBe('50');
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.performance.renderTime).toBe(50);
    });

    it('should handle cached responses faster', async () => {
      const cachedResponse = {
        ...mockWidgetResponse,
        performance: {
          cacheHit: true,
          renderTime: 10,
          queryTime: 0,
        },
      };

      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(cachedResponse);

      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Cached response should be even faster
      expect(responseTime).toBeLessThan(200);
      
      // Check cache headers
      expect(response.headers['x-cache-status']).toBe('HIT');
      expect(response.headers['cache-control']).toContain('max-age=300');
      
      expect(response.body.data.performance.cacheHit).toBe(true);
      expect(response.body.data.performance.renderTime).toBe(10);
    });

    it('should handle multiple concurrent requests efficiently', async () => {
      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(mockWidgetResponse);

      const concurrentRequests = 10;
      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(app).get(`/api/widgets/${mockWidgetId}/render`)
      );

      const startTime = performance.now();
      const responses = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Average response time should be reasonable under load
      expect(averageTime).toBeLessThan(1000);
    });

    it('should handle pagination efficiently', async () => {
      const paginatedResponse = {
        ...mockWidgetResponse,
        data: {
          ...mockWidgetResponse.data,
          items: Array(20).fill(null).map((_, i) => ({
            id: `item-${i}`,
            title: `Article ${i}`,
            slug: `article-${i}`,
          })),
          total: 100,
          page: 2,
          totalPages: 5,
          hasMore: true,
        },
      };

      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(paginatedResponse);

      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render?page=2&limit=20`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Paginated response should still be fast
      expect(responseTime).toBeLessThan(600);
      
      expect(response.body.data.data.page).toBe(2);
      expect(response.body.data.data.items).toHaveLength(20);
      expect(response.body.data.data.hasMore).toBe(true);
    });

    it('should handle search queries efficiently', async () => {
      const searchResponse = {
        ...mockWidgetResponse,
        data: {
          ...mockWidgetResponse.data,
          items: [
            { id: '1', title: 'JavaScript Tutorial', slug: 'javascript-tutorial' },
            { id: '2', title: 'Advanced JavaScript', slug: 'advanced-javascript' },
          ],
          total: 2,
        },
      };

      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(searchResponse);

      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render?search=javascript`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Search should be reasonably fast
      expect(responseTime).toBeLessThan(800);
      
      expect(response.body.data.data.items).toHaveLength(2);
      expect(mockWidgetContentDeliveryService.deliverContent).toHaveBeenCalledWith(
        mockWidgetId,
        expect.objectContaining({
          search: 'javascript',
        })
      );
    });
  });

  describe('Widget Preview Performance', () => {
    it('should render preview page within acceptable time', async () => {
      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(mockWidgetResponse);

      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/preview`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Preview should be fast
      expect(responseTime).toBeLessThan(600);
      
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('Widget Preview');
      expect(response.text).toContain('Test Content');
      expect(response.text).toContain('Performance:');
    });
  });

  describe('Widget Tracking Performance', () => {
    it('should handle tracking events quickly', async () => {
      const trackingData = {
        event_type: 'click',
        event_data: { content_id: 'content-1' },
        website_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const startTime = performance.now();
      
      const response = await request(app)
        .post(`/api/widgets/${mockWidgetId}/track`)
        .send(trackingData)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Tracking should be very fast
      expect(responseTime).toBeLessThan(200);
      
      expect(response.body.success).toBe(true);
    });

    it('should handle high volume tracking efficiently', async () => {
      const trackingData = {
        event_type: 'view',
        event_data: { page: 1 },
        website_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const concurrentTracks = 50;
      const promises = Array(concurrentTracks).fill(null).map(() =>
        request(app)
          .post(`/api/widgets/${mockWidgetId}/track`)
          .send(trackingData)
      );

      const startTime = performance.now();
      const responses = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentTracks;

      // All tracking requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Average tracking time should be very fast
      expect(averageTime).toBeLessThan(100);
    });
  });

  describe('Response Size Optimization', () => {
    it('should return appropriately sized responses', async () => {
      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(mockWidgetResponse);

      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render`)
        .expect(200);

      const responseSize = JSON.stringify(response.body).length;
      
      // Response should be reasonably sized (under 100KB for typical content)
      expect(responseSize).toBeLessThan(100000);
      
      // Should include essential data
      expect(response.body.data.html).toBeDefined();
      expect(response.body.data.css).toBeDefined();
      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.meta).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
    });

    it('should compress CSS efficiently', async () => {
      const responseWithLargeCSS = {
        ...mockWidgetResponse,
        css: `
          .storyslip-widget { 
            font-family: Arial, sans-serif; 
            color: #333; 
            background: #fff; 
            padding: 16px; 
            margin: 0; 
            border-radius: 8px; 
          }
          .storyslip-item { 
            margin-bottom: 24px; 
            padding-bottom: 24px; 
            border-bottom: 1px solid #eee; 
          }
          .storyslip-item-title { 
            font-size: 18px; 
            font-weight: 600; 
            margin: 0 0 8px 0; 
          }
        `,
      };

      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(responseWithLargeCSS);

      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render`)
        .expect(200);

      // CSS should be present but optimized
      expect(response.body.data.css).toBeDefined();
      expect(response.body.data.css.length).toBeGreaterThan(0);
      
      // Should not contain excessive whitespace (indicating minification)
      expect(response.body.data.css).not.toMatch(/\s{2,}/);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors quickly without hanging', async () => {
      mockWidgetContentDeliveryService.deliverContent.mockRejectedValue(
        new Error('Service unavailable')
      );

      const startTime = performance.now();
      
      const response = await request(app)
        .get(`/api/widgets/${mockWidgetId}/render`)
        .expect(500);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Error responses should be fast
      expect(responseTime).toBeLessThan(300);
      
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid widget IDs quickly', async () => {
      const startTime = performance.now();
      
      const response = await request(app)
        .get('/api/widgets/invalid-id/render')
        .expect(400);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Validation errors should be very fast
      expect(responseTime).toBeLessThan(100);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid widget ID format');
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during multiple requests', async () => {
      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(mockWidgetResponse);

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make multiple requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get(`/api/widgets/${mockWidgetId}/render`)
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limiting efficiently', async () => {
      mockWidgetContentDeliveryService.deliverContent.mockResolvedValue(mockWidgetResponse);

      // Make requests up to the rate limit
      const requests = Array(200).fill(null).map(() =>
        request(app).get(`/api/widgets/${mockWidgetId}/render`)
      );

      const startTime = performance.now();
      const responses = await Promise.allSettled(requests);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;

      // Should handle rate limiting without excessive delays
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
      
      // Some requests should succeed, some might be rate limited
      const successfulRequests = responses.filter(
        result => result.status === 'fulfilled' && (result.value as any).status === 200
      );
      
      expect(successfulRequests.length).toBeGreaterThan(0);
    });
  });
});
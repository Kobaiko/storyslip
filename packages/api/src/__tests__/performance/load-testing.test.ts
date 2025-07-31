import request from 'supertest';
import { app } from '../../index';
import { performance } from 'perf_hooks';

// Mock external dependencies for performance testing
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ data: {}, error: null }),
  },
}));

jest.mock('../../services/email.service', () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Performance and Load Testing', () => {
  const authToken = 'Bearer mock-jwt-token';
  const websiteId = 'website-123';
  const apiKey = 'sk_test_123';

  beforeEach(() => {
    // Mock authenticated user
    (global as any).mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };
  });

  describe('Response Time Tests', () => {
    it('should respond to health check within 100ms', async () => {
      const start = performance.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(100);
    });

    it('should respond to authentication within 500ms', async () => {
      const start = performance.now();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(500);
    });

    it('should respond to content listing within 300ms', async () => {
      const start = performance.now();
      
      await request(app)
        .get(`/api/websites/${websiteId}/content`)
        .set('Authorization', authToken)
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(300);
    });

    it('should respond to widget content within 200ms', async () => {
      const start = performance.now();
      
      await request(app)
        .get(`/api/widget/${websiteId}/content`)
        .set('X-API-Key', apiKey)
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(200);
    });

    it('should respond to analytics tracking within 150ms', async () => {
      const start = performance.now();
      
      await request(app)
        .post('/api/analytics/track')
        .send({
          website_id: websiteId,
          content_id: 'content-123',
          event_type: 'page_view',
          user_agent: 'Test Browser',
        })
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(150);
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle 50 concurrent health checks', async () => {
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/health')
      );

      const start = performance.now();
      const responses = await Promise.all(requests);
      const end = performance.now();

      const totalTime = end - start;
      const avgResponseTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(200);
    });

    it('should handle 20 concurrent widget requests', async () => {
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .get(`/api/widget/${websiteId}/content`)
          .set('X-API-Key', apiKey)
      );

      const start = performance.now();
      const responses = await Promise.all(requests);
      const end = performance.now();

      const totalTime = end - start;
      const avgResponseTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(300);
    });

    it('should handle 10 concurrent analytics tracking requests', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app)
          .post('/api/analytics/track')
          .send({
            website_id: websiteId,
            content_id: 'content-123',
            event_type: 'page_view',
            user_agent: 'Test Browser',
          })
      );

      const start = performance.now();
      const responses = await Promise.all(requests);
      const end = performance.now();

      const totalTime = end - start;
      const avgResponseTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(200);
    });

    it('should handle mixed concurrent requests', async () => {
      const requests = [
        ...Array.from({ length: 10 }, () => request(app).get('/health')),
        ...Array.from({ length: 5 }, () =>
          request(app)
            .get(`/api/widget/${websiteId}/content`)
            .set('X-API-Key', apiKey)
        ),
        ...Array.from({ length: 5 }, () =>
          request(app)
            .post('/api/analytics/track')
            .send({
              website_id: websiteId,
              content_id: 'content-123',
              event_type: 'page_view',
              user_agent: 'Test Browser',
            })
        ),
      ];

      const start = performance.now();
      const responses = await Promise.all(requests);
      const end = performance.now();

      const totalTime = end - start;
      const avgResponseTime = totalTime / requests.length;

      // All requests should succeed
      responses.forEach(response => {
        expect([200, 201].includes(response.status)).toBe(true);
      });

      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(400);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await request(app).get('/health');
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large payloads efficiently', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB content
      
      const start = performance.now();
      
      const response = await request(app)
        .post(`/api/websites/${websiteId}/content`)
        .set('Authorization', authToken)
        .send({
          title: 'Large Content Test',
          content: largeContent,
          status: 'draft',
        });
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(1000); // Should handle large content within 1 second
    });
  });

  describe('Database Connection Pool Tests', () => {
    it('should handle multiple simultaneous database operations', async () => {
      const operations = [
        request(app)
          .get(`/api/websites/${websiteId}/content`)
          .set('Authorization', authToken),
        request(app)
          .get(`/api/websites/${websiteId}/analytics`)
          .set('Authorization', authToken),
        request(app)
          .get(`/api/websites`)
          .set('Authorization', authToken),
        request(app)
          .get(`/api/widget/${websiteId}/content`)
          .set('X-API-Key', apiKey),
        request(app)
          .get(`/api/widget/${websiteId}/branding`)
          .set('X-API-Key', apiKey),
      ];

      const start = performance.now();
      const responses = await Promise.all(operations);
      const end = performance.now();

      const totalTime = end - start;
      const avgResponseTime = totalTime / operations.length;

      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(500);
    });
  });

  describe('Stress Tests', () => {
    it('should maintain performance under sustained load', async () => {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      const responses: any[] = [];
      
      while (Date.now() - startTime < duration) {
        const response = await request(app).get('/health');
        responses.push(response);
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle at least 100 requests in 5 seconds
      expect(responses.length).toBeGreaterThan(100);
    });

    it('should recover gracefully from high load', async () => {
      // Create high load
      const highLoadRequests = Array.from({ length: 100 }, () =>
        request(app).get('/health')
      );

      await Promise.all(highLoadRequests);

      // Test recovery with normal requests
      const recoveryRequests = Array.from({ length: 5 }, () =>
        request(app).get('/health')
      );

      const responses = await Promise.all(recoveryRequests);

      // All recovery requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Resource Cleanup Tests', () => {
    it('should clean up resources after request completion', async () => {
      const initialHandles = process._getActiveHandles().length;
      
      // Make several requests
      await Promise.all([
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health'),
      ]);

      // Allow time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalHandles = process._getActiveHandles().length;
      
      // Should not accumulate handles
      expect(finalHandles).toBeLessThanOrEqual(initialHandles + 2);
    });
  });
});
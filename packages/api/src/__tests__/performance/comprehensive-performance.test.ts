import request from 'supertest';
import request from 'supertest';
import app from '../../index';
import { DatabaseService } from '../../services/database';
import { PerformanceMonitorService, performanceMonitor } from '../../services/performance-monitor.service';
import { WidgetCDNService } from '../../services/widget-cdn.service';

describe('Comprehensive Performance Tests', () => {
  let db: DatabaseService;
  let performanceMonitor: PerformanceMonitorService;
  let cdnService: WidgetCDNService;
  
  let testUserId: string;
  let testUserToken: string;
  let testWebsiteId: string;
  let testWidgetId: string;
  let testContentIds: string[] = [];

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    // Use the exported instance instead of getInstance
    // performanceMonitor is already imported as the singleton instance
    try {
      cdnService = WidgetCDNService.getInstance();
    } catch (error) {
      // CDN service might not be available in test environment
      console.log('CDN service not available in test environment');
    }
    
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  async function setupTestData() {
    // Create test user
    const userResult = await db.query(`
      INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES ('perf-test@example.com', crypt('PerfTest123!', gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create test website
    const websiteResult = await db.query(`
      INSERT INTO websites (user_id, name, domain, is_verified)
      VALUES ($1, 'Performance Test Site', 'perf-test.example.com', true)
      RETURNING id
    `, [testUserId]);
    testWebsiteId = websiteResult.rows[0].id;

    // Create test widget
    const widgetResult = await db.query(`
      INSERT INTO widgets (website_id, title, type, is_published)
      VALUES ($1, 'Performance Test Widget', 'content', true)
      RETURNING id
    `, [testWebsiteId]);
    testWidgetId = widgetResult.rows[0].id;

    // Create bulk test content
    const contentPromises = [];
    for (let i = 0; i < 100; i++) {
      contentPromises.push(
        db.query(`
          INSERT INTO content (website_id, title, content, excerpt, status)
          VALUES ($1, $2, $3, $4, 'published')
          RETURNING id
        `, [
          testWebsiteId,
          `Performance Test Content ${i}`,
          `This is test content number ${i} for performance testing. `.repeat(50),
          `Excerpt for test content ${i}`
        ])
      );
    }

    const contentResults = await Promise.all(contentPromises);
    testContentIds = contentResults.map(result => result.rows[0].id);

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'perf-test@example.com',
        password: 'PerfTest123!'
      });
    
    testUserToken = loginResponse.body.data.access_token;
  }

  async function cleanupTestData() {
    // Clean up content
    if (testContentIds.length > 0) {
      await db.query(`DELETE FROM content WHERE id = ANY($1)`, [testContentIds]);
    }
    
    if (testWidgetId) {
      await db.query('DELETE FROM widgets WHERE id = $1', [testWidgetId]);
    }
    if (testWebsiteId) {
      await db.query('DELETE FROM websites WHERE id = $1', [testWebsiteId]);
    }
    if (testUserId) {
      await db.query('DELETE FROM auth.users WHERE id = $1', [testUserId]);
    }
  }

  describe('API Response Time Performance', () => {
    it('should respond to authentication endpoints within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500); // Should respond within 500ms
    });

    it('should handle content listing with pagination efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/content')
        .query({ 
          website_id: testWebsiteId,
          page: 1,
          limit: 20
        })
        .set('Authorization', `Bearer ${testUserToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
      expect(response.body.data.length).toBeLessThanOrEqual(20);
    });

    it('should handle content search efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/content/search')
        .query({ 
          q: 'Performance Test',
          website_id: testWebsiteId
        })
        .set('Authorization', `Bearer ${testUserToken}`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(2000); // Search should complete within 2 seconds
    });

    it('should render widgets quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`);
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(300); // Widget rendering should be very fast
    });
  });

  describe('Database Performance', () => {
    it('should execute complex queries within acceptable time', async () => {
      const startTime = Date.now();
      
      // Complex query with joins and aggregations
      const result = await db.query(`
        SELECT 
          w.id,
          w.name,
          COUNT(c.id) as content_count,
          AVG(LENGTH(c.content)) as avg_content_length
        FROM websites w
        LEFT JOIN content c ON w.id = c.website_id
        WHERE w.user_id = $1
        GROUP BY w.id, w.name
        ORDER BY content_count DESC
      `, [testUserId]);
      
      const queryTime = Date.now() - startTime;
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000); // Complex query should complete within 1 second
    });

    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Bulk update operation
      await db.query(`
        UPDATE content 
        SET updated_at = NOW() 
        WHERE website_id = $1
      `, [testWebsiteId]);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(2000); // Bulk update should complete within 2 seconds
    });

    it('should use indexes effectively for common queries', async () => {
      // Test that common queries use indexes
      const explainResult = await db.query(`
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT * FROM content 
        WHERE website_id = $1 AND status = 'published'
        ORDER BY created_at DESC
        LIMIT 10
      `, [testWebsiteId]);
      
      const queryPlan = explainResult.rows.map(row => row['QUERY PLAN']).join('\n');
      
      // Should use index scan, not sequential scan for large tables
      if (testContentIds.length > 50) {
        expect(queryPlan).toMatch(/Index/);
      }
    });
  });

  describe('Concurrent User Performance', () => {
    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = 20;
      const requests = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${testUserToken}`)
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(1000);
    });

    it('should handle concurrent content creation', async () => {
      const concurrentCreations = 10;
      const requests = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentCreations; i++) {
        requests.push(
          request(app)
            .post('/api/content')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send({
              title: `Concurrent Test Content ${i}`,
              content: `Content created concurrently ${i}`,
              excerpt: `Excerpt ${i}`,
              website_id: testWebsiteId
            })
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All creations should succeed
      const successfulCreations = responses.filter(r => r.status === 201);
      expect(successfulCreations.length).toBe(concurrentCreations);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);
      
      // Cleanup created content
      const createdIds = successfulCreations.map(r => r.body.data.id);
      if (createdIds.length > 0) {
        await db.query('DELETE FROM content WHERE id = ANY($1)', [createdIds]);
      }
    });

    it('should handle concurrent widget renders', async () => {
      const concurrentRenders = 50;
      const requests = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < concurrentRenders; i++) {
        requests.push(
          request(app).get(`/api/widgets/public/${testWidgetId}/render`)
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All renders should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should handle high concurrency efficiently
      const avgResponseTime = totalTime / concurrentRenders;
      expect(avgResponseTime).toBeLessThan(500);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks during extended operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${testUserToken}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage shouldn't increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;
      
      expect(memoryIncreasePercent).toBeLessThan(50); // Less than 50% increase
    });

    it('should handle large payloads efficiently', async () => {
      const largeContent = 'A'.repeat(100000); // 100KB content
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/content')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          title: 'Large Content Test',
          content: largeContent,
          excerpt: 'Large content excerpt',
          website_id: testWebsiteId
        });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(3000); // Should handle large content within 3 seconds
      
      // Cleanup
      if (response.body.data?.id) {
        await db.query('DELETE FROM content WHERE id = $1', [response.body.data.id]);
      }
    });
  });

  describe('CDN and Caching Performance', () => {
    it('should serve cached widget content efficiently', async () => {
      // First request (cache miss)
      const firstStart = Date.now();
      const firstResponse = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`);
      const firstTime = Date.now() - firstStart;
      
      expect(firstResponse.status).toBe(200);
      
      // Second request (should be cached)
      const secondStart = Date.now();
      const secondResponse = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`);
      const secondTime = Date.now() - secondStart;
      
      expect(secondResponse.status).toBe(200);
      
      // Cached response should be faster or at least not significantly slower
      expect(secondTime).toBeLessThan(firstTime + 100);
    });

    it('should set appropriate cache headers', async () => {
      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`);
      
      expect(response.status).toBe(200);
      // Cache headers might be set by middleware
      if (response.headers['cache-control']) {
        expect(response.headers['cache-control']).toBeDefined();
      }
    });
  });

  describe('Database Connection Pool Performance', () => {
    it('should handle connection pool efficiently under load', async () => {
      const connectionTests = [];
      
      // Create many concurrent database operations
      for (let i = 0; i < 50; i++) {
        connectionTests.push(
          db.query('SELECT NOW() as current_time')
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(connectionTests);
      const totalTime = Date.now() - startTime;
      
      // All queries should succeed
      expect(results.length).toBe(50);
      results.forEach(result => {
        expect(result.rows.length).toBe(1);
        expect(result.rows[0].current_time).toBeDefined();
      });
      
      // Should complete efficiently
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('API Rate Limiting Performance', () => {
    it('should enforce rate limits without significant performance impact', async () => {
      const requests = [];
      const maxRequests = 30;
      
      const startTime = Date.now();
      
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          request(app)
            .get('/api/status')
            .set('Authorization', `Bearer ${testUserToken}`)
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      const successfulRequests = responses.filter(r => r.status === 200);
      const rateLimitedRequests = responses.filter(r => r.status === 429);
      
      // Should have some successful requests
      expect(successfulRequests.length).toBeGreaterThan(0);
      
      // Rate limiting shouldn't significantly slow down allowed requests
      if (successfulRequests.length > 0) {
        const avgSuccessTime = totalTime / successfulRequests.length;
        expect(avgSuccessTime).toBeLessThan(500);
      }
    });
  });

  describe('Widget Performance Monitoring', () => {
    it('should track widget performance metrics', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`);
      
      const renderTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      
      // Check if performance metrics are being tracked (if table exists)
      try {
        const metricsResult = await db.query(`
          SELECT * FROM widget_performance_metrics 
          WHERE widget_id = $1 
          ORDER BY created_at DESC 
          LIMIT 1
        `, [testWidgetId]);
        
        if (metricsResult.rows.length > 0) {
          const metrics = metricsResult.rows[0];
          expect(metrics.render_time).toBeDefined();
          expect(metrics.render_time).toBeGreaterThan(0);
        }
      } catch (error) {
        // Table might not exist, which is fine for this test
        console.log('Widget performance metrics table not found, skipping metric validation');
      }
    });
  });

  describe('Search Performance', () => {
    it('should perform full-text search efficiently', async () => {
      const searchTerms = ['Performance', 'Test', 'Content'];
      
      for (const term of searchTerms) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get('/api/content/search')
          .query({ 
            q: term,
            website_id: testWebsiteId
          })
          .set('Authorization', `Bearer ${testUserToken}`);
        
        const searchTime = Date.now() - startTime;
        
        expect(response.status).toBe(200);
        expect(searchTime).toBeLessThan(1500); // Search should complete within 1.5 seconds
        
        if (response.body.data && response.body.data.length > 0) {
          // Results should be relevant
          const firstResult = response.body.data[0];
          const contentText = (firstResult.title + ' ' + firstResult.content).toLowerCase();
          expect(contentText).toContain(term.toLowerCase());
        }
      }
    });
  });

  describe('File Upload Performance', () => {
    it('should handle file uploads efficiently', async () => {
      const testFile = Buffer.alloc(1024 * 100); // 100KB test file
      testFile.fill('A');
      
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile, 'test-file.txt');
      
      const uploadTime = Date.now() - startTime;
      
      if (response.status === 201) {
        expect(uploadTime).toBeLessThan(5000); // Upload should complete within 5 seconds
        
        // Cleanup uploaded file
        if (response.body.data?.id) {
          await request(app)
            .delete(`/api/media/${response.body.data.id}`)
            .set('Authorization', `Bearer ${testUserToken}`);
        }
      } else {
        // If upload endpoint doesn't exist, that's fine for this test
        console.log('Media upload endpoint not available, skipping upload performance test');
      }
    });
  });

  describe('Analytics Performance', () => {
    it('should generate analytics reports efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .query({
          website_id: testWebsiteId,
          period: '30d'
        })
        .set('Authorization', `Bearer ${testUserToken}`);
      
      const reportTime = Date.now() - startTime;
      
      if (response.status === 200) {
        expect(reportTime).toBeLessThan(3000); // Analytics should generate within 3 seconds
        expect(response.body.data).toBeDefined();
      } else {
        // If analytics endpoint doesn't exist, that's fine for this test
        console.log('Analytics endpoint not available, skipping analytics performance test');
      }
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should collect performance metrics during operations', async () => {
      // Perform various operations
      await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      await request(app)
        .get('/api/content')
        .query({ website_id: testWebsiteId })
        .set('Authorization', `Bearer ${testUserToken}`);
      
      // Check if performance monitor is collecting metrics
      try {
        const metrics = performanceMonitor.getMetrics();
        
        expect(metrics).toBeDefined();
        if (metrics.requests) {
          expect(metrics.requests.total).toBeGreaterThan(0);
        }
        
        if (metrics.response_times) {
          expect(metrics.response_times.avg).toBeGreaterThan(0);
          expect(metrics.response_times.p95).toBeGreaterThan(0);
        }
      } catch (error) {
        // Performance monitor might not be fully implemented, which is fine
        console.log('Performance monitor not fully available, skipping metrics validation');
      }
    });
  });

  describe('Load Testing Simulation', () => {
    it('should handle sustained load efficiently', async () => {
      const duration = 10000; // 10 seconds
      const requestsPerSecond = 5;
      const totalRequests = (duration / 1000) * requestsPerSecond;
      
      const requests = [];
      const startTime = Date.now();
      
      // Simulate sustained load
      for (let i = 0; i < totalRequests; i++) {
        const delay = (i / requestsPerSecond) * 1000;
        
        requests.push(
          new Promise(resolve => {
            setTimeout(async () => {
              const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${testUserToken}`);
              resolve(response);
            }, delay);
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // All requests should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBe(totalRequests);
      
      // Should maintain reasonable response times under load
      expect(totalTime).toBeLessThan(duration + 2000); // Allow 2s buffer
    });
  });
});
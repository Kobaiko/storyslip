import request from 'supertest';
import { app } from '../index';
import { DatabaseService } from '../services/database';
import { WidgetService } from '../services/widget.service';
import { ContentService } from '../services/content.service';
import { WidgetAuthService } from '../services/widget-auth.service';
import { WidgetCDNService } from '../services/widget-cdn.service';

describe('Widget Delivery Integration', () => {
  let db: DatabaseService;
  let testUserId: string;
  let testWebsiteId: string;
  let testWidgetId: string;
  let testContentId: string;
  let testAPIKey: string;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    
    // Create test user
    const userResult = await db.query(`
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES (gen_random_uuid(), 'test@example.com', 'password', NOW(), NOW(), NOW())
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create test website
    const websiteResult = await db.query(`
      INSERT INTO websites (user_id, name, domain, is_verified)
      VALUES ($1, 'Test Website', 'test.example.com', true)
      RETURNING id
    `, [testUserId]);
    testWebsiteId = websiteResult.rows[0].id;

    // Create test content
    const contentResult = await db.query(`
      INSERT INTO content (website_id, title, content, excerpt, status, published_at)
      VALUES ($1, 'Test Article', 'This is test content', 'Test excerpt', 'published', NOW())
      RETURNING id
    `, [testWebsiteId]);
    testContentId = contentResult.rows[0].id;

    // Create test widget
    const widgetResult = await db.query(`
      INSERT INTO widgets (website_id, title, description, type, settings, is_published)
      VALUES ($1, 'Test Widget', 'Test widget description', 'content', '{"theme": "modern", "layout": "grid"}', true)
      RETURNING id
    `, [testWebsiteId]);
    testWidgetId = widgetResult.rows[0].id;

    // Generate API key for widget
    const authService = WidgetAuthService.getInstance();
    const { key } = await authService.generateAPIKey(testWidgetId, 'Test Key', ['read']);
    testAPIKey = key;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM widgets WHERE id = $1', [testWidgetId]);
    await db.query('DELETE FROM content WHERE id = $1', [testContentId]);
    await db.query('DELETE FROM websites WHERE id = $1', [testWebsiteId]);
    await db.query('DELETE FROM auth.users WHERE id = $1', [testUserId]);
  });

  describe('Widget Rendering', () => {
    it('should render widget with JSON format', async () => {
      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('html');
      expect(response.body.data).toHaveProperty('css');
      expect(response.body.data).toHaveProperty('js');
      expect(response.body.data).toHaveProperty('metadata');

      // Check HTML contains widget content
      expect(response.body.data.html).toContain('storyslip-widget');
      expect(response.body.data.html).toContain('Test Article');

      // Check CSS contains styling
      expect(response.body.data.css).toContain('.storyslip-widget');

      // Check metadata
      expect(response.body.data.metadata.title).toBe('Test Widget');
      expect(response.body.data.metadata.og_tags).toHaveProperty('og:title');
    });

    it('should render widget with HTML format', async () => {
      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render?format=html`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('Test Widget');
      expect(response.text).toContain('Test Article');
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render?page=1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.html).toContain('Test Article');
    });

    it('should handle search queries', async () => {
      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render?search=test`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.html).toContain('Test Article');
    });

    it('should return 404 for non-existent widget', async () => {
      const response = await request(app)
        .get('/api/widgets/public/non-existent/render')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WIDGET_NOT_FOUND');
    });

    it('should return 404 for unpublished widget', async () => {
      // Create unpublished widget
      const unpublishedResult = await db.query(`
        INSERT INTO widgets (website_id, title, type, is_published)
        VALUES ($1, 'Unpublished Widget', 'content', false)
        RETURNING id
      `, [testWebsiteId]);
      const unpublishedId = unpublishedResult.rows[0].id;

      const response = await request(app)
        .get(`/api/widgets/public/${unpublishedId}/render`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WIDGET_NOT_FOUND');

      // Clean up
      await db.query('DELETE FROM widgets WHERE id = $1', [unpublishedId]);
    });

    it('should set proper cache headers', async () => {
      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`)
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['etag']).toBeDefined();
      expect(response.headers['vary']).toContain('Accept');
    });

    it('should handle conditional requests with ETag', async () => {
      // First request to get ETag
      const firstResponse = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`)
        .expect(200);

      const etag = firstResponse.headers['etag'];

      // Second request with If-None-Match header
      const secondResponse = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`)
        .set('If-None-Match', etag)
        .expect(304);

      expect(secondResponse.body).toEqual({});
    });
  });

  describe('Widget Script Delivery', () => {
    it('should deliver widget script', async () => {
      const response = await request(app)
        .get('/api/widgets/script.js')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.text).toContain('StorySlipWidget');
      expect(response.text).toContain('WidgetDeliverySystem');
    });

    it('should set proper cache headers for script', async () => {
      const response = await request(app)
        .get('/api/widgets/script.js')
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age=86400');
      expect(response.headers['etag']).toBeDefined();
    });

    it('should handle conditional requests for script', async () => {
      const response = await request(app)
        .get('/api/widgets/script.js')
        .set('If-None-Match', '"widget-script-v1.0.0"')
        .expect(304);

      expect(response.body).toEqual({});
    });
  });

  describe('Widget Embed Code Generation', () => {
    it('should generate JavaScript embed code', async () => {
      const response = await request(app)
        .get(`/api/widgets/embed/${testWidgetId}?type=javascript`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embed_code).toContain('<div id="storyslip-widget-');
      expect(response.body.data.embed_code).toContain('data-storyslip-widget');
      expect(response.body.data.embed_code).toContain('<script src=');
      expect(response.body.data.preview_url).toBeDefined();
    });

    it('should generate iframe embed code', async () => {
      const response = await request(app)
        .get(`/api/widgets/embed/${testWidgetId}?type=iframe`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embed_code).toContain('<iframe src=');
      expect(response.body.data.embed_code).toContain('format=html');
      expect(response.body.data.preview_url).toContain('format=html');
    });

    it('should generate AMP embed code', async () => {
      const response = await request(app)
        .get(`/api/widgets/embed/${testWidgetId}?type=amp`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embed_code).toContain('<amp-iframe');
      expect(response.body.data.embed_code).toContain('layout="responsive"');
    });

    it('should return 404 for non-existent widget embed', async () => {
      const response = await request(app)
        .get('/api/widgets/embed/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WIDGET_NOT_FOUND');
    });

    it('should return 400 for invalid embed type', async () => {
      const response = await request(app)
        .get(`/api/widgets/embed/${testWidgetId}?type=invalid`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Widget Analytics Tracking', () => {
    it('should track widget analytics', async () => {
      const analyticsData = {
        widget_id: testWidgetId,
        type: 'content',
        url: 'https://example.com/test',
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0 Test Browser',
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post(`/api/widgets/${testWidgetId}/analytics/track`)
        .send(analyticsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tracked).toBe(true);
    });

    it('should validate analytics data', async () => {
      const invalidData = {
        widget_id: testWidgetId,
        type: 'content',
        url: 'invalid-url', // Invalid URL
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post(`/api/widgets/${testWidgetId}/analytics/track`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent widget analytics', async () => {
      const analyticsData = {
        widget_id: 'non-existent',
        type: 'content',
        url: 'https://example.com/test',
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/widgets/non-existent/analytics/track')
        .send(analyticsData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WIDGET_NOT_FOUND');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to widget requests', async () => {
      // Make multiple requests quickly
      const requests = Array(10).fill(null).map(() =>
        request(app).get(`/api/widgets/public/${testWidgetId}/render`)
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed (within rate limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Widget Authentication', () => {
    it('should validate API key', async () => {
      const authService = WidgetAuthService.getInstance();
      const result = await authService.validateAPIKey(testAPIKey, 'read');

      expect(result.valid).toBe(true);
      expect(result.keyData).toBeDefined();
      expect(result.keyData?.widget_id).toBe(testWidgetId);
    });

    it('should reject invalid API key', async () => {
      const authService = WidgetAuthService.getInstance();
      const result = await authService.validateAPIKey('invalid-key', 'read');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should check rate limits', async () => {
      const authService = WidgetAuthService.getInstance();
      const validation = await authService.validateAPIKey(testAPIKey);
      
      if (validation.valid && validation.keyData) {
        const rateLimit = await authService.checkRateLimit(validation.keyData.id);
        
        expect(rateLimit.allowed).toBe(true);
        expect(rateLimit.remaining).toBeGreaterThanOrEqual(0);
        expect(rateLimit.resetTime).toBeInstanceOf(Date);
      }
    });
  });

  describe('CDN Integration', () => {
    it('should optimize widget content', async () => {
      const cdnService = WidgetCDNService.getInstance();
      const content = {
        html: '<div class="test">  <p>Hello World</p>  </div>',
        css: '.test { color: red; margin: 10px; }',
        js: 'console.log("test"); // This is a comment',
      };

      const optimized = cdnService.optimizeWidgetContent(content);

      expect(optimized.html.length).toBeLessThan(content.html.length);
      expect(optimized.css.length).toBeLessThanOrEqual(content.css.length);
      expect(optimized.js.length).toBeLessThan(content.js.length);
      expect(optimized.optimizations).toContain('HTML minification');
    });

    it('should generate proper cache headers', async () => {
      const cdnService = WidgetCDNService.getInstance();
      
      const staticHeaders = cdnService.getCacheHeaders('static', 'test-etag');
      expect(staticHeaders['Cache-Control']).toContain('max-age=604800');
      expect(staticHeaders['ETag']).toBe('"test-etag"');

      const contentHeaders = cdnService.getCacheHeaders('content');
      expect(contentHeaders['Cache-Control']).toContain('max-age=300');
    });

    it('should cache and retrieve widget content', async () => {
      const cdnService = WidgetCDNService.getInstance();
      const testData = { html: '<div>test</div>', css: '.test{}', js: 'console.log("test")' };
      
      // Cache content
      cdnService.cacheWidgetContent('test-key', testData, 1000);
      
      // Retrieve content
      const cached = cdnService.getCachedWidgetContent('test-key');
      expect(cached).toBeDefined();
      expect(cached?.data).toEqual(testData);
    });

    it('should invalidate widget cache', async () => {
      const cdnService = WidgetCDNService.getInstance();
      const testData = { html: '<div>test</div>' };
      
      // Cache content
      cdnService.cacheWidgetContent(`widget-${testWidgetId}-test`, testData);
      
      // Verify cached
      let cached = cdnService.getCachedWidgetContent(`widget-${testWidgetId}-test`);
      expect(cached).toBeDefined();
      
      // Invalidate cache
      cdnService.invalidateWidgetCache(testWidgetId);
      
      // Verify invalidated
      cached = cdnService.getCachedWidgetContent(`widget-${testWidgetId}-test`);
      expect(cached).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalQuery = db.query;
      db.query = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RENDER_ERROR');

      // Restore original method
      db.query = originalQuery;
    });

    it('should handle malformed widget data', async () => {
      // Create widget with invalid settings
      const invalidWidgetResult = await db.query(`
        INSERT INTO widgets (website_id, title, type, settings, is_published)
        VALUES ($1, 'Invalid Widget', 'content', 'invalid-json', true)
        RETURNING id
      `, [testWebsiteId]);
      const invalidWidgetId = invalidWidgetResult.rows[0].id;

      const response = await request(app)
        .get(`/api/widgets/public/${invalidWidgetId}/render`)
        .expect(500);

      expect(response.body.success).toBe(false);

      // Clean up
      await db.query('DELETE FROM widgets WHERE id = $1', [invalidWidgetId]);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/widgets/public/${testWidgetId}/render`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app).get(`/api/widgets/public/${testWidgetId}/render`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
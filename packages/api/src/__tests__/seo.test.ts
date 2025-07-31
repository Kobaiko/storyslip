import request from 'supertest';
import { app } from '../index';
import { supabase } from '../config/supabase';
import { createTestUser, createTestWebsite, getAuthToken } from './helpers/testHelpers';
import { seoService } from '../services/seo.service';

describe('SEO API', () => {
  let authToken: string;
  let userId: string;
  let websiteId: string;
  let contentId: string;

  beforeAll(async () => {
    // Create test user and website
    const user = await createTestUser();
    userId = user.id;
    authToken = await getAuthToken(user.email);
    
    const website = await createTestWebsite(userId);
    websiteId = website.id;

    // Create test content
    const { data: content } = await supabase
      .from('content')
      .insert({
        title: 'Test Article',
        slug: 'test-article',
        body: 'This is a test article with some content for SEO analysis.',
        excerpt: 'Test article excerpt',
        status: 'published',
        author_id: userId,
        website_id: websiteId,
        seo_title: 'Test Article - SEO Title',
        seo_description: 'This is a test article description for SEO purposes.',
        seo_keywords: 'test, article, seo',
      })
      .select()
      .single();

    contentId = content.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('content').delete().eq('id', contentId);
    await supabase.from('websites').delete().eq('id', websiteId);
    await supabase.from('users').delete().eq('id', userId);
  });

  describe('GET /api/seo/:websiteId/sitemap.xml', () => {
    it('should generate XML sitemap', async () => {
      const response = await request(app)
        .get(`/api/seo/${websiteId}/sitemap.xml`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/xml');
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(response.text).toContain('<loc>');
      expect(response.text).toContain('<lastmod>');
      expect(response.text).toContain('<changefreq>');
      expect(response.text).toContain('<priority>');
      expect(response.text).toContain('</urlset>');
    });

    it('should handle invalid website ID', async () => {
      const response = await request(app)
        .get('/api/seo/invalid-uuid/sitemap.xml')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle website not found', async () => {
      const nonExistentWebsiteId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/seo/${nonExistentWebsiteId}/sitemap.xml`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Website not found');
    });
  });

  describe('GET /api/seo/:websiteId/robots.txt', () => {
    it('should generate robots.txt', async () => {
      const response = await request(app)
        .get(`/api/seo/${websiteId}/robots.txt`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('User-agent: *');
      expect(response.text).toContain('Allow: /');
      expect(response.text).toContain('Sitemap:');
      expect(response.text).toContain('Crawl-delay:');
    });

    it('should handle invalid website ID', async () => {
      const response = await request(app)
        .get('/api/seo/invalid-uuid/robots.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/websites/:websiteId/content/:contentId/seo/analyze', () => {
    it('should analyze content for SEO issues', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/content/${contentId}/seo/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toHaveProperty('score');
      expect(response.body.data.analysis).toHaveProperty('issues');
      expect(response.body.data.analysis).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.data.analysis.issues)).toBe(true);
      expect(Array.isArray(response.body.data.analysis.recommendations)).toBe(true);
      expect(typeof response.body.data.analysis.score).toBe('number');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/content/${contentId}/seo/analyze`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle content not found', async () => {
      const nonExistentContentId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/websites/${websiteId}/content/${nonExistentContentId}/seo/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Content not found');
    });

    it('should handle invalid IDs', async () => {
      const response = await request(app)
        .get('/api/websites/invalid-uuid/content/invalid-uuid/seo/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/websites/:websiteId/seo/metrics', () => {
    it('should return SEO metrics for website', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/seo/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toHaveProperty('totalContent');
      expect(response.body.data.metrics).toHaveProperty('publishedContent');
      expect(response.body.data.metrics).toHaveProperty('contentWithSEOTitle');
      expect(response.body.data.metrics).toHaveProperty('contentWithMetaDescription');
      expect(response.body.data.metrics).toHaveProperty('contentWithKeywords');
      expect(response.body.data.metrics).toHaveProperty('contentWithFeaturedImage');
      expect(response.body.data.metrics).toHaveProperty('averageContentLength');
      expect(response.body.data.metrics).toHaveProperty('seoCompletionRate');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/seo/metrics`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle website not found', async () => {
      const nonExistentWebsiteId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/websites/${nonExistentWebsiteId}/seo/metrics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Website not found');
    });
  });

  describe('GET /api/websites/:websiteId/seo/recommendations', () => {
    it('should return SEO recommendations for website', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/seo/recommendations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('averageScore');
      expect(response.body.data).toHaveProperty('contentAnalyzed');
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      expect(typeof response.body.data.averageScore).toBe('number');
      expect(typeof response.body.data.contentAnalyzed).toBe('number');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/seo/recommendations`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('SEO Service Unit Tests', () => {
    describe('analyzeSEO', () => {
      it('should analyze content with good SEO', () => {
        const content = {
          id: 'test-id',
          title: 'This is a well-optimized title for SEO purposes',
          slug: 'well-optimized-title-seo',
          body: 'This is a comprehensive article with plenty of content. '.repeat(50), // ~300 words
          excerpt: 'This is a good excerpt that summarizes the content effectively.',
          seo_title: 'Well-Optimized Title for SEO Purposes',
          seo_description: 'This is a comprehensive meta description that provides a clear summary of the article content and is optimized for search engines.',
          seo_keywords: 'seo, optimization, content, article',
          featured_image_url: 'https://example.com/image.jpg',
          status: 'published',
          author_id: 'author-id',
          website_id: 'website-id',
          view_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          scheduled_at: null,
        };

        const analysis = seoService.analyzeSEO(content);

        expect(analysis.score).toBeGreaterThan(80);
        expect(analysis.issues.length).toBeLessThan(3);
        expect(analysis.recommendations.length).toBeGreaterThan(0);
      });

      it('should identify SEO issues in poor content', () => {
        const content = {
          id: 'test-id',
          title: 'Bad',
          slug: '',
          body: 'Short content.',
          excerpt: '',
          seo_title: '',
          seo_description: '',
          seo_keywords: '',
          featured_image_url: '',
          status: 'draft',
          author_id: 'author-id',
          website_id: 'website-id',
          view_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: null,
          scheduled_at: null,
        };

        const analysis = seoService.analyzeSEO(content);

        expect(analysis.score).toBeLessThan(50);
        expect(analysis.issues.length).toBeGreaterThan(5);
        expect(analysis.issues.some(issue => issue.type === 'error')).toBe(true);
        expect(analysis.recommendations.length).toBeGreaterThan(0);
      });

      it('should provide specific recommendations', () => {
        const content = {
          id: 'test-id',
          title: 'Test Article',
          slug: 'test-article',
          body: 'This is a test article.',
          excerpt: 'Test excerpt',
          seo_title: '',
          seo_description: '',
          seo_keywords: '',
          featured_image_url: '',
          status: 'published',
          author_id: 'author-id',
          website_id: 'website-id',
          view_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
          scheduled_at: null,
        };

        const analysis = seoService.analyzeSEO(content);

        const errorIssues = analysis.issues.filter(issue => issue.type === 'error');
        const warningIssues = analysis.issues.filter(issue => issue.type === 'warning');

        expect(errorIssues.length).toBeGreaterThan(0);
        expect(warningIssues.length).toBeGreaterThan(0);
        expect(analysis.recommendations.some(rec => rec.includes('critical'))).toBe(true);
      });
    });

    describe('generateSitemap', () => {
      it('should generate valid XML sitemap', async () => {
        const sitemap = await seoService.generateSitemap(websiteId, 'https://example.com');

        expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(sitemap).toContain('<url>');
        expect(sitemap).toContain('<loc>https://example.com</loc>');
        expect(sitemap).toContain('<lastmod>');
        expect(sitemap).toContain('<changefreq>');
        expect(sitemap).toContain('<priority>');
        expect(sitemap).toContain('</urlset>');
      });
    });

    describe('generateRobotsTxt', () => {
      it('should generate valid robots.txt', () => {
        const robotsTxt = seoService.generateRobotsTxt(websiteId, 'https://example.com');

        expect(robotsTxt).toContain('User-agent: *');
        expect(robotsTxt).toContain('Allow: /');
        expect(robotsTxt).toContain('Sitemap: https://example.com/sitemap.xml');
        expect(robotsTxt).toContain('Crawl-delay: 1');
      });
    });
  });
});
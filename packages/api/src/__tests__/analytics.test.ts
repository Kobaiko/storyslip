import request from 'supertest';
import { app } from '../index';
import { supabase } from '../config/supabase';
import { createTestUser, createTestWebsite, getAuthToken } from './helpers/testHelpers';

describe('Analytics API', () => {
  let authToken: string;
  let userId: string;
  let websiteId: string;

  beforeAll(async () => {
    // Create test user and website
    const user = await createTestUser();
    userId = user.id;
    authToken = await getAuthToken(user.email);
    
    const website = await createTestWebsite(userId);
    websiteId = website.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('page_views').delete().eq('website_id', websiteId);
    await supabase.from('events').delete().eq('website_id', websiteId);
    await supabase.from('websites').delete().eq('id', websiteId);
    await supabase.from('users').delete().eq('id', userId);
  });

  describe('POST /api/analytics/page-view', () => {
    it('should track page view successfully', async () => {
      const pageViewData = {
        websiteId,
        visitorId: 'test-visitor-123',
        sessionId: 'test-session-123',
        url: 'https://example.com/test-page',
        referrer: 'https://google.com',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        country: 'US',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'test-campaign',
      };

      const response = await request(app)
        .post('/api/analytics/page-view')
        .send(pageViewData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify data was stored
      const { data: pageViews } = await supabase
        .from('page_views')
        .select('*')
        .eq('website_id', websiteId)
        .eq('visitor_id', 'test-visitor-123');

      expect(pageViews).toHaveLength(1);
      expect(pageViews![0].url).toBe('https://example.com/test-page');
      expect(pageViews![0].referrer).toBe('https://google.com');
      expect(pageViews![0].device_type).toBe('desktop');
    });

    it('should handle invalid website ID', async () => {
      const pageViewData = {
        websiteId: 'invalid-uuid',
        visitorId: 'test-visitor-123',
        sessionId: 'test-session-123',
        url: 'https://example.com/test-page',
      };

      const response = await request(app)
        .post('/api/analytics/page-view')
        .send(pageViewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle missing required fields', async () => {
      const pageViewData = {
        websiteId,
        visitorId: 'test-visitor-123',
        // Missing sessionId and url
      };

      const response = await request(app)
        .post('/api/analytics/page-view')
        .send(pageViewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/analytics/event', () => {
    it('should track event successfully', async () => {
      const eventData = {
        websiteId,
        visitorId: 'test-visitor-123',
        sessionId: 'test-session-123',
        eventType: 'click',
        eventName: 'button_click',
        url: 'https://example.com/test-page',
        eventData: {
          buttonText: 'Subscribe',
          position: 'header',
        },
      };

      const response = await request(app)
        .post('/api/analytics/event')
        .send(eventData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify data was stored
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('website_id', websiteId)
        .eq('visitor_id', 'test-visitor-123');

      expect(events).toHaveLength(1);
      expect(events![0].event_type).toBe('click');
      expect(events![0].event_name).toBe('button_click');
      expect(events![0].event_data).toEqual({
        buttonText: 'Subscribe',
        position: 'header',
      });
    });

    it('should handle invalid event data', async () => {
      const eventData = {
        websiteId: 'invalid-uuid',
        visitorId: 'test-visitor-123',
        sessionId: 'test-session-123',
        eventType: 'click',
        eventName: 'button_click',
        url: 'https://example.com/test-page',
      };

      const response = await request(app)
        .post('/api/analytics/event')
        .send(eventData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/websites/:websiteId/analytics/dashboard', () => {
    beforeEach(async () => {
      // Insert test data
      await supabase.from('page_views').insert([
        {
          website_id: websiteId,
          visitor_id: 'visitor-1',
          session_id: 'session-1',
          url: 'https://example.com/page1',
          device_type: 'desktop',
          country: 'US',
          created_at: new Date().toISOString(),
        },
        {
          website_id: websiteId,
          visitor_id: 'visitor-2',
          session_id: 'session-2',
          url: 'https://example.com/page2',
          device_type: 'mobile',
          country: 'CA',
          created_at: new Date().toISOString(),
        },
      ]);

      await supabase.from('events').insert([
        {
          website_id: websiteId,
          visitor_id: 'visitor-1',
          session_id: 'session-1',
          event_type: 'click',
          event_name: 'button_click',
          url: 'https://example.com/page1',
          created_at: new Date().toISOString(),
        },
      ]);
    });

    it('should return dashboard data for authenticated user', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pageViewsOverTime');
      expect(response.body.data).toHaveProperty('topContent');
      expect(response.body.data).toHaveProperty('topReferrers');
      expect(response.body.data).toHaveProperty('deviceBreakdown');
      expect(response.body.data).toHaveProperty('geographicDistribution');
      expect(response.body.data).toHaveProperty('utmSourceBreakdown');
      expect(response.body.data).toHaveProperty('eventCountsByType');
      expect(response.body.data).toHaveProperty('totalPageViews');
      expect(response.body.data).toHaveProperty('totalVisitors');
      expect(response.body.data).toHaveProperty('totalSessions');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/dashboard`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle invalid website ID', async () => {
      const response = await request(app)
        .get('/api/websites/invalid-uuid/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle website not found', async () => {
      const nonExistentWebsiteId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/websites/${nonExistentWebsiteId}/analytics/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Website not found');
    });
  });

  describe('GET /api/websites/:websiteId/analytics/page-views', () => {
    it('should return page views over time', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/page-views`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'day', count: 7 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pageViewsOverTime');
      expect(Array.isArray(response.body.data.pageViewsOverTime)).toBe(true);
    });

    it('should handle invalid period parameter', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/page-views`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/websites/:websiteId/analytics/top-content', () => {
    it('should return top content', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/top-content`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('topContent');
      expect(Array.isArray(response.body.data.topContent)).toBe(true);
    });

    it('should handle invalid limit parameter', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/top-content`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/websites/:websiteId/analytics/top-referrers', () => {
    it('should return top referrers', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/top-referrers`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('topReferrers');
      expect(Array.isArray(response.body.data.topReferrers)).toBe(true);
    });
  });

  describe('GET /api/websites/:websiteId/analytics/device-breakdown', () => {
    it('should return device breakdown', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/device-breakdown`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('deviceBreakdown');
      expect(Array.isArray(response.body.data.deviceBreakdown)).toBe(true);
    });
  });

  describe('GET /api/websites/:websiteId/analytics/geographic-distribution', () => {
    it('should return geographic distribution', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/analytics/geographic-distribution`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('geographicDistribution');
      expect(Array.isArray(response.body.data.geographicDistribution)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to tracking endpoints', async () => {
      const pageViewData = {
        websiteId,
        visitorId: 'test-visitor-rate-limit',
        sessionId: 'test-session-rate-limit',
        url: 'https://example.com/rate-limit-test',
      };

      // Make multiple requests quickly to trigger rate limit
      const requests = Array(210).fill(null).map(() =>
        request(app)
          .post('/api/analytics/page-view')
          .send(pageViewData)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
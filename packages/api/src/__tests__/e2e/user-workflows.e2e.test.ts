import request from 'supertest';
import app from '../../index';
import { supabase } from '../../config/supabase';

describe('End-to-End User Workflows', () => {
  let authToken: string;
  let userId: string;
  let websiteId: string;
  let contentId: string;
  let invitationId: string;

  // Test user data
  const testUser = {
    name: 'E2E Test User',
    email: `e2e-test-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
  };

  const testWebsite = {
    name: 'E2E Test Website',
    domain: `e2e-test-${Date.now()}.example.com`,
    description: 'End-to-end test website',
  };

  const testContent = {
    title: 'E2E Test Article',
    content: '<p>This is a test article for end-to-end testing.</p>',
    excerpt: 'Test article excerpt',
    status: 'published',
    seo_title: 'E2E Test Article - SEO Title',
    seo_description: 'SEO description for test article',
  };

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      // Delete test user and related data
      if (testUser.email) {
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', testUser.email)
          .single();

        if (user) {
          await supabase.from('users').delete().eq('id', user.id);
        }
      }

      // Delete test website
      if (testWebsite.domain) {
        await supabase.from('websites').delete().eq('domain', testWebsite.domain);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  describe('Complete User Registration and Onboarding Flow', () => {
    it('should complete the full user registration workflow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(testUser.email);
      expect(registerResponse.body.data.token).toBeDefined();

      authToken = registerResponse.body.data.token;
      userId = registerResponse.body.data.user.id;

      // Step 2: Verify user profile
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.data.email).toBe(testUser.email);
      expect(profileResponse.body.data.name).toBe(testUser.name);

      // Step 3: Update user profile
      const updatedProfile = {
        name: 'Updated E2E Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      const updateResponse = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedProfile)
        .expect(200);

      expect(updateResponse.body.data.name).toBe(updatedProfile.name);
      expect(updateResponse.body.data.avatar_url).toBe(updatedProfile.avatar_url);
    });

    it('should handle login and token refresh workflow', async () => {
      // Step 1: Login with credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      expect(loginResponse.body.data.refreshToken).toBeDefined();

      const newToken = loginResponse.body.data.token;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Step 2: Use new token to access protected endpoint
      const protectedResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(protectedResponse.body.data.email).toBe(testUser.email);

      // Step 3: Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.data.token).toBeDefined();
      expect(refreshResponse.body.data.token).not.toBe(newToken);

      // Update auth token for subsequent tests
      authToken = refreshResponse.body.data.token;
    });
  });

  describe('Website Management Workflow', () => {
    it('should complete the full website creation and configuration workflow', async () => {
      // Step 1: Create website
      const createResponse = await request(app)
        .post('/api/websites')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWebsite)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe(testWebsite.name);
      expect(createResponse.body.data.domain).toBe(testWebsite.domain);
      expect(createResponse.body.data.api_key).toBeDefined();

      websiteId = createResponse.body.data.id;

      // Step 2: Verify website in listing
      const listResponse = await request(app)
        .get('/api/websites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0].id).toBe(websiteId);

      // Step 3: Update website configuration
      const updateData = {
        name: 'Updated E2E Test Website',
        description: 'Updated description',
        settings: {
          theme: 'dark',
          auto_publish: true,
          seo_enabled: true,
        },
      };

      const updateResponse = await request(app)
        .put(`/api/websites/${websiteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.name).toBe(updateData.name);
      expect(updateResponse.body.data.settings.theme).toBe('dark');

      // Step 4: Test integration endpoint
      const integrationResponse = await request(app)
        .post(`/api/websites/${websiteId}/test-integration`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com',
          selector: '#content',
        })
        .expect(200);

      expect(integrationResponse.body.success).toBe(true);
    });

    it('should handle domain verification workflow', async () => {
      // Step 1: Start domain verification
      const verifyResponse = await request(app)
        .post(`/api/websites/${websiteId}/verify-domain`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.data.verification_token).toBeDefined();

      // Step 2: Check verification status
      const statusResponse = await request(app)
        .get(`/api/websites/${websiteId}/verification-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body.data.status).toBeDefined();
    });
  });

  describe('Content Management Workflow', () => {
    it('should complete the full content creation and publishing workflow', async () => {
      // Step 1: Create content
      const createResponse = await request(app)
        .post(`/api/websites/${websiteId}/content`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testContent)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe(testContent.title);
      expect(createResponse.body.data.status).toBe('published');

      contentId = createResponse.body.data.id;

      // Step 2: Verify content in listing
      const listResponse = await request(app)
        .get(`/api/websites/${websiteId}/content`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0].id).toBe(contentId);

      // Step 3: Update content
      const updateData = {
        title: 'Updated E2E Test Article',
        content: '<p>Updated content for testing.</p>',
        status: 'draft',
      };

      const updateResponse = await request(app)
        .put(`/api/websites/${websiteId}/content/${contentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.title).toBe(updateData.title);
      expect(updateResponse.body.data.status).toBe('draft');

      // Step 4: Schedule content for publishing
      const scheduleData = {
        status: 'scheduled',
        scheduled_for: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
      };

      const scheduleResponse = await request(app)
        .put(`/api/websites/${websiteId}/content/${contentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scheduleData)
        .expect(200);

      expect(scheduleResponse.body.data.status).toBe('scheduled');
      expect(scheduleResponse.body.data.scheduled_for).toBeDefined();

      // Step 5: Publish content immediately
      const publishResponse = await request(app)
        .put(`/api/websites/${websiteId}/content/${contentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'published' })
        .expect(200);

      expect(publishResponse.body.data.status).toBe('published');
      expect(publishResponse.body.data.published_at).toBeDefined();
    });

    it('should handle content categorization and tagging', async () => {
      // Step 1: Create category
      const categoryResponse = await request(app)
        .post(`/api/websites/${websiteId}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Test Category',
          description: 'Category for end-to-end testing',
          color: '#3B82F6',
        })
        .expect(201);

      const categoryId = categoryResponse.body.data.id;

      // Step 2: Create tag
      const tagResponse = await request(app)
        .post(`/api/websites/${websiteId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'e2e-test',
          description: 'Tag for end-to-end testing',
        })
        .expect(201);

      const tagId = tagResponse.body.data.id;

      // Step 3: Update content with category and tag
      const updateResponse = await request(app)
        .put(`/api/websites/${websiteId}/content/${contentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category_ids: [categoryId],
          tag_ids: [tagId],
        })
        .expect(200);

      expect(updateResponse.body.data.categories).toHaveLength(1);
      expect(updateResponse.body.data.tags).toHaveLength(1);
    });
  });

  describe('Team Management Workflow', () => {
    const inviteeEmail = `e2e-invitee-${Date.now()}@example.com`;

    it('should complete the team invitation and management workflow', async () => {
      // Step 1: Send team invitation
      const inviteResponse = await request(app)
        .post(`/api/websites/${websiteId}/team/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: inviteeEmail,
          role: 'editor',
          message: 'Welcome to our E2E test team!',
        })
        .expect(201);

      expect(inviteResponse.body.success).toBe(true);
      expect(inviteResponse.body.data.email).toBe(inviteeEmail);
      expect(inviteResponse.body.data.role).toBe('editor');

      invitationId = inviteResponse.body.data.id;

      // Step 2: List team invitations
      const listResponse = await request(app)
        .get(`/api/websites/${websiteId}/team/invitations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0].id).toBe(invitationId);

      // Step 3: Update invitation role
      const updateResponse = await request(app)
        .put(`/api/websites/${websiteId}/team/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(updateResponse.body.data.role).toBe('admin');

      // Step 4: List team members
      const membersResponse = await request(app)
        .get(`/api/websites/${websiteId}/team/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(membersResponse.body.data).toHaveLength(1); // Only the owner
      expect(membersResponse.body.data[0].user_id).toBe(userId);
    });

    it('should handle invitation cancellation', async () => {
      // Cancel the invitation
      const cancelResponse = await request(app)
        .delete(`/api/websites/${websiteId}/team/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);

      // Verify invitation is removed
      const listResponse = await request(app)
        .get(`/api/websites/${websiteId}/team/invitations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data).toHaveLength(0);
    });
  });

  describe('Analytics Tracking Workflow', () => {
    it('should complete the analytics tracking and reporting workflow', async () => {
      // Step 1: Track page view
      const trackResponse = await request(app)
        .post('/api/analytics/track')
        .send({
          website_id: websiteId,
          event_type: 'page_view',
          page_url: 'https://example.com/test-page',
          referrer: 'https://google.com',
          user_agent: 'Mozilla/5.0 (Test Browser)',
          ip_address: '192.168.1.1',
        })
        .expect(200);

      expect(trackResponse.body.success).toBe(true);

      // Step 2: Track content view
      const contentViewResponse = await request(app)
        .post('/api/analytics/track')
        .send({
          website_id: websiteId,
          event_type: 'content_view',
          content_id: contentId,
          page_url: 'https://example.com/test-article',
          user_agent: 'Mozilla/5.0 (Test Browser)',
          ip_address: '192.168.1.1',
        })
        .expect(200);

      expect(contentViewResponse.body.success).toBe(true);

      // Step 3: Get analytics overview
      const overviewResponse = await request(app)
        .get(`/api/websites/${websiteId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: '7d' })
        .expect(200);

      expect(overviewResponse.body.data.total_views).toBeGreaterThan(0);
      expect(overviewResponse.body.data.unique_visitors).toBeGreaterThan(0);

      // Step 4: Get content analytics
      const contentAnalyticsResponse = await request(app)
        .get(`/api/websites/${websiteId}/content/${contentId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(contentAnalyticsResponse.body.data.views).toBeGreaterThan(0);

      // Step 5: Get real-time analytics
      const realtimeResponse = await request(app)
        .get(`/api/websites/${websiteId}/analytics/realtime`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(realtimeResponse.body.data).toBeDefined();
    });
  });

  describe('White-label Branding Workflow', () => {
    it('should complete the branding configuration workflow', async () => {
      // Step 1: Configure brand settings
      const brandResponse = await request(app)
        .put(`/api/websites/${websiteId}/branding`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          brand_name: 'E2E Test Brand',
          primary_color: '#3B82F6',
          secondary_color: '#1E40AF',
          logo_url: 'https://example.com/logo.png',
          custom_domain: `custom-${Date.now()}.example.com`,
        })
        .expect(200);

      expect(brandResponse.body.data.brand_name).toBe('E2E Test Brand');
      expect(brandResponse.body.data.primary_color).toBe('#3B82F6');

      // Step 2: Get brand configuration
      const getBrandResponse = await request(app)
        .get(`/api/websites/${websiteId}/branding`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getBrandResponse.body.data.brand_name).toBe('E2E Test Brand');

      // Step 3: Generate branded CSS
      const cssResponse = await request(app)
        .get(`/api/brand/${websiteId}/styles.css`)
        .expect(200);

      expect(cssResponse.text).toContain('#3B82F6');
      expect(cssResponse.headers['content-type']).toContain('text/css');
    });
  });

  describe('Widget Integration Workflow', () => {
    it('should complete the widget integration and content delivery workflow', async () => {
      // Step 1: Get widget configuration
      const configResponse = await request(app)
        .get(`/api/widget/${websiteId}/config`)
        .expect(200);

      expect(configResponse.body.success).toBe(true);
      expect(configResponse.body.data.website_id).toBe(websiteId);

      // Step 2: Get widget content
      const contentResponse = await request(app)
        .get(`/api/widget/${websiteId}/content`)
        .query({ limit: 10 })
        .expect(200);

      expect(contentResponse.body.success).toBe(true);
      expect(contentResponse.body.data).toHaveLength(1);
      expect(contentResponse.body.data[0].id).toBe(contentId);

      // Step 3: Track widget impression
      const impressionResponse = await request(app)
        .post(`/api/widget/${websiteId}/track`)
        .send({
          event_type: 'impression',
          content_id: contentId,
          page_url: 'https://example.com/embedded-page',
        })
        .expect(200);

      expect(impressionResponse.body.success).toBe(true);

      // Step 4: Get widget analytics
      const widgetAnalyticsResponse = await request(app)
        .get(`/api/websites/${websiteId}/widget/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(widgetAnalyticsResponse.body.data).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle authentication errors properly', async () => {
      // Test with invalid token
      const invalidTokenResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(invalidTokenResponse.body.success).toBe(false);
      expect(invalidTokenResponse.body.error).toBe('UNAUTHORIZED');

      // Test with missing token
      const missingTokenResponse = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(missingTokenResponse.body.success).toBe(false);
    });

    it('should handle validation errors properly', async () => {
      // Test with invalid email
      const invalidEmailResponse = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(invalidEmailResponse.body.success).toBe(false);
      expect(invalidEmailResponse.body.error).toBe('VALIDATION_ERROR');

      // Test with missing required fields
      const missingFieldsResponse = await request(app)
        .post(`/api/websites/${websiteId}/content`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Content without title',
        })
        .expect(400);

      expect(missingFieldsResponse.body.success).toBe(false);
    });

    it('should handle resource not found errors', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      // Test with non-existent website
      const notFoundResponse = await request(app)
        .get(`/api/websites/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(notFoundResponse.body.success).toBe(false);
      expect(notFoundResponse.body.error).toBe('NOT_FOUND');
    });

    it('should handle permission errors properly', async () => {
      // Create another user
      const anotherUser = {
        name: 'Another User',
        email: `another-${Date.now()}@example.com`,
        password: 'password123',
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUser)
        .expect(201);

      const anotherToken = registerResponse.body.data.token;

      // Try to access first user's website
      const forbiddenResponse = await request(app)
        .get(`/api/websites/${websiteId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .expect(403);

      expect(forbiddenResponse.body.success).toBe(false);
      expect(forbiddenResponse.body.error).toBe('FORBIDDEN');

      // Cleanup
      await supabase.from('users').delete().eq('email', anotherUser.email);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = [];

      // Create multiple concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .get(`/api/websites/${websiteId}/content`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle rate limiting properly', async () => {
      // This test would need to be adjusted based on actual rate limits
      const requests = [];
      const requestCount = 150; // Assuming rate limit is 100 per minute

      for (let i = 0; i < requestCount; i++) {
        requests.push(
          request(app)
            .get('/api/status')
            .catch(err => err.response)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain data consistency across operations', async () => {
      // Create content and verify it appears in all relevant endpoints
      const newContent = {
        title: 'Consistency Test Article',
        content: '<p>Testing data consistency</p>',
        status: 'published',
      };

      const createResponse = await request(app)
        .post(`/api/websites/${websiteId}/content`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newContent)
        .expect(201);

      const newContentId = createResponse.body.data.id;

      // Verify content appears in listing
      const listResponse = await request(app)
        .get(`/api/websites/${websiteId}/content`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const foundContent = listResponse.body.data.find(c => c.id === newContentId);
      expect(foundContent).toBeDefined();
      expect(foundContent.title).toBe(newContent.title);

      // Verify content appears in widget endpoint
      const widgetResponse = await request(app)
        .get(`/api/widget/${websiteId}/content`)
        .expect(200);

      const widgetContent = widgetResponse.body.data.find(c => c.id === newContentId);
      expect(widgetContent).toBeDefined();
      expect(widgetContent.title).toBe(newContent.title);

      // Update content and verify consistency
      const updateData = { title: 'Updated Consistency Test' };
      
      await request(app)
        .put(`/api/websites/${websiteId}/content/${newContentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      // Verify update is reflected in all endpoints
      const updatedListResponse = await request(app)
        .get(`/api/websites/${websiteId}/content`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const updatedContent = updatedListResponse.body.data.find(c => c.id === newContentId);
      expect(updatedContent.title).toBe(updateData.title);

      // Cleanup
      await request(app)
        .delete(`/api/websites/${websiteId}/content/${newContentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
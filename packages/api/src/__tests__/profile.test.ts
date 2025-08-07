import request from 'supertest';
import { app } from '../index';
import { supabase } from '../config/supabase';

describe('Profile API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'profile-test@example.com',
      password: 'testpassword123',
    });

    if (authError || !authData.user) {
      throw new Error('Failed to create test user');
    }

    userId = authData.user.id;
    authToken = authData.session?.access_token || '';
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe('GET /api/profile', () => {
    it('should get user profile', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('user_id');
      expect(response.body.data).toHaveProperty('display_name');
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/profile')
        .expect(401);
    });
  });

  describe('PUT /api/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        first_name: 'John',
        last_name: 'Doe',
        display_name: 'John Doe',
        bio: 'Test bio',
        timezone: 'America/New_York',
        language: 'en',
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe(updateData.first_name);
      expect(response.body.data.last_name).toBe(updateData.last_name);
      expect(response.body.data.display_name).toBe(updateData.display_name);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    it('should validate input data', async () => {
      const invalidData = {
        first_name: '', // Empty string should fail
        bio: 'x'.repeat(501), // Too long
      };

      await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .put('/api/profile')
        .send({ first_name: 'John' })
        .expect(401);
    });
  });

  describe('PUT /api/profile/onboarding', () => {
    it('should update onboarding progress', async () => {
      const progressData = {
        step: 2,
        completed: false,
        data: { preferences: { theme: 'dark' } },
      };

      const response = await request(app)
        .put('/api/profile/onboarding')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.onboarding_step).toBe(progressData.step);
    });

    it('should complete onboarding', async () => {
      const progressData = {
        step: 5,
        completed: true,
      };

      const response = await request(app)
        .put('/api/profile/onboarding')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.onboarding_completed).toBe(true);
      expect(response.body.data.onboarding_step).toBe(progressData.step);
    });

    it('should validate onboarding data', async () => {
      const invalidData = {
        step: -1, // Invalid step
        completed: 'not-boolean', // Invalid type
      };

      await request(app)
        .put('/api/profile/onboarding')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/profile/completion', () => {
    it('should get profile completion status', async () => {
      const response = await request(app)
        .get('/api/profile/completion')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('percentage');
      expect(response.body.data).toHaveProperty('missing_fields');
      expect(typeof response.body.data.percentage).toBe('number');
      expect(Array.isArray(response.body.data.missing_fields)).toBe(true);
    });
  });

  describe('POST /api/profile/avatar', () => {
    it('should upload avatar image', async () => {
      // Create a simple test image buffer
      const imageBuffer = Buffer.from('fake-image-data');

      const response = await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('avatar', imageBuffer, 'test-avatar.jpg')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('avatar_url');
      expect(typeof response.body.data.avatar_url).toBe('string');
    });

    it('should return 400 without file', async () => {
      await request(app)
        .post('/api/profile/avatar')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/profile/search', () => {
    let organizationId: string;

    beforeAll(async () => {
      // Get user's organization ID
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      organizationId = profileResponse.body.data.users.current_organization_id;
    });

    it('should search users', async () => {
      const response = await request(app)
        .get('/api/profile/search')
        .query({
          q: 'test',
          organization_id: organizationId,
          limit: 5,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should validate search parameters', async () => {
      // Missing query
      await request(app)
        .get('/api/profile/search')
        .query({ organization_id: organizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Query too short
      await request(app)
        .get('/api/profile/search')
        .query({ q: 'a', organization_id: organizationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Missing organization_id
      await request(app)
        .get('/api/profile/search')
        .query({ q: 'test' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('DELETE /api/profile', () => {
    let testUserId: string;
    let testAuthToken: string;

    beforeAll(async () => {
      // Create a separate test user for deletion
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'profile-delete-test@example.com',
        password: 'testpassword123',
      });

      if (authError || !authData.user) {
        throw new Error('Failed to create test user for deletion');
      }

      testUserId = authData.user.id;
      testAuthToken = authData.session?.access_token || '';
    });

    it('should require confirmation to delete profile', async () => {
      await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send({ confirm: 'WRONG' })
        .expect(400);
    });

    it('should delete profile with proper confirmation', async () => {
      const response = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${testAuthToken}`)
        .send({ confirm: 'DELETE' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);
    });

    afterAll(async () => {
      // Clean up test user (if not already deleted)
      if (testUserId) {
        try {
          await supabase.auth.admin.deleteUser(testUserId);
        } catch (error) {
          // User might already be deleted
        }
      }
    });
  });
});
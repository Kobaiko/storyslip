import request from 'supertest';
import app from '../index';
import { supabase } from '../config/supabase';

describe('Onboarding API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'onboarding-test@example.com',
      password: 'testpassword123',
    });

    if (authError || !authData.user) {
      throw new Error('Failed to create test user');
    }

    userId = authData.user.id;
    authToken = authData.session?.access_token || '';

    // Wait for user creation triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe('GET /api/onboarding/progress', () => {
    it('should get user onboarding progress', async () => {
      const response = await request(app)
        .get('/api/onboarding/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user_id');
      expect(response.body.data).toHaveProperty('current_step');
      expect(response.body.data).toHaveProperty('completed_steps');
      expect(response.body.data).toHaveProperty('is_completed');
      expect(response.body.data).toHaveProperty('steps');
      expect(Array.isArray(response.body.data.steps)).toBe(true);
      expect(response.body.data.steps.length).toBeGreaterThan(0);
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/onboarding/progress')
        .expect(401);
    });
  });

  describe('GET /api/onboarding/should-show', () => {
    it('should check if onboarding should be shown', async () => {
      const response = await request(app)
        .get('/api/onboarding/should-show')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('should_show');
      expect(typeof response.body.data.should_show).toBe('boolean');
    });
  });

  describe('POST /api/onboarding/step/complete', () => {
    it('should complete an onboarding step', async () => {
      const stepData = {
        step_id: 'welcome',
        data: { viewed_at: new Date().toISOString() },
      };

      const response = await request(app)
        .post('/api/onboarding/step/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(stepData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('completed_steps');
      expect(response.body.data.completed_steps).toContain('welcome');
    });

    it('should validate step data', async () => {
      // Missing step_id
      await request(app)
        .post('/api/onboarding/step/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      // Invalid step_id
      await request(app)
        .post('/api/onboarding/step/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ step_id: 'invalid_step' })
        .expect(400);
    });

    it('should complete multiple steps', async () => {
      const steps = ['profile_setup', 'organization_setup'];
      
      for (const stepId of steps) {
        const response = await request(app)
          .post('/api/onboarding/step/complete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            step_id: stepId,
            data: { completed_at: new Date().toISOString() }
          })
          .expect(200);

        expect(response.body.data.completed_steps).toContain(stepId);
      }
    });
  });

  describe('POST /api/onboarding/complete', () => {
    it('should fail to complete onboarding without all required steps', async () => {
      // Reset onboarding first
      await request(app)
        .post('/api/onboarding/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to complete without all required steps
      await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should complete onboarding after all required steps', async () => {
      // Complete all required steps first
      const requiredSteps = ['welcome', 'profile_setup', 'organization_setup', 'create_website', 'add_content'];
      
      for (const stepId of requiredSteps) {
        await request(app)
          .post('/api/onboarding/step/complete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ step_id: stepId })
          .expect(200);
      }

      // Now complete onboarding
      const response = await request(app)
        .post('/api/onboarding/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.completed).toBe(true);
    });
  });

  describe('POST /api/onboarding/skip', () => {
    let skipUserId: string;
    let skipAuthToken: string;

    beforeAll(async () => {
      // Create a separate user for skip testing
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'onboarding-skip-test@example.com',
        password: 'testpassword123',
      });

      if (authError || !authData.user) {
        throw new Error('Failed to create skip test user');
      }

      skipUserId = authData.user.id;
      skipAuthToken = authData.session?.access_token || '';

      // Wait for user creation
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
      if (skipUserId) {
        await supabase.auth.admin.deleteUser(skipUserId);
      }
    });

    it('should skip onboarding', async () => {
      const response = await request(app)
        .post('/api/onboarding/skip')
        .set('Authorization', `Bearer ${skipAuthToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.skipped).toBe(true);

      // Verify onboarding is marked as completed
      const progressResponse = await request(app)
        .get('/api/onboarding/progress')
        .set('Authorization', `Bearer ${skipAuthToken}`)
        .expect(200);

      expect(progressResponse.body.data.is_completed).toBe(true);
    });
  });

  describe('POST /api/onboarding/reset', () => {
    it('should reset onboarding progress', async () => {
      const response = await request(app)
        .post('/api/onboarding/reset')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reset).toBe(true);

      // Verify progress is reset
      const progressResponse = await request(app)
        .get('/api/onboarding/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(progressResponse.body.data.current_step).toBe(0);
      expect(progressResponse.body.data.completed_steps).toEqual([]);
      expect(progressResponse.body.data.is_completed).toBe(false);
    });
  });

  describe('GET /api/onboarding/stats', () => {
    it('should get onboarding statistics', async () => {
      const response = await request(app)
        .get('/api/onboarding/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_users');
      expect(response.body.data).toHaveProperty('completed_onboarding');
      expect(response.body.data).toHaveProperty('completion_rate');
      expect(response.body.data).toHaveProperty('average_completion_time');
      expect(response.body.data).toHaveProperty('step_completion_rates');
    });
  });
});
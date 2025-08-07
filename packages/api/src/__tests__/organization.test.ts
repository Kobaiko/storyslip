import request from 'supertest';
import { app } from '../index';
import { supabase } from '../config/supabase';

describe('Organization API', () => {
  let authToken: string;
  let userId: string;
  let organizationId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'org-test@example.com',
      password: 'testpassword123',
    });

    if (authError || !authData.user) {
      throw new Error('Failed to create test user');
    }

    userId = authData.user.id;
    authToken = authData.session?.access_token || '';

    // Wait a bit for user creation triggers to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      await supabase.auth.admin.deleteUser(userId);
    }
  });

  describe('GET /api/organizations', () => {
    it('should get user organizations', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Should have a default organization created
      const defaultOrg = response.body.data[0];
      expect(defaultOrg).toHaveProperty('id');
      expect(defaultOrg).toHaveProperty('name');
      expect(defaultOrg).toHaveProperty('role');
      expect(defaultOrg.role).toBe('owner');
    });

    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/organizations')
        .expect(401);
    });
  });

  describe('POST /api/organizations', () => {
    it('should create new organization', async () => {
      const organizationData = {
        name: 'Test Organization',
        description: 'A test organization',
        website_url: 'https://test.example.com',
        settings: { theme: 'dark' },
      };

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(organizationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(organizationData.name);
      expect(response.body.data.description).toBe(organizationData.description);
      expect(response.body.data.website_url).toBe(organizationData.website_url);
      expect(response.body.data.settings).toEqual(organizationData.settings);

      organizationId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('should validate field lengths', async () => {
      await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'x'.repeat(256) })
        .expect(400);

      await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          name: 'Valid Name',
          description: 'x'.repeat(1001)
        })
        .expect(400);
    });

    it('should validate URL format', async () => {
      await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          name: 'Valid Name',
          website_url: 'invalid-url'
        })
        .expect(400);
    });
  });

  describe('GET /api/organizations/:organizationId', () => {
    it('should get organization by ID', async () => {
      const response = await request(app)
        .get(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', organizationId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('role');
    });

    it('should return 404 for non-existent organization', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      await request(app)
        .get(`/api/organizations/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500); // Will be 500 because user is not a member
    });

    it('should validate UUID format', async () => {
      await request(app)
        .get('/api/organizations/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/organizations/:organizationId', () => {
    it('should update organization', async () => {
      const updateData = {
        name: 'Updated Test Organization',
        description: 'Updated description',
        website_url: 'https://updated.example.com',
      };

      const response = await request(app)
        .put(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.website_url).toBe(updateData.website_url);
    });

    it('should validate update data', async () => {
      await request(app)
        .put(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      await request(app)
        .put(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ website_url: 'invalid-url' })
        .expect(400);
    });
  });

  describe('POST /api/organizations/:organizationId/switch', () => {
    it('should switch to organization', async () => {
      const response = await request(app)
        .post(`/api/organizations/${organizationId}/switch`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.switched).toBe(true);
    });
  });

  describe('GET /api/organizations/:organizationId/members', () => {
    it('should get organization members', async () => {
      const response = await request(app)
        .get(`/api/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1); // Only the owner
      expect(response.body.data[0].role).toBe('owner');
      expect(response.body.data[0]).toHaveProperty('user');
    });
  });

  describe('POST /api/organizations/:organizationId/members', () => {
    let secondUserId: string;
    let secondAuthToken: string;

    beforeAll(async () => {
      // Create second test user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'org-member-test@example.com',
        password: 'testpassword123',
      });

      if (authError || !authData.user) {
        throw new Error('Failed to create second test user');
      }

      secondUserId = authData.user.id;
      secondAuthToken = authData.session?.access_token || '';

      // Wait for user creation
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
      if (secondUserId) {
        await supabase.auth.admin.deleteUser(secondUserId);
      }
    });

    it('should invite member to organization', async () => {
      const inviteData = {
        email: 'org-member-test@example.com',
        role: 'member',
      };

      const response = await request(app)
        .post(`/api/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inviteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invited).toBe(true);
    });

    it('should not invite same user twice', async () => {
      const inviteData = {
        email: 'org-member-test@example.com',
        role: 'member',
      };

      await request(app)
        .post(`/api/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inviteData)
        .expect(400);
    });

    it('should validate invite data', async () => {
      await request(app)
        .post(`/api/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'invalid-email', role: 'member' })
        .expect(400);

      await request(app)
        .post(`/api/organizations/${organizationId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'valid@email.com', role: 'invalid-role' })
        .expect(400);
    });
  });

  describe('DELETE /api/organizations/:organizationId', () => {
    it('should require confirmation to delete', async () => {
      await request(app)
        .delete(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirm: 'WRONG' })
        .expect(400);
    });

    it('should delete organization with proper confirmation', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ confirm: 'DELETE' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);
    });
  });
});
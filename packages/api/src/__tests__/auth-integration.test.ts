import request from 'supertest';
import { app } from '../index';
import { supabaseAdmin } from '../config/supabase';

describe('Authentication Integration Tests', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  };

  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    // Clean up any existing test user
    try {
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users.users.find(u => u.email === testUser.email);
      if (existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      }
    } catch (error) {
      // User doesn't exist, continue
    }
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (error) {
        console.log('Error cleaning up test user:', error);
      }
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.message).toContain('Registration successful');

      userId = response.body.data.user.id;
    });

    it('should not register user with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Logged out successfully');
    });
  });

  describe('POST /api/auth/request-password-reset', () => {
    it('should request password reset', async () => {
      const response = await request(app)
        .post('/api/auth/request-password-reset')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('password reset link');
    });
  });
});
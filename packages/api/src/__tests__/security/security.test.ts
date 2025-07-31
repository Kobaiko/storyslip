import request from 'supertest';
import { app } from '../../index';

// Mock external dependencies
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
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}));

describe('Security Tests', () => {
  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/websites')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication');
    });

    it('should reject requests with invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/websites')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('authentication');
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/websites')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .get('/api/websites')
        .set('Authorization', expiredToken)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('API Key Security', () => {
    it('should reject widget requests without API key', async () => {
      const response = await request(app)
        .get('/api/widget/website-123/content')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('API key');
    });

    it('should reject widget requests with invalid API key', async () => {
      const response = await request(app)
        .get('/api/widget/website-123/content')
        .set('X-API-Key', 'invalid-api-key')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('API key');
    });

    it('should reject API keys with wrong format', async () => {
      const response = await request(app)
        .get('/api/widget/website-123/content')
        .set('X-API-Key', 'wrong_format_key')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection in query parameters', async () => {
      const maliciousQuery = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/websites/website-123/content?search=${encodeURIComponent(maliciousQuery)}`)
        .set('Authorization', 'Bearer mock-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should prevent XSS in content creation', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post('/api/websites/website-123/content')
        .set('Authorization', 'Bearer mock-token')
        .send({
          title: xssPayload,
          content: `<p>Content with ${xssPayload}</p>`,
          status: 'published',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('should sanitize HTML content', async () => {
      const maliciousHtml = '<script>alert("XSS")</script><p>Valid content</p><iframe src="javascript:alert(1)"></iframe>';
      
      const response = await request(app)
        .post('/api/websites/website-123/content')
        .set('Authorization', 'Bearer mock-token')
        .send({
          title: 'Test Article',
          content: maliciousHtml,
          status: 'published',
        });

      // Should either reject or sanitize the content
      if (response.status === 201) {
        expect(response.body.data.content).not.toContain('<script>');
        expect(response.body.data.content).not.toContain('<iframe');
        expect(response.body.data.content).toContain('<p>Valid content</p>');
      } else {
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('validation');
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..double.dot@domain.com',
        'user@domain',
        'user@.domain.com',
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            email: email,
            password: 'securepassword123',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('validation');
      }
    });

    it('should enforce password complexity', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'abcdefgh',
        'PASSWORD',
        '12345abc',
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password: password,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('validation');
      }
    });

    it('should limit input field lengths', async () => {
      const longString = 'x'.repeat(10000);
      
      const response = await request(app)
        .post('/api/websites')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: longString,
          domain: 'test.example.com',
          description: longString,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('Authorization Security', () => {
    it('should prevent access to other users\' websites', async () => {
      const response = await request(app)
        .get('/api/websites/other-user-website-123')
        .set('Authorization', 'Bearer mock-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('access');
    });

    it('should prevent unauthorized content modification', async () => {
      const response = await request(app)
        .put('/api/websites/other-user-website-123/content/content-123')
        .set('Authorization', 'Bearer mock-token')
        .send({
          title: 'Modified Title',
          content: '<p>Modified content</p>',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should enforce role-based permissions', async () => {
      // Mock user with viewer role
      (global as any).mockUser = {
        id: 'user-123',
        email: 'viewer@example.com',
        role: 'viewer',
      };

      const response = await request(app)
        .delete('/api/websites/website-123/content/content-123')
        .set('Authorization', 'Bearer mock-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('permission');
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const requests = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on registration endpoints', async () => {
      const requests = Array.from({ length: 15 }, (_, i) =>
        request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            email: `test${i}@example.com`,
            password: 'securepassword123',
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limits on API endpoints', async () => {
      const requests = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/widget/website-123/content')
          .set('X-API-Key', 'sk_test_123')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Security', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should restrict CORS to allowed origins', async () => {
      const response = await request(app)
        .get('/api/widget/website-123/content')
        .set('Origin', 'https://malicious-site.com')
        .set('X-API-Key', 'sk_test_123');

      // Should either block or not include CORS headers for unauthorized origins
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should not expose sensitive server information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types for media uploads', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', 'Bearer mock-token')
        .attach('file', Buffer.from('fake-executable-content'), {
          filename: 'malicious.exe',
          contentType: 'application/octet-stream',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('file type');
    });

    it('should limit file sizes', async () => {
      const largeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
      
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', 'Bearer mock-token')
        .attach('file', largeBuffer, {
          filename: 'large-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('file size');
    });

    it('should scan uploaded files for malware signatures', async () => {
      // Mock malware signature
      const malwareBuffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
      
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', 'Bearer mock-token')
        .attach('file', malwareBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('security');
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose sensitive user data in responses', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.password_hash).toBeUndefined();
      expect(response.body.data.verification_token).toBeUndefined();
    });

    it('should not expose internal system information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.database_connection_string).toBeUndefined();
      expect(response.body.jwt_secret).toBeUndefined();
      expect(response.body.api_keys).toBeUndefined();
    });

    it('should mask sensitive data in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).not.toContain('password');
      expect(response.body.message).not.toContain('hash');
      expect(response.body.message).not.toContain('database');
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correctpassword',
        });

      const token = loginResponse.body.data?.token;
      
      if (token) {
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Token should be invalid after logout
        await request(app)
          .get('/api/users/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });

    it('should enforce session timeouts', async () => {
      // Mock expired session
      const expiredToken = 'Bearer expired-session-token';
      
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', expiredToken)
        .expect(401);

      expect(response.body.message).toContain('expired');
    });
  });

  describe('Injection Attack Prevention', () => {
    it('should prevent NoSQL injection', async () => {
      const maliciousPayload = { $ne: null };
      
      const response = await request(app)
        .post('/api/websites/website-123/content')
        .set('Authorization', 'Bearer mock-token')
        .send({
          title: maliciousPayload,
          content: '<p>Test content</p>',
          status: 'published',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent command injection', async () => {
      const commandInjection = 'test; rm -rf /';
      
      const response = await request(app)
        .post('/api/websites')
        .set('Authorization', 'Bearer mock-token')
        .send({
          name: commandInjection,
          domain: 'test.example.com',
          description: 'Test website',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent LDAP injection', async () => {
      const ldapInjection = 'admin)(|(password=*';
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: ldapInjection,
          password: 'password',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
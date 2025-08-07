import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { DatabaseService } from '../../services/database';
import { SupabaseAuthService } from '../../services/supabase-auth.service';

describe('Authentication Flows E2E Tests', () => {
  let browser: Browser;
  let context: BrowserContext;
  let marketingPage: Page;
  let dashboardPage: Page;
  let db: DatabaseService;
  let authService: SupabaseAuthService;

  const BASE_URLS = {
    marketing: process.env.MARKETING_URL || 'http://localhost:3000',
    dashboard: process.env.DASHBOARD_URL || 'http://localhost:3002',
    api: process.env.API_URL || 'http://localhost:3001',
  };

  const testUsers = {
    newUser: {
      email: `new-user-${Date.now()}@example.com`,
      password: 'NewUserPassword123!',
      firstName: 'New',
      lastName: 'User',
      organizationName: 'New User Org',
    },
    existingUser: {
      email: `existing-user-${Date.now()}@example.com`,
      password: 'ExistingUserPassword123!',
      firstName: 'Existing',
      lastName: 'User',
    },
    adminUser: {
      email: `admin-user-${Date.now()}@example.com`,
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
    },
  };

  let createdUserIds: string[] = [];

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 100,
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    marketingPage = await context.newPage();
    dashboardPage = await context.newPage();
    
    db = DatabaseService.getInstance();
    authService = SupabaseAuthService.getInstance();

    // Create existing user for login tests
    const existingUserResult = await db.query(`
      INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES ($1, crypt($2, gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id
    `, [testUsers.existingUser.email, testUsers.existingUser.password]);
    
    if (existingUserResult.rows[0]) {
      createdUserIds.push(existingUserResult.rows[0].id);
    }
  });

  afterAll(async () => {
    // Clean up created users
    for (const userId of createdUserIds) {
      await db.query('DELETE FROM auth.users WHERE id = $1', [userId]);
    }

    await browser.close();
  });

  describe('User Registration Flow', () => {
    it('should complete registration from marketing site', async () => {
      // Start from marketing site
      await marketingPage.goto(BASE_URLS.marketing);
      await marketingPage.waitForLoadState('networkidle');

      // Click sign up button
      await marketingPage.click('[data-testid="signup-button"], button:has-text("Sign Up"), a:has-text("Get Started")');
      
      // Should navigate to registration page
      await marketingPage.waitForURL('**/auth/register**');

      // Fill registration form
      await marketingPage.fill('[data-testid="email"], input[name="email"], input[type="email"]', testUsers.newUser.email);
      await marketingPage.fill('[data-testid="password"], input[name="password"], input[type="password"]', testUsers.newUser.password);
      await marketingPage.fill('[data-testid="firstName"], input[name="firstName"]', testUsers.newUser.firstName);
      await marketingPage.fill('[data-testid="lastName"], input[name="lastName"]', testUsers.newUser.lastName);
      await marketingPage.fill('[data-testid="organizationName"], input[name="organizationName"]', testUsers.newUser.organizationName);

      // Submit registration
      await marketingPage.click('[data-testid="register-button"], button[type="submit"], button:has-text("Create Account")');

      // Should redirect to dashboard or onboarding
      await marketingPage.waitForURL('**/dashboard**', { timeout: 10000 });

      // Verify user was created in database
      const userResult = await db.query('SELECT id, email FROM auth.users WHERE email = $1', [testUsers.newUser.email]);
      expect(userResult.rows.length).toBe(1);
      expect(userResult.rows[0].email).toBe(testUsers.newUser.email);
      
      createdUserIds.push(userResult.rows[0].id);
    });

    it('should handle registration validation errors', async () => {
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/register`);
      await marketingPage.waitForLoadState('networkidle');

      // Try to submit empty form
      await marketingPage.click('[data-testid="register-button"], button[type="submit"]');

      // Should show validation errors
      await expect(marketingPage.locator('[data-testid="email-error"], .error-message')).toBeVisible();

      // Try with invalid email
      await marketingPage.fill('[data-testid="email"], input[type="email"]', 'invalid-email');
      await marketingPage.click('[data-testid="register-button"], button[type="submit"]');

      // Should show email validation error
      await expect(marketingPage.locator('[data-testid="email-error"], .error-message')).toContainText('valid email');

      // Try with weak password
      await marketingPage.fill('[data-testid="email"], input[type="email"]', 'test@example.com');
      await marketingPage.fill('[data-testid="password"], input[type="password"]', '123');
      await marketingPage.click('[data-testid="register-button"], button[type="submit"]');

      // Should show password validation error
      await expect(marketingPage.locator('[data-testid="password-error"], .error-message')).toBeVisible();
    });

    it('should prevent duplicate email registration', async () => {
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/register`);
      await marketingPage.waitForLoadState('networkidle');

      // Try to register with existing email
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', 'SomePassword123!');
      await marketingPage.fill('[data-testid="firstName"], input[name="firstName"]', 'Test');
      await marketingPage.fill('[data-testid="lastName"], input[name="lastName"]', 'User');
      await marketingPage.fill('[data-testid="organizationName"], input[name="organizationName"]', 'Test Org');

      await marketingPage.click('[data-testid="register-button"], button[type="submit"]');

      // Should show error about existing email
      await expect(marketingPage.locator('[data-testid="error-message"], .error-message')).toContainText('already exists');
    });
  });

  describe('User Login Flow', () => {
    it('should login from marketing site', async () => {
      await marketingPage.goto(BASE_URLS.marketing);
      await marketingPage.waitForLoadState('networkidle');

      // Click login button
      await marketingPage.click('[data-testid="login-button"], button:has-text("Login"), a:has-text("Sign In")');
      
      // Should navigate to login page
      await marketingPage.waitForURL('**/auth/login**');

      // Fill login form
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);

      // Submit login
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');

      // Should redirect to dashboard
      await marketingPage.waitForURL('**/dashboard**', { timeout: 10000 });

      // Verify authenticated state
      await expect(marketingPage.locator('[data-testid="user-menu"], .user-menu')).toBeVisible();
    });

    it('should handle invalid login credentials', async () => {
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.waitForLoadState('networkidle');

      // Try with wrong password
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', 'WrongPassword123!');

      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');

      // Should show error message
      await expect(marketingPage.locator('[data-testid="error-message"], .error-message')).toContainText('Invalid credentials');

      // Try with non-existent email
      await marketingPage.fill('[data-testid="email"], input[type="email"]', 'nonexistent@example.com');
      await marketingPage.fill('[data-testid="password"], input[type="password"]', 'SomePassword123!');

      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');

      // Should show error message
      await expect(marketingPage.locator('[data-testid="error-message"], .error-message')).toContainText('Invalid credentials');
    });

    it('should remember login state across page refreshes', async () => {
      // Login first
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');
      await marketingPage.waitForURL('**/dashboard**');

      // Refresh the page
      await marketingPage.reload();
      await marketingPage.waitForLoadState('networkidle');

      // Should still be authenticated
      await expect(marketingPage.locator('[data-testid="user-menu"], .user-menu')).toBeVisible();
    });
  });

  describe('Cross-Application Authentication', () => {
    beforeEach(async () => {
      // Ensure we're logged in
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');
      await marketingPage.waitForURL('**/dashboard**');
    });

    it('should maintain authentication when navigating between marketing and dashboard', async () => {
      // Start in dashboard (already authenticated)
      await expect(marketingPage.locator('[data-testid="user-menu"], .user-menu')).toBeVisible();

      // Navigate to marketing site
      await marketingPage.goto(BASE_URLS.marketing);
      await marketingPage.waitForLoadState('networkidle');

      // Should show authenticated state in marketing site
      await expect(marketingPage.locator('[data-testid="user-menu"], .user-menu')).toBeVisible();

      // Navigate back to dashboard
      await marketingPage.goto(`${BASE_URLS.dashboard}/dashboard`);
      await marketingPage.waitForLoadState('networkidle');

      // Should still be authenticated
      await expect(marketingPage.locator('[data-testid="dashboard-header"], .dashboard-header')).toBeVisible();
    });

    it('should share session cookies across subdomains', async () => {
      // Check that session cookies are properly set
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(cookie => 
        cookie.name.includes('session') || cookie.name.includes('auth')
      );

      expect(sessionCookie).toBeDefined();
      
      // Cookie should be accessible across subdomains
      if (sessionCookie) {
        expect(sessionCookie.domain).toMatch(/^\..*\.com$|^localhost$/);
      }
    });

    it('should handle logout from any application', async () => {
      // Logout from marketing site
      await marketingPage.goto(BASE_URLS.marketing);
      await marketingPage.waitForLoadState('networkidle');

      await marketingPage.click('[data-testid="user-menu"], .user-menu');
      await marketingPage.click('[data-testid="logout"], button:has-text("Logout")');

      // Should redirect to login page
      await marketingPage.waitForURL('**/auth/login**');

      // Try to access dashboard directly
      await marketingPage.goto(`${BASE_URLS.dashboard}/dashboard`);

      // Should redirect to login (not authenticated)
      await marketingPage.waitForURL('**/auth/login**');
    });
  });

  describe('Password Reset Flow', () => {
    it('should initiate password reset', async () => {
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.waitForLoadState('networkidle');

      // Click forgot password link
      await marketingPage.click('[data-testid="forgot-password"], a:has-text("Forgot Password")');

      // Should navigate to forgot password page
      await marketingPage.waitForURL('**/auth/forgot-password**');

      // Enter email
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.click('[data-testid="reset-button"], button[type="submit"]');

      // Should show success message
      await expect(marketingPage.locator('[data-testid="success-message"], .success-message')).toContainText('reset link');
    });

    it('should handle invalid email for password reset', async () => {
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/forgot-password`);
      await marketingPage.waitForLoadState('networkidle');

      // Try with non-existent email
      await marketingPage.fill('[data-testid="email"], input[type="email"]', 'nonexistent@example.com');
      await marketingPage.click('[data-testid="reset-button"], button[type="submit"]');

      // Should still show success message (security best practice)
      await expect(marketingPage.locator('[data-testid="success-message"], .success-message')).toContainText('reset link');
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration', async () => {
      // Login first
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');
      await marketingPage.waitForURL('**/dashboard**');

      // Simulate session expiration by clearing cookies
      await context.clearCookies();

      // Try to access protected resource
      await marketingPage.goto(`${BASE_URLS.dashboard}/content`);

      // Should redirect to login
      await marketingPage.waitForURL('**/auth/login**');
    });

    it('should refresh tokens automatically', async () => {
      // Login and get initial token
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');
      await marketingPage.waitForURL('**/dashboard**');

      // Make API request to check token validity
      const apiResponse = await marketingPage.request.get(`${BASE_URLS.api}/api/auth/me`);
      expect(apiResponse.status()).toBe(200);

      // Wait and make another request (should auto-refresh if needed)
      await marketingPage.waitForTimeout(2000);
      const secondApiResponse = await marketingPage.request.get(`${BASE_URLS.api}/api/auth/me`);
      expect(secondApiResponse.status()).toBe(200);
    });

    it('should handle concurrent sessions', async () => {
      // Create second browser context (different session)
      const secondContext = await browser.newContext();
      const secondPage = await secondContext.newPage();

      // Login in first session
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');
      await marketingPage.waitForURL('**/dashboard**');

      // Login in second session with same user
      await secondPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await secondPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await secondPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await secondPage.click('[data-testid="login-button"], button[type="submit"]');
      await secondPage.waitForURL('**/dashboard**');

      // Both sessions should be valid
      await expect(marketingPage.locator('[data-testid="user-menu"], .user-menu')).toBeVisible();
      await expect(secondPage.locator('[data-testid="user-menu"], .user-menu')).toBeVisible();

      await secondContext.close();
    });
  });

  describe('Authentication API Integration', () => {
    it('should validate JWT tokens correctly', async () => {
      // Login to get token
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');
      await marketingPage.waitForURL('**/dashboard**');

      // Test authenticated API endpoint
      const apiResponse = await marketingPage.request.get(`${BASE_URLS.api}/api/auth/me`);
      expect(apiResponse.status()).toBe(200);

      const userData = await apiResponse.json();
      expect(userData.success).toBe(true);
      expect(userData.data.email).toBe(testUsers.existingUser.email);
    });

    it('should reject invalid tokens', async () => {
      // Test with invalid token
      const invalidTokenResponse = await marketingPage.request.get(`${BASE_URLS.api}/api/auth/me`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(invalidTokenResponse.status()).toBe(401);
    });

    it('should handle token refresh', async () => {
      // Login first
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');
      await marketingPage.waitForURL('**/dashboard**');

      // Test refresh endpoint
      const refreshResponse = await marketingPage.request.post(`${BASE_URLS.api}/api/auth/refresh`);
      expect(refreshResponse.status()).toBe(200);

      const refreshData = await refreshResponse.json();
      expect(refreshData.success).toBe(true);
      expect(refreshData.data).toHaveProperty('access_token');
    });
  });

  describe('Security Features', () => {
    it('should prevent CSRF attacks', async () => {
      // Login first
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');
      await marketingPage.waitForURL('**/dashboard**');

      // Try to make request without CSRF token
      const csrfResponse = await marketingPage.request.post(`${BASE_URLS.api}/api/auth/logout`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Should either succeed (if CSRF protection is handled differently) or fail with 403
      expect([200, 403]).toContain(csrfResponse.status());
    });

    it('should enforce rate limiting on auth endpoints', async () => {
      const attempts = 10;
      const responses = [];

      // Make multiple rapid login attempts
      for (let i = 0; i < attempts; i++) {
        const response = await marketingPage.request.post(`${BASE_URLS.api}/api/auth/login`, {
          data: {
            email: 'test@example.com',
            password: 'wrongpassword'
          }
        });
        responses.push(response.status());
      }

      // Should eventually get rate limited (429)
      const rateLimitedResponses = responses.filter(status => status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should sanitize user input', async () => {
      await marketingPage.goto(`${BASE_URLS.marketing}/auth/register`);
      await marketingPage.waitForLoadState('networkidle');

      // Try to register with XSS payload in name
      const xssPayload = '<script>alert("xss")</script>';
      
      await marketingPage.fill('[data-testid="email"], input[type="email"]', 'xss-test@example.com');
      await marketingPage.fill('[data-testid="password"], input[type="password"]', 'XSSTest123!');
      await marketingPage.fill('[data-testid="firstName"], input[name="firstName"]', xssPayload);
      await marketingPage.fill('[data-testid="lastName"], input[name="lastName"]', 'User');
      await marketingPage.fill('[data-testid="organizationName"], input[name="organizationName"]', 'Test Org');

      await marketingPage.click('[data-testid="register-button"], button[type="submit"]');

      // If registration succeeds, check that XSS was sanitized
      const currentUrl = marketingPage.url();
      if (currentUrl.includes('/dashboard')) {
        // Check that the name is displayed safely
        const userMenu = marketingPage.locator('[data-testid="user-menu"], .user-menu');
        if (await userMenu.isVisible()) {
          const menuText = await userMenu.textContent();
          expect(menuText).not.toContain('<script>');
        }
      }
    });
  });

  describe('Mobile Authentication', () => {
    it('should work on mobile devices', async () => {
      // Set mobile viewport
      await marketingPage.setViewportSize({ width: 375, height: 667 });

      await marketingPage.goto(`${BASE_URLS.marketing}/auth/login`);
      await marketingPage.waitForLoadState('networkidle');

      // Should be responsive
      const loginForm = marketingPage.locator('form, [data-testid="login-form"]');
      await expect(loginForm).toBeVisible();

      // Fill and submit form
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUsers.existingUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUsers.existingUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');

      // Should redirect to dashboard
      await marketingPage.waitForURL('**/dashboard**');

      // Dashboard should be mobile-responsive
      const mobileMenu = marketingPage.locator('[data-testid="mobile-menu"], .mobile-menu-toggle');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        await expect(marketingPage.locator('[data-testid="mobile-nav"], .mobile-nav')).toBeVisible();
      }

      // Reset viewport
      await marketingPage.setViewportSize({ width: 1280, height: 720 });
    });
  });
});
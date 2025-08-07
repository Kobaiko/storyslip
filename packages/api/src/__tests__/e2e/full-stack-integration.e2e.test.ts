import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { DatabaseService } from '../../services/database';
import { SupabaseAuthService } from '../../services/supabase-auth.service';
import { ContentService } from '../../services/content.service';
import { WidgetService } from '../../services/widget.service';
import { WidgetAuthService } from '../../services/widget-auth.service';

describe('Full-Stack Integration E2E Tests', () => {
  let browser: Browser;
  let context: BrowserContext;
  let marketingPage: Page;
  let dashboardPage: Page;
  let db: DatabaseService;
  
  // Test data
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    organizationName: 'Test Organization',
  };

  let testUserId: string;
  let testWebsiteId: string;
  let testContentId: string;
  let testWidgetId: string;
  let testAPIKey: string;

  const BASE_URLS = {
    marketing: process.env.MARKETING_URL || 'http://localhost:3000',
    dashboard: process.env.DASHBOARD_URL || 'http://localhost:3002',
    api: process.env.API_URL || 'http://localhost:3001',
  };

  beforeAll(async () => {
    // Launch browser
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 100,
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    // Initialize database connection
    db = DatabaseService.getInstance();

    // Create pages
    marketingPage = await context.newPage();
    dashboardPage = await context.newPage();

    // Set up console logging for debugging
    marketingPage.on('console', msg => console.log(`Marketing: ${msg.text()}`));
    dashboardPage.on('console', msg => console.log(`Dashboard: ${msg.text()}`));
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await db.query('DELETE FROM auth.users WHERE id = $1', [testUserId]);
    }

    await browser.close();
  });

  describe('Complete User Journey', () => {
    it('should complete the full user registration and onboarding flow', async () => {
      // Step 1: Visit marketing site
      await marketingPage.goto(BASE_URLS.marketing);
      await marketingPage.waitForLoadState('networkidle');

      // Verify marketing site loads
      await expect(marketingPage.locator('h1')).toContainText('StorySlip');
      
      // Step 2: Click "Start Free Trial" button
      await marketingPage.click('[data-testid="cta-button"], .cta-button, button:has-text("Start Free Trial")');
      
      // Should redirect to registration page
      await marketingPage.waitForURL('**/auth/register**');

      // Step 3: Fill registration form
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUser.password);
      await marketingPage.fill('[data-testid="firstName"], input[name="firstName"]', testUser.firstName);
      await marketingPage.fill('[data-testid="lastName"], input[name="lastName"]', testUser.lastName);
      await marketingPage.fill('[data-testid="organizationName"], input[name="organizationName"]', testUser.organizationName);

      // Submit registration
      await marketingPage.click('[data-testid="register-button"], button[type="submit"]');

      // Step 4: Wait for successful registration and redirect to dashboard
      await marketingPage.waitForURL('**/dashboard**', { timeout: 10000 });

      // Verify we're in the dashboard
      await expect(marketingPage.locator('[data-testid="dashboard-header"], .dashboard-header')).toBeVisible();

      // Get user ID for cleanup
      const userResult = await db.query('SELECT id FROM auth.users WHERE email = $1', [testUser.email]);
      testUserId = userResult.rows[0]?.id;
      expect(testUserId).toBeDefined();
    });

    it('should complete the onboarding flow', async () => {
      // Should see onboarding flow
      await marketingPage.waitForSelector('[data-testid="onboarding-flow"], .onboarding-flow', { timeout: 5000 });

      // Step 1: Website setup
      await marketingPage.fill('[data-testid="website-name"], input[name="websiteName"]', 'Test Website');
      await marketingPage.fill('[data-testid="website-domain"], input[name="domain"]', 'test.example.com');
      await marketingPage.click('[data-testid="next-button"], button:has-text("Next")');

      // Step 2: Content preferences
      await marketingPage.check('[data-testid="content-type-blog"], input[value="blog"]');
      await marketingPage.check('[data-testid="content-type-news"], input[value="news"]');
      await marketingPage.click('[data-testid="next-button"], button:has-text("Next")');

      // Step 3: Complete onboarding
      await marketingPage.click('[data-testid="complete-onboarding"], button:has-text("Complete")');

      // Should redirect to main dashboard
      await marketingPage.waitForURL('**/dashboard**');
      await expect(marketingPage.locator('[data-testid="welcome-message"], .welcome-message')).toBeVisible();

      // Get website ID for later tests
      const websiteResult = await db.query(`
        SELECT w.id FROM websites w 
        JOIN auth.users u ON w.user_id = u.id 
        WHERE u.email = $1
      `, [testUser.email]);
      testWebsiteId = websiteResult.rows[0]?.id;
      expect(testWebsiteId).toBeDefined();
    });

    it('should create and manage content', async () => {
      // Navigate to content section
      await marketingPage.click('[data-testid="nav-content"], a[href*="content"]');
      await marketingPage.waitForURL('**/content**');

      // Create new content
      await marketingPage.click('[data-testid="create-content"], button:has-text("Create Content")');

      // Fill content form
      await marketingPage.fill('[data-testid="content-title"], input[name="title"]', 'Test Article');
      await marketingPage.fill('[data-testid="content-excerpt"], textarea[name="excerpt"]', 'This is a test article excerpt');
      
      // Fill rich text editor
      const editor = marketingPage.locator('[data-testid="content-editor"], .rich-text-editor');
      await editor.click();
      await editor.fill('This is the main content of the test article. It contains multiple paragraphs and should be properly formatted.');

      // Add tags
      await marketingPage.fill('[data-testid="content-tags"], input[name="tags"]', 'test, integration, e2e');
      await marketingPage.press('[data-testid="content-tags"], input[name="tags"]', 'Enter');

      // Set category
      await marketingPage.selectOption('[data-testid="content-category"], select[name="category"]', 'Blog');

      // Save content
      await marketingPage.click('[data-testid="save-content"], button:has-text("Save")');

      // Verify content was created
      await expect(marketingPage.locator('[data-testid="success-message"], .success-message')).toContainText('Content saved');

      // Get content ID
      const contentResult = await db.query(`
        SELECT c.id FROM content c 
        JOIN websites w ON c.website_id = w.id
        JOIN auth.users u ON w.user_id = u.id
        WHERE u.email = $1 AND c.title = 'Test Article'
      `, [testUser.email]);
      testContentId = contentResult.rows[0]?.id;
      expect(testContentId).toBeDefined();
    });

    it('should publish content', async () => {
      // Find the content in the list
      await marketingPage.click(`[data-testid="content-item-${testContentId}"], .content-item:has-text("Test Article")`);

      // Open publish modal
      await marketingPage.click('[data-testid="publish-content"], button:has-text("Publish")');

      // Confirm publishing
      await marketingPage.click('[data-testid="confirm-publish"], button:has-text("Confirm")');

      // Verify content is published
      await expect(marketingPage.locator('[data-testid="content-status"], .content-status')).toContainText('Published');

      // Verify in database
      const publishedContent = await db.query('SELECT status FROM content WHERE id = $1', [testContentId]);
      expect(publishedContent.rows[0].status).toBe('published');
    });

    it('should create and configure a widget', async () => {
      // Navigate to widgets section
      await marketingPage.click('[data-testid="nav-widgets"], a[href*="widgets"]');
      await marketingPage.waitForURL('**/widgets**');

      // Create new widget
      await marketingPage.click('[data-testid="create-widget"], button:has-text("Create Widget")');

      // Fill widget form
      await marketingPage.fill('[data-testid="widget-title"], input[name="title"]', 'Test Content Widget');
      await marketingPage.fill('[data-testid="widget-description"], textarea[name="description"]', 'A test widget for integration testing');

      // Select widget type
      await marketingPage.selectOption('[data-testid="widget-type"], select[name="type"]', 'content');

      // Configure widget settings
      await marketingPage.selectOption('[data-testid="widget-theme"], select[name="theme"]', 'modern');
      await marketingPage.selectOption('[data-testid="widget-layout"], select[name="layout"]', 'grid');

      // Set items per page
      await marketingPage.fill('[data-testid="items-per-page"], input[name="itemsPerPage"]', '5');

      // Enable features
      await marketingPage.check('[data-testid="show-images"], input[name="showImages"]');
      await marketingPage.check('[data-testid="show-excerpts"], input[name="showExcerpts"]');
      await marketingPage.check('[data-testid="show-dates"], input[name="showDates"]');

      // Save widget
      await marketingPage.click('[data-testid="save-widget"], button:has-text("Save Widget")');

      // Verify widget was created
      await expect(marketingPage.locator('[data-testid="success-message"], .success-message')).toContainText('Widget created');

      // Get widget ID
      const widgetResult = await db.query(`
        SELECT w.id FROM widgets w 
        JOIN websites ws ON w.website_id = ws.id
        JOIN auth.users u ON ws.user_id = u.id
        WHERE u.email = $1 AND w.title = 'Test Content Widget'
      `, [testUser.email]);
      testWidgetId = widgetResult.rows[0]?.id;
      expect(testWidgetId).toBeDefined();
    });

    it('should generate widget embed code', async () => {
      // Open widget details
      await marketingPage.click(`[data-testid="widget-item-${testWidgetId}"], .widget-item:has-text("Test Content Widget")`);

      // Open embed code modal
      await marketingPage.click('[data-testid="get-embed-code"], button:has-text("Get Embed Code")');

      // Verify embed code modal is open
      await expect(marketingPage.locator('[data-testid="embed-modal"], .embed-modal')).toBeVisible();

      // Check JavaScript embed code
      await marketingPage.click('[data-testid="embed-type-javascript"], button:has-text("JavaScript")');
      const jsEmbedCode = await marketingPage.textContent('[data-testid="embed-code"], .embed-code');
      expect(jsEmbedCode).toContain('data-storyslip-widget');
      expect(jsEmbedCode).toContain(testWidgetId);

      // Check iframe embed code
      await marketingPage.click('[data-testid="embed-type-iframe"], button:has-text("iframe")');
      const iframeEmbedCode = await marketingPage.textContent('[data-testid="embed-code"], .embed-code');
      expect(iframeEmbedCode).toContain('<iframe');
      expect(iframeEmbedCode).toContain(testWidgetId);

      // Copy embed code
      await marketingPage.click('[data-testid="copy-embed-code"], button:has-text("Copy")');
      await expect(marketingPage.locator('[data-testid="copy-success"], .copy-success')).toContainText('Copied');
    });

    it('should publish widget and test delivery', async () => {
      // Publish the widget
      await marketingPage.click('[data-testid="publish-widget"], button:has-text("Publish")');
      await marketingPage.click('[data-testid="confirm-publish"], button:has-text("Confirm")');

      // Verify widget is published
      await expect(marketingPage.locator('[data-testid="widget-status"], .widget-status')).toContainText('Published');

      // Test widget delivery endpoint
      const widgetResponse = await marketingPage.request.get(`${BASE_URLS.api}/api/widgets/public/${testWidgetId}/render`);
      expect(widgetResponse.status()).toBe(200);

      const widgetData = await widgetResponse.json();
      expect(widgetData.success).toBe(true);
      expect(widgetData.data).toHaveProperty('html');
      expect(widgetData.data).toHaveProperty('css');
      expect(widgetData.data).toHaveProperty('js');
      expect(widgetData.data.html).toContain('Test Article');
    });

    it('should generate and validate API key', async () => {
      // Navigate to widget settings
      await marketingPage.click('[data-testid="widget-settings"], button:has-text("Settings")');

      // Generate API key
      await marketingPage.click('[data-testid="generate-api-key"], button:has-text("Generate API Key")');
      await marketingPage.fill('[data-testid="api-key-name"], input[name="keyName"]', 'Test Integration Key');
      await marketingPage.click('[data-testid="create-api-key"], button:has-text("Create")');

      // Copy API key
      const apiKeyElement = marketingPage.locator('[data-testid="api-key-value"], .api-key-value');
      await expect(apiKeyElement).toBeVisible();
      testAPIKey = await apiKeyElement.textContent() || '';
      expect(testAPIKey).toMatch(/^sk_[a-f0-9]{64}$/);

      // Test API key validation
      const authService = WidgetAuthService.getInstance();
      const validation = await authService.validateAPIKey(testAPIKey, 'read');
      expect(validation.valid).toBe(true);
      expect(validation.keyData?.widget_id).toBe(testWidgetId);
    });

    it('should test cross-application authentication', async () => {
      // Test that user is authenticated across applications
      
      // Visit marketing site in same context
      await marketingPage.goto(BASE_URLS.marketing);
      await marketingPage.waitForLoadState('networkidle');

      // Should show authenticated state
      await expect(marketingPage.locator('[data-testid="user-menu"], .user-menu')).toBeVisible();
      await expect(marketingPage.locator('[data-testid="user-email"], .user-email')).toContainText(testUser.email);

      // Test logout from marketing site
      await marketingPage.click('[data-testid="user-menu"], .user-menu');
      await marketingPage.click('[data-testid="logout"], button:has-text("Logout")');

      // Should redirect to login page
      await marketingPage.waitForURL('**/auth/login**');

      // Test login again
      await marketingPage.fill('[data-testid="email"], input[type="email"]', testUser.email);
      await marketingPage.fill('[data-testid="password"], input[type="password"]', testUser.password);
      await marketingPage.click('[data-testid="login-button"], button[type="submit"]');

      // Should redirect back to dashboard
      await marketingPage.waitForURL('**/dashboard**');
      await expect(marketingPage.locator('[data-testid="dashboard-header"], .dashboard-header')).toBeVisible();
    });

    it('should test widget analytics tracking', async () => {
      // Create a test page to embed the widget
      const testPageContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget Test Page</title>
        </head>
        <body>
          <div id="test-widget" 
               data-storyslip-widget 
               data-widget-id="${testWidgetId}" 
               data-widget-type="content"
               data-widget-layout="grid"
               data-widget-theme="modern">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      // Create a new page for widget testing
      const widgetTestPage = await context.newPage();
      await widgetTestPage.setContent(testPageContent);

      // Wait for widget to load
      await widgetTestPage.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 10000 });

      // Verify widget content is displayed
      await expect(widgetTestPage.locator('.storyslip-widget')).toContainText('Test Article');

      // Check that analytics were tracked
      await widgetTestPage.waitForTimeout(2000); // Allow time for analytics to be sent

      const analyticsResult = await db.query(`
        SELECT COUNT(*) as count FROM widget_analytics 
        WHERE widget_id = $1 AND event_type = 'view'
      `, [testWidgetId]);
      
      expect(parseInt(analyticsResult.rows[0].count)).toBeGreaterThan(0);

      await widgetTestPage.close();
    });

    it('should test content synchronization', async () => {
      // Edit content in one session
      await marketingPage.goto(`${BASE_URLS.dashboard}/content/${testContentId}/edit`);
      await marketingPage.waitForLoadState('networkidle');

      // Modify content
      const newTitle = 'Updated Test Article';
      await marketingPage.fill('[data-testid="content-title"], input[name="title"]', newTitle);

      // Open second session in new page
      const secondSession = await context.newPage();
      await secondSession.goto(`${BASE_URLS.dashboard}/content/${testContentId}/edit`);
      await secondSession.waitForLoadState('networkidle');

      // Modify content in second session
      const secondTitle = 'Conflicting Update';
      await secondSession.fill('[data-testid="content-title"], input[name="title"]', secondTitle);

      // Save first session
      await marketingPage.click('[data-testid="save-content"], button:has-text("Save")');
      await expect(marketingPage.locator('[data-testid="success-message"], .success-message')).toBeVisible();

      // Try to save second session (should detect conflict)
      await secondSession.click('[data-testid="save-content"], button:has-text("Save")');
      
      // Should show conflict resolution modal
      await expect(secondSession.locator('[data-testid="conflict-modal"], .conflict-modal')).toBeVisible();

      // Resolve conflict by keeping current changes
      await secondSession.click('[data-testid="keep-current"], button:has-text("Keep Current")');
      await expect(secondSession.locator('[data-testid="success-message"], .success-message')).toBeVisible();

      await secondSession.close();
    });

    it('should test responsive widget behavior', async () => {
      // Test widget at different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const viewport of viewports) {
        const responsiveTestPage = await context.newPage();
        await responsiveTestPage.setViewportSize(viewport);

        const testPageContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Responsive Widget Test</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body>
            <div id="responsive-widget" 
                 data-storyslip-widget 
                 data-widget-id="${testWidgetId}" 
                 data-widget-type="content"
                 data-widget-layout="grid"
                 data-widget-theme="modern">
              Loading...
            </div>
            <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
          </body>
          </html>
        `;

        await responsiveTestPage.setContent(testPageContent);
        await responsiveTestPage.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 10000 });

        // Verify widget adapts to viewport
        const widget = responsiveTestPage.locator('.storyslip-widget');
        await expect(widget).toBeVisible();

        // Check responsive classes are applied
        if (viewport.width < 640) {
          await expect(widget).toHaveClass(/storyslip-sm/);
        } else if (viewport.width < 1024) {
          await expect(widget).toHaveClass(/storyslip-md/);
        } else {
          await expect(widget).toHaveClass(/storyslip-lg/);
        }

        await responsiveTestPage.close();
      }
    });

    it('should test error handling and fallbacks', async () => {
      // Test with invalid widget ID
      const errorTestPage = await context.newPage();
      const errorPageContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error Test Page</title>
        </head>
        <body>
          <div id="error-widget" 
               data-storyslip-widget 
               data-widget-id="invalid-widget-id" 
               data-widget-type="content">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await errorTestPage.setContent(errorPageContent);
      
      // Should show error state
      await errorTestPage.waitForSelector('.storyslip-error', { timeout: 10000 });
      await expect(errorTestPage.locator('.storyslip-error')).toContainText('Content Unavailable');

      await errorTestPage.close();
    });
  });

  describe('Performance Tests', () => {
    it('should load pages within acceptable time limits', async () => {
      const performanceTests = [
        { name: 'Marketing Home', url: BASE_URLS.marketing, maxTime: 3000 },
        { name: 'Dashboard', url: `${BASE_URLS.dashboard}/dashboard`, maxTime: 5000 },
        { name: 'Widget Render', url: `${BASE_URLS.api}/api/widgets/public/${testWidgetId}/render`, maxTime: 2000 },
      ];

      for (const test of performanceTests) {
        const startTime = Date.now();
        const response = await marketingPage.request.get(test.url);
        const loadTime = Date.now() - startTime;

        expect(response.status()).toBe(200);
        expect(loadTime).toBeLessThan(test.maxTime);
        
        console.log(`${test.name}: ${loadTime}ms (max: ${test.maxTime}ms)`);
      }
    });

    it('should handle concurrent widget requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        marketingPage.request.get(`${BASE_URLS.api}/api/widgets/public/${testWidgetId}/render`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      console.log(`Successfully handled ${concurrentRequests} concurrent widget requests`);
    });
  });

  describe('Security Tests', () => {
    it('should protect authenticated routes', async () => {
      // Test accessing dashboard without authentication
      const unauthenticatedPage = await browser.newPage();
      
      await unauthenticatedPage.goto(`${BASE_URLS.dashboard}/dashboard`);
      
      // Should redirect to login
      await unauthenticatedPage.waitForURL('**/auth/login**');
      
      await unauthenticatedPage.close();
    });

    it('should validate API key permissions', async () => {
      // Test API endpoint with invalid key
      const invalidKeyResponse = await marketingPage.request.get(
        `${BASE_URLS.api}/api/widgets/private/${testWidgetId}/analytics`,
        {
          headers: { 'Authorization': 'Bearer invalid-key' }
        }
      );
      
      expect(invalidKeyResponse.status()).toBe(401);

      // Test with valid key
      const validKeyResponse = await marketingPage.request.get(
        `${BASE_URLS.api}/api/widgets/private/${testWidgetId}/analytics`,
        {
          headers: { 'Authorization': `Bearer ${testAPIKey}` }
        }
      );
      
      expect(validKeyResponse.status()).toBe(200);
    });

    it('should prevent XSS in widget content', async () => {
      // Create content with potential XSS
      const xssContent = '<script>alert("XSS")</script><img src="x" onerror="alert(\'XSS\')">';
      
      await db.query(`
        UPDATE content 
        SET content = $1 
        WHERE id = $2
      `, [xssContent, testContentId]);

      // Test widget rendering
      const widgetResponse = await marketingPage.request.get(`${BASE_URLS.api}/api/widgets/public/${testWidgetId}/render`);
      const widgetData = await widgetResponse.json();

      // Should not contain unescaped script tags
      expect(widgetData.data.html).not.toContain('<script>alert("XSS")</script>');
      expect(widgetData.data.html).not.toContain('onerror="alert(\'XSS\')"');
    });
  });
});
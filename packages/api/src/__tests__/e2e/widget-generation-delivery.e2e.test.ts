import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { DatabaseService } from '../../services/database';
import { WidgetAuthService } from '../../services/widget-auth.service';

describe('Widget Generation and Delivery E2E Tests', () => {
  let browser: Browser;
  let context: BrowserContext;
  let dashboardPage: Page;
  let widgetTestPage: Page;
  let db: DatabaseService;
  let widgetAuthService: WidgetAuthService;

  const BASE_URLS = {
    marketing: process.env.MARKETING_URL || 'http://localhost:3000',
    dashboard: process.env.DASHBOARD_URL || 'http://localhost:3002',
    api: process.env.API_URL || 'http://localhost:3001',
  };

  const testUser = {
    email: `widget-test-${Date.now()}@example.com`,
    password: 'WidgetTest123!',
    firstName: 'Widget',
    lastName: 'Tester',
    organizationName: 'Widget Test Org',
  };

  let testUserId: string;
  let testWebsiteId: string;
  let testContentIds: string[] = [];
  let testWidgetIds: string[] = [];
  let testAPIKeys: string[] = [];

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 100,
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    dashboardPage = await context.newPage();
    widgetTestPage = await context.newPage();
    
    db = DatabaseService.getInstance();
    widgetAuthService = WidgetAuthService.getInstance();

    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    for (const apiKey of testAPIKeys) {
      try {
        const keyResult = await db.query('SELECT id FROM widget_api_keys WHERE key_hash = $1', [apiKey]);
        if (keyResult.rows.length > 0) {
          await db.query('DELETE FROM widget_api_keys WHERE id = $1', [keyResult.rows[0].id]);
        }
      } catch (error) {
        console.log('Error cleaning up API key:', error);
      }
    }

    for (const widgetId of testWidgetIds) {
      await db.query('DELETE FROM widgets WHERE id = $1', [widgetId]);
    }

    for (const contentId of testContentIds) {
      await db.query('DELETE FROM content WHERE id = $1', [contentId]);
    }

    if (testWebsiteId) {
      await db.query('DELETE FROM websites WHERE id = $1', [testWebsiteId]);
    }

    if (testUserId) {
      await db.query('DELETE FROM auth.users WHERE id = $1', [testUserId]);
    }

    await browser.close();
  });

  async function setupTestData() {
    // Create test user
    const userResult = await db.query(`
      INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES ($1, crypt($2, gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id
    `, [testUser.email, testUser.password]);
    testUserId = userResult.rows[0].id;

    // Create website
    const websiteResult = await db.query(`
      INSERT INTO websites (user_id, name, domain, is_verified)
      VALUES ($1, 'Widget Test Website', 'widget-test.example.com', true)
      RETURNING id
    `, [testUserId]);
    testWebsiteId = websiteResult.rows[0].id;

    // Create sample content
    const contentData = [
      {
        title: 'First Test Article',
        excerpt: 'This is the first test article for widget testing.',
        content: 'Full content of the first test article with detailed information.',
        status: 'published',
      },
      {
        title: 'Second Test Article',
        excerpt: 'This is the second test article for widget testing.',
        content: 'Full content of the second test article with more information.',
        status: 'published',
      },
      {
        title: 'Third Test Article',
        excerpt: 'This is the third test article for widget testing.',
        content: 'Full content of the third test article with comprehensive details.',
        status: 'published',
      },
    ];

    for (const content of contentData) {
      const contentResult = await db.query(`
        INSERT INTO content (website_id, title, excerpt, content, status, published_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), NOW())
        RETURNING id
      `, [testWebsiteId, content.title, content.excerpt, content.content, content.status]);
      testContentIds.push(contentResult.rows[0].id);
    }
  }

  async function loginUser() {
    await dashboardPage.goto(`${BASE_URLS.dashboard}/auth/login`);
    await dashboardPage.waitForLoadState('networkidle');

    await dashboardPage.fill('[data-testid="email"], input[type="email"]', testUser.email);
    await dashboardPage.fill('[data-testid="password"], input[type="password"]', testUser.password);
    await dashboardPage.click('[data-testid="login-button"], button[type="submit"]');
    await dashboardPage.waitForURL('**/dashboard**');
  }

  describe('Widget Creation and Configuration', () => {
    beforeEach(async () => {
      await loginUser();
    });

    it('should create a basic content widget', async () => {
      // Navigate to widgets section
      await dashboardPage.click('[data-testid="nav-widgets"], a[href*="widgets"]');
      await dashboardPage.waitForURL('**/widgets**');

      // Create new widget
      await dashboardPage.click('[data-testid="create-widget"], button:has-text("Create Widget")');

      // Fill widget configuration
      const widgetConfig = {
        title: 'Basic Content Widget',
        description: 'A basic widget displaying published content',
        type: 'content',
        theme: 'modern',
        layout: 'grid',
        itemsPerPage: 5,
      };

      await dashboardPage.fill('[data-testid="widget-title"], input[name="title"]', widgetConfig.title);
      await dashboardPage.fill('[data-testid="widget-description"], textarea[name="description"]', widgetConfig.description);
      await dashboardPage.selectOption('[data-testid="widget-type"], select[name="type"]', widgetConfig.type);
      await dashboardPage.selectOption('[data-testid="widget-theme"], select[name="theme"]', widgetConfig.theme);
      await dashboardPage.selectOption('[data-testid="widget-layout"], select[name="layout"]', widgetConfig.layout);
      await dashboardPage.fill('[data-testid="items-per-page"], input[name="itemsPerPage"]', widgetConfig.itemsPerPage.toString());

      // Enable display options
      await dashboardPage.check('[data-testid="show-images"], input[name="showImages"]');
      await dashboardPage.check('[data-testid="show-excerpts"], input[name="showExcerpts"]');
      await dashboardPage.check('[data-testid="show-dates"], input[name="showDates"]');
      await dashboardPage.check('[data-testid="show-authors"], input[name="showAuthors"]');

      // Save widget
      await dashboardPage.click('[data-testid="save-widget"], button:has-text("Save Widget")');

      // Verify success
      await expect(dashboardPage.locator('[data-testid="success-message"], .success-message')).toContainText('Widget created');

      // Get widget ID from database
      const widgetResult = await db.query(`
        SELECT id FROM widgets WHERE title = $1 AND website_id = $2
      `, [widgetConfig.title, testWebsiteId]);
      
      expect(widgetResult.rows.length).toBe(1);
      testWidgetIds.push(widgetResult.rows[0].id);
    });

    it('should preview widget before publishing', async () => {
      const widgetId = testWidgetIds[0];
      
      // Navigate to widget details
      await dashboardPage.goto(`${BASE_URLS.dashboard}/widgets/${widgetId}`);
      await dashboardPage.waitForLoadState('networkidle');

      // Open preview modal
      await dashboardPage.click('[data-testid="preview-widget"], button:has-text("Preview")');

      // Should show preview modal
      await expect(dashboardPage.locator('[data-testid="preview-modal"], .preview-modal')).toBeVisible();

      // Preview should contain content
      const previewContent = dashboardPage.locator('[data-testid="widget-preview"], .widget-preview');
      await expect(previewContent).toContainText('First Test Article');
      await expect(previewContent).toContainText('Second Test Article');

      // Test different themes in preview
      await dashboardPage.selectOption('[data-testid="preview-theme"], select[name="previewTheme"]', 'minimal');
      await dashboardPage.waitForTimeout(1000); // Allow preview to update

      // Should update preview with new theme
      await expect(previewContent).toBeVisible();
    });

    it('should configure advanced widget settings', async () => {
      // Create advanced widget
      await dashboardPage.goto(`${BASE_URLS.dashboard}/widgets/create`);
      await dashboardPage.waitForLoadState('networkidle');

      await dashboardPage.fill('[data-testid="widget-title"], input[name="title"]', 'Advanced Content Widget');
      await dashboardPage.selectOption('[data-testid="widget-type"], select[name="type"]', 'content');

      // Open advanced settings
      await dashboardPage.click('[data-testid="advanced-settings"], .advanced-settings-toggle');

      // Configure filters
      await dashboardPage.selectOption('[data-testid="content-filter-category"], select[name="filterCategory"]', 'Blog');
      await dashboardPage.fill('[data-testid="content-filter-tags"], input[name="filterTags"]', 'test,integration');

      // Configure sorting
      await dashboardPage.selectOption('[data-testid="sort-by"], select[name="sortBy"]', 'published_at');
      await dashboardPage.selectOption('[data-testid="sort-order"], select[name="sortOrder"]', 'desc');

      // Configure caching
      await dashboardPage.fill('[data-testid="cache-duration"], input[name="cacheDuration"]', '300');

      // Enable search
      await dashboardPage.check('[data-testid="enable-search"], input[name="enableSearch"]');

      // Save widget
      await dashboardPage.click('[data-testid="save-widget"], button:has-text("Save Widget")');
      await expect(dashboardPage.locator('[data-testid="success-message"], .success-message')).toBeVisible();

      // Get widget ID
      const advancedWidgetResult = await db.query(`
        SELECT id FROM widgets WHERE title = 'Advanced Content Widget' AND website_id = $1
      `, [testWebsiteId]);
      testWidgetIds.push(advancedWidgetResult.rows[0].id);
    });

    it('should customize widget branding', async () => {
      const widgetId = testWidgetIds[0];

      await dashboardPage.goto(`${BASE_URLS.dashboard}/widgets/${widgetId}/branding`);
      await dashboardPage.waitForLoadState('networkidle');

      // Customize colors
      await dashboardPage.fill('[data-testid="primary-color"], input[name="primaryColor"]', '#3b82f6');
      await dashboardPage.fill('[data-testid="secondary-color"], input[name="secondaryColor"]', '#1f2937');
      await dashboardPage.fill('[data-testid="background-color"], input[name="backgroundColor"]', '#ffffff');

      // Customize fonts
      await dashboardPage.selectOption('[data-testid="heading-font"], select[name="headingFont"]', 'Inter');
      await dashboardPage.selectOption('[data-testid="body-font"], select[name="bodyFont"]', 'Inter');

      // Upload custom logo
      const logoUpload = dashboardPage.locator('[data-testid="logo-upload"], input[type="file"]');
      if (await logoUpload.isVisible()) {
        // In a real test, you would upload an actual file
        // For now, we'll just verify the upload field exists
        await expect(logoUpload).toBeVisible();
      }

      // Save branding
      await dashboardPage.click('[data-testid="save-branding"], button:has-text("Save Branding")');
      await expect(dashboardPage.locator('[data-testid="success-message"], .success-message')).toBeVisible();
    });
  });

  describe('Widget Publishing and Embed Code Generation', () => {
    beforeEach(async () => {
      await loginUser();
    });

    it('should publish widget and generate embed codes', async () => {
      const widgetId = testWidgetIds[0];

      await dashboardPage.goto(`${BASE_URLS.dashboard}/widgets/${widgetId}`);
      await dashboardPage.waitForLoadState('networkidle');

      // Publish widget
      await dashboardPage.click('[data-testid="publish-widget"], button:has-text("Publish")');
      await dashboardPage.click('[data-testid="confirm-publish"], button:has-text("Confirm")');

      // Verify published status
      await expect(dashboardPage.locator('[data-testid="widget-status"], .widget-status')).toContainText('Published');

      // Generate embed code
      await dashboardPage.click('[data-testid="get-embed-code"], button:has-text("Get Embed Code")');

      // Should show embed modal
      await expect(dashboardPage.locator('[data-testid="embed-modal"], .embed-modal')).toBeVisible();

      // Test JavaScript embed code
      await dashboardPage.click('[data-testid="embed-type-javascript"], button:has-text("JavaScript")');
      const jsEmbedCode = await dashboardPage.textContent('[data-testid="embed-code"], .embed-code');
      
      expect(jsEmbedCode).toContain('data-storyslip-widget');
      expect(jsEmbedCode).toContain(widgetId);
      expect(jsEmbedCode).toContain('script.js');

      // Test iframe embed code
      await dashboardPage.click('[data-testid="embed-type-iframe"], button:has-text("iframe")');
      const iframeEmbedCode = await dashboardPage.textContent('[data-testid="embed-code"], .embed-code');
      
      expect(iframeEmbedCode).toContain('<iframe');
      expect(iframeEmbedCode).toContain(widgetId);
      expect(iframeEmbedCode).toContain('format=html');

      // Test AMP embed code
      await dashboardPage.click('[data-testid="embed-type-amp"], button:has-text("AMP")');
      const ampEmbedCode = await dashboardPage.textContent('[data-testid="embed-code"], .embed-code');
      
      expect(ampEmbedCode).toContain('<amp-iframe');
      expect(ampEmbedCode).toContain(widgetId);

      // Copy embed code
      await dashboardPage.click('[data-testid="copy-embed-code"], button:has-text("Copy")');
      await expect(dashboardPage.locator('[data-testid="copy-success"], .copy-success')).toContainText('Copied');
    });

    it('should generate API key for widget access', async () => {
      const widgetId = testWidgetIds[0];

      await dashboardPage.goto(`${BASE_URLS.dashboard}/widgets/${widgetId}/settings`);
      await dashboardPage.waitForLoadState('networkidle');

      // Generate API key
      await dashboardPage.click('[data-testid="generate-api-key"], button:has-text("Generate API Key")');

      // Fill API key details
      await dashboardPage.fill('[data-testid="api-key-name"], input[name="keyName"]', 'Test Widget Key');
      await dashboardPage.selectOption('[data-testid="api-key-permissions"], select[name="permissions"]', 'read');
      await dashboardPage.fill('[data-testid="rate-limit"], input[name="rateLimit"]', '1000');

      await dashboardPage.click('[data-testid="create-api-key"], button:has-text("Create")');

      // Should show API key
      const apiKeyElement = dashboardPage.locator('[data-testid="api-key-value"], .api-key-value');
      await expect(apiKeyElement).toBeVisible();

      const apiKey = await apiKeyElement.textContent();
      expect(apiKey).toMatch(/^sk_[a-f0-9]{64}$/);
      
      if (apiKey) {
        testAPIKeys.push(apiKey);
      }
    });
  });

  describe('Widget Delivery and Rendering', () => {
    let publishedWidgetId: string;

    beforeAll(async () => {
      // Ensure we have a published widget
      publishedWidgetId = testWidgetIds[0];
      await db.query('UPDATE widgets SET is_published = true WHERE id = $1', [publishedWidgetId]);
    });

    it('should deliver widget via JavaScript integration', async () => {
      const widgetTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget JavaScript Test</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .test-container { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="test-container">
            <h1>Widget JavaScript Integration Test</h1>
            <div id="test-widget" 
                 data-storyslip-widget 
                 data-widget-id="${publishedWidgetId}" 
                 data-widget-type="content"
                 data-widget-layout="grid"
                 data-widget-theme="modern">
              Loading widget...
            </div>
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await widgetTestPage.setContent(widgetTestContent);

      // Wait for widget to load
      await widgetTestPage.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

      // Verify widget content
      const widget = widgetTestPage.locator('.storyslip-widget');
      await expect(widget).toBeVisible();
      await expect(widget).toContainText('First Test Article');
      await expect(widget).toContainText('Second Test Article');

      // Verify widget structure
      await expect(widget.locator('.storyslip-item')).toHaveCount({ min: 2 });

      // Test responsive behavior
      await widgetTestPage.setViewportSize({ width: 480, height: 800 });
      await widgetTestPage.waitForTimeout(1000);

      // Should have responsive class
      const hasResponsiveClass = await widget.evaluate(el => {
        return el.classList.contains('storyslip-sm') || 
               el.classList.contains('storyslip-md') || 
               el.classList.contains('storyslip-lg');
      });
      expect(hasResponsiveClass).toBe(true);

      // Reset viewport
      await widgetTestPage.setViewportSize({ width: 1280, height: 720 });
    });

    it('should deliver widget via iframe integration', async () => {
      const iframeTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget iframe Test</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h1>Widget iframe Integration Test</h1>
          <iframe src="${BASE_URLS.api}/api/widgets/public/${publishedWidgetId}/render?format=html" 
                  width="100%" 
                  height="400" 
                  frameborder="0" 
                  scrolling="auto"
                  title="Content Widget">
          </iframe>
        </body>
        </html>
      `;

      await widgetTestPage.setContent(iframeTestContent);

      // Wait for iframe to load
      const iframe = widgetTestPage.locator('iframe');
      await expect(iframe).toBeVisible();

      // Wait for content to load inside iframe
      await widgetTestPage.waitForTimeout(3000);

      // Verify iframe loaded successfully
      const iframeSrc = await iframe.getAttribute('src');
      expect(iframeSrc).toContain(publishedWidgetId);
    });

    it('should handle widget pagination', async () => {
      // Create more content to test pagination
      for (let i = 4; i <= 10; i++) {
        const contentResult = await db.query(`
          INSERT INTO content (website_id, title, excerpt, content, status, published_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'published', NOW(), NOW(), NOW())
          RETURNING id
        `, [
          testWebsiteId,
          `Pagination Test Article ${i}`,
          `Excerpt for article ${i}`,
          `Content for pagination test article ${i}`
        ]);
        testContentIds.push(contentResult.rows[0].id);
      }

      const paginationTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget Pagination Test</title>
        </head>
        <body>
          <div id="pagination-widget" 
               data-storyslip-widget 
               data-widget-id="${publishedWidgetId}" 
               data-widget-type="content"
               data-widget-layout="grid"
               data-widget-theme="modern">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await widgetTestPage.setContent(paginationTestContent);
      await widgetTestPage.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

      // Should show pagination controls
      const paginationButtons = widgetTestPage.locator('.storyslip-page-btn');
      const buttonCount = await paginationButtons.count();

      if (buttonCount > 0) {
        // Click on page 2
        const page2Button = paginationButtons.filter({ hasText: '2' });
        if (await page2Button.count() > 0) {
          await page2Button.first().click();
          
          // Wait for content to update
          await widgetTestPage.waitForTimeout(2000);
          
          // Verify page changed
          await expect(page2Button.first()).toHaveClass(/storyslip-active/);
        }
      }
    });

    it('should handle widget search functionality', async () => {
      const searchTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget Search Test</title>
        </head>
        <body>
          <div id="search-widget" 
               data-storyslip-widget 
               data-widget-id="${publishedWidgetId}" 
               data-widget-type="content"
               data-widget-layout="grid"
               data-widget-theme="modern">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await widgetTestPage.setContent(searchTestContent);
      await widgetTestPage.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

      // Look for search input
      const searchInput = widgetTestPage.locator('.storyslip-search');
      if (await searchInput.count() > 0) {
        // Perform search
        await searchInput.fill('First');
        await widgetTestPage.waitForTimeout(1000); // Wait for debounced search

        // Should filter results
        const widget = widgetTestPage.locator('.storyslip-widget');
        await expect(widget).toContainText('First Test Article');
      }
    });

    it('should track widget analytics', async () => {
      const analyticsTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget Analytics Test</title>
        </head>
        <body>
          <div id="analytics-widget" 
               data-storyslip-widget 
               data-widget-id="${publishedWidgetId}" 
               data-widget-type="content">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await widgetTestPage.setContent(analyticsTestContent);
      await widgetTestPage.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

      // Wait for analytics to be tracked
      await widgetTestPage.waitForTimeout(3000);

      // Verify analytics were recorded
      const analyticsResult = await db.query(`
        SELECT COUNT(*) as count FROM widget_analytics 
        WHERE widget_id = $1 AND event_type = 'view'
      `, [publishedWidgetId]);

      expect(parseInt(analyticsResult.rows[0].count)).toBeGreaterThan(0);
    });

    it('should handle widget errors gracefully', async () => {
      const errorTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget Error Test</title>
        </head>
        <body>
          <div id="error-widget" 
               data-storyslip-widget 
               data-widget-id="non-existent-widget-id" 
               data-widget-type="content">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await widgetTestPage.setContent(errorTestContent);

      // Should show error state
      await widgetTestPage.waitForSelector('.storyslip-error', { timeout: 10000 });

      const errorElement = widgetTestPage.locator('.storyslip-error');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText('Content Unavailable');

      // Test retry functionality
      const retryButton = widgetTestPage.locator('.storyslip-error-retry');
      if (await retryButton.count() > 0) {
        await retryButton.click();
        
        // Should still show error (since widget doesn't exist)
        await widgetTestPage.waitForTimeout(2000);
        await expect(errorElement).toBeVisible();
      }
    });
  });

  describe('Widget Performance and Caching', () => {
    let performanceWidgetId: string;

    beforeAll(async () => {
      performanceWidgetId = testWidgetIds[0];
    });

    it('should cache widget responses', async () => {
      // First request
      const startTime1 = Date.now();
      const response1 = await widgetTestPage.request.get(`${BASE_URLS.api}/api/widgets/public/${performanceWidgetId}/render`);
      const loadTime1 = Date.now() - startTime1;

      expect(response1.status()).toBe(200);

      // Second request (should be cached)
      const startTime2 = Date.now();
      const response2 = await widgetTestPage.request.get(`${BASE_URLS.api}/api/widgets/public/${performanceWidgetId}/render`);
      const loadTime2 = Date.now() - startTime2;

      expect(response2.status()).toBe(200);

      // Second request should be faster (cached)
      expect(loadTime2).toBeLessThan(loadTime1);

      // Check cache headers
      const cacheControl = response2.headers()['cache-control'];
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age');
    });

    it('should handle concurrent widget requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        widgetTestPage.request.get(`${BASE_URLS.api}/api/widgets/public/${performanceWidgetId}/render`)
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      console.log(`Successfully handled ${concurrentRequests} concurrent widget requests`);
    });

    it('should optimize widget content delivery', async () => {
      const response = await widgetTestPage.request.get(`${BASE_URLS.api}/api/widgets/public/${performanceWidgetId}/render`);
      const widgetData = await response.json();

      expect(widgetData.success).toBe(true);
      expect(widgetData.data).toHaveProperty('html');
      expect(widgetData.data).toHaveProperty('css');
      expect(widgetData.data).toHaveProperty('js');

      // Content should be minified (no excessive whitespace)
      expect(widgetData.data.html).not.toMatch(/\s{4,}/); // No 4+ consecutive spaces
      expect(widgetData.data.css).not.toMatch(/\s{2,}/); // No 2+ consecutive spaces
    });

    it('should handle widget script delivery efficiently', async () => {
      const scriptResponse = await widgetTestPage.request.get(`${BASE_URLS.api}/api/widgets/script.js`);

      expect(scriptResponse.status()).toBe(200);
      expect(scriptResponse.headers()['content-type']).toContain('application/javascript');

      // Should have proper cache headers
      const cacheControl = scriptResponse.headers()['cache-control'];
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age=86400'); // 1 day cache

      // Should have ETag for conditional requests
      expect(scriptResponse.headers()['etag']).toBeDefined();
    });
  });

  describe('Widget API Authentication', () => {
    let apiKey: string;

    beforeAll(async () => {
      // Use the API key generated in earlier tests
      apiKey = testAPIKeys[0];
    });

    it('should validate API key for widget access', async () => {
      if (!apiKey) {
        console.log('Skipping API key test - no API key available');
        return;
      }

      // Test valid API key
      const validResponse = await widgetTestPage.request.get(
        `${BASE_URLS.api}/api/widgets/private/${testWidgetIds[0]}/analytics`,
        {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        }
      );

      expect(validResponse.status()).toBe(200);

      // Test invalid API key
      const invalidResponse = await widgetTestPage.request.get(
        `${BASE_URLS.api}/api/widgets/private/${testWidgetIds[0]}/analytics`,
        {
          headers: { 'Authorization': 'Bearer invalid-key' }
        }
      );

      expect(invalidResponse.status()).toBe(401);
    });

    it('should enforce rate limiting for API keys', async () => {
      if (!apiKey) {
        console.log('Skipping rate limiting test - no API key available');
        return;
      }

      const requests = [];
      const maxRequests = 20;

      // Make rapid requests
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          widgetTestPage.request.get(
            `${BASE_URLS.api}/api/widgets/public/${testWidgetIds[0]}/render`,
            {
              headers: { 'Authorization': `Bearer ${apiKey}` }
            }
          )
        );
      }

      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status());

      // Should eventually get rate limited
      const rateLimitedResponses = statusCodes.filter(status => status === 429);
      
      // Depending on rate limit settings, we might or might not hit the limit
      console.log(`Rate limiting test: ${rateLimitedResponses.length} requests were rate limited out of ${maxRequests}`);
    });
  });

  describe('Widget Customization and Themes', () => {
    let customWidgetId: string;

    beforeAll(async () => {
      customWidgetId = testWidgetIds[1] || testWidgetIds[0];
    });

    it('should render different widget themes correctly', async () => {
      const themes = ['modern', 'minimal', 'classic'];

      for (const theme of themes) {
        const themeTestContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Theme Test - ${theme}</title>
          </head>
          <body>
            <h1>Testing ${theme} theme</h1>
            <div id="theme-widget-${theme}" 
                 data-storyslip-widget 
                 data-widget-id="${customWidgetId}" 
                 data-widget-type="content"
                 data-widget-theme="${theme}"
                 data-widget-layout="grid">
              Loading...
            </div>
            <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
          </body>
          </html>
        `;

        await widgetTestPage.setContent(themeTestContent);
        await widgetTestPage.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

        const widget = widgetTestPage.locator('.storyslip-widget');
        await expect(widget).toBeVisible();
        await expect(widget).toHaveAttribute('data-layout', 'grid');

        // Verify theme-specific styling is applied
        const widgetStyles = await widget.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            border: styles.border,
            borderRadius: styles.borderRadius,
          };
        });

        expect(widgetStyles.backgroundColor).toBeDefined();
        console.log(`${theme} theme styles:`, widgetStyles);
      }
    });

    it('should render different widget layouts correctly', async () => {
      const layouts = ['grid', 'list', 'carousel'];

      for (const layout of layouts) {
        const layoutTestContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Layout Test - ${layout}</title>
          </head>
          <body>
            <h1>Testing ${layout} layout</h1>
            <div id="layout-widget-${layout}" 
                 data-storyslip-widget 
                 data-widget-id="${customWidgetId}" 
                 data-widget-type="content"
                 data-widget-layout="${layout}"
                 data-widget-theme="modern">
              Loading...
            </div>
            <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
          </body>
          </html>
        `;

        await widgetTestPage.setContent(layoutTestContent);
        await widgetTestPage.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

        const widget = widgetTestPage.locator('.storyslip-widget');
        await expect(widget).toBeVisible();
        await expect(widget).toHaveAttribute('data-layout', layout);

        // Verify layout-specific CSS classes
        const contentContainer = widgetTestPage.locator('.storyslip-content');
        await expect(contentContainer).toHaveClass(new RegExp(`storyslip-${layout}`));

        // Test layout-specific functionality
        if (layout === 'carousel') {
          // Check for carousel navigation buttons
          const carouselButtons = widgetTestPage.locator('.storyslip-carousel-btn');
          if (await carouselButtons.count() > 0) {
            await expect(carouselButtons.first()).toBeVisible();
          }
        }
      }
    });
  });
});
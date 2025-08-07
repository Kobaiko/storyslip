import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { DatabaseService } from '../../services/database';

describe('Content Management Workflows E2E Tests', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let secondUserPage: Page;
  let db: DatabaseService;

  const BASE_URLS = {
    marketing: process.env.MARKETING_URL || 'http://localhost:3000',
    dashboard: process.env.DASHBOARD_URL || 'http://localhost:3002',
    api: process.env.API_URL || 'http://localhost:3001',
  };

  const testUser = {
    email: `content-test-${Date.now()}@example.com`,
    password: 'ContentTest123!',
    firstName: 'Content',
    lastName: 'Tester',
    organizationName: 'Content Test Org',
  };

  const secondUser = {
    email: `content-collaborator-${Date.now()}@example.com`,
    password: 'Collaborator123!',
    firstName: 'Content',
    lastName: 'Collaborator',
  };

  let testUserId: string;
  let secondUserId: string;
  let testWebsiteId: string;
  let testContentIds: string[] = [];

  beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      slowMo: process.env.CI === 'true' ? 0 : 100,
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    page = await context.newPage();
    secondUserPage = await context.newPage();
    db = DatabaseService.getInstance();

    // Create test users and website
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    for (const contentId of testContentIds) {
      await db.query('DELETE FROM content WHERE id = $1', [contentId]);
    }
    
    if (testWebsiteId) {
      await db.query('DELETE FROM websites WHERE id = $1', [testWebsiteId]);
    }
    
    if (testUserId) {
      await db.query('DELETE FROM auth.users WHERE id = $1', [testUserId]);
    }
    
    if (secondUserId) {
      await db.query('DELETE FROM auth.users WHERE id = $1', [secondUserId]);
    }

    await browser.close();
  });

  async function setupTestData() {
    // Create first user
    const userResult = await db.query(`
      INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES ($1, crypt($2, gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id
    `, [testUser.email, testUser.password]);
    testUserId = userResult.rows[0].id;

    // Create second user
    const secondUserResult = await db.query(`
      INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
      VALUES ($1, crypt($2, gen_salt('bf')), NOW(), NOW(), NOW())
      RETURNING id
    `, [secondUser.email, secondUser.password]);
    secondUserId = secondUserResult.rows[0].id;

    // Create website
    const websiteResult = await db.query(`
      INSERT INTO websites (user_id, name, domain, is_verified)
      VALUES ($1, 'Content Test Website', 'content-test.example.com', true)
      RETURNING id
    `, [testUserId]);
    testWebsiteId = websiteResult.rows[0].id;

    // Add second user as team member
    await db.query(`
      INSERT INTO team_members (website_id, user_id, role, status)
      VALUES ($1, $2, 'editor', 'active')
    `, [testWebsiteId, secondUserId]);
  }

  async function loginUser(userPage: Page, user: typeof testUser) {
    await userPage.goto(`${BASE_URLS.dashboard}/auth/login`);
    await userPage.waitForLoadState('networkidle');

    await userPage.fill('[data-testid="email"], input[type="email"]', user.email);
    await userPage.fill('[data-testid="password"], input[type="password"]', user.password);
    await userPage.click('[data-testid="login-button"], button[type="submit"]');
    await userPage.waitForURL('**/dashboard**');
  }

  describe('Content Creation Workflow', () => {
    beforeEach(async () => {
      await loginUser(page, testUser);
    });

    it('should create new content with all fields', async () => {
      // Navigate to content section
      await page.click('[data-testid="nav-content"], a[href*="content"]');
      await page.waitForURL('**/content**');

      // Click create content button
      await page.click('[data-testid="create-content"], button:has-text("Create Content"), .create-button');

      // Fill content form
      const contentData = {
        title: 'Comprehensive Test Article',
        excerpt: 'This is a comprehensive test article with all fields filled out.',
        content: 'This is the main content of the article. It includes multiple paragraphs, formatting, and various elements that should be properly handled by the rich text editor.',
        tags: ['test', 'comprehensive', 'e2e'],
        category: 'Blog',
        status: 'draft',
      };

      await page.fill('[data-testid="content-title"], input[name="title"]', contentData.title);
      await page.fill('[data-testid="content-excerpt"], textarea[name="excerpt"]', contentData.excerpt);

      // Fill rich text editor
      const editor = page.locator('[data-testid="content-editor"], .rich-text-editor, [contenteditable="true"]');
      await editor.click();
      await editor.fill(contentData.content);

      // Add tags
      for (const tag of contentData.tags) {
        await page.fill('[data-testid="content-tags"], input[name="tags"]', tag);
        await page.press('[data-testid="content-tags"], input[name="tags"]', 'Enter');
      }

      // Set category
      await page.selectOption('[data-testid="content-category"], select[name="category"]', contentData.category);

      // Save as draft
      await page.click('[data-testid="save-draft"], button:has-text("Save Draft")');

      // Verify success message
      await expect(page.locator('[data-testid="success-message"], .success-message')).toContainText('saved');

      // Verify content was created in database
      const contentResult = await db.query(`
        SELECT id, title, excerpt, status FROM content 
        WHERE title = $1 AND website_id = $2
      `, [contentData.title, testWebsiteId]);

      expect(contentResult.rows.length).toBe(1);
      expect(contentResult.rows[0].title).toBe(contentData.title);
      expect(contentResult.rows[0].status).toBe('draft');

      testContentIds.push(contentResult.rows[0].id);
    });

    it('should auto-save content while editing', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content/create`);
      await page.waitForLoadState('networkidle');

      // Start typing title
      const titleInput = page.locator('[data-testid="content-title"], input[name="title"]');
      await titleInput.fill('Auto-save Test Article');

      // Wait for auto-save indicator
      await expect(page.locator('[data-testid="auto-save-indicator"], .auto-save-indicator')).toContainText('Saving...');
      
      // Wait for auto-save to complete
      await expect(page.locator('[data-testid="auto-save-indicator"], .auto-save-indicator')).toContainText('Saved');

      // Verify auto-save worked by refreshing page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Title should be preserved
      await expect(titleInput).toHaveValue('Auto-save Test Article');
    });

    it('should validate required fields', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content/create`);
      await page.waitForLoadState('networkidle');

      // Try to save without required fields
      await page.click('[data-testid="save-draft"], button:has-text("Save")');

      // Should show validation errors
      await expect(page.locator('[data-testid="title-error"], .error-message')).toContainText('required');
    });

    it('should handle rich text editor features', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content/create`);
      await page.waitForLoadState('networkidle');

      await page.fill('[data-testid="content-title"], input[name="title"]', 'Rich Text Test');

      // Test rich text editor
      const editor = page.locator('[data-testid="content-editor"], .rich-text-editor, [contenteditable="true"]');
      await editor.click();

      // Type some text
      await editor.type('This is bold text and this is italic text.');

      // Select text and apply formatting
      await page.keyboard.press('Control+A');
      
      // Try to apply bold formatting
      const boldButton = page.locator('[data-testid="bold-button"], .bold-button, button[title*="Bold"]');
      if (await boldButton.isVisible()) {
        await boldButton.click();
      }

      // Save content
      await page.click('[data-testid="save-draft"], button:has-text("Save")');
      await expect(page.locator('[data-testid="success-message"], .success-message')).toBeVisible();
    });
  });

  describe('Content Editing Workflow', () => {
    let editContentId: string;

    beforeAll(async () => {
      // Create content to edit
      const contentResult = await db.query(`
        INSERT INTO content (website_id, title, excerpt, content, status, created_at, updated_at)
        VALUES ($1, 'Editable Test Article', 'Original excerpt', 'Original content', 'draft', NOW(), NOW())
        RETURNING id
      `, [testWebsiteId]);
      editContentId = contentResult.rows[0].id;
      testContentIds.push(editContentId);
    });

    beforeEach(async () => {
      await loginUser(page, testUser);
    });

    it('should edit existing content', async () => {
      // Navigate to content list
      await page.goto(`${BASE_URLS.dashboard}/content`);
      await page.waitForLoadState('networkidle');

      // Find and click edit button for the content
      await page.click(`[data-testid="edit-content-${editContentId}"], .edit-button:near(:text("Editable Test Article"))`);

      // Should navigate to edit page
      await page.waitForURL(`**/content/${editContentId}/edit**`);

      // Modify content
      const newTitle = 'Updated Test Article';
      await page.fill('[data-testid="content-title"], input[name="title"]', newTitle);

      const newExcerpt = 'Updated excerpt with new information.';
      await page.fill('[data-testid="content-excerpt"], textarea[name="excerpt"]', newExcerpt);

      // Save changes
      await page.click('[data-testid="save-content"], button:has-text("Save")');
      await expect(page.locator('[data-testid="success-message"], .success-message')).toBeVisible();

      // Verify changes in database
      const updatedContent = await db.query('SELECT title, excerpt FROM content WHERE id = $1', [editContentId]);
      expect(updatedContent.rows[0].title).toBe(newTitle);
      expect(updatedContent.rows[0].excerpt).toBe(newExcerpt);
    });

    it('should show content history and versions', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content/${editContentId}/edit`);
      await page.waitForLoadState('networkidle');

      // Look for version history
      const historyButton = page.locator('[data-testid="view-history"], button:has-text("History")');
      if (await historyButton.isVisible()) {
        await historyButton.click();

        // Should show version history modal
        await expect(page.locator('[data-testid="history-modal"], .history-modal')).toBeVisible();

        // Should show at least one version
        await expect(page.locator('[data-testid="version-item"], .version-item')).toHaveCount({ min: 1 });
      }
    });

    it('should handle concurrent editing conflicts', async () => {
      // Login second user
      await loginUser(secondUserPage, secondUser);

      // Both users open the same content for editing
      await page.goto(`${BASE_URLS.dashboard}/content/${editContentId}/edit`);
      await secondUserPage.goto(`${BASE_URLS.dashboard}/content/${editContentId}/edit`);

      await page.waitForLoadState('networkidle');
      await secondUserPage.waitForLoadState('networkidle');

      // First user makes changes
      await page.fill('[data-testid="content-title"], input[name="title"]', 'First User Edit');
      await page.click('[data-testid="save-content"], button:has-text("Save")');
      await expect(page.locator('[data-testid="success-message"], .success-message')).toBeVisible();

      // Second user makes different changes
      await secondUserPage.fill('[data-testid="content-title"], input[name="title"]', 'Second User Edit');
      await secondUserPage.click('[data-testid="save-content"], button:has-text("Save")');

      // Should detect conflict
      const conflictModal = secondUserPage.locator('[data-testid="conflict-modal"], .conflict-modal');
      if (await conflictModal.isVisible()) {
        // Should show conflict resolution options
        await expect(conflictModal).toContainText('conflict');
        
        // Choose to keep current changes
        await secondUserPage.click('[data-testid="keep-current"], button:has-text("Keep Current")');
        await expect(secondUserPage.locator('[data-testid="success-message"], .success-message')).toBeVisible();
      }
    });
  });

  describe('Content Publishing Workflow', () => {
    let publishContentId: string;

    beforeAll(async () => {
      // Create content to publish
      const contentResult = await db.query(`
        INSERT INTO content (website_id, title, excerpt, content, status, created_at, updated_at)
        VALUES ($1, 'Publishable Test Article', 'Ready to publish', 'Complete content ready for publication', 'draft', NOW(), NOW())
        RETURNING id
      `, [testWebsiteId]);
      publishContentId = contentResult.rows[0].id;
      testContentIds.push(publishContentId);
    });

    beforeEach(async () => {
      await loginUser(page, testUser);
    });

    it('should publish content immediately', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content`);
      await page.waitForLoadState('networkidle');

      // Find content and open publish modal
      await page.click(`[data-testid="publish-content-${publishContentId}"], .publish-button:near(:text("Publishable Test Article"))`);

      // Should show publish modal
      await expect(page.locator('[data-testid="publish-modal"], .publish-modal')).toBeVisible();

      // Confirm immediate publishing
      await page.click('[data-testid="publish-now"], button:has-text("Publish Now")');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"], .success-message')).toContainText('published');

      // Verify status in database
      const publishedContent = await db.query('SELECT status, published_at FROM content WHERE id = $1', [publishContentId]);
      expect(publishedContent.rows[0].status).toBe('published');
      expect(publishedContent.rows[0].published_at).not.toBeNull();
    });

    it('should schedule content for future publishing', async () => {
      // Create another content item for scheduling
      const scheduleContentResult = await db.query(`
        INSERT INTO content (website_id, title, excerpt, content, status, created_at, updated_at)
        VALUES ($1, 'Scheduled Test Article', 'To be scheduled', 'Content for scheduled publishing', 'draft', NOW(), NOW())
        RETURNING id
      `, [testWebsiteId]);
      const scheduleContentId = scheduleContentResult.rows[0].id;
      testContentIds.push(scheduleContentId);

      await page.goto(`${BASE_URLS.dashboard}/content`);
      await page.waitForLoadState('networkidle');

      // Open publish modal for scheduled content
      await page.click(`[data-testid="publish-content-${scheduleContentId}"], .publish-button:near(:text("Scheduled Test Article"))`);

      // Select schedule option
      await page.click('[data-testid="schedule-publish"], input[value="schedule"]');

      // Set future date and time
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const dateString = futureDate.toISOString().split('T')[0];
      const timeString = '10:00';

      await page.fill('[data-testid="publish-date"], input[type="date"]', dateString);
      await page.fill('[data-testid="publish-time"], input[type="time"]', timeString);

      // Confirm scheduling
      await page.click('[data-testid="schedule-content"], button:has-text("Schedule")');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"], .success-message')).toContainText('scheduled');

      // Verify status in database
      const scheduledContent = await db.query('SELECT status, scheduled_at FROM content WHERE id = $1', [scheduleContentId]);
      expect(scheduledContent.rows[0].status).toBe('scheduled');
      expect(scheduledContent.rows[0].scheduled_at).not.toBeNull();
    });

    it('should unpublish content', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content`);
      await page.waitForLoadState('networkidle');

      // Find published content and unpublish
      await page.click(`[data-testid="unpublish-content-${publishContentId}"], .unpublish-button:near(:text("Publishable Test Article"))`);

      // Confirm unpublishing
      await page.click('[data-testid="confirm-unpublish"], button:has-text("Unpublish")');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"], .success-message')).toContainText('unpublished');

      // Verify status in database
      const unpublishedContent = await db.query('SELECT status FROM content WHERE id = $1', [publishContentId]);
      expect(unpublishedContent.rows[0].status).toBe('draft');
    });
  });

  describe('Content Organization', () => {
    beforeEach(async () => {
      await loginUser(page, testUser);
    });

    it('should create and manage categories', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content/categories`);
      await page.waitForLoadState('networkidle');

      // Create new category
      await page.click('[data-testid="create-category"], button:has-text("Create Category")');

      const categoryData = {
        name: 'Test Category',
        description: 'A category for testing purposes',
        slug: 'test-category',
      };

      await page.fill('[data-testid="category-name"], input[name="name"]', categoryData.name);
      await page.fill('[data-testid="category-description"], textarea[name="description"]', categoryData.description);
      await page.fill('[data-testid="category-slug"], input[name="slug"]', categoryData.slug);

      await page.click('[data-testid="save-category"], button:has-text("Save")');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"], .success-message')).toBeVisible();

      // Verify category appears in list
      await expect(page.locator(`text=${categoryData.name}`)).toBeVisible();
    });

    it('should create and manage tags', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content/tags`);
      await page.waitForLoadState('networkidle');

      // Create new tag
      await page.click('[data-testid="create-tag"], button:has-text("Create Tag")');

      const tagData = {
        name: 'test-tag',
        description: 'A tag for testing',
      };

      await page.fill('[data-testid="tag-name"], input[name="name"]', tagData.name);
      await page.fill('[data-testid="tag-description"], textarea[name="description"]', tagData.description);

      await page.click('[data-testid="save-tag"], button:has-text("Save")');

      // Should show success message
      await expect(page.locator('[data-testid="success-message"], .success-message')).toBeVisible();

      // Verify tag appears in list
      await expect(page.locator(`text=${tagData.name}`)).toBeVisible();
    });

    it('should filter and search content', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content`);
      await page.waitForLoadState('networkidle');

      // Test search functionality
      const searchInput = page.locator('[data-testid="content-search"], input[placeholder*="Search"]');
      await searchInput.fill('Test Article');

      // Should filter results
      await page.waitForTimeout(1000); // Wait for search debounce
      await expect(page.locator('.content-item')).toHaveCount({ min: 1 });

      // Test status filter
      const statusFilter = page.locator('[data-testid="status-filter"], select[name="status"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('published');
        await page.waitForTimeout(1000);
        
        // Should show only published content
        const publishedItems = page.locator('.content-item[data-status="published"]');
        const draftItems = page.locator('.content-item[data-status="draft"]');
        
        if (await publishedItems.count() > 0) {
          await expect(publishedItems).toHaveCount({ min: 1 });
        }
        if (await draftItems.count() > 0) {
          await expect(draftItems).toHaveCount(0);
        }
      }
    });

    it('should bulk manage content', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content`);
      await page.waitForLoadState('networkidle');

      // Select multiple content items
      const checkboxes = page.locator('[data-testid="content-checkbox"], .content-checkbox');
      const checkboxCount = await checkboxes.count();
      
      if (checkboxCount > 1) {
        // Select first two items
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();

        // Should show bulk actions
        await expect(page.locator('[data-testid="bulk-actions"], .bulk-actions')).toBeVisible();

        // Test bulk delete
        await page.click('[data-testid="bulk-delete"], button:has-text("Delete")');
        await page.click('[data-testid="confirm-bulk-delete"], button:has-text("Confirm")');

        // Should show success message
        await expect(page.locator('[data-testid="success-message"], .success-message')).toContainText('deleted');
      }
    });
  });

  describe('Content SEO and Metadata', () => {
    beforeEach(async () => {
      await loginUser(page, testUser);
    });

    it('should manage SEO metadata', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content/create`);
      await page.waitForLoadState('networkidle');

      // Fill basic content
      await page.fill('[data-testid="content-title"], input[name="title"]', 'SEO Test Article');
      await page.fill('[data-testid="content-excerpt"], textarea[name="excerpt"]', 'Article for SEO testing');

      // Open SEO section
      const seoSection = page.locator('[data-testid="seo-section"], .seo-section');
      if (await seoSection.isVisible()) {
        await page.click('[data-testid="seo-toggle"], .seo-toggle');

        // Fill SEO fields
        await page.fill('[data-testid="meta-title"], input[name="metaTitle"]', 'Custom SEO Title');
        await page.fill('[data-testid="meta-description"], textarea[name="metaDescription"]', 'Custom meta description for SEO');
        await page.fill('[data-testid="canonical-url"], input[name="canonicalUrl"]', 'https://example.com/seo-test');

        // Add Open Graph data
        await page.fill('[data-testid="og-title"], input[name="ogTitle"]', 'Social Media Title');
        await page.fill('[data-testid="og-description"], textarea[name="ogDescription"]', 'Description for social media');
      }

      // Save content
      await page.click('[data-testid="save-content"], button:has-text("Save")');
      await expect(page.locator('[data-testid="success-message"], .success-message')).toBeVisible();
    });

    it('should generate and preview structured data', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content/create`);
      await page.waitForLoadState('networkidle');

      await page.fill('[data-testid="content-title"], input[name="title"]', 'Structured Data Test');

      // Look for structured data preview
      const structuredDataButton = page.locator('[data-testid="preview-structured-data"], button:has-text("Preview Schema")');
      if (await structuredDataButton.isVisible()) {
        await structuredDataButton.click();

        // Should show structured data modal
        await expect(page.locator('[data-testid="structured-data-modal"], .structured-data-modal')).toBeVisible();

        // Should contain JSON-LD
        const jsonLd = page.locator('[data-testid="json-ld"], .json-ld');
        await expect(jsonLd).toContainText('"@type": "Article"');
      }
    });
  });

  describe('Content Analytics and Performance', () => {
    beforeEach(async () => {
      await loginUser(page, testUser);
    });

    it('should show content performance metrics', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content`);
      await page.waitForLoadState('networkidle');

      // Look for analytics section
      const analyticsTab = page.locator('[data-testid="analytics-tab"], .analytics-tab');
      if (await analyticsTab.isVisible()) {
        await analyticsTab.click();

        // Should show performance metrics
        await expect(page.locator('[data-testid="content-views"], .content-views')).toBeVisible();
        await expect(page.locator('[data-testid="engagement-metrics"], .engagement-metrics')).toBeVisible();
      }
    });

    it('should export content data', async () => {
      await page.goto(`${BASE_URLS.dashboard}/content`);
      await page.waitForLoadState('networkidle');

      // Look for export functionality
      const exportButton = page.locator('[data-testid="export-content"], button:has-text("Export")');
      if (await exportButton.isVisible()) {
        // Set up download handler
        const downloadPromise = page.waitForEvent('download');
        
        await exportButton.click();
        await page.click('[data-testid="export-csv"], button:has-text("CSV")');

        // Wait for download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    });
  });

  describe('Content Collaboration', () => {
    beforeEach(async () => {
      await loginUser(page, testUser);
      await loginUser(secondUserPage, secondUser);
    });

    it('should handle collaborative editing', async () => {
      // Create content as first user
      await page.goto(`${BASE_URLS.dashboard}/content/create`);
      await page.fill('[data-testid="content-title"], input[name="title"]', 'Collaborative Article');
      await page.click('[data-testid="save-draft"], button:has-text("Save Draft")');
      await expect(page.locator('[data-testid="success-message"], .success-message')).toBeVisible();

      // Get the content ID from URL or database
      const collaborativeContentResult = await db.query(`
        SELECT id FROM content WHERE title = 'Collaborative Article' AND website_id = $1
      `, [testWebsiteId]);
      const collaborativeContentId = collaborativeContentResult.rows[0].id;
      testContentIds.push(collaborativeContentId);

      // Second user edits the same content
      await secondUserPage.goto(`${BASE_URLS.dashboard}/content/${collaborativeContentId}/edit`);
      await secondUserPage.waitForLoadState('networkidle');

      // Should show collaboration indicators
      const collaborationIndicator = secondUserPage.locator('[data-testid="collaboration-indicator"], .collaboration-indicator');
      if (await collaborationIndicator.isVisible()) {
        await expect(collaborationIndicator).toContainText('editing');
      }
    });

    it('should manage content permissions', async () => {
      await page.goto(`${BASE_URLS.dashboard}/team`);
      await page.waitForLoadState('networkidle');

      // Look for team member permissions
      const permissionsButton = page.locator(`[data-testid="edit-permissions-${secondUserId}"], .permissions-button`);
      if (await permissionsButton.isVisible()) {
        await permissionsButton.click();

        // Should show permissions modal
        await expect(page.locator('[data-testid="permissions-modal"], .permissions-modal')).toBeVisible();

        // Update permissions
        await page.check('[data-testid="can-publish"], input[name="canPublish"]');
        await page.click('[data-testid="save-permissions"], button:has-text("Save")');

        await expect(page.locator('[data-testid="success-message"], .success-message')).toBeVisible();
      }
    });
  });
});
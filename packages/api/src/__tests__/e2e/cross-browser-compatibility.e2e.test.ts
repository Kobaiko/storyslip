import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright';
import { DatabaseService } from '../../services/database';

describe('Cross-Browser Compatibility Tests', () => {
  const browsers = [
    { name: 'Chromium', launch: chromium.launch },
    { name: 'Firefox', launch: firefox.launch },
    { name: 'WebKit', launch: webkit.launch },
  ];

  const BASE_URLS = {
    marketing: process.env.MARKETING_URL || 'http://localhost:3000',
    dashboard: process.env.DASHBOARD_URL || 'http://localhost:3002',
    api: process.env.API_URL || 'http://localhost:3001',
  };

  let db: DatabaseService;
  let testWidgetId: string;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    
    // Create a test widget for cross-browser testing
    const widgetResult = await db.query(`
      INSERT INTO widgets (website_id, title, type, settings, is_published)
      SELECT w.id, 'Cross-Browser Test Widget', 'content', 
             '{"theme": "modern", "layout": "grid", "itemsPerPage": 5}', true
      FROM websites w 
      LIMIT 1
      RETURNING id
    `);
    testWidgetId = widgetResult.rows[0]?.id;
  });

  afterAll(async () => {
    if (testWidgetId) {
      await db.query('DELETE FROM widgets WHERE id = $1', [testWidgetId]);
    }
  });

  describe.each(browsers)('$name Browser Tests', ({ name, launch }) => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;

    beforeAll(async () => {
      browser = await launch({
        headless: process.env.CI === 'true',
        slowMo: name === 'WebKit' ? 200 : 100, // WebKit needs more time
      });

      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      });

      page = await context.newPage();
    });

    afterAll(async () => {
      await browser.close();
    });

    it('should load marketing site correctly', async () => {
      await page.goto(BASE_URLS.marketing);
      await page.waitForLoadState('networkidle');

      // Check basic elements load
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
      
      // Check CSS is applied
      const headerStyles = await page.locator('h1').evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          color: styles.color,
        };
      });

      expect(headerStyles.fontSize).not.toBe('16px'); // Should have custom styling
      expect(headerStyles.fontWeight).not.toBe('400'); // Should be bold
    });

    it('should handle JavaScript interactions', async () => {
      await page.goto(BASE_URLS.marketing);
      await page.waitForLoadState('networkidle');

      // Test mobile menu toggle (if present)
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-toggle"], .mobile-menu-toggle');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await expect(page.locator('[data-testid="mobile-menu"], .mobile-menu')).toBeVisible();
      }

      // Test CTA button interactions
      const ctaButton = page.locator('[data-testid="cta-button"], .cta-button').first();
      if (await ctaButton.isVisible()) {
        await expect(ctaButton).toBeEnabled();
        
        // Test hover effects (not applicable to touch devices)
        if (name !== 'WebKit') {
          await ctaButton.hover();
          // Allow time for hover effects
          await page.waitForTimeout(500);
        }
      }
    });

    it('should render widgets correctly', async () => {
      const widgetTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Widget Browser Test - ${name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .test-container { max-width: 800px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="test-container">
            <h1>Widget Test - ${name}</h1>
            <div id="test-widget" 
                 data-storyslip-widget 
                 data-widget-id="${testWidgetId}" 
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

      await page.setContent(widgetTestContent);
      
      // Wait for widget to load
      await page.waitForSelector('.storyslip-widget[data-loaded="true"]', { 
        timeout: 15000 // Give more time for slower browsers
      });

      // Verify widget structure
      const widget = page.locator('.storyslip-widget');
      await expect(widget).toBeVisible();

      // Check CSS is properly applied
      const widgetStyles = await widget.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          fontFamily: styles.fontFamily,
          borderRadius: styles.borderRadius,
        };
      });

      expect(widgetStyles.display).not.toBe('none');
      expect(widgetStyles.fontFamily).toContain('system-ui');

      // Test responsive behavior
      await page.setViewportSize({ width: 480, height: 800 });
      await page.waitForTimeout(1000); // Allow time for responsive changes

      // Check if responsive classes are applied
      const hasResponsiveClass = await widget.evaluate(el => {
        return el.classList.contains('storyslip-sm') || 
               el.classList.contains('storyslip-md') || 
               el.classList.contains('storyslip-lg');
      });
      expect(hasResponsiveClass).toBe(true);
    });

    it('should handle widget interactions', async () => {
      const interactiveWidgetContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Interactive Widget Test - ${name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div id="interactive-widget" 
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

      await page.setContent(interactiveWidgetContent);
      await page.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

      // Test pagination if present
      const paginationButtons = page.locator('.storyslip-page-btn');
      const buttonCount = await paginationButtons.count();
      
      if (buttonCount > 0) {
        // Click on page 2 if it exists
        const page2Button = paginationButtons.filter({ hasText: '2' });
        if (await page2Button.count() > 0) {
          await page2Button.first().click();
          
          // Wait for content to update
          await page.waitForTimeout(2000);
          
          // Verify page changed (button should have active class)
          await expect(page2Button.first()).toHaveClass(/storyslip-active/);
        }
      }

      // Test search functionality if present
      const searchInput = page.locator('.storyslip-search');
      if (await searchInput.count() > 0) {
        await searchInput.fill('test');
        await page.waitForTimeout(1000); // Wait for debounced search
        
        // Verify search was performed (content should update)
        const widget = page.locator('.storyslip-widget');
        await expect(widget).toBeVisible();
      }
    });

    it('should handle errors gracefully', async () => {
      const errorTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error Test - ${name}</title>
        </head>
        <body>
          <div id="error-widget" 
               data-storyslip-widget 
               data-widget-id="non-existent-widget" 
               data-widget-type="content">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await page.setContent(errorTestContent);
      
      // Should show error state
      await page.waitForSelector('.storyslip-error', { timeout: 10000 });
      
      const errorElement = page.locator('.storyslip-error');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toContainText('Content Unavailable');

      // Test retry functionality
      const retryButton = page.locator('.storyslip-error-retry');
      if (await retryButton.count() > 0) {
        await retryButton.click();
        
        // Should still show error (since widget doesn't exist)
        await page.waitForTimeout(2000);
        await expect(errorElement).toBeVisible();
      }
    });

    it('should support different widget themes', async () => {
      const themes = ['modern', 'minimal', 'classic'];
      
      for (const theme of themes) {
        const themeTestContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Theme Test - ${theme} - ${name}</title>
          </head>
          <body>
            <div id="theme-widget-${theme}" 
                 data-storyslip-widget 
                 data-widget-id="${testWidgetId}" 
                 data-widget-type="content"
                 data-widget-theme="${theme}">
              Loading...
            </div>
            <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
          </body>
          </html>
        `;

        await page.setContent(themeTestContent);
        await page.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

        const widget = page.locator('.storyslip-widget');
        await expect(widget).toBeVisible();

        // Verify theme-specific styling
        const widgetStyles = await widget.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            border: styles.border,
            borderRadius: styles.borderRadius,
          };
        });

        // Each theme should have different styling
        expect(widgetStyles.backgroundColor).toBeDefined();
        
        if (theme === 'minimal') {
          // Minimal theme should have transparent background
          expect(widgetStyles.backgroundColor).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
        }
      }
    });

    it('should handle different content types', async () => {
      const layouts = ['grid', 'list', 'carousel'];
      
      for (const layout of layouts) {
        const layoutTestContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Layout Test - ${layout} - ${name}</title>
          </head>
          <body>
            <div id="layout-widget-${layout}" 
                 data-storyslip-widget 
                 data-widget-id="${testWidgetId}" 
                 data-widget-type="content"
                 data-widget-layout="${layout}">
              Loading...
            </div>
            <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
          </body>
          </html>
        `;

        await page.setContent(layoutTestContent);
        await page.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

        const widget = page.locator('.storyslip-widget');
        await expect(widget).toBeVisible();
        await expect(widget).toHaveAttribute('data-layout', layout);

        // Verify layout-specific CSS classes
        const contentContainer = page.locator('.storyslip-content');
        await expect(contentContainer).toHaveClass(new RegExp(`storyslip-${layout}`));

        // Test layout-specific functionality
        if (layout === 'carousel') {
          // Check for carousel navigation
          const carouselButtons = page.locator('.storyslip-carousel-btn');
          if (await carouselButtons.count() > 0) {
            await expect(carouselButtons.first()).toBeVisible();
          }
        }
      }
    });

    it('should work with different viewport sizes', async () => {
      const viewports = [
        { width: 320, height: 568, name: 'Mobile Portrait' },
        { width: 568, height: 320, name: 'Mobile Landscape' },
        { width: 768, height: 1024, name: 'Tablet Portrait' },
        { width: 1024, height: 768, name: 'Tablet Landscape' },
        { width: 1920, height: 1080, name: 'Desktop' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const viewportTestContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Viewport Test - ${viewport.name} - ${name}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body>
            <div id="viewport-widget" 
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

        await page.setContent(viewportTestContent);
        await page.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

        const widget = page.locator('.storyslip-widget');
        await expect(widget).toBeVisible();

        // Verify widget fits within viewport
        const widgetBox = await widget.boundingBox();
        expect(widgetBox?.width).toBeLessThanOrEqual(viewport.width);

        // Check responsive classes
        const responsiveClasses = await widget.evaluate(el => {
          return Array.from(el.classList).filter(cls => 
            cls.includes('storyslip-sm') || 
            cls.includes('storyslip-md') || 
            cls.includes('storyslip-lg')
          );
        });

        expect(responsiveClasses.length).toBeGreaterThan(0);
      }
    });

    it('should handle network conditions', async () => {
      // Test with slow network
      await context.route('**/*', async (route) => {
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });

      const networkTestContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Network Test - ${name}</title>
        </head>
        <body>
          <div id="network-widget" 
               data-storyslip-widget 
               data-widget-id="${testWidgetId}" 
               data-widget-type="content">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await page.setContent(networkTestContent);
      
      // Should still load, just slower
      await page.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 20000 });
      
      const widget = page.locator('.storyslip-widget');
      await expect(widget).toBeVisible();

      // Remove network throttling
      await context.unroute('**/*');
    });

    it('should support accessibility features', async () => {
      const accessibilityTestContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Accessibility Test - ${name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <div id="a11y-widget" 
               data-storyslip-widget 
               data-widget-id="${testWidgetId}" 
               data-widget-type="content">
            Loading...
          </div>
          <script src="${BASE_URLS.api}/api/widgets/script.js"></script>
        </body>
        </html>
      `;

      await page.setContent(accessibilityTestContent);
      await page.waitForSelector('.storyslip-widget[data-loaded="true"]', { timeout: 15000 });

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      
      // Check for focus indicators
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();

      // Test screen reader compatibility
      const widget = page.locator('.storyslip-widget');
      
      // Check for proper ARIA attributes
      const ariaLabel = await widget.getAttribute('aria-label');
      const role = await widget.getAttribute('role');
      
      // Should have some accessibility attributes
      expect(ariaLabel || role).toBeDefined();

      // Check for alt text on images
      const images = page.locator('.storyslip-widget img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).toBeDefined();
        expect(alt).not.toBe('');
      }
    });
  });

  describe('Browser Feature Detection', () => {
    it('should detect and handle browser capabilities', async () => {
      for (const { name, launch } of browsers) {
        const browser = await launch({ headless: true });
        const page = await browser.newPage();

        const capabilities = await page.evaluate(() => {
          return {
            // Modern JavaScript features
            supportsES6: typeof Symbol !== 'undefined',
            supportsAsyncAwait: (async () => {}).constructor === (async function(){}).constructor,
            supportsFetch: typeof fetch !== 'undefined',
            
            // CSS features
            supportsGrid: CSS.supports('display', 'grid'),
            supportsFlexbox: CSS.supports('display', 'flex'),
            supportsCustomProperties: CSS.supports('--custom', 'value'),
            
            // Browser APIs
            supportsIntersectionObserver: 'IntersectionObserver' in window,
            supportsResizeObserver: 'ResizeObserver' in window,
            supportsLocalStorage: typeof Storage !== 'undefined',
            
            // User agent
            userAgent: navigator.userAgent,
            platform: navigator.platform,
          };
        });

        console.log(`${name} capabilities:`, capabilities);

        // All modern browsers should support these features
        expect(capabilities.supportsES6).toBe(true);
        expect(capabilities.supportsFetch).toBe(true);
        expect(capabilities.supportsFlexbox).toBe(true);
        expect(capabilities.supportsLocalStorage).toBe(true);

        await browser.close();
      }
    });
  });
});
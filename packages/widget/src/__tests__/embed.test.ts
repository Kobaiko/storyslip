/**
 * @jest-environment jsdom
 */

import { StorySlipWidget } from '../embed';

// Mock fetch
global.fetch = jest.fn();

describe('StorySlipWidget Embed', () => {
  const mockConfig = {
    widgetId: 'widget-123',
    websiteId: 'website-123',
    containerId: 'test-container',
    theme: 'default',
    width: '100%',
    height: 'auto',
    trackViews: true,
    trackClicks: true,
    openLinksInNewTab: true,
  };

  const mockWidgetResponse = {
    data: {
      html: '<div class="storyslip-widget"><div class="storyslip-item" data-content-id="content-1"><a href="/article-1" class="storyslip-item-link">Article 1</a></div></div>',
      css: '.storyslip-widget { font-family: Arial; }',
      data: { items: [{ id: 'content-1', title: 'Article 1' }] },
      meta: { title: 'Test Widget' },
    },
  };

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Create container element
    const container = document.createElement('div');
    container.id = mockConfig.containerId;
    document.body.appendChild(container);

    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWidgetResponse),
    });

    // Clear widget instances
    (StorySlipWidget as any).instances.clear();
  });

  afterEach(() => {
    // Clean up styles
    const styles = document.querySelectorAll('style[id^="storyslip-widget-styles"]');
    styles.forEach(style => style.remove());
  });

  describe('Widget Initialization', () => {
    it('should render widget successfully', async () => {
      const widget = StorySlipWidget.render(mockConfig);
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/widgets/${mockConfig.widgetId}/render`),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      const container = document.getElementById(mockConfig.containerId);
      expect(container?.innerHTML).toContain('storyslip-widget');
    });

    it('should handle missing container', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const invalidConfig = { ...mockConfig, containerId: 'non-existent' };
      StorySlipWidget.render(invalidConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Container with ID "non-existent" not found')
      );
      
      consoleSpy.mockRestore();
    });

    it('should inject CSS styles', async () => {
      StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const styleElement = document.getElementById(`storyslip-widget-styles-${mockConfig.widgetId}`);
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('.storyslip-widget { font-family: Arial; }');
    });

    it('should track initial view', async () => {
      StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/widgets/${mockConfig.widgetId}/track`),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"event_type":"view"'),
        })
      );
    });
  });

  describe('Event Handling', () => {
    it('should handle pagination clicks', async () => {
      const paginationHTML = `
        <div class="storyslip-widget">
          <div class="storyslip-pagination">
            <button class="storyslip-page-btn" data-page="2">2</button>
          </div>
        </div>
      `;
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { ...mockWidgetResponse.data, html: paginationHTML },
        }),
      });

      const widget = StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Click pagination button
      const pageButton = document.querySelector('.storyslip-page-btn') as HTMLButtonElement;
      expect(pageButton).toBeTruthy();
      
      pageButton.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should make another request for page 2
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });

    it('should handle content link clicks', async () => {
      StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Click content link
      const contentLink = document.querySelector('.storyslip-item-link') as HTMLAnchorElement;
      expect(contentLink).toBeTruthy();
      
      contentLink.click();

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should track click event
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/widgets/${mockConfig.widgetId}/track`),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"event_type":"click"'),
        })
      );

      // Should set target="_blank" for new tab
      expect(contentLink.target).toBe('_blank');
      expect(contentLink.rel).toBe('noopener noreferrer');
    });

    it('should handle search input', async () => {
      const searchHTML = `
        <div class="storyslip-widget">
          <input type="text" class="storyslip-search-input" placeholder="Search...">
        </div>
      `;
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: { ...mockWidgetResponse.data, html: searchHTML },
        }),
      });

      StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Type in search input
      const searchInput = document.querySelector('.storyslip-search-input') as HTMLInputElement;
      expect(searchInput).toBeTruthy();
      
      searchInput.value = 'test query';
      searchInput.dispatchEvent(new Event('input'));

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 600));

      // Should make search request
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test%20query'),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should show error state on fetch failure', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const container = document.getElementById(mockConfig.containerId);
      expect(container?.innerHTML).toContain('storyslip-widget-error');
      expect(container?.innerHTML).toContain('Failed to load content');
      
      consoleSpy.mockRestore();
    });

    it('should show error state on HTTP error', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      const container = document.getElementById(mockConfig.containerId);
      expect(container?.innerHTML).toContain('storyslip-widget-error');
      
      consoleSpy.mockRestore();
    });

    it('should handle retry button', async () => {
      // First call fails
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      // Second call succeeds
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWidgetResponse),
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show error state
      const container = document.getElementById(mockConfig.containerId);
      expect(container?.innerHTML).toContain('storyslip-widget-error');
      
      // Click retry button
      const retryButton = container?.querySelector('.storyslip-retry-btn') as HTMLButtonElement;
      expect(retryButton).toBeTruthy();
      
      retryButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show widget content after retry
      expect(container?.innerHTML).toContain('storyslip-widget');
      expect(container?.innerHTML).not.toContain('storyslip-widget-error');
      
      consoleSpy.mockRestore();
    });

    it('should gracefully handle tracking failures', async () => {
      // Widget render succeeds
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWidgetResponse),
      });
      
      // Tracking fails
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Tracking failed'));
      
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Widget should still render despite tracking failure
      const container = document.getElementById(mockConfig.containerId);
      expect(container?.innerHTML).toContain('storyslip-widget');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      // Delay the fetch response
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockWidgetResponse),
        }), 200))
      );
      
      StorySlipWidget.render(mockConfig);
      
      const container = document.getElementById(mockConfig.containerId);
      expect(container?.innerHTML).toContain('storyslip-widget-loading');
      expect(container?.innerHTML).toContain('Loading content...');
    });

    it('should prevent multiple simultaneous loads', async () => {
      const widget = StorySlipWidget.render(mockConfig);
      
      // Try to load again immediately
      widget.refresh();
      widget.refresh();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only make one request
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + one refresh
    });
  });

  describe('Widget Instance Management', () => {
    it('should store and retrieve widget instances', () => {
      const widget = StorySlipWidget.render(mockConfig);
      
      const retrieved = StorySlipWidget.getInstance(mockConfig.containerId);
      expect(retrieved).toBe(widget);
    });

    it('should destroy widget instance', async () => {
      const widget = StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have styles and content
      const styleElement = document.getElementById(`storyslip-widget-styles-${mockConfig.widgetId}`);
      expect(styleElement).toBeTruthy();
      
      const container = document.getElementById(mockConfig.containerId);
      expect(container?.innerHTML).not.toBe('');

      // Destroy widget
      widget.destroy();

      // Should clean up styles and content
      const styleElementAfter = document.getElementById(`storyslip-widget-styles-${mockConfig.widgetId}`);
      expect(styleElementAfter).toBeFalsy();
      
      expect(container?.innerHTML).toBe('');
      
      // Should remove from instances
      const retrieved = StorySlipWidget.getInstance(mockConfig.containerId);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Public API Methods', () => {
    it('should support refresh method', async () => {
      const widget = StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear fetch calls
      (fetch as jest.Mock).mockClear();
      
      widget.refresh();
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/widgets/${mockConfig.widgetId}/render`),
        expect.any(Object)
      );
    });

    it('should support goToPage method', async () => {
      const widget = StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear fetch calls
      (fetch as jest.Mock).mockClear();
      
      widget.goToPage(3);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=3'),
        expect.any(Object)
      );
    });

    it('should support search method', async () => {
      const widget = StorySlipWidget.render(mockConfig);
      
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear fetch calls
      (fetch as jest.Mock).mockClear();
      
      widget.search('test query');
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=test%20query'),
        expect.any(Object)
      );
    });
  });

  describe('Auto-initialization', () => {
    it('should auto-initialize widgets with data attributes', () => {
      // Create element with data attributes
      const autoWidget = document.createElement('div');
      autoWidget.id = 'auto-widget';
      autoWidget.setAttribute('data-storyslip-widget', '');
      autoWidget.setAttribute('data-widget-id', 'auto-widget-123');
      autoWidget.setAttribute('data-website-id', 'auto-website-123');
      autoWidget.setAttribute('data-theme', 'minimal');
      document.body.appendChild(autoWidget);

      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));

      // Should create widget instance
      const instance = StorySlipWidget.getInstance('auto-widget');
      expect(instance).toBeTruthy();
    });

    it('should skip auto-initialization for incomplete data attributes', () => {
      // Create element with incomplete data attributes
      const incompleteWidget = document.createElement('div');
      incompleteWidget.id = 'incomplete-widget';
      incompleteWidget.setAttribute('data-storyslip-widget', '');
      incompleteWidget.setAttribute('data-widget-id', 'incomplete-widget-123');
      // Missing data-website-id
      document.body.appendChild(incompleteWidget);

      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));

      // Should not create widget instance
      const instance = StorySlipWidget.getInstance('incomplete-widget');
      expect(instance).toBeUndefined();
    });
  });
});
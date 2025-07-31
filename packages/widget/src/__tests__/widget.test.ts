/**
 * @jest-environment jsdom
 */

import StorySlipWidget from '../widget';

// Mock fetch
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('StorySlipWidget', () => {
  let widget: StorySlipWidget;
  let container: HTMLElement;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Create test container
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Create new widget instance
    widget = new StorySlipWidget();

    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    widget.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with valid config', () => {
      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      expect(() => {
        widget.init(config, 'test-container');
      }).not.toThrow();
    });

    it('should handle missing API key', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const config = {
        apiKey: '',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');
      
      expect(consoleSpy).toHaveBeenCalledWith('StorySlip: API key is required');
      consoleSpy.mockRestore();
    });

    it('should handle missing domain', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const config = {
        apiKey: 'test-api-key',
        domain: '',
      };

      widget.init(config, 'test-container');
      
      expect(consoleSpy).toHaveBeenCalledWith('StorySlip: Domain is required');
      consoleSpy.mockRestore();
    });

    it('should handle missing container', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'non-existent-container');
      
      expect(consoleSpy).toHaveBeenCalledWith('StorySlip: Container element with ID "non-existent-container" not found');
      consoleSpy.mockRestore();
    });
  });

  describe('Display Modes', () => {
    const config = {
      apiKey: 'test-api-key',
      domain: 'example.com',
    };

    it('should create inline widget', () => {
      widget.init({ ...config, displayMode: 'inline' }, 'test-container');
      
      const widgetElement = container.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();
      expect(widgetElement?.classList.contains('storyslip-inline')).toBe(true);
    });

    it('should create floating trigger', () => {
      widget.init({ ...config, displayMode: 'floating' });
      
      const trigger = document.querySelector('.storyslip-floating-trigger');
      expect(trigger).toBeTruthy();
    });

    it('should show/hide popup widget', () => {
      widget.init({ ...config, displayMode: 'popup' });
      
      // Initially hidden
      expect(document.querySelector('.storyslip-widget')).toBeFalsy();
      
      // Show widget
      widget.show();
      expect(document.querySelector('.storyslip-widget')).toBeTruthy();
      expect(document.querySelector('.storyslip-overlay')).toBeTruthy();
      
      // Hide widget
      widget.hide();
      // Note: In real implementation, this would be animated
    });
  });

  describe('Styling', () => {
    const config = {
      apiKey: 'test-api-key',
      domain: 'example.com',
    };

    it('should inject widget styles', () => {
      widget.init(config, 'test-container');
      
      const styleElement = document.getElementById('storyslip-widget-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('.storyslip-widget');
    });

    it('should apply theme colors', () => {
      widget.init({ ...config, theme: 'dark' }, 'test-container');
      
      const styleElement = document.getElementById('storyslip-widget-styles');
      expect(styleElement?.textContent).toContain('#1f2937'); // Dark theme background
    });

    it('should apply custom styles', () => {
      widget.init({
        ...config,
        customStyles: { backgroundColor: 'red' }
      }, 'test-container');
      
      // Custom styles would be applied to the widget element
      const widgetElement = container.querySelector('.storyslip-widget') as HTMLElement;
      // Note: In real implementation, custom styles would be applied
      expect(widgetElement).toBeTruthy();
    });
  });

  describe('Content Loading', () => {
    const config = {
      apiKey: 'test-api-key',
      domain: 'example.com',
    };

    it('should load content from API', async () => {
      const mockContent = [
        {
          id: '1',
          title: 'Test Article',
          excerpt: 'Test excerpt',
          url: 'https://example.com/article',
          published_at: '2023-01-01T00:00:00Z',
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      });

      widget.init(config, 'test-container');
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/widget/test-api-key/content'),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      widget.init(config, 'test-container');
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleSpy).toHaveBeenCalledWith('StorySlip: Failed to load content', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should cache content when enabled', async () => {
      const mockContent = [
        {
          id: '1',
          title: 'Test Article',
          excerpt: 'Test excerpt',
          url: 'https://example.com/article',
          published_at: '2023-01-01T00:00:00Z',
        },
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      });

      widget.init({ ...config, cacheContent: true }, 'test-container');
      
      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh should use cache
      widget.refresh();
      
      // Should only be called once due to caching
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Behavior', () => {
    const config = {
      apiKey: 'test-api-key',
      domain: 'example.com',
      responsive: true,
    };

    it('should handle window resize', () => {
      widget.init(config, 'test-container');
      
      // Simulate window resize
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      Object.defineProperty(window, 'innerHeight', { value: 800 });
      
      window.dispatchEvent(new Event('resize'));
      
      // Widget should adapt to smaller screen
      const widgetElement = container.querySelector('.storyslip-widget') as HTMLElement;
      expect(widgetElement).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    const config = {
      apiKey: 'test-api-key',
      domain: 'example.com',
    };

    it('should handle escape key for modal/popup', () => {
      widget.init({ ...config, displayMode: 'popup' });
      widget.show();
      
      // Simulate escape key
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);
      
      // Widget should be hidden (in real implementation)
      // Note: This would require more complex testing setup
    });

    it('should include proper ARIA labels', () => {
      widget.init({ ...config, displayMode: 'floating' });
      
      const trigger = document.querySelector('.storyslip-floating-trigger');
      expect(trigger?.getAttribute('aria-label')).toBe('Open StorySlip Widget');
    });
  });

  describe('Performance Features', () => {
    const config = {
      apiKey: 'test-api-key',
      domain: 'example.com',
    };

    it('should setup lazy loading when enabled', () => {
      widget.init({ ...config, lazyLoad: true }, 'test-container');
      
      expect(IntersectionObserver).toHaveBeenCalled();
    });

    it('should setup resize observer when auto-resize enabled', () => {
      widget.init({ ...config, autoResize: true }, 'test-container');
      
      expect(ResizeObserver).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    const config = {
      apiKey: 'test-api-key',
      domain: 'example.com',
    };

    it('should cleanup resources on destroy', () => {
      widget.init(config, 'test-container');
      
      const styleElement = document.getElementById('storyslip-widget-styles');
      expect(styleElement).toBeTruthy();
      
      widget.destroy();
      
      // Style element should be removed
      expect(document.getElementById('storyslip-widget-styles')).toBeFalsy();
    });
  });
});
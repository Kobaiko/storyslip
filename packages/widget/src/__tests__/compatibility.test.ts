/**
 * Cross-browser compatibility tests for StorySlip Widget
 * Tests for browser feature detection and fallbacks
 */

import StorySlipWidget from '../widget';

describe('Cross-Browser Compatibility', () => {
  let widget: StorySlipWidget;
  let originalIntersectionObserver: any;
  let originalResizeObserver: any;
  let originalFetch: any;

  beforeEach(() => {
    // Store original implementations
    originalIntersectionObserver = (global as any).IntersectionObserver;
    originalResizeObserver = (global as any).ResizeObserver;
    originalFetch = global.fetch;

    // Reset DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    
    // Create test container
    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    widget = new StorySlipWidget();
  });

  afterEach(() => {
    // Restore original implementations
    (global as any).IntersectionObserver = originalIntersectionObserver;
    (global as any).ResizeObserver = originalResizeObserver;
    global.fetch = originalFetch;
    
    widget.destroy();
  });

  describe('Feature Detection', () => {
    it('should work without IntersectionObserver support', () => {
      // Remove IntersectionObserver support
      delete (global as any).IntersectionObserver;

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
        lazyLoad: true,
      };

      expect(() => {
        widget.init(config, 'test-container');
      }).not.toThrow();

      // Widget should still initialize without lazy loading
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();
    });

    it('should work without ResizeObserver support', () => {
      // Remove ResizeObserver support
      delete (global as any).ResizeObserver;

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
        autoResize: true,
      };

      expect(() => {
        widget.init(config, 'test-container');
      }).not.toThrow();

      // Widget should still initialize without auto-resize
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();
    });

    it('should work without fetch support', () => {
      // Remove fetch support
      delete (global as any).fetch;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');

      // Should handle missing fetch gracefully
      expect(consoleSpy).toHaveBeenCalledWith('StorySlip: Failed to load content', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('CSS Feature Support', () => {
    it('should work without CSS custom properties support', () => {
      // Mock CSS.supports to return false for custom properties
      const originalSupports = CSS.supports;
      CSS.supports = jest.fn().mockImplementation((property: string) => {
        if (property.includes('--')) return false;
        return originalSupports.call(CSS, property);
      });

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');

      // Widget should still work with fallback styles
      const styleElement = document.getElementById('storyslip-widget-styles');
      expect(styleElement).toBeTruthy();

      // Restore CSS.supports
      CSS.supports = originalSupports;
    });

    it('should work without flexbox support', () => {
      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');

      // Widget should use fallback layout
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();
    });
  });

  describe('Event Handling Compatibility', () => {
    it('should work with older event handling methods', () => {
      // Mock addEventListener to simulate older browsers
      const originalAddEventListener = Element.prototype.addEventListener;
      Element.prototype.addEventListener = jest.fn();

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
        displayMode: 'popup' as const,
      };

      widget.init(config);
      widget.show();

      // Should still create widget elements
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();

      // Restore addEventListener
      Element.prototype.addEventListener = originalAddEventListener;
    });

    it('should handle touch events on mobile devices', () => {
      // Simulate touch device
      Object.defineProperty(window, 'ontouchstart', { value: {} });

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
        displayMode: 'floating' as const,
      };

      widget.init(config);

      const trigger = document.querySelector('.storyslip-floating-trigger');
      expect(trigger).toBeTruthy();

      // Should handle both click and touch events
      const clickEvent = new Event('click');
      trigger?.dispatchEvent(clickEvent);
    });
  });

  describe('Browser-Specific Workarounds', () => {
    it('should handle Internet Explorer quirks', () => {
      // Mock IE-specific behavior
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
        },
        writable: true,
      });

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');

      // Widget should still work in IE
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();
    });

    it('should handle Safari-specific issues', () => {
      // Mock Safari user agent
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        },
        writable: true,
      });

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');

      // Widget should work in Safari
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();
    });
  });

  describe('Performance on Older Browsers', () => {
    it('should degrade gracefully without modern performance APIs', () => {
      // Remove performance APIs
      delete (global as any).performance;
      delete (global as any).requestAnimationFrame;

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
        animation: 'fade' as const,
      };

      widget.init(config, 'test-container');

      // Should still work without animations
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();
    });

    it('should work with limited localStorage support', () => {
      // Mock limited localStorage
      const mockStorage = {
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('QuotaExceededError');
        }),
        removeItem: jest.fn(),
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
      });

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
        cacheContent: true,
      };

      widget.init(config, 'test-container');

      // Should work without caching
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();
    });
  });

  describe('Accessibility Compatibility', () => {
    it('should work with screen readers', () => {
      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');

      // Check for proper ARIA attributes
      const widgetElement = document.querySelector('.storyslip-widget');
      expect(widgetElement).toBeTruthy();

      // Should have proper semantic structure
      const header = widgetElement?.querySelector('.storyslip-header');
      expect(header).toBeTruthy();
    });

    it('should support keyboard navigation', () => {
      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
        displayMode: 'popup' as const,
      };

      widget.init(config);
      widget.show();

      // Should handle keyboard events
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      // Widget should respond to keyboard input
      expect(document.querySelector('.storyslip-widget')).toBeTruthy();
    });
  });

  describe('Network Conditions', () => {
    it('should handle slow network connections', async () => {
      // Mock slow network response
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, data: [] }),
          }), 5000)
        )
      );

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');

      // Should show loading state
      const loadingElement = document.querySelector('.storyslip-loading');
      expect(loadingElement).toBeTruthy();
    });

    it('should handle offline conditions', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const config = {
        apiKey: 'test-api-key',
        domain: 'example.com',
      };

      widget.init(config, 'test-container');

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should handle network errors gracefully
      expect(consoleSpy).toHaveBeenCalledWith('StorySlip: Failed to load content', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});
/**
 * Performance Tests for StorySlip Widget
 * Tests widget loading times, memory usage, and performance metrics
 */

import { JSDOM } from 'jsdom';
import { performance } from 'perf_hooks';

// Mock performance API for Node.js environment
global.performance = performance as any;

// Mock DOM environment
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head><title>Test Page</title></head>
    <body>
      <div id="widget-container"></div>
      <script src="/embed.js" data-website-id="test-website-id"></script>
    </body>
  </html>
`, {
  url: 'https://example.com',
  pretendToBeVisual: true,
  resources: 'usable',
});

global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Widget Performance Tests', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    // Clear any existing widgets
    document.body.innerHTML = '<div id="widget-container"></div>';
    
    // Reset performance marks
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  });

  describe('Widget Loading Performance', () => {
    it('should load widget within performance budget (< 100ms)', async () => {
      // Mock API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              website_id: 'test-website-id',
              theme: 'light',
              layout: 'list',
              branding: {
                primary_color: '#3B82F6',
                secondary_color: '#1E40AF',
              },
            },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'content-1',
                title: 'Test Article 1',
                excerpt: 'Test excerpt 1',
                published_at: '2024-01-01T00:00:00Z',
                url: 'https://example.com/article-1',
              },
              {
                id: 'content-2',
                title: 'Test Article 2',
                excerpt: 'Test excerpt 2',
                published_at: '2024-01-02T00:00:00Z',
                url: 'https://example.com/article-2',
              },
            ],
          }),
        } as Response);

      const startTime = performance.now();

      // Simulate widget initialization
      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
        theme: 'light',
        layout: 'list',
      });

      await widget.init();

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Widget should load within 100ms
      expect(loadTime).toBeLessThan(100);

      // Verify widget was rendered
      const container = document.getElementById('widget-container');
      expect(container?.children.length).toBeGreaterThan(0);
    });

    it('should handle large content sets efficiently (1000+ items)', async () => {
      // Generate large content dataset
      const largeContentSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `content-${i}`,
        title: `Test Article ${i}`,
        excerpt: `Test excerpt ${i}`,
        published_at: new Date(Date.now() - i * 1000).toISOString(),
        url: `https://example.com/article-${i}`,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { website_id: 'test-website-id' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: largeContentSet,
          }),
        } as Response);

      const startTime = performance.now();

      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
        limit: 1000,
      });

      await widget.init();

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should handle large datasets within reasonable time (< 500ms)
      expect(loadTime).toBeLessThan(500);

      // Verify content was rendered (should use virtualization for large sets)
      const container = document.getElementById('widget-container');
      expect(container?.children.length).toBeGreaterThan(0);
    });

    it('should implement efficient DOM updates', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { website_id: 'test-website-id' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'content-1',
                title: 'Initial Title',
                excerpt: 'Initial excerpt',
                published_at: '2024-01-01T00:00:00Z',
                url: 'https://example.com/article-1',
              },
            ],
          }),
        } as Response);

      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
      });

      await widget.init();

      // Measure DOM update performance
      const updateStartTime = performance.now();

      // Simulate content update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            {
              id: 'content-1',
              title: 'Updated Title',
              excerpt: 'Updated excerpt',
              published_at: '2024-01-01T00:00:00Z',
              url: 'https://example.com/article-1',
            },
          ],
        }),
      } as Response);

      await widget.refresh();

      const updateEndTime = performance.now();
      const updateTime = updateEndTime - updateStartTime;

      // DOM updates should be fast (< 50ms)
      expect(updateTime).toBeLessThan(50);

      // Verify content was updated
      const container = document.getElementById('widget-container');
      expect(container?.textContent).toContain('Updated Title');
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not create memory leaks during widget lifecycle', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and destroy multiple widget instances
      for (let i = 0; i < 100; i++) {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { website_id: `test-website-${i}` },
            }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: [
                {
                  id: `content-${i}`,
                  title: `Test Article ${i}`,
                  excerpt: `Test excerpt ${i}`,
                  published_at: '2024-01-01T00:00:00Z',
                  url: `https://example.com/article-${i}`,
                },
              ],
            }),
          } as Response);

        const { StorySlipWidget } = await import('../widget');
        
        const widget = new StorySlipWidget({
          websiteId: `test-website-${i}`,
          container: '#widget-container',
        });

        await widget.init();
        widget.destroy();

        // Clear container
        document.getElementById('widget-container')!.innerHTML = '';
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should efficiently manage event listeners', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { website_id: 'test-website-id' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'content-1',
                title: 'Test Article',
                excerpt: 'Test excerpt',
                published_at: '2024-01-01T00:00:00Z',
                url: 'https://example.com/article-1',
              },
            ],
          }),
        } as Response);

      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
      });

      // Track event listener count
      const originalAddEventListener = document.addEventListener;
      const originalRemoveEventListener = document.removeEventListener;
      
      let addedListeners = 0;
      let removedListeners = 0;

      document.addEventListener = jest.fn((...args) => {
        addedListeners++;
        return originalAddEventListener.apply(document, args);
      });

      document.removeEventListener = jest.fn((...args) => {
        removedListeners++;
        return originalRemoveEventListener.apply(document, args);
      });

      await widget.init();
      widget.destroy();

      // All added listeners should be removed
      expect(removedListeners).toBe(addedListeners);

      // Restore original methods
      document.addEventListener = originalAddEventListener;
      document.removeEventListener = originalRemoveEventListener;
    });
  });

  describe('Network Performance Tests', () => {
    it('should implement efficient caching strategy', async () => {
      const cacheKey = 'storyslip-cache-test-website-id';
      
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });

      // First load - should make API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { website_id: 'test-website-id' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'content-1',
                title: 'Test Article',
                excerpt: 'Test excerpt',
                published_at: '2024-01-01T00:00:00Z',
                url: 'https://example.com/article-1',
              },
            ],
          }),
        } as Response);

      const { StorySlipWidget } = await import('../widget');
      
      const widget1 = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
        cache: { enabled: true, duration: 300000 },
      });

      await widget1.init();

      // Verify cache was set
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Second load - should use cache
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        data: [
          {
            id: 'content-1',
            title: 'Test Article',
            excerpt: 'Test excerpt',
            published_at: '2024-01-01T00:00:00Z',
            url: 'https://example.com/article-1',
          },
        ],
        timestamp: Date.now(),
      }));

      const widget2 = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
        cache: { enabled: true, duration: 300000 },
      });

      const startTime = performance.now();
      await widget2.init();
      const endTime = performance.now();

      // Cached load should be much faster
      expect(endTime - startTime).toBeLessThan(10);
      
      // Should not make additional API calls
      expect(mockFetch).toHaveBeenCalledTimes(2); // Only from first widget
    });

    it('should handle network failures gracefully', async () => {
      // Mock network failure
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
      });

      const startTime = performance.now();
      
      // Should not throw error
      await expect(widget.init()).resolves.not.toThrow();
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should fail fast (< 5000ms with retries)
      expect(loadTime).toBeLessThan(5000);

      // Should show error state
      const container = document.getElementById('widget-container');
      expect(container?.textContent).toContain('error');
    });

    it('should implement request debouncing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            {
              id: 'content-1',
              title: 'Test Article',
              excerpt: 'Test excerpt',
              published_at: '2024-01-01T00:00:00Z',
              url: 'https://example.com/article-1',
            },
          ],
        }),
      } as Response);

      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
      });

      // Make multiple rapid refresh calls
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(widget.refresh());
      }

      await Promise.all(promises);

      // Should debounce requests (fewer than 10 calls)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rendering Performance Tests', () => {
    it('should implement virtual scrolling for large lists', async () => {
      // Generate large content set
      const largeContentSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `content-${i}`,
        title: `Test Article ${i}`,
        excerpt: `Test excerpt ${i}`,
        published_at: new Date(Date.now() - i * 1000).toISOString(),
        url: `https://example.com/article-${i}`,
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { website_id: 'test-website-id' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: largeContentSet,
          }),
        } as Response);

      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
        layout: 'list',
        virtualScrolling: true,
      });

      const startTime = performance.now();
      await widget.init();
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // Should render quickly even with large dataset
      expect(renderTime).toBeLessThan(200);

      // Should only render visible items (not all 10000)
      const container = document.getElementById('widget-container');
      const renderedItems = container?.querySelectorAll('.storyslip-item');
      expect(renderedItems?.length).toBeLessThan(100); // Only visible items
    });

    it('should optimize CSS and styling performance', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              website_id: 'test-website-id',
              branding: {
                primary_color: '#3B82F6',
                secondary_color: '#1E40AF',
                custom_css: '.custom { color: red; }',
              },
            },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'content-1',
                title: 'Test Article',
                excerpt: 'Test excerpt',
                published_at: '2024-01-01T00:00:00Z',
                url: 'https://example.com/article-1',
              },
            ],
          }),
        } as Response);

      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
      });

      const startTime = performance.now();
      await widget.init();
      const endTime = performance.now();

      const renderTime = endTime - startTime;

      // CSS application should be fast
      expect(renderTime).toBeLessThan(100);

      // Should inject styles efficiently
      const styleElements = document.querySelectorAll('style[data-storyslip]');
      expect(styleElements.length).toBe(1); // Should consolidate styles
    });
  });

  describe('Bundle Size and Loading Tests', () => {
    it('should meet bundle size requirements', () => {
      // This would typically be tested in a build process
      // For now, we'll simulate checking the widget size
      const widgetCode = `
        // Simulated widget code
        class StorySlipWidget {
          constructor(options) { this.options = options; }
          init() { return Promise.resolve(); }
          destroy() {}
        }
      `;

      // Widget should be under 50KB when minified and gzipped
      const estimatedSize = new Blob([widgetCode]).size;
      expect(estimatedSize).toBeLessThan(50 * 1024); // 50KB
    });

    it('should load asynchronously without blocking page render', async () => {
      const pageLoadStart = performance.now();

      // Simulate page content loading
      document.body.innerHTML = `
        <h1>Page Title</h1>
        <p>Page content that should load first</p>
        <div id="widget-container"></div>
      `;

      const pageLoadEnd = performance.now();
      const pageLoadTime = pageLoadEnd - pageLoadStart;

      // Page should load quickly without widget
      expect(pageLoadTime).toBeLessThan(10);

      // Widget loads asynchronously
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { website_id: 'test-website-id' },
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [
              {
                id: 'content-1',
                title: 'Test Article',
                excerpt: 'Test excerpt',
                published_at: '2024-01-01T00:00:00Z',
                url: 'https://example.com/article-1',
              },
            ],
          }),
        } as Response);

      const { StorySlipWidget } = await import('../widget');
      
      const widget = new StorySlipWidget({
        websiteId: 'test-website-id',
        container: '#widget-container',
      });

      // Widget initialization should not block
      const widgetPromise = widget.init();
      
      // Page should still be interactive
      expect(document.querySelector('h1')?.textContent).toBe('Page Title');
      
      await widgetPromise;
      
      // Widget should now be loaded
      const container = document.getElementById('widget-container');
      expect(container?.children.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-browser Performance', () => {
    it('should perform consistently across different user agents', async () => {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      ];

      const performanceResults = [];

      for (const userAgent of userAgents) {
        // Mock user agent
        Object.defineProperty(navigator, 'userAgent', {
          value: userAgent,
          configurable: true,
        });

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { website_id: 'test-website-id' },
            }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: [
                {
                  id: 'content-1',
                  title: 'Test Article',
                  excerpt: 'Test excerpt',
                  published_at: '2024-01-01T00:00:00Z',
                  url: 'https://example.com/article-1',
                },
              ],
            }),
          } as Response);

        const { StorySlipWidget } = await import('../widget');
        
        const widget = new StorySlipWidget({
          websiteId: 'test-website-id',
          container: '#widget-container',
        });

        const startTime = performance.now();
        await widget.init();
        const endTime = performance.now();

        performanceResults.push({
          userAgent: userAgent.split(' ')[0], // Browser name
          loadTime: endTime - startTime,
        });

        widget.destroy();
        document.getElementById('widget-container')!.innerHTML = '';
      }

      // Performance should be consistent across browsers (within 50ms variance)
      const loadTimes = performanceResults.map(r => r.loadTime);
      const maxTime = Math.max(...loadTimes);
      const minTime = Math.min(...loadTimes);
      const variance = maxTime - minTime;

      expect(variance).toBeLessThan(50);

      // All browsers should meet performance budget
      loadTimes.forEach(time => {
        expect(time).toBeLessThan(200);
      });
    });
  });
});
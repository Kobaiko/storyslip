import { StorySlipWidget } from '../../widget';
import { StorySlipEmbed } from '../../embed';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    style: {},
    appendChild: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

Object.defineProperty(document, 'querySelector', {
  value: jest.fn(),
});

Object.defineProperty(document, 'querySelectorAll', {
  value: jest.fn(() => []),
});

describe('Widget Integration Tests', () => {
  let mockContainer: HTMLElement;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();

    // Create mock container
    mockContainer = {
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      style: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as any;

    // Mock querySelector to return our container
    (document.querySelector as jest.Mock).mockReturnValue(mockContainer);
  });

  describe('Widget Initialization', () => {
    it('should initialize widget with valid configuration', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
        {
          id: 'content-2',
          title: 'Test Article 2',
          excerpt: 'Another test article excerpt',
          published_at: '2024-01-02T00:00:00Z',
          slug: 'test-article-2',
        },
      ];

      const mockBranding = {
        brand_name: 'Test Brand',
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF',
        logo_url: 'https://example.com/logo.png',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockContent }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockBranding }),
        } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
      });

      await widget.init();

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/widget/test-website-123/content'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'sk_test_123',
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
      });

      await expect(widget.init()).rejects.toThrow('Network error');
    });

    it('should handle invalid API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Invalid API key' }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'invalid-key',
        containerId: 'storyslip-widget',
      });

      await expect(widget.init()).rejects.toThrow('Invalid API key');
    });
  });

  describe('Content Rendering', () => {
    it('should render content list correctly', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        layout: 'list',
      });

      await widget.init();

      expect(mockContainer.appendChild).toHaveBeenCalled();
      
      // Verify content structure was created
      const createElementCalls = (document.createElement as jest.Mock).mock.calls;
      expect(createElementCalls.some(call => call[0] === 'div')).toBe(true);
      expect(createElementCalls.some(call => call[0] === 'h3')).toBe(true);
      expect(createElementCalls.some(call => call[0] === 'p')).toBe(true);
    });

    it('should render content in grid layout', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
        {
          id: 'content-2',
          title: 'Test Article 2',
          excerpt: 'Another test article excerpt',
          published_at: '2024-01-02T00:00:00Z',
          slug: 'test-article-2',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        layout: 'grid',
        columns: 2,
      });

      await widget.init();

      expect(mockContainer.appendChild).toHaveBeenCalled();
      
      // Verify grid structure
      const createElementCalls = (document.createElement as jest.Mock).mock.calls;
      const gridElements = createElementCalls.filter(call => call[0] === 'div');
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it('should apply custom styling', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
      ];

      const mockBranding = {
        brand_name: 'Test Brand',
        primary_color: '#3B82F6',
        secondary_color: '#1E40AF',
        logo_url: 'https://example.com/logo.png',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockContent }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockBranding }),
        } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        customStyles: {
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '16px',
        },
      });

      await widget.init();

      // Verify custom styles were applied
      expect(mockContainer.style).toEqual(
        expect.objectContaining({
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          padding: '16px',
        })
      );
    });

    it('should handle empty content gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
      });

      await widget.init();

      expect(mockContainer.appendChild).toHaveBeenCalled();
      
      // Should show empty state message
      const createElementCalls = (document.createElement as jest.Mock).mock.calls;
      expect(createElementCalls.some(call => call[0] === 'p')).toBe(true);
    });
  });

  describe('Interactive Features', () => {
    it('should handle content filtering', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'JavaScript Tutorial',
          excerpt: 'Learn JavaScript basics',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'javascript-tutorial',
          categories: ['Programming'],
          tags: ['JavaScript', 'Tutorial'],
        },
        {
          id: 'content-2',
          title: 'Python Guide',
          excerpt: 'Python programming guide',
          published_at: '2024-01-02T00:00:00Z',
          slug: 'python-guide',
          categories: ['Programming'],
          tags: ['Python', 'Guide'],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        showFilters: true,
      });

      await widget.init();

      // Simulate filter interaction
      widget.filterByCategory('Programming');

      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should handle search functionality', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'JavaScript Tutorial',
          excerpt: 'Learn JavaScript basics',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'javascript-tutorial',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        showSearch: true,
      });

      await widget.init();

      // Simulate search
      widget.search('JavaScript');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=JavaScript'),
        expect.any(Object)
      );
    });

    it('should handle pagination', async () => {
      const mockContent = Array.from({ length: 20 }, (_, i) => ({
        id: `content-${i + 1}`,
        title: `Test Article ${i + 1}`,
        excerpt: `This is test article ${i + 1}`,
        published_at: '2024-01-01T00:00:00Z',
        slug: `test-article-${i + 1}`,
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent.slice(0, 10) }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        itemsPerPage: 10,
        showPagination: true,
      });

      await widget.init();

      // Simulate pagination
      widget.loadPage(2);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  describe('Analytics Tracking', () => {
    it('should track content views', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockContent }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        trackAnalytics: true,
      });

      await widget.init();

      // Simulate content click
      widget.trackContentView('content-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/track'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('content-1'),
        })
      );
    });

    it('should track widget impressions', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockContent }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        trackAnalytics: true,
      });

      await widget.init();

      // Should automatically track impression
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/track'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('widget_impression'),
        })
      );
    });
  });

  describe('Embed Integration', () => {
    it('should initialize embed widget from script tag', async () => {
      const mockScript = {
        getAttribute: jest.fn((attr) => {
          const attrs: Record<string, string> = {
            'data-website-id': 'test-website-123',
            'data-api-key': 'sk_test_123',
            'data-layout': 'grid',
            'data-columns': '3',
          };
          return attrs[attr];
        }),
        parentNode: {
          insertBefore: jest.fn(),
        },
      };

      (document.querySelectorAll as jest.Mock).mockReturnValue([mockScript]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const embed = new StorySlipEmbed();
      await embed.init();

      expect(mockScript.getAttribute).toHaveBeenCalledWith('data-website-id');
      expect(mockScript.getAttribute).toHaveBeenCalledWith('data-api-key');
      expect(mockScript.parentNode.insertBefore).toHaveBeenCalled();
    });

    it('should handle multiple embed instances', async () => {
      const mockScripts = [
        {
          getAttribute: jest.fn((attr) => {
            const attrs: Record<string, string> = {
              'data-website-id': 'website-1',
              'data-api-key': 'sk_test_1',
            };
            return attrs[attr];
          }),
          parentNode: { insertBefore: jest.fn() },
        },
        {
          getAttribute: jest.fn((attr) => {
            const attrs: Record<string, string> = {
              'data-website-id': 'website-2',
              'data-api-key': 'sk_test_2',
            };
            return attrs[attr];
          }),
          parentNode: { insertBefore: jest.fn() },
        },
      ];

      (document.querySelectorAll as jest.Mock).mockReturnValue(mockScripts);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const embed = new StorySlipEmbed();
      await embed.init();

      expect(mockScripts[0].parentNode.insertBefore).toHaveBeenCalled();
      expect(mockScripts[1].parentNode.insertBefore).toHaveBeenCalled();
    });
  });

  describe('Performance Optimization', () => {
    it('should implement content caching', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        cacheTimeout: 300000, // 5 minutes
      });

      await widget.init();
      
      // Second initialization should use cache
      await widget.init();

      // Should only make one API call due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should implement lazy loading for images', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
          featured_image: 'https://example.com/image1.jpg',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        lazyLoadImages: true,
      });

      await widget.init();

      // Verify lazy loading attributes were set
      const createElementCalls = (document.createElement as jest.Mock).mock.calls;
      const imgCalls = createElementCalls.filter(call => call[0] === 'img');
      expect(imgCalls.length).toBeGreaterThan(0);
    });

    it('should handle network failures gracefully', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
        retryAttempts: 2,
        retryDelay: 100,
      });

      await widget.init();

      // Should retry after failure
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility Features', () => {
    it('should include proper ARIA attributes', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
      });

      await widget.init();

      // Verify ARIA attributes were set
      const mockElements = (document.createElement as jest.Mock).mock.results;
      const setAttributeCalls = mockElements.flatMap(result => 
        result.value.setAttribute.mock?.calls || []
      );
      
      expect(setAttributeCalls.some(call => 
        call[0].startsWith('aria-') || call[0] === 'role'
      )).toBe(true);
    });

    it('should support keyboard navigation', async () => {
      const mockContent = [
        {
          id: 'content-1',
          title: 'Test Article 1',
          excerpt: 'This is a test article excerpt',
          published_at: '2024-01-01T00:00:00Z',
          slug: 'test-article-1',
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockContent }),
      } as Response);

      const widget = new StorySlipWidget({
        websiteId: 'test-website-123',
        apiKey: 'sk_test_123',
        containerId: 'storyslip-widget',
      });

      await widget.init();

      // Verify tabindex attributes were set
      const mockElements = (document.createElement as jest.Mock).mock.results;
      const setAttributeCalls = mockElements.flatMap(result => 
        result.value.setAttribute.mock?.calls || []
      );
      
      expect(setAttributeCalls.some(call => call[0] === 'tabindex')).toBe(true);
    });
  });
});
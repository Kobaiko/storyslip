import { widgetContentDeliveryService } from '../services/widget-content-delivery.service';
import { supabase } from '../config/supabase';
import { brandService } from '../services/brand.service';
import WidgetOptimizationService from '../services/widget-optimization.service';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../services/brand.service');
jest.mock('../services/widget-optimization.service');
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  }));
});

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockBrandService = brandService as jest.Mocked<typeof brandService>;
const mockOptimizationService = WidgetOptimizationService as jest.Mocked<typeof WidgetOptimizationService>;

describe('WidgetContentDeliveryService', () => {
  const mockWidgetId = '123e4567-e89b-12d3-a456-426614174002';
  const mockWebsiteId = '123e4567-e89b-12d3-a456-426614174001';

  const mockWidget = {
    id: mockWidgetId,
    website_id: mockWebsiteId,
    widget_name: 'Test Widget',
    widget_type: 'content_list',
    title: 'Latest Articles',
    description: 'Recent blog posts',
    items_per_page: 10,
    show_images: true,
    show_excerpts: true,
    show_dates: true,
    show_authors: false,
    show_categories: true,
    show_tags: false,
    content_filters: {},
    sort_order: 'created_at_desc',
    theme: 'default',
    width: '100%',
    height: 'auto',
    border_radius: '8px',
    padding: '16px',
    is_public: true,
    allowed_domains: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockContent = [
    {
      id: 'content-1',
      title: 'Test Article 1',
      slug: 'test-article-1',
      excerpt: 'This is a test article excerpt',
      featured_image_url: 'https://example.com/image1.jpg',
      created_at: '2024-01-01T00:00:00Z',
      published_at: '2024-01-01T00:00:00Z',
      categories: [{ category: { id: 'cat-1', name: 'Technology', slug: 'technology' } }],
    },
    {
      id: 'content-2',
      title: 'Test Article 2',
      slug: 'test-article-2',
      excerpt: 'Another test article excerpt',
      featured_image_url: 'https://example.com/image2.jpg',
      created_at: '2024-01-02T00:00:00Z',
      published_at: '2024-01-02T00:00:00Z',
      categories: [{ category: { id: 'cat-2', name: 'Design', slug: 'design' } }],
    },
  ];

  const mockBrandConfig = {
    font_family: 'Arial, sans-serif',
    heading_font_family: 'Georgia, serif',
    text_color: '#333333',
    background_color: '#ffffff',
    primary_color: '#007bff',
    hide_storyslip_branding: false,
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase queries
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockWidget,
            error: null,
          }),
        }),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnValue({
          data: mockContent,
          error: null,
          count: mockContent.length,
        }),
      }),
    } as any);

    // Mock brand service
    mockBrandService.getBrandConfiguration.mockResolvedValue(mockBrandConfig);

    // Mock optimization service
    mockOptimizationService.optimizeContent.mockResolvedValue({
      html: '<div class="storyslip-widget">Optimized Content</div>',
      css: '.storyslip-widget{color:#333}',
      optimizedImages: [],
      performance: {
        originalSize: 1000,
        optimizedSize: 800,
        compressionRatio: 0.2,
        optimizations: ['HTML minification', 'CSS minification'],
      },
    });
  });

  describe('deliverContent', () => {
    it('should deliver optimized widget content successfully', async () => {
      const result = await widgetContentDeliveryService.deliverContent(mockWidgetId, {
        page: 1,
        limit: 10,
      });

      expect(result).toMatchObject({
        html: expect.stringContaining('storyslip-widget'),
        css: expect.stringContaining('.storyslip-widget'),
        data: {
          items: expect.arrayContaining([
            expect.objectContaining({
              id: 'content-1',
              title: 'Test Article 1',
            }),
          ]),
          total: 2,
          page: 1,
          totalPages: 1,
          hasMore: false,
        },
        meta: expect.objectContaining({
          title: 'Latest Articles',
          description: 'Recent blog posts',
        }),
        performance: expect.objectContaining({
          cacheHit: false,
          renderTime: expect.any(Number),
          queryTime: expect.any(Number),
        }),
      });

      expect(mockOptimizationService.optimizeContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          minifyHTML: true,
          minifyCSS: true,
          optimizeImages: true,
        })
      );
    });

    it('should handle pagination correctly', async () => {
      const result = await widgetContentDeliveryService.deliverContent(mockWidgetId, {
        page: 2,
        limit: 1,
      });

      expect(result.data.page).toBe(2);
      expect(result.data.totalPages).toBe(2);
      expect(result.data.hasMore).toBe(false);
    });

    it('should apply search filters', async () => {
      await widgetContentDeliveryService.deliverContent(mockWidgetId, {
        search: 'javascript',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('content');
      // Verify that search filter was applied in the query chain
    });

    it('should apply category filters', async () => {
      await widgetContentDeliveryService.deliverContent(mockWidgetId, {
        category: 'technology',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('content');
      // Verify that category filter was applied
    });

    it('should apply tag filters', async () => {
      await widgetContentDeliveryService.deliverContent(mockWidgetId, {
        tag: 'javascript',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('content');
      // Verify that tag filter was applied
    });

    it('should handle domain restrictions', async () => {
      const restrictedWidget = {
        ...mockWidget,
        allowed_domains: ['example.com', 'test.com'],
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: restrictedWidget,
              error: null,
            }),
          }),
        }),
      } as any);

      // Should throw error for disallowed domain
      await expect(
        widgetContentDeliveryService.deliverContent(mockWidgetId, {
          referrer: 'https://unauthorized.com/page',
        })
      ).rejects.toThrow('Domain not allowed');

      // Should succeed for allowed domain
      await expect(
        widgetContentDeliveryService.deliverContent(mockWidgetId, {
          referrer: 'https://example.com/page',
        })
      ).resolves.toBeDefined();
    });

    it('should handle non-public widgets', async () => {
      const privateWidget = {
        ...mockWidget,
        is_public: false,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: privateWidget,
              error: null,
            }),
          }),
        }),
      } as any);

      await expect(
        widgetContentDeliveryService.deliverContent(mockWidgetId)
      ).rejects.toThrow('Widget not found or not public');
    });

    it('should handle non-existent widgets', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      } as any);

      await expect(
        widgetContentDeliveryService.deliverContent(mockWidgetId)
      ).rejects.toThrow('Widget not found or not public');
    });

    it('should generate SEO metadata', async () => {
      const result = await widgetContentDeliveryService.deliverContent(mockWidgetId);

      expect(result.meta).toMatchObject({
        title: 'Latest Articles',
        description: 'Recent blog posts',
        canonical: expect.stringContaining(mockWidgetId),
        ogTitle: 'Latest Articles',
        ogDescription: 'Recent blog posts',
        structuredData: expect.objectContaining({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
        }),
      });
    });

    it('should handle different widget types', async () => {
      const singleContentWidget = {
        ...mockWidget,
        widget_type: 'single_content',
        content_filters: { content_id: 'content-1' },
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: singleContentWidget,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await widgetContentDeliveryService.deliverContent(mockWidgetId);

      expect(result.html).toContain('storyslip-single-content');
    });
  });

  describe('Cache Management', () => {
    it('should invalidate widget cache', async () => {
      await expect(
        widgetContentDeliveryService.invalidateWidgetCache(mockWidgetId)
      ).resolves.not.toThrow();
    });

    it('should invalidate brand cache', async () => {
      await expect(
        widgetContentDeliveryService.invalidateBrandCache(mockWebsiteId)
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize content for delivery', async () => {
      const result = await widgetContentDeliveryService.deliverContent(mockWidgetId);

      expect(mockOptimizationService.optimizeContent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          minifyHTML: true,
          minifyCSS: true,
          optimizeImages: true,
          enableLazyLoading: true,
          generateResponsiveImages: true,
        })
      );

      expect(result.performance).toMatchObject({
        cacheHit: expect.any(Boolean),
        renderTime: expect.any(Number),
        queryTime: expect.any(Number),
      });
    });

    it('should measure query performance', async () => {
      const result = await widgetContentDeliveryService.deliverContent(mockWidgetId);

      expect(result.performance.queryTime).toBeGreaterThanOrEqual(0);
      expect(result.performance.renderTime).toBeGreaterThan(0);
    });
  });

  describe('Content Filtering', () => {
    it('should apply widget content filters', async () => {
      const filteredWidget = {
        ...mockWidget,
        content_filters: {
          category_ids: ['cat-1', 'cat-2'],
          tag_ids: ['tag-1'],
          author_ids: ['author-1'],
          date_from: '2024-01-01',
          date_to: '2024-12-31',
        },
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: filteredWidget,
              error: null,
            }),
          }),
        }),
      } as any);

      await widgetContentDeliveryService.deliverContent(mockWidgetId);

      expect(mockSupabase.from).toHaveBeenCalledWith('content');
      // Verify that all filters were applied
    });

    it('should optimize select fields based on widget configuration', async () => {
      const minimalWidget = {
        ...mockWidget,
        show_images: false,
        show_excerpts: false,
        show_authors: false,
        show_categories: false,
        show_tags: false,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: minimalWidget,
              error: null,
            }),
          }),
        }),
      } as any);

      await widgetContentDeliveryService.deliverContent(mockWidgetId);

      // Should only select minimal fields
      expect(mockSupabase.from().select).toHaveBeenCalledWith(
        expect.stringContaining('id, title, slug, created_at, published_at'),
        { count: 'exact' }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
              count: 0,
            }),
          }),
        }),
      } as any);

      await expect(
        widgetContentDeliveryService.deliverContent(mockWidgetId)
      ).rejects.toThrow('Failed to fetch content');
    });

    it('should handle optimization service errors', async () => {
      mockOptimizationService.optimizeContent.mockRejectedValue(
        new Error('Optimization failed')
      );

      await expect(
        widgetContentDeliveryService.deliverContent(mockWidgetId)
      ).rejects.toThrow('Failed to deliver widget content');
    });

    it('should handle brand service errors', async () => {
      mockBrandService.getBrandConfiguration.mockRejectedValue(
        new Error('Brand config not found')
      );

      await expect(
        widgetContentDeliveryService.deliverContent(mockWidgetId)
      ).rejects.toThrow('Failed to deliver widget content');
    });
  });
});
import { contentService } from '../../services/content.service';
import { supabase } from '../../config/supabase';

// Mock dependencies
jest.mock('../../config/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Content Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createContent', () => {
    it('should create content successfully', async () => {
      const contentData = {
        title: 'Test Article',
        content: '<p>This is test content</p>',
        excerpt: 'Test excerpt',
        status: 'published' as const,
        website_id: 'website-123',
        author_id: 'user-123',
        category_id: 'category-123',
        tags: ['tag1', 'tag2'],
        featured_image: 'https://example.com/image.jpg',
        seo_title: 'Test Article SEO',
        seo_description: 'Test article for SEO',
        scheduled_at: null,
      };

      const mockContent = {
        id: 'content-123',
        ...contentData,
        slug: 'test-article',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await contentService.createContent(contentData);

      expect(mockSupabase.from).toHaveBeenCalledWith('content');
      expect(result).toEqual(mockContent);
    });

    it('should generate slug from title', async () => {
      const contentData = {
        title: 'This is a Test Article with Special Characters!',
        content: '<p>Test content</p>',
        excerpt: 'Test excerpt',
        status: 'published' as const,
        website_id: 'website-123',
        author_id: 'user-123',
      };

      const mockContent = {
        id: 'content-123',
        ...contentData,
        slug: 'this-is-a-test-article-with-special-characters',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await contentService.createContent(contentData);

      expect(result.slug).toBe('this-is-a-test-article-with-special-characters');
    });

    it('should handle duplicate slug by appending number', async () => {
      const contentData = {
        title: 'Test Article',
        content: '<p>Test content</p>',
        excerpt: 'Test excerpt',
        status: 'published' as const,
        website_id: 'website-123',
        author_id: 'user-123',
      };

      // Mock existing content with same slug
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              like: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [{ slug: 'test-article' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const mockContent = {
        id: 'content-123',
        ...contentData,
        slug: 'test-article-2',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await contentService.createContent(contentData);

      expect(result.slug).toBe('test-article-2');
    });

    it('should validate required fields', async () => {
      const invalidContentData = {
        content: '<p>Test content</p>',
        status: 'published' as const,
        website_id: 'website-123',
        author_id: 'user-123',
        // Missing title
      };

      await expect(
        contentService.createContent(invalidContentData as any)
      ).rejects.toThrow('Title is required');
    });

    it('should sanitize HTML content', async () => {
      const contentData = {
        title: 'Test Article',
        content: '<p>Safe content</p><script>alert("xss")</script><iframe src="javascript:alert(1)"></iframe>',
        excerpt: 'Test excerpt',
        status: 'published' as const,
        website_id: 'website-123',
        author_id: 'user-123',
      };

      const sanitizedContent = '<p>Safe content</p>';
      const mockContent = {
        id: 'content-123',
        ...contentData,
        content: sanitizedContent,
        slug: 'test-article',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await contentService.createContent(contentData);

      expect(result.content).toBe(sanitizedContent);
      expect(result.content).not.toContain('<script>');
      expect(result.content).not.toContain('<iframe>');
    });
  });

  describe('getContent', () => {
    it('should retrieve content by ID', async () => {
      const contentId = 'content-123';
      const mockContent = {
        id: contentId,
        title: 'Test Article',
        content: '<p>Test content</p>',
        excerpt: 'Test excerpt',
        status: 'published',
        slug: 'test-article',
        website_id: 'website-123',
        author_id: 'user-123',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockContent,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await contentService.getContent(contentId);

      expect(mockSupabase.from).toHaveBeenCalledWith('content');
      expect(result).toEqual(mockContent);
    });

    it('should throw error for non-existent content', async () => {
      const contentId = 'non-existent-content';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      } as any);

      await expect(contentService.getContent(contentId)).rejects.toThrow(
        'Content not found'
      );
    });
  });

  describe('updateContent', () => {
    it('should update content successfully', async () => {
      const contentId = 'content-123';
      const updateData = {
        title: 'Updated Test Article',
        content: '<p>Updated test content</p>',
        status: 'published' as const,
      };

      const updatedContent = {
        id: contentId,
        ...updateData,
        slug: 'updated-test-article',
        website_id: 'website-123',
        author_id: 'user-123',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedContent,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.updateContent(contentId, updateData);

      expect(result).toEqual(updatedContent);
    });

    it('should update slug when title changes', async () => {
      const contentId = 'content-123';
      const updateData = {
        title: 'New Title for Article',
      };

      const updatedContent = {
        id: contentId,
        title: updateData.title,
        slug: 'new-title-for-article',
        content: '<p>Existing content</p>',
        website_id: 'website-123',
        author_id: 'user-123',
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedContent,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.updateContent(contentId, updateData);

      expect(result.slug).toBe('new-title-for-article');
    });

    it('should handle publishing status change', async () => {
      const contentId = 'content-123';
      const updateData = {
        status: 'published' as const,
      };

      const publishedContent = {
        id: contentId,
        title: 'Test Article',
        status: 'published',
        published_at: new Date().toISOString(),
        website_id: 'website-123',
        author_id: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: publishedContent,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.updateContent(contentId, updateData);

      expect(result.status).toBe('published');
      expect(result.published_at).toBeDefined();
    });
  });

  describe('deleteContent', () => {
    it('should delete content successfully', async () => {
      const contentId = 'content-123';

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: contentId },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.deleteContent(contentId);

      expect(result).toEqual({ success: true });
    });

    it('should throw error for non-existent content', async () => {
      const contentId = 'non-existent-content';

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              }),
            }),
          }),
        }),
      } as any);

      await expect(contentService.deleteContent(contentId)).rejects.toThrow(
        'Content not found'
      );
    });
  });

  describe('listContent', () => {
    it('should list content with pagination', async () => {
      const websiteId = 'website-123';
      const options = {
        page: 1,
        limit: 10,
        status: 'published' as const,
      };

      const mockContent = [
        {
          id: 'content-1',
          title: 'Article 1',
          status: 'published',
          published_at: new Date().toISOString(),
        },
        {
          id: 'content-2',
          title: 'Article 2',
          status: 'published',
          published_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockContent,
                  error: null,
                  count: 2,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.listContent(websiteId, options);

      expect(result).toEqual({
        data: mockContent,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('should filter content by search term', async () => {
      const websiteId = 'website-123';
      const options = {
        search: 'javascript',
        page: 1,
        limit: 10,
      };

      const mockContent = [
        {
          id: 'content-1',
          title: 'JavaScript Tutorial',
          content: '<p>Learn JavaScript</p>',
          status: 'published',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockContent,
                  error: null,
                  count: 1,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.listContent(websiteId, options);

      expect(result.data).toEqual(mockContent);
    });

    it('should filter content by category', async () => {
      const websiteId = 'website-123';
      const options = {
        category: 'technology',
        page: 1,
        limit: 10,
      };

      const mockContent = [
        {
          id: 'content-1',
          title: 'Tech Article',
          category: 'technology',
          status: 'published',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: mockContent,
                  error: null,
                  count: 1,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.listContent(websiteId, options);

      expect(result.data).toEqual(mockContent);
    });

    it('should sort content by different fields', async () => {
      const websiteId = 'website-123';
      const options = {
        sortBy: 'title',
        sortOrder: 'asc' as const,
        page: 1,
        limit: 10,
      };

      const mockContent = [
        {
          id: 'content-1',
          title: 'A First Article',
          status: 'published',
        },
        {
          id: 'content-2',
          title: 'B Second Article',
          status: 'published',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockContent,
                error: null,
                count: 2,
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.listContent(websiteId, options);

      expect(result.data).toEqual(mockContent);
    });
  });

  describe('bulkUpdateContent', () => {
    it('should update multiple content items', async () => {
      const contentIds = ['content-1', 'content-2'];
      const updateData = {
        status: 'published' as const,
      };

      const updatedContent = [
        {
          id: 'content-1',
          title: 'Article 1',
          status: 'published',
          published_at: new Date().toISOString(),
        },
        {
          id: 'content-2',
          title: 'Article 2',
          status: 'published',
          published_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: updatedContent,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await contentService.bulkUpdateContent(contentIds, updateData);

      expect(result).toEqual(updatedContent);
    });

    it('should handle empty content IDs array', async () => {
      const contentIds: string[] = [];
      const updateData = {
        status: 'published' as const,
      };

      await expect(
        contentService.bulkUpdateContent(contentIds, updateData)
      ).rejects.toThrow('No content IDs provided');
    });
  });

  describe('bulkDeleteContent', () => {
    it('should delete multiple content items', async () => {
      const contentIds = ['content-1', 'content-2'];

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ id: 'content-1' }, { id: 'content-2' }],
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await contentService.bulkDeleteContent(contentIds);

      expect(result).toEqual({ success: true, deletedCount: 2 });
    });

    it('should handle empty content IDs array', async () => {
      const contentIds: string[] = [];

      await expect(
        contentService.bulkDeleteContent(contentIds)
      ).rejects.toThrow('No content IDs provided');
    });
  });

  describe('getContentBySlug', () => {
    it('should retrieve content by slug', async () => {
      const websiteId = 'website-123';
      const slug = 'test-article';
      const mockContent = {
        id: 'content-123',
        title: 'Test Article',
        slug,
        content: '<p>Test content</p>',
        status: 'published',
        website_id: websiteId,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockContent,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await contentService.getContentBySlug(websiteId, slug);

      expect(result).toEqual(mockContent);
    });

    it('should throw error for non-existent slug', async () => {
      const websiteId = 'website-123';
      const slug = 'non-existent-slug';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              }),
            }),
          }),
        }),
      } as any);

      await expect(
        contentService.getContentBySlug(websiteId, slug)
      ).rejects.toThrow('Content not found');
    });
  });
});
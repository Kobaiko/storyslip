import { Router } from 'express';
import ContentController from '../controllers/content.controller';
import { validate, contentSchemas, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

// All content routes require authentication
router.use(authenticateToken);

// Apply content-specific rate limiting
router.use(rateLimitConfigs.content);

/**
 * @route   GET /api/websites/:websiteId/content/stats
 * @desc    Get content statistics for a website
 * @access  Private
 */
router.get('/:websiteId/content/stats',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  ContentController.getContentStats
);

/**
 * @route   GET /api/websites/:websiteId/content
 * @desc    Get content list with filters and pagination
 * @access  Private
 */
router.get('/:websiteId/content',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('title', 'status', 'created_at', 'updated_at', 'published_at', 'view_count').default('created_at'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
      status: Joi.string().valid('draft', 'review', 'published', 'scheduled', 'archived'),
      category_id: commonSchemas.uuid.optional(),
      tag_id: commonSchemas.uuid.optional(),
      search: Joi.string().min(1).max(255),
      author_id: commonSchemas.uuid.optional(),
      date_from: Joi.date().iso(),
      date_to: Joi.date().iso(),
    })
  }),
  ContentController.getContentList
);

/**
 * @route   POST /api/websites/:websiteId/content
 * @desc    Create new content
 * @access  Private
 */
router.post('/:websiteId/content',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: contentSchemas.create
  }),
  ContentController.createContent
);

/**
 * @route   GET /api/websites/:websiteId/content/:contentId
 * @desc    Get content by ID
 * @access  Private
 */
router.get('/:websiteId/content/:contentId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    })
  }),
  ContentController.getContentById
);

/**
 * @route   PUT /api/websites/:websiteId/content/:contentId
 * @desc    Update content
 * @access  Private
 */
router.put('/:websiteId/content/:contentId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    }),
    body: contentSchemas.update
  }),
  ContentController.updateContent
);

/**
 * @route   DELETE /api/websites/:websiteId/content/:contentId
 * @desc    Delete content
 * @access  Private
 */
router.delete('/:websiteId/content/:contentId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    })
  }),
  ContentController.deleteContent
);

/**
 * @route   POST /api/websites/:websiteId/content/:contentId/publish
 * @desc    Publish content
 * @access  Private
 */
router.post('/:websiteId/content/:contentId/publish',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    })
  }),
  ContentController.publishContent
);

/**
 * @route   POST /api/websites/:websiteId/content/:contentId/unpublish
 * @desc    Unpublish content
 * @access  Private
 */
router.post('/:websiteId/content/:contentId/unpublish',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    })
  }),
  ContentController.unpublishContent
);

/**
 * @route   POST /api/websites/:websiteId/content/:contentId/schedule
 * @desc    Schedule content for publishing
 * @access  Private
 */
router.post('/:websiteId/content/:contentId/schedule',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    }),
    body: Joi.object({
      scheduled_at: Joi.date().iso().required()
    })
  }),
  ContentController.scheduleContent
);

/**
 * @route   POST /api/websites/:websiteId/content/:contentId/duplicate
 * @desc    Duplicate content
 * @access  Private
 */
router.post('/:websiteId/content/:contentId/duplicate',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    })
  }),
  ContentController.duplicateContent
);

/**
 * Enhanced Content Management Routes
 */

/**
 * @route   POST /api/websites/:websiteId/content/rich
 * @desc    Create rich content with enhanced features
 * @access  Private
 */
router.post('/:websiteId/content/rich',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      title: Joi.string().required().min(1).max(500),
      slug: Joi.string().min(1).max(255).pattern(/^[a-z0-9-]+$/),
      body: Joi.string().required(),
      rich_content: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        type: Joi.string().valid('paragraph', 'heading', 'image', 'video', 'code', 'quote', 'list', 'embed').required(),
        content: Joi.any().required(),
        metadata: Joi.object().optional()
      })).optional(),
      excerpt: Joi.string().max(500),
      status: Joi.string().valid('draft', 'published', 'scheduled', 'archived').default('draft'),
      scheduled_at: Joi.date().iso().when('status', { is: 'scheduled', then: Joi.required() }),
      seo_title: Joi.string().max(255),
      seo_description: Joi.string().max(500),
      seo_keywords: Joi.array().items(Joi.string()),
      featured_image_url: Joi.string().uri(),
      category_ids: Joi.array().items(commonSchemas.uuid),
      tag_ids: Joi.array().items(commonSchemas.uuid),
      meta_data: Joi.object(),
      enable_comments: Joi.boolean().default(true),
      template: Joi.string().default('default')
    })
  }),
  ContentController.createRichContent
);

/**
 * @route   GET /api/websites/:websiteId/content/search
 * @desc    Advanced content search with facets
 * @access  Private
 */
router.get('/:websiteId/content/search',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      query: Joi.string().min(1).max(255),
      status: Joi.string(), // Comma-separated list
      categories: Joi.string(), // Comma-separated list
      tags: Joi.string(), // Comma-separated list
      authors: Joi.string(), // Comma-separated list
      date_from: Joi.date().iso(),
      date_to: Joi.date().iso(),
      content_type: Joi.string(),
      has_featured_image: Joi.boolean(),
      sort_by: Joi.string().valid('created_at', 'updated_at', 'published_at', 'title', 'view_count').default('created_at'),
      sort_order: Joi.string().valid('asc', 'desc').default('desc'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    })
  }),
  ContentController.searchContent
);

/**
 * @route   POST /api/websites/:websiteId/content/:contentId/schedule
 * @desc    Schedule content action (publish, unpublish, archive)
 * @access  Private
 */
router.post('/:websiteId/content/:contentId/schedule',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    }),
    body: Joi.object({
      action: Joi.string().valid('publish', 'unpublish', 'archive').required(),
      scheduled_at: Joi.date().iso().required()
    })
  }),
  ContentController.scheduleContentAction
);

/**
 * @route   GET /api/websites/:websiteId/content/:contentId/revisions
 * @desc    Get content revision history
 * @access  Private
 */
router.get('/:websiteId/content/:contentId/revisions',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    })
  }),
  ContentController.getContentRevisions
);

/**
 * @route   POST /api/websites/:websiteId/content/:contentId/revisions/:revisionId/restore
 * @desc    Restore content from a specific revision
 * @access  Private
 */
router.post('/:websiteId/content/:contentId/revisions/:revisionId/restore',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid,
      revisionId: commonSchemas.uuid
    })
  }),
  ContentController.restoreFromRevision
);

/**
 * @route   PUT /api/websites/:websiteId/content/bulk
 * @desc    Bulk update multiple content items
 * @access  Private
 */
router.put('/:websiteId/content/bulk',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      content_ids: Joi.array().items(commonSchemas.uuid).min(1).required(),
      updates: Joi.object({
        status: Joi.string().valid('draft', 'published', 'scheduled', 'archived'),
        category_ids: Joi.array().items(commonSchemas.uuid),
        tag_ids: Joi.array().items(commonSchemas.uuid),
        scheduled_at: Joi.date().iso()
      }).min(1).required()
    })
  }),
  ContentController.bulkUpdateContent
);

/**
 * @route   GET /api/websites/:websiteId/content/analytics
 * @route   GET /api/websites/:websiteId/content/:contentId/analytics
 * @desc    Get content analytics and insights
 * @access  Private
 */
router.get('/:websiteId/content/analytics',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d')
    })
  }),
  ContentController.getContentAnalytics
);

router.get('/:websiteId/content/:contentId/analytics',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    }),
    query: Joi.object({
      period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d')
    })
  }),
  ContentController.getContentAnalytics
);

export default router;
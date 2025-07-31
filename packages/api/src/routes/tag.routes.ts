import { Router } from 'express';
import TagController from '../controllers/tag.controller';
import { validate, tagSchemas, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

// All tag routes require authentication
router.use(authenticateToken);

// Apply content-specific rate limiting
router.use(rateLimitConfigs.content);

/**
 * @route   GET /api/websites/:websiteId/tags/popular
 * @desc    Get popular tags by usage count
 * @access  Private
 */
router.get('/:websiteId/tags/popular',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10)
    })
  }),
  TagController.getPopularTags
);

/**
 * @route   GET /api/websites/:websiteId/tags/cloud
 * @desc    Get tag cloud data
 * @access  Private
 */
router.get('/:websiteId/tags/cloud',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  TagController.getTagCloud
);

/**
 * @route   POST /api/websites/:websiteId/tags/find-or-create
 * @desc    Find or create tags by names
 * @access  Private
 */
router.post('/:websiteId/tags/find-or-create',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      names: Joi.array().items(Joi.string().min(1).max(255)).min(1).max(20).required()
    })
  }),
  TagController.findOrCreateTags
);

/**
 * @route   GET /api/websites/:websiteId/tags
 * @desc    Get tags list
 * @access  Private
 */
router.get('/:websiteId/tags',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      search: Joi.string().min(1).max(255),
      limit: Joi.number().integer().min(1).max(100)
    })
  }),
  TagController.getTags
);

/**
 * @route   POST /api/websites/:websiteId/tags
 * @desc    Create new tag
 * @access  Private
 */
router.post('/:websiteId/tags',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: tagSchemas.create
  }),
  TagController.createTag
);

/**
 * @route   GET /api/websites/:websiteId/tags/:tagId
 * @desc    Get tag by ID
 * @access  Private
 */
router.get('/:websiteId/tags/:tagId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      tagId: commonSchemas.uuid
    })
  }),
  TagController.getTagById
);

/**
 * @route   PUT /api/websites/:websiteId/tags/:tagId
 * @desc    Update tag
 * @access  Private
 */
router.put('/:websiteId/tags/:tagId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      tagId: commonSchemas.uuid
    }),
    body: tagSchemas.update
  }),
  TagController.updateTag
);

/**
 * @route   DELETE /api/websites/:websiteId/tags/:tagId
 * @desc    Delete tag
 * @access  Private
 */
router.delete('/:websiteId/tags/:tagId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      tagId: commonSchemas.uuid
    })
  }),
  TagController.deleteTag
);

export default router;
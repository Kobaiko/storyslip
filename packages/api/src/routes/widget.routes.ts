import { Router } from 'express';
import WidgetController from '../controllers/widget.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

// Apply widget-specific rate limiting to all routes
router.use(rateLimitConfigs.widget);

/**
 * @route   GET /api/widget/health
 * @desc    Widget API health check
 * @access  Public
 */
router.get('/widget/health',
  WidgetController.healthCheck
);

/**
 * @route   GET /api/widget/config
 * @desc    Get widget configuration
 * @access  Public (requires API key)
 */
router.get('/widget/config',
  validate({
    query: Joi.object({
      api_key: Joi.string().required()
    })
  }),
  WidgetController.getConfig
);

/**
 * @route   GET /api/widget/content
 * @desc    Get content for widget
 * @access  Public (requires API key)
 */
router.get('/widget/content',
  validate({
    query: Joi.object({
      api_key: Joi.string().required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      category_id: commonSchemas.uuid.optional(),
      tag_id: commonSchemas.uuid.optional()
    })
  }),
  WidgetController.getContent
);

/**
 * @route   GET /api/widget/content/:contentId
 * @desc    Get single content item for widget
 * @access  Public (requires API key)
 */
router.get('/widget/content/:contentId',
  validate({
    params: Joi.object({
      contentId: commonSchemas.uuid
    }),
    query: Joi.object({
      api_key: Joi.string().required()
    })
  }),
  WidgetController.getContentItem
);

/**
 * @route   GET /api/widget/categories
 * @desc    Get categories for widget
 * @access  Public (requires API key)
 */
router.get('/widget/categories',
  validate({
    query: Joi.object({
      api_key: Joi.string().required()
    })
  }),
  WidgetController.getCategories
);

/**
 * @route   GET /api/widget/tags
 * @desc    Get tags for widget
 * @access  Public (requires API key)
 */
router.get('/widget/tags',
  validate({
    query: Joi.object({
      api_key: Joi.string().required()
    })
  }),
  WidgetController.getTags
);

/**
 * @route   GET /api/widget/search
 * @desc    Search content for widget
 * @access  Public (requires API key)
 */
router.get('/widget/search',
  validate({
    query: Joi.object({
      api_key: Joi.string().required(),
      q: Joi.string().min(1).max(255).required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10)
    })
  }),
  WidgetController.searchContent
);

export default router;
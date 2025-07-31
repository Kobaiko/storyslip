import { Router } from 'express';
import AnalyticsController from '../controllers/analytics.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

/**
 * @route   POST /api/analytics/track
 * @desc    Track analytics event (public endpoint for widget)
 * @access  Public
 */
router.post('/analytics/track',
  rateLimitConfigs.widget, // Use widget rate limiting for tracking
  validate({
    body: Joi.object({
      website_id: commonSchemas.uuid.required(),
      content_id: commonSchemas.uuid.optional(),
      event_type: Joi.string().valid('page_view', 'content_view', 'click', 'engagement', 'conversion').required(),
      user_id: Joi.string().optional(),
      session_id: Joi.string().required(),
      page_url: Joi.string().uri().optional(),
      referrer: Joi.string().uri().optional(),
      metadata: Joi.object().optional()
    })
  }),
  AnalyticsController.trackEvent
);

// All routes below require authentication
router.use(authenticateToken);
router.use(rateLimitConfigs.general);

/**
 * @route   GET /api/websites/:websiteId/analytics/summary
 * @desc    Get analytics summary for dashboard
 * @access  Private
 */
router.get('/:websiteId/analytics/summary',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  AnalyticsController.getAnalyticsSummary
);

/**
 * @route   GET /api/websites/:websiteId/analytics/realtime
 * @desc    Get real-time analytics
 * @access  Private
 */
router.get('/:websiteId/analytics/realtime',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  AnalyticsController.getRealTimeAnalytics
);

/**
 * @route   GET /api/websites/:websiteId/analytics/report
 * @desc    Get analytics report for a website
 * @access  Private
 */
router.get('/:websiteId/analytics/report',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().optional(),
      event_type: Joi.string().valid('page_view', 'content_view', 'click', 'engagement', 'conversion').optional(),
      content_id: commonSchemas.uuid.optional(),
      user_id: Joi.string().optional()
    })
  }),
  AnalyticsController.getAnalyticsReport
);

/**
 * @route   GET /api/websites/:websiteId/analytics/content
 * @desc    Get content performance analytics
 * @access  Private
 */
router.get('/:websiteId/analytics/content',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      content_id: commonSchemas.uuid.optional(),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().optional()
    })
  }),
  AnalyticsController.getContentAnalytics
);

/**
 * @route   GET /api/websites/:websiteId/analytics/behavior
 * @desc    Get user behavior analytics
 * @access  Private
 */
router.get('/:websiteId/analytics/behavior',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().optional()
    })
  }),
  AnalyticsController.getUserBehaviorAnalytics
);

/**
 * @route   GET /api/websites/:websiteId/analytics/content/:contentId
 * @desc    Get analytics for specific content
 * @access  Private
 */
router.get('/:websiteId/analytics/content/:contentId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    }),
    query: Joi.object({
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().optional()
    })
  }),
  AnalyticsController.getContentSpecificAnalytics
);

/**
 * @route   GET /api/websites/:websiteId/analytics/export
 * @desc    Export analytics data
 * @access  Private
 */
router.get('/:websiteId/analytics/export',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      format: Joi.string().valid('json', 'csv').default('json'),
      date_from: Joi.date().iso().optional(),
      date_to: Joi.date().iso().optional()
    })
  }),
  AnalyticsController.exportAnalytics
);

export default router;
import { Router } from 'express';
import WidgetDeliveryController from '../controllers/widget-delivery.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

/**
 * Public widget delivery routes (no authentication required)
 */

/**
 * @route   GET /api/widgets/:widgetId/render-optimized
 * @desc    Render widget with advanced optimization
 * @access  Public
 */
router.get('/widgets/:widgetId/render-optimized',
  rateLimitConfigs.widget,
  validate({
    params: Joi.object({
      widgetId: commonSchemas.uuid
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).max(100).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      search: Joi.string().max(100).allow(''),
      category: commonSchemas.uuid.allow(''),
      tag: commonSchemas.uuid.allow(''),
      sort: Joi.string().valid(
        'created_at_asc', 'created_at_desc',
        'published_at_asc', 'published_at_desc',
        'title_asc', 'title_desc',
        'view_count_asc', 'view_count_desc'
      ).default('created_at_desc'),
      format: Joi.string().valid('json', 'html', 'css', 'amp').default('json'),
      optimize: Joi.string().valid('true', 'false').default('true'),
      viewport: Joi.string().valid('mobile', 'tablet', 'desktop').default('desktop'),
    })
  }),
  WidgetDeliveryController.renderOptimizedWidget
);

/**
 * @route   GET /api/widgets/:widgetId/performance
 * @desc    Get widget performance metrics
 * @access  Public
 */
router.get('/widgets/:widgetId/performance',
  rateLimitConfigs.general,
  validate({
    params: Joi.object({
      widgetId: commonSchemas.uuid
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(90).default(7),
    })
  }),
  WidgetDeliveryController.getPerformanceMetrics
);

/**
 * @route   POST /api/widgets/:widgetId/prefetch
 * @desc    Prefetch widget content for faster loading
 * @access  Public
 */
router.post('/widgets/:widgetId/prefetch',
  rateLimitConfigs.general,
  validate({
    params: Joi.object({
      widgetId: commonSchemas.uuid
    }),
    query: Joi.object({
      pages: Joi.string().pattern(/^[\d,\s]+$/).default('1,2,3'),
    })
  }),
  WidgetDeliveryController.prefetchContent
);

/**
 * @route   POST /api/widgets/:widgetId/invalidate-cache
 * @desc    Invalidate widget cache
 * @access  Public (rate limited)
 */
router.post('/widgets/:widgetId/invalidate-cache',
  rateLimitConfigs.auth, // Use stricter rate limiting
  validate({
    params: Joi.object({
      widgetId: commonSchemas.uuid
    }),
    body: Joi.object({
      type: Joi.string().valid('all', 'content', 'css', 'cdn').default('all'),
    })
  }),
  WidgetDeliveryController.invalidateCache
);

/**
 * @route   GET /api/widgets/health
 * @desc    Health check for widget delivery system
 * @access  Public
 */
router.get('/widgets/health',
  WidgetDeliveryController.healthCheck
);

/**
 * Enhanced Performance Monitoring Routes
 */

/**
 * @route   GET /api/widgets/:widgetId/realtime-metrics
 * @desc    Get real-time widget performance metrics
 * @access  Public
 */
router.get('/widgets/:widgetId/realtime-metrics',
  rateLimitConfigs.general,
  validate({
    params: Joi.object({
      widgetId: commonSchemas.uuid
    })
  }),
  WidgetDeliveryController.getRealTimeMetrics
);

/**
 * @route   GET /api/widgets/system-overview
 * @desc    Get system-wide performance overview
 * @access  Public
 */
router.get('/widgets/system-overview',
  rateLimitConfigs.general,
  WidgetDeliveryController.getSystemPerformanceOverview
);

/**
 * @route   POST /api/widgets/:widgetId/alerts
 * @desc    Setup performance alerts for a widget
 * @access  Public (rate limited)
 */
router.post('/widgets/:widgetId/alerts',
  rateLimitConfigs.auth,
  validate({
    params: Joi.object({
      widgetId: commonSchemas.uuid
    }),
    body: Joi.object({
      maxRenderTime: Joi.number().integer().min(100).max(10000).optional(),
      minCacheHitRate: Joi.number().min(0).max(1).optional(),
      maxErrorRate: Joi.number().min(0).max(1).optional(),
    })
  }),
  WidgetDeliveryController.setupPerformanceAlerts
);

/**
 * @route   POST /api/widgets/:widgetId/track
 * @desc    Track widget usage event
 * @access  Public
 */
router.post('/widgets/:widgetId/track',
  rateLimitConfigs.widget,
  validate({
    params: Joi.object({
      widgetId: commonSchemas.uuid
    }),
    body: Joi.object({
      eventType: Joi.string().valid('view', 'click', 'interaction', 'error').required(),
      eventData: Joi.object().default({}),
      userSessionId: Joi.string().max(255).optional(),
      pageUrl: Joi.string().uri().optional(),
      viewportWidth: Joi.number().integer().min(0).optional(),
      viewportHeight: Joi.number().integer().min(0).optional(),
    })
  }),
  WidgetDeliveryController.trackUsageEvent
);

/**
 * Legacy compatibility routes
 */

/**
 * @route   GET /api/widget/:widgetId
 * @desc    Legacy widget render endpoint (redirects to optimized)
 * @access  Public
 */
router.get('/widget/:widgetId',
  rateLimitConfigs.widget,
  validate({
    params: Joi.object({
      widgetId: commonSchemas.uuid
    })
  }),
  (req, res) => {
    const { widgetId } = req.params;
    const queryString = new URLSearchParams(req.query as any).toString();
    const redirectUrl = `/api/widgets/${widgetId}/render-optimized${queryString ? `?${queryString}` : ''}`;
    
    res.redirect(301, redirectUrl);
  }
);

/**
 * CORS preflight handler for widget endpoints
 */
router.options('/widgets/:widgetId/*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  });
  res.status(204).send();
});

export default router;
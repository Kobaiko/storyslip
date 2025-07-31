import { Router } from 'express';
import { EnhancedWidgetController } from '../controllers/enhanced-widget.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createWidgetSchema = z.object({
  body: z.object({
    widget_name: z.string().min(1).max(255),
    widget_type: z.enum(['content_list', 'single_content', 'category_feed', 'search', 'newsletter']),
    title: z.string().max(255).optional(),
    description: z.string().optional(),
    items_per_page: z.number().min(1).max(100).optional(),
    show_images: z.boolean().optional(),
    show_excerpts: z.boolean().optional(),
    show_dates: z.boolean().optional(),
    show_authors: z.boolean().optional(),
    show_categories: z.boolean().optional(),
    show_tags: z.boolean().optional(),
    content_filters: z.record(z.any()).optional(),
    sort_order: z.string().optional(),
    theme: z.string().optional(),
    custom_css: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    border_radius: z.string().optional(),
    padding: z.string().optional(),
    auto_refresh: z.boolean().optional(),
    refresh_interval: z.number().min(30).optional(),
    enable_search: z.boolean().optional(),
    enable_pagination: z.boolean().optional(),
    enable_infinite_scroll: z.boolean().optional(),
    open_links_in_new_tab: z.boolean().optional(),
    enable_seo: z.boolean().optional(),
    meta_title: z.string().max(255).optional(),
    meta_description: z.string().optional(),
    track_clicks: z.boolean().optional(),
    track_views: z.boolean().optional(),
    custom_events: z.array(z.any()).optional(),
    is_public: z.boolean().optional(),
    allowed_domains: z.array(z.string()).optional(),
    require_authentication: z.boolean().optional(),
  }),
});

const updateWidgetSchema = z.object({
  body: z.object({
    widget_name: z.string().min(1).max(255).optional(),
    widget_type: z.enum(['content_list', 'single_content', 'category_feed', 'search', 'newsletter']).optional(),
    title: z.string().max(255).optional(),
    description: z.string().optional(),
    items_per_page: z.number().min(1).max(100).optional(),
    show_images: z.boolean().optional(),
    show_excerpts: z.boolean().optional(),
    show_dates: z.boolean().optional(),
    show_authors: z.boolean().optional(),
    show_categories: z.boolean().optional(),
    show_tags: z.boolean().optional(),
    content_filters: z.record(z.any()).optional(),
    sort_order: z.string().optional(),
    theme: z.string().optional(),
    custom_css: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    border_radius: z.string().optional(),
    padding: z.string().optional(),
    auto_refresh: z.boolean().optional(),
    refresh_interval: z.number().min(30).optional(),
    enable_search: z.boolean().optional(),
    enable_pagination: z.boolean().optional(),
    enable_infinite_scroll: z.boolean().optional(),
    open_links_in_new_tab: z.boolean().optional(),
    enable_seo: z.boolean().optional(),
    meta_title: z.string().max(255).optional(),
    meta_description: z.string().optional(),
    track_clicks: z.boolean().optional(),
    track_views: z.boolean().optional(),
    custom_events: z.array(z.any()).optional(),
    is_public: z.boolean().optional(),
    allowed_domains: z.array(z.string()).optional(),
    require_authentication: z.boolean().optional(),
  }),
});

const trackEventSchema = z.object({
  body: z.object({
    event_type: z.enum(['view', 'click', 'interaction']),
    event_data: z.record(z.any()).optional(),
    website_id: z.string().uuid(),
  }),
});

// Protected routes (require authentication)
router.post(
  '/websites/:websiteId/widgets',
  authenticateToken,
  rateLimiter.createWidget,
  validateRequest(createWidgetSchema),
  EnhancedWidgetController.createWidget
);

router.get(
  '/websites/:websiteId/widgets',
  authenticateToken,
  rateLimiter.getWidgets,
  EnhancedWidgetController.getWidgets
);

router.get(
  '/websites/:websiteId/widgets/:widgetId',
  authenticateToken,
  rateLimiter.getWidget,
  EnhancedWidgetController.getWidget
);

router.put(
  '/websites/:websiteId/widgets/:widgetId',
  authenticateToken,
  rateLimiter.updateWidget,
  validateRequest(updateWidgetSchema),
  EnhancedWidgetController.updateWidget
);

router.delete(
  '/websites/:websiteId/widgets/:widgetId',
  authenticateToken,
  rateLimiter.deleteWidget,
  EnhancedWidgetController.deleteWidget
);

router.get(
  '/websites/:websiteId/widgets/:widgetId/embed-code',
  authenticateToken,
  rateLimiter.generateEmbedCode,
  EnhancedWidgetController.generateEmbedCode
);

router.get(
  '/websites/:websiteId/widgets/:widgetId/analytics',
  authenticateToken,
  rateLimiter.getAnalytics,
  EnhancedWidgetController.getWidgetAnalytics
);

// Public routes (no authentication required)
router.get(
  '/widgets/:widgetId/render',
  rateLimiter.renderWidget,
  EnhancedWidgetController.renderWidget
);

router.get(
  '/widgets/:widgetId/preview',
  rateLimiter.previewWidget,
  EnhancedWidgetController.previewWidget
);

router.post(
  '/widgets/:widgetId/track',
  rateLimiter.trackEvent,
  validateRequest(trackEventSchema),
  EnhancedWidgetController.trackWidgetEvent
);

// Cache management endpoints
router.delete(
  '/websites/:websiteId/widgets/:widgetId/cache',
  authenticateToken,
  rateLimiter.general,
  EnhancedWidgetController.invalidateWidgetCache
);

router.get(
  '/websites/:websiteId/widgets/:widgetId/performance',
  authenticateToken,
  rateLimiter.getAnalytics,
  EnhancedWidgetController.getWidgetPerformance
);

export { router as enhancedWidgetRoutes };
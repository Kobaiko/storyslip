import { Router } from 'express';
import { WidgetConfigurationController } from '../controllers/widget-configuration.controller';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Validation schemas
const widgetSettingsSchema = z.object({
  posts_per_page: z.number().min(1).max(100).default(12),
  show_excerpts: z.boolean().default(true),
  excerpt_length: z.number().min(50).max(500).default(150),
  show_author: z.boolean().default(true),
  show_date: z.boolean().default(true),
  show_categories: z.boolean().default(true),
  show_tags: z.boolean().default(false),
  show_read_time: z.boolean().default(false),
  show_featured_image: z.boolean().default(true),
  enable_pagination: z.boolean().default(true),
  enable_infinite_scroll: z.boolean().default(false),
  enable_search: z.boolean().default(true),
  enable_filtering: z.boolean().default(true),
  enable_sorting: z.boolean().default(true),
  show_hero_section: z.boolean().default(false),
  hero_post_id: z.string().uuid().optional(),
  show_category_navigation: z.boolean().default(true),
  show_tag_cloud: z.boolean().default(false),
  show_archive_links: z.boolean().default(false),
  show_recent_posts: z.boolean().default(true),
  recent_posts_count: z.number().min(1).max(20).default(5),
  enable_comments: z.boolean().default(false),
  enable_social_sharing: z.boolean().default(true),
  enable_bookmarking: z.boolean().default(false),
  enable_print_view: z.boolean().default(false),
  group_by_category: z.boolean().default(false),
  sticky_featured_posts: z.boolean().default(false),
  show_post_count: z.boolean().default(false),
});

const widgetStylingSchema = z.object({
  container_width: z.string().default('1200px'),
  container_padding: z.string().default('1rem'),
  grid_columns: z.number().min(1).max(6).default(3),
  grid_gap: z.string().default('1.5rem'),
  font_family: z.string().default('system-ui, sans-serif'),
  heading_font_size: z.string().default('1.5rem'),
  body_font_size: z.string().default('1rem'),
  line_height: z.string().default('1.6'),
  primary_color: z.string().default('#3b82f6'),
  secondary_color: z.string().default('#64748b'),
  text_color: z.string().default('#1f2937'),
  background_color: z.string().default('#ffffff'),
  border_color: z.string().default('#e5e7eb'),
  hover_color: z.string().default('#2563eb'),
  card_background: z.string().default('#ffffff'),
  card_border_radius: z.string().default('8px'),
  card_shadow: z.string().default('0 1px 3px 0 rgba(0, 0, 0, 0.1)'),
  card_padding: z.string().default('1.5rem'),
  button_style: z.enum(['solid', 'outline', 'ghost']).default('solid'),
  button_color: z.string().default('#3b82f6'),
  button_hover_color: z.string().default('#2563eb'),
  custom_css: z.string().optional(),
});

const contentFiltersSchema = z.object({
  include_categories: z.array(z.string()).default([]),
  exclude_categories: z.array(z.string()).default([]),
  include_tags: z.array(z.string()).default([]),
  exclude_tags: z.array(z.string()).default([]),
  include_authors: z.array(z.string()).default([]),
  exclude_authors: z.array(z.string()).default([]),
  published_only: z.boolean().default(true),
  featured_only: z.boolean().default(false),
  date_range_start: z.string().optional(),
  date_range_end: z.string().optional(),
  content_types: z.array(z.string()).default(['post']),
  sort_by: z.enum(['date', 'title', 'author', 'category', 'views', 'custom']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

const seoSettingsSchema = z.object({
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  canonical_url: z.string().url().optional(),
  og_title: z.string().optional(),
  og_description: z.string().optional(),
  og_image: z.string().url().optional(),
  twitter_card: z.enum(['summary', 'summary_large_image']).default('summary'),
  structured_data_enabled: z.boolean().default(true),
  sitemap_included: z.boolean().default(true),
});

const performanceSettingsSchema = z.object({
  enable_caching: z.boolean().default(true),
  cache_duration: z.number().min(60).max(86400).default(300),
  enable_lazy_loading: z.boolean().default(true),
  image_optimization: z.boolean().default(true),
  enable_compression: z.boolean().default(true),
  preload_next_page: z.boolean().default(false),
  cdn_enabled: z.boolean().default(false),
});

const createWidgetSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['blog_hub', 'content_list', 'featured_posts', 'category_grid', 'search_widget']),
  layout: z.enum(['grid', 'list', 'masonry', 'carousel', 'magazine']),
  theme: z.enum(['modern', 'minimal', 'classic', 'magazine', 'dark', 'custom']),
  settings: widgetSettingsSchema,
  styling: widgetStylingSchema,
  content_filters: contentFiltersSchema,
  seo_settings: seoSettingsSchema,
  performance_settings: performanceSettingsSchema,
  is_active: z.boolean().default(true),
});

const updateWidgetSchema = createWidgetSchema.partial();

// Public routes (no authentication required)
/**
 * @swagger
 * /api/widgets/public/{widgetId}:
 *   get:
 *     summary: Get public widget configuration for rendering
 *     tags: [Widgets]
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget configuration retrieved successfully
 *       404:
 *         description: Widget not found
 */
router.get('/public/:widgetId', WidgetConfigurationController.getPublicWidget);

/**
 * @swagger
 * /api/widgets/templates:
 *   get:
 *     summary: Get available widget templates
 *     tags: [Widgets]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: premium_only
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/templates', WidgetConfigurationController.getTemplates);

// Protected routes (authentication required)
router.use(authMiddleware);

/**
 * @swagger
 * /api/widgets/websites/{websiteId}:
 *   get:
 *     summary: List widgets for a website
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Widgets retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 */
router.get(
  '/websites/:websiteId',
  validateRequest({ params: z.object({ websiteId: z.string().uuid() }) }),
  WidgetConfigurationController.listWidgets
);

/**
 * @swagger
 * /api/widgets/websites/{websiteId}:
 *   post:
 *     summary: Create a new widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [blog_hub, content_list, featured_posts, category_grid, search_widget]
 *               layout:
 *                 type: string
 *                 enum: [grid, list, masonry, carousel, magazine]
 *               theme:
 *                 type: string
 *                 enum: [modern, minimal, classic, magazine, dark, custom]
 *               settings:
 *                 type: object
 *               styling:
 *                 type: object
 *               content_filters:
 *                 type: object
 *               seo_settings:
 *                 type: object
 *               performance_settings:
 *                 type: object
 *             required:
 *               - name
 *               - type
 *               - layout
 *               - theme
 *     responses:
 *       201:
 *         description: Widget created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/websites/:websiteId',
  validateRequest({ 
    params: z.object({ websiteId: z.string().uuid() }),
    body: createWidgetSchema
  }),
  WidgetConfigurationController.createWidget
);

/**
 * @swagger
 * /api/widgets/websites/{websiteId}/templates/{templateId}:
 *   post:
 *     summary: Create widget from template
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               customizations:
 *                 type: object
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Widget created from template successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Template not found
 */
router.post(
  '/websites/:websiteId/templates/:templateId',
  validateRequest({ 
    params: z.object({ 
      websiteId: z.string().uuid(),
      templateId: z.string()
    }),
    body: z.object({
      name: z.string().min(1),
      customizations: z.object({}).optional()
    })
  }),
  WidgetConfigurationController.createFromTemplate
);

/**
 * @swagger
 * /api/widgets/{widgetId}:
 *   get:
 *     summary: Get widget configuration
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Widget not found
 */
router.get(
  '/:widgetId',
  validateRequest({ params: z.object({ widgetId: z.string() }) }),
  WidgetConfigurationController.getWidget
);

/**
 * @swagger
 * /api/widgets/{widgetId}:
 *   put:
 *     summary: Update widget configuration
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               settings:
 *                 type: object
 *               styling:
 *                 type: object
 *               content_filters:
 *                 type: object
 *               seo_settings:
 *                 type: object
 *               performance_settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Widget updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Widget not found
 */
router.put(
  '/:widgetId',
  validateRequest({ 
    params: z.object({ widgetId: z.string() }),
    body: updateWidgetSchema
  }),
  WidgetConfigurationController.updateWidget
);

/**
 * @swagger
 * /api/widgets/{widgetId}:
 *   delete:
 *     summary: Delete widget configuration
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Widget not found
 */
router.delete(
  '/:widgetId',
  validateRequest({ params: z.object({ widgetId: z.string() }) }),
  WidgetConfigurationController.deleteWidget
);

/**
 * @swagger
 * /api/widgets/{widgetId}/duplicate:
 *   post:
 *     summary: Duplicate widget
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Widget duplicated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Widget not found
 */
router.post(
  '/:widgetId/duplicate',
  validateRequest({ 
    params: z.object({ widgetId: z.string() }),
    body: z.object({ name: z.string().min(1) })
  }),
  WidgetConfigurationController.duplicateWidget
);

/**
 * @swagger
 * /api/widgets/{widgetId}/toggle-active:
 *   patch:
 *     summary: Toggle widget active status
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Widget status updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Widget not found
 */
router.patch(
  '/:widgetId/toggle-active',
  validateRequest({ params: z.object({ widgetId: z.string() }) }),
  WidgetConfigurationController.toggleActive
);

/**
 * @swagger
 * /api/widgets/{widgetId}/preview:
 *   get:
 *     summary: Generate widget preview
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Widget not found
 */
router.get(
  '/:widgetId/preview',
  validateRequest({ params: z.object({ widgetId: z.string() }) }),
  WidgetConfigurationController.generatePreview
);

/**
 * @swagger
 * /api/widgets/{widgetId}/embed:
 *   get:
 *     summary: Get widget embed code
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Embed code retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Widget not found
 */
router.get(
  '/:widgetId/embed',
  validateRequest({ params: z.object({ widgetId: z.string() }) }),
  WidgetConfigurationController.getEmbedCode
);

/**
 * @swagger
 * /api/widgets/{widgetId}/analytics:
 *   get:
 *     summary: Get widget analytics
 *     tags: [Widgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Widget not found
 */
router.get(
  '/:widgetId/analytics',
  validateRequest({ 
    params: z.object({ widgetId: z.string() }),
    query: z.object({
      start_date: z.string(),
      end_date: z.string()
    })
  }),
  WidgetConfigurationController.getAnalytics
);

export default router;
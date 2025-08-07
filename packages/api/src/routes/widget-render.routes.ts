import { Router } from 'express';
import { WidgetRenderController } from '../controllers/widget-render.controller';
import { rateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Apply rate limiting to prevent abuse
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many widget requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
}));

/**
 * @swagger
 * /api/widgets/public/{widgetId}/render:
 *   get:
 *     summary: Render widget for public consumption
 *     tags: [Widget Delivery]
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Widget ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Filter by author
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, html]
 *           default: json
 *         description: Response format
 *     responses:
 *       200:
 *         description: Widget rendered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     html:
 *                       type: string
 *                     css:
 *                       type: string
 *                     js:
 *                       type: string
 *                     metadata:
 *                       type: object
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Widget not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get(
  '/public/:widgetId/render',
  validateRequest({
    params: z.object({
      widgetId: z.string().min(1),
    }),
    query: z.object({
      page: z.string().transform(Number).optional(),
      search: z.string().optional(),
      category: z.string().optional(),
      tag: z.string().optional(),
      author: z.string().optional(),
      format: z.enum(['json', 'html']).default('json'),
    }),
  }),
  WidgetRenderController.renderWidget
);

/**
 * @swagger
 * /api/widgets/{widgetId}/analytics/track:
 *   post:
 *     summary: Track widget analytics
 *     tags: [Widget Delivery]
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
 *               widget_id:
 *                 type: string
 *               type:
 *                 type: string
 *               url:
 *                 type: string
 *               referrer:
 *                 type: string
 *               user_agent:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Analytics tracked successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Widget not found
 */
router.post(
  '/:widgetId/analytics/track',
  validateRequest({
    params: z.object({
      widgetId: z.string().min(1),
    }),
    body: z.object({
      widget_id: z.string(),
      type: z.string(),
      url: z.string().url(),
      referrer: z.string().optional(),
      user_agent: z.string().optional(),
      timestamp: z.string(),
    }),
  }),
  WidgetRenderController.trackAnalytics
);

/**
 * @swagger
 * /api/widgets/script.js:
 *   get:
 *     summary: Get widget delivery script
 *     tags: [Widget Delivery]
 *     parameters:
 *       - in: query
 *         name: v
 *         schema:
 *           type: string
 *         description: Cache busting version
 *     responses:
 *       200:
 *         description: Widget script delivered successfully
 *         content:
 *           application/javascript:
 *             schema:
 *               type: string
 *       304:
 *         description: Not modified (cached version is current)
 */
router.get(
  '/script.js',
  (req, res, next) => {
    // Set cache headers for widget script
    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800', // 1 day browser, 1 week CDN
      'ETag': `"widget-script-v1.0.0"`,
      'Vary': 'Accept-Encoding',
    });

    // Check if client has cached version
    const clientETag = req.headers['if-none-match'];
    if (clientETag === '"widget-script-v1.0.0"') {
      res.status(304).end();
      return;
    }

    next();
  },
  WidgetRenderController.getWidgetScript
);

/**
 * @swagger
 * /api/widgets/embed/{widgetId}:
 *   get:
 *     summary: Get widget embed code
 *     tags: [Widget Delivery]
 *     parameters:
 *       - in: path
 *         name: widgetId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [javascript, iframe, amp]
 *           default: javascript
 *         description: Embed code type
 *     responses:
 *       200:
 *         description: Embed code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     embed_code:
 *                       type: string
 *                     preview_url:
 *                       type: string
 *       404:
 *         description: Widget not found
 */
router.get(
  '/embed/:widgetId',
  validateRequest({
    params: z.object({
      widgetId: z.string().min(1),
    }),
    query: z.object({
      type: z.enum(['javascript', 'iframe', 'amp']).default('javascript'),
    }),
  }),
  WidgetRenderController.getEmbedCode
);

export default router;
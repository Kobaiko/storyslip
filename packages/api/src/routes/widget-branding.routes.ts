import { Router } from 'express';
import WidgetBrandingController from '../controllers/widget-branding.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

/**
 * Public widget branding routes (no authentication required)
 */

/**
 * @route   GET /api/brand/:websiteId/widget.css
 * @desc    Generate widget stylesheet
 * @access  Public
 */
router.get('/:websiteId/widget.css',
  rateLimitConfigs.widget,
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WidgetBrandingController.generateWidgetStylesheet
);

/**
 * Private widget branding routes (authentication required)
 */
router.use(authenticateToken);

/**
 * @route   GET /api/websites/:websiteId/widget-branding
 * @desc    Get widget branding configuration
 * @access  Private
 */
router.get('/:websiteId/widget-branding',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WidgetBrandingController.getWidgetBrandingConfig
);

/**
 * @route   PUT /api/websites/:websiteId/widget-branding
 * @desc    Update widget branding configuration
 * @access  Private (Manage settings permission required)
 */
router.put('/:websiteId/widget-branding',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto'),
      borderRadius: Joi.number().integer().min(0).max(50),
      shadowLevel: Joi.string().valid('none', 'sm', 'md', 'lg', 'xl'),
      animation: Joi.string().valid('none', 'fade', 'slide', 'scale'),
      position: Joi.string().valid('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'),
      showBranding: Joi.boolean(),
      customCSS: Joi.string().max(10000).allow(''),
      mobileOptimized: Joi.boolean(),
      rtlSupport: Joi.boolean(),
    })
  }),
  WidgetBrandingController.updateWidgetBrandingConfig
);

/**
 * @route   POST /api/websites/:websiteId/widget-branding/embed-code
 * @desc    Generate branded embed code
 * @access  Private
 */
router.post('/:websiteId/widget-branding/embed-code',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      containerId: Joi.string().max(100),
      displayMode: Joi.string().valid('inline', 'popup', 'sidebar').default('inline'),
      autoLoad: Joi.boolean().default(true),
      customConfig: Joi.object().default({}),
    })
  }),
  WidgetBrandingController.generateBrandedEmbedCode
);

/**
 * @route   POST /api/websites/:websiteId/widget-branding/preview
 * @desc    Preview widget branding changes
 * @access  Private
 */
router.post('/:websiteId/widget-branding/preview',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto'),
      borderRadius: Joi.number().integer().min(0).max(50),
      shadowLevel: Joi.string().valid('none', 'sm', 'md', 'lg', 'xl'),
      animation: Joi.string().valid('none', 'fade', 'slide', 'scale'),
      position: Joi.string().valid('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'),
      showBranding: Joi.boolean(),
      customCSS: Joi.string().max(10000),
      mobileOptimized: Joi.boolean(),
      rtlSupport: Joi.boolean(),
    })
  }),
  WidgetBrandingController.previewWidgetBranding
);

/**
 * @route   POST /api/websites/:websiteId/widget-branding/reset
 * @desc    Reset widget branding configuration to defaults
 * @access  Private (Manage settings permission required)
 */
router.post('/:websiteId/widget-branding/reset',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WidgetBrandingController.resetWidgetBranding
);

export default router;
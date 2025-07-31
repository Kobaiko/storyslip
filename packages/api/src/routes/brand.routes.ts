import { Router } from 'express';
import BrandController from '../controllers/brand.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import Joi from 'joi';

const router = Router();

/**
 * Public brand routes (no authentication required)
 */

/**
 * @route   GET /api/brand/:websiteId/css
 * @desc    Generate CSS for brand configuration
 * @access  Public
 */
router.get('/:websiteId/css',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  BrandController.generateBrandCSS
);

/**
 * Private brand routes (authentication required)
 */
router.use(authenticateToken);

/**
 * @route   GET /api/websites/:websiteId/brand
 * @desc    Get brand configuration for a website
 * @access  Private
 */
router.get('/:websiteId/brand',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  BrandController.getBrandConfiguration
);

/**
 * @route   PUT /api/websites/:websiteId/brand
 * @desc    Update brand configuration
 * @access  Private (Manage settings permission required)
 */
router.put('/:websiteId/brand',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      brand_name: Joi.string().max(255).allow(''),
      logo_url: Joi.string().uri().allow(''),
      favicon_url: Joi.string().uri().allow(''),
      primary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      secondary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      accent_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      background_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      text_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      font_family: Joi.string().max(100),
      heading_font_family: Joi.string().max(100).allow(''),
      custom_css: Joi.string().max(10000).allow(''),
      custom_domain: Joi.string().hostname().allow(''),
      email_from_name: Joi.string().max(255).allow(''),
      email_from_address: Joi.string().email().allow(''),
      email_header_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      email_footer_text: Joi.string().max(1000).allow(''),
      widget_theme: Joi.object(),
      white_label_enabled: Joi.boolean(),
      hide_storyslip_branding: Joi.boolean(),
    })
  }),
  BrandController.updateBrandConfiguration
);

/**
 * @route   POST /api/websites/:websiteId/brand/verify-domain
 * @desc    Verify custom domain
 * @access  Private (Manage settings permission required)
 */
router.post('/:websiteId/brand/verify-domain',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  BrandController.verifyCustomDomain
);

/**
 * @route   POST /api/websites/:websiteId/brand/preview
 * @desc    Preview brand configuration changes
 * @access  Private
 */
router.post('/:websiteId/brand/preview',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      brand_name: Joi.string().max(255),
      logo_url: Joi.string().uri(),
      favicon_url: Joi.string().uri(),
      primary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      secondary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      accent_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      background_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      text_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      font_family: Joi.string().max(100),
      heading_font_family: Joi.string().max(100),
      custom_css: Joi.string().max(10000),
      email_header_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      email_footer_text: Joi.string().max(1000),
      widget_theme: Joi.object(),
      white_label_enabled: Joi.boolean(),
      hide_storyslip_branding: Joi.boolean(),
    })
  }),
  BrandController.previewBrandConfiguration
);

/**
 * @route   POST /api/websites/:websiteId/brand/reset
 * @desc    Reset brand configuration to defaults
 * @access  Private (Manage settings permission required)
 */
router.post('/:websiteId/brand/reset',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  BrandController.resetBrandConfiguration
);

/**
 * Agency brand template routes
 */

/**
 * @route   GET /api/agency/brand-templates
 * @desc    Get agency brand templates
 * @access  Private
 */
router.get('/agency/brand-templates',
  BrandController.getAgencyBrandTemplates
);

/**
 * @route   POST /api/agency/brand-templates
 * @desc    Create agency brand template
 * @access  Private
 */
router.post('/agency/brand-templates',
  validate({
    body: Joi.object({
      template_name: Joi.string().max(255).required(),
      template_description: Joi.string().max(1000).allow(''),
      primary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
      secondary_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#1e40af'),
      accent_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#10b981'),
      background_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
      text_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#111827'),
      font_family: Joi.string().max(100).default('Inter, sans-serif'),
      heading_font_family: Joi.string().max(100).allow(''),
      custom_css: Joi.string().max(10000).allow(''),
      email_header_color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      email_footer_text: Joi.string().max(1000).allow(''),
      widget_theme: Joi.object().default({}),
      is_active: Joi.boolean().default(true),
    })
  }),
  BrandController.createAgencyBrandTemplate
);

/**
 * @route   POST /api/websites/:websiteId/brand/apply-template
 * @desc    Apply agency template to website
 * @access  Private (Manage settings permission required)
 */
router.post('/:websiteId/brand/apply-template',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      templateId: commonSchemas.uuid.required(),
    })
  }),
  BrandController.applyAgencyTemplate
);

/**
 * Enhanced Domain Verification Routes
 */

/**
 * @route   GET /api/websites/:websiteId/brand/domain-verification-records
 * @desc    Get DNS records needed for domain verification
 * @access  Private
 */
router.get('/:websiteId/brand/domain-verification-records',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  BrandController.getDomainVerificationRecords
);

/**
 * @route   GET /api/websites/:websiteId/brand/ssl-certificate
 * @desc    Get SSL certificate information for custom domain
 * @access  Private
 */
router.get('/:websiteId/brand/ssl-certificate',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  BrandController.getSSLCertificateInfo
);

/**
 * @route   GET /api/websites/:websiteId/brand/domain-summary
 * @desc    Get domain verification summary
 * @access  Private
 */
router.get('/:websiteId/brand/domain-summary',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  BrandController.getDomainVerificationSummary
);

/**
 * @route   POST /api/websites/:websiteId/brand/schedule-verification
 * @desc    Schedule domain re-verification
 * @access  Private (Manage settings permission required)
 */
router.post('/:websiteId/brand/schedule-verification',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      delay_minutes: Joi.number().integer().min(1).max(1440).default(5),
    })
  }),
  BrandController.scheduleDomainReVerification
);

/**
 * @route   POST /api/websites/:websiteId/brand/email-preview
 * @desc    Generate branded email template preview
 * @access  Private
 */
router.post('/:websiteId/brand/email-preview',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      template_type: Joi.string().valid('welcome', 'invitation', 'password_reset').default('welcome'),
      preview_data: Joi.object({
        subject: Joi.string().max(255),
        heading: Joi.string().max(255),
        body: Joi.string().max(5000),
        buttonText: Joi.string().max(100),
        buttonUrl: Joi.string().uri(),
      }).default({}),
    })
  }),
  BrandController.generateBrandedEmailPreview
);

export default router;
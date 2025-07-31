import { Router } from 'express';
import { WebsiteController } from '../controllers/website.controller';
import { validate, websiteSchemas, commonSchemas } from '../middleware/validation';
import { authenticateToken, requireRole } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

// All website routes require authentication
router.use(authenticateToken);

// Apply content-specific rate limiting for creation/modification
router.use(rateLimitConfigs.content);

/**
 * @route   GET /api/websites
 * @desc    Get all websites for the authenticated user
 * @access  Private
 */
router.get('/',
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('name', 'domain', 'created_at', 'updated_at', 'integration_status').default('created_at'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
      search: Joi.string().min(1).max(255),
    })
  }),
  WebsiteController.getWebsites
);

/**
 * @route   GET /api/websites/stats
 * @desc    Get website statistics for the authenticated user
 * @access  Private
 */
router.get('/stats',
  WebsiteController.getWebsiteStats
);

/**
 * @route   POST /api/websites
 * @desc    Create a new website
 * @access  Private
 */
router.post('/',
  validate({
    body: websiteSchemas.create
  }),
  WebsiteController.createWebsite
);

/**
 * @route   GET /api/websites/:websiteId
 * @desc    Get website by ID
 * @access  Private
 */
router.get('/:websiteId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WebsiteController.getWebsiteById
);

/**
 * @route   PUT /api/websites/:websiteId
 * @desc    Update website
 * @access  Private
 */
router.put('/:websiteId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: websiteSchemas.update
  }),
  WebsiteController.updateWebsite
);

/**
 * @route   DELETE /api/websites/:websiteId
 * @desc    Delete website
 * @access  Private
 */
router.delete('/:websiteId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WebsiteController.deleteWebsite
);

/**
 * @route   POST /api/websites/:websiteId/regenerate-key
 * @desc    Regenerate API key for website
 * @access  Private
 */
router.post('/:websiteId/regenerate-key',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WebsiteController.regenerateApiKey
);

/**
 * @route   POST /api/websites/:websiteId/test-integration
 * @desc    Test website integration
 * @access  Private
 */
router.post('/:websiteId/test-integration',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WebsiteController.testIntegration
);

/**
 * @route   POST /api/websites/:websiteId/validate-domain
 * @desc    Initiate domain ownership validation
 * @access  Private
 */
router.post('/:websiteId/validate-domain',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WebsiteController.validateDomainOwnership
);

/**
 * @route   POST /api/websites/:websiteId/verify-domain
 * @desc    Verify domain ownership
 * @access  Private
 */
router.post('/:websiteId/verify-domain',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  WebsiteController.verifyDomainOwnership
);

export default router;
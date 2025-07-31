import { Router } from 'express';
import SEOController from '../controllers/seo.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import Joi from 'joi';

const router = Router();

/**
 * Public SEO endpoints (no authentication required)
 */

/**
 * @route   GET /api/seo/:websiteId/sitemap.xml
 * @desc    Generate and serve XML sitemap
 * @access  Public
 */
router.get('/:websiteId/sitemap.xml',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  SEOController.generateSitemap
);

/**
 * @route   GET /api/seo/:websiteId/robots.txt
 * @desc    Generate and serve robots.txt
 * @access  Public
 */
router.get('/:websiteId/robots.txt',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  SEOController.generateRobotsTxt
);

/**
 * Private SEO endpoints (authentication required)
 */
router.use(authenticateToken);

/**
 * @route   GET /api/websites/:websiteId/seo/metrics
 * @desc    Get SEO metrics for a website
 * @access  Private
 */
router.get('/:websiteId/seo/metrics',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  SEOController.getSEOMetrics
);

/**
 * @route   GET /api/websites/:websiteId/seo/recommendations
 * @desc    Get SEO recommendations for a website
 * @access  Private
 */
router.get('/:websiteId/seo/recommendations',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  SEOController.getSEORecommendations
);

/**
 * @route   GET /api/websites/:websiteId/content/:contentId/seo/analyze
 * @desc    Analyze content for SEO issues
 * @access  Private
 */
router.get('/:websiteId/content/:contentId/seo/analyze',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      contentId: commonSchemas.uuid
    })
  }),
  SEOController.analyzeContentSEO
);

export default router;
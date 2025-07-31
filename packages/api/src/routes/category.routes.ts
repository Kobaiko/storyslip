import { Router } from 'express';
import CategoryController from '../controllers/category.controller';
import { validate, categorySchemas, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

// All category routes require authentication
router.use(authenticateToken);

// Apply content-specific rate limiting
router.use(rateLimitConfigs.content);

/**
 * @route   GET /api/websites/:websiteId/categories/tree
 * @desc    Get category tree (hierarchical structure)
 * @access  Private
 */
router.get('/:websiteId/categories/tree',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  CategoryController.getCategoryTree
);

/**
 * @route   GET /api/websites/:websiteId/categories
 * @desc    Get categories list
 * @access  Private
 */
router.get('/:websiteId/categories',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      hierarchy: Joi.string().valid('true', 'false').default('false')
    })
  }),
  CategoryController.getCategories
);

/**
 * @route   POST /api/websites/:websiteId/categories
 * @desc    Create new category
 * @access  Private
 */
router.post('/:websiteId/categories',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: categorySchemas.create
  }),
  CategoryController.createCategory
);

/**
 * @route   GET /api/websites/:websiteId/categories/:categoryId
 * @desc    Get category by ID
 * @access  Private
 */
router.get('/:websiteId/categories/:categoryId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      categoryId: commonSchemas.uuid
    })
  }),
  CategoryController.getCategoryById
);

/**
 * @route   PUT /api/websites/:websiteId/categories/:categoryId
 * @desc    Update category
 * @access  Private
 */
router.put('/:websiteId/categories/:categoryId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      categoryId: commonSchemas.uuid
    }),
    body: categorySchemas.update
  }),
  CategoryController.updateCategory
);

/**
 * @route   DELETE /api/websites/:websiteId/categories/:categoryId
 * @desc    Delete category
 * @access  Private
 */
router.delete('/:websiteId/categories/:categoryId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      categoryId: commonSchemas.uuid
    })
  }),
  CategoryController.deleteCategory
);

export default router;
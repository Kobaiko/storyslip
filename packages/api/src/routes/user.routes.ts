import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken, requireRole } from '../middleware/auth';
import Joi from 'joi';

const router = Router();

// All user management routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and search
 * @access  Private (Admin only)
 */
router.get('/',
  requireRole(['admin', 'owner']),
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sort: Joi.string().valid('name', 'email', 'created_at', 'last_login_at', 'role', 'subscription_tier').default('created_at'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
      search: Joi.string().min(1).max(255),
    })
  }),
  UserController.getUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private (Admin only)
 */
router.get('/stats',
  requireRole(['admin', 'owner']),
  UserController.getUserStats
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/:userId',
  requireRole(['admin', 'owner']),
  validate({
    params: Joi.object({
      userId: commonSchemas.uuid
    })
  }),
  UserController.getUserById
);

/**
 * @route   PUT /api/users/:userId
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put('/:userId',
  requireRole(['admin', 'owner']),
  validate({
    params: Joi.object({
      userId: commonSchemas.uuid
    }),
    body: Joi.object({
      name: Joi.string().min(1).max(255),
      email: Joi.string().email(),
      role: Joi.string().valid('owner', 'admin', 'editor', 'author'),
      subscription_tier: Joi.string().valid('free', 'starter', 'professional', 'business', 'enterprise'),
      email_verified: Joi.boolean(),
      avatar_url: Joi.string().uri().allow(''),
      metadata: Joi.object(),
    })
  }),
  UserController.updateUser
);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Delete user
 * @access  Private (Admin only)
 */
router.delete('/:userId',
  requireRole(['admin', 'owner']),
  validate({
    params: Joi.object({
      userId: commonSchemas.uuid
    })
  }),
  UserController.deleteUser
);

/**
 * @route   PUT /api/users/:userId/subscription
 * @desc    Update user subscription tier
 * @access  Private (Admin only)
 */
router.put('/:userId/subscription',
  requireRole(['admin', 'owner']),
  validate({
    params: Joi.object({
      userId: commonSchemas.uuid
    }),
    body: Joi.object({
      subscriptionTier: Joi.string().valid('free', 'starter', 'professional', 'business', 'enterprise').required()
    })
  }),
  UserController.updateSubscription
);

export default router;
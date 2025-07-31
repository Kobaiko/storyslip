import { Router } from 'express';
import AuditController from '../controllers/audit.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import Joi from 'joi';

const router = Router();

// All audit routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/websites/:websiteId/audit/logs
 * @desc    Get audit logs for a website
 * @access  Private (Team management permission required)
 */
router.get('/:websiteId/audit/logs',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      action: Joi.string().max(100),
      user_id: commonSchemas.uuid.optional(),
      target_user_id: commonSchemas.uuid.optional(),
      target_resource_type: Joi.string().valid('team', 'content', 'website', 'media').optional(),
      date_from: Joi.date().iso(),
      date_to: Joi.date().iso(),
    })
  }),
  AuditController.getAuditLogs
);

/**
 * @route   GET /api/websites/:websiteId/audit/stats
 * @desc    Get audit statistics for a website
 * @access  Private (Team management permission required)
 */
router.get('/:websiteId/audit/stats',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).default(30),
    })
  }),
  AuditController.getAuditStats
);

/**
 * @route   GET /api/websites/:websiteId/audit/users/:targetUserId/activity
 * @desc    Get user activity timeline
 * @access  Private (Team management permission required)
 */
router.get('/:websiteId/audit/users/:targetUserId/activity',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      targetUserId: commonSchemas.uuid
    }),
    query: Joi.object({
      days: Joi.number().integer().min(1).max(365).default(30),
    })
  }),
  AuditController.getUserActivity
);

/**
 * @route   POST /api/websites/:websiteId/audit/cleanup
 * @desc    Clean up old audit logs
 * @access  Private (Website owner only)
 */
router.post('/:websiteId/audit/cleanup',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      days: Joi.number().integer().min(30).max(3650).default(365),
    })
  }),
  AuditController.cleanupOldLogs
);

export default router;
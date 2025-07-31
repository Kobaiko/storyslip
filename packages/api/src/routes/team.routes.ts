import { Router } from 'express';
import TeamController from '../controllers/team.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

// All team routes require authentication
router.use(authenticateToken);
router.use(rateLimitConfigs.content);

/**
 * @route   GET /api/websites/:websiteId/team/stats
 * @desc    Get team statistics
 * @access  Private
 */
router.get('/:websiteId/team/stats',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  TeamController.getTeamStats
);

/**
 * @route   GET /api/websites/:websiteId/team/audit-log
 * @desc    Get audit log for team actions
 * @access  Private
 */
router.get('/:websiteId/team/audit-log',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    })
  }),
  TeamController.getAuditLog
);

/**
 * @route   GET /api/websites/:websiteId/team/role
 * @desc    Get current user's role for the website
 * @access  Private
 */
router.get('/:websiteId/team/role',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  TeamController.getUserRole
);

/**
 * @route   POST /api/websites/:websiteId/team/permissions
 * @desc    Check user permissions for specific actions
 * @access  Private
 */
router.post('/:websiteId/team/permissions',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      actions: Joi.array().items(Joi.string()).min(1).max(20).required()
    })
  }),
  TeamController.checkPermissions
);

/**
 * @route   GET /api/websites/:websiteId/team
 * @desc    Get team members for a website
 * @access  Private
 */
router.get('/:websiteId/team',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  TeamController.getTeamMembers
);

/**
 * @route   GET /api/websites/:websiteId/team/:memberId
 * @desc    Get team member by user ID
 * @access  Private
 */
router.get('/:websiteId/team/:memberId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      memberId: commonSchemas.uuid
    })
  }),
  TeamController.getTeamMember
);

/**
 * @route   PUT /api/websites/:websiteId/team/:memberId/role
 * @desc    Update team member role
 * @access  Private
 */
router.put('/:websiteId/team/:memberId/role',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      memberId: commonSchemas.uuid
    }),
    body: Joi.object({
      role: Joi.string().valid('admin', 'editor', 'author').required()
    })
  }),
  TeamController.updateTeamMemberRole
);

/**
 * @route   DELETE /api/websites/:websiteId/team/:memberId
 * @desc    Remove team member
 * @access  Private
 */
router.delete('/:websiteId/team/:memberId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      memberId: commonSchemas.uuid
    })
  }),
  TeamController.removeTeamMember
);

export default router;
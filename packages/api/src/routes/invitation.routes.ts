import { Router } from 'express';
import InvitationController from '../controllers/invitation.controller';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

/**
 * Public invitation routes (no authentication required)
 */

/**
 * @route   GET /api/invitations/:token
 * @desc    Get invitation details by token (for invitation acceptance page)
 * @access  Public
 */
router.get('/invitations/:token',
  validate({
    params: Joi.object({
      token: Joi.string().length(64).hex().required()
    })
  }),
  InvitationController.getInvitationByToken
);

/**
 * @route   POST /api/invitations/accept
 * @desc    Accept invitation and create user account
 * @access  Public
 */
router.post('/invitations/accept',
  rateLimitConfigs.auth, // Use auth rate limiting for account creation
  validate({
    body: Joi.object({
      token: Joi.string().length(64).hex().required(),
      name: Joi.string().min(2).max(100).required(),
      password: Joi.string().min(8).max(128).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .messages({
          'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
        })
    })
  }),
  InvitationController.acceptInvitation
);

/**
 * Website-specific invitation routes (authentication required)
 */

// Apply authentication to all routes below
router.use(authenticateToken);
router.use(rateLimitConfigs.content);

/**
 * @route   POST /api/websites/:websiteId/invitations
 * @desc    Send invitation to join website
 * @access  Private
 */
router.post('/:websiteId/invitations',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      email: Joi.string().email().required(),
      role: Joi.string().valid('admin', 'editor', 'author').required()
    })
  }),
  InvitationController.sendInvitation
);

/**
 * @route   GET /api/websites/:websiteId/invitations
 * @desc    Get invitations for a website
 * @access  Private
 */
router.get('/:websiteId/invitations',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  InvitationController.getInvitations
);

/**
 * @route   DELETE /api/websites/:websiteId/invitations/:invitationId
 * @desc    Cancel invitation
 * @access  Private
 */
router.delete('/:websiteId/invitations/:invitationId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      invitationId: commonSchemas.uuid
    })
  }),
  InvitationController.cancelInvitation
);

/**
 * @route   POST /api/websites/:websiteId/invitations/:invitationId/resend
 * @desc    Resend invitation
 * @access  Private
 */
router.post('/:websiteId/invitations/:invitationId/resend',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      invitationId: commonSchemas.uuid
    })
  }),
  InvitationController.resendInvitation
);

export default router;
import { Router } from 'express';
import { OnboardingController } from '../controllers/onboarding.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/onboarding/progress:
 *   get:
 *     summary: Get user's onboarding progress
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/OnboardingProgress'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/progress', OnboardingController.getProgress);

/**
 * @swagger
 * /api/onboarding/step/complete:
 *   post:
 *     summary: Complete an onboarding step
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - step_id
 *             properties:
 *               step_id:
 *                 type: string
 *                 description: ID of the step to complete
 *               data:
 *                 type: object
 *                 description: Optional data associated with the step
 *     responses:
 *       200:
 *         description: Step completed successfully
 *       400:
 *         description: Invalid step ID or missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/step/complete',
  [
    body('step_id').isString().notEmpty(),
    body('data').optional().isObject(),
    validateRequest,
  ],
  OnboardingController.completeStep
);

/**
 * @swagger
 * /api/onboarding/complete:
 *   post:
 *     summary: Complete the entire onboarding process
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding completed successfully
 *       400:
 *         description: Required steps not completed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/complete', OnboardingController.completeOnboarding);

/**
 * @swagger
 * /api/onboarding/skip:
 *   post:
 *     summary: Skip onboarding
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding skipped successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/skip', OnboardingController.skipOnboarding);

/**
 * @swagger
 * /api/onboarding/reset:
 *   post:
 *     summary: Reset onboarding progress
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding reset successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/reset', OnboardingController.resetOnboarding);

/**
 * @swagger
 * /api/onboarding/should-show:
 *   get:
 *     summary: Check if user should see onboarding
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding status checked successfully
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
 *                     should_show:
 *                       type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/should-show', OnboardingController.shouldShowOnboarding);

/**
 * @swagger
 * /api/onboarding/stats:
 *   get:
 *     summary: Get onboarding statistics (admin only)
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding statistics retrieved successfully
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
 *                     total_users:
 *                       type: integer
 *                     completed_onboarding:
 *                       type: integer
 *                     completion_rate:
 *                       type: number
 *                     average_completion_time:
 *                       type: number
 *                     step_completion_rates:
 *                       type: object
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/stats', OnboardingController.getStats);

export default router;
import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query } from 'express-validator';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Internal server error
 */
router.get('/', ProfileController.getProfile);

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 maxLength: 100
 *               last_name:
 *                 type: string
 *                 maxLength: 100
 *               display_name:
 *                 type: string
 *                 maxLength: 200
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               timezone:
 *                 type: string
 *                 maxLength: 50
 *               language:
 *                 type: string
 *                 maxLength: 10
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  '/',
  [
    body('first_name').optional().isLength({ min: 1, max: 100 }).trim(),
    body('last_name').optional().isLength({ min: 1, max: 100 }).trim(),
    body('display_name').optional().isLength({ min: 1, max: 200 }).trim(),
    body('bio').optional().isLength({ max: 500 }).trim(),
    body('phone').optional().isLength({ max: 20 }).trim(),
    body('timezone').optional().isLength({ max: 50 }).trim(),
    body('language').optional().isLength({ max: 10 }).trim(),
    body('preferences').optional().isObject(),
    validateRequest,
  ],
  ProfileController.updateProfile
);

/**
 * @swagger
 * /api/profile/onboarding:
 *   put:
 *     summary: Update onboarding progress
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - step
 *               - completed
 *             properties:
 *               step:
 *                 type: integer
 *                 minimum: 0
 *               completed:
 *                 type: boolean
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Onboarding progress updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  '/onboarding',
  [
    body('step').isInt({ min: 0 }),
    body('completed').isBoolean(),
    body('data').optional().isObject(),
    validateRequest,
  ],
  ProfileController.updateOnboardingProgress
);

/**
 * @swagger
 * /api/profile/avatar:
 *   post:
 *     summary: Upload and update user avatar
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (max 5MB)
 *     responses:
 *       200:
 *         description: Avatar updated successfully
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
 *                     avatar_url:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/avatar', ProfileController.uploadAvatar, ProfileController.updateAvatar);

/**
 * @swagger
 * /api/profile/completion:
 *   get:
 *     summary: Get profile completion status
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completion retrieved successfully
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
 *                     percentage:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 100
 *                     missing_fields:
 *                       type: array
 *                       items:
 *                         type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/completion', ProfileController.getProfileCompletion);

/**
 * @swagger
 * /api/profile/search:
 *   get:
 *     summary: Search users for team invitations
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (name or email)
 *       - in: query
 *         name: organization_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Organization ID to filter out existing members
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       display_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       avatar_url:
 *                         type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/search',
  [
    query('q').isLength({ min: 2 }).trim(),
    query('organization_id').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validateRequest,
  ],
  ProfileController.searchUsers
);

/**
 * @swagger
 * /api/profile:
 *   delete:
 *     summary: Delete current user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirm
 *             properties:
 *               confirm:
 *                 type: string
 *                 enum: [DELETE]
 *                 description: Must be "DELETE" to confirm deletion
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *       400:
 *         description: Confirmation required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/',
  [
    body('confirm').equals('DELETE'),
    validateRequest,
  ],
  ProfileController.deleteProfile
);

export default router;
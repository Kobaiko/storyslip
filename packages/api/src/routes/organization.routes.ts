import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get user's organizations
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
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
 *                     $ref: '#/components/schemas/Organization'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', OrganizationController.getUserOrganizations);

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               logo_url:
 *                 type: string
 *                 format: uri
 *               website_url:
 *                 type: string
 *                 format: uri
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  [
    body('name').isLength({ min: 1, max: 255 }).trim(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    body('logo_url').optional().isURL(),
    body('website_url').optional().isURL(),
    body('settings').optional().isObject(),
    validateRequest,
  ],
  OrganizationController.createOrganization
);

/**
 * @swagger
 * /api/organizations/{organizationId}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Organization retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:organizationId',
  [
    param('organizationId').isUUID(),
    validateRequest,
  ],
  OrganizationController.getOrganization
);

/**
 * @swagger
 * /api/organizations/{organizationId}:
 *   put:
 *     summary: Update organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               logo_url:
 *                 type: string
 *                 format: uri
 *               website_url:
 *                 type: string
 *                 format: uri
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:organizationId',
  [
    param('organizationId').isUUID(),
    body('name').optional().isLength({ min: 1, max: 255 }).trim(),
    body('description').optional().isLength({ max: 1000 }).trim(),
    body('logo_url').optional().isURL(),
    body('website_url').optional().isURL(),
    body('settings').optional().isObject(),
    validateRequest,
  ],
  OrganizationController.updateOrganization
);

/**
 * @swagger
 * /api/organizations/{organizationId}:
 *   delete:
 *     summary: Delete organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Organization deleted successfully
 *       400:
 *         description: Confirmation required or organization has websites
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only owners can delete organizations
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:organizationId',
  [
    param('organizationId').isUUID(),
    body('confirm').equals('DELETE'),
    validateRequest,
  ],
  OrganizationController.deleteOrganization
);

/**
 * @swagger
 * /api/organizations/{organizationId}/switch:
 *   post:
 *     summary: Switch to organization as current
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Organization switched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User is not a member of this organization
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:organizationId/switch',
  [
    param('organizationId').isUUID(),
    validateRequest,
  ],
  OrganizationController.switchOrganization
);

/**
 * @swagger
 * /api/organizations/{organizationId}/members:
 *   get:
 *     summary: Get organization members
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Organization members retrieved successfully
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
 *                     $ref: '#/components/schemas/OrganizationMember'
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:organizationId/members',
  [
    param('organizationId').isUUID(),
    validateRequest,
  ],
  OrganizationController.getOrganizationMembers
);

/**
 * @swagger
 * /api/organizations/{organizationId}/members:
 *   post:
 *     summary: Invite member to organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       200:
 *         description: Member invited successfully
 *       400:
 *         description: Invalid input or user already member
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User or organization not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/:organizationId/members',
  [
    param('organizationId').isUUID(),
    body('email').isEmail(),
    body('role').isIn(['admin', 'member']),
    validateRequest,
  ],
  OrganizationController.inviteMember
);

/**
 * @swagger
 * /api/organizations/{organizationId}/members/{memberId}/role:
 *   put:
 *     summary: Update member role
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       400:
 *         description: Invalid role or cannot change owner role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Member not found
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:organizationId/members/:memberId/role',
  [
    param('organizationId').isUUID(),
    param('memberId').isUUID(),
    body('role').isIn(['admin', 'member']),
    validateRequest,
  ],
  OrganizationController.updateMemberRole
);

/**
 * @swagger
 * /api/organizations/{organizationId}/members/{memberId}:
 *   delete:
 *     summary: Remove member from organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       400:
 *         description: Cannot remove organization owner
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Member not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:organizationId/members/:memberId',
  [
    param('organizationId').isUUID(),
    param('memberId').isUUID(),
    validateRequest,
  ],
  OrganizationController.removeMember
);

export default router;
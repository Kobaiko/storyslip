import { Router } from 'express';
import { ContentSyncController } from '../controllers/content-sync.controller';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation schemas
const versionParamsSchema = z.object({
  websiteId: z.string().uuid(),
  contentId: z.string().uuid(),
  versionNumber: z.string().transform(Number),
});

const compareVersionsSchema = z.object({
  websiteId: z.string().uuid(),
  contentId: z.string().uuid(),
  version1: z.string().transform(Number),
  version2: z.string().transform(Number),
});

const restoreVersionSchema = z.object({
  websiteId: z.string().uuid(),
  contentId: z.string().uuid(),
  versionNumber: z.string().transform(Number),
});

const lockContentSchema = z.object({
  websiteId: z.string().uuid(),
  contentId: z.string().uuid(),
});

const detectConflictsSchema = z.object({
  websiteId: z.string().uuid(),
  contentId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  excerpt: z.string().optional(),
  baseVersion: z.number().optional(),
});

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/versions:
 *   get:
 *     summary: Get version history for content
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Version history retrieved successfully
 *       404:
 *         description: Content not found
 */
router.get(
  '/:websiteId/:contentId/versions',
  validateRequest({ params: z.object({ websiteId: z.string().uuid(), contentId: z.string().uuid() }) }),
  ContentSyncController.getVersionHistory
);

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/versions/{versionNumber}:
 *   get:
 *     summary: Get specific version of content
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: versionNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Version retrieved successfully
 *       404:
 *         description: Version not found
 */
router.get(
  '/:websiteId/:contentId/versions/:versionNumber',
  validateRequest({ params: versionParamsSchema }),
  ContentSyncController.getVersion
);

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/versions/compare:
 *   get:
 *     summary: Compare two versions of content
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: version1
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: version2
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Version comparison retrieved successfully
 *       404:
 *         description: One or both versions not found
 */
router.get(
  '/:websiteId/:contentId/versions/compare',
  validateRequest({ 
    params: z.object({ websiteId: z.string().uuid(), contentId: z.string().uuid() }),
    query: z.object({ version1: z.string().transform(Number), version2: z.string().transform(Number) })
  }),
  ContentSyncController.compareVersions
);

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/versions/{versionNumber}/restore:
 *   post:
 *     summary: Restore content to specific version
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: versionNumber
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Content restored successfully
 *       404:
 *         description: Version not found
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/:websiteId/:contentId/versions/:versionNumber/restore',
  validateRequest({ params: restoreVersionSchema }),
  ContentSyncController.restoreVersion
);

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/lock:
 *   post:
 *     summary: Acquire edit lock for content
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lock acquired successfully
 *       409:
 *         description: Content is locked by another user
 *       404:
 *         description: Content not found
 */
router.post(
  '/:websiteId/:contentId/lock',
  validateRequest({ params: lockContentSchema }),
  ContentSyncController.acquireLock
);

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/lock:
 *   delete:
 *     summary: Release edit lock for content
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lock released successfully
 *       404:
 *         description: Lock not found
 */
router.delete(
  '/:websiteId/:contentId/lock',
  validateRequest({ params: lockContentSchema }),
  ContentSyncController.releaseLock
);

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/lock:
 *   put:
 *     summary: Extend edit lock for content
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               minutes:
 *                 type: integer
 *                 default: 10
 *     responses:
 *       200:
 *         description: Lock extended successfully
 *       404:
 *         description: Lock not found
 */
router.put(
  '/:websiteId/:contentId/lock',
  validateRequest({ params: lockContentSchema }),
  ContentSyncController.extendLock
);

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/conflicts:
 *   post:
 *     summary: Detect conflicts in content changes
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
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
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               baseVersion:
 *                 type: integer
 *             required:
 *               - title
 *               - body
 *     responses:
 *       200:
 *         description: Conflict detection completed
 *       404:
 *         description: Content not found
 */
router.post(
  '/:websiteId/:contentId/conflicts',
  validateRequest({ 
    params: z.object({ websiteId: z.string().uuid(), contentId: z.string().uuid() }),
    body: z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      excerpt: z.string().optional(),
      baseVersion: z.number().optional(),
    })
  }),
  ContentSyncController.detectConflicts
);

/**
 * @swagger
 * /api/content-sync/{websiteId}/{contentId}/stats:
 *   get:
 *     summary: Get version statistics for content
 *     tags: [Content Sync]
 *     parameters:
 *       - in: path
 *         name: websiteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: contentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Version statistics retrieved successfully
 *       404:
 *         description: Content not found
 */
router.get(
  '/:websiteId/:contentId/stats',
  validateRequest({ params: z.object({ websiteId: z.string().uuid(), contentId: z.string().uuid() }) }),
  ContentSyncController.getVersionStats
);

/**
 * @swagger
 * /api/content-sync/cleanup:
 *   post:
 *     summary: Clean up old versions and expired locks
 *     tags: [Content Sync]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keepVersions:
 *                 type: integer
 *                 default: 50
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post(
  '/cleanup',
  ContentSyncController.cleanup
);

export default router;
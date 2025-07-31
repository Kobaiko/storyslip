import { Router } from 'express';
import MediaController from '../controllers/media.controller';
import { MediaService } from '../services/media.service';
import { validate, commonSchemas } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();

// All media routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/websites/:websiteId/media/stats
 * @desc    Get media statistics for a website
 * @access  Private
 */
router.get('/:websiteId/media/stats',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    })
  }),
  MediaController.getMediaStats
);

/**
 * @route   GET /api/websites/:websiteId/media
 * @desc    Get media files list with filters and pagination
 * @access  Private
 */
router.get('/:websiteId/media',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      type: Joi.string().valid('image', 'document'),
      search: Joi.string().min(1).max(255),
    })
  }),
  MediaController.getMediaFiles
);

/**
 * @route   POST /api/websites/:websiteId/media/upload
 * @desc    Upload media file
 * @access  Private
 */
router.post('/:websiteId/media/upload',
  rateLimitConfigs.upload,
  MediaService.getMulterConfig().single('file'),
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid
    }),
    body: Joi.object({
      alt_text: Joi.string().max(255).allow(''),
      caption: Joi.string().max(500).allow(''),
    })
  }),
  MediaController.uploadFile
);

/**
 * @route   GET /api/websites/:websiteId/media/:fileId
 * @desc    Get media file by ID
 * @access  Private
 */
router.get('/:websiteId/media/:fileId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      fileId: commonSchemas.uuid
    })
  }),
  MediaController.getMediaFileById
);

/**
 * @route   PUT /api/websites/:websiteId/media/:fileId
 * @desc    Update media file metadata
 * @access  Private
 */
router.put('/:websiteId/media/:fileId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      fileId: commonSchemas.uuid
    }),
    body: Joi.object({
      alt_text: Joi.string().max(255).allow(''),
      caption: Joi.string().max(500).allow(''),
    })
  }),
  MediaController.updateMediaFile
);

/**
 * @route   DELETE /api/websites/:websiteId/media/:fileId
 * @desc    Delete media file
 * @access  Private
 */
router.delete('/:websiteId/media/:fileId',
  validate({
    params: Joi.object({
      websiteId: commonSchemas.uuid,
      fileId: commonSchemas.uuid
    })
  }),
  MediaController.deleteMediaFile
);

export default router;
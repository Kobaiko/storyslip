import { Router } from 'express';
import { emailNotificationController } from '../controllers/email-notification.controller';
import { authenticateToken } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// User notification preferences
router.get('/preferences', emailNotificationController.getNotificationPreferences);
router.put('/preferences', emailNotificationController.updateNotificationPreferences);

// Send notification to user
router.post('/users/:userId/send', 
  rateLimiter({ windowMs: 60 * 1000, max: 10 }), // 10 notifications per minute
  emailNotificationController.sendNotification
);

// Notification history
router.get('/history', emailNotificationController.getNotificationHistory);

// Notification statistics
router.get('/statistics', emailNotificationController.getNotificationStatistics);

// Notification templates
router.get('/templates', emailNotificationController.getNotificationTemplates);
router.post('/templates', 
  rateLimiter({ windowMs: 60 * 1000, max: 5 }), // 5 template creations per minute
  emailNotificationController.createNotificationTemplate
);
router.put('/templates/:templateId', emailNotificationController.updateNotificationTemplate);
router.delete('/templates/:templateId', emailNotificationController.deleteNotificationTemplate);

// Test notification template
router.post('/templates/:templateId/test',
  rateLimiter({ windowMs: 60 * 1000, max: 3 }), // 3 test emails per minute
  emailNotificationController.testNotificationTemplate
);

// Digest management
router.post('/users/:userId/digest/daily',
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 1 }), // 1 daily digest per hour
  emailNotificationController.sendDailyDigest
);
router.post('/users/:userId/digest/weekly',
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 1 }), // 1 weekly digest per hour
  emailNotificationController.sendWeeklyDigest
);

export default router;
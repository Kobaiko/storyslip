import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Import optimized integration service
import { initializeOptimizedAPI } from './services/integration.service';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

async function startOptimizedServer() {
  try {
    // Initialize optimized API with comprehensive performance enhancements
    await initializeOptimizedAPI(app, {
      database: {
        enableOptimizations: true,
        enableQueryCaching: true,
        enableConnectionPooling: true
      },
      cache: {
        enabled: true,
        defaultTTL: 300, // 5 minutes
        enableTaggedCaching: true
      },
      performance: {
        enableMonitoring: true,
        monitoringInterval: 30000, // 30 seconds
        enableAlerts: true,
        thresholds: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 80, critical: 95 },
          eventLoop: { warning: 50, critical: 100 },
          responseTime: { warning: 1000, critical: 5000 }
        }
      },
      api: {
        enableCompression: true,
        enableRateLimit: true,
        enableVersioning: true,
        enableResponseOptimization: true,
        enableSecurityHeaders: true
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableRequestLogging: true,
        enablePerformanceLogging: true
      }
    });

    // Request parsing middleware (after optimization middleware)
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // API status endpoint
    app.get('/api/status', (req, res) => {
      res.json({
        success: true,
        data: {
          service: 'StorySlip API',
          version: '1.0.0',
          status: 'operational',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
      });
    });

    // Import routes
    const authRoutes = (await import('./routes/auth.routes')).default;
    const userRoutes = (await import('./routes/user.routes')).default;
    const websiteRoutes = (await import('./routes/website.routes')).default;
    const contentRoutes = (await import('./routes/content.routes')).default;
    const categoryRoutes = (await import('./routes/category.routes')).default;
    const tagRoutes = (await import('./routes/tag.routes')).default;
    const invitationRoutes = (await import('./routes/invitation.routes')).default;
    const teamRoutes = (await import('./routes/team.routes')).default;
    const analyticsRoutes = (await import('./routes/analytics.routes')).default;
    const mediaRoutes = (await import('./routes/media.routes')).default;
    const seoRoutes = (await import('./routes/seo.routes')).default;
    const auditRoutes = (await import('./routes/audit.routes')).default;
    const brandRoutes = (await import('./routes/brand.routes')).default;
    const widgetBrandingRoutes = (await import('./routes/widget-branding.routes')).default;
    const widgetDeliveryRoutes = (await import('./routes/widget-delivery.routes')).default;
    const { enhancedWidgetRoutes } = await import('./routes/enhanced-widget.routes');
    const { teamManagementEnhancedRoutes } = await import('./routes/team-management-enhanced.routes');
    const documentationRoutes = (await import('./routes/documentation.routes')).default;
    const emailNotificationRoutes = (await import('./routes/email-notification.routes')).default;

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/websites', websiteRoutes);
    app.use('/api/websites', contentRoutes);
    app.use('/api/websites', categoryRoutes);
    app.use('/api/websites', tagRoutes);
    app.use('/api', invitationRoutes); // Public invitation routes
    app.use('/api/websites', invitationRoutes); // Website-specific invitation routes
    app.use('/api/websites', teamRoutes);
    app.use('/api', analyticsRoutes); // Public analytics tracking
    app.use('/api/websites', analyticsRoutes); // Website-specific analytics
    app.use('/api/websites', mediaRoutes); // Media upload and management routes
    app.use('/api/seo', seoRoutes); // Public SEO routes (sitemap, robots.txt)
    app.use('/api/websites', seoRoutes); // Private SEO routes
    app.use('/api/websites', auditRoutes); // Audit log routes
    app.use('/api/brand', brandRoutes); // Public brand routes (CSS generation)
    app.use('/api/websites', brandRoutes); // Private brand routes
    app.use('/api', brandRoutes); // Agency brand template routes
    app.use('/api/brand', widgetBrandingRoutes); // Public widget branding routes (CSS generation)
    app.use('/api/websites', widgetBrandingRoutes); // Private widget branding routes

    // Widget delivery routes
    app.use('/api', widgetDeliveryRoutes); // Public widget delivery routes

    // Enhanced widget routes
    app.use('/api', enhancedWidgetRoutes); // Both public and private widget routes

    // Enhanced team management routes
    app.use('/api', teamManagementEnhancedRoutes); // Enhanced team management features

    // Email notification routes
    app.use('/api/notifications', emailNotificationRoutes); // Email notification management

    // API Documentation routes
    app.use('/api/docs', documentationRoutes); // Interactive API documentation

    // AI Content routes
    const aiContentRoutes = (await import('./routes/ai-content.routes')).default;
    app.use('/api/ai-content', aiContentRoutes); // AI-powered content generation

    // 404 handler for unmatched routes (handled by integration service)
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        requestId: (req as any).requestId
      });
    });

    // Start scheduler for scheduled content publishing
    const { schedulerService } = await import('./services/scheduler.service');
    schedulerService.init();

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Optimized StorySlip API server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`⚡ Performance monitoring: enabled`);
      logger.info(`🗄️  Database optimizations: enabled`);
      logger.info(`💾 Cache system: enabled`);
      logger.info(`🔒 Security enhancements: enabled`);
      logger.info(`📈 API optimizations: enabled`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
      logger.info(`📋 Detailed health: http://localhost:${PORT}/health/detailed`);
    });

    // Graceful shutdown is handled by integration service
    return app;

  } catch (error) {
    logger.error('Failed to start optimized server:', error);
    process.exit(1);
  }
}

// Start the optimized server
startOptimizedServer().catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});

export default app;
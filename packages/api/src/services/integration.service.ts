import { Express } from 'express';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { cacheService } from './cache.service';
import { dbOptimizationService } from './database-optimization.service';
import { performanceMonitor, performanceMiddleware } from './performance-monitor.service';
import { createOptimizedAPIMiddleware } from './api-optimization.service';

interface IntegrationConfig {
  database: {
    enableOptimizations: boolean;
    enableQueryCaching: boolean;
    enableConnectionPooling: boolean;
    poolConfig?: any;
  };
  cache: {
    enabled: boolean;
    defaultTTL: number;
    enableTaggedCaching: boolean;
  };
  performance: {
    enableMonitoring: boolean;
    monitoringInterval: number;
    enableAlerts: boolean;
    thresholds?: any;
  };
  api: {
    enableCompression: boolean;
    enableRateLimit: boolean;
    enableVersioning: boolean;
    enableResponseOptimization: boolean;
    enableSecurityHeaders: boolean;
  };
  logging: {
    level: string;
    enableRequestLogging: boolean;
    enablePerformanceLogging: boolean;
  };
}

class IntegrationService {
  private app?: Express;
  private dbPool?: Pool;
  private config: IntegrationConfig;
  private isInitialized = false;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize all services and integrations
   */
  async initialize(app: Express, config?: Partial<IntegrationConfig>): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Integration service already initialized');
      return;
    }

    try {
      this.app = app;
      if (config) {
        this.config = { ...this.config, ...config };
      }

      logger.info('Initializing integration service...');

      // Initialize database
      await this.initializeDatabase();

      // Initialize cache
      await this.initializeCache();

      // Initialize performance monitoring
      await this.initializePerformanceMonitoring();

      // Setup API middleware
      await this.setupAPIMiddleware();

      // Setup health checks
      await this.setupHealthChecks();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      this.isInitialized = true;
      logger.info('Integration service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize integration service:', error);
      throw error;
    }
  }

  /**
   * Initialize database with optimizations
   */
  private async initializeDatabase(): Promise<void> {
    if (!this.config.database.enableOptimizations) {
      return;
    }

    try {
      const environment = process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development';
      const poolConfig = this.config.database.poolConfig || 
                        dbOptimizationService.getOptimizedPoolConfig(environment);

      this.dbPool = new Pool(poolConfig);

      // Test connection
      const client = await this.dbPool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('Database connection pool initialized', {
        max: poolConfig.max,
        min: poolConfig.min,
        environment
      });

      // Generate index suggestions
      if (environment === 'development') {
        const suggestions = await dbOptimizationService.suggestIndexes(this.dbPool);
        if (suggestions.length > 0) {
          logger.info('Database index suggestions:', suggestions);
        }
      }

    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize cache service
   */
  private async initializeCache(): Promise<void> {
    if (!this.config.cache.enabled) {
      return;
    }

    try {
      // Cache service is initialized automatically
      // Just verify connection
      await cacheService.set('integration:test', 'ok', { ttl: 10 });
      const test = await cacheService.get('integration:test');
      
      if (test !== 'ok') {
        throw new Error('Cache test failed');
      }

      await cacheService.delete('integration:test');
      logger.info('Cache service initialized successfully');

    } catch (error) {
      logger.error('Cache initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    if (!this.config.performance.enableMonitoring) {
      return;
    }

    try {
      // Set custom thresholds if provided
      if (this.config.performance.thresholds) {
        performanceMonitor.setThresholds(this.config.performance.thresholds);
      }

      // Start monitoring
      performanceMonitor.startMonitoring(this.config.performance.monitoringInterval);

      // Setup alert handlers
      if (this.config.performance.enableAlerts) {
        performanceMonitor.on('alert', (alert) => {
          logger.warn('Performance alert:', alert);
          // Here you could integrate with external alerting systems
          // like PagerDuty, Slack, etc.
        });
      }

      logger.info('Performance monitoring initialized');

    } catch (error) {
      logger.error('Performance monitoring initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup API middleware
   */
  private async setupAPIMiddleware(): Promise<void> {
    if (!this.app) {
      throw new Error('Express app not provided');
    }

    try {
      const middleware = createOptimizedAPIMiddleware();

      // Security headers (should be first)
      if (this.config.api.enableSecurityHeaders) {
        this.app.use(middleware.securityHeaders);
      }

      // CORS
      this.app.use(middleware.cors({
        origins: process.env.CORS_ORIGINS?.split(',') || ['*'],
        credentials: true
      }));

      // Request size limiting
      this.app.use(middleware.requestSizeLimit('10mb'));

      // Compression
      if (this.config.api.enableCompression) {
        this.app.use(middleware.compression);
      }

      // Performance monitoring
      this.app.use(performanceMiddleware());

      // Request logging
      if (this.config.logging.enableRequestLogging) {
        this.app.use(middleware.logging);
      }

      // API versioning
      if (this.config.api.enableVersioning) {
        this.app.use(middleware.versioning);
      }

      // Response optimization
      if (this.config.api.enableResponseOptimization) {
        this.app.use(middleware.responseOptimization);
      }

      // Rate limiting
      if (this.config.api.enableRateLimit) {
        this.app.use('/api', middleware.rateLimit);
      }

      // Health check
      this.app.use(middleware.healthCheck);

      // Error handling (should be last)
      this.app.use(middleware.errorHandling);

      logger.info('API middleware configured successfully');

    } catch (error) {
      logger.error('API middleware setup failed:', error);
      throw error;
    }
  }

  /**
   * Setup health checks
   */
  private async setupHealthChecks(): Promise<void> {
    if (!this.app) {
      return;
    }

    // Detailed health check endpoint
    this.app.get('/health/detailed', async (req, res) => {
      try {
        const summary = performanceMonitor.getPerformanceSummary();
        const cacheStats = cacheService.getStats();
        const dbStats = this.dbPool ? dbOptimizationService.getPoolStats(this.dbPool) : null;
        const queryStats = dbOptimizationService.getQueryStats();

        const response = {
          status: summary.system,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          services: {
            database: dbStats ? {
              status: 'healthy',
              connections: dbStats
            } : { status: 'disabled' },
            cache: {
              status: 'healthy',
              stats: cacheStats
            },
            performance: {
              status: 'healthy',
              summary: summary.requests,
              alerts: summary.alerts
            }
          },
          metrics: {
            database: queryStats,
            endpoints: summary.topEndpoints.slice(0, 5)
          }
        };

        res.json(response);
      } catch (error) {
        logger.error('Detailed health check failed:', error);
        res.status(503).json({
          status: 'error',
          message: 'Health check failed',
          error: error.message
        });
      }
    });

    // Readiness probe
    this.app.get('/health/ready', async (req, res) => {
      try {
        // Check if all critical services are ready
        const checks = [];

        // Database check
        if (this.dbPool) {
          const client = await this.dbPool.connect();
          await client.query('SELECT 1');
          client.release();
          checks.push({ service: 'database', status: 'ready' });
        }

        // Cache check
        await cacheService.set('readiness:test', 'ok', { ttl: 5 });
        await cacheService.get('readiness:test');
        checks.push({ service: 'cache', status: 'ready' });

        res.json({
          status: 'ready',
          checks,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error('Readiness check failed:', error);
        res.status(503).json({
          status: 'not_ready',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Liveness probe
    this.app.get('/health/live', (req, res) => {
      res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    logger.info('Health check endpoints configured');
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new requests
        if (this.app) {
          // Close server if we have access to it
          // This would typically be done at the server level
        }

        // Stop performance monitoring
        performanceMonitor.stopMonitoring();

        // Close database connections
        if (this.dbPool) {
          await this.dbPool.end();
          logger.info('Database connections closed');
        }

        // Close cache connections
        await cacheService.close();
        logger.info('Cache connections closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Get optimized database query executor
   */
  getOptimizedQuery() {
    if (!this.dbPool) {
      throw new Error('Database not initialized');
    }

    return {
      execute: <T = any>(query: string, params: any[] = [], options: any = {}) =>
        dbOptimizationService.executeOptimizedQuery<T>(this.dbPool!, query, params, options),
      
      transaction: <T>(callback: (client: any) => Promise<T>) =>
        dbOptimizationService.executeTransaction(this.dbPool!, callback),
      
      batchInsert: (tableName: string, columns: string[], values: any[][], options: any = {}) =>
        dbOptimizationService.batchInsert(this.dbPool!, tableName, columns, values, options),
      
      bulkUpdate: (tableName: string, updates: any[], options: any = {}) =>
        dbOptimizationService.bulkUpdate(this.dbPool!, tableName, updates, options)
    };
  }

  /**
   * Get cache service
   */
  getCache() {
    return cacheService;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      summary: performanceMonitor.getPerformanceSummary(),
      health: performanceMonitor.getHealthStatus(),
      alerts: performanceMonitor.getRecentAlerts(),
      database: dbOptimizationService.getQueryStats(),
      cache: cacheService.getStats()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Integration service configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  /**
   * Cleanup old metrics and logs
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup performance metrics
      performanceMonitor.cleanup();

      // Cleanup database if needed
      if (this.dbPool && this.config.database.enableOptimizations) {
        await dbOptimizationService.optimizeTables(this.dbPool);
      }

      logger.info('Integration service cleanup completed');
    } catch (error) {
      logger.error('Integration service cleanup failed:', error);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): IntegrationConfig {
    return {
      database: {
        enableOptimizations: true,
        enableQueryCaching: true,
        enableConnectionPooling: true
      },
      cache: {
        enabled: true,
        defaultTTL: 300,
        enableTaggedCaching: true
      },
      performance: {
        enableMonitoring: true,
        monitoringInterval: 30000,
        enableAlerts: true
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
    };
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Create singleton instance
export const integrationService = new IntegrationService();

// Export helper functions
export const initializeOptimizedAPI = async (app: Express, config?: Partial<IntegrationConfig>) => {
  await integrationService.initialize(app, config);
  return integrationService;
};

export const getOptimizedServices = () => {
  if (!integrationService.isReady()) {
    throw new Error('Integration service not initialized');
  }

  return {
    query: integrationService.getOptimizedQuery(),
    cache: integrationService.getCache(),
    metrics: integrationService.getPerformanceMetrics()
  };
};
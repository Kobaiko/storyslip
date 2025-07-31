import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { cacheService } from './cache.service';
import { performanceMonitor } from './performance-monitor.service';

interface CompressionOptions {
  threshold: number;
  level: number;
  filter: (req: Request, res: Response) => boolean;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

interface APIVersionConfig {
  defaultVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  headerName: string;
  queryParam: string;
}

interface ResponseOptimization {
  enableETag: boolean;
  enableLastModified: boolean;
  enableConditionalRequests: boolean;
  maxAge: number;
}

class APIOptimizationService {
  private compressionOptions: CompressionOptions = {
    threshold: 1024, // Only compress responses > 1KB
    level: 6, // Compression level (1-9)
    filter: this.shouldCompress
  };

  private versionConfig: APIVersionConfig = {
    defaultVersion: 'v1',
    supportedVersions: ['v1'],
    deprecatedVersions: [],
    headerName: 'API-Version',
    queryParam: 'version'
  };

  private responseOptimization: ResponseOptimization = {
    enableETag: true,
    enableLastModified: true,
    enableConditionalRequests: true,
    maxAge: 300 // 5 minutes
  };

  /**
   * Get compression middleware
   */
  getCompressionMiddleware() {
    return compression({
      threshold: this.compressionOptions.threshold,
      level: this.compressionOptions.level,
      filter: this.compressionOptions.filter
    });
  }

  /**
   * Enhanced rate limiting middleware
   */
  createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
    const defaultConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => req.ip || 'unknown'
    };

    const finalConfig = { ...defaultConfig, ...config };

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = `ratelimit:${finalConfig.keyGenerator!(req)}`;
        const windowStart = Math.floor(Date.now() / finalConfig.windowMs) * finalConfig.windowMs;
        const windowKey = `${key}:${windowStart}`;

        // Get current count
        const current = await cacheService.get<number>(windowKey) || 0;

        // Check if limit exceeded
        if (current >= finalConfig.max) {
          // Set rate limit headers
          if (finalConfig.standardHeaders) {
            res.set({
              'RateLimit-Limit': finalConfig.max.toString(),
              'RateLimit-Remaining': '0',
              'RateLimit-Reset': new Date(windowStart + finalConfig.windowMs).toISOString()
            });
          }

          if (finalConfig.legacyHeaders) {
            res.set({
              'X-RateLimit-Limit': finalConfig.max.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil((windowStart + finalConfig.windowMs) / 1000).toString()
            });
          }

          return res.status(429).json({
            error: 'Too Many Requests',
            message: finalConfig.message,
            retryAfter: Math.ceil((windowStart + finalConfig.windowMs - Date.now()) / 1000)
          });
        }

        // Increment counter
        await cacheService.increment(windowKey, 1, { ttl: Math.ceil(finalConfig.windowMs / 1000) });

        // Set rate limit headers
        const remaining = Math.max(0, finalConfig.max - current - 1);
        
        if (finalConfig.standardHeaders) {
          res.set({
            'RateLimit-Limit': finalConfig.max.toString(),
            'RateLimit-Remaining': remaining.toString(),
            'RateLimit-Reset': new Date(windowStart + finalConfig.windowMs).toISOString()
          });
        }

        if (finalConfig.legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': finalConfig.max.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': Math.ceil((windowStart + finalConfig.windowMs) / 1000).toString()
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limiting error:', error);
        next(); // Continue on error to avoid blocking requests
      }
    };
  }

  /**
   * API versioning middleware
   */
  createVersioningMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Get version from header or query parameter
      let version = req.get(this.versionConfig.headerName) || 
                   req.query[this.versionConfig.queryParam] as string ||
                   this.versionConfig.defaultVersion;

      // Normalize version (remove 'v' prefix if present)
      version = version.toLowerCase().replace(/^v/, '');
      version = `v${version}`;

      // Check if version is supported
      if (!this.versionConfig.supportedVersions.includes(version)) {
        return res.status(400).json({
          error: 'Unsupported API Version',
          message: `API version '${version}' is not supported`,
          supportedVersions: this.versionConfig.supportedVersions
        });
      }

      // Check if version is deprecated
      if (this.versionConfig.deprecatedVersions.includes(version)) {
        res.set('Deprecation', 'true');
        res.set('Sunset', this.getDeprecationDate(version));
        logger.warn(`Deprecated API version used: ${version}`, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
      }

      // Add version to request object
      (req as any).apiVersion = version;
      res.set('API-Version', version);

      next();
    };
  }

  /**
   * Response optimization middleware
   */
  createResponseOptimizationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;

      // Override res.send
      res.send = function(body: any) {
        if (this.statusCode === 200 && body) {
          // Add ETag if enabled
          if (apiOptimizationService.responseOptimization.enableETag) {
            const etag = apiOptimizationService.generateETag(body);
            this.set('ETag', etag);

            // Check if client has matching ETag
            const clientETag = req.get('If-None-Match');
            if (clientETag === etag) {
              return this.status(304).end();
            }
          }

          // Add Last-Modified if enabled
          if (apiOptimizationService.responseOptimization.enableLastModified) {
            this.set('Last-Modified', new Date().toUTCString());
          }

          // Add Cache-Control
          this.set('Cache-Control', `public, max-age=${apiOptimizationService.responseOptimization.maxAge}`);
        }

        return originalSend.call(this, body);
      };

      // Override res.json
      res.json = function(obj: any) {
        if (this.statusCode === 200 && obj) {
          // Add ETag if enabled
          if (apiOptimizationService.responseOptimization.enableETag) {
            const etag = apiOptimizationService.generateETag(JSON.stringify(obj));
            this.set('ETag', etag);

            // Check if client has matching ETag
            const clientETag = req.get('If-None-Match');
            if (clientETag === etag) {
              return this.status(304).end();
            }
          }

          // Add Last-Modified if enabled
          if (apiOptimizationService.responseOptimization.enableLastModified) {
            this.set('Last-Modified', new Date().toUTCString());
          }

          // Add Cache-Control
          this.set('Cache-Control', `public, max-age=${apiOptimizationService.responseOptimization.maxAge}`);
        }

        return originalJson.call(this, obj);
      };

      next();
    };
  }

  /**
   * Request/Response logging middleware
   */
  createLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();

      // Add request ID to request and response
      (req as any).requestId = requestId;
      res.set('X-Request-ID', requestId);

      // Log request
      logger.info('API Request', {
        requestId,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length'),
        apiVersion: (req as any).apiVersion
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any) {
        const responseTime = Date.now() - startTime;
        
        logger.info('API Response', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime,
          contentLength: res.get('Content-Length')
        });

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Error handling middleware
   */
  createErrorHandlingMiddleware() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      const requestId = (req as any).requestId || 'unknown';
      
      logger.error('API Error', {
        requestId,
        method: req.method,
        path: req.path,
        error: error.message,
        stack: error.stack,
        statusCode: error.statusCode || 500
      });

      // Don't expose internal errors in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      const statusCode = error.statusCode || 500;
      
      const errorResponse: any = {
        error: error.name || 'Internal Server Error',
        message: statusCode < 500 || isDevelopment ? error.message : 'An internal server error occurred',
        requestId
      };

      if (isDevelopment && error.stack) {
        errorResponse.stack = error.stack;
      }

      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * Health check endpoint optimization
   */
  createHealthCheckMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health' || req.path === '/health/') {
        try {
          const health = performanceMonitor.getHealthStatus();
          const cacheStats = cacheService.getStats();
          
          const response = {
            status: health.status,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            checks: health.checks,
            cache: {
              hitRate: cacheStats.hitRate,
              totalOperations: cacheStats.hits + cacheStats.misses
            }
          };

          // Set appropriate status code
          const statusCode = health.status === 'healthy' ? 200 : 
                           health.status === 'warning' ? 200 : 503;

          res.status(statusCode).json(response);
          return;
        } catch (error) {
          logger.error('Health check error:', error);
          res.status(503).json({
            status: 'error',
            message: 'Health check failed'
          });
          return;
        }
      }

      next();
    };
  }

  /**
   * Request size limiting middleware
   */
  createRequestSizeLimitMiddleware(maxSize = '10mb') {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = req.get('Content-Length');
      
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength);
        const maxSizeInBytes = this.parseSize(maxSize);
        
        if (sizeInBytes > maxSizeInBytes) {
          return res.status(413).json({
            error: 'Payload Too Large',
            message: `Request size ${this.formatSize(sizeInBytes)} exceeds maximum allowed size ${maxSize}`,
            maxSize
          });
        }
      }

      next();
    };
  }

  /**
   * CORS optimization middleware
   */
  createCORSMiddleware(options: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
    maxAge?: number;
  } = {}) {
    const defaultOptions = {
      origins: ['*'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'API-Version'],
      credentials: false,
      maxAge: 86400 // 24 hours
    };

    const finalOptions = { ...defaultOptions, ...options };

    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.get('Origin');
      
      // Check if origin is allowed
      if (finalOptions.origins.includes('*') || 
          (origin && finalOptions.origins.includes(origin))) {
        res.set('Access-Control-Allow-Origin', origin || '*');
      }

      res.set('Access-Control-Allow-Methods', finalOptions.methods.join(', '));
      res.set('Access-Control-Allow-Headers', finalOptions.headers.join(', '));
      res.set('Access-Control-Max-Age', finalOptions.maxAge.toString());

      if (finalOptions.credentials) {
        res.set('Access-Control-Allow-Credentials', 'true');
      }

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }

      next();
    };
  }

  /**
   * Security headers middleware
   */
  createSecurityHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      });

      next();
    };
  }

  /**
   * Generate ETag for response
   */
  private generateETag(content: string): string {
    const crypto = require('crypto');
    return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if response should be compressed
   */
  private shouldCompress(req: Request, res: Response): boolean {
    // Don't compress if client doesn't support it
    if (!req.get('Accept-Encoding')?.includes('gzip')) {
      return false;
    }

    // Don't compress images, videos, or already compressed content
    const contentType = res.get('Content-Type') || '';
    const noCompressTypes = [
      'image/',
      'video/',
      'audio/',
      'application/zip',
      'application/gzip',
      'application/x-rar-compressed'
    ];

    return !noCompressTypes.some(type => contentType.includes(type));
  }

  /**
   * Get deprecation date for API version
   */
  private getDeprecationDate(version: string): string {
    // Return a date 6 months from now as default
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(size: string): number {
    const units: { [key: string]: number } = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';
    
    return Math.floor(value * (units[unit] || 1));
  }

  /**
   * Format bytes to human readable size
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    compression?: Partial<CompressionOptions>;
    versioning?: Partial<APIVersionConfig>;
    responseOptimization?: Partial<ResponseOptimization>;
  }): void {
    if (config.compression) {
      this.compressionOptions = { ...this.compressionOptions, ...config.compression };
    }

    if (config.versioning) {
      this.versionConfig = { ...this.versionConfig, ...config.versioning };
    }

    if (config.responseOptimization) {
      this.responseOptimization = { ...this.responseOptimization, ...config.responseOptimization };
    }

    logger.info('API optimization configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      compression: this.compressionOptions,
      versioning: this.versionConfig,
      responseOptimization: this.responseOptimization
    };
  }
}

// Create singleton instance
export const apiOptimizationService = new APIOptimizationService();

// Export middleware factory functions
export const createOptimizedAPIMiddleware = () => {
  return {
    compression: apiOptimizationService.getCompressionMiddleware(),
    rateLimit: apiOptimizationService.createRateLimitMiddleware(),
    versioning: apiOptimizationService.createVersioningMiddleware(),
    responseOptimization: apiOptimizationService.createResponseOptimizationMiddleware(),
    logging: apiOptimizationService.createLoggingMiddleware(),
    errorHandling: apiOptimizationService.createErrorHandlingMiddleware(),
    healthCheck: apiOptimizationService.createHealthCheckMiddleware(),
    requestSizeLimit: apiOptimizationService.createRequestSizeLimitMiddleware(),
    cors: apiOptimizationService.createCORSMiddleware(),
    securityHeaders: apiOptimizationService.createSecurityHeadersMiddleware()
  };
};
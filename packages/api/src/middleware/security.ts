import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from './logger';

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content Security Policy for API
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none';"
  );

  next();
};

/**
 * CORS configuration for different endpoints
 */
export const corsConfig = {
  // Admin API CORS - restrictive
  admin: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://dashboard.storyslip.com'] 
      : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // Widget API CORS - permissive for embedding
  widget: {
    origin: true, // Allow all origins for widget embedding
    credentials: false,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
  },
};

/**
 * API key validation middleware for widget endpoints
 */
export const validateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      logSecurityEvent('Missing API key', { url: req.url }, req);
      res.status(401).json({
        success: false,
        error: {
          code: 'API_KEY_REQUIRED',
          message: 'API key is required',
        },
      });
      return;
    }

    // Validate API key format (64 character hex string)
    if (!/^[a-f0-9]{64}$/.test(apiKey)) {
      logSecurityEvent('Invalid API key format', { apiKey: apiKey.substring(0, 8) + '...' }, req);
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format',
        },
      });
      return;
    }

    // TODO: Validate API key against database in next task
    // For now, just attach it to the request
    (req as any).apiKey = apiKey;

    next();
  } catch (error) {
    logSecurityEvent('API key validation error', { error: error.message }, req);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  }
};

/**
 * Request sanitization middleware
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize common XSS patterns in request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Basic XSS prevention - remove script tags and javascript: protocols
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

/**
 * IP whitelist middleware (for admin endpoints if needed)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip;

    if (!allowedIPs.includes(clientIP)) {
      logSecurityEvent('IP not whitelisted', { ip: clientIP }, req);
      res.status(403).json({
        success: false,
        error: {
          code: 'IP_NOT_ALLOWED',
          message: 'Access denied from this IP address',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      logSecurityEvent('Request too large', { size: contentLength, limit: maxBytes }, req);
      res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'Request entity too large',
        },
      });
      return;
    }

    next();
  };
};

/**
 * Parse size string to bytes
 */
function parseSize(size: string): number {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'b') as keyof typeof units;
  
  return Math.floor(value * units[unit]);
}

export default {
  securityHeaders,
  corsConfig,
  validateApiKey,
  sanitizeRequest,
  ipWhitelist,
  requestSizeLimiter,
};
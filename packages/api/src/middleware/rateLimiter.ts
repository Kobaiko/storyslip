import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logSecurityEvent } from './logger';

/**
 * Rate limiting configurations for different endpoints
 */
export const rateLimitConfigs = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logSecurityEvent('Rate limit exceeded - general', { ip: req.ip }, req);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP, please try again later.',
        },
      });
    },
  }),

  // Authentication endpoints (more restrictive)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logSecurityEvent('Rate limit exceeded - auth', { ip: req.ip }, req);
      res.status(429).json({
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts, please try again later.',
        },
      });
    },
  }),

  // Widget API (more permissive for embedding)
  widget: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // Limit each IP to 100 widget requests per minute
    message: {
      success: false,
      error: {
        code: 'WIDGET_RATE_LIMIT_EXCEEDED',
        message: 'Too many widget requests, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logSecurityEvent('Rate limit exceeded - widget', { ip: req.ip }, req);
      res.status(429).json({
        success: false,
        error: {
          code: 'WIDGET_RATE_LIMIT_EXCEEDED',
          message: 'Too many widget requests, please try again later.',
        },
      });
    },
  }),

  // Content creation (moderate)
  content: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Limit each IP to 50 content operations per 5 minutes
    message: {
      success: false,
      error: {
        code: 'CONTENT_RATE_LIMIT_EXCEEDED',
        message: 'Too many content operations, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logSecurityEvent('Rate limit exceeded - content', { ip: req.ip }, req);
      res.status(429).json({
        success: false,
        error: {
          code: 'CONTENT_RATE_LIMIT_EXCEEDED',
          message: 'Too many content operations, please try again later.',
        },
      });
    },
  }),

  // File uploads (very restrictive)
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads per hour
    message: {
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logSecurityEvent('Rate limit exceeded - upload', { ip: req.ip }, req);
      res.status(429).json({
        success: false,
        error: {
          code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          message: 'Too many file uploads, please try again later.',
        },
      });
    },
  }),
};

/**
 * Custom rate limiter based on user ID (for authenticated requests)
 */
export const createUserRateLimit = (windowMs: number, max: number) => {
  const store = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: Function) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const key = userId;
    const userLimit = store.get(key);

    if (!userLimit || now > userLimit.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userLimit.count >= max) {
      logSecurityEvent('User rate limit exceeded', { userId }, req);
      return res.status(429).json({
        success: false,
        error: {
          code: 'USER_RATE_LIMIT_EXCEEDED',
          message: 'Too many requests for this user, please try again later.',
        },
      });
    }

    userLimit.count++;
    next();
  };
};

/**
 * Specific rate limiters for different operations
 */
export const rateLimiter = {
  // General
  general: rateLimitConfigs.general,
  
  // Authentication
  login: rateLimitConfigs.auth,
  register: rateLimitConfigs.auth,
  resetPassword: rateLimitConfigs.auth,
  
  // Content operations
  createContent: rateLimitConfigs.content,
  updateContent: rateLimitConfigs.content,
  deleteContent: rateLimitConfigs.content,
  
  // Widget operations (authenticated)
  createWidget: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Limit each IP to 20 widget creations per 5 minutes
    message: {
      success: false,
      error: {
        code: 'WIDGET_CREATE_RATE_LIMIT_EXCEEDED',
        message: 'Too many widget creation attempts, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
  
  updateWidget: rateLimitConfigs.content,
  deleteWidget: rateLimitConfigs.content,
  getWidget: rateLimitConfigs.general,
  getWidgets: rateLimitConfigs.general,
  generateEmbedCode: rateLimitConfigs.general,
  getAnalytics: rateLimitConfigs.general,
  
  // Widget public endpoints (more permissive)
  renderWidget: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // Limit each IP to 200 widget renders per minute
    message: {
      success: false,
      error: {
        code: 'WIDGET_RENDER_RATE_LIMIT_EXCEEDED',
        message: 'Too many widget render requests, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for known CDN IPs or if behind reverse proxy
      const forwardedFor = req.headers['x-forwarded-for'];
      return !!forwardedFor;
    },
  }),
  
  previewWidget: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // Limit each IP to 50 widget previews per minute
    message: {
      success: false,
      error: {
        code: 'WIDGET_PREVIEW_RATE_LIMIT_EXCEEDED',
        message: 'Too many widget preview requests, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
  
  trackEvent: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500, // Limit each IP to 500 tracking events per minute
    message: {
      success: false,
      error: {
        code: 'TRACKING_RATE_LIMIT_EXCEEDED',
        message: 'Too many tracking requests, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for tracking events from known domains
      const referrer = req.headers.referer || req.headers.referrer;
      if (referrer) {
        try {
          const domain = new URL(referrer).hostname;
          // Add logic to check if domain is in allowlist
          return false; // For now, don't skip
        } catch {
          return false;
        }
      }
      return false;
    },
  }),
  
  // File uploads
  uploadFile: rateLimitConfigs.upload,
  
  // Other operations
  createWebsite: rateLimitConfigs.content,
  inviteUser: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 invitations per hour
    message: {
      success: false,
      error: {
        code: 'INVITATION_RATE_LIMIT_EXCEEDED',
        message: 'Too many invitation attempts, please try again later.',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

export default rateLimitConfigs;
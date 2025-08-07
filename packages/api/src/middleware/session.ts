import { Request, Response, NextFunction } from 'express';
import SessionService from '../services/session.service';

/**
 * Middleware to handle cross-application session management
 */
export const sessionMiddleware = () => {
  return SessionService.sessionRefreshMiddleware();
};

/**
 * Middleware to set CORS headers for session sharing
 */
export const sessionCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    'http://localhost:3000', // Dashboard dev
    'http://localhost:3001', // Marketing dev
    'https://dashboard.storyslip.com', // Dashboard prod
    'https://storyslip.com', // Marketing prod
    'https://www.storyslip.com', // Marketing prod www
  ];

  const origin = req.headers.origin;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

/**
 * Middleware to check session status and provide user info
 */
export const sessionStatusMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add session info to request for downstream use
  const sessionInfo = SessionService.getUserSessionFromCookie(req);
  if (sessionInfo) {
    (req as any).sessionInfo = sessionInfo;
  }
  
  next();
};

export default {
  sessionMiddleware,
  sessionCorsMiddleware,
  sessionStatusMiddleware,
};
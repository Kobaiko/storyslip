import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'storyslip-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * HTTP request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Log request
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    
    logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.userId,
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Security event logger
 */
export const logSecurityEvent = (event: string, details: any, req?: Request): void => {
  logger.warn('Security Event', {
    event,
    details,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    userId: (req as any)?.user?.userId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Database operation logger
 */
export const logDatabaseOperation = (operation: string, table: string, details?: any): void => {
  logger.info('Database Operation', {
    operation,
    table,
    details,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Performance logger
 */
export const logPerformance = (operation: string, duration: number, details?: any): void => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, 'Performance', {
    operation,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString(),
  });
};

export { logger };
export default {
  logger,
  requestLogger,
  logSecurityEvent,
  logDatabaseOperation,
  logPerformance,
};
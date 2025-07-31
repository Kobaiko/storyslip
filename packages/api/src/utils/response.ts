import { Response } from 'express';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  timestamp?: string;
}

export class ResponseUtil {
  /**
   * Send success response
   */
  static success<T>(res: Response, data?: T, meta?: any, statusCode: number = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    if (meta) {
      response.meta = meta;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    code: string = 'INTERNAL_ERROR',
    statusCode: number = 500,
    details?: any
  ): void {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    statusCode: number = 200
  ): void {
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<T[]> = {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Send created response
   */
  static created<T>(res: Response, data: T): void {
    this.success(res, data, undefined, 201);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Send bad request response
   */
  static badRequest(res: Response, message: string, details?: any): void {
    this.error(res, message, 'BAD_REQUEST', 400, details);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, message: string = 'Unauthorized'): void {
    this.error(res, message, 'UNAUTHORIZED', 401);
  }

  /**
   * Send forbidden response
   */
  static forbidden(res: Response, message: string = 'Forbidden'): void {
    this.error(res, message, 'FORBIDDEN', 403);
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, message: string = 'Resource not found'): void {
    this.error(res, message, 'NOT_FOUND', 404);
  }

  /**
   * Send conflict response
   */
  static conflict(res: Response, message: string, details?: any): void {
    this.error(res, message, 'CONFLICT', 409, details);
  }

  /**
   * Send validation error response
   */
  static validationError(res: Response, message: string, details?: any): void {
    this.error(res, message, 'VALIDATION_ERROR', 422, details);
  }

  /**
   * Send rate limit exceeded response
   */
  static rateLimitExceeded(res: Response, message: string = 'Rate limit exceeded'): void {
    this.error(res, message, 'RATE_LIMIT_EXCEEDED', 429);
  }

  /**
   * Send internal server error response
   */
  static internalError(res: Response, message: string = 'Internal server error'): void {
    this.error(res, message, 'INTERNAL_ERROR', 500);
  }
}

export default ResponseUtil;
import { Request, Response, NextFunction } from 'express';
import { authenticateToken, requireRole, optionalAuth } from '../auth';
import { AuthService } from '../../services/auth';

// Mock AuthService
jest.mock('../../services/auth');
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'owner',
      };

      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken);

      await authenticateToken(mockRequest as any, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toEqual(mockDecodedToken);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      await authenticateToken(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateToken(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed authorization header', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      await authenticateToken(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for user with required role', () => {
      (mockRequest as any).user = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'admin',
      };

      const middleware = requireRole(['admin', 'owner']);
      middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for user without required role', () => {
      (mockRequest as any).user = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'author',
      };

      const middleware = requireRole(['admin', 'owner']);
      middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      const middleware = requireRole(['admin']);
      middleware(mockRequest as any, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate valid token when provided', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      const mockDecodedToken = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'owner',
      };

      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken);

      await optionalAuth(mockRequest as any, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toEqual(mockDecodedToken);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      await optionalAuth(mockRequest as any, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication for invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockAuthService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(mockRequest as any, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
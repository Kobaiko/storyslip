import { AuthService } from '../auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
  supabaseAdmin: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
    })),
  },
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner' as const,
        subscription_tier: 'free' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
        email_verified: false,
        avatar_url: null,
        metadata: {},
      };

      mockJwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const tokens = AuthService.generateTokens(user);

      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toBe('refresh-token');
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'owner',
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      const result = AuthService.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    });

    it('should throw error for invalid token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => AuthService.verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      const password = 'password123';
      const hashedPassword = 'hashed-password';

      mockBcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await AuthService.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await AuthService.comparePassword('password123', 'hashed-password');

      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('should return false for non-matching passwords', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await AuthService.comparePassword('wrongpassword', 'hashed-password');

      expect(result).toBe(false);
    });
  });

  describe('register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
        subscription_tier: 'free',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
        email_verified: false,
        avatar_url: null,
        metadata: {},
      };

      // Mock supabase calls
      const { supabase, supabaseAdmin } = require('../../config/supabase');
      
      supabase.from().select().eq().single.mockResolvedValue({ data: null, error: null });
      mockBcrypt.hash.mockResolvedValue('hashed-password');
      supabaseAdmin.from().insert().select().single.mockResolvedValue({ data: mockUser, error: null });
      mockJwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await AuthService.register(userData);

      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const { supabase } = require('../../config/supabase');
      supabase.from().select().eq().single.mockResolvedValue({ 
        data: { id: 'existing-user' }, 
        error: null 
      });

      await expect(AuthService.register(userData)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed-password',
        role: 'owner',
        subscription_tier: 'free',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_login_at: null,
        email_verified: false,
        avatar_url: null,
        metadata: {},
      };

      const { supabaseAdmin } = require('../../config/supabase');
      
      supabaseAdmin.from().select().eq().single.mockResolvedValue({ data: mockUser, error: null });
      mockBcrypt.compare.mockResolvedValue(true);
      supabaseAdmin.from().update().eq.mockResolvedValue({ error: null });
      mockJwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await AuthService.login(credentials);

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should throw error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const { supabaseAdmin } = require('../../config/supabase');
      supabaseAdmin.from().select().eq().single.mockResolvedValue({ data: null, error: 'User not found' });

      await expect(AuthService.login(credentials)).rejects.toThrow('Invalid credentials');
    });
  });
});
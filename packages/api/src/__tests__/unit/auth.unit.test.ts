import { authService } from '../../services/auth';
import { supabase } from '../../config/supabase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepassword123',
      };

      const hashedPassword = 'hashed_password_123';
      const mockUser = {
        id: 'user-123',
        name: userData.name,
        email: userData.email,
        is_verified: false,
        created_at: new Date().toISOString(),
      };

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await authService.registerUser(userData);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(result).toEqual(mockUser);
    });

    it('should throw error if email already exists', async () => {
      const userData = {
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'securepassword123',
      };

      mockBcrypt.hash.mockResolvedValue('hashed_password' as never);
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key value' },
            }),
          }),
        }),
      } as any);

      await expect(authService.registerUser(userData)).rejects.toThrow(
        'Email already exists'
      );
    });

    it('should validate password strength', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'abcdefgh',
        'PASSWORD',
      ];

      for (const password of weakPasswords) {
        const userData = {
          name: 'John Doe',
          email: 'john@example.com',
          password,
        };

        await expect(authService.registerUser(userData)).rejects.toThrow(
          'Password does not meet security requirements'
        );
      }
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
      ];

      for (const email of invalidEmails) {
        const userData = {
          name: 'John Doe',
          email,
          password: 'SecurePass123!',
        };

        await expect(authService.registerUser(userData)).rejects.toThrow(
          'Invalid email format'
        );
      }
    });
  });

  describe('loginUser', () => {
    it('should login user with valid credentials', async () => {
      const credentials = {
        email: 'john@example.com',
        password: 'securepassword123',
      };

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: credentials.email,
        password_hash: 'hashed_password',
        is_verified: true,
        created_at: new Date().toISOString(),
      };

      const mockToken = 'jwt_token_123';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      } as any);

      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue(mockToken as never);

      const result = await authService.loginUser(credentials);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        credentials.password,
        mockUser.password_hash
      );
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          is_verified: mockUser.is_verified,
          created_at: mockUser.created_at,
        },
        token: mockToken,
      });
    });

    it('should throw error for invalid credentials', async () => {
      const credentials = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      } as any);

      await expect(authService.loginUser(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw error for unverified user', async () => {
      const credentials = {
        email: 'unverified@example.com',
        password: 'securepassword123',
      };

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: credentials.email,
        password_hash: 'hashed_password',
        is_verified: false,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      } as any);

      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(authService.loginUser(credentials)).rejects.toThrow(
        'Please verify your email before logging in'
      );
    });

    it('should throw error for incorrect password', async () => {
      const credentials = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: credentials.email,
        password_hash: 'hashed_password',
        is_verified: true,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      } as any);

      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.loginUser(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', async () => {
      const token = 'valid_jwt_token';
      const decodedPayload = {
        userId: 'user-123',
        email: 'john@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        is_verified: true,
        created_at: new Date().toISOString(),
      };

      mockJwt.verify.mockReturnValue(decodedPayload as never);
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await authService.verifyToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(result).toEqual(mockUser);
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid_token';

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken(token)).rejects.toThrow(
        'Invalid token'
      );
    });

    it('should throw error for expired token', async () => {
      const token = 'expired_token';

      mockJwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      await expect(authService.verifyToken(token)).rejects.toThrow(
        'Token expired'
      );
    });
  });

  describe('resetPassword', () => {
    it('should generate password reset token', async () => {
      const email = 'john@example.com';
      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email,
        is_verified: true,
      };

      const resetToken = 'reset_token_123';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockUser, reset_token: resetToken },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await authService.generatePasswordResetToken(email);

      expect(result).toEqual({
        user: mockUser,
        resetToken: expect.any(String),
      });
    });

    it('should throw error for non-existent email', async () => {
      const email = 'nonexistent@example.com';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      } as any);

      await expect(
        authService.generatePasswordResetToken(email)
      ).rejects.toThrow('User not found');
    });

    it('should reset password with valid token', async () => {
      const resetToken = 'valid_reset_token';
      const newPassword = 'NewSecurePass123!';
      const hashedPassword = 'new_hashed_password';

      const mockUser = {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        reset_token: resetToken,
        reset_token_expires: new Date(Date.now() + 3600000).toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUser,
                error: null,
              }),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { ...mockUser, password_hash: hashedPassword },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await authService.resetPassword(resetToken, newPassword);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      });
    });

    it('should throw error for invalid reset token', async () => {
      const resetToken = 'invalid_token';
      const newPassword = 'NewSecurePass123!';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gt: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              }),
            }),
          }),
        }),
      } as any);

      await expect(
        authService.resetPassword(resetToken, newPassword)
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-123';
      const updateData = {
        name: 'John Updated',
        email: 'john.updated@example.com',
      };

      const updatedUser = {
        id: userId,
        name: updateData.name,
        email: updateData.email,
        is_verified: true,
        created_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedUser,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await authService.updateUserProfile(userId, updateData);

      expect(result).toEqual(updatedUser);
    });

    it('should throw error for invalid user ID', async () => {
      const userId = 'invalid-user-id';
      const updateData = {
        name: 'John Updated',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              }),
            }),
          }),
        }),
      } as any);

      await expect(
        authService.updateUserProfile(userId, updateData)
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = 'user-123';

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: userId },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const result = await authService.deleteUser(userId);

      expect(result).toEqual({ success: true });
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-user';

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'No rows found' },
              }),
            }),
          }),
        }),
      } as any);

      await expect(authService.deleteUser(userId)).rejects.toThrow(
        'User not found'
      );
    });
  });
});
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase, supabaseAdmin } from '../config/supabase';
import { User } from '../types/database';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'password_hash'>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  /**
   * Generate JWT tokens
   */
  static generateTokens(user: Omit<User, 'password_hash'>): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterData): Promise<AuthTokens> {
    const { email, password, name } = userData;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        name,
        password_hash: passwordHash,
        email_verified: false,
      })
      .select('id, email, name, role, subscription_tier, created_at, updated_at, last_login_at, email_verified, avatar_url, metadata')
      .single();

    if (error || !user) {
      throw new Error('Failed to create user');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const { email, password } = credentials;

    // Get user with password hash
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Remove password hash from user object
    const { password_hash, ...userWithoutPassword } = user;

    // Generate tokens
    const tokens = this.generateTokens(userWithoutPassword);

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = this.verifyToken(refreshToken);
      
      // Get current user data
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name, role, subscription_tier, created_at, updated_at, last_login_at, email_verified, avatar_url, metadata')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const { accessToken } = this.generateTokens(user);

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, subscription_tier, created_at, updated_at, last_login_at, email_verified, avatar_url, metadata')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<Pick<User, 'name' | 'avatar_url' | 'metadata'>>): Promise<Omit<User, 'password_hash'>> {
    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, email, name, role, subscription_tier, created_at, updated_at, last_login_at, email_verified, avatar_url, metadata')
      .single();

    if (error || !user) {
      throw new Error('Failed to update profile');
    }

    return user;
  }

  /**
   * Change password
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get current password hash
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await this.comparePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', userId);

    if (updateError) {
      throw new Error('Failed to update password');
    }
  }
}

export default AuthService;
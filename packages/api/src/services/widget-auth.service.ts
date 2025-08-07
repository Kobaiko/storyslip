import { DatabaseService } from './database';
import { logger } from '../utils/monitoring';
import { randomBytes, createHash } from 'crypto';

interface APIKey {
  id: string;
  widget_id: string;
  key_hash: string;
  name: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  expires_at?: Date;
  created_at: Date;
  last_used_at?: Date;
  usage_count: number;
}

interface APIKeyUsage {
  key_id: string;
  endpoint: string;
  ip_address: string;
  user_agent?: string;
  timestamp: Date;
  response_status: number;
  response_time: number;
}

export class WidgetAuthService {
  private static instance: WidgetAuthService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): WidgetAuthService {
    if (!WidgetAuthService.instance) {
      WidgetAuthService.instance = new WidgetAuthService();
    }
    return WidgetAuthService.instance;
  }

  /**
   * Generate new API key for widget
   */
  public async generateAPIKey(
    widgetId: string,
    name: string,
    permissions: string[] = ['read'],
    rateLimit: number = 1000,
    expiresInDays?: number
  ): Promise<{ key: string; keyId: string }> {
    try {
      // Generate random API key
      const key = this.generateRandomKey();
      const keyHash = this.hashKey(key);

      // Calculate expiration date
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      // Insert into database
      const result = await this.db.query(`
        INSERT INTO widget_api_keys (
          widget_id, key_hash, name, permissions, rate_limit, 
          is_active, expires_at, created_at, usage_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 0)
        RETURNING id
      `, [
        widgetId,
        keyHash,
        name,
        JSON.stringify(permissions),
        rateLimit,
        true,
        expiresAt,
      ]);

      const keyId = result.rows[0].id;

      logger.info(`Generated API key for widget ${widgetId}`, {
        keyId,
        name,
        permissions,
        rateLimit,
      });

      return { key, keyId };

    } catch (error) {
      logger.error('Failed to generate API key:', error);
      throw new Error('Failed to generate API key');
    }
  }

  /**
   * Validate API key and check permissions
   */
  public async validateAPIKey(
    key: string,
    requiredPermission?: string
  ): Promise<{
    valid: boolean;
    keyData?: APIKey;
    error?: string;
  }> {
    try {
      const keyHash = this.hashKey(key);

      // Get API key from database
      const result = await this.db.query(`
        SELECT * FROM widget_api_keys 
        WHERE key_hash = $1 AND is_active = true
      `, [keyHash]);

      if (result.rows.length === 0) {
        return { valid: false, error: 'Invalid API key' };
      }

      const keyData = result.rows[0] as APIKey;

      // Check if key is expired
      if (keyData.expires_at && new Date() > keyData.expires_at) {
        return { valid: false, error: 'API key expired' };
      }

      // Check permissions if required
      if (requiredPermission) {
        const permissions = JSON.parse(keyData.permissions as any);
        if (!permissions.includes(requiredPermission) && !permissions.includes('admin')) {
          return { valid: false, error: 'Insufficient permissions' };
        }
      }

      // Update last used timestamp (async, don't wait)
      this.updateLastUsed(keyData.id).catch(error => {
        logger.error('Failed to update API key last used:', error);
      });

      return { valid: true, keyData };

    } catch (error) {
      logger.error('API key validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Check rate limit for API key
   */
  public async checkRateLimit(
    keyId: string,
    windowMinutes: number = 60
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    try {
      // Get API key rate limit
      const keyResult = await this.db.query(`
        SELECT rate_limit FROM widget_api_keys WHERE id = $1
      `, [keyId]);

      if (keyResult.rows.length === 0) {
        return { allowed: false, remaining: 0, resetTime: new Date() };
      }

      const rateLimit = keyResult.rows[0].rate_limit;
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

      // Count requests in current window
      const usageResult = await this.db.query(`
        SELECT COUNT(*) as request_count 
        FROM widget_api_key_usage 
        WHERE key_id = $1 AND timestamp >= $2
      `, [keyId, windowStart]);

      const requestCount = parseInt(usageResult.rows[0].request_count);
      const remaining = Math.max(0, rateLimit - requestCount);
      const resetTime = new Date(Date.now() + windowMinutes * 60 * 1000);

      return {
        allowed: requestCount < rateLimit,
        remaining,
        resetTime,
      };

    } catch (error) {
      logger.error('Rate limit check error:', error);
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }
  }

  /**
   * Log API key usage
   */
  public async logUsage(
    keyId: string,
    endpoint: string,
    ipAddress: string,
    userAgent?: string,
    responseStatus: number = 200,
    responseTime: number = 0
  ): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO widget_api_key_usage (
          key_id, endpoint, ip_address, user_agent, 
          timestamp, response_status, response_time
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      `, [keyId, endpoint, ipAddress, userAgent, responseStatus, responseTime]);

      // Update usage count (async)
      this.incrementUsageCount(keyId).catch(error => {
        logger.error('Failed to increment usage count:', error);
      });

    } catch (error) {
      logger.error('Failed to log API key usage:', error);
    }
  }

  /**
   * Get API keys for widget
   */
  public async getWidgetAPIKeys(widgetId: string): Promise<APIKey[]> {
    try {
      const result = await this.db.query(`
        SELECT id, widget_id, name, permissions, rate_limit, 
               is_active, expires_at, created_at, last_used_at, usage_count
        FROM widget_api_keys 
        WHERE widget_id = $1 
        ORDER BY created_at DESC
      `, [widgetId]);

      return result.rows.map(row => ({
        ...row,
        permissions: JSON.parse(row.permissions),
      }));

    } catch (error) {
      logger.error('Failed to get widget API keys:', error);
      throw new Error('Failed to get API keys');
    }
  }

  /**
   * Revoke API key
   */
  public async revokeAPIKey(keyId: string): Promise<void> {
    try {
      await this.db.query(`
        UPDATE widget_api_keys 
        SET is_active = false 
        WHERE id = $1
      `, [keyId]);

      logger.info(`Revoked API key ${keyId}`);

    } catch (error) {
      logger.error('Failed to revoke API key:', error);
      throw new Error('Failed to revoke API key');
    }
  }

  /**
   * Update API key permissions
   */
  public async updateAPIKeyPermissions(
    keyId: string,
    permissions: string[]
  ): Promise<void> {
    try {
      await this.db.query(`
        UPDATE widget_api_keys 
        SET permissions = $1 
        WHERE id = $2
      `, [JSON.stringify(permissions), keyId]);

      logger.info(`Updated permissions for API key ${keyId}`, { permissions });

    } catch (error) {
      logger.error('Failed to update API key permissions:', error);
      throw new Error('Failed to update permissions');
    }
  }

  /**
   * Get API key usage statistics
   */
  public async getUsageStats(
    keyId: string,
    days: number = 30
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    errorRequests: number;
    averageResponseTime: number;
    dailyUsage: Array<{ date: string; requests: number }>;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get overall stats
      const statsResult = await this.db.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN response_status < 400 THEN 1 END) as successful_requests,
          COUNT(CASE WHEN response_status >= 400 THEN 1 END) as error_requests,
          AVG(response_time) as avg_response_time
        FROM widget_api_key_usage 
        WHERE key_id = $1 AND timestamp >= $2
      `, [keyId, startDate]);

      // Get daily usage
      const dailyResult = await this.db.query(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as requests
        FROM widget_api_key_usage 
        WHERE key_id = $1 AND timestamp >= $2
        GROUP BY DATE(timestamp)
        ORDER BY date
      `, [keyId, startDate]);

      const stats = statsResult.rows[0];

      return {
        totalRequests: parseInt(stats.total_requests),
        successfulRequests: parseInt(stats.successful_requests),
        errorRequests: parseInt(stats.error_requests),
        averageResponseTime: parseFloat(stats.avg_response_time) || 0,
        dailyUsage: dailyResult.rows.map(row => ({
          date: row.date,
          requests: parseInt(row.requests),
        })),
      };

    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      throw new Error('Failed to get usage statistics');
    }
  }

  /**
   * Clean up expired API keys
   */
  public async cleanupExpiredKeys(): Promise<number> {
    try {
      const result = await this.db.query(`
        UPDATE widget_api_keys 
        SET is_active = false 
        WHERE expires_at < NOW() AND is_active = true
        RETURNING id
      `);

      const deactivatedCount = result.rows.length;
      
      if (deactivatedCount > 0) {
        logger.info(`Deactivated ${deactivatedCount} expired API keys`);
      }

      return deactivatedCount;

    } catch (error) {
      logger.error('Failed to cleanup expired API keys:', error);
      return 0;
    }
  }

  /**
   * Generate random API key
   */
  private generateRandomKey(): string {
    const prefix = 'sk_';
    const randomPart = randomBytes(32).toString('hex');
    return prefix + randomPart;
  }

  /**
   * Hash API key for storage
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    await this.db.query(`
      UPDATE widget_api_keys 
      SET last_used_at = NOW() 
      WHERE id = $1
    `, [keyId]);
  }

  /**
   * Increment usage count
   */
  private async incrementUsageCount(keyId: string): Promise<void> {
    await this.db.query(`
      UPDATE widget_api_keys 
      SET usage_count = usage_count + 1 
      WHERE id = $1
    `, [keyId]);
  }
}
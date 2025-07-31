import { supabase, supabaseAdmin } from '../config/supabase';
import { logger } from '../middleware/logger';

export class DatabaseUtil {
  /**
   * Test database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        logger.error('Database connection test failed:', error);
        return false;
      }

      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error('Database connection test error:', error);
      return false;
    }
  }

  /**
   * Test admin database connection
   */
  static async testAdminConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        logger.error('Admin database connection test failed:', error);
        return false;
      }

      logger.info('Admin database connection test successful');
      return true;
    } catch (error) {
      logger.error('Admin database connection test error:', error);
      return false;
    }
  }

  /**
   * Get database health status
   */
  static async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    connection: boolean;
    adminConnection: boolean;
    timestamp: string;
  }> {
    const connection = await this.testConnection();
    const adminConnection = await this.testAdminConnection();
    const status = connection && adminConnection ? 'healthy' : 'unhealthy';

    return {
      status,
      connection,
      adminConnection,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute a health check query
   */
  static async healthCheck(): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('version');
      
      if (error) {
        throw error;
      }

      return {
        database: 'connected',
        version: data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      throw error;
    }
  }
}

export default DatabaseUtil;
import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';
import { cacheService, CacheKeys } from './cache.service';

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  cached: boolean;
  rowCount?: number;
}

interface ConnectionPoolStats {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
}

class DatabaseOptimizationService {
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private maxMetricsHistory = 1000;

  /**
   * Execute query with performance monitoring and caching
   */
  async executeOptimizedQuery<T = any>(
    pool: Pool,
    query: string,
    params: any[] = [],
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      skipCache?: boolean;
      tags?: string[];
    } = {}
  ): Promise<T[]> {
    const startTime = Date.now();
    let cached = false;
    let result: T[];

    try {
      // Try cache first if enabled
      if (options.cacheKey && !options.skipCache) {
        const cachedResult = await cacheService.get<T[]>(options.cacheKey);
        if (cachedResult) {
          cached = true;
          result = cachedResult;
          this.recordQueryMetrics(query, Date.now() - startTime, cached, result.length);
          return result;
        }
      }

      // Execute query
      const queryResult = await pool.query(query, params);
      result = queryResult.rows;

      // Cache result if specified
      if (options.cacheKey && !options.skipCache) {
        const cacheOptions = {
          ttl: options.cacheTTL || 300, // 5 minutes default
        };

        if (options.tags) {
          await cacheService.setWithTags(options.cacheKey, result, options.tags, cacheOptions);
        } else {
          await cacheService.set(options.cacheKey, result, cacheOptions);
        }
      }

      this.recordQueryMetrics(query, Date.now() - startTime, cached, result.length);
      return result;

    } catch (error) {
      this.recordQueryMetrics(query, Date.now() - startTime, cached, 0);
      logger.error('Database query error:', { query, params, error });
      throw error;
    }
  }

  /**
   * Execute query with connection from pool
   */
  async executeWithConnection<T>(
    pool: Pool,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  /**
   * Execute transaction with optimizations
   */
  async executeTransaction<T>(
    pool: Pool,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch insert with optimizations
   */
  async batchInsert(
    pool: Pool,
    tableName: string,
    columns: string[],
    values: any[][],
    options: {
      batchSize?: number;
      onConflict?: string;
      returning?: string[];
    } = {}
  ): Promise<any[]> {
    const batchSize = options.batchSize || 1000;
    const results: any[] = [];

    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      
      // Build parameterized query
      const placeholders = batch.map((_, batchIndex) => {
        const rowPlaceholders = columns.map((_, colIndex) => 
          `$${batchIndex * columns.length + colIndex + 1}`
        ).join(', ');
        return `(${rowPlaceholders})`;
      }).join(', ');

      let query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
      
      if (options.onConflict) {
        query += ` ${options.onConflict}`;
      }
      
      if (options.returning) {
        query += ` RETURNING ${options.returning.join(', ')}`;
      }

      const flatParams = batch.flat();
      const result = await pool.query(query, flatParams);
      
      if (options.returning) {
        results.push(...result.rows);
      }
    }

    return results;
  }

  /**
   * Bulk update with optimizations
   */
  async bulkUpdate(
    pool: Pool,
    tableName: string,
    updates: Array<{ id: any; data: Record<string, any> }>,
    options: {
      batchSize?: number;
      returning?: string[];
    } = {}
  ): Promise<any[]> {
    const batchSize = options.batchSize || 500;
    const results: any[] = [];

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      // Use CASE statements for bulk updates
      const columns = Object.keys(batch[0].data);
      const setClauses = columns.map(column => {
        const cases = batch.map((update, index) => 
          `WHEN id = $${index * 2 + 1} THEN $${index * 2 + 2}`
        ).join(' ');
        return `${column} = CASE ${cases} END`;
      });

      const ids = batch.map(update => update.id);
      const params: any[] = [];
      
      batch.forEach(update => {
        params.push(update.id);
        columns.forEach(column => {
          params.push(update.data[column]);
        });
      });

      let query = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id IN (${ids.map((_, index) => `$${index * (columns.length + 1) + 1}`).join(', ')})`;
      
      if (options.returning) {
        query += ` RETURNING ${options.returning.join(', ')}`;
      }

      const result = await pool.query(query, params);
      
      if (options.returning) {
        results.push(...result.rows);
      }
    }

    return results;
  }

  /**
   * Get optimized pagination query
   */
  buildPaginationQuery(
    baseQuery: string,
    orderBy: string,
    limit: number,
    offset: number,
    useSeekPagination = false,
    lastValue?: any
  ): { query: string; params: any[] } {
    if (useSeekPagination && lastValue) {
      // Seek pagination for better performance on large datasets
      const query = `${baseQuery} AND ${orderBy} > $1 ORDER BY ${orderBy} LIMIT $2`;
      return { query, params: [lastValue, limit] };
    } else {
      // Traditional offset pagination
      const query = `${baseQuery} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`;
      return { query, params: [limit, offset] };
    }
  }

  /**
   * Analyze query performance
   */
  async analyzeQuery(pool: Pool, query: string, params: any[] = []): Promise<any> {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await pool.query(explainQuery, params);
      return result.rows[0]['QUERY PLAN'][0];
    } catch (error) {
      logger.error('Query analysis error:', error);
      return null;
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(pool: Pool): ConnectionPoolStats {
    return {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount
    };
  }

  /**
   * Record query metrics
   */
  private recordQueryMetrics(query: string, duration: number, cached: boolean, rowCount?: number): void {
    const metric: QueryMetrics = {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: new Date(),
      cached,
      rowCount
    };

    this.queryMetrics.push(metric);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn('Slow query detected:', {
        query: metric.query,
        duration,
        rowCount,
        cached
      });
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    cacheHitRate: number;
    recentSlowQueries: QueryMetrics[];
  } {
    const totalQueries = this.queryMetrics.length;
    const cachedQueries = this.queryMetrics.filter(m => m.cached).length;
    const slowQueries = this.queryMetrics.filter(m => m.duration > this.slowQueryThreshold).length;
    
    const averageDuration = totalQueries > 0 
      ? this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries 
      : 0;
    
    const cacheHitRate = totalQueries > 0 ? (cachedQueries / totalQueries) * 100 : 0;
    
    const recentSlowQueries = this.queryMetrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .slice(-10)
      .sort((a, b) => b.duration - a.duration);

    return {
      totalQueries,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowQueries,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      recentSlowQueries
    };
  }

  /**
   * Clear query metrics
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  /**
   * Optimize database connection pool
   */
  getOptimizedPoolConfig(environment: 'development' | 'production' | 'test'): any {
    const baseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'storyslip',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      
      // Connection pool settings
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
      query_timeout: 30000,
      
      // Performance settings
      application_name: 'storyslip-cms',
    };

    switch (environment) {
      case 'production':
        return {
          ...baseConfig,
          max: 20, // Maximum pool size
          min: 5,  // Minimum pool size
          idleTimeoutMillis: 60000,
          connectionTimeoutMillis: 10000,
        };
      
      case 'development':
        return {
          ...baseConfig,
          max: 10,
          min: 2,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        };
      
      case 'test':
        return {
          ...baseConfig,
          max: 5,
          min: 1,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 2000,
        };
      
      default:
        return baseConfig;
    }
  }

  /**
   * Create optimized indexes suggestions
   */
  async suggestIndexes(pool: Pool): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Check for missing indexes on foreign keys
      const foreignKeyQuery = `
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND n_distinct > 100
        AND correlation < 0.1
      `;
      
      const fkResult = await pool.query(foreignKeyQuery);
      
      for (const row of fkResult.rows) {
        suggestions.push(
          `CREATE INDEX CONCURRENTLY idx_${row.tablename}_${row.attname} ON ${row.tablename} (${row.attname});`
        );
      }

      // Check for tables without primary key indexes
      const noPkQuery = `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
          SELECT tablename 
          FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname LIKE '%_pkey'
        )
      `;
      
      const noPkResult = await pool.query(noPkQuery);
      
      for (const row of noPkResult.rows) {
        suggestions.push(`-- Consider adding a primary key to table: ${row.tablename}`);
      }

    } catch (error) {
      logger.error('Error generating index suggestions:', error);
    }

    return suggestions;
  }

  /**
   * Vacuum and analyze tables
   */
  async optimizeTables(pool: Pool, tables?: string[]): Promise<void> {
    try {
      const tablesToOptimize = tables || await this.getAllTables(pool);
      
      for (const table of tablesToOptimize) {
        logger.info(`Optimizing table: ${table}`);
        await pool.query(`VACUUM ANALYZE ${table}`);
      }
      
      logger.info('Table optimization completed');
    } catch (error) {
      logger.error('Table optimization error:', error);
      throw error;
    }
  }

  /**
   * Get all table names
   */
  private async getAllTables(pool: Pool): Promise<string[]> {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    return result.rows.map(row => row.tablename);
  }
}

// Create singleton instance
export const dbOptimizationService = new DatabaseOptimizationService();

// Query builder helpers
export class QueryBuilder {
  private query = '';
  private params: any[] = [];
  private paramCount = 0;

  select(columns: string | string[]): this {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    this.query += `SELECT ${cols}`;
    return this;
  }

  from(table: string): this {
    this.query += ` FROM ${table}`;
    return this;
  }

  join(table: string, condition: string): this {
    this.query += ` JOIN ${table} ON ${condition}`;
    return this;
  }

  leftJoin(table: string, condition: string): this {
    this.query += ` LEFT JOIN ${table} ON ${condition}`;
    return this;
  }

  where(condition: string, value?: any): this {
    if (this.query.includes('WHERE')) {
      this.query += ` AND ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
    }
    
    if (value !== undefined) {
      this.params.push(value);
      this.query = this.query.replace('?', `$${++this.paramCount}`);
    }
    
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query += ` ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.params.push(count);
    this.query += ` LIMIT $${++this.paramCount}`;
    return this;
  }

  offset(count: number): this {
    this.params.push(count);
    this.query += ` OFFSET $${++this.paramCount}`;
    return this;
  }

  build(): { query: string; params: any[] } {
    return { query: this.query, params: this.params };
  }

  static create(): QueryBuilder {
    return new QueryBuilder();
  }
}
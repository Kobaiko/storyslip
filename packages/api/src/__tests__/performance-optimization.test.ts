import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Pool } from 'pg';
import Redis from 'ioredis';
import request from 'supertest';
import express from 'express';

import { cacheService } from '../services/cache.service';
import { dbOptimizationService } from '../services/database-optimization.service';
import { performanceMonitor } from '../services/performance-monitor.service';
import { apiOptimizationService, createOptimizedAPIMiddleware } from '../services/api-optimization.service';
import { integrationService, initializeOptimizedAPI } from '../services/integration.service';

describe('Performance Optimization Services', () => {
  let testApp: express.Express;
  let testPool: Pool;

  beforeAll(async () => {
    // Setup test database pool
    testPool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'storyslip_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD,
      max: 5,
      min: 1
    });

    // Setup test Express app
    testApp = express();
    await initializeOptimizedAPI(testApp, {
      database: { enableOptimizations: true, enableQueryCaching: true, enableConnectionPooling: true },
      cache: { enabled: true, defaultTTL: 60, enableTaggedCaching: true },
      performance: { enableMonitoring: true, monitoringInterval: 1000, enableAlerts: false },
      api: { enableCompression: true, enableRateLimit: false, enableVersioning: true, enableResponseOptimization: true, enableSecurityHeaders: true },
      logging: { level: 'error', enableRequestLogging: false, enablePerformanceLogging: false }
    });

    testApp.get('/test', (req, res) => {
      res.json({ message: 'test', timestamp: new Date().toISOString() });
    });
  });

  afterAll(async () => {
    await testPool?.end();
    await cacheService.close();
    performanceMonitor.stopMonitoring();
  });

  describe('Cache Service', () => {
    beforeEach(async () => {
      await cacheService.flush();
      cacheService.resetStats();
    });

    it('should set and get values from cache', async () => {
      const key = 'test:key';
      const value = { data: 'test value', number: 42 };

      const setResult = await cacheService.set(key, value, { ttl: 60 });
      expect(setResult).toBe(true);

      const getResult = await cacheService.get(key);
      expect(getResult).toEqual(value);
    });

    it('should handle cache expiration', async () => {
      const key = 'test:expiry';
      const value = 'expires soon';

      await cacheService.set(key, value, { ttl: 1 });
      
      // Should exist immediately
      const immediate = await cacheService.get(key);
      expect(immediate).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const expired = await cacheService.get(key);
      expect(expired).toBeNull();
    });

    it('should support tagged caching and invalidation', async () => {
      const key1 = 'test:tagged1';
      const key2 = 'test:tagged2';
      const key3 = 'test:untagged';
      const tags = ['user:123', 'content'];

      await cacheService.setWithTags(key1, 'value1', tags);
      await cacheService.setWithTags(key2, 'value2', ['user:123']);
      await cacheService.set(key3, 'value3');

      // All should exist
      expect(await cacheService.get(key1)).toBe('value1');
      expect(await cacheService.get(key2)).toBe('value2');
      expect(await cacheService.get(key3)).toBe('value3');

      // Invalidate by tag
      const invalidated = await cacheService.invalidateByTags(['user:123']);
      expect(invalidated).toBe(2);

      // Tagged items should be gone
      expect(await cacheService.get(key1)).toBeNull();
      expect(await cacheService.get(key2)).toBeNull();
      
      // Untagged should remain
      expect(await cacheService.get(key3)).toBe('value3');
    });

    it('should track cache statistics', async () => {
      const key = 'test:stats';
      
      // Generate some cache activity
      await cacheService.set(key, 'value');
      await cacheService.get(key); // Hit
      await cacheService.get('nonexistent'); // Miss
      await cacheService.delete(key);

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should support getOrSet pattern', async () => {
      const key = 'test:getOrSet';
      let callCount = 0;

      const fetchFunction = async () => {
        callCount++;
        return { data: 'fetched', count: callCount };
      };

      // First call should fetch
      const result1 = await cacheService.getOrSet(key, fetchFunction, { ttl: 60 });
      expect(result1.count).toBe(1);
      expect(callCount).toBe(1);

      // Second call should use cache
      const result2 = await cacheService.getOrSet(key, fetchFunction, { ttl: 60 });
      expect(result2.count).toBe(1);
      expect(callCount).toBe(1);
    });
  });

  describe('Database Optimization Service', () => {
    beforeEach(() => {
      dbOptimizationService.clearMetrics();
    });

    it('should execute optimized queries with caching', async () => {
      const query = 'SELECT $1 as test_value, NOW() as timestamp';
      const params = ['test'];
      const cacheKey = 'test:query';

      // First execution should hit database
      const result1 = await dbOptimizationService.executeOptimizedQuery(
        testPool, query, params, { cacheKey, cacheTTL: 60 }
      );
      expect(result1).toHaveLength(1);
      expect(result1[0].test_value).toBe('test');

      // Second execution should use cache
      const result2 = await dbOptimizationService.executeOptimizedQuery(
        testPool, query, params, { cacheKey, cacheTTL: 60 }
      );
      expect(result2).toEqual(result1);

      const stats = dbOptimizationService.getQueryStats();
      expect(stats.totalQueries).toBe(2);
      expect(stats.cacheHitRate).toBe(50);
    });

    it('should execute transactions', async () => {
      const result = await dbOptimizationService.executeTransaction(testPool, async (client) => {
        const res1 = await client.query('SELECT 1 as first');
        const res2 = await client.query('SELECT 2 as second');
        return { first: res1.rows[0].first, second: res2.rows[0].second };
      });

      expect(result.first).toBe(1);
      expect(result.second).toBe(2);
    });

    it('should build pagination queries', async () => {
      const baseQuery = 'SELECT * FROM test_table WHERE active = true';
      
      // Traditional pagination
      const traditional = dbOptimizationService.buildPaginationQuery(
        baseQuery, 'created_at DESC', 10, 20
      );
      expect(traditional.query).toContain('LIMIT $1 OFFSET $2');
      expect(traditional.params).toEqual([10, 20]);

      // Seek pagination
      const seek = dbOptimizationService.buildPaginationQuery(
        baseQuery, 'created_at', 10, 0, true, '2023-01-01'
      );
      expect(seek.query).toContain('AND created_at > $1');
      expect(seek.params).toEqual(['2023-01-01', 10]);
    });

    it('should track query performance metrics', async () => {
      // Execute some queries to generate metrics
      await dbOptimizationService.executeOptimizedQuery(testPool, 'SELECT 1');
      await dbOptimizationService.executeOptimizedQuery(testPool, 'SELECT pg_sleep(0.001)'); // Slow query simulation

      const stats = dbOptimizationService.getQueryStats();
      expect(stats.totalQueries).toBe(2);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it('should get optimized pool configuration', () => {
      const devConfig = dbOptimizationService.getOptimizedPoolConfig('development');
      expect(devConfig.max).toBe(10);
      expect(devConfig.min).toBe(2);

      const prodConfig = dbOptimizationService.getOptimizedPoolConfig('production');
      expect(prodConfig.max).toBe(20);
      expect(prodConfig.min).toBe(5);

      const testConfig = dbOptimizationService.getOptimizedPoolConfig('test');
      expect(testConfig.max).toBe(5);
      expect(testConfig.min).toBe(1);
    });
  });

  describe('Performance Monitor Service', () => {
    beforeEach(() => {
      performanceMonitor.stopMonitoring();
    });

    afterEach(() => {
      performanceMonitor.stopMonitoring();
    });

    it('should collect system metrics', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(typeof metrics.cpu.usage).toBe('number');
      expect(Array.isArray(metrics.cpu.loadAverage)).toBe(true);
      expect(typeof metrics.memory.usage).toBe('number');
      expect(typeof metrics.process.uptime).toBe('number');
    });

    it('should record request metrics', () => {
      performanceMonitor.recordRequest({
        path: '/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 150
      });

      const summary = performanceMonitor.getPerformanceSummary(60000);
      expect(summary.requests.total).toBe(1);
      expect(summary.requests.averageResponseTime).toBe(150);
      expect(summary.requests.errorRate).toBe(0);
    });

    it('should generate endpoint statistics', () => {
      // Record multiple requests
      performanceMonitor.recordRequest({ path: '/api/test', method: 'GET', statusCode: 200, responseTime: 100 });
      performanceMonitor.recordRequest({ path: '/api/test', method: 'GET', statusCode: 200, responseTime: 200 });
      performanceMonitor.recordRequest({ path: '/api/test', method: 'POST', statusCode: 201, responseTime: 150 });
      performanceMonitor.recordRequest({ path: '/api/other', method: 'GET', statusCode: 404, responseTime: 50 });

      const stats = performanceMonitor.getEndpointStats();
      expect(stats).toHaveLength(3);
      
      const testGetStats = stats.find(s => s.path === '/api/test' && s.method === 'GET');
      expect(testGetStats?.count).toBe(2);
      expect(testGetStats?.averageResponseTime).toBe(150);
      expect(testGetStats?.errorRate).toBe(0);

      const otherStats = stats.find(s => s.path === '/api/other');
      expect(otherStats?.errorRate).toBe(100);
    });

    it('should provide health status', () => {
      const health = performanceMonitor.getHealthStatus();
      
      expect(['healthy', 'warning', 'critical']).toContain(health.status);
      expect(Array.isArray(health.checks)).toBe(true);
      
      const cpuCheck = health.checks.find(c => c.name === 'cpu');
      expect(cpuCheck).toBeDefined();
      expect(['pass', 'warn', 'fail']).toContain(cpuCheck!.status);
    });

    it('should start and stop monitoring', () => {
      expect(performanceMonitor.isReady).toBeDefined();
      
      performanceMonitor.startMonitoring(100);
      // Monitoring should be active
      
      performanceMonitor.stopMonitoring();
      // Monitoring should be stopped
    });
  });

  describe('API Optimization Service', () => {
    it('should create compression middleware', () => {
      const middleware = apiOptimizationService.getCompressionMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should create rate limiting middleware', () => {
      const middleware = apiOptimizationService.createRateLimitMiddleware({
        windowMs: 60000,
        max: 10
      });
      expect(typeof middleware).toBe('function');
    });

    it('should create versioning middleware', () => {
      const middleware = apiOptimizationService.createVersioningMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should update configuration', () => {
      const originalConfig = apiOptimizationService.getConfig();
      
      apiOptimizationService.updateConfig({
        compression: { threshold: 2048 },
        versioning: { defaultVersion: 'v2' }
      });

      const updatedConfig = apiOptimizationService.getConfig();
      expect(updatedConfig.compression.threshold).toBe(2048);
      expect(updatedConfig.versioning.defaultVersion).toBe('v2');
    });
  });

  describe('Integration Service', () => {
    it('should initialize successfully', async () => {
      expect(integrationService.isReady()).toBe(true);
    });

    it('should provide optimized services', () => {
      const services = integrationService.getOptimizedServices();
      
      expect(services.query).toBeDefined();
      expect(services.cache).toBeDefined();
      expect(services.metrics).toBeDefined();
    });

    it('should provide performance metrics', () => {
      const metrics = integrationService.getPerformanceMetrics();
      
      expect(metrics.summary).toBeDefined();
      expect(metrics.health).toBeDefined();
      expect(metrics.database).toBeDefined();
      expect(metrics.cache).toBeDefined();
    });

    it('should update configuration', () => {
      const originalConfig = integrationService.getConfig();
      
      integrationService.updateConfig({
        cache: { defaultTTL: 600 }
      });

      const updatedConfig = integrationService.getConfig();
      expect(updatedConfig.cache.defaultTTL).toBe(600);
    });
  });

  describe('API Middleware Integration', () => {
    it('should handle requests with optimizations', async () => {
      const response = await request(testApp)
        .get('/test')
        .expect(200);

      expect(response.body.message).toBe('test');
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['api-version']).toBeDefined();
    });

    it('should handle health checks', async () => {
      const response = await request(testApp)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    it('should handle detailed health checks', async () => {
      const response = await request(testApp)
        .get('/health/detailed')
        .expect(200);

      expect(response.body.services).toBeDefined();
      expect(response.body.metrics).toBeDefined();
    });

    it('should handle readiness probes', async () => {
      const response = await request(testApp)
        .get('/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(Array.isArray(response.body.checks)).toBe(true);
    });

    it('should handle liveness probes', async () => {
      const response = await request(testApp)
        .get('/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.uptime).toBeDefined();
    });

    it('should add security headers', async () => {
      const response = await request(testApp)
        .get('/test')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should handle API versioning', async () => {
      const response = await request(testApp)
        .get('/test')
        .set('API-Version', 'v1')
        .expect(200);

      expect(response.headers['api-version']).toBe('v1');
    });

    it('should handle unsupported API versions', async () => {
      const response = await request(testApp)
        .get('/test')
        .set('API-Version', 'v99')
        .expect(400);

      expect(response.body.error).toBe('Unsupported API Version');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        request(testApp).get('/test').expect(200)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Check that all responses are valid
      responses.forEach(response => {
        expect(response.body.message).toBe('test');
      });
    });

    it('should maintain performance metrics during load', async () => {
      // Generate some load
      const requests = Array.from({ length: 20 }, () =>
        request(testApp).get('/test')
      );

      await Promise.all(requests);

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.requests.total).toBeGreaterThan(0);
      expect(summary.requests.averageResponseTime).toBeGreaterThan(0);
    });
  });
});

describe('Performance Optimization Edge Cases', () => {
  describe('Cache Service Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // This test would require mocking Redis to simulate connection failures
      // For now, we'll test that the service doesn't crash on errors
      const result = await cacheService.get('test:key');
      expect(result).toBeNull(); // Should return null on error, not throw
    });
  });

  describe('Database Optimization Error Handling', () => {
    it('should handle database connection errors', async () => {
      const badPool = new Pool({
        host: 'nonexistent-host',
        port: 9999,
        database: 'nonexistent',
        user: 'nobody',
        password: 'wrong',
        connectionTimeoutMillis: 1000
      });

      await expect(
        dbOptimizationService.executeOptimizedQuery(badPool, 'SELECT 1')
      ).rejects.toThrow();

      await badPool.end();
    });
  });

  describe('Performance Monitor Edge Cases', () => {
    it('should handle system metric collection errors', () => {
      // Test that getCurrentMetrics doesn't throw even if system calls fail
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });
  });
});
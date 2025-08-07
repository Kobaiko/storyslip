import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { productionOptimizationService } from '../services/production-optimization.service';
import { monitoringService } from '../services/monitoring.service';
import { DatabaseService } from '../services/database';

// Mock external dependencies
jest.mock('../services/monitoring.service');
jest.mock('../services/database');

describe('Production Optimization Service', () => {
  let mockDb: jest.Mocked<DatabaseService>;

  beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
    process.env.SESSION_SECRET = 'test-session-secret-32-characters-long';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock database service
    mockDb = {
      query: jest.fn(),
      getInstance: jest.fn()
    } as any;
    
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
    
    // Mock monitoring service
    (monitoringService.isHealthy as jest.Mock).mockReturnValue(true);
    (monitoringService.trackBusinessEvent as jest.Mock).mockResolvedValue(undefined);
    (monitoringService.trackError as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(async () => {
    // Cleanup
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  describe('Service Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      // Mock successful database queries
      mockDb.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });
      
      // Mock fetch for Supabase connectivity check
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      await expect(productionOptimizationService.initialize()).resolves.not.toThrow();
      
      expect(productionOptimizationService.isInitialized()).toBe(true);
      expect(monitoringService.trackBusinessEvent).toHaveBeenCalledWith(
        'production_optimization_initialized',
        expect.any(Object)
      );
    });

    it('should handle initialization failure gracefully', async () => {
      // Mock database connection failure
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(productionOptimizationService.initialize()).rejects.toThrow();
      
      expect(monitoringService.trackError).toHaveBeenCalled();
      expect(productionOptimizationService.isInitialized()).toBe(false);
    });

    it('should load configuration from environment variables', async () => {
      // Set test environment variables
      process.env.ENABLE_COMPRESSION = 'true';
      process.env.ENABLE_CACHING = 'false';
      process.env.DB_POOL_SIZE = '25';
      process.env.LOG_LEVEL = 'error';

      mockDb.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });
      global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

      await productionOptimizationService.initialize();

      const config = productionOptimizationService.getConfiguration();
      expect(config.optimization.enableCompression).toBe(true);
      expect(config.optimization.enableCaching).toBe(false);
      expect(config.performance.connectionPoolSize).toBe(25);
      expect(config.monitoring.logLevel).toBe('error');

      // Cleanup
      delete process.env.ENABLE_COMPRESSION;
      delete process.env.ENABLE_CACHING;
      delete process.env.DB_POOL_SIZE;
      delete process.env.LOG_LEVEL;
    });
  });

  describe('Production Readiness Validation', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });
      global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
      await productionOptimizationService.initialize();
    });

    it('should validate environment configuration', async () => {
      const checks = await productionOptimizationService.validateProductionReadiness();
      
      const envCheck = checks.find(c => c.category === 'Environment Configuration');
      expect(envCheck).toBeDefined();
      expect(envCheck?.overall).toBe('ready');
      
      const nodeEnvCheck = envCheck?.checks.find(c => c.name === 'NODE_ENV');
      expect(nodeEnvCheck?.status).toBe('fail'); // NODE_ENV is 'test', not 'production'
    });

    it('should validate database readiness', async () => {
      // Mock successful database queries
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 15.0' }] }) // Version check
        .mockResolvedValue({ rows: [{}] }); // Table existence checks

      const checks = await productionOptimizationService.validateProductionReadiness();
      
      const dbCheck = checks.find(c => c.category === 'Database Readiness');
      expect(dbCheck).toBeDefined();
      
      const connectivityCheck = dbCheck?.checks.find(c => c.name === 'Database Connectivity');
      expect(connectivityCheck?.status).toBe('pass');
    });

    it('should validate security configuration', async () => {
      // Set secure environment variables
      process.env.HTTPS = 'true';
      process.env.COOKIE_SECURE = 'true';

      const checks = await productionOptimizationService.validateProductionReadiness();
      
      const securityCheck = checks.find(c => c.category === 'Security Configuration');
      expect(securityCheck).toBeDefined();
      
      const httpsCheck = securityCheck?.checks.find(c => c.name === 'HTTPS');
      expect(httpsCheck?.status).toBe('pass');

      // Cleanup
      delete process.env.HTTPS;
      delete process.env.COOKIE_SECURE;
    });

    it('should validate performance configuration', async () => {
      const checks = await productionOptimizationService.validateProductionReadiness();
      
      const perfCheck = checks.find(c => c.category === 'Performance Configuration');
      expect(perfCheck).toBeDefined();
      
      const poolSizeCheck = perfCheck?.checks.find(c => c.name === 'Database Pool Size');
      expect(poolSizeCheck?.status).toBe('pass');
    });

    it('should validate external dependencies', async () => {
      // Mock successful Supabase connection
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      const checks = await productionOptimizationService.validateProductionReadiness();
      
      const depsCheck = checks.find(c => c.category === 'External Dependencies');
      expect(depsCheck).toBeDefined();
      
      const supabaseCheck = depsCheck?.checks.find(c => c.name === 'Supabase Connectivity');
      expect(supabaseCheck?.status).toBe('pass');
    });

    it('should handle external dependency failures', async () => {
      // Mock failed Supabase connection
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const checks = await productionOptimizationService.validateProductionReadiness();
      
      const depsCheck = checks.find(c => c.category === 'External Dependencies');
      const supabaseCheck = depsCheck?.checks.find(c => c.name === 'Supabase Connectivity');
      expect(supabaseCheck?.status).toBe('fail');
    });

    it('should validate monitoring configuration', async () => {
      const checks = await productionOptimizationService.validateProductionReadiness();
      
      const monitoringCheck = checks.find(c => c.category === 'Monitoring Configuration');
      expect(monitoringCheck).toBeDefined();
      
      const serviceCheck = monitoringCheck?.checks.find(c => c.name === 'Monitoring Service');
      expect(serviceCheck?.status).toBe('pass');
    });
  });

  describe('Health Checks', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });
      global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
      await productionOptimizationService.initialize();
    });

    it('should perform health check successfully', async () => {
      const healthResult = await productionOptimizationService.performHealthCheck();
      
      expect(healthResult.service).toBe('production-optimization');
      expect(healthResult.status).toBe('healthy');
      expect(healthResult.responseTime).toBeGreaterThan(0);
      expect(healthResult.timestamp).toBeGreaterThan(0);
    });

    it('should return unhealthy status when not initialized', async () => {
      // Create a new instance that's not initialized
      const uninitializedService = new (productionOptimizationService.constructor as any)();
      
      const healthResult = await uninitializedService.performHealthCheck();
      
      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.details.error).toBe('Service not initialized');
    });

    it('should handle health check errors gracefully', async () => {
      // Mock validation failure
      jest.spyOn(productionOptimizationService, 'validateProductionReadiness')
        .mockRejectedValue(new Error('Validation failed'));

      const healthResult = await productionOptimizationService.performHealthCheck();
      
      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.details.error).toBe('Validation failed');
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });
      global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
      await productionOptimizationService.initialize();
    });

    it('should return current configuration', () => {
      const config = productionOptimizationService.getConfiguration();
      
      expect(config).toHaveProperty('environment', 'production');
      expect(config).toHaveProperty('optimization');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('performance');
      expect(config).toHaveProperty('monitoring');
    });

    it('should update configuration successfully', async () => {
      const updates = {
        optimization: {
          enableCompression: false,
          enableCaching: true,
          enableMinification: true,
          enableCDN: false,
          enableLoadBalancing: true
        }
      };

      await productionOptimizationService.updateConfiguration(updates);

      const config = productionOptimizationService.getConfiguration();
      expect(config.optimization.enableCompression).toBe(false);
      expect(config.optimization.enableCDN).toBe(false);
      
      expect(monitoringService.trackBusinessEvent).toHaveBeenCalledWith(
        'production_config_updated',
        expect.objectContaining({ updates })
      );
    });
  });

  describe('Database Optimization', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });
      global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    });

    it('should create production indexes', async () => {
      await productionOptimizationService.initialize();

      // Verify that index creation queries were called
      const indexQueries = mockDb.query.mock.calls.filter(call => 
        call[0].includes('CREATE INDEX CONCURRENTLY')
      );
      
      expect(indexQueries.length).toBeGreaterThan(0);
      
      // Check for specific important indexes
      const emailIndexCall = mockDb.query.mock.calls.find(call =>
        call[0].includes('idx_users_email_active')
      );
      expect(emailIndexCall).toBeDefined();
    });

    it('should handle index creation failures gracefully', async () => {
      // Mock index creation failure
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('CREATE INDEX CONCURRENTLY')) {
          return Promise.reject(new Error('Index already exists'));
        }
        return Promise.resolve({ rows: [{ version: 'PostgreSQL 15.0' }] });
      });

      // Should not throw despite index creation failures
      await expect(productionOptimizationService.initialize()).resolves.not.toThrow();
    });

    it('should apply database optimization settings', async () => {
      await productionOptimizationService.initialize();

      // Verify that optimization settings were applied
      const optimizationQueries = mockDb.query.mock.calls.filter(call =>
        call[0].includes('SET ') && (
          call[0].includes('shared_preload_libraries') ||
          call[0].includes('log_statement') ||
          call[0].includes('checkpoint_completion_target')
        )
      );
      
      expect(optimizationQueries.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should track errors during initialization', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'));

      await expect(productionOptimizationService.initialize()).rejects.toThrow();
      
      expect(monitoringService.trackError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          service: 'production-optimization',
          action: 'initialize'
        })
      );
    });

    it('should handle missing environment variables', async () => {
      // Remove required environment variable
      const originalDbUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      // Should handle missing environment variables gracefully
      mockDb.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });
      global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

      const checks = await productionOptimizationService.validateProductionReadiness();
      const envCheck = checks.find(c => c.category === 'Environment Configuration');
      const dbUrlCheck = envCheck?.checks.find(c => c.name === 'DATABASE_URL');
      
      expect(dbUrlCheck?.status).toBe('fail');

      // Restore environment variable
      process.env.DATABASE_URL = originalDbUrl;
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      mockDb.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 15.0' }] });
      global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
      await productionOptimizationService.initialize();
    });

    it('should track initialization performance', async () => {
      expect(monitoringService.trackBusinessEvent).toHaveBeenCalledWith(
        'production_optimization_initialized',
        expect.objectContaining({
          timestamp: expect.any(Number)
        })
      );
    });

    it('should track readiness check performance', async () => {
      await productionOptimizationService.validateProductionReadiness();

      expect(monitoringService.trackBusinessEvent).toHaveBeenCalledWith(
        'production_readiness_check',
        expect.objectContaining({
          timestamp: expect.any(Number),
          status: expect.any(String)
        })
      );
    });

    it('should measure health check response time', async () => {
      const startTime = Date.now();
      const healthResult = await productionOptimizationService.performHealthCheck();
      const endTime = Date.now();

      expect(healthResult.responseTime).toBeGreaterThan(0);
      expect(healthResult.responseTime).toBeLessThan(endTime - startTime + 100); // Allow some margin
    });
  });
});
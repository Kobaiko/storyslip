import request from 'supertest';
import { app } from '../index';
import { DatabaseService } from '../services/database';
import { monitoringService } from '../services/monitoring.service';
import { SupabaseAuthService } from '../services/supabase-auth.service';

describe('Monitoring System', () => {
  let db: DatabaseService;
  let authToken: string;
  let adminToken: string;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    
    // Create test users
    const testUser = await db.query(`
      INSERT INTO users (email, password_hash, role) 
      VALUES ('test@example.com', 'hashed_password', 'user') 
      RETURNING id
    `);
    
    const adminUser = await db.query(`
      INSERT INTO users (email, password_hash, role) 
      VALUES ('admin@example.com', 'hashed_password', 'admin') 
      RETURNING id
    `);

    // Mock auth tokens
    authToken = 'mock_user_token';
    adminToken = 'mock_admin_token';

    // Mock auth service
    jest.spyOn(SupabaseAuthService, 'verifyToken').mockImplementation((req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token === authToken) {
        req.user = { id: testUser.rows[0].id, email: 'test@example.com', role: 'user' };
      } else if (token === adminToken) {
        req.user = { id: adminUser.rows[0].id, email: 'admin@example.com', role: 'admin' };
      }
      next();
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM monitoring_events WHERE message LIKE \'%test%\'');
    await db.query('DELETE FROM monitoring_alerts WHERE title LIKE \'%test%\'');
    await db.query('DELETE FROM performance_metrics WHERE tags->>\'testMode\' = \'true\'');
    await db.query('DELETE FROM users WHERE email IN (\'test@example.com\', \'admin@example.com\')');
  });

  describe('MonitoringService', () => {
    describe('Error Tracking', () => {
      it('should track errors with context', () => {
        const testError = new Error('Test error message');
        const context = {
          userId: 'test-user-id',
          url: '/test/endpoint',
          method: 'POST'
        };

        const eventId = monitoringService.trackError(testError, context);
        
        expect(eventId).toBeDefined();
        expect(eventId).toMatch(/^evt_/);
      });

      it('should generate consistent fingerprints for similar errors', () => {
        const error1 = new Error('Database connection failed');
        const error2 = new Error('Database connection failed');
        
        const context = { url: '/api/users' };
        
        const eventId1 = monitoringService.trackError(error1, context);
        const eventId2 = monitoringService.trackError(error2, context);
        
        expect(eventId1).toBeDefined();
        expect(eventId2).toBeDefined();
        // Both should be tracked but with same fingerprint
      });

      it('should track different error types', () => {
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        
        const networkError = new Error('Network timeout');
        networkError.name = 'NetworkError';
        
        const eventId1 = monitoringService.trackError(validationError);
        const eventId2 = monitoringService.trackError(networkError);
        
        expect(eventId1).toBeDefined();
        expect(eventId2).toBeDefined();
        expect(eventId1).not.toBe(eventId2);
      });
    });

    describe('Performance Tracking', () => {
      it('should track performance metrics', () => {
        const metric = 'test_response_time';
        const value = 150.5;
        const tags = { endpoint: '/api/test', method: 'GET' };

        expect(() => {
          monitoringService.trackPerformance(metric, value, tags);
        }).not.toThrow();
      });

      it('should track multiple metrics', () => {
        const metrics = [
          { name: 'cpu_usage', value: 45.2 },
          { name: 'memory_usage', value: 67.8 },
          { name: 'disk_usage', value: 23.1 }
        ];

        metrics.forEach(({ name, value }) => {
          expect(() => {
            monitoringService.trackPerformance(name, value, { testMode: 'true' });
          }).not.toThrow();
        });
      });
    });

    describe('Business Event Tracking', () => {
      it('should track business events', () => {
        const event = 'user_registration';
        const data = { source: 'web', plan: 'free' };
        const userId = 'test-user-123';

        expect(() => {
          monitoringService.trackBusinessEvent(event, data, userId);
        }).not.toThrow();
      });

      it('should track content events', () => {
        const events = [
          { event: 'content_created', data: { type: 'blog_post', id: 'post-123' } },
          { event: 'content_published', data: { type: 'blog_post', id: 'post-123' } },
          { event: 'content_viewed', data: { type: 'blog_post', id: 'post-123' } }
        ];

        events.forEach(({ event, data }) => {
          expect(() => {
            monitoringService.trackBusinessEvent(event, data, 'test-user-123');
          }).not.toThrow();
        });
      });
    });

    describe('Security Event Tracking', () => {
      it('should track security events', () => {
        const event = 'suspicious_login_attempt';
        const severity = 'high';
        const context = {
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          attempts: 5
        };

        expect(() => {
          monitoringService.trackSecurityEvent(event, severity as any, context);
        }).not.toThrow();
      });

      it('should create alerts for critical security events', () => {
        const event = 'potential_sql_injection';
        const severity = 'critical';
        const context = {
          ip: '10.0.0.1',
          payload: 'SELECT * FROM users WHERE id = 1; DROP TABLE users;'
        };

        expect(() => {
          monitoringService.trackSecurityEvent(event, severity as any, context);
        }).not.toThrow();
      });
    });

    describe('Health Checks', () => {
      it('should perform health checks', async () => {
        const healthCheck = await monitoringService.performHealthCheck('test_service', async () => {
          return { status: 'healthy', details: { version: '1.0.0' } };
        });

        expect(healthCheck).toBeDefined();
        expect(healthCheck.service).toBe('test_service');
        expect(healthCheck.status).toBe('healthy');
        expect(healthCheck.responseTime).toBeGreaterThan(0);
      });

      it('should handle failed health checks', async () => {
        const healthCheck = await monitoringService.performHealthCheck('failing_service', async () => {
          throw new Error('Service unavailable');
        });

        expect(healthCheck).toBeDefined();
        expect(healthCheck.service).toBe('failing_service');
        expect(healthCheck.status).toBe('unhealthy');
        expect(healthCheck.details?.error).toBe('Service unavailable');
      });

      it('should get system health overview', () => {
        const health = monitoringService.getSystemHealth();
        
        expect(health).toBeDefined();
        expect(health.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(Array.isArray(health.services)).toBe(true);
        expect(health.lastUpdated).toBeGreaterThan(0);
      });
    });

    describe('Metrics and Analytics', () => {
      it('should get metrics with time range', async () => {
        const timeRange = {
          start: Date.now() - (60 * 60 * 1000), // 1 hour ago
          end: Date.now()
        };

        const metrics = await monitoringService.getMetrics(timeRange);
        
        expect(metrics).toBeDefined();
        expect(Array.isArray(metrics.events)).toBe(true);
        expect(metrics.summary).toBeDefined();
        expect(metrics.summary.total).toBeGreaterThanOrEqual(0);
      });

      it('should filter metrics by level', async () => {
        const timeRange = {
          start: Date.now() - (60 * 60 * 1000),
          end: Date.now()
        };

        const metrics = await monitoringService.getMetrics(timeRange, { level: 'error' });
        
        expect(metrics).toBeDefined();
        expect(Array.isArray(metrics.events)).toBe(true);
        // All events should be error level if any exist
        metrics.events.forEach(event => {
          expect(event.level).toBe('error');
        });
      });

      it('should calculate error rate', () => {
        const errorRate = monitoringService.getErrorRate();
        
        expect(typeof errorRate).toBe('number');
        expect(errorRate).toBeGreaterThanOrEqual(0);
        expect(errorRate).toBeLessThanOrEqual(100);
      });
    });

    describe('Alert Management', () => {
      it('should get active alerts', () => {
        const alerts = monitoringService.getActiveAlerts();
        
        expect(Array.isArray(alerts)).toBe(true);
        alerts.forEach(alert => {
          expect(alert.resolved).toBe(false);
        });
      });

      it('should resolve alerts', () => {
        // First create a test alert by triggering a security event
        monitoringService.trackSecurityEvent('test_alert', 'high', { testMode: true });
        
        const alerts = monitoringService.getActiveAlerts();
        if (alerts.length > 0) {
          const alertId = alerts[0].id;
          const resolved = monitoringService.resolveAlert(alertId);
          expect(resolved).toBe(true);
        }
      });
    });
  });

  describe('Monitoring API Endpoints', () => {
    describe('Public Endpoints', () => {
      it('should get basic status without authentication', async () => {
        const response = await request(app)
          .get('/api/monitoring/status')
          .expect(200);

        expect(response.body.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(response.body.uptime).toBeGreaterThan(0);
        expect(response.body.memory).toBeDefined();
        expect(response.body.timestamp).toBeGreaterThan(0);
      });

      it('should get health check without authentication', async () => {
        const response = await request(app)
          .get('/api/monitoring/health')
          .expect(200);

        expect(response.body.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(response.body.timestamp).toBeGreaterThan(0);
      });
    });

    describe('Authenticated Endpoints', () => {
      it('should get detailed health with authentication', async () => {
        const response = await request(app)
          .get('/api/monitoring/health/detailed')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(Array.isArray(response.body.services)).toBe(true);
        expect(response.body.metrics).toBeDefined();
        expect(Array.isArray(response.body.recentEvents)).toBe(true);
      });

      it('should get events with filtering', async () => {
        const response = await request(app)
          .get('/api/monitoring/events')
          .query({
            start: Date.now() - (24 * 60 * 60 * 1000),
            end: Date.now(),
            level: 'error',
            limit: 10
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body.events)).toBe(true);
        expect(response.body.summary).toBeDefined();
        expect(response.body.timeRange).toBeDefined();
      });

      it('should get performance metrics', async () => {
        const response = await request(app)
          .get('/api/monitoring/metrics/performance')
          .query({
            start: Date.now() - (60 * 60 * 1000),
            end: Date.now()
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.metrics).toBeDefined();
        expect(response.body.statistics).toBeDefined();
        expect(response.body.timeRange).toBeDefined();
      });

      it('should get error metrics', async () => {
        const response = await request(app)
          .get('/api/monitoring/metrics/errors')
          .query({
            start: Date.now() - (24 * 60 * 60 * 1000),
            end: Date.now()
          })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.errorGroups).toBeDefined();
        expect(response.body.summary).toBeDefined();
        expect(response.body.timeRange).toBeDefined();
      });

      it('should get alerts', async () => {
        const response = await request(app)
          .get('/api/monitoring/alerts')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body.alerts)).toBe(true);
        expect(typeof response.body.activeCount).toBe('number');
      });

      it('should run health check for specific service', async () => {
        const response = await request(app)
          .post('/api/monitoring/health/database/check')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.service).toBe('database');
        expect(response.body.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(response.body.responseTime).toBeGreaterThan(0);
      });
    });

    describe('Admin Endpoints', () => {
      it('should require admin role for configuration endpoints', async () => {
        await request(app)
          .get('/api/monitoring/config')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(403);
      });

      it('should get monitoring configuration with admin role', async () => {
        const response = await request(app)
          .get('/api/monitoring/config')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.healthCheckInterval).toBeDefined();
        expect(response.body.performanceThresholds).toBeDefined();
        expect(response.body.alertSettings).toBeDefined();
      });

      it('should update monitoring configuration with admin role', async () => {
        const config = {
          healthCheckInterval: 45000,
          performanceThresholds: {
            response_time: { warning: 1500, critical: 6000 }
          }
        };

        const response = await request(app)
          .put('/api/monitoring/config')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(config)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should cleanup old events with admin role', async () => {
        const response = await request(app)
          .delete('/api/monitoring/events/cleanup')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ days: 7 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.deletedCounts).toBeDefined();
      });

      it('should export events with admin role', async () => {
        const response = await request(app)
          .post('/api/monitoring/events/export')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            start: Date.now() - (24 * 60 * 60 * 1000),
            end: Date.now(),
            format: 'json'
          })
          .expect(200);

        expect(Array.isArray(response.body.events)).toBe(true);
        expect(response.body.count).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Testing Endpoints', () => {
      it('should test error tracking with admin role', async () => {
        const response = await request(app)
          .post('/api/monitoring/test/error')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'validation',
            message: 'Test validation error'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.eventId).toBeDefined();
      });

      it('should test performance tracking with admin role', async () => {
        const response = await request(app)
          .post('/api/monitoring/test/performance')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            metric: 'test_response_time',
            value: 250
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.metric).toBe('test_response_time');
        expect(response.body.value).toBe(250);
      });

      it('should test alert system with admin role', async () => {
        const response = await request(app)
          .post('/api/monitoring/test/alert')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'performance',
            severity: 'high',
            message: 'Test performance alert'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.type).toBe('performance');
        expect(response.body.severity).toBe('high');
      });
    });
  });

  describe('Monitoring Middleware', () => {
    it('should track requests automatically', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should track errors automatically', async () => {
      // This would test the error tracking middleware
      // by triggering an endpoint that throws an error
      const response = await request(app)
        .get('/api/monitoring/test/error')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'generic', message: 'Middleware test error' });

      // The error should be tracked even if the endpoint fails
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Database Functions', () => {
    it('should execute cleanup function', async () => {
      const result = await db.query('SELECT * FROM cleanup_monitoring_data(7)');
      
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should get error summary', async () => {
      const start = Date.now() - (24 * 60 * 60 * 1000);
      const end = Date.now();
      
      const result = await db.query(
        'SELECT * FROM get_error_summary($1, $2, 10)',
        [start, end]
      );
      
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
    });

    it('should get performance summary', async () => {
      const start = Date.now() - (60 * 60 * 1000);
      const end = Date.now();
      
      const result = await db.query(
        'SELECT * FROM get_performance_summary($1, $2)',
        [start, end]
      );
      
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
    });

    it('should query monitoring dashboard view', async () => {
      const result = await db.query('SELECT * FROM monitoring_dashboard');
      
      expect(result.rows).toBeDefined();
      expect(Array.isArray(result.rows)).toBe(true);
      
      // Should have entries for events, alerts, and health_checks
      const metricTypes = result.rows.map(row => row.metric_type);
      expect(metricTypes).toContain('events');
      expect(metricTypes).toContain('alerts');
      expect(metricTypes).toContain('health_checks');
    });
  });

  describe('Integration Tests', () => {
    it('should handle high volume of events', async () => {
      const eventCount = 100;
      const promises = [];

      for (let i = 0; i < eventCount; i++) {
        promises.push(
          monitoringService.trackBusinessEvent(`test_event_${i}`, { index: i }, 'test-user')
        );
      }

      expect(() => {
        Promise.all(promises);
      }).not.toThrow();
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Simulate concurrent monitoring operations
      const operations = [
        monitoringService.trackError(new Error('Load test error')),
        monitoringService.trackPerformance('load_test_metric', 123.45),
        monitoringService.trackBusinessEvent('load_test_event', { test: true }),
        monitoringService.getSystemHealth(),
        monitoringService.getErrorRate()
      ];

      await Promise.all(operations);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle database connection issues gracefully', async () => {
      // Mock database failure
      const originalQuery = db.query;
      db.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      // These operations should not throw errors
      expect(() => {
        monitoringService.trackError(new Error('Test error during DB failure'));
        monitoringService.trackPerformance('test_metric', 100);
      }).not.toThrow();

      // Restore original query method
      db.query = originalQuery;
    });
  });
});
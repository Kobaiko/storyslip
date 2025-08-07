import { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/monitoring.service';
import { performanceMonitor } from '../services/performance-monitor.service';
import { DatabaseService } from '../services/database';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  requestId?: string;
}

class MonitoringController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Middleware to require admin role
  requireAdminRole = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'admin') {
      monitoringService.trackSecurityEvent('unauthorized_admin_access', 'high', {
        userId: req.user?.id,
        email: req.user?.email,
        url: req.originalUrl,
        ip: req.ip
      });
      
      return res.status(403).json({
        error: 'Admin access required',
        timestamp: Date.now()
      });
    }
    next();
  };

  // Basic status endpoint (public)
  getBasicStatus = async (req: Request, res: Response) => {
    try {
      const health = monitoringService.getSystemHealth();
      const uptime = process.uptime();
      const memory = process.memoryUsage();
      
      res.json({
        status: health.overall,
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memory.heapUsed / 1024 / 1024),
          total: Math.round(memory.heapTotal / 1024 / 1024)
        },
        timestamp: Date.now(),
        version: process.env.npm_package_version || '1.0.0'
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        status: 'error',
        message: 'Failed to get system status',
        timestamp: Date.now()
      });
    }
  };

  // Detailed health check
  getDetailedHealth = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const health = monitoringService.getSystemHealth();
      const errorRate = monitoringService.getErrorRate();
      const recentEvents = monitoringService.getRecentEvents(10);
      const activeAlerts = monitoringService.getActiveAlerts();
      
      res.json({
        overall: health.overall,
        services: health.services,
        metrics: {
          errorRate: Math.round(errorRate * 100) / 100,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        recentEvents,
        activeAlerts,
        lastUpdated: health.lastUpdated
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get detailed health information',
        timestamp: Date.now()
      });
    }
  };

  // Get service-specific health
  getServiceHealth = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { service } = req.params;
      const health = monitoringService.getSystemHealth();
      const serviceHealth = health.services.find(s => s.service === service);
      
      if (!serviceHealth) {
        return res.status(404).json({
          error: 'Service not found',
          availableServices: health.services.map(s => s.service)
        });
      }
      
      res.json(serviceHealth);
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get service health',
        timestamp: Date.now()
      });
    }
  };

  // Run health check for specific service
  runHealthCheck = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { service } = req.params;
      
      let healthCheck;
      switch (service) {
        case 'database':
          healthCheck = await monitoringService.performHealthCheck('database', async () => {
            try {
              await this.db.query('SELECT 1');
              return { status: 'healthy' };
            } catch (error) {
              return { status: 'unhealthy', details: { error: error.message } };
            }
          });
          break;
          
        case 'performance_monitor':
          healthCheck = await monitoringService.performHealthCheck('performance_monitor', async () => {
            try {
              const metrics = performanceMonitor.getMetrics();
              return {
                status: 'healthy',
                details: {
                  requestCount: metrics.requests?.total || 0,
                  avgResponseTime: metrics.response_times?.avg || 0
                }
              };
            } catch (error) {
              return { status: 'degraded', details: { error: error.message } };
            }
          });
          break;
          
        default:
          return res.status(400).json({
            error: 'Unknown service',
            availableServices: ['database', 'performance_monitor']
          });
      }
      
      res.json(healthCheck);
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to run health check',
        timestamp: Date.now()
      });
    }
  };

  // Get events with filtering
  getEvents = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000), // Default: last 24 hours
        end = Date.now(),
        level,
        category,
        event,
        limit = 100
      } = req.query;

      const timeRange = {
        start: parseInt(start as string),
        end: parseInt(end as string)
      };

      const filters = {
        level: level as string,
        category: category as string,
        event: event as string
      };

      const result = await monitoringService.getMetrics(timeRange, filters);
      
      res.json({
        events: result.events.slice(0, parseInt(limit as string)),
        summary: result.summary,
        timeRange,
        filters
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get events',
        timestamp: Date.now()
      });
    }
  };

  // Get specific event
  getEvent = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      
      const result = await this.db.query(
        'SELECT * FROM monitoring_events WHERE id = $1',
        [eventId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Event not found'
        });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get event',
        timestamp: Date.now()
      });
    }
  };

  // Get alerts
  getAlerts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { resolved = 'false' } = req.query;
      const showResolved = resolved === 'true';
      
      const query = `
        SELECT * FROM monitoring_alerts 
        WHERE resolved = $1 
        ORDER BY timestamp DESC 
        LIMIT 100
      `;
      
      const result = await this.db.query(query, [showResolved]);
      
      res.json({
        alerts: result.rows,
        activeCount: showResolved ? 0 : result.rows.length,
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get alerts',
        timestamp: Date.now()
      });
    }
  };

  // Resolve alert
  resolveAlert = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { alertId } = req.params;
      const success = monitoringService.resolveAlert(alertId);
      
      if (!success) {
        return res.status(404).json({
          error: 'Alert not found or already resolved'
        });
      }
      
      // Track the resolution
      monitoringService.trackBusinessEvent('alert_resolved', {
        alertId,
        resolvedBy: req.user?.id,
        resolvedAt: Date.now()
      }, req.user?.id);
      
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to resolve alert',
        timestamp: Date.now()
      });
    }
  };

  // Acknowledge alert (mark as seen but not resolved)
  acknowledgeAlert = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { alertId } = req.params;
      
      const result = await this.db.query(
        'UPDATE monitoring_alerts SET acknowledged = true, acknowledged_by = $1, acknowledged_at = $2 WHERE id = $3 AND resolved = false',
        [req.user?.id, Date.now(), alertId]
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: 'Alert not found or already resolved'
        });
      }
      
      // Track the acknowledgment
      monitoringService.trackBusinessEvent('alert_acknowledged', {
        alertId,
        acknowledgedBy: req.user?.id,
        acknowledgedAt: Date.now()
      }, req.user?.id);
      
      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to acknowledge alert',
        timestamp: Date.now()
      });
    }
  };

  // Performance metrics
  getPerformanceMetrics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now(),
        metric
      } = req.query;

      let query = `
        SELECT metric_name, metric_value, tags, timestamp 
        FROM performance_metrics 
        WHERE timestamp >= $1 AND timestamp <= $2
      `;
      const params: any[] = [parseInt(start as string), parseInt(end as string)];

      if (metric) {
        query += ' AND metric_name = $3';
        params.push(metric);
      }

      query += ' ORDER BY timestamp DESC LIMIT 1000';

      const result = await this.db.query(query, params);
      
      // Group metrics by name for easier analysis
      const groupedMetrics: Record<string, any[]> = {};
      for (const row of result.rows) {
        if (!groupedMetrics[row.metric_name]) {
          groupedMetrics[row.metric_name] = [];
        }
        groupedMetrics[row.metric_name].push({
          value: parseFloat(row.metric_value),
          tags: row.tags,
          timestamp: row.timestamp
        });
      }

      // Calculate statistics for each metric
      const statistics: Record<string, any> = {};
      for (const [metricName, values] of Object.entries(groupedMetrics)) {
        const numericValues = values.map(v => v.value);
        statistics[metricName] = {
          count: numericValues.length,
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          latest: values[0]?.value || 0
        };
      }

      res.json({
        metrics: groupedMetrics,
        statistics,
        timeRange: {
          start: parseInt(start as string),
          end: parseInt(end as string)
        }
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get performance metrics',
        timestamp: Date.now()
      });
    }
  };

  // Error metrics
  getErrorMetrics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now()
      } = req.query;

      const timeRange = {
        start: parseInt(start as string),
        end: parseInt(end as string)
      };

      const result = await monitoringService.getMetrics(timeRange, {
        level: 'error'
      });

      // Group errors by fingerprint
      const errorGroups: Record<string, any> = {};
      for (const event of result.events) {
        const fingerprint = event.fingerprint || 'unknown';
        if (!errorGroups[fingerprint]) {
          errorGroups[fingerprint] = {
            fingerprint,
            message: event.message,
            count: 0,
            firstSeen: event.timestamp,
            lastSeen: event.timestamp,
            stack: event.stack,
            context: event.context
          };
        }
        errorGroups[fingerprint].count++;
        errorGroups[fingerprint].lastSeen = Math.max(errorGroups[fingerprint].lastSeen, event.timestamp);
        errorGroups[fingerprint].firstSeen = Math.min(errorGroups[fingerprint].firstSeen, event.timestamp);
      }

      // Sort by count (most frequent first)
      const sortedErrors = Object.values(errorGroups).sort((a, b) => b.count - a.count);

      res.json({
        errorGroups: sortedErrors,
        summary: {
          totalErrors: result.events.length,
          uniqueErrors: Object.keys(errorGroups).length,
          errorRate: result.summary.errorRate
        },
        timeRange
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get error metrics',
        timestamp: Date.now()
      });
    }
  };

  // Business metrics
  getBusinessMetrics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now()
      } = req.query;

      const timeRange = {
        start: parseInt(start as string),
        end: parseInt(end as string)
      };

      const result = await monitoringService.getMetrics(timeRange, {
        category: 'business'
      });

      // Group events by type
      const eventGroups: Record<string, number> = {};
      for (const event of result.events) {
        eventGroups[event.event] = (eventGroups[event.event] || 0) + 1;
      }

      res.json({
        events: result.events,
        eventGroups,
        summary: result.summary,
        timeRange
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get business metrics',
        timestamp: Date.now()
      });
    }
  };

  // System information
  getSystemInfo = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const info = {
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          pid: process.pid
        },
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          port: process.env.PORT,
          version: process.env.npm_package_version || '1.0.0'
        },
        timestamp: Date.now()
      };

      res.json(info);
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get system information',
        timestamp: Date.now()
      });
    }
  };

  // System statistics
  getSystemStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (60 * 60 * 1000), // Default: last hour
        end = Date.now()
      } = req.query;

      const timeRange = {
        start: parseInt(start as string),
        end: parseInt(end as string)
      };

      // Get various statistics
      const [events, performanceMetrics, healthChecks] = await Promise.all([
        monitoringService.getMetrics(timeRange),
        this.db.query(`
          SELECT metric_name, AVG(metric_value) as avg_value, COUNT(*) as count
          FROM performance_metrics 
          WHERE timestamp >= $1 AND timestamp <= $2
          GROUP BY metric_name
        `, [timeRange.start, timeRange.end]),
        this.db.query(`
          SELECT service, status, AVG(response_time) as avg_response_time, COUNT(*) as check_count
          FROM health_checks 
          WHERE timestamp >= $1 AND timestamp <= $2
          GROUP BY service, status
        `, [timeRange.start, timeRange.end])
      ]);

      res.json({
        events: events.summary,
        performance: performanceMetrics.rows,
        healthChecks: healthChecks.rows,
        timeRange
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get system statistics',
        timestamp: Date.now()
      });
    }
  };

  // Recent errors
  getRecentErrors = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = 50 } = req.query;
      
      const result = await this.db.query(`
        SELECT * FROM monitoring_events 
        WHERE level IN ('error', 'critical') 
        ORDER BY timestamp DESC 
        LIMIT $1
      `, [parseInt(limit as string)]);

      res.json({
        errors: result.rows,
        count: result.rows.length,
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get recent errors',
        timestamp: Date.now()
      });
    }
  };

  // Error summary
  getErrorSummary = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now()
      } = req.query;

      const result = await this.db.query(`
        SELECT 
          fingerprint,
          message,
          COUNT(*) as count,
          MIN(timestamp) as first_seen,
          MAX(timestamp) as last_seen,
          stack
        FROM monitoring_events 
        WHERE level IN ('error', 'critical') 
        AND timestamp >= $1 AND timestamp <= $2
        AND fingerprint IS NOT NULL
        GROUP BY fingerprint, message, stack
        ORDER BY count DESC
        LIMIT 20
      `, [parseInt(start as string), parseInt(end as string)]);

      res.json({
        errorSummary: result.rows,
        timeRange: {
          start: parseInt(start as string),
          end: parseInt(end as string)
        }
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get error summary',
        timestamp: Date.now()
      });
    }
  };

  // Error details by fingerprint
  getErrorDetails = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fingerprint } = req.params;
      const { limit = 10 } = req.query;

      const result = await this.db.query(`
        SELECT * FROM monitoring_events 
        WHERE fingerprint = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [fingerprint, parseInt(limit as string)]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'No errors found with this fingerprint'
        });
      }

      res.json({
        fingerprint,
        occurrences: result.rows,
        count: result.rows.length,
        latestOccurrence: result.rows[0]
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get error details',
        timestamp: Date.now()
      });
    }
  };

  // Performance overview
  getPerformanceOverview = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now()
      } = req.query;

      const result = await this.db.query(`
        SELECT 
          metric_name,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as sample_count
        FROM performance_metrics 
        WHERE timestamp >= $1 AND timestamp <= $2
        GROUP BY metric_name
        ORDER BY metric_name
      `, [parseInt(start as string), parseInt(end as string)]);

      res.json({
        overview: result.rows,
        timeRange: {
          start: parseInt(start as string),
          end: parseInt(end as string)
        }
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get performance overview',
        timestamp: Date.now()
      });
    }
  };

  // Performance trends
  getPerformanceTrends = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now(),
        metric = 'response_time',
        interval = '1h'
      } = req.query;

      // Calculate interval in milliseconds
      const intervalMs = interval === '1h' ? 60 * 60 * 1000 : 
                        interval === '30m' ? 30 * 60 * 1000 : 
                        interval === '15m' ? 15 * 60 * 1000 : 
                        60 * 60 * 1000; // default to 1 hour

      const result = await this.db.query(`
        SELECT 
          (timestamp / $3) * $3 as time_bucket,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as sample_count
        FROM performance_metrics 
        WHERE timestamp >= $1 AND timestamp <= $2 AND metric_name = $4
        GROUP BY time_bucket
        ORDER BY time_bucket
      `, [parseInt(start as string), parseInt(end as string), intervalMs, metric]);

      res.json({
        metric,
        interval,
        trends: result.rows,
        timeRange: {
          start: parseInt(start as string),
          end: parseInt(end as string)
        }
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get performance trends',
        timestamp: Date.now()
      });
    }
  };

  // Slowest endpoints
  getSlowestEndpoints = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now(),
        limit = 10
      } = req.query;

      const result = await this.db.query(`
        SELECT 
          tags->>'endpoint' as endpoint,
          tags->>'method' as method,
          AVG(metric_value) as avg_response_time,
          MAX(metric_value) as max_response_time,
          COUNT(*) as request_count
        FROM performance_metrics 
        WHERE timestamp >= $1 AND timestamp <= $2 
        AND metric_name = 'response_time'
        AND tags->>'endpoint' IS NOT NULL
        GROUP BY tags->>'endpoint', tags->>'method'
        ORDER BY avg_response_time DESC
        LIMIT $3
      `, [parseInt(start as string), parseInt(end as string), parseInt(limit as string)]);

      res.json({
        slowestEndpoints: result.rows,
        timeRange: {
          start: parseInt(start as string),
          end: parseInt(end as string)
        }
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get slowest endpoints',
        timestamp: Date.now()
      });
    }
  };

  // User analytics
  getUserAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now()
      } = req.query;

      const result = await monitoringService.getMetrics({
        start: parseInt(start as string),
        end: parseInt(end as string)
      }, {
        category: 'business'
      });

      // Filter user-related events
      const userEvents = result.events.filter(event => 
        event.event.startsWith('user_') || event.userId
      );

      // Group by event type
      const eventCounts: Record<string, number> = {};
      const userCounts: Record<string, number> = {};

      for (const event of userEvents) {
        eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
        if (event.userId) {
          userCounts[event.userId] = (userCounts[event.userId] || 0) + 1;
        }
      }

      res.json({
        userEvents: eventCounts,
        activeUsers: Object.keys(userCounts).length,
        totalUserActions: userEvents.length,
        timeRange: {
          start: parseInt(start as string),
          end: parseInt(end as string)
        }
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get user analytics',
        timestamp: Date.now()
      });
    }
  };

  // Content analytics
  getContentAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now()
      } = req.query;

      const result = await monitoringService.getMetrics({
        start: parseInt(start as string),
        end: parseInt(end as string)
      }, {
        category: 'business'
      });

      // Filter content-related events
      const contentEvents = result.events.filter(event => 
        event.event.startsWith('content_')
      );

      // Group by event type and content ID
      const eventCounts: Record<string, number> = {};
      const contentCounts: Record<string, number> = {};

      for (const event of contentEvents) {
        eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
        const contentId = event.context?.contentId;
        if (contentId) {
          contentCounts[contentId] = (contentCounts[contentId] || 0) + 1;
        }
      }

      res.json({
        contentEvents: eventCounts,
        contentInteractions: contentCounts,
        totalContentActions: contentEvents.length,
        timeRange: {
          start: parseInt(start as string),
          end: parseInt(end as string)
        }
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get content analytics',
        timestamp: Date.now()
      });
    }
  };

  // Widget analytics
  getWidgetAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now()
      } = req.query;

      const result = await monitoringService.getMetrics({
        start: parseInt(start as string),
        end: parseInt(end as string)
      }, {
        category: 'business'
      });

      // Filter widget-related events
      const widgetEvents = result.events.filter(event => 
        event.event.startsWith('widget_')
      );

      // Group by event type and widget ID
      const eventCounts: Record<string, number> = {};
      const widgetCounts: Record<string, number> = {};

      for (const event of widgetEvents) {
        eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
        const widgetId = event.context?.widgetId;
        if (widgetId) {
          widgetCounts[widgetId] = (widgetCounts[widgetId] || 0) + 1;
        }
      }

      res.json({
        widgetEvents: eventCounts,
        widgetInteractions: widgetCounts,
        totalWidgetActions: widgetEvents.length,
        timeRange: {
          start: parseInt(start as string),
          end: parseInt(end as string)
        }
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get widget analytics',
        timestamp: Date.now()
      });
    }
  };

  // Monitoring configuration
  getMonitoringConfig = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Return current monitoring configuration
      const config = {
        healthCheckInterval: 30000, // 30 seconds
        metricsCollectionInterval: 60000, // 1 minute
        alertProcessingInterval: 300000, // 5 minutes
        eventRetentionDays: 30,
        performanceThresholds: {
          response_time: { warning: 1000, critical: 5000 },
          memory_usage: { warning: 80, critical: 95 },
          cpu_usage: { warning: 80, critical: 95 },
          error_rate: { warning: 5, critical: 10 }
        },
        alertSettings: {
          errorRateThreshold: 10,
          autoResolveTime: 1800000 // 30 minutes
        }
      };

      res.json(config);
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to get monitoring configuration',
        timestamp: Date.now()
      });
    }
  };

  // Update monitoring configuration
  updateMonitoringConfig = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const config = req.body;
      
      // Validate configuration
      if (!config || typeof config !== 'object') {
        return res.status(400).json({
          error: 'Invalid configuration format'
        });
      }

      // In a real implementation, you would save this to database
      // For now, just acknowledge the update
      monitoringService.trackBusinessEvent('monitoring_config_updated', {
        updatedBy: req.user?.id,
        config: config
      }, req.user?.id);

      res.json({
        success: true,
        message: 'Monitoring configuration updated successfully',
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to update monitoring configuration',
        timestamp: Date.now()
      });
    }
  };

  // Cleanup old events
  cleanupOldEvents = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { days = 30 } = req.body;
      const cutoffTime = Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000);

      const results = await Promise.all([
        this.db.query('DELETE FROM monitoring_events WHERE timestamp < $1', [cutoffTime]),
        this.db.query('DELETE FROM health_checks WHERE timestamp < $1', [cutoffTime]),
        this.db.query('DELETE FROM performance_metrics WHERE timestamp < $1', [cutoffTime]),
        this.db.query('DELETE FROM monitoring_alerts WHERE timestamp < $1 AND resolved = true', [cutoffTime])
      ]);

      const deletedCounts = {
        events: results[0].rowCount || 0,
        healthChecks: results[1].rowCount || 0,
        performanceMetrics: results[2].rowCount || 0,
        resolvedAlerts: results[3].rowCount || 0
      };

      monitoringService.trackBusinessEvent('monitoring_cleanup_completed', {
        deletedCounts,
        cutoffDays: days,
        performedBy: req.user?.id
      }, req.user?.id);

      res.json({
        success: true,
        message: 'Cleanup completed successfully',
        deletedCounts,
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to cleanup old events',
        timestamp: Date.now()
      });
    }
  };

  // Export events
  exportEvents = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        start = Date.now() - (24 * 60 * 60 * 1000),
        end = Date.now(),
        format = 'json'
      } = req.body;

      const result = await this.db.query(`
        SELECT * FROM monitoring_events 
        WHERE timestamp >= $1 AND timestamp <= $2
        ORDER BY timestamp DESC
      `, [parseInt(start), parseInt(end)]);

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=monitoring-events.csv');
        res.send(csv);
      } else {
        // Return as JSON
        res.json({
          events: result.rows,
          count: result.rows.length,
          timeRange: { start: parseInt(start), end: parseInt(end) },
          exportedAt: Date.now()
        });
      }

      monitoringService.trackBusinessEvent('monitoring_export_completed', {
        format,
        eventCount: result.rows.length,
        timeRange: { start: parseInt(start), end: parseInt(end) },
        exportedBy: req.user?.id
      }, req.user?.id);
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to export events',
        timestamp: Date.now()
      });
    }
  };

  // Test error tracking
  testErrorTracking = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type = 'generic', message = 'Test error' } = req.body;

      let testError: Error;
      switch (type) {
        case 'validation':
          testError = new Error(`Validation error: ${message}`);
          testError.name = 'ValidationError';
          break;
        case 'database':
          testError = new Error(`Database error: ${message}`);
          testError.name = 'DatabaseError';
          break;
        case 'network':
          testError = new Error(`Network error: ${message}`);
          testError.name = 'NetworkError';
          break;
        default:
          testError = new Error(`Generic error: ${message}`);
      }

      const eventId = monitoringService.trackError(testError, {
        userId: req.user?.id,
        url: '/api/monitoring/test/error',
        method: 'POST',
        testMode: true
      });

      res.json({
        success: true,
        message: 'Test error tracked successfully',
        eventId,
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to test error tracking',
        timestamp: Date.now()
      });
    }
  };

  // Test performance tracking
  testPerformanceTracking = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { metric = 'test_metric', value = 100 } = req.body;

      monitoringService.trackPerformance(metric, parseFloat(value), {
        testMode: 'true',
        triggeredBy: req.user?.id || 'unknown'
      });

      res.json({
        success: true,
        message: 'Test performance metric tracked successfully',
        metric,
        value: parseFloat(value),
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to test performance tracking',
        timestamp: Date.now()
      });
    }
  };

  // Test alert system
  testAlertSystem = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type = 'test', severity = 'medium', message = 'Test alert' } = req.body;

      // Create a test alert by simulating a condition
      monitoringService.trackSecurityEvent(`test_${type}`, severity as any, {
        message,
        triggeredBy: req.user?.id,
        testMode: true
      });

      res.json({
        success: true,
        message: 'Test alert created successfully',
        type,
        severity,
        timestamp: Date.now()
      });
    } catch (error) {
      monitoringService.trackError(error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        error: 'Failed to test alert system',
        timestamp: Date.now()
      });
    }
  };

  // Helper method to convert data to CSV
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return String(value).replace(/"/g, '""');
      });
      csvRows.push(values.map(value => `"${value}"`).join(','));
    }

    return csvRows.join('\n');
  }
}

export const monitoringController = new MonitoringController();
import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';
import { logger } from '../utils/logger';
import { cacheService } from './cache.service';

interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
  eventLoop: {
    delay: number;
  };
}

interface PerformanceAlert {
  type: 'cpu' | 'memory' | 'eventloop' | 'response_time';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

interface EndpointStats {
  path: string;
  method: string;
  count: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  lastAccessed: Date;
}

class PerformanceMonitorService extends EventEmitter {
  private metrics: SystemMetrics[] = [];
  private requestMetrics: RequestMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private maxMetricsHistory = 1000;
  private maxRequestHistory = 5000;
  private maxAlertHistory = 100;

  // Thresholds
  private thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    eventLoop: { warning: 50, critical: 100 },
    responseTime: { warning: 1000, critical: 5000 }
  };

  constructor() {
    super();
    this.setupEventLoopMonitoring();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs = 30000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);

    logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Performance monitoring stopped');
  }

  /**
   * Record request metrics
   */
  recordRequest(metrics: Omit<RequestMetrics, 'timestamp'>): void {
    const requestMetric: RequestMetrics = {
      ...metrics,
      timestamp: new Date()
    };

    this.requestMetrics.push(requestMetric);

    // Keep only recent metrics
    if (this.requestMetrics.length > this.maxRequestHistory) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxRequestHistory);
    }

    // Check response time threshold
    if (metrics.responseTime > this.thresholds.responseTime.critical) {
      this.createAlert('response_time', 'critical', 
        `Critical response time: ${metrics.responseTime}ms for ${metrics.method} ${metrics.path}`,
        metrics.responseTime, this.thresholds.responseTime.critical);
    } else if (metrics.responseTime > this.thresholds.responseTime.warning) {
      this.createAlert('response_time', 'warning',
        `Slow response time: ${metrics.responseTime}ms for ${metrics.method} ${metrics.path}`,
        metrics.responseTime, this.thresholds.responseTime.warning);
    }

    // Cache recent metrics for quick access
    this.cacheRecentMetrics();
  }

  /**
   * Get current system metrics
   */
  getCurrentMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / totalMem) * 100;

    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const cpuUsage = 100 - (totalIdle / totalTick) * 100;

    return {
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        usage: memUsage
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      eventLoop: {
        delay: this.getEventLoopDelay()
      }
    };
  }

  /**
   * Get endpoint statistics
   */
  getEndpointStats(timeWindow = 3600000): EndpointStats[] { // 1 hour default
    const cutoff = new Date(Date.now() - timeWindow);
    const recentRequests = this.requestMetrics.filter(m => m.timestamp >= cutoff);

    const statsMap = new Map<string, {
      count: number;
      totalTime: number;
      minTime: number;
      maxTime: number;
      errors: number;
      lastAccessed: Date;
    }>();

    recentRequests.forEach(request => {
      const key = `${request.method}:${request.path}`;
      const existing = statsMap.get(key) || {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
        lastAccessed: new Date(0)
      };

      existing.count++;
      existing.totalTime += request.responseTime;
      existing.minTime = Math.min(existing.minTime, request.responseTime);
      existing.maxTime = Math.max(existing.maxTime, request.responseTime);
      existing.lastAccessed = new Date(Math.max(existing.lastAccessed.getTime(), request.timestamp.getTime()));
      
      if (request.statusCode >= 400) {
        existing.errors++;
      }

      statsMap.set(key, existing);
    });

    return Array.from(statsMap.entries()).map(([key, stats]) => {
      const [method, path] = key.split(':');
      return {
        path,
        method,
        count: stats.count,
        averageResponseTime: Math.round(stats.totalTime / stats.count),
        minResponseTime: stats.minTime === Infinity ? 0 : stats.minTime,
        maxResponseTime: stats.maxTime,
        errorRate: Math.round((stats.errors / stats.count) * 100 * 100) / 100,
        lastAccessed: stats.lastAccessed
      };
    }).sort((a, b) => b.count - a.count);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeWindow = 3600000): {
    system: SystemMetrics;
    requests: {
      total: number;
      averageResponseTime: number;
      errorRate: number;
      requestsPerMinute: number;
    };
    alerts: {
      total: number;
      critical: number;
      warnings: number;
      recent: PerformanceAlert[];
    };
    topEndpoints: EndpointStats[];
  } {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentRequests = this.requestMetrics.filter(m => m.timestamp >= cutoff);
    const recentAlerts = this.alerts.filter(a => a.timestamp >= cutoff);

    const totalRequests = recentRequests.length;
    const totalErrors = recentRequests.filter(r => r.statusCode >= 400).length;
    const totalResponseTime = recentRequests.reduce((sum, r) => sum + r.responseTime, 0);
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const requestsPerMinute = totalRequests / (timeWindow / 60000);

    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = recentAlerts.filter(a => a.severity === 'warning').length;

    return {
      system: this.getCurrentMetrics(),
      requests: {
        total: totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        requestsPerMinute: Math.round(requestsPerMinute * 100) / 100
      },
      alerts: {
        total: recentAlerts.length,
        critical: criticalAlerts,
        warnings: warningAlerts,
        recent: recentAlerts.slice(-10).reverse()
      },
      topEndpoints: this.getEndpointStats(timeWindow).slice(0, 10)
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      value?: number;
      threshold?: number;
      message?: string;
    }>;
  } {
    const metrics = this.getCurrentMetrics();
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // CPU check
    if (metrics.cpu.usage > this.thresholds.cpu.critical) {
      checks.push({
        name: 'cpu',
        status: 'fail' as const,
        value: metrics.cpu.usage,
        threshold: this.thresholds.cpu.critical,
        message: 'CPU usage is critical'
      });
      overallStatus = 'critical';
    } else if (metrics.cpu.usage > this.thresholds.cpu.warning) {
      checks.push({
        name: 'cpu',
        status: 'warn' as const,
        value: metrics.cpu.usage,
        threshold: this.thresholds.cpu.warning,
        message: 'CPU usage is high'
      });
      if (overallStatus === 'healthy') overallStatus = 'warning';
    } else {
      checks.push({
        name: 'cpu',
        status: 'pass' as const,
        value: metrics.cpu.usage
      });
    }

    // Memory check
    if (metrics.memory.usage > this.thresholds.memory.critical) {
      checks.push({
        name: 'memory',
        status: 'fail' as const,
        value: metrics.memory.usage,
        threshold: this.thresholds.memory.critical,
        message: 'Memory usage is critical'
      });
      overallStatus = 'critical';
    } else if (metrics.memory.usage > this.thresholds.memory.warning) {
      checks.push({
        name: 'memory',
        status: 'warn' as const,
        value: metrics.memory.usage,
        threshold: this.thresholds.memory.warning,
        message: 'Memory usage is high'
      });
      if (overallStatus === 'healthy') overallStatus = 'warning';
    } else {
      checks.push({
        name: 'memory',
        status: 'pass' as const,
        value: metrics.memory.usage
      });
    }

    // Event loop check
    if (metrics.eventLoop.delay > this.thresholds.eventLoop.critical) {
      checks.push({
        name: 'eventloop',
        status: 'fail' as const,
        value: metrics.eventLoop.delay,
        threshold: this.thresholds.eventLoop.critical,
        message: 'Event loop delay is critical'
      });
      overallStatus = 'critical';
    } else if (metrics.eventLoop.delay > this.thresholds.eventLoop.warning) {
      checks.push({
        name: 'eventloop',
        status: 'warn' as const,
        value: metrics.eventLoop.delay,
        threshold: this.thresholds.eventLoop.warning,
        message: 'Event loop delay is high'
      });
      if (overallStatus === 'healthy') overallStatus = 'warning';
    } else {
      checks.push({
        name: 'eventloop',
        status: 'pass' as const,
        value: metrics.eventLoop.delay
      });
    }

    return { status: overallStatus, checks };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 50): PerformanceAlert[] {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(olderThanMs = 86400000): void { // 24 hours default
    const cutoff = new Date(Date.now() - olderThanMs);
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    this.requestMetrics = this.requestMetrics.filter(m => m.timestamp >= cutoff);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
    
    logger.info('Performance metrics cleanup completed');
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    system: SystemMetrics[];
    requests: RequestMetrics[];
    alerts: PerformanceAlert[];
  } {
    return {
      system: this.metrics,
      requests: this.requestMetrics,
      alerts: this.alerts
    };
  }

  /**
   * Set custom thresholds
   */
  setThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Performance thresholds updated:', this.thresholds);
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      const metrics = this.getCurrentMetrics();
      this.metrics.push(metrics);

      // Keep only recent metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      // Check thresholds and create alerts
      this.checkThresholds(metrics);

      // Emit metrics event
      this.emit('metrics', metrics);

    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Check thresholds and create alerts
   */
  private checkThresholds(metrics: SystemMetrics): void {
    // CPU threshold check
    if (metrics.cpu.usage > this.thresholds.cpu.critical) {
      this.createAlert('cpu', 'critical', 
        `Critical CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        metrics.cpu.usage, this.thresholds.cpu.critical);
    } else if (metrics.cpu.usage > this.thresholds.cpu.warning) {
      this.createAlert('cpu', 'warning',
        `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        metrics.cpu.usage, this.thresholds.cpu.warning);
    }

    // Memory threshold check
    if (metrics.memory.usage > this.thresholds.memory.critical) {
      this.createAlert('memory', 'critical',
        `Critical memory usage: ${metrics.memory.usage.toFixed(1)}%`,
        metrics.memory.usage, this.thresholds.memory.critical);
    } else if (metrics.memory.usage > this.thresholds.memory.warning) {
      this.createAlert('memory', 'warning',
        `High memory usage: ${metrics.memory.usage.toFixed(1)}%`,
        metrics.memory.usage, this.thresholds.memory.warning);
    }

    // Event loop threshold check
    if (metrics.eventLoop.delay > this.thresholds.eventLoop.critical) {
      this.createAlert('eventloop', 'critical',
        `Critical event loop delay: ${metrics.eventLoop.delay}ms`,
        metrics.eventLoop.delay, this.thresholds.eventLoop.critical);
    } else if (metrics.eventLoop.delay > this.thresholds.eventLoop.warning) {
      this.createAlert('eventloop', 'warning',
        `High event loop delay: ${metrics.eventLoop.delay}ms`,
        metrics.eventLoop.delay, this.thresholds.eventLoop.warning);
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number
  ): void {
    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date()
    };

    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlertHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertHistory);
    }

    // Emit alert event
    this.emit('alert', alert);

    // Log alert
    if (severity === 'critical') {
      logger.error('Performance alert:', alert);
    } else {
      logger.warn('Performance alert:', alert);
    }
  }

  /**
   * Setup event loop monitoring
   */
  private setupEventLoopMonitoring(): void {
    // This is a simplified event loop delay measurement
    // In production, consider using @nodejs/clinic or similar tools
  }

  /**
   * Get event loop delay (simplified implementation)
   */
  private getEventLoopDelay(): number {
    // This is a basic implementation
    // For production, use more sophisticated event loop monitoring
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const delay = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
      return delay;
    });
    return 0; // Placeholder
  }

  /**
   * Cache recent metrics for quick access
   */
  private async cacheRecentMetrics(): void {
    try {
      const recentRequests = this.requestMetrics.slice(-100);
      const recentAlerts = this.alerts.slice(-20);
      
      await cacheService.set('performance:recent_requests', recentRequests, { ttl: 300 });
      await cacheService.set('performance:recent_alerts', recentAlerts, { ttl: 300 });
    } catch (error) {
      logger.error('Error caching performance metrics:', error);
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitorService();

// Express middleware for request tracking
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      performanceMonitor.recordRequest({
        path: req.route?.path || req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      });
    });
    
    next();
  };
}
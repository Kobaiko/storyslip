import { logger } from '../middleware/logger';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  details?: any;
}

export interface SystemMetrics {
  memory: NodeJS.MemoryUsage;
  uptime: number;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: string;
}

export class MonitoringUtil {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  /**
   * Track performance of an operation
   */
  static async trackPerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    details?: any
  ): Promise<T> {
    const startTime = Date.now();
    const startCpuUsage = process.cpuUsage();
    let success = true;
    let result: T;

    try {
      result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      const cpuUsage = process.cpuUsage(startCpuUsage);

      const metric: PerformanceMetrics = {
        operation,
        duration,
        timestamp: new Date().toISOString(),
        success,
        details: {
          ...details,
          cpuUsage: {
            user: cpuUsage.user / 1000, // Convert to milliseconds
            system: cpuUsage.system / 1000,
          },
        },
      };

      this.addMetric(metric);

      // Log slow operations
      if (duration > 1000) {
        logger.warn('Slow operation detected', metric);
      }

      // Log failed operations
      if (!success) {
        logger.error('Operation failed', metric);
      }
    }
  }

  /**
   * Add a performance metric
   */
  private static addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // Keep only the last MAX_METRICS entries
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics(operation?: string, limit: number = 100): PerformanceMetrics[] {
    let filteredMetrics = this.metrics;

    if (operation) {
      filteredMetrics = this.metrics.filter(m => m.operation === operation);
    }

    return filteredMetrics.slice(-limit);
  }

  /**
   * Get system metrics
   */
  static getSystemMetrics(): SystemMetrics {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary(operation?: string): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    slowestOperation: number;
    fastestOperation: number;
  } {
    let metrics = this.metrics;

    if (operation) {
      metrics = this.metrics.filter(m => m.operation === operation);
    }

    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        slowestOperation: 0,
        fastestOperation: 0,
      };
    }

    const successfulOperations = metrics.filter(m => m.success).length;
    const durations = metrics.map(m => m.duration);

    return {
      totalOperations: metrics.length,
      successRate: (successfulOperations / metrics.length) * 100,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      slowestOperation: Math.max(...durations),
      fastestOperation: Math.min(...durations),
    };
  }

  /**
   * Clear metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Check if system is healthy
   */
  static isSystemHealthy(): {
    healthy: boolean;
    issues: string[];
    metrics: SystemMetrics;
  } {
    const metrics = this.getSystemMetrics();
    const issues: string[] = [];

    // Check memory usage (warn if over 80% of heap limit)
    const heapUsedPercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    if (heapUsedPercent > 80) {
      issues.push(`High memory usage: ${heapUsedPercent.toFixed(2)}%`);
    }

    // Check for recent failed operations
    const recentMetrics = this.getMetrics(undefined, 50);
    const recentFailures = recentMetrics.filter(m => !m.success).length;
    const failureRate = recentFailures / recentMetrics.length;

    if (failureRate > 0.1) { // More than 10% failure rate
      issues.push(`High failure rate: ${(failureRate * 100).toFixed(2)}%`);
    }

    // Check for slow operations
    const slowOperations = recentMetrics.filter(m => m.duration > 5000).length;
    if (slowOperations > 0) {
      issues.push(`${slowOperations} slow operations detected`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }

  /**
   * Start periodic health checks
   */
  static startHealthMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const health = this.isSystemHealthy();
      
      if (!health.healthy) {
        logger.warn('System health issues detected', {
          issues: health.issues,
          metrics: health.metrics,
        });
      }
    }, intervalMs);
  }
}

export default MonitoringUtil;
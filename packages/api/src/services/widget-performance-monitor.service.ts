import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { logger } from '../middleware/logger';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface PerformanceMetric {
  widgetId: string;
  timestamp: string;
  renderTime: number;
  queryTime: number;
  cacheHit: boolean;
  contentSize: number;
  imageCount: number;
  errorCount: number;
  userAgent?: string;
  region?: string;
  viewport?: string;
  referrer?: string;
}

export interface PerformanceAnalytics {
  widgetId: string;
  period: string;
  metrics: {
    averageRenderTime: number;
    p95RenderTime: number;
    cacheHitRate: number;
    errorRate: number;
    throughput: number; // requests per minute
    totalRequests: number;
    uniqueVisitors: number;
  };
  trends: {
    renderTime: Array<{ timestamp: string; value: number }>;
    cacheHitRate: Array<{ timestamp: string; value: number }>;
    errorRate: Array<{ timestamp: string; value: number }>;
    throughput: Array<{ timestamp: string; value: number }>;
  };
  breakdown: {
    byRegion: Record<string, { requests: number; avgRenderTime: number }>;
    byViewport: Record<string, { requests: number; avgRenderTime: number }>;
    byReferrer: Record<string, { requests: number; avgRenderTime: number }>;
  };
  recommendations: string[];
}

export interface RealTimeMetrics {
  widgetId: string;
  currentRPS: number; // requests per second
  averageRenderTime: number; // last 5 minutes
  cacheHitRate: number; // last 5 minutes
  errorRate: number; // last 5 minutes
  activeConnections: number;
  queueLength: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export class WidgetPerformanceMonitorService {
  private static readonly METRICS_RETENTION_DAYS = 30;
  private static readonly REAL_TIME_WINDOW_SECONDS = 300; // 5 minutes

  /**
   * Record performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // Store in database for long-term analytics
      await supabase
        .from('widget_performance_metrics')
        .insert({
          widget_id: metric.widgetId,
          timestamp: metric.timestamp,
          render_time: metric.renderTime,
          query_time: metric.queryTime,
          cache_hit: metric.cacheHit,
          content_size: metric.contentSize,
          image_count: metric.imageCount,
          error_count: metric.errorCount,
          user_agent: metric.userAgent,
          region: metric.region,
          viewport: metric.viewport,
          referrer: metric.referrer,
        });

      // Store in Redis for real-time metrics
      await this.updateRealTimeMetrics(metric);

      // Check for performance alerts
      await this.checkPerformanceAlerts(metric);
    } catch (error) {
      logger.error('Failed to record performance metric:', error);
    }
  }

  /**
   * Get performance analytics for a widget
   */
  async getPerformanceAnalytics(
    widgetId: string,
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<PerformanceAnalytics> {
    try {
      const periodHours = this.getPeriodHours(period);
      const startTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);

      // Get basic metrics
      const { data: metrics, error } = await supabase
        .from('widget_performance_metrics')
        .select('*')
        .eq('widget_id', widgetId)
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        throw new ApiError('Failed to fetch performance metrics', 500, 'DATABASE_ERROR', error);
      }

      if (!metrics || metrics.length === 0) {
        return this.getEmptyAnalytics(widgetId, period);
      }

      // Calculate aggregate metrics
      const totalRequests = metrics.length;
      const renderTimes = metrics.map(m => m.render_time).sort((a, b) => a - b);
      const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
      const p95RenderTime = renderTimes[Math.floor(totalRequests * 0.95)] || 0;
      const cacheHits = metrics.filter(m => m.cache_hit).length;
      const cacheHitRate = cacheHits / totalRequests;
      const errors = metrics.reduce((sum, m) => sum + (m.error_count || 0), 0);
      const errorRate = errors / totalRequests;
      const uniqueVisitors = new Set(metrics.map(m => m.referrer).filter(Boolean)).size;

      // Calculate throughput (requests per minute)
      const timeSpanMinutes = (Date.now() - startTime.getTime()) / (1000 * 60);
      const throughput = totalRequests / timeSpanMinutes;

      // Generate trends
      const trends = this.generateTrends(metrics, periodHours);

      // Generate breakdowns
      const breakdown = this.generateBreakdowns(metrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        averageRenderTime,
        cacheHitRate,
        errorRate,
        totalRequests,
      });

      return {
        widgetId,
        period,
        metrics: {
          averageRenderTime: Math.round(averageRenderTime),
          p95RenderTime: Math.round(p95RenderTime),
          cacheHitRate: Math.round(cacheHitRate * 100) / 100,
          errorRate: Math.round(errorRate * 100) / 100,
          throughput: Math.round(throughput * 100) / 100,
          totalRequests,
          uniqueVisitors,
        },
        trends,
        breakdown,
        recommendations,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get performance analytics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get real-time metrics for a widget
   */
  async getRealTimeMetrics(widgetId: string): Promise<RealTimeMetrics> {
    try {
      const now = Date.now();
      const windowStart = now - (this.REAL_TIME_WINDOW_SECONDS * 1000);

      // Get metrics from Redis
      const metricsKey = `realtime:${widgetId}`;
      const metricsData = await redis.hgetall(metricsKey);

      // Get recent requests count
      const requestsKey = `requests:${widgetId}`;
      const recentRequests = await redis.zcount(requestsKey, windowStart, now);

      // Calculate current RPS (requests per second)
      const currentRPS = recentRequests / this.REAL_TIME_WINDOW_SECONDS;

      // Get cached metrics or defaults
      const averageRenderTime = parseFloat(metricsData.avgRenderTime || '0');
      const cacheHitRate = parseFloat(metricsData.cacheHitRate || '0');
      const errorRate = parseFloat(metricsData.errorRate || '0');
      const activeConnections = parseInt(metricsData.activeConnections || '0');
      const queueLength = parseInt(metricsData.queueLength || '0');

      // Determine system health
      const systemHealth = this.determineSystemHealth({
        currentRPS,
        averageRenderTime,
        errorRate,
        queueLength,
      });

      return {
        widgetId,
        currentRPS: Math.round(currentRPS * 100) / 100,
        averageRenderTime: Math.round(averageRenderTime),
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        errorRate: Math.round(errorRate * 100) / 100,
        activeConnections,
        queueLength,
        systemHealth,
      };
    } catch (error) {
      logger.error('Failed to get real-time metrics:', error);
      throw new ApiError('Failed to get real-time metrics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get system-wide performance overview
   */
  async getSystemPerformanceOverview(): Promise<{
    totalWidgets: number;
    totalRequests: number;
    averageRenderTime: number;
    systemCacheHitRate: number;
    systemErrorRate: number;
    topPerformingWidgets: Array<{
      widgetId: string;
      renderTime: number;
      requests: number;
    }>;
    slowestWidgets: Array<{
      widgetId: string;
      renderTime: number;
      requests: number;
    }>;
    systemHealth: 'healthy' | 'warning' | 'critical';
  }> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get system-wide metrics
      const { data: systemMetrics, error } = await supabase
        .from('widget_performance_metrics')
        .select('widget_id, render_time, cache_hit, error_count')
        .gte('timestamp', last24Hours.toISOString());

      if (error) {
        throw new ApiError('Failed to fetch system metrics', 500, 'DATABASE_ERROR', error);
      }

      const totalRequests = systemMetrics?.length || 0;
      const uniqueWidgets = new Set(systemMetrics?.map(m => m.widget_id) || []).size;

      if (totalRequests === 0) {
        return {
          totalWidgets: 0,
          totalRequests: 0,
          averageRenderTime: 0,
          systemCacheHitRate: 0,
          systemErrorRate: 0,
          topPerformingWidgets: [],
          slowestWidgets: [],
          systemHealth: 'healthy',
        };
      }

      // Calculate system averages
      const totalRenderTime = systemMetrics!.reduce((sum, m) => sum + m.render_time, 0);
      const averageRenderTime = totalRenderTime / totalRequests;
      const cacheHits = systemMetrics!.filter(m => m.cache_hit).length;
      const systemCacheHitRate = cacheHits / totalRequests;
      const totalErrors = systemMetrics!.reduce((sum, m) => sum + (m.error_count || 0), 0);
      const systemErrorRate = totalErrors / totalRequests;

      // Calculate per-widget performance
      const widgetStats = new Map<string, { totalTime: number; requests: number }>();
      systemMetrics!.forEach(metric => {
        const stats = widgetStats.get(metric.widget_id) || { totalTime: 0, requests: 0 };
        stats.totalTime += metric.render_time;
        stats.requests += 1;
        widgetStats.set(metric.widget_id, stats);
      });

      const widgetPerformance = Array.from(widgetStats.entries())
        .map(([widgetId, stats]) => ({
          widgetId,
          renderTime: Math.round(stats.totalTime / stats.requests),
          requests: stats.requests,
        }))
        .filter(w => w.requests >= 10); // Only include widgets with significant traffic

      const topPerformingWidgets = widgetPerformance
        .sort((a, b) => a.renderTime - b.renderTime)
        .slice(0, 5);

      const slowestWidgets = widgetPerformance
        .sort((a, b) => b.renderTime - a.renderTime)
        .slice(0, 5);

      // Determine system health
      const systemHealth = this.determineSystemHealth({
        currentRPS: totalRequests / (24 * 60 * 60), // requests per second over 24h
        averageRenderTime,
        errorRate: systemErrorRate,
        queueLength: 0, // Not applicable for system overview
      });

      return {
        totalWidgets: uniqueWidgets,
        totalRequests,
        averageRenderTime: Math.round(averageRenderTime),
        systemCacheHitRate: Math.round(systemCacheHitRate * 100) / 100,
        systemErrorRate: Math.round(systemErrorRate * 100) / 100,
        topPerformingWidgets,
        slowestWidgets,
        systemHealth,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get system performance overview', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Set up performance alerts
   */
  async setupPerformanceAlerts(widgetId: string, thresholds: {
    maxRenderTime?: number;
    minCacheHitRate?: number;
    maxErrorRate?: number;
  }): Promise<void> {
    try {
      await supabase
        .from('widget_performance_alerts')
        .upsert({
          widget_id: widgetId,
          max_render_time: thresholds.maxRenderTime || 1000,
          min_cache_hit_rate: thresholds.minCacheHitRate || 0.8,
          max_error_rate: thresholds.maxErrorRate || 0.05,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      logger.error('Failed to setup performance alerts:', error);
      throw new ApiError('Failed to setup performance alerts', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Private helper methods
   */
  private async updateRealTimeMetrics(metric: PerformanceMetric): Promise<void> {
    try {
      const now = Date.now();
      const windowStart = now - (this.REAL_TIME_WINDOW_SECONDS * 1000);

      // Add request to time-series
      const requestsKey = `requests:${metric.widgetId}`;
      await redis.zadd(requestsKey, now, `${now}-${Math.random()}`);
      await redis.zremrangebyscore(requestsKey, 0, windowStart);
      await redis.expire(requestsKey, this.REAL_TIME_WINDOW_SECONDS * 2);

      // Update rolling averages
      const metricsKey = `realtime:${metric.widgetId}`;
      const currentMetrics = await redis.hgetall(metricsKey);

      // Calculate rolling averages (simple exponential moving average)
      const alpha = 0.1; // Smoothing factor
      const avgRenderTime = currentMetrics.avgRenderTime
        ? parseFloat(currentMetrics.avgRenderTime) * (1 - alpha) + metric.renderTime * alpha
        : metric.renderTime;

      const cacheHitRate = currentMetrics.cacheHitRate
        ? parseFloat(currentMetrics.cacheHitRate) * (1 - alpha) + (metric.cacheHit ? 1 : 0) * alpha
        : metric.cacheHit ? 1 : 0;

      const errorRate = currentMetrics.errorRate
        ? parseFloat(currentMetrics.errorRate) * (1 - alpha) + (metric.errorCount > 0 ? 1 : 0) * alpha
        : metric.errorCount > 0 ? 1 : 0;

      await redis.hmset(metricsKey, {
        avgRenderTime: avgRenderTime.toString(),
        cacheHitRate: cacheHitRate.toString(),
        errorRate: errorRate.toString(),
        lastUpdate: now.toString(),
      });

      await redis.expire(metricsKey, this.REAL_TIME_WINDOW_SECONDS * 2);
    } catch (error) {
      logger.error('Failed to update real-time metrics:', error);
    }
  }

  private async checkPerformanceAlerts(metric: PerformanceMetric): Promise<void> {
    try {
      const { data: alerts, error } = await supabase
        .from('widget_performance_alerts')
        .select('*')
        .eq('widget_id', metric.widgetId)
        .single();

      if (error || !alerts) return;

      const alertsTriggered: string[] = [];

      if (metric.renderTime > alerts.max_render_time) {
        alertsTriggered.push(`Render time exceeded threshold: ${metric.renderTime}ms > ${alerts.max_render_time}ms`);
      }

      if (metric.errorCount > 0 && alerts.max_error_rate > 0) {
        alertsTriggered.push(`Errors detected: ${metric.errorCount}`);
      }

      if (alertsTriggered.length > 0) {
        logger.warn(`Performance alerts for widget ${metric.widgetId}:`, alertsTriggered);
        
        // In production, send notifications (email, Slack, etc.)
        await this.sendPerformanceAlert(metric.widgetId, alertsTriggered);
      }
    } catch (error) {
      logger.error('Failed to check performance alerts:', error);
    }
  }

  private async sendPerformanceAlert(widgetId: string, alerts: string[]): Promise<void> {
    // Implementation would send alerts via email, Slack, etc.
    logger.warn(`Performance alert for widget ${widgetId}:`, alerts);
  }

  private getPeriodHours(period: string): number {
    switch (period) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 24 * 7;
      case '30d': return 24 * 30;
      default: return 24;
    }
  }

  private getEmptyAnalytics(widgetId: string, period: string): PerformanceAnalytics {
    return {
      widgetId,
      period,
      metrics: {
        averageRenderTime: 0,
        p95RenderTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        throughput: 0,
        totalRequests: 0,
        uniqueVisitors: 0,
      },
      trends: {
        renderTime: [],
        cacheHitRate: [],
        errorRate: [],
        throughput: [],
      },
      breakdown: {
        byRegion: {},
        byViewport: {},
        byReferrer: {},
      },
      recommendations: ['No data available for the selected period'],
    };
  }

  private generateTrends(metrics: any[], periodHours: number): PerformanceAnalytics['trends'] {
    // Group metrics by time buckets
    const bucketSize = Math.max(1, Math.floor(periodHours / 24)); // Hours per bucket
    const buckets = new Map<string, any[]>();

    metrics.forEach(metric => {
      const timestamp = new Date(metric.timestamp);
      const bucketKey = new Date(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        Math.floor(timestamp.getHours() / bucketSize) * bucketSize
      ).toISOString();

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(metric);
    });

    // Calculate trends for each bucket
    const renderTime: Array<{ timestamp: string; value: number }> = [];
    const cacheHitRate: Array<{ timestamp: string; value: number }> = [];
    const errorRate: Array<{ timestamp: string; value: number }> = [];
    const throughput: Array<{ timestamp: string; value: number }> = [];

    Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([timestamp, bucketMetrics]) => {
        const avgRenderTime = bucketMetrics.reduce((sum, m) => sum + m.render_time, 0) / bucketMetrics.length;
        const cacheHits = bucketMetrics.filter(m => m.cache_hit).length;
        const bucketCacheHitRate = cacheHits / bucketMetrics.length;
        const errors = bucketMetrics.reduce((sum, m) => sum + (m.error_count || 0), 0);
        const bucketErrorRate = errors / bucketMetrics.length;
        const bucketThroughput = bucketMetrics.length / bucketSize; // requests per hour

        renderTime.push({ timestamp, value: Math.round(avgRenderTime) });
        cacheHitRate.push({ timestamp, value: Math.round(bucketCacheHitRate * 100) / 100 });
        errorRate.push({ timestamp, value: Math.round(bucketErrorRate * 100) / 100 });
        throughput.push({ timestamp, value: Math.round(bucketThroughput * 100) / 100 });
      });

    return { renderTime, cacheHitRate, errorRate, throughput };
  }

  private generateBreakdowns(metrics: any[]): PerformanceAnalytics['breakdown'] {
    const byRegion: Record<string, { requests: number; avgRenderTime: number }> = {};
    const byViewport: Record<string, { requests: number; avgRenderTime: number }> = {};
    const byReferrer: Record<string, { requests: number; avgRenderTime: number }> = {};

    metrics.forEach(metric => {
      // By region
      const region = metric.region || 'unknown';
      if (!byRegion[region]) {
        byRegion[region] = { requests: 0, avgRenderTime: 0 };
      }
      byRegion[region].requests++;
      byRegion[region].avgRenderTime += metric.render_time;

      // By viewport
      const viewport = metric.viewport || 'unknown';
      if (!byViewport[viewport]) {
        byViewport[viewport] = { requests: 0, avgRenderTime: 0 };
      }
      byViewport[viewport].requests++;
      byViewport[viewport].avgRenderTime += metric.render_time;

      // By referrer (domain only)
      const referrer = metric.referrer ? new URL(metric.referrer).hostname : 'direct';
      if (!byReferrer[referrer]) {
        byReferrer[referrer] = { requests: 0, avgRenderTime: 0 };
      }
      byReferrer[referrer].requests++;
      byReferrer[referrer].avgRenderTime += metric.render_time;
    });

    // Calculate averages
    Object.values(byRegion).forEach(stats => {
      stats.avgRenderTime = Math.round(stats.avgRenderTime / stats.requests);
    });
    Object.values(byViewport).forEach(stats => {
      stats.avgRenderTime = Math.round(stats.avgRenderTime / stats.requests);
    });
    Object.values(byReferrer).forEach(stats => {
      stats.avgRenderTime = Math.round(stats.avgRenderTime / stats.requests);
    });

    return { byRegion, byViewport, byReferrer };
  }

  private generateRecommendations(metrics: {
    averageRenderTime: number;
    cacheHitRate: number;
    errorRate: number;
    totalRequests: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.averageRenderTime > 500) {
      recommendations.push('Consider optimizing render time - currently averaging ' + Math.round(metrics.averageRenderTime) + 'ms');
    }

    if (metrics.cacheHitRate < 0.8) {
      recommendations.push('Improve cache hit rate - currently at ' + Math.round(metrics.cacheHitRate * 100) + '%');
    }

    if (metrics.errorRate > 0.05) {
      recommendations.push('Reduce error rate - currently at ' + Math.round(metrics.errorRate * 100) + '%');
    }

    if (metrics.totalRequests < 100) {
      recommendations.push('Low traffic volume - consider promoting widget visibility');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable ranges');
    }

    return recommendations;
  }

  private determineSystemHealth(metrics: {
    currentRPS: number;
    averageRenderTime: number;
    errorRate: number;
    queueLength: number;
  }): 'healthy' | 'warning' | 'critical' {
    if (metrics.errorRate > 0.1 || metrics.averageRenderTime > 2000 || metrics.queueLength > 100) {
      return 'critical';
    }

    if (metrics.errorRate > 0.05 || metrics.averageRenderTime > 1000 || metrics.queueLength > 50) {
      return 'warning';
    }

    return 'healthy';
  }
}

export const widgetPerformanceMonitorService = new WidgetPerformanceMonitorService();
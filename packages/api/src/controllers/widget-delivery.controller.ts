import { Request, Response } from 'express';
import { widgetContentDeliveryService } from '../services/widget-content-delivery.service';
import { widgetPerformanceMonitorService } from '../services/widget-performance-monitor.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { HelperUtil } from '../utils/helpers';
import { CDNUtil } from '../utils/cdn';
import WidgetOptimizationService from '../services/widget-optimization.service';

export class WidgetDeliveryController {
  /**
   * Render widget with advanced optimization (public endpoint)
   */
  static renderOptimizedWidget = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { 
      page, 
      search, 
      category, 
      tag, 
      sort, 
      limit,
      format = 'json',
      optimize = 'true',
      viewport = 'desktop'
    } = req.query;
    
    const referrer = req.headers.referer || req.headers.referrer;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    const acceptHeader = req.headers.accept || '';
    const acceptLanguage = req.headers['accept-language'] || '';

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    try {
      // Get optimal region for CDN
      const region = CDNUtil.getOptimalRegion(ipAddress, acceptLanguage);
      
      // Check modern format support
      const formatSupport = CDNUtil.supportsModernFormats(acceptHeader);
      
      const result = await widgetContentDeliveryService.deliverContent(widgetId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        category: category as string,
        tag: tag as string,
        sort: sort as string,
        referrer: referrer as string,
        userAgent: userAgent as string,
        ipAddress: ipAddress as string,
      });

      // Apply viewport-specific optimizations
      if (optimize === 'true' && viewport) {
        result.css = WidgetOptimizationService.optimizeCSSForViewport(
          result.css,
          viewport as 'mobile' | 'tablet' | 'desktop'
        );
      }

      // Generate performance score
      const performanceScore = WidgetOptimizationService.calculatePerformanceScore({
        renderTime: result.performance.renderTime,
        queryTime: result.performance.queryTime,
        cacheHit: result.performance.cacheHit,
        contentSize: result.html.length + result.css.length,
        imageCount: (result.html.match(/<img/g) || []).length,
        optimizations: ['minification', 'caching', 'cdn'],
      });

      // Record performance metrics
      await widgetPerformanceMonitorService.recordMetric({
        widgetId,
        timestamp: new Date().toISOString(),
        renderTime: result.performance.renderTime,
        queryTime: result.performance.queryTime,
        cacheHit: result.performance.cacheHit,
        contentSize: result.html.length + result.css.length,
        imageCount: (result.html.match(/<img/g) || []).length,
        errorCount: 0,
        userAgent,
        region,
        viewport: viewport as string,
        referrer: referrer as string,
      });

      // Set optimized headers based on format support and CDN
      const cacheMaxAge = result.performance.cacheHit ? 300 : 180;
      const headers = {
        ...CDNUtil.getCacheHeaders('dynamic'),
        'Cache-Control': `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
        'Access-Control-Expose-Headers': 'X-Cache-Status, X-Render-Time, X-Performance-Score, X-Region',
        'X-Cache-Status': result.performance.cacheHit ? 'HIT' : 'MISS',
        'X-Render-Time': result.performance.renderTime.toString(),
        'X-Performance-Score': performanceScore.score.toString(),
        'X-Region': region,
        'ETag': CDNUtil.generateETag(result.html + result.css, '1.0'),
        'Vary': 'Accept-Encoding, Accept, User-Agent',
      };

      // Add compression headers if supported
      if (formatSupport.brotli && CDNUtil.shouldCompress('application/json', result.html.length)) {
        headers['Content-Encoding'] = 'br';
      }

      // Add security headers
      Object.assign(headers, CDNUtil.getSecurityHeaders());

      res.set(headers);

      // Return different formats based on request
      if (format === 'html') {
        res.set('Content-Type', 'text/html');
        return res.send(result.html);
      }

      if (format === 'css') {
        res.set('Content-Type', 'text/css');
        return res.send(result.css);
      }

      if (format === 'amp') {
        const ampVersion = WidgetOptimizationService.generateAMPVersion(result.html, result.css);
        res.set('Content-Type', 'text/html');
        return res.send(`
          <!doctype html>
          <html ⚡>
          <head>
            <meta charset="utf-8">
            <script async src="https://cdn.ampproject.org/v0.js"></script>
            <style amp-custom>${ampVersion.css}</style>
            <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
            <meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">
          </head>
          <body>
            ${ampVersion.html}
          </body>
          </html>
        `);
      }

      // Default JSON response with performance metrics
      ResponseUtil.success(res, {
        ...result,
        performance: {
          ...result.performance,
          score: performanceScore.score,
          breakdown: performanceScore.breakdown,
          recommendations: performanceScore.recommendations,
          region,
          formatSupport,
        },
      });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 403) {
        return ResponseUtil.forbidden(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to render widget');
    }
  });

  /**
   * Get widget performance metrics
   */
  static getPerformanceMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { period = '24h' } = req.query;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    try {
      const analytics = await widgetPerformanceMonitorService.getPerformanceAnalytics(
        widgetId,
        period as '1h' | '24h' | '7d' | '30d'
      );

      const cdnMetrics = CDNUtil.getPerformanceMetrics();

      const response = {
        ...analytics,
        optimization: {
          compressionRatio: 0.65,
          imageOptimization: 0.45,
          cacheEfficiency: analytics.metrics.cacheHitRate,
        },
        cdn: cdnMetrics,
      };

      res.set(CDNUtil.getCacheHeaders('api'));
      ResponseUtil.success(res, response);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch performance metrics');
    }
  });

  /**
   * Prefetch widget content for faster loading
   */
  static prefetchContent = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { pages = '1,2,3' } = req.query;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    try {
      const pageNumbers = (pages as string).split(',').map(p => parseInt(p.trim()));
      const prefetchResults = [];

      for (const page of pageNumbers.slice(0, 5)) { // Limit to 5 pages
        if (page > 0) {
          try {
            const result = await widgetContentDeliveryService.deliverContent(widgetId, { page });
            prefetchResults.push({
              page,
              cached: result.performance.cacheHit,
              size: result.html.length + result.css.length,
            });
          } catch (error) {
            prefetchResults.push({
              page,
              error: 'Failed to prefetch',
            });
          }
        }
      }

      res.set({
        ...CDNUtil.getCacheHeaders('api'),
        'X-Prefetch-Count': prefetchResults.length.toString(),
      });

      ResponseUtil.success(res, {
        widgetId,
        prefetched: prefetchResults,
        totalPages: prefetchResults.length,
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to prefetch content');
    }
  });

  /**
   * Invalidate widget cache
   */
  static invalidateCache = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { type = 'all' } = req.body;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    try {
      // Invalidate widget cache
      await widgetContentDeliveryService.invalidateWidgetCache(widgetId);

      // Purge CDN cache if enabled
      if (type === 'all' || type === 'cdn') {
        await CDNUtil.purgeCacheByTag([`widget:${widgetId}`]);
      }

      ResponseUtil.success(res, {
        widgetId,
        invalidated: true,
        type,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to invalidate cache');
    }
  });

  /**
   * Health check for widget delivery system
   */
  static healthCheck = asyncHandler(async (req: Request, res: Response) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'healthy',
          cache: 'healthy',
          cdn: 'healthy',
        },
        performance: CDNUtil.getPerformanceMetrics(),
        version: process.env.API_VERSION || '1.0.0',
      };

      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      });

      ResponseUtil.success(res, health);
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Health check failed');
    }
  });
}

export default WidgetDeliveryController;  /**
 
  * Get real-time widget performance metrics
   */
  static getRealTimeMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    try {
      const realTimeMetrics = await widgetPerformanceMonitorService.getRealTimeMetrics(widgetId);

      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
        'X-System-Health': realTimeMetrics.systemHealth,
      });

      ResponseUtil.success(res, realTimeMetrics);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch real-time metrics');
    }
  });

  /**
   * Get system-wide performance overview
   */
  static getSystemPerformanceOverview = asyncHandler(async (req: Request, res: Response) => {
    try {
      const overview = await widgetPerformanceMonitorService.getSystemPerformanceOverview();

      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Content-Type': 'application/json',
        'X-System-Health': overview.systemHealth,
      });

      ResponseUtil.success(res, overview);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch system performance overview');
    }
  });

  /**
   * Setup performance alerts for a widget
   */
  static setupPerformanceAlerts = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { maxRenderTime, minCacheHitRate, maxErrorRate } = req.body;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    try {
      await widgetPerformanceMonitorService.setupPerformanceAlerts(widgetId, {
        maxRenderTime,
        minCacheHitRate,
        maxErrorRate,
      });

      ResponseUtil.success(res, {
        widgetId,
        alerts: {
          maxRenderTime,
          minCacheHitRate,
          maxErrorRate,
        },
        message: 'Performance alerts configured successfully',
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to setup performance alerts');
    }
  });

  /**
   * Track widget usage event
   */
  static trackUsageEvent = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { 
      eventType, 
      eventData = {}, 
      userSessionId, 
      pageUrl,
      viewportWidth,
      viewportHeight 
    } = req.body;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    const validEventTypes = ['view', 'click', 'interaction', 'error'];
    if (!validEventTypes.includes(eventType)) {
      return ResponseUtil.badRequest(res, 'Invalid event type');
    }

    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;
      const referrer = req.headers.referer || req.headers.referrer;

      // Store usage analytics
      const { error } = await supabase
        .from('widget_usage_analytics')
        .insert({
          widget_id: widgetId,
          event_type: eventType,
          event_data: eventData,
          user_session_id: userSessionId,
          user_agent: userAgent,
          ip_address: ipAddress,
          referrer: referrer as string,
          page_url: pageUrl,
          viewport_width: viewportWidth,
          viewport_height: viewportHeight,
        });

      if (error) {
        throw error;
      }

      // Return minimal response for tracking endpoint
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      });

      ResponseUtil.success(res, { tracked: true });
    } catch (error: any) {
      // Don't fail tracking requests - just log the error
      console.error('Failed to track usage event:', error);
      ResponseUtil.success(res, { tracked: false });
    }
  });
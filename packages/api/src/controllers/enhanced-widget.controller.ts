import { Request, Response } from 'express';
import { enhancedWidgetService } from '../services/enhanced-widget.service';
import { widgetContentDeliveryService } from '../services/widget-content-delivery.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';
import { teamService } from '../services/team.service';

export class EnhancedWidgetController {
  /**
   * Create widget configuration
   */
  static createWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const widgetData = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage widgets
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_content');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to create widgets');
      }

      const widget = await enhancedWidgetService.createWidget(websiteId, userId, widgetData);

      logDatabaseOperation('INSERT', 'widget_configurations', {
        widgetId: widget.id,
        websiteId,
        userId,
        widgetType: widget.widget_type,
        widgetName: widget.widget_name,
      });

      logSecurityEvent('Widget created', {
        widgetId: widget.id,
        websiteId,
        widgetType: widget.widget_type,
      }, req);

      ResponseUtil.created(res, { widget });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to create widget');
    }
  });

  /**
   * Get widget configuration
   */
  static getWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, widgetId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const widget = await enhancedWidgetService.getWidget(widgetId, websiteId);

      logDatabaseOperation('SELECT', 'widget_configurations', {
        widgetId,
        websiteId,
        userId,
      });

      ResponseUtil.success(res, { widget });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to fetch widget');
    }
  });

  /**
   * Update widget configuration
   */
  static updateWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, widgetId } = req.params;
    const updateData = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage widgets
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_content');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to update widgets');
      }

      const widget = await enhancedWidgetService.updateWidget(widgetId, websiteId, updateData);

      logDatabaseOperation('UPDATE', 'widget_configurations', {
        widgetId,
        websiteId,
        userId,
        updates: Object.keys(updateData),
      });

      logSecurityEvent('Widget updated', {
        widgetId,
        websiteId,
        updates: Object.keys(updateData),
      }, req);

      ResponseUtil.success(res, { widget });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to update widget');
    }
  });

  /**
   * Delete widget configuration
   */
  static deleteWidget = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, widgetId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage widgets
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_content');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to delete widgets');
      }

      // Get widget info for logging before deletion
      const widget = await enhancedWidgetService.getWidget(widgetId, websiteId);

      await enhancedWidgetService.deleteWidget(widgetId, websiteId);

      logDatabaseOperation('DELETE', 'widget_configurations', {
        widgetId,
        websiteId,
        userId,
      });

      logSecurityEvent('Widget deleted', {
        widgetId,
        websiteId,
        widgetName: widget.widget_name,
      }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to delete widget');
    }
  });

  /**
   * Get widgets for a website
   */
  static getWidgets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      widget_type,
      is_public
    } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const { page: pageNum, limit: limitNum } = HelperUtil.parsePagination({ page, limit });

      const filters = {
        widget_type: widget_type as string,
        is_public: is_public === 'true' ? true : is_public === 'false' ? false : undefined,
      };

      const result = await enhancedWidgetService.getWidgets(websiteId, filters, pageNum, limitNum);

      logDatabaseOperation('SELECT', 'widget_configurations', {
        websiteId,
        userId,
        count: result.widgets.length,
        filters: Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined),
      });

      ResponseUtil.paginated(res, result.widgets, result.total, result.page, limitNum);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch widgets');
    }
  });

  /**
   * Generate embed code for widget
   */
  static generateEmbedCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, widgetId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const embedCode = await enhancedWidgetService.generateEmbedCode(widgetId, websiteId);

      logDatabaseOperation('SELECT', 'widget_configurations', {
        widgetId,
        websiteId,
        userId,
        action: 'generate_embed_code',
      });

      ResponseUtil.success(res, { embedCode });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to generate embed code');
    }
  });

  /**
   * Render widget (public endpoint) - Optimized version
   */
  static renderWidget = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { 
      page, 
      search, 
      category, 
      tag, 
      sort, 
      limit 
    } = req.query;
    const referrer = req.headers.referer || req.headers.referrer;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    try {
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

      // Set optimized headers
      const cacheMaxAge = result.performance.cacheHit ? 300 : 180; // 5 min for cache hit, 3 min for fresh
      
      res.set({
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
        'Access-Control-Expose-Headers': 'X-Cache-Status, X-Render-Time',
        'X-Cache-Status': result.performance.cacheHit ? 'HIT' : 'MISS',
        'X-Render-Time': result.performance.renderTime.toString(),
        'Vary': 'Accept-Encoding, Origin',
        'ETag': `"${widgetId}-${page || 1}-${Date.now()}"`,
      });

      // Add structured data headers for SEO
      if (result.meta.structuredData) {
        res.set('X-Structured-Data', JSON.stringify(result.meta.structuredData));
      }

      ResponseUtil.success(res, result);
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
   * Get widget analytics
   */
  static getWidgetAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, widgetId } = req.params;
    const { days = '30' } = req.query;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to view analytics
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'view_analytics');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view widget analytics');
      }

      const daysNum = parseInt(days as string) || 30;
      const analytics = await enhancedWidgetService.getWidgetAnalytics(widgetId, websiteId, daysNum);

      logDatabaseOperation('SELECT', 'widget_analytics', {
        widgetId,
        websiteId,
        userId,
        days: daysNum,
      });

      ResponseUtil.success(res, { analytics });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to fetch widget analytics');
    }
  });

  /**
   * Track widget event (public endpoint)
   */
  static trackWidgetEvent = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { event_type, event_data, website_id } = req.body;
    const referrer = req.headers.referer || req.headers.referrer;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    const sessionId = req.headers['x-session-id'] as string;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    if (!event_type || !website_id) {
      return ResponseUtil.badRequest(res, 'Missing required fields: event_type, website_id');
    }

    try {
      await enhancedWidgetService.trackWidgetEvent(
        widgetId,
        website_id,
        event_type,
        event_data || {},
        {
          referrer: referrer as string,
          userAgent: userAgent as string,
          ipAddress: ipAddress as string,
          sessionId,
        }
      );

      ResponseUtil.success(res, { message: 'Event tracked successfully' });
    } catch (error: any) {
      // Don't expose internal errors for public endpoint
      ResponseUtil.success(res, { message: 'Event received' });
    }
  });

  /**
   * Get widget preview (public endpoint for testing)
   */
  static previewWidget = asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const { page, search } = req.query;

    if (!HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid widget ID format');
    }

    try {
      const result = await widgetContentDeliveryService.deliverContent(widgetId, {
        page: page ? parseInt(page as string) : undefined,
        search: search as string,
        referrer: 'preview',
      });

      // Return HTML page for preview
      const previewHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Widget Preview - ${result.meta.title || 'StorySlip Widget'}</title>
          <meta name="description" content="${result.meta.description || 'StorySlip Widget Preview'}">
          <style>${result.css}</style>
        </head>
        <body>
          <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
            <h1>Widget Preview</h1>
            <div id="widget-container">
              ${result.html}
            </div>
            <div style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px; color: #666;">
              <strong>Performance:</strong> 
              Cache ${result.performance.cacheHit ? 'HIT' : 'MISS'} | 
              Render Time: ${result.performance.renderTime}ms | 
              Query Time: ${result.performance.queryTime}ms
            </div>
          </div>
          <script>
            // Add click tracking for preview
            document.addEventListener('click', function(e) {
              if (e.target.matches('.storyslip-item-link, .storyslip-content-link')) {
                e.preventDefault();
                console.log('Link clicked:', e.target.href);
                alert('Link clicked: ' + e.target.href + '\\n(Prevented for preview)');
              }
            });
          </script>
        </body>
        </html>
      `;

      res.set('Content-Type', 'text/html');
      res.send(previewHTML);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 403) {
        return ResponseUtil.forbidden(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to preview widget');
    }
  });

  /**
   * Invalidate widget cache (protected endpoint)
   */
  static invalidateWidgetCache = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, widgetId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage widgets
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_content');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to manage widget cache');
      }

      await widgetContentDeliveryService.invalidateWidgetCache(widgetId);

      logSecurityEvent('Widget cache invalidated', {
        widgetId,
        websiteId,
      }, req);

      ResponseUtil.success(res, { message: 'Widget cache invalidated successfully' });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to invalidate widget cache');
    }
  });

  /**
   * Get widget performance metrics (protected endpoint)
   */
  static getWidgetPerformance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, widgetId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(widgetId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to view analytics
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'view_analytics');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to view widget performance');
      }

      // Get sample performance data by making a test request
      const testResult = await widgetContentDeliveryService.deliverContent(widgetId, {
        page: 1,
        limit: 1,
      });

      const performance = {
        lastRenderTime: testResult.performance.renderTime,
        lastQueryTime: testResult.performance.queryTime,
        cacheStatus: testResult.performance.cacheHit ? 'HIT' : 'MISS',
        timestamp: new Date().toISOString(),
      };

      ResponseUtil.success(res, { performance });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to get widget performance');
    }
  });
}
import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';

export class AnalyticsController {
  /**
   * Track analytics event (public endpoint for widget)
   */
  static trackEvent = asyncHandler(async (req: Request, res: Response) => {
    const { 
      website_id, 
      content_id, 
      event_type, 
      user_id, 
      session_id, 
      page_url, 
      referrer, 
      metadata 
    } = req.body;

    try {
      // Get client information
      const ip_address = HelperUtil.getClientIp(req);
      const user_agent = req.headers['user-agent'];

      const event = await analyticsService.trackEvent({
        website_id,
        content_id,
        event_type,
        user_id,
        session_id,
        ip_address,
        user_agent,
        referrer,
        page_url,
        metadata,
      });

      logDatabaseOperation('INSERT', 'analytics_events', {
        eventId: event.id,
        websiteId: website_id,
        eventType: event_type,
        contentId: content_id,
      });

      ResponseUtil.success(res, { event_id: event.id });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to track event');
    }
  });

  /**
   * Get analytics report for a website
   */
  static getAnalyticsReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { 
      date_from, 
      date_to, 
      event_type, 
      content_id, 
      user_id: filterUserId 
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

      const filters = {
        date_from: date_from as string,
        date_to: date_to as string,
        event_type: event_type as any,
        content_id: content_id as string,
        user_id: filterUserId as string,
      };

      const report = await analyticsService.getAnalyticsReport(websiteId, filters);

      logDatabaseOperation('SELECT', 'analytics_events', {
        websiteId,
        userId,
        action: 'report',
        filters: Object.keys(filters).filter(key => filters[key as keyof typeof filters]),
      });

      ResponseUtil.success(res, report);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate analytics report');
    }
  });

  /**
   * Get real-time analytics
   */
  static getRealTimeAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const realTimeData = await analyticsService.getRealTimeAnalytics(websiteId);

      logDatabaseOperation('SELECT', 'analytics_events', {
        websiteId,
        userId,
        action: 'realtime',
      });

      ResponseUtil.success(res, realTimeData);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to get real-time analytics');
    }
  });

  /**
   * Get content performance analytics
   */
  static getContentAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { content_id, date_from, date_to } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const contentAnalytics = await analyticsService.getContentAnalytics(
        websiteId,
        content_id as string,
        date_from as string,
        date_to as string
      );

      logDatabaseOperation('SELECT', 'analytics_events', {
        websiteId,
        userId,
        action: 'content_analytics',
        contentId: content_id,
      });

      ResponseUtil.success(res, contentAnalytics);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to get content analytics');
    }
  });

  /**
   * Get user behavior analytics
   */
  static getUserBehaviorAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { date_from, date_to } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const behaviorAnalytics = await analyticsService.getUserBehaviorAnalytics(
        websiteId,
        date_from as string,
        date_to as string
      );

      logDatabaseOperation('SELECT', 'analytics_events', {
        websiteId,
        userId,
        action: 'behavior_analytics',
      });

      ResponseUtil.success(res, behaviorAnalytics);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to get user behavior analytics');
    }
  });

  /**
   * Get analytics summary for dashboard
   */
  static getAnalyticsSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const summary = await analyticsService.getAnalyticsSummary(websiteId);

      logDatabaseOperation('SELECT', 'analytics_events', {
        websiteId,
        userId,
        action: 'summary',
      });

      ResponseUtil.success(res, summary);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to get analytics summary');
    }
  });

  /**
   * Export analytics data
   */
  static exportAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { format = 'json', date_from, date_to } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const filters = {
        date_from: date_from as string,
        date_to: date_to as string,
      };

      const report = await analyticsService.getAnalyticsReport(websiteId, filters);

      logDatabaseOperation('SELECT', 'analytics_events', {
        websiteId,
        userId,
        action: 'export',
        format,
      });

      logSecurityEvent('Analytics data exported', {
        websiteId,
        format,
        dateRange: filters,
      }, req);

      if (format === 'csv') {
        // Convert to CSV format
        const csvData = this.convertToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${websiteId}-${Date.now()}.csv"`);
        res.send(csvData);
      } else {
        // Return JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="analytics-${websiteId}-${Date.now()}.json"`);
        ResponseUtil.success(res, report);
      }
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to export analytics data');
    }
  });

  /**
   * Get analytics for specific content
   */
  static getContentSpecificAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;
    const { date_from, date_to } = req.query;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const filters = {
        content_id: contentId,
        date_from: date_from as string,
        date_to: date_to as string,
      };

      const report = await analyticsService.getAnalyticsReport(websiteId, filters);

      logDatabaseOperation('SELECT', 'analytics_events', {
        websiteId,
        userId,
        contentId,
        action: 'content_specific',
      });

      ResponseUtil.success(res, report);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to get content-specific analytics');
    }
  });

  /**
   * Helper method to convert analytics report to CSV
   */
  private static convertToCSV(report: any): string {
    const headers = [
      'Date',
      'Page Views',
      'Unique Visitors',
      'Events',
    ];

    const rows = report.daily_distribution.map((day: any) => [
      day.date,
      day.events,
      day.unique_visitors,
      day.events,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(',')),
    ].join('\n');

    return csvContent;
  }
}

export default AnalyticsController;
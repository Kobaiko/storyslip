import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { Request } from 'express';

export interface AuditLogEntry {
  id: string;
  website_id: string;
  user_id: string;
  action: string;
  target_user_id?: string;
  target_resource_type?: string;
  target_resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  target_user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuditLogFilters {
  action?: string;
  user_id?: string;
  target_user_id?: string;
  target_resource_type?: string;
  date_from?: string;
  date_to?: string;
}

export class AuditService {
  /**
   * Log an audit event
   */
  async logEvent(
    websiteId: string,
    userId: string,
    action: string,
    details: {
      target_user_id?: string;
      target_resource_type?: string;
      target_resource_id?: string;
      details?: Record<string, any>;
      ip_address?: string;
      user_agent?: string;
    } = {},
    req?: Request
  ): Promise<void> {
    try {
      const auditData = {
        website_id: websiteId,
        user_id: userId,
        action,
        target_user_id: details.target_user_id,
        target_resource_type: details.target_resource_type,
        target_resource_id: details.target_resource_id,
        details: details.details,
        ip_address: details.ip_address || this.getClientIP(req),
        user_agent: details.user_agent || req?.headers['user-agent'],
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditData);

      if (error) {
        console.error('Failed to log audit event:', error);
        // Don't throw error as audit logging shouldn't break the main operation
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get audit logs for a website
   */
  async getAuditLogs(
    websiteId: string,
    filters: AuditLogFilters = {},
    page = 1,
    limit = 20
  ): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:users!user_id(id, name, email),
          target_user:users!target_user_id(id, name, email)
        `, { count: 'exact' })
        .eq('website_id', websiteId);

      // Apply filters
      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.target_user_id) {
        query = query.eq('target_user_id', filters.target_user_id);
      }

      if (filters.target_resource_type) {
        query = query.eq('target_resource_type', filters.target_resource_type);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply pagination and sorting
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: logs, error, count } = await query;

      if (error) {
        throw new ApiError('Failed to fetch audit logs', 500, 'DATABASE_ERROR', error);
      }

      return {
        logs: logs || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch audit logs', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get audit log statistics
   */
  async getAuditStats(
    websiteId: string,
    days = 30
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByUser: Array<{ user_id: string; user_name: string; count: number }>;
    recentActivity: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all audit logs for the period
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select(`
          action,
          user_id,
          created_at,
          user:users!user_id(name)
        `)
        .eq('website_id', websiteId)
        .gte('created_at', startDate.toISOString());

      if (error) {
        throw new ApiError('Failed to fetch audit statistics', 500, 'DATABASE_ERROR', error);
      }

      if (!logs || logs.length === 0) {
        return {
          totalEvents: 0,
          eventsByAction: {},
          eventsByUser: [],
          recentActivity: 0,
        };
      }

      // Calculate statistics
      const totalEvents = logs.length;

      // Events by action
      const eventsByAction = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Events by user
      const userEventCounts = logs.reduce((acc, log) => {
        const key = log.user_id;
        if (!acc[key]) {
          acc[key] = {
            user_id: log.user_id,
            user_name: log.user?.name || 'Unknown User',
            count: 0,
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, { user_id: string; user_name: string; count: number }>);

      const eventsByUser = Object.values(userEventCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 most active users

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentActivity = logs.filter(
        log => new Date(log.created_at) >= sevenDaysAgo
      ).length;

      return {
        totalEvents,
        eventsByAction,
        eventsByUser,
        recentActivity,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get audit statistics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get user activity timeline
   */
  async getUserActivity(
    websiteId: string,
    userId: string,
    days = 30
  ): Promise<AuditLogEntry[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          user:users!user_id(id, name, email),
          target_user:users!target_user_id(id, name, email)
        `)
        .eq('website_id', websiteId)
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw new ApiError('Failed to fetch user activity', 500, 'DATABASE_ERROR', error);
      }

      return logs || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch user activity', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(olderThanDays = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { count, error } = await supabase
        .from('audit_logs')
        .delete({ count: 'exact' })
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        throw new ApiError('Failed to cleanup audit logs', 500, 'DATABASE_ERROR', error);
      }

      return count || 0;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to cleanup audit logs', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Log team management actions
   */
  async logTeamAction(
    websiteId: string,
    userId: string,
    action: 'member_added' | 'member_removed' | 'role_updated' | 'invitation_sent' | 'invitation_cancelled' | 'invitation_accepted',
    targetUserId?: string,
    details?: Record<string, any>,
    req?: Request
  ): Promise<void> {
    await this.logEvent(
      websiteId,
      userId,
      action,
      {
        target_user_id: targetUserId,
        target_resource_type: 'team',
        details,
      },
      req
    );
  }

  /**
   * Log content management actions
   */
  async logContentAction(
    websiteId: string,
    userId: string,
    action: 'content_created' | 'content_updated' | 'content_deleted' | 'content_published' | 'content_unpublished',
    contentId: string,
    details?: Record<string, any>,
    req?: Request
  ): Promise<void> {
    await this.logEvent(
      websiteId,
      userId,
      action,
      {
        target_resource_type: 'content',
        target_resource_id: contentId,
        details,
      },
      req
    );
  }

  /**
   * Log website management actions
   */
  async logWebsiteAction(
    websiteId: string,
    userId: string,
    action: 'website_created' | 'website_updated' | 'website_deleted' | 'settings_updated',
    details?: Record<string, any>,
    req?: Request
  ): Promise<void> {
    await this.logEvent(
      websiteId,
      userId,
      action,
      {
        target_resource_type: 'website',
        target_resource_id: websiteId,
        details,
      },
      req
    );
  }

  /**
   * Extract client IP address from request
   */
  private getClientIP(req?: Request): string | undefined {
    if (!req) return undefined;

    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return req.socket.remoteAddress;
  }
}

export const auditService = new AuditService();
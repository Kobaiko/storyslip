import { supabase } from '../config/supabase';
import HelperUtil from '../utils/helpers';
import { AnalyticsEvent, AnalyticsEventType } from '../types/database';
import { ApiError } from '../utils/response';

export interface AnalyticsEventInput {
  website_id: string;
  content_id?: string;
  event_type: AnalyticsEventType;
  user_id?: string;
  session_id: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  page_url?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  event_type?: AnalyticsEventType;
  content_id?: string;
  user_id?: string;
}

export interface AnalyticsReport {
  website_id: string;
  date_range: {
    from: string;
    to: string;
  };
  total_events: number;
  unique_visitors: number;
  page_views: number;
  top_content: Array<{
    content_id: string;
    title: string;
    views: number;
    unique_views: number;
  }>;
  traffic_sources: Array<{
    source: string;
    visits: number;
    percentage: number;
  }>;
  user_behavior: {
    avg_session_duration: number;
    bounce_rate: number;
    pages_per_session: number;
  };
  hourly_distribution: Array<{
    hour: number;
    events: number;
  }>;
  daily_distribution: Array<{
    date: string;
    events: number;
    unique_visitors: number;
  }>;
}

export class AnalyticsService {
  /**
   * Track analytics event
   */
  async trackEvent(input: AnalyticsEventInput): Promise<AnalyticsEvent> {
    try {
      const eventData = {
        ...input,
        metadata: input.metadata || {},
        created_at: new Date().toISOString(),
      };

      const { data: event, error } = await supabase
        .from('analytics_events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to track event', 500, 'DATABASE_ERROR', error);
      }

      // Update content view count if it's a content view event
      if (input.event_type === 'content_view' && input.content_id) {
        await this.incrementContentViews(input.content_id);
      }

      return event;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to track event', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get analytics report for a website
   */
  async getAnalyticsReport(
    websiteId: string,
    filters: AnalyticsFilters = {}
  ): Promise<AnalyticsReport> {
    try {
      const dateFrom = filters.date_from || this.getDateDaysAgo(30);
      const dateTo = filters.date_to || new Date().toISOString();

      // Get all events in date range
      let query = supabase
        .from('analytics_events')
        .select('*')
        .eq('website_id', websiteId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type);
      }

      if (filters.content_id) {
        query = query.eq('content_id', filters.content_id);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new ApiError('Failed to fetch analytics data', 500, 'DATABASE_ERROR', error);
      }

      const eventsData = events || [];

      // Calculate metrics
      const report: AnalyticsReport = {
        website_id: websiteId,
        date_range: { from: dateFrom, to: dateTo },
        total_events: eventsData.length,
        unique_visitors: this.calculateUniqueVisitors(eventsData),
        page_views: eventsData.filter(e => e.event_type === 'page_view').length,
        top_content: await this.getTopContent(websiteId, eventsData),
        traffic_sources: this.getTrafficSources(eventsData),
        user_behavior: this.calculateUserBehavior(eventsData),
        hourly_distribution: this.getHourlyDistribution(eventsData),
        daily_distribution: this.getDailyDistribution(eventsData),
      };

      return report;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to generate analytics report', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get real-time analytics (last 24 hours)
   */
  async getRealTimeAnalytics(websiteId: string): Promise<{
    active_users: number;
    current_page_views: number;
    events_last_hour: number;
    top_pages: Array<{ page: string; views: number }>;
  }> {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      // Get events from last 24 hours
      const { data: recentEvents, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('website_id', websiteId)
        .gte('created_at', last24Hours.toISOString());

      if (error) {
        throw new ApiError('Failed to fetch real-time analytics', 500, 'DATABASE_ERROR', error);
      }

      const events = recentEvents || [];
      const eventsLastHour = events.filter(e => 
        new Date(e.created_at) >= lastHour
      );

      return {
        active_users: this.calculateActiveUsers(events),
        current_page_views: events.filter(e => e.event_type === 'page_view').length,
        events_last_hour: eventsLastHour.length,
        top_pages: this.getTopPages(events),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get real-time analytics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get content performance analytics
   */
  async getContentAnalytics(
    websiteId: string,
    contentId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    content_performance: Array<{
      content_id: string;
      title: string;
      views: number;
      unique_views: number;
      avg_time_on_page: number;
      bounce_rate: number;
    }>;
  }> {
    try {
      const from = dateFrom || this.getDateDaysAgo(30);
      const to = dateTo || new Date().toISOString();

      let query = supabase
        .from('analytics_events')
        .select(`
          *,
          content:content(id, title)
        `)
        .eq('website_id', websiteId)
        .eq('event_type', 'content_view')
        .gte('created_at', from)
        .lte('created_at', to);

      if (contentId) {
        query = query.eq('content_id', contentId);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new ApiError('Failed to fetch content analytics', 500, 'DATABASE_ERROR', error);
      }

      const contentPerformance = this.calculateContentPerformance(events || []);

      return { content_performance: contentPerformance };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get content analytics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(
    websiteId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    session_analytics: {
      avg_session_duration: number;
      bounce_rate: number;
      pages_per_session: number;
      return_visitor_rate: number;
    };
    device_analytics: Array<{
      device_type: string;
      sessions: number;
      percentage: number;
    }>;
    browser_analytics: Array<{
      browser: string;
      sessions: number;
      percentage: number;
    }>;
  }> {
    try {
      const from = dateFrom || this.getDateDaysAgo(30);
      const to = dateTo || new Date().toISOString();

      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('website_id', websiteId)
        .gte('created_at', from)
        .lte('created_at', to);

      if (error) {
        throw new ApiError('Failed to fetch user behavior analytics', 500, 'DATABASE_ERROR', error);
      }

      const eventsData = events || [];

      return {
        session_analytics: this.calculateSessionAnalytics(eventsData),
        device_analytics: this.getDeviceAnalytics(eventsData),
        browser_analytics: this.getBrowserAnalytics(eventsData),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get user behavior analytics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get analytics summary for dashboard
   */
  async getAnalyticsSummary(websiteId: string): Promise<{
    today: {
      page_views: number;
      unique_visitors: number;
      events: number;
    };
    yesterday: {
      page_views: number;
      unique_visitors: number;
      events: number;
    };
    last_30_days: {
      page_views: number;
      unique_visitors: number;
      events: number;
    };
    growth: {
      page_views_change: number;
      visitors_change: number;
      events_change: number;
    };
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get today's data
      const todayData = await this.getAnalyticsForPeriod(websiteId, today.toISOString(), new Date().toISOString());
      
      // Get yesterday's data
      const yesterdayData = await this.getAnalyticsForPeriod(websiteId, yesterday.toISOString(), today.toISOString());
      
      // Get last 30 days data
      const last30DaysData = await this.getAnalyticsForPeriod(websiteId, thirtyDaysAgo.toISOString(), new Date().toISOString());

      // Calculate growth percentages
      const growth = {
        page_views_change: this.calculateGrowthPercentage(todayData.page_views, yesterdayData.page_views),
        visitors_change: this.calculateGrowthPercentage(todayData.unique_visitors, yesterdayData.unique_visitors),
        events_change: this.calculateGrowthPercentage(todayData.events, yesterdayData.events),
      };

      return {
        today: todayData,
        yesterday: yesterdayData,
        last_30_days: last30DaysData,
        growth,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get analytics summary', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Private helper methods
   */
  private async incrementContentViews(contentId: string): Promise<void> {
    try {
      await supabase.rpc('increment_content_views', {
        content_id: contentId,
      });
    } catch (error) {
      console.error('Failed to increment content views:', error);
    }
  }

  private calculateUniqueVisitors(events: AnalyticsEvent[]): number {
    const uniqueVisitors = new Set();
    events.forEach(event => {
      if (event.user_id) {
        uniqueVisitors.add(event.user_id);
      } else if (event.session_id) {
        uniqueVisitors.add(event.session_id);
      }
    });
    return uniqueVisitors.size;
  }

  private async getTopContent(websiteId: string, events: AnalyticsEvent[]): Promise<Array<{
    content_id: string;
    title: string;
    views: number;
    unique_views: number;
  }>> {
    const contentViews = events
      .filter(e => e.event_type === 'content_view' && e.content_id)
      .reduce((acc, event) => {
        const contentId = event.content_id!;
        if (!acc[contentId]) {
          acc[contentId] = { views: 0, unique_sessions: new Set() };
        }
        acc[contentId].views++;
        acc[contentId].unique_sessions.add(event.session_id);
        return acc;
      }, {} as Record<string, { views: number; unique_sessions: Set<string> }>);

    // Get content titles
    const contentIds = Object.keys(contentViews);
    if (contentIds.length === 0) return [];

    const { data: content } = await supabase
      .from('content')
      .select('id, title')
      .in('id', contentIds);

    return Object.entries(contentViews)
      .map(([contentId, data]) => ({
        content_id: contentId,
        title: content?.find(c => c.id === contentId)?.title || 'Unknown',
        views: data.views,
        unique_views: data.unique_sessions.size,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private getTrafficSources(events: AnalyticsEvent[]): Array<{
    source: string;
    visits: number;
    percentage: number;
  }> {
    const sources = events
      .filter(e => e.referrer)
      .reduce((acc, event) => {
        const source = this.extractDomain(event.referrer!) || 'Direct';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const totalVisits = Object.values(sources).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(sources)
      .map(([source, visits]) => ({
        source,
        visits,
        percentage: totalVisits > 0 ? Math.round((visits / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);
  }

  private calculateUserBehavior(events: AnalyticsEvent[]): {
    avg_session_duration: number;
    bounce_rate: number;
    pages_per_session: number;
  } {
    const sessions = events.reduce((acc, event) => {
      if (!acc[event.session_id]) {
        acc[event.session_id] = {
          events: [],
          pages: new Set(),
        };
      }
      acc[event.session_id].events.push(event);
      if (event.page_url) {
        acc[event.session_id].pages.add(event.page_url);
      }
      return acc;
    }, {} as Record<string, { events: AnalyticsEvent[]; pages: Set<string> }>);

    const sessionData = Object.values(sessions);
    const totalSessions = sessionData.length;

    if (totalSessions === 0) {
      return { avg_session_duration: 0, bounce_rate: 0, pages_per_session: 0 };
    }

    // Calculate average session duration (simplified)
    const avgDuration = sessionData.reduce((sum, session) => {
      if (session.events.length < 2) return sum;
      const firstEvent = new Date(session.events[0].created_at).getTime();
      const lastEvent = new Date(session.events[session.events.length - 1].created_at).getTime();
      return sum + (lastEvent - firstEvent);
    }, 0) / totalSessions / 1000; // Convert to seconds

    // Calculate bounce rate (sessions with only one page view)
    const bouncedSessions = sessionData.filter(session => session.pages.size <= 1).length;
    const bounceRate = (bouncedSessions / totalSessions) * 100;

    // Calculate pages per session
    const pagesPerSession = sessionData.reduce((sum, session) => sum + session.pages.size, 0) / totalSessions;

    return {
      avg_session_duration: Math.round(avgDuration),
      bounce_rate: Math.round(bounceRate),
      pages_per_session: Math.round(pagesPerSession * 10) / 10,
    };
  }

  private getHourlyDistribution(events: AnalyticsEvent[]): Array<{ hour: number; events: number }> {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, events: 0 }));
    
    events.forEach(event => {
      const hour = new Date(event.created_at).getHours();
      hourlyData[hour].events++;
    });

    return hourlyData;
  }

  private getDailyDistribution(events: AnalyticsEvent[]): Array<{
    date: string;
    events: number;
    unique_visitors: number;
  }> {
    const dailyData = events.reduce((acc, event) => {
      const date = event.created_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = { events: 0, visitors: new Set() };
      }
      acc[date].events++;
      acc[date].visitors.add(event.user_id || event.session_id);
      return acc;
    }, {} as Record<string, { events: number; visitors: Set<string> }>);

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        events: data.events,
        unique_visitors: data.visitors.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateActiveUsers(events: AnalyticsEvent[]): number {
    const activeUsers = new Set();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    events
      .filter(event => new Date(event.created_at) >= fiveMinutesAgo)
      .forEach(event => {
        activeUsers.add(event.user_id || event.session_id);
      });

    return activeUsers.size;
  }

  private getTopPages(events: AnalyticsEvent[]): Array<{ page: string; views: number }> {
    const pageViews = events
      .filter(e => e.event_type === 'page_view' && e.page_url)
      .reduce((acc, event) => {
        const page = event.page_url!;
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(pageViews)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }

  private calculateContentPerformance(events: any[]): Array<{
    content_id: string;
    title: string;
    views: number;
    unique_views: number;
    avg_time_on_page: number;
    bounce_rate: number;
  }> {
    // Simplified implementation - in a real app you'd calculate actual metrics
    const contentData = events.reduce((acc, event) => {
      const contentId = event.content_id;
      if (!acc[contentId]) {
        acc[contentId] = {
          title: event.content?.title || 'Unknown',
          views: 0,
          unique_sessions: new Set(),
        };
      }
      acc[contentId].views++;
      acc[contentId].unique_sessions.add(event.session_id);
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(contentData).map(([contentId, data]) => ({
      content_id: contentId,
      title: data.title,
      views: data.views,
      unique_views: data.unique_sessions.size,
      avg_time_on_page: 120, // Placeholder
      bounce_rate: 45, // Placeholder
    }));
  }

  private calculateSessionAnalytics(events: AnalyticsEvent[]): {
    avg_session_duration: number;
    bounce_rate: number;
    pages_per_session: number;
    return_visitor_rate: number;
  } {
    // Simplified implementation
    return {
      avg_session_duration: 180,
      bounce_rate: 35,
      pages_per_session: 2.5,
      return_visitor_rate: 25,
    };
  }

  private getDeviceAnalytics(events: AnalyticsEvent[]): Array<{
    device_type: string;
    sessions: number;
    percentage: number;
  }> {
    // Simplified implementation - would parse user_agent in real app
    return [
      { device_type: 'Desktop', sessions: 150, percentage: 60 },
      { device_type: 'Mobile', sessions: 75, percentage: 30 },
      { device_type: 'Tablet', sessions: 25, percentage: 10 },
    ];
  }

  private getBrowserAnalytics(events: AnalyticsEvent[]): Array<{
    browser: string;
    sessions: number;
    percentage: number;
  }> {
    // Simplified implementation - would parse user_agent in real app
    return [
      { browser: 'Chrome', sessions: 120, percentage: 48 },
      { browser: 'Safari', sessions: 80, percentage: 32 },
      { browser: 'Firefox', sessions: 30, percentage: 12 },
      { browser: 'Edge', sessions: 20, percentage: 8 },
    ];
  }

  private async getAnalyticsForPeriod(websiteId: string, from: string, to: string): Promise<{
    page_views: number;
    unique_visitors: number;
    events: number;
  }> {
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('website_id', websiteId)
      .gte('created_at', from)
      .lte('created_at', to);

    if (error) {
      throw new ApiError('Failed to fetch period analytics', 500, 'DATABASE_ERROR', error);
    }

    const eventsData = events || [];

    return {
      page_views: eventsData.filter(e => e.event_type === 'page_view').length,
      unique_visitors: this.calculateUniqueVisitors(eventsData),
      events: eventsData.length,
    };
  }

  private calculateGrowthPercentage(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  private getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }
}

export const analyticsService = new AnalyticsService();
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface AnalyticsFilters {
  website_id: string;
  period: string;
  country?: string;
  device?: string;
  source?: string;
  page?: string;
  date_from?: string;
  date_to?: string;
}

interface AnalyticsData {
  total_views: number;
  unique_visitors: number;
  avg_session_duration: number;
  bounce_rate: number;
  views_change: number;
  visitors_change: number;
  session_duration_change: number;
  bounce_rate_change: number;
  new_visitor_percentage: number;
  mobile_percentage: number;
  top_traffic_source: string;
  monthly_views_goal_progress: number;
  engagement_goal_progress: number;
  daily_stats: Array<{
    date: string;
    views: number;
    unique_visitors: number;
    clicks: number;
    bounce_rate: number;
    avg_session_duration: number;
  }>;
  traffic_sources: Array<{
    source: string;
    visitors: number;
    percentage: number;
    change_percentage?: number;
    change_direction?: 'up' | 'down' | 'neutral';
    sessions: number;
    bounce_rate: number;
    avg_session_duration: number;
  }>;
  top_content: Array<{
    id: string;
    title: string;
    slug: string;
    url?: string;
    views: number;
    unique_visitors: number;
    clicks: number;
    bounce_rate: number;
    avg_session_duration: number;
    conversion_rate?: number;
    change_percentage?: number;
    change_direction?: 'up' | 'down' | 'neutral';
    published_at: string;
    category?: string;
    author?: string;
  }>;
  top_countries: Array<{
    country: string;
    country_code: string;
    visitors: number;
    percentage: number;
  }>;
  device_types: Array<{
    type: string;
    visitors: number;
    percentage: number;
    color: string;
  }>;
  top_browsers: Array<{
    name: string;
    users: number;
    percentage: number;
  }>;
}

// Mock data generator
const generateMockAnalyticsData = (filters: AnalyticsFilters): AnalyticsData => {
  const baseViews = 15420;
  const baseVisitors = 8930;
  
  // Generate daily stats based on period
  const getDaysInPeriod = (period: string) => {
    switch (period) {
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 7;
    }
  };

  const days = getDaysInPeriod(filters.period);
  const dailyStats = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    
    return {
      date: date.toISOString().split('T')[0],
      views: Math.floor(baseViews / days + Math.random() * 200 - 100),
      unique_visitors: Math.floor(baseVisitors / days + Math.random() * 100 - 50),
      clicks: Math.floor(Math.random() * 500 + 200),
      bounce_rate: Math.random() * 20 + 40, // 40-60%
      avg_session_duration: Math.floor(Math.random() * 300 + 120), // 2-7 minutes
    };
  });

  return {
    total_views: baseViews,
    unique_visitors: baseVisitors,
    avg_session_duration: 245,
    bounce_rate: 52.3,
    views_change: Math.random() * 30 - 10, // -10% to +20%
    visitors_change: Math.random() * 25 - 5, // -5% to +20%
    session_duration_change: Math.random() * 20 - 10,
    bounce_rate_change: Math.random() * 10 - 5,
    new_visitor_percentage: 68.4,
    mobile_percentage: 62.1,
    top_traffic_source: 'organic search',
    monthly_views_goal_progress: 78.5,
    engagement_goal_progress: 85.2,
    daily_stats: dailyStats,
    traffic_sources: [
      {
        source: 'organic',
        visitors: 3572,
        percentage: 40.0,
        change_percentage: 12.5,
        change_direction: 'up' as const,
        sessions: 4120,
        bounce_rate: 48.2,
        avg_session_duration: 285,
      },
      {
        source: 'direct',
        visitors: 2679,
        percentage: 30.0,
        change_percentage: -3.2,
        change_direction: 'down' as const,
        sessions: 2890,
        bounce_rate: 55.1,
        avg_session_duration: 195,
      },
      {
        source: 'social',
        visitors: 1786,
        percentage: 20.0,
        change_percentage: 8.7,
        change_direction: 'up' as const,
        sessions: 2145,
        bounce_rate: 62.3,
        avg_session_duration: 165,
      },
      {
        source: 'referral',
        visitors: 893,
        percentage: 10.0,
        change_percentage: 0.5,
        change_direction: 'neutral' as const,
        sessions: 1020,
        bounce_rate: 45.8,
        avg_session_duration: 320,
      },
    ],
    top_content: [
      {
        id: '1',
        title: 'Complete Guide to React Hooks',
        slug: 'react-hooks-guide',
        url: '/blog/react-hooks-guide',
        views: 2340,
        unique_visitors: 1890,
        clicks: 456,
        bounce_rate: 42.1,
        avg_session_duration: 385,
        conversion_rate: 19.5,
        change_percentage: 15.3,
        change_direction: 'up' as const,
        published_at: '2024-01-15T10:00:00Z',
        category: 'Tutorial',
        author: 'John Doe',
      },
      {
        id: '2',
        title: 'JavaScript Fundamentals',
        slug: 'javascript-basics',
        url: '/tutorials/javascript-basics',
        views: 1890,
        unique_visitors: 1520,
        clicks: 378,
        bounce_rate: 38.7,
        avg_session_duration: 425,
        conversion_rate: 20.0,
        change_percentage: -2.1,
        change_direction: 'down' as const,
        published_at: '2024-01-10T14:30:00Z',
        category: 'Tutorial',
        author: 'Jane Smith',
      },
      {
        id: '3',
        title: 'Building Modern Web Apps',
        slug: 'modern-web-apps',
        url: '/blog/modern-web-apps',
        views: 1456,
        unique_visitors: 1234,
        clicks: 289,
        bounce_rate: 45.2,
        avg_session_duration: 295,
        conversion_rate: 19.8,
        change_percentage: 8.9,
        change_direction: 'up' as const,
        published_at: '2024-01-08T09:15:00Z',
        category: 'Blog',
        author: 'Mike Johnson',
      },
    ],
    top_countries: [
      { country: 'United States', country_code: 'US', visitors: 3572, percentage: 40.0 },
      { country: 'United Kingdom', country_code: 'GB', visitors: 1786, percentage: 20.0 },
      { country: 'Canada', country_code: 'CA', visitors: 1339, percentage: 15.0 },
      { country: 'Germany', country_code: 'DE', visitors: 893, percentage: 10.0 },
      { country: 'Australia', country_code: 'AU', visitors: 714, percentage: 8.0 },
    ],
    device_types: [
      { type: 'Desktop', visitors: 4465, percentage: 50.0, color: '#3B82F6' },
      { type: 'Mobile', visitors: 3572, percentage: 40.0, color: '#10B981' },
      { type: 'Tablet', visitors: 893, percentage: 10.0, color: '#F59E0B' },
    ],
    top_browsers: [
      { name: 'Chrome', users: 5358, percentage: 60.0 },
      { name: 'Safari', users: 1786, percentage: 20.0 },
      { name: 'Firefox', users: 1072, percentage: 12.0 },
      { name: 'Edge', users: 714, percentage: 8.0 },
    ],
  };
};

export function useAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['analytics', filters],
    queryFn: async () => {
      try {
        // In a real app, this would be an API call
        // const response = await api.get('/analytics', { params: filters });
        // return response.data;
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Return mock data
        return generateMockAnalyticsData(filters);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

// Real-time analytics hook
export function useRealTimeAnalytics(websiteId: string) {
  return useQuery({
    queryKey: ['realtime-analytics', websiteId],
    queryFn: async () => {
      try {
        // In a real app, this would be an API call
        // const response = await api.get(`/analytics/realtime/${websiteId}`);
        // return response.data;
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return mock real-time data
        return {
          active_users: Math.floor(Math.random() * 100) + 20,
          page_views_last_hour: Math.floor(Math.random() * 500) + 100,
          top_pages: [
            { path: '/blog/react-hooks', active_users: 12 },
            { path: '/tutorials/javascript', active_users: 8 },
            { path: '/about', active_users: 5 },
          ],
        };
      } catch (error) {
        console.error('Failed to fetch real-time analytics:', error);
        throw error;
      }
    },
    refetchInterval: 30 * 1000, // 30 seconds
  });
}
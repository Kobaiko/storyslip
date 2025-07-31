import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Eye, 
  MousePointer, 
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatNumber } from '../../lib/utils';

interface RealTimeData {
  active_users: number;
  page_views_last_30min: number;
  top_pages: Array<{
    path: string;
    title: string;
    active_users: number;
    views_last_30min: number;
  }>;
  traffic_sources: Array<{
    source: string;
    active_users: number;
    percentage: number;
  }>;
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  countries: Array<{
    country: string;
    country_code: string;
    active_users: number;
  }>;
  events_last_5min: Array<{
    timestamp: string;
    type: 'page_view' | 'click' | 'scroll' | 'download';
    page: string;
    user_agent?: string;
    country?: string;
  }>;
}

interface RealTimeStatsProps {
  websiteId: string;
  refreshInterval?: number;
}

export function RealTimeStats({ 
  websiteId, 
  refreshInterval = 30000 // 30 seconds
}: RealTimeStatsProps) {
  const [data, setData] = useState<RealTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock data for demonstration
  const mockData: RealTimeData = {
    active_users: 47,
    page_views_last_30min: 156,
    top_pages: [
      {
        path: '/blog/react-hooks-guide',
        title: 'Complete Guide to React Hooks',
        active_users: 12,
        views_last_30min: 23,
      },
      {
        path: '/tutorials/javascript-basics',
        title: 'JavaScript Fundamentals',
        active_users: 8,
        views_last_30min: 18,
      },
      {
        path: '/about',
        title: 'About Us',
        active_users: 5,
        views_last_30min: 12,
      },
    ],
    traffic_sources: [
      { source: 'Direct', active_users: 18, percentage: 38.3 },
      { source: 'Google', active_users: 15, percentage: 31.9 },
      { source: 'Social', active_users: 9, percentage: 19.1 },
      { source: 'Referral', active_users: 5, percentage: 10.6 },
    ],
    devices: {
      desktop: 28,
      mobile: 15,
      tablet: 4,
    },
    countries: [
      { country: 'United States', country_code: 'US', active_users: 18 },
      { country: 'United Kingdom', country_code: 'GB', active_users: 8 },
      { country: 'Canada', country_code: 'CA', active_users: 6 },
      { country: 'Germany', country_code: 'DE', active_users: 5 },
    ],
    events_last_5min: [
      {
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        type: 'page_view' as const,
        page: '/blog/react-hooks-guide',
        country: 'US',
      },
      {
        timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        type: 'click' as const,
        page: '/tutorials/javascript-basics',
        country: 'GB',
      },
      {
        timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
        type: 'download' as const,
        page: '/resources/guide.pdf',
        country: 'CA',
      },
    ],
  };

  const fetchRealTimeData = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      // const response = await fetch(`/api/analytics/realtime/${websiteId}`);
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add some randomness to mock data for demonstration
      const randomizedData = {
        ...mockData,
        active_users: mockData.active_users + Math.floor(Math.random() * 10) - 5,
        page_views_last_30min: mockData.page_views_last_30min + Math.floor(Math.random() * 20) - 10,
      };
      
      setData(randomizedData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeData();
  }, [websiteId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchRealTimeData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'desktop': return Monitor;
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'page_view': return 'bg-blue-100 text-blue-800';
      case 'click': return 'bg-green-100 text-green-800';
      case 'scroll': return 'bg-yellow-100 text-yellow-800';
      case 'download': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes === 1) return '1 minute ago';
    return `${diffInMinutes} minutes ago`;
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Real-time Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Real-time Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No real-time data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Real-time Activity
            <Badge variant="secondary" className="ml-2">
              Live
            </Badge>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'text-green-600' : 'text-gray-600'}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchRealTimeData}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Key Real-time Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-900">
                {formatNumber(data.active_users)}
              </div>
              <div className="text-xs text-green-700">Active Users</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {formatNumber(data.page_views_last_30min)}
              </div>
              <div className="text-xs text-blue-700">Views (30 min)</div>
            </div>
          </div>

          {/* Top Active Pages */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Top Active Pages</h4>
            <div className="space-y-2">
              {data.top_pages.map((page, index) => (
                <div key={page.path} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {page.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {page.path}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-600">
                    <span>{page.active_users} active</span>
                    <span>{page.views_last_30min} views</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Breakdown */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Active Users by Device</h4>
            <div className="space-y-2">
              {Object.entries(data.devices).map(([device, count]) => {
                const Icon = getDeviceIcon(device);
                const percentage = (count / data.active_users) * 100;
                
                return (
                  <div key={device} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {device}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Traffic Sources */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Active Traffic Sources</h4>
            <div className="space-y-2">
              {data.traffic_sources.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {source.source}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {source.active_users} users
                    </span>
                    <span className="text-xs text-gray-500">
                      ({source.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.events_last_5min.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-2 text-sm">
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant="secondary" 
                      size="sm"
                      className={getEventTypeColor(event.type)}
                    >
                      {event.type.replace('_', ' ')}
                    </Badge>
                    <span className="text-gray-900 truncate max-w-48">
                      {event.page}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {event.country && (
                      <span className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                        {event.country}
                      </span>
                    )}
                    <span>{formatTimeAgo(event.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Countries */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Top Countries</h4>
            <div className="space-y-2">
              {data.countries.slice(0, 5).map((country, index) => (
                <div key={country.country_code} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {country.country}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {country.active_users} users
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}users: Mat
h.floor(Math.random() * 20) + 5 },
      { path: '/blog', title: 'Blog', active_users: Math.floor(Math.random() * 15) + 3 },
      { path: '/about', title: 'About Us', active_users: Math.floor(Math.random() * 10) + 2 },
      { path: '/contact', title: 'Contact', active_users: Math.floor(Math.random() * 8) + 1 },
    ],
    traffic_sources: [
      { source: 'organic_search', active_users: Math.floor(Math.random() * 15) + 5, percentage: 45 },
      { source: 'direct', active_users: Math.floor(Math.random() * 10) + 3, percentage: 30 },
      { source: 'social', active_users: Math.floor(Math.random() * 8) + 2, percentage: 15 },
      { source: 'referral', active_users: Math.floor(Math.random() * 5) + 1, percentage: 10 },
    ],
    devices: {
      desktop: Math.floor(Math.random() * 20) + 10,
      mobile: Math.floor(Math.random() * 25) + 15,
      tablet: Math.floor(Math.random() * 8) + 3,
    },
    countries: [
      { country: 'United States', active_users: Math.floor(Math.random() * 15) + 8 },
      { country: 'United Kingdom', active_users: Math.floor(Math.random() * 8) + 4 },
      { country: 'Canada', active_users: Math.floor(Math.random() * 6) + 3 },
      { country: 'Germany', active_users: Math.floor(Math.random() * 5) + 2 },
    ],
    events: [
      {
        id: '1',
        type: 'page_view',
        page: '/',
        timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
        country: 'US',
      },
      {
        id: '2',
        type: 'click',
        page: '/blog',
        timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
        country: 'UK',
      },
      {
        id: '3',
        type: 'page_view',
        page: '/about',
        timestamp: new Date(Date.now() - Math.random() * 60000).toISOString(),
        country: 'CA',
      },
    ],
  };

  const fetchRealTimeData = async () => {
    setLoading(true);
    try {
      // In real app, this would be an API call
      // const response = await api.get(`/analytics/realtime/${websiteId}`);
      // setData(response.data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setData(mockData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealTimeData();
  }, [websiteId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRealTimeData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, websiteId]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'page_view': return <Eye className="h-3 w-3" />;
      case 'click': return <MousePointer className="h-3 w-3" />;
      case 'scroll': return <Activity className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'page_view': return 'text-blue-600';
      case 'click': return 'text-green-600';
      case 'scroll': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const totalDeviceUsers = data ? data.devices.desktop + data.devices.mobile + data.devices.tablet : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-600" />
            Real-Time Activity
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'text-green-600' : 'text-gray-400'}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {lastUpdated && (
          <p className="text-xs text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        {loading && !data ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading real-time data...</span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-900">
                      {formatNumber(data.active_users)}
                    </p>
                    <p className="text-sm text-green-700">Active Users</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatNumber(data.page_views_last_minute)}
                    </p>
                    <p className="text-sm text-blue-700">Views (1 min)</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatNumber(data.page_views_last_hour)}
                    </p>
                    <p className="text-sm text-purple-700">Views (1 hour)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Pages */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Top Active Pages</h4>
                <div className="space-y-3">
                  {data.top_pages.map((page, index) => (
                    <div key={page.path} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {page.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {page.path}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {page.active_users}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Traffic Sources */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Active Traffic Sources</h4>
                <div className="space-y-3">
                  {data.traffic_sources.map((source) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Globe className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {source.source.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 bg-blue-600 rounded-full"
                            style={{ width: `${source.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">
                          {source.active_users}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Breakdown */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Active Devices</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Monitor className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Desktop</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${(data.devices.desktop / totalDeviceUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {data.devices.desktop}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Mobile</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-green-600 rounded-full"
                          style={{ width: `${(data.devices.mobile / totalDeviceUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {data.devices.mobile}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Tablet className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">Tablet</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 bg-purple-600 rounded-full"
                          style={{ width: `${(data.devices.tablet / totalDeviceUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">
                        {data.devices.tablet}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Countries */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Active Countries</h4>
                <div className="space-y-3">
                  {data.countries.map((country, index) => (
                    <div key={country.country} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {country.country}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          {country.active_users}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Events */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {data.events.map((event) => (
                    <div key={event.id} className="flex items-center space-x-3 text-sm">
                      <div className={`${getEventColor(event.type)}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <span className="text-gray-600">
                        {event.type.replace('_', ' ')} on
                      </span>
                      <span className="font-medium text-gray-900">
                        {event.page}
                      </span>
                      {event.country && (
                        <Badge variant="secondary" size="sm">
                          {event.country}
                        </Badge>
                      )}
                      <span className="text-gray-500 ml-auto">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No real-time data
            </h3>
            <p className="text-gray-500">
              Real-time activity will appear here once you have active visitors.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
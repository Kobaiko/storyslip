import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Clock, 
  Users,
  Calendar,
  Globe,
  Share2,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Content } from '../../hooks/useContent';
import { formatNumber, formatDate, formatRelativeTime } from '../../lib/utils';

interface ContentAnalyticsData {
  views: number;
  unique_visitors: number;
  avg_time_on_page: number;
  bounce_rate: number;
  social_shares: number;
  comments: number;
  conversions: number;
  views_change: number;
  visitors_change: number;
  daily_stats: Array<{
    date: string;
    views: number;
    visitors: number;
    time_on_page: number;
  }>;
  traffic_sources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  top_referrers: Array<{
    domain: string;
    visitors: number;
    percentage: number;
  }>;
  geographic_data: Array<{
    country: string;
    visitors: number;
    percentage: number;
  }>;
}

interface ContentAnalyticsProps {
  content: Content;
  isOpen: boolean;
  onClose: () => void;
}

export function ContentAnalytics({
  content,
  isOpen,
  onClose,
}: ContentAnalyticsProps) {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(false);

  // Mock analytics data - in real app this would come from API
  const mockAnalyticsData: ContentAnalyticsData = {
    views: 2340,
    unique_visitors: 1890,
    avg_time_on_page: 245, // seconds
    bounce_rate: 42.1,
    social_shares: 156,
    comments: 23,
    conversions: 45,
    views_change: 15.3,
    visitors_change: 12.8,
    daily_stats: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 100) + 50,
        visitors: Math.floor(Math.random() * 80) + 40,
        time_on_page: Math.floor(Math.random() * 300) + 120,
      };
    }),
    traffic_sources: [
      { source: 'Organic Search', visitors: 756, percentage: 40.0 },
      { source: 'Direct', visitors: 567, percentage: 30.0 },
      { source: 'Social Media', visitors: 378, percentage: 20.0 },
      { source: 'Referral', visitors: 189, percentage: 10.0 },
    ],
    top_referrers: [
      { domain: 'google.com', visitors: 456, percentage: 24.1 },
      { domain: 'twitter.com', visitors: 234, percentage: 12.4 },
      { domain: 'facebook.com', visitors: 189, percentage: 10.0 },
      { domain: 'linkedin.com', visitors: 123, percentage: 6.5 },
    ],
    geographic_data: [
      { country: 'United States', visitors: 756, percentage: 40.0 },
      { country: 'United Kingdom', visitors: 378, percentage: 20.0 },
      { country: 'Canada', visitors: 284, percentage: 15.0 },
      { country: 'Germany', visitors: 189, percentage: 10.0 },
      { country: 'Australia', visitors: 142, percentage: 7.5 },
    ],
  };

  const [analyticsData] = useState<ContentAnalyticsData>(mockAnalyticsData);

  const periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
  ];

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? '↗' : '↘';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Analytics: ${content.title}`}
      size="xl"
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Content Performance</h2>
            <p className="text-gray-600">Detailed analytics for this content</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={periodOptions}
            />
            
            <Button
              variant="outline"
              leftIcon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(`/content/${content.slug}`, '_blank')}
            >
              View Content
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(analyticsData.views)}
                  </p>
                  <p className={`text-sm ${getChangeColor(analyticsData.views_change)}`}>
                    {getChangeIcon(analyticsData.views_change)} {Math.abs(analyticsData.views_change)}%
                  </p>
                </div>
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Visitors</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(analyticsData.unique_visitors)}
                  </p>
                  <p className={`text-sm ${getChangeColor(analyticsData.visitors_change)}`}>
                    {getChangeIcon(analyticsData.visitors_change)} {Math.abs(analyticsData.visitors_change)}%
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Time on Page</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDuration(analyticsData.avg_time_on_page)}
                  </p>
                  <p className="text-sm text-gray-500">Good engagement</p>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analyticsData.bounce_rate.toFixed(1)}%
                  </p>
                  <Badge variant={analyticsData.bounce_rate < 50 ? 'success' : 'warning'}>
                    {analyticsData.bounce_rate < 50 ? 'Good' : 'Average'}
                  </Badge>
                </div>
                <MousePointer className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Share2 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analyticsData.social_shares}</p>
              <p className="text-sm text-gray-600">Social Shares</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <MessageCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analyticsData.comments}</p>
              <p className="text-sm text-gray-600">Comments</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analyticsData.conversions}</p>
              <p className="text-sm text-gray-600">Conversions</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.traffic_sources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: `hsl(${index * 90}, 70%, 50%)` }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {source.source}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(source.visitors)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {source.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Referrers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.top_referrers.map((referrer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {referrer.domain}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(referrer.visitors)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {referrer.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Data */}
          <Card>
            <CardHeader>
              <CardTitle>Top Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.geographic_data.map((country, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {country.country}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(country.visitors)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {country.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Views over the last {period === '7d' ? '7 days' : period === '30d' ? '30 days' : period === '90d' ? '90 days' : 'year'}
                </div>
                
                {/* Simple bar chart representation */}
                <div className="space-y-2">
                  {analyticsData.daily_stats.slice(-7).map((day, index) => {
                    const maxViews = Math.max(...analyticsData.daily_stats.map(d => d.views));
                    const width = (day.views / maxViews) * 100;
                    
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="text-xs text-gray-500 w-16">
                          {formatDate(day.date).split(' ').slice(0, 2).join(' ')}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-900 w-12 text-right">
                          {day.views}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Info */}
        <Card>
          <CardHeader>
            <CardTitle>Content Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Published:</span>
                <p className="font-medium text-gray-900">
                  {content.published_at ? formatDate(content.published_at) : 'Not published'}
                </p>
              </div>
              
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <p className="font-medium text-gray-900">
                  {formatRelativeTime(content.updated_at)}
                </p>
              </div>
              
              <div>
                <span className="text-gray-600">Author:</span>
                <p className="font-medium text-gray-900">
                  {content.author?.name || 'Unknown'}
                </p>
              </div>
              
              <div>
                <span className="text-gray-600">Status:</span>
                <Badge variant={content.status === 'published' ? 'success' : 'secondary'}>
                  {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Modal>
  );
}

// Add missing MessageCircle import
const MessageCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
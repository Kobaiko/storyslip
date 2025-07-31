import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Clock, 
  Globe,
  Calendar,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Form';
import { StatsCard, StatsGrid, StatsIcons } from '../dashboard/StatsCard';
import { LoadingState } from '../ui/LoadingSpinner';
import { formatNumber } from '../../lib/utils';

interface AnalyticsData {
  period: string;
  total_views: number;
  unique_visitors: number;
  avg_session_duration: number;
  bounce_rate: number;
  click_through_rate: number;
  top_content: Array<{
    id: string;
    title: string;
    views: number;
    clicks: number;
  }>;
  traffic_sources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  daily_stats: Array<{
    date: string;
    views: number;
    visitors: number;
    clicks: number;
  }>;
}

interface WebsiteAnalyticsProps {
  websiteId: string;
  websiteName: string;
  data?: AnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onPeriodChange: (period: string) => void;
  onExport: () => void;
}

export function WebsiteAnalytics({
  websiteId,
  websiteName,
  data,
  loading = false,
  error = null,
  onPeriodChange,
  onExport,
}: WebsiteAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    onPeriodChange(period);
  };

  const periodOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Analytics - {websiteName}
          </h2>
          <p className="text-gray-600">Widget performance and engagement metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            options={periodOptions}
          />
          
          <Button
            variant="outline"
            onClick={onExport}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
        </div>
      </div>

      <LoadingState
        loading={loading}
        error={error}
        isEmpty={!data}
      >
        {data && (
          <>
            {/* Key Metrics */}
            <StatsGrid>
              <StatsCard
                title="Total Views"
                value={formatNumber(data.total_views)}
                icon={<StatsIcons.Views />}
                change={{
                  value: 12,
                  type: 'increase',
                  period: 'vs previous period'
                }}
              />
              
              <StatsCard
                title="Unique Visitors"
                value={formatNumber(data.unique_visitors)}
                icon={<StatsIcons.Users />}
                change={{
                  value: 8,
                  type: 'increase',
                  period: 'vs previous period'
                }}
              />
              
              <StatsCard
                title="Avg. Session Duration"
                value={`${Math.round(data.avg_session_duration / 60)}m ${data.avg_session_duration % 60}s`}
                icon={<StatsIcons.Time />}
                change={{
                  value: 5,
                  type: 'increase',
                  period: 'vs previous period'
                }}
              />
              
              <StatsCard
                title="Click-Through Rate"
                value={`${data.click_through_rate.toFixed(1)}%`}
                icon={<MousePointer />}
                change={{
                  value: 2,
                  type: 'decrease',
                  period: 'vs previous period'
                }}
              />
            </StatsGrid>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.top_content.map((content, index) => (
                      <div key={content.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {content.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatNumber(content.clicks)} clicks
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatNumber(content.views)}
                          </p>
                          <p className="text-xs text-gray-500">views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Traffic Sources */}
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.traffic_sources.map((source) => (
                      <div key={source.source} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {source.source}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${source.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {source.percentage}%
                          </span>
                          <span className="text-sm text-gray-500 w-16 text-right">
                            {formatNumber(source.visitors)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Stats Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {data.daily_stats.map((day, index) => {
                    const maxViews = Math.max(...data.daily_stats.map(d => d.views));
                    const height = (day.views / maxViews) * 100;
                    
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-600 rounded-t hover:bg-blue-700 transition-colors cursor-pointer"
                          style={{ height: `${height}%` }}
                          title={`${day.views} views on ${new Date(day.date).toLocaleDateString()}`}
                        />
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-600 rounded" />
                    <span>Views</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-600 rounded" />
                    <span>Clicks</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Key Findings</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Views increased by 12% compared to previous period</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Eye className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Average session duration improved by 15 seconds</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <MousePointer className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>Click-through rate is 2.3% above industry average</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Recommendations</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Consider A/B testing different widget positions</li>
                      <li>• Optimize content titles for better engagement</li>
                      <li>• Review bounce rate patterns for improvement opportunities</li>
                      <li>• Implement related content suggestions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </LoadingState>
    </div>
  );
}
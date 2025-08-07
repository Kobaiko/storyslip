import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Users, 
  Clock,
  Calendar,
  Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  avgTimeOnPage: string;
  bounceRate: string;
  conversionRate: string;
}

const mockAnalytics: AnalyticsData = {
  totalViews: 12547,
  totalClicks: 3421,
  uniqueVisitors: 8932,
  avgTimeOnPage: '2m 34s',
  bounceRate: '34.2%',
  conversionRate: '4.8%'
};

const mockTopContent = [
  { id: '1', title: 'Getting Started with React Hooks', views: 2341, clicks: 456 },
  { id: '2', title: 'Advanced JavaScript Patterns', views: 1987, clicks: 398 },
  { id: '3', title: 'CSS Grid Layout Guide', views: 1654, clicks: 287 },
  { id: '4', title: 'Node.js Best Practices', views: 1432, clicks: 234 },
  { id: '5', title: 'TypeScript for Beginners', views: 1298, clicks: 198 }
];

const mockTrafficSources = [
  { source: 'Direct', visitors: 3456, percentage: 38.7 },
  { source: 'Google Search', visitors: 2891, percentage: 32.4 },
  { source: 'Social Media', visitors: 1567, percentage: 17.5 },
  { source: 'Referrals', visitors: 789, percentage: 8.8 },
  { source: 'Email', visitors: 229, percentage: 2.6 }
];

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  const StatCard = ({ 
    title, 
    value, 
    change, 
    changeType, 
    icon: Icon 
  }: {
    title: string;
    value: string;
    change: string;
    changeType: 'positive' | 'negative' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
  }) => {
    const changeColors = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600',
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className={`text-sm ${changeColors[changeType]}`}>
                {change}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your content performance and audience engagement</p>
        </div>
        <div className="flex items-center space-x-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Views"
          value={mockAnalytics.totalViews.toLocaleString()}
          change="+12.5% from last period"
          changeType="positive"
          icon={Eye}
        />
        <StatCard
          title="Total Clicks"
          value={mockAnalytics.totalClicks.toLocaleString()}
          change="+8.2% from last period"
          changeType="positive"
          icon={MousePointer}
        />
        <StatCard
          title="Unique Visitors"
          value={mockAnalytics.uniqueVisitors.toLocaleString()}
          change="+15.3% from last period"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Avg. Time on Page"
          value={mockAnalytics.avgTimeOnPage}
          change="-5.2% from last period"
          changeType="negative"
          icon={Clock}
        />
        <StatCard
          title="Bounce Rate"
          value={mockAnalytics.bounceRate}
          change="-2.1% from last period"
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Conversion Rate"
          value={mockAnalytics.conversionRate}
          change="+0.8% from last period"
          changeType="positive"
          icon={BarChart3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Content */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopContent.map((content, index) => (
                <div key={content.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{content.title}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {content.views.toLocaleString()}
                        </span>
                        <span className="flex items-center">
                          <MousePointer className="w-3 h-3 mr-1" />
                          {content.clicks.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {((content.clicks / content.views) * 100).toFixed(1)}% CTR
                  </Badge>
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
              {mockTrafficSources.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-gray-900">{source.source}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {source.visitors.toLocaleString()}
                    </span>
                    <Badge variant="outline">
                      {source.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Chart visualization would go here</p>
              <p className="text-sm text-gray-400">Integration with charting library needed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
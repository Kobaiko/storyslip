import React from 'react';
import { 
  FileText, 
  Layout, 
  BarChart3, 
  Users, 
  TrendingUp, 
  Eye,
  MousePointer
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon }) => {
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

interface RecentActivityItem {
  id: string;
  type: 'content' | 'widget' | 'user';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

const recentActivity: RecentActivityItem[] = [
  {
    id: '1',
    type: 'content',
    title: 'New article published',
    description: 'Getting Started with React Hooks',
    timestamp: '2 hours ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'widget',
    title: 'Widget updated',
    description: 'Latest Articles widget configuration changed',
    timestamp: '4 hours ago',
    status: 'info',
  },
  {
    id: '3',
    type: 'user',
    title: 'New team member',
    description: 'John Doe joined as Editor',
    timestamp: '1 day ago',
    status: 'success',
  },
  {
    id: '4',
    type: 'content',
    title: 'Content scheduled',
    description: 'Advanced TypeScript Tips scheduled for tomorrow',
    timestamp: '2 days ago',
    status: 'warning',
  },
];

const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your content.</p>
        </div>
        
        {/* Development: Onboarding trigger button */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={() => {
              // Trigger onboarding by clearing localStorage flag
              localStorage.removeItem('onboarding-completed');
              window.location.reload();
            }}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Reset Onboarding
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Content"
          value="24"
          change="+12% from last month"
          changeType="positive"
          icon={FileText}
        />
        <StatCard
          title="Active Widgets"
          value="8"
          change="+2 new this week"
          changeType="positive"
          icon={Layout}
        />
        <StatCard
          title="Total Views"
          value="12.5K"
          change="+18% from last month"
          changeType="positive"
          icon={Eye}
        />
        <StatCard
          title="Click Rate"
          value="3.2%"
          change="-0.1% from last month"
          changeType="negative"
          icon={MousePointer}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {activity.type === 'content' && (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <FileText className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {activity.type === 'widget' && (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Layout className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      {activity.type === 'user' && (
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <Badge variant={activity.status} size="sm">
                          {activity.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">Create Content</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Layout className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">New Widget</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">Invite Team</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
                
                <button className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium">View Analytics</span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Content */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">React Best Practices</p>
                    <p className="text-xs text-gray-500">2.1K views</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">+15%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">TypeScript Guide</p>
                    <p className="text-xs text-gray-500">1.8K views</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">+8%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">CSS Grid Tutorial</p>
                    <p className="text-xs text-gray-500">1.5K views</p>
                  </div>
                  <div className="flex items-center text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">+12%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export { DashboardPage };
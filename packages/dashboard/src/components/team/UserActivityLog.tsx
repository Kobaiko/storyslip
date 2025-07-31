import React, { useState } from 'react';
import { 
  Activity, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  Settings, 
  Shield, 
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingSpinner';
import { formatDate, formatRelativeTime } from '../../lib/utils';

interface ActivityLog {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface UserActivityLogProps {
  websiteId: string;
  activities: ActivityLog[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'user.login': LogIn,
  'user.logout': LogOut,
  'user.created': Plus,
  'user.updated': Edit,
  'user.deleted': Trash2,
  'content.created': Plus,
  'content.updated': Edit,
  'content.published': Eye,
  'content.deleted': Trash2,
  'settings.updated': Settings,
  'role.changed': Shield,
  'default': Activity,
};

const ACTION_COLORS: Record<string, string> = {
  'user.login': 'text-green-600',
  'user.logout': 'text-gray-600',
  'user.created': 'text-blue-600',
  'user.updated': 'text-yellow-600',
  'user.deleted': 'text-red-600',
  'content.created': 'text-blue-600',
  'content.updated': 'text-yellow-600',
  'content.published': 'text-green-600',
  'content.deleted': 'text-red-600',
  'settings.updated': 'text-purple-600',
  'role.changed': 'text-orange-600',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

export function UserActivityLog({
  websiteId,
  activities,
  loading,
  error,
  onRefresh,
  onLoadMore,
  hasMore = false,
}: UserActivityLogProps) {
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    resource_type: '',
    severity: '',
    date_from: '',
    date_to: '',
  });

  const [searchQuery, setSearchQuery] = useState('');

  const getActionIcon = (action: string) => {
    const IconComponent = ACTION_ICONS[action] || ACTION_ICONS.default;
    const colorClass = ACTION_COLORS[action] || 'text-gray-600';
    return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
  };

  const getActionDescription = (activity: ActivityLog) => {
    const { action, resource_type, resource_name, user, details } = activity;
    
    switch (action) {
      case 'user.login':
        return `${user.name} signed in`;
      case 'user.logout':
        return `${user.name} signed out`;
      case 'user.created':
        return `${user.name} created a new user account`;
      case 'user.updated':
        return `${user.name} updated user profile`;
      case 'user.deleted':
        return `${user.name} deleted a user account`;
      case 'content.created':
        return `${user.name} created ${resource_type} "${resource_name}"`;
      case 'content.updated':
        return `${user.name} updated ${resource_type} "${resource_name}"`;
      case 'content.published':
        return `${user.name} published ${resource_type} "${resource_name}"`;
      case 'content.deleted':
        return `${user.name} deleted ${resource_type} "${resource_name}"`;
      case 'settings.updated':
        return `${user.name} updated ${resource_type} settings`;
      case 'role.changed':
        return `${user.name} changed user role ${details?.from_role ? `from ${details.from_role} to ${details.to_role}` : ''}`;
      default:
        return `${user.name} performed ${action} on ${resource_type}`;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (searchQuery && !getActionDescription(activity).toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.user && !activity.user.name.toLowerCase().includes(filters.user.toLowerCase())) {
      return false;
    }
    if (filters.action && activity.action !== filters.action) {
      return false;
    }
    if (filters.resource_type && activity.resource_type !== filters.resource_type) {
      return false;
    }
    if (filters.severity && activity.severity !== filters.severity) {
      return false;
    }
    if (filters.date_from && new Date(activity.created_at) < new Date(filters.date_from)) {
      return false;
    }
    if (filters.date_to && new Date(activity.created_at) > new Date(filters.date_to)) {
      return false;
    }
    return true;
  });

  const uniqueActions = [...new Set(activities.map(a => a.action))];
  const uniqueResourceTypes = [...new Set(activities.map(a => a.resource_type))];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Activity Log ({filteredActivities.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            loading={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Activity className="h-4 w-4" />}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilters({
                  user: '',
                  action: '',
                  resource_type: '',
                  severity: '',
                  date_from: '',
                  date_to: '',
                });
              }}
            >
              Clear Filters
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Input
              placeholder="User name"
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
            />
            
            <Select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              options={[
                { value: '', label: 'All Actions' },
                ...uniqueActions.map(action => ({ value: action, label: action })),
              ]}
            />
            
            <Select
              value={filters.resource_type}
              onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
              options={[
                { value: '', label: 'All Resources' },
                ...uniqueResourceTypes.map(type => ({ value: type, label: type })),
              ]}
            />
            
            <Select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              options={[
                { value: '', label: 'All Severities' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
            
            <Input
              type="date"
              placeholder="From date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />
            
            <Input
              type="date"
              placeholder="To date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />
          </div>
        </div>

        {/* Activity List */}
        <LoadingState
          loading={loading}
          error={error}
          isEmpty={filteredActivities.length === 0}
          emptyComponent={
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No activity found
              </h3>
              <p className="text-gray-500">
                {activities.length === 0 
                  ? 'No user activity has been recorded yet.'
                  : 'No activities match your current filters.'
                }
              </p>
            </div>
          }
        >
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {activity.user.avatar_url ? (
                    <img
                      src={activity.user.avatar_url}
                      alt={activity.user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {activity.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {getActionIcon(activity.action)}
                    <p className="text-sm text-gray-900">
                      {getActionDescription(activity)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatRelativeTime(activity.created_at)}</span>
                    {activity.ip_address && (
                      <span>IP: {activity.ip_address}</span>
                    )}
                    <Badge 
                      variant="secondary" 
                      size="sm"
                      className={SEVERITY_COLORS[activity.severity]}
                    >
                      {activity.severity}
                    </Badge>
                  </div>

                  {/* Additional Details */}
                  {activity.details && Object.keys(activity.details).length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      <details className="cursor-pointer">
                        <summary className="hover:text-gray-800">View details</summary>
                        <pre className="mt-1 bg-white p-2 rounded border text-xs overflow-x-auto">
                          {JSON.stringify(activity.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex-shrink-0 text-xs text-gray-500">
                  {formatDate(activity.created_at)}
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && onLoadMore && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={onLoadMore}
                loading={loading}
              >
                Load More Activities
              </Button>
            </div>
          )}
        </LoadingState>
      </CardContent>
    </Card>
  );
}
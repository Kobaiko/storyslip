import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { api } from '../../lib/api';

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    timestamp: number;
    details?: any;
  }>;
  metrics: {
    errorRate: number;
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
  recentEvents: Array<{
    id: string;
    timestamp: number;
    level: string;
    category: string;
    event: string;
    message: string;
  }>;
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    timestamp: number;
  }>;
}

interface PerformanceMetrics {
  metrics: Record<string, Array<{
    value: number;
    timestamp: number;
    tags?: Record<string, string>;
  }>>;
  statistics: Record<string, {
    count: number;
    min: number;
    max: number;
    avg: number;
    latest: number;
  }>;
}

interface ErrorMetrics {
  errorGroups: Array<{
    fingerprint: string;
    message: string;
    count: number;
    firstSeen: number;
    lastSeen: number;
  }>;
  summary: {
    totalErrors: number;
    uniqueErrors: number;
    errorRate: number;
  };
}

export const MonitoringDashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [errors, setErrors] = useState<ErrorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoringData = async () => {
    try {
      const [healthResponse, performanceResponse, errorsResponse] = await Promise.all([
        api.get('/monitoring/health/detailed'),
        api.get('/monitoring/metrics/performance', {
          params: {
            start: Date.now() - (60 * 60 * 1000), // Last hour
            end: Date.now()
          }
        }),
        api.get('/monitoring/metrics/errors', {
          params: {
            start: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
            end: Date.now()
          }
        })
      ]);

      setHealth(healthResponse.data);
      setPerformance(performanceResponse.data);
      setErrors(errorsResponse.data);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMonitoringData();
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await api.post(`/monitoring/alerts/${alertId}/resolve`);
      await fetchMonitoringData(); // Refresh data
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/monitoring/alerts/${alertId}/acknowledge`);
      await fetchMonitoringData(); // Refresh data
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  useEffect(() => {
    fetchMonitoringData();

    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Real-time system health and performance monitoring</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto-refresh
          </label>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? <LoadingSpinner size="sm" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(health?.overall || 'unknown')}>
                {health?.overall || 'Unknown'}
              </Badge>
              <span className="text-2xl font-bold">
                {health?.overall === 'healthy' ? '✓' : 
                 health?.overall === 'degraded' ? '⚠' : '✗'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.metrics.errorRate.toFixed(2)}%
            </div>
            <p className="text-xs text-gray-500">Last 5 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.metrics.uptime ? formatUptime(health.metrics.uptime) : 'N/A'}
            </div>
            <p className="text-xs text-gray-500">System uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.metrics.memory ? 
                Math.round((health.metrics.memory.heapUsed / health.metrics.memory.heapTotal) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-500">
              {health?.metrics.memory ? 
                `${Math.round(health.metrics.memory.heapUsed / 1024 / 1024)}MB / ${Math.round(health.metrics.memory.heapTotal / 1024 / 1024)}MB` : 
                'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {health?.activeAlerts && health.activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts ({health.activeAlerts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {health.activeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <span className="font-medium">{alert.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(alert.timestamp)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Health */}
      <Card>
        <CardHeader>
          <CardTitle>Services Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {health?.services.map((service) => (
              <div key={service.service} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">
                    {service.service.replace('_', ' ')}
                  </span>
                  <Badge className={getStatusColor(service.status)}>
                    {service.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Response Time: {service.responseTime}ms</p>
                  <p>Last Check: {formatTimestamp(service.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics (Last Hour)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performance && Object.entries(performance.statistics).map(([metric, stats]) => (
              <div key={metric} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 capitalize">
                  {metric.replace('_', ' ')}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Current:</span>
                    <span className="font-medium">{stats.latest.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span>{stats.avg.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min/Max:</span>
                    <span>{stats.min.toFixed(2)} / {stats.max.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Samples:</span>
                    <span>{stats.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Summary */}
      {errors && errors.errorGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Recent Errors (Last 24 Hours)
              <Badge className="ml-2 bg-red-100 text-red-800">
                {errors.summary.totalErrors} total, {errors.summary.uniqueErrors} unique
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {errors.errorGroups.slice(0, 10).map((error) => (
                <div key={error.fingerprint} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-red-600 mb-2">
                        {error.message}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Count: {error.count}</span>
                        <span>First: {formatTimestamp(error.firstSeen)}</span>
                        <span>Last: {formatTimestamp(error.lastSeen)}</span>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {error.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {health?.recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <Badge className={
                    event.level === 'error' ? 'bg-red-100 text-red-800' :
                    event.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                    event.level === 'info' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {event.level}
                  </Badge>
                  <span className="text-sm font-medium">{event.event}</span>
                  <span className="text-sm text-gray-600">{event.message}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
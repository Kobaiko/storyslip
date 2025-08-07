import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Eye, MousePointer, Clock, Users, Globe, Smartphone } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useWidgetAnalytics } from '../../hooks/useWidgets';

interface WidgetAnalyticsModalProps {
  widget: any;
  onClose: () => void;
}

export const WidgetAnalyticsModal: React.FC<WidgetAnalyticsModalProps> = ({
  widget,
  onClose,
}) => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0], // today
  });

  const { analytics, isLoading, refetch } = useWidgetAnalytics(widget.id, dateRange);

  const handleDateRangeChange = (range: string) => {
    const end = new Date().toISOString().split('T')[0];
    let start: string;

    switch (range) {
      case '7d':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30d':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '90d':
        start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    setDateRange({ start, end });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Analytics: ${widget.name}`}
      size="xl"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{widget.name}</h3>
            <p className="text-sm text-gray-600 capitalize">
              {widget.type.replace('_', ' ')} • {widget.layout} • {widget.theme}
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <select
              value={`${dateRange.start}_${dateRange.end}`}
              onChange={(e) => {
                const [start, end] = e.target.value.split('_');
                if (start && end) {
                  setDateRange({ start, end });
                } else {
                  handleDateRangeChange(e.target.value);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner />
              <p className="text-gray-600 mt-4">Loading analytics...</p>
            </div>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analytics.views)}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Clicks</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analytics.clicks)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MousePointer className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Engagement Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.engagement_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Time on Page</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatTime(analytics.average_time_on_page)}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Posts */}
            {analytics.popular_posts && analytics.popular_posts.length > 0 && (
              <div className="bg-white p-6 rounded-lg border">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Popular Posts</h4>
                <div className="space-y-3">
                  {analytics.popular_posts.slice(0, 5).map((post, index) => (
                    <div key={post.post_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{post.title}</h5>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(post.views)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3" />
                          {formatNumber(post.clicks)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Traffic Sources & Device Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Traffic Sources */}
              <div className="bg-white p-6 rounded-lg border">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Traffic Sources
                </h4>
                {Object.keys(analytics.traffic_sources).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analytics.traffic_sources)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([source, count]) => (
                        <div key={source} className="flex items-center justify-between">
                          <span className="text-gray-700 capitalize">{source}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(count / Math.max(...Object.values(analytics.traffic_sources))) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No traffic source data available</p>
                )}
              </div>

              {/* Device Breakdown */}
              <div className="bg-white p-6 rounded-lg border">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Device Breakdown
                </h4>
                {Object.keys(analytics.device_breakdown).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analytics.device_breakdown)
                      .sort(([,a], [,b]) => b - a)
                      .map(([device, count]) => (
                        <div key={device} className="flex items-center justify-between">
                          <span className="text-gray-700 capitalize">{device}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{
                                  width: `${(count / Math.max(...Object.values(analytics.device_breakdown))) * 100}%`
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No device data available</p>
                )}
              </div>
            </div>

            {/* Geographic Data */}
            {Object.keys(analytics.geographic_data).length > 0 && (
              <div className="bg-white p-6 rounded-lg border">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Geographic Distribution</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(analytics.geographic_data)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([country, count]) => (
                      <div key={country} className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{country}</p>
                        <p className="text-sm text-gray-600">{count} views</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600">
              Analytics data will appear here once your widget starts receiving traffic.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="text-sm text-gray-500">
            Data from {new Date(dateRange.start).toLocaleDateString()} to {new Date(dateRange.end).toLocaleDateString()}
          </div>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
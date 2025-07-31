import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Globe, 
  Smartphone, 
  Users,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Form';
import { Badge } from '../ui/Badge';

interface AnalyticsFiltersProps {
  filters: {
    period: string;
    website_id: string;
    country?: string;
    device_type?: string;
    traffic_source?: string;
    content_category?: string;
    date_range?: {
      start: string;
      end: string;
    };
  };
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function AnalyticsFilters({ 
  filters, 
  onFiltersChange, 
  onClose 
}: AnalyticsFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [customDateRange, setCustomDateRange] = useState(false);

  const countryOptions = [
    { value: '', label: 'All Countries' },
    { value: 'US', label: 'United States' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'CA', label: 'Canada' },
    { value: 'DE', label: 'Germany' },
    { value: 'FR', label: 'France' },
    { value: 'AU', label: 'Australia' },
    { value: 'JP', label: 'Japan' },
    { value: 'BR', label: 'Brazil' },
    { value: 'IN', label: 'India' },
  ];

  const deviceOptions = [
    { value: '', label: 'All Devices' },
    { value: 'desktop', label: 'Desktop' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' },
  ];

  const trafficSourceOptions = [
    { value: '', label: 'All Sources' },
    { value: 'organic_search', label: 'Organic Search' },
    { value: 'direct', label: 'Direct' },
    { value: 'social', label: 'Social Media' },
    { value: 'referral', label: 'Referrals' },
    { value: 'email', label: 'Email' },
    { value: 'paid_search', label: 'Paid Search' },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'blog', label: 'Blog Posts' },
    { value: 'news', label: 'News' },
    { value: 'tutorials', label: 'Tutorials' },
    { value: 'products', label: 'Products' },
    { value: 'pages', label: 'Static Pages' },
  ];

  const periodOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    
    if (key === 'period' && value === 'custom') {
      setCustomDateRange(true);
    } else if (key === 'period' && value !== 'custom') {
      setCustomDateRange(false);
      delete newFilters.date_range;
    }
    
    setLocalFilters(newFilters);
  };

  const handleDateRangeChange = (key: 'start' | 'end', value: string) => {
    const newFilters = {
      ...localFilters,
      date_range: {
        ...localFilters.date_range,
        [key]: value,
      },
    };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const resetFilters = () => {
    const resetFilters = {
      period: '7d',
      website_id: localFilters.website_id,
    };
    setLocalFilters(resetFilters);
    setCustomDateRange(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.country) count++;
    if (localFilters.device_type) count++;
    if (localFilters.traffic_source) count++;
    if (localFilters.content_category) count++;
    if (localFilters.date_range) count++;
    return count;
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...localFilters };
    delete newFilters[key];
    
    if (key === 'date_range') {
      setCustomDateRange(false);
      newFilters.period = '7d';
    }
    
    setLocalFilters(newFilters);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Analytics Filters
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Active Filters */}
          {getActiveFiltersCount() > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Active Filters</h4>
              <div className="flex flex-wrap gap-2">
                {localFilters.country && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center space-x-1"
                  >
                    <Globe className="h-3 w-3" />
                    <span>{countryOptions.find(c => c.value === localFilters.country)?.label}</span>
                    <button
                      onClick={() => removeFilter('country')}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {localFilters.device_type && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center space-x-1"
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>{deviceOptions.find(d => d.value === localFilters.device_type)?.label}</span>
                    <button
                      onClick={() => removeFilter('device_type')}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {localFilters.traffic_source && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center space-x-1"
                  >
                    <Search className="h-3 w-3" />
                    <span>{trafficSourceOptions.find(t => t.value === localFilters.traffic_source)?.label}</span>
                    <button
                      onClick={() => removeFilter('traffic_source')}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {localFilters.content_category && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center space-x-1"
                  >
                    <Users className="h-3 w-3" />
                    <span>{categoryOptions.find(c => c.value === localFilters.content_category)?.label}</span>
                    <button
                      onClick={() => removeFilter('content_category')}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {localFilters.date_range && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center space-x-1"
                  >
                    <Calendar className="h-3 w-3" />
                    <span>Custom Range</span>
                    <button
                      onClick={() => removeFilter('date_range')}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <Select
                value={localFilters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
                options={periodOptions}
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <Select
                value={localFilters.country || ''}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                options={countryOptions}
              />
            </div>

            {/* Device Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Type
              </label>
              <Select
                value={localFilters.device_type || ''}
                onChange={(e) => handleFilterChange('device_type', e.target.value)}
                options={deviceOptions}
              />
            </div>

            {/* Traffic Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Traffic Source
              </label>
              <Select
                value={localFilters.traffic_source || ''}
                onChange={(e) => handleFilterChange('traffic_source', e.target.value)}
                options={trafficSourceOptions}
              />
            </div>

            {/* Content Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Category
              </label>
              <Select
                value={localFilters.content_category || ''}
                onChange={(e) => handleFilterChange('content_category', e.target.value)}
                options={categoryOptions}
              />
            </div>
          </div>

          {/* Custom Date Range */}
          {customDateRange && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Date Range
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={localFilters.date_range?.start || ''}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={localFilters.date_range?.end || ''}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={resetFilters}
              disabled={getActiveFiltersCount() === 0}
            >
              Reset All
            </Button>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={applyFilters}
              >
                Apply Filters
                {getActiveFiltersCount() > 0 && (
                  <Badge 
                    variant="secondary" 
                    size="sm" 
                    className="ml-2 bg-white text-blue-600"
                  >
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState } from 'react';
import { Download, FileText, Database, Calendar, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Form';
import { SwitchWithLabel } from '../ui/Switch';
import { useToast } from '../ui/Toast';

export function DataExportSettings() {
  const [settings, setSettings] = useState({
    export_format: 'json',
    include_metadata: true,
    include_analytics: true,
    include_team_data: false,
    auto_export_enabled: false,
    auto_export_frequency: 'monthly',
    export_destination: 'download',
  });

  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();

  const handleExport = async (type: 'content' | 'analytics' | 'full') => {
    setExporting(true);
    try {
      // Mock export - in real app this would trigger an export job
      await new Promise(resolve => setTimeout(resolve, 2000));
      success(`${type} export started. You'll receive an email when it's ready.`);
    } catch (error) {
      showError(`Failed to start ${type} export`);
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Export settings saved successfully');
    } catch (error) {
      showError('Failed to save export settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Quick Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Export your data immediately. Large exports may take some time to process.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 text-center">
              <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Content Export</h3>
              <p className="text-sm text-gray-600 mb-3">
                Export all your content, categories, and tags
              </p>
              <Button
                onClick={() => handleExport('content')}
                loading={exporting}
                size="sm"
                className="w-full"
              >
                Export Content
              </Button>
            </div>
            
            <div className="border rounded-lg p-4 text-center">
              <Database className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Analytics Export</h3>
              <p className="text-sm text-gray-600 mb-3">
                Export analytics data and performance metrics
              </p>
              <Button
                onClick={() => handleExport('analytics')}
                loading={exporting}
                size="sm"
                className="w-full"
              >
                Export Analytics
              </Button>
            </div>
            
            <div className="border rounded-lg p-4 text-center">
              <Download className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Full Export</h3>
              <p className="text-sm text-gray-600 mb-3">
                Export all your data including settings
              </p>
              <Button
                onClick={() => handleExport('full')}
                loading={exporting}
                size="sm"
                className="w-full"
              >
                Export Everything
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Export Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Export Format"
              value={settings.export_format}
              onChange={(e) => setSettings({ ...settings, export_format: e.target.value })}
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'csv', label: 'CSV' },
                { value: 'xml', label: 'XML' },
                { value: 'xlsx', label: 'Excel (XLSX)' },
              ]}
            />
            
            <Select
              label="Export Destination"
              value={settings.export_destination}
              onChange={(e) => setSettings({ ...settings, export_destination: e.target.value })}
              options={[
                { value: 'download', label: 'Direct Download' },
                { value: 'email', label: 'Email Link' },
                { value: 's3', label: 'Amazon S3' },
                { value: 'gdrive', label: 'Google Drive' },
              ]}
            />
          </div>

          <div className="space-y-3">
            <SwitchWithLabel
              label="Include Metadata"
              helperText="Include creation dates, author info, and other metadata"
              checked={settings.include_metadata}
              onChange={(checked) => setSettings({ ...settings, include_metadata: checked })}
            />
            
            <SwitchWithLabel
              label="Include Analytics Data"
              helperText="Include view counts, engagement metrics, and performance data"
              checked={settings.include_analytics}
              onChange={(checked) => setSettings({ ...settings, include_analytics: checked })}
            />
            
            <SwitchWithLabel
              label="Include Team Data"
              helperText="Include team member information and activity logs"
              checked={settings.include_team_data}
              onChange={(checked) => setSettings({ ...settings, include_team_data: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Automated Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Automated Exports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchWithLabel
            label="Enable Automated Exports"
            helperText="Automatically export your data on a regular schedule"
            checked={settings.auto_export_enabled}
            onChange={(checked) => setSettings({ ...settings, auto_export_enabled: checked })}
          />
          
          {settings.auto_export_enabled && (
            <div className="mt-4">
              <Select
                label="Export Frequency"
                value={settings.auto_export_frequency}
                onChange={(e) => setSettings({ ...settings, auto_export_frequency: e.target.value })}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                ]}
              />
              
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Next automated export:</strong> {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                id: '1',
                type: 'Full Export',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                size: '2.4 MB',
              },
              {
                id: '2',
                type: 'Content Export',
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                size: '1.8 MB',
              },
              {
                id: '3',
                type: 'Analytics Export',
                date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                size: '0.6 MB',
              },
            ].map((exportItem) => (
              <div key={exportItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{exportItem.type}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(exportItem.date).toLocaleDateString()} • {exportItem.size}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {exportItem.status}
                  </span>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          loading={saving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save Export Settings
        </Button>
      </div>
    </div>
  );
}
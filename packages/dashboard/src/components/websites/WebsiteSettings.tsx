import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Settings, 
  Palette, 
  Code, 
  Shield, 
  Globe, 
  Eye,
  Save,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Form, FormField, FormActions, Textarea, Checkbox, Select } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { copyToClipboard } from '../../lib/utils';
import { Website } from '../../hooks/useWebsites';

// Configuration schema
const configSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']),
  position: z.enum(['inline', 'sidebar', 'popup']),
  width: z.string().optional(),
  height: z.string().optional(),
  border_radius: z.string().optional(),
  primary_color: z.string().optional(),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
  font_family: z.string().optional(),
  show_branding: z.boolean(),
  enable_analytics: z.boolean(),
  cache_duration: z.number().min(0).max(3600),
  rate_limit: z.number().min(1).max(1000),
  allowed_origins: z.string().optional(),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface WebsiteSettingsProps {
  website: Website;
  onUpdate: (config: Record<string, any>) => Promise<void>;
  onRegenerateApiKey: () => Promise<void>;
  loading?: boolean;
}

export function WebsiteSettings({
  website,
  onUpdate,
  onRegenerateApiKey,
  loading = false,
}: WebsiteSettingsProps) {
  const [activeTab, setActiveTab] = useState<'appearance' | 'behavior' | 'security' | 'advanced'>('appearance');
  const { success, error: showError } = useToast();

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      theme: website.configuration?.theme || 'auto',
      position: website.configuration?.position || 'inline',
      width: website.configuration?.width || '',
      height: website.configuration?.height || '',
      border_radius: website.configuration?.border_radius || '8px',
      primary_color: website.configuration?.primary_color || '#3B82F6',
      background_color: website.configuration?.background_color || '#FFFFFF',
      text_color: website.configuration?.text_color || '#1F2937',
      font_family: website.configuration?.font_family || 'system-ui',
      show_branding: website.configuration?.show_branding ?? true,
      enable_analytics: website.configuration?.enable_analytics ?? true,
      cache_duration: website.configuration?.cache_duration || 300,
      rate_limit: website.configuration?.rate_limit || 100,
      allowed_origins: website.configuration?.allowed_origins?.join('\n') || '',
    },
  });

  const handleSubmit = async (data: ConfigFormData) => {
    try {
      const config = {
        ...data,
        allowed_origins: data.allowed_origins 
          ? data.allowed_origins.split('\n').filter(origin => origin.trim())
          : [],
      };
      
      await onUpdate(config);
      success('Website settings updated successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to update settings');
    }
  };

  const handleCopyApiKey = async () => {
    try {
      await copyToClipboard(website.api_key);
      success('API key copied to clipboard');
    } catch (error) {
      showError('Failed to copy API key');
    }
  };

  const handleCopyEmbedCode = async () => {
    const embedCode = `<script src="https://cdn.storyslip.com/widget.js"></script>
<div id="storyslip-widget" data-website-id="${website.id}"></div>
<script>
  StorySlip.init({
    websiteId: '${website.id}',
    domain: '${website.domain}',
    theme: '${form.watch('theme')}',
    position: '${form.watch('position')}',
    primaryColor: '${form.watch('primary_color')}',
    showBranding: ${form.watch('show_branding')}
  });
</script>`;

    try {
      await copyToClipboard(embedCode);
      success('Embed code copied to clipboard');
    } catch (error) {
      showError('Failed to copy embed code');
    }
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'behavior', label: 'Behavior', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'advanced', label: 'Advanced', icon: Code },
  ];

  const watchedValues = form.watch();

  return (
    <div className="space-y-6">
      {/* Website Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Website Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Website Name</label>
              <p className="text-sm text-gray-900 mt-1">{website.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Domain</label>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-sm text-gray-900">{website.domain}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(website.domain, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">API Key</label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                  {website.api_key.substring(0, 8)}...{website.api_key.substring(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyApiKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerateApiKey}
                  loading={loading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <div className="mt-1">
                <Badge variant={website.integration_status === 'success' ? 'success' : 'warning'}>
                  {website.integration_status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Configuration</CardTitle>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </CardHeader>

        <CardContent>
          <Form onSubmit={form.handleSubmit(handleSubmit)}>
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField>
                    <Select
                      label="Theme"
                      value={form.watch('theme')}
                      onChange={(e) => form.setValue('theme', e.target.value as any)}
                      options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'auto', label: 'Auto (System)' },
                      ]}
                    />
                  </FormField>

                  <FormField>
                    <Select
                      label="Position"
                      value={form.watch('position')}
                      onChange={(e) => form.setValue('position', e.target.value as any)}
                      options={[
                        { value: 'inline', label: 'Inline' },
                        { value: 'sidebar', label: 'Sidebar' },
                        { value: 'popup', label: 'Popup' },
                      ]}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField>
                    <Input
                      label="Width"
                      placeholder="100% or 400px"
                      {...form.register('width')}
                    />
                  </FormField>

                  <FormField>
                    <Input
                      label="Height"
                      placeholder="auto or 600px"
                      {...form.register('height')}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField>
                    <Input
                      label="Primary Color"
                      type="color"
                      {...form.register('primary_color')}
                    />
                  </FormField>

                  <FormField>
                    <Input
                      label="Background Color"
                      type="color"
                      {...form.register('background_color')}
                    />
                  </FormField>

                  <FormField>
                    <Input
                      label="Text Color"
                      type="color"
                      {...form.register('text_color')}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField>
                    <Input
                      label="Border Radius"
                      placeholder="8px"
                      {...form.register('border_radius')}
                    />
                  </FormField>

                  <FormField>
                    <Input
                      label="Font Family"
                      placeholder="system-ui, Arial, sans-serif"
                      {...form.register('font_family')}
                    />
                  </FormField>
                </div>
              </div>
            )}

            {activeTab === 'behavior' && (
              <div className="space-y-6">
                <FormField>
                  <Checkbox
                    label="Show StorySlip Branding"
                    checked={form.watch('show_branding')}
                    onChange={(e) => form.setValue('show_branding', e.target.checked)}
                    helperText="Display 'Powered by StorySlip' link in the widget"
                  />
                </FormField>

                <FormField>
                  <Checkbox
                    label="Enable Analytics"
                    checked={form.watch('enable_analytics')}
                    onChange={(e) => form.setValue('enable_analytics', e.target.checked)}
                    helperText="Track widget views and interactions"
                  />
                </FormField>

                <FormField>
                  <Input
                    label="Cache Duration (seconds)"
                    type="number"
                    min="0"
                    max="3600"
                    {...form.register('cache_duration', { valueAsNumber: true })}
                    helperText="How long to cache content (0 = no cache, max 3600)"
                  />
                </FormField>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <FormField>
                  <Input
                    label="Rate Limit (requests per minute)"
                    type="number"
                    min="1"
                    max="1000"
                    {...form.register('rate_limit', { valueAsNumber: true })}
                    helperText="Maximum API requests per minute from this domain"
                  />
                </FormField>

                <FormField>
                  <Textarea
                    label="Allowed Origins"
                    placeholder="https://example.com&#10;https://www.example.com"
                    {...form.register('allowed_origins')}
                    helperText="One origin per line. Leave empty to allow all origins."
                    rows={4}
                  />
                </FormField>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                {/* Embed Code */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Current Embed Code
                  </label>
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{`<script src="https://cdn.storyslip.com/widget.js"></script>
<div id="storyslip-widget" data-website-id="${website.id}"></div>
<script>
  StorySlip.init({
    websiteId: '${website.id}',
    domain: '${website.domain}',
    theme: '${watchedValues.theme}',
    position: '${watchedValues.position}',
    primaryColor: '${watchedValues.primary_color}',
    showBranding: ${watchedValues.show_branding}
  });
</script>`}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyEmbedCode}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Widget Preview
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div 
                      className="rounded p-4 shadow-sm"
                      style={{
                        backgroundColor: watchedValues.background_color,
                        color: watchedValues.text_color,
                        borderRadius: watchedValues.border_radius,
                        fontFamily: watchedValues.font_family,
                      }}
                    >
                      <div 
                        className="text-lg font-semibold mb-2"
                        style={{ color: watchedValues.primary_color }}
                      >
                        Sample Content Title
                      </div>
                      <p className="text-sm mb-3">
                        This is how your widget will appear on your website with the current settings.
                      </p>
                      {watchedValues.show_branding && (
                        <div className="text-xs opacity-75">
                          Powered by StorySlip
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Reset
              </Button>
              <Button
                type="submit"
                loading={loading}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Settings
              </Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
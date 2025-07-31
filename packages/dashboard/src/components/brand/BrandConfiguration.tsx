import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Info, 
  Globe, 
  Palette, 
  Type,
  Layout,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea, Select, Checkbox, Switch } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

interface BrandConfigurationProps {
  config: any;
  onChange: () => void;
  onSave: (config: any) => void;
}

export function BrandConfiguration({ 
  config, 
  onChange, 
  onSave 
}: BrandConfigurationProps) {
  const [localConfig, setLocalConfig] = useState({
    company_name: '',
    company_description: '',
    website_url: '',
    support_email: '',
    support_phone: '',
    timezone: 'UTC',
    language: 'en',
    currency: 'USD',
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    enable_white_labeling: false,
    hide_powered_by: false,
    custom_footer_text: '',
    analytics_tracking_id: '',
    custom_css: '',
    custom_js: '',
    seo_title_template: '',
    seo_description_template: '',
    social_sharing_enabled: true,
    comments_enabled: true,
    search_enabled: true,
    rss_enabled: true,
    ...config,
  });

  const { success } = useToast();

  useEffect(() => {
    setLocalConfig({ ...localConfig, ...config });
  }, [config]);

  const handleChange = (field: string, value: any) => {
    setLocalConfig({ ...localConfig, [field]: value });
    onChange();
  };

  const handleSave = () => {
    onSave(localConfig);
  };

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'US Dollar ($)' },
    { value: 'EUR', label: 'Euro (€)' },
    { value: 'GBP', label: 'British Pound (£)' },
    { value: 'JPY', label: 'Japanese Yen (¥)' },
    { value: 'CAD', label: 'Canadian Dollar (C$)' },
    { value: 'AUD', label: 'Australian Dollar (A$)' },
  ];

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={localConfig.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              placeholder="Your Company Name"
              required
            />
            
            <Input
              label="Website URL"
              type="url"
              value={localConfig.website_url}
              onChange={(e) => handleChange('website_url', e.target.value)}
              placeholder="https://yourcompany.com"
            />
          </div>

          <Textarea
            label="Company Description"
            value={localConfig.company_description}
            onChange={(e) => handleChange('company_description', e.target.value)}
            placeholder="Brief description of your company..."
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Support Email"
              type="email"
              value={localConfig.support_email}
              onChange={(e) => handleChange('support_email', e.target.value)}
              placeholder="support@yourcompany.com"
            />
            
            <Input
              label="Support Phone"
              type="tel"
              value={localConfig.support_phone}
              onChange={(e) => handleChange('support_phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </CardContent>
      </Card>

      {/* Localization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Localization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Timezone"
              value={localConfig.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              options={timezoneOptions}
            />
            
            <Select
              label="Language"
              value={localConfig.language}
              onChange={(e) => handleChange('language', e.target.value)}
              options={languageOptions}
            />
            
            <Select
              label="Currency"
              value={localConfig.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              options={currencyOptions}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Date Format"
              value={localConfig.date_format}
              onChange={(e) => handleChange('date_format', e.target.value)}
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
                { value: 'MMM DD, YYYY', label: 'Jan 01, 2024' },
              ]}
            />
            
            <Select
              label="Time Format"
              value={localConfig.time_format}
              onChange={(e) => handleChange('time_format', e.target.value)}
              options={[
                { value: '12h', label: '12 Hour (AM/PM)' },
                { value: '24h', label: '24 Hour' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* White-labeling Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            White-labeling
            <Badge variant="info" className="ml-2">Pro Feature</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Switch
              label="Enable White-labeling"
              checked={localConfig.enable_white_labeling}
              onChange={(checked) => handleChange('enable_white_labeling', checked)}
              helperText="Remove StorySlip branding and use your own"
            />
            
            <Switch
              label="Hide 'Powered by StorySlip'"
              checked={localConfig.hide_powered_by}
              onChange={(checked) => handleChange('hide_powered_by', checked)}
              disabled={!localConfig.enable_white_labeling}
              helperText="Remove the powered by footer link"
            />
          </div>

          <Input
            label="Custom Footer Text"
            value={localConfig.custom_footer_text}
            onChange={(e) => handleChange('custom_footer_text', e.target.value)}
            placeholder="© 2024 Your Company. All rights reserved."
            disabled={!localConfig.enable_white_labeling}
          />
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Type className="h-5 w-5 mr-2" />
            SEO Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="SEO Title Template"
            value={localConfig.seo_title_template}
            onChange={(e) => handleChange('seo_title_template', e.target.value)}
            placeholder="{title} | {company_name}"
            helperText="Use {title}, {company_name}, {category} as variables"
          />
          
          <Textarea
            label="SEO Description Template"
            value={localConfig.seo_description_template}
            onChange={(e) => handleChange('seo_description_template', e.target.value)}
            placeholder="{excerpt} - Read more on {company_name}"
            helperText="Use {excerpt}, {title}, {company_name} as variables"
            rows={2}
          />

          <Input
            label="Analytics Tracking ID"
            value={localConfig.analytics_tracking_id}
            onChange={(e) => handleChange('analytics_tracking_id', e.target.value)}
            placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
            helperText="Google Analytics tracking ID"
          />
        </CardContent>
      </Card>

      {/* Feature Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layout className="h-5 w-5 mr-2" />
            Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Checkbox
              label="Social Sharing"
              checked={localConfig.social_sharing_enabled}
              onChange={(e) => handleChange('social_sharing_enabled', e.target.checked)}
              helperText="Enable social media sharing buttons"
            />
            
            <Checkbox
              label="Comments"
              checked={localConfig.comments_enabled}
              onChange={(e) => handleChange('comments_enabled', e.target.checked)}
              helperText="Enable commenting system"
            />
            
            <Checkbox
              label="Search"
              checked={localConfig.search_enabled}
              onChange={(e) => handleChange('search_enabled', e.target.checked)}
              helperText="Enable content search functionality"
            />
            
            <Checkbox
              label="RSS Feed"
              checked={localConfig.rss_enabled}
              onChange={(e) => handleChange('rss_enabled', e.target.checked)}
              helperText="Generate RSS feed for content"
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Advanced Customization
            <Badge variant="warning" className="ml-2">Advanced</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Custom CSS"
            value={localConfig.custom_css}
            onChange={(e) => handleChange('custom_css', e.target.value)}
            placeholder="/* Your custom CSS styles */\n.custom-class {\n  color: #333;\n}"
            rows={6}
            helperText="Add custom CSS to override default styles"
          />
          
          <Textarea
            label="Custom JavaScript"
            value={localConfig.custom_js}
            onChange={(e) => handleChange('custom_js', e.target.value)}
            placeholder="// Your custom JavaScript\nconsole.log('Custom JS loaded');"
            rows={6}
            helperText="Add custom JavaScript for advanced functionality"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} leftIcon={<Settings className="h-4 w-4" />}>
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
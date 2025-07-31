import React, { useState } from 'react';
import { 
  Palette, 
  Upload, 
  Eye, 
  Save, 
  RotateCcw, 
  Globe, 
  Mail,
  Smartphone,
  Monitor,
  Settings
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { useToast } from '../components/ui/Toast';
import { BrandConfiguration } from '../components/brand/BrandConfiguration';
import { ColorSchemeCustomizer } from '../components/brand/ColorSchemeCustomizer';
import { LogoUploader } from '../components/brand/LogoUploader';
import { DomainConfiguration } from '../components/brand/DomainConfiguration';
import { EmailTemplateCustomizer } from '../components/brand/EmailTemplateCustomizer';
import { BrandPreview } from '../components/brand/BrandPreview';
import { MultiClientBrandManager } from '../components/brand/MultiClientBrandManager';
import { useBrandConfiguration } from '../hooks/useBrandConfiguration';

// Mock website ID - in real app this would come from context or route params
const MOCK_WEBSITE_ID = '123e4567-e89b-12d3-a456-426614174001';

export function BrandPage() {
  const [activeTab, setActiveTab] = useState('configuration');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { success, error: showError } = useToast();

  // API hooks
  const {
    data: brandConfig,
    isLoading,
    error,
    updateBrandConfiguration,
    resetBrandConfiguration,
  } = useBrandConfiguration(MOCK_WEBSITE_ID);

  const handleSave = async (configData: any) => {
    try {
      await updateBrandConfiguration.mutateAsync(configData);
      success('Brand configuration saved successfully');
      setHasUnsavedChanges(false);
    } catch (error: any) {
      showError(error.message || 'Failed to save brand configuration');
    }
  };

  const handleReset = async () => {
    try {
      await resetBrandConfiguration.mutateAsync();
      success('Brand configuration reset to defaults');
      setHasUnsavedChanges(false);
    } catch (error: any) {
      showError(error.message || 'Failed to reset brand configuration');
    }
  };

  const handlePreview = () => {
    // Open preview in new window/tab
    window.open(`/brand-preview/${MOCK_WEBSITE_ID}`, '_blank');
  };

  const handleConfigChange = () => {
    setHasUnsavedChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-4">Failed to load brand configuration</div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Palette className="h-6 w-6 mr-2" />
            Brand Configuration
          </h1>
          <p className="text-gray-600">Customize your brand appearance and white-label settings</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          
          <div className="flex items-center space-x-2 border rounded-lg p-1">
            <Button
              variant={previewMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            onClick={handlePreview}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            Preview
          </Button>
          
          <Button
            variant="outline"
            onClick={handleReset}
            leftIcon={<RotateCcw className="h-4 w-4" />}
            disabled={resetBrandConfiguration.isPending}
          >
            Reset
          </Button>
          
          <Button
            onClick={() => handleSave(brandConfig)}
            loading={updateBrandConfiguration.isPending}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="configuration">
                <Settings className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="colors">
                <Palette className="h-4 w-4 mr-2" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="logo">
                <Upload className="h-4 w-4 mr-2" />
                Logo
              </TabsTrigger>
              <TabsTrigger value="domain">
                <Globe className="h-4 w-4 mr-2" />
                Domain
              </TabsTrigger>
              <TabsTrigger value="emails">
                <Mail className="h-4 w-4 mr-2" />
                Emails
              </TabsTrigger>
            </TabsList>

            <TabsContent value="configuration" className="mt-6">
              <BrandConfiguration
                config={brandConfig}
                onChange={handleConfigChange}
                onSave={handleSave}
              />
            </TabsContent>

            <TabsContent value="colors" className="mt-6">
              <ColorSchemeCustomizer
                config={brandConfig}
                onChange={handleConfigChange}
                onSave={handleSave}
              />
            </TabsContent>

            <TabsContent value="logo" className="mt-6">
              <LogoUploader
                config={brandConfig}
                onChange={handleConfigChange}
                onSave={handleSave}
              />
            </TabsContent>

            <TabsContent value="domain" className="mt-6">
              <DomainConfiguration
                config={brandConfig}
                onChange={handleConfigChange}
                onSave={handleSave}
              />
            </TabsContent>

            <TabsContent value="emails" className="mt-6">
              <EmailTemplateCustomizer
                config={brandConfig}
                onChange={handleConfigChange}
                onSave={handleSave}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-1">
          <BrandPreview
            config={brandConfig}
            mode={previewMode}
          />
        </div>
      </div>

      {/* Multi-Client Management (for agencies) */}
      <MultiClientBrandManager />
    </div>
  );
}
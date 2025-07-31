import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Image, 
  Trash2, 
  Eye, 
  Download,
  Crop,
  RotateCw,
  Maximize2,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { Modal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface LogoUploaderProps {
  config: any;
  onChange: () => void;
  onSave: (config: any) => void;
}

interface LogoConfig {
  primary_logo_url: string;
  secondary_logo_url: string;
  favicon_url: string;
  logo_width: number;
  logo_height: number;
  logo_position: 'left' | 'center' | 'right';
  show_logo_text: boolean;
  logo_text: string;
  logo_alt_text: string;
}

export function LogoUploader({ 
  config, 
  onChange, 
  onSave 
}: LogoUploaderProps) {
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    primary_logo_url: '',
    secondary_logo_url: '',
    favicon_url: '',
    logo_width: 200,
    logo_height: 60,
    logo_position: 'left',
    show_logo_text: true,
    logo_text: 'Your Company',
    logo_alt_text: 'Company Logo',
    ...config?.logo,
  });

  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewModal = useModal();
  const { success, error: showError } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0], 'primary');
    }
  }, []);

  const handleFileUpload = async (file: File, logoType: 'primary' | 'secondary' | 'favicon') => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Mock upload - in real app this would upload to your storage service
      const mockUpload = () => new Promise<string>((resolve) => {
        setTimeout(() => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }, 1000);
      });

      const imageUrl = await mockUpload();
      
      const newConfig = {
        ...logoConfig,
        [`${logoType}_logo_url`]: imageUrl,
      };
      
      setLogoConfig(newConfig);
      onChange();
      success(`${logoType.charAt(0).toUpperCase() + logoType.slice(1)} logo uploaded successfully`);
    } catch (error) {
      showError('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (field: keyof LogoConfig, value: any) => {
    const newConfig = { ...logoConfig, [field]: value };
    setLogoConfig(newConfig);
    onChange();
  };

  const handleSave = () => {
    onSave({ ...config, logo: logoConfig });
  };

  const removeLogo = (logoType: 'primary' | 'secondary' | 'favicon') => {
    const newConfig = {
      ...logoConfig,
      [`${logoType}_logo_url`]: '',
    };
    setLogoConfig(newConfig);
    onChange();
  };

  const openPreview = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    previewModal.open();
  };

  const LogoUploadArea = ({ 
    logoType, 
    title, 
    description, 
    currentUrl,
    recommendedSize 
  }: {
    logoType: 'primary' | 'secondary' | 'favicon';
    title: string;
    description: string;
    currentUrl: string;
    recommendedSize: string;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="secondary" size="sm">{recommendedSize}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{description}</p>
          
          {currentUrl ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img
                  src={currentUrl}
                  alt={`${logoType} logo`}
                  className="max-w-full h-20 object-contain border rounded-lg"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPreview(currentUrl)}
                  leftIcon={<Eye className="h-4 w-4" />}
                >
                  Preview
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeLogo(logoType)}
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drag and drop your logo here, or{' '}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-700 underline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileUpload(file, logoType);
                    };
                    input.click();
                  }}
                >
                  browse files
                </button>
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, SVG up to 5MB
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Logo Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LogoUploadArea
          logoType="primary"
          title="Primary Logo"
          description="Main logo displayed in the header and throughout your site"
          currentUrl={logoConfig.primary_logo_url}
          recommendedSize="400x120px"
        />
        
        <LogoUploadArea
          logoType="secondary"
          title="Secondary Logo"
          description="Alternative logo for dark backgrounds or compact spaces"
          currentUrl={logoConfig.secondary_logo_url}
          recommendedSize="400x120px"
        />
      </div>

      <LogoUploadArea
        logoType="favicon"
        title="Favicon"
        description="Small icon displayed in browser tabs and bookmarks"
        currentUrl={logoConfig.favicon_url}
        recommendedSize="32x32px"
      />

      {/* Logo Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crop className="h-5 w-5 mr-2" />
            Logo Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Logo Width (px)"
              type="number"
              value={logoConfig.logo_width}
              onChange={(e) => handleInputChange('logo_width', parseInt(e.target.value))}
              min="50"
              max="500"
            />
            
            <Input
              label="Logo Height (px)"
              type="number"
              value={logoConfig.logo_height}
              onChange={(e) => handleInputChange('logo_height', parseInt(e.target.value))}
              min="20"
              max="200"
            />
            
            <Select
              label="Logo Position"
              value={logoConfig.logo_position}
              onChange={(e) => handleInputChange('logo_position', e.target.value)}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Logo Text"
              value={logoConfig.logo_text}
              onChange={(e) => handleInputChange('logo_text', e.target.value)}
              placeholder="Your Company Name"
              helperText="Text displayed alongside or instead of logo"
            />
            
            <Input
              label="Alt Text"
              value={logoConfig.logo_alt_text}
              onChange={(e) => handleInputChange('logo_alt_text', e.target.value)}
              placeholder="Company Logo"
              helperText="Alternative text for accessibility"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-logo-text"
              checked={logoConfig.show_logo_text}
              onChange={(e) => handleInputChange('show_logo_text', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="show-logo-text" className="text-sm font-medium text-gray-700">
              Show logo text alongside image
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Logo Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Logo Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header Preview */}
            <div className="border rounded-lg p-4 bg-white">
              <div className={`flex items-center ${
                logoConfig.logo_position === 'center' ? 'justify-center' :
                logoConfig.logo_position === 'right' ? 'justify-end' : 'justify-start'
              }`}>
                {logoConfig.primary_logo_url && (
                  <img
                    src={logoConfig.primary_logo_url}
                    alt={logoConfig.logo_alt_text}
                    style={{
                      width: `${logoConfig.logo_width}px`,
                      height: `${logoConfig.logo_height}px`,
                      objectFit: 'contain',
                    }}
                  />
                )}
                
                {logoConfig.show_logo_text && (
                  <span className={`text-xl font-bold text-gray-900 ${
                    logoConfig.primary_logo_url ? 'ml-3' : ''
                  }`}>
                    {logoConfig.logo_text}
                  </span>
                )}
              </div>
            </div>

            {/* Dark Background Preview */}
            {logoConfig.secondary_logo_url && (
              <div className="border rounded-lg p-4 bg-gray-900">
                <div className={`flex items-center ${
                  logoConfig.logo_position === 'center' ? 'justify-center' :
                  logoConfig.logo_position === 'right' ? 'justify-end' : 'justify-start'
                }`}>
                  <img
                    src={logoConfig.secondary_logo_url}
                    alt={logoConfig.logo_alt_text}
                    style={{
                      width: `${logoConfig.logo_width}px`,
                      height: `${logoConfig.logo_height}px`,
                      objectFit: 'contain',
                    }}
                  />
                  
                  {logoConfig.show_logo_text && (
                    <span className="ml-3 text-xl font-bold text-white">
                      {logoConfig.logo_text}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Favicon Preview */}
            {logoConfig.favicon_url && (
              <div className="flex items-center space-x-3">
                <img
                  src={logoConfig.favicon_url}
                  alt="Favicon"
                  className="w-8 h-8 object-contain"
                />
                <span className="text-sm text-gray-600">
                  This is how your favicon will appear in browser tabs
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Logo Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Primary Logo:</strong> Use a high-resolution image (at least 400x120px) with transparent background for best results
              </p>
            </div>
            
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Secondary Logo:</strong> Should work well on dark backgrounds. Consider a white or light-colored version
              </p>
            </div>
            
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>Favicon:</strong> Use a square image (32x32px or 64x64px) that represents your brand at small sizes
              </p>
            </div>
            
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <p>
                <strong>File Formats:</strong> SVG is recommended for scalability, PNG for transparency, JPG for photographs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          leftIcon={<Upload className="h-4 w-4" />}
          loading={uploading}
        >
          Save Logo Configuration
        </Button>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={() => {
          previewModal.close();
          setPreviewImage(null);
        }}
        title="Logo Preview"
        size="lg"
      >
        {previewImage && (
          <div className="p-6">
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="Logo preview"
                className="max-w-full max-h-96 object-contain"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
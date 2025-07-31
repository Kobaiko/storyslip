import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Eye, 
  RotateCcw, 
  Copy, 
  Check,
  Pipette,
  Lightbulb
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';

interface ColorSchemeCustomizerProps {
  config: any;
  onChange: () => void;
  onSave: (config: any) => void;
}

interface ColorScheme {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

const presetSchemes: ColorScheme[] = [
  {
    name: 'Default Blue',
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#10B981',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  {
    name: 'Purple Pro',
    primary: '#8B5CF6',
    secondary: '#6B7280',
    accent: '#06B6D4',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  {
    name: 'Green Nature',
    primary: '#059669',
    secondary: '#6B7280',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F0FDF4',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#D1FAE5',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  {
    name: 'Dark Mode',
    primary: '#3B82F6',
    secondary: '#9CA3AF',
    accent: '#10B981',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  {
    name: 'Warm Orange',
    primary: '#EA580C',
    secondary: '#6B7280',
    accent: '#DC2626',
    background: '#FFFFFF',
    surface: '#FFF7ED',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#FED7AA',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
];

export function ColorSchemeCustomizer({ 
  config, 
  onChange, 
  onSave 
}: ColorSchemeCustomizerProps) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>({
    name: 'Custom',
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#10B981',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    ...config?.colors,
  });

  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (config?.colors) {
      setColorScheme({ ...colorScheme, ...config.colors });
    }
  }, [config]);

  const handleColorChange = (colorKey: keyof ColorScheme, value: string) => {
    const newScheme = { ...colorScheme, [colorKey]: value, name: 'Custom' };
    setColorScheme(newScheme);
    onChange();
  };

  const applyPreset = (preset: ColorScheme) => {
    setColorScheme(preset);
    onChange();
  };

  const handleSave = () => {
    onSave({ ...config, colors: colorScheme });
  };

  const copyColor = async (color: string) => {
    try {
      await navigator.clipboard.writeText(color);
      setCopiedColor(color);
      success('Color copied to clipboard');
      setTimeout(() => setCopiedColor(null), 2000);
    } catch (error) {
      showError('Failed to copy color');
    }
  };

  const generateRandomScheme = () => {
    const hue = Math.floor(Math.random() * 360);
    const newScheme: ColorScheme = {
      name: 'Random',
      primary: `hsl(${hue}, 70%, 50%)`,
      secondary: `hsl(${(hue + 60) % 360}, 30%, 50%)`,
      accent: `hsl(${(hue + 120) % 360}, 60%, 45%)`,
      background: '#FFFFFF',
      surface: `hsl(${hue}, 20%, 98%)`,
      text: '#111827',
      textSecondary: '#6B7280',
      border: `hsl(${hue}, 20%, 90%)`,
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    };
    setColorScheme(newScheme);
    onChange();
  };

  const ColorInput = ({ 
    label, 
    colorKey, 
    description 
  }: { 
    label: string; 
    colorKey: keyof ColorScheme; 
    description: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-3">
        <div className="relative">
          <input
            type="color"
            value={colorScheme[colorKey]}
            onChange={(e) => handleColorChange(colorKey, e.target.value)}
            className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer"
          />
        </div>
        
        <Input
          value={colorScheme[colorKey]}
          onChange={(e) => handleColorChange(colorKey, e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
        />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyColor(colorScheme[colorKey])}
          className="p-2"
        >
          {copiedColor === colorScheme[colorKey] ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Preset Schemes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Preset Color Schemes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presetSchemes.map((preset) => (
              <div
                key={preset.name}
                className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => applyPreset(preset)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">{preset.name}</h3>
                  {colorScheme.name === preset.name && (
                    <Badge variant="success" size="sm">Active</Badge>
                  )}
                </div>
                
                <div className="flex space-x-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: preset.primary }}
                    title="Primary"
                  />
                  <div
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: preset.secondary }}
                    title="Secondary"
                  />
                  <div
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: preset.accent }}
                    title="Accent"
                  />
                  <div
                    className="w-8 h-8 rounded-full border"
                    style={{ backgroundColor: preset.surface }}
                    title="Surface"
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  Click to apply this scheme
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={generateRandomScheme}
              leftIcon={<Lightbulb className="h-4 w-4" />}
            >
              Generate Random Scheme
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Color Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Pipette className="h-5 w-5 mr-2" />
            Custom Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Colors */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ColorInput
                label="Primary"
                colorKey="primary"
                description="Main brand color used for buttons, links, and highlights"
              />
              
              <ColorInput
                label="Secondary"
                colorKey="secondary"
                description="Secondary color for less prominent elements"
              />
              
              <ColorInput
                label="Accent"
                colorKey="accent"
                description="Accent color for special highlights and CTAs"
              />
            </div>
          </div>

          {/* Background Colors */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Background Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ColorInput
                label="Background"
                colorKey="background"
                description="Main background color of the application"
              />
              
              <ColorInput
                label="Surface"
                colorKey="surface"
                description="Color for cards, modals, and elevated surfaces"
              />
              
              <ColorInput
                label="Border"
                colorKey="border"
                description="Color for borders and dividers"
              />
            </div>
          </div>

          {/* Text Colors */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Text Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ColorInput
                label="Text"
                colorKey="text"
                description="Primary text color for headings and body text"
              />
              
              <ColorInput
                label="Text Secondary"
                colorKey="textSecondary"
                description="Secondary text color for less important text"
              />
            </div>
          </div>

          {/* Status Colors */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ColorInput
                label="Success"
                colorKey="success"
                description="Color for success messages and positive actions"
              />
              
              <ColorInput
                label="Warning"
                colorKey="warning"
                description="Color for warning messages and caution states"
              />
              
              <ColorInput
                label="Error"
                colorKey="error"
                description="Color for error messages and destructive actions"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Color Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="p-6 rounded-lg border"
            style={{ 
              backgroundColor: colorScheme.background,
              borderColor: colorScheme.border,
              color: colorScheme.text 
            }}
          >
            <div className="space-y-4">
              <h2 className="text-2xl font-bold" style={{ color: colorScheme.text }}>
                Sample Content
              </h2>
              
              <p style={{ color: colorScheme.textSecondary }}>
                This is how your content will look with the selected color scheme.
              </p>
              
              <div className="flex space-x-3">
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colorScheme.primary }}
                >
                  Primary Button
                </button>
                
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colorScheme.secondary }}
                >
                  Secondary Button
                </button>
                
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colorScheme.accent }}
                >
                  Accent Button
                </button>
              </div>
              
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: colorScheme.surface }}
              >
                <h3 className="font-medium mb-2" style={{ color: colorScheme.text }}>
                  Card Example
                </h3>
                <p style={{ color: colorScheme.textSecondary }}>
                  This is how cards and elevated surfaces will appear.
                </p>
              </div>
              
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorScheme.success }}
                  />
                  <span className="text-sm" style={{ color: colorScheme.success }}>
                    Success message
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorScheme.warning }}
                  />
                  <span className="text-sm" style={{ color: colorScheme.warning }}>
                    Warning message
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorScheme.error }}
                  />
                  <span className="text-sm" style={{ color: colorScheme.error }}>
                    Error message
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={() => applyPreset(presetSchemes[0])}
          leftIcon={<RotateCcw className="h-4 w-4" />}
        >
          Reset to Default
        </Button>
        
        <Button 
          onClick={handleSave}
          leftIcon={<Palette className="h-4 w-4" />}
        >
          Save Color Scheme
        </Button>
      </div>
    </div>
  );
}
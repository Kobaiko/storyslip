import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface BrandPreviewProps {
  brandConfig: {
    name: string;
    primaryColor: string;
    logoUrl?: string;
    domain?: string;
  };
  previewMode: 'desktop' | 'mobile';
}

export function BrandPreview({ brandConfig, previewMode }: BrandPreviewProps) {
  const { name, primaryColor, logoUrl, domain } = brandConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Preview - {previewMode}</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className={`border rounded-lg p-6 ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'}`}
          style={{ borderColor: primaryColor }}
        >
          <div className="flex items-center space-x-3 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt={`${name} logo`} className="h-8 w-8 object-contain" />
            ) : (
              <div 
                className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {name.charAt(0)}
              </div>
            )}
            <h3 className="text-lg font-semibold" style={{ color: primaryColor }}>
              {name}
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            
            <button 
              className="px-4 py-2 rounded text-white font-medium"
              style={{ backgroundColor: primaryColor }}
            >
              Sample Button
            </button>
          </div>
          
          {domain && (
            <div className="mt-4 text-xs text-gray-500">
              Preview for: {domain}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
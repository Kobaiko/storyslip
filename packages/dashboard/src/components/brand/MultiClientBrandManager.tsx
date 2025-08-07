import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Plus, Settings, Eye } from 'lucide-react';

interface BrandConfig {
  id: string;
  name: string;
  primaryColor: string;
  logoUrl?: string;
  domain: string;
  isActive: boolean;
  clientCount: number;
}

interface MultiClientBrandManagerProps {
  onCreateBrand?: () => void;
  onEditBrand?: (brandId: string) => void;
  onPreviewBrand?: (brandId: string) => void;
}

export function MultiClientBrandManager({ 
  onCreateBrand, 
  onEditBrand, 
  onPreviewBrand 
}: MultiClientBrandManagerProps) {
  const [brands] = useState<BrandConfig[]>([
    {
      id: '1',
      name: 'StorySlip Default',
      primaryColor: '#3B82F6',
      domain: 'app.storyslip.com',
      isActive: true,
      clientCount: 156
    },
    {
      id: '2',
      name: 'Enterprise Client A',
      primaryColor: '#10B981',
      logoUrl: '/logos/client-a.png',
      domain: 'client-a.storyslip.com',
      isActive: true,
      clientCount: 45
    },
    {
      id: '3',
      name: 'Enterprise Client B',
      primaryColor: '#F59E0B',
      domain: 'client-b.storyslip.com',
      isActive: false,
      clientCount: 23
    }
  ]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Multi-Client Brand Management</CardTitle>
          <Button onClick={onCreateBrand} leftIcon={<Plus className="h-4 w-4" />}>
            Create Brand
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {brands.map((brand) => (
            <div 
              key={brand.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <div 
                  className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 object-contain" />
                  ) : (
                    brand.name.charAt(0)
                  )}
                </div>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{brand.name}</h4>
                    <Badge variant={brand.isActive ? 'success' : 'secondary'}>
                      {brand.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{brand.domain}</p>
                  <p className="text-xs text-gray-500">{brand.clientCount} clients</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreviewBrand?.(brand.id)}
                  leftIcon={<Eye className="h-4 w-4" />}
                >
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditBrand?.(brand.id)}
                  leftIcon={<Settings className="h-4 w-4" />}
                >
                  Configure
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">Multi-Client Features</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Separate brand configurations per client</li>
            <li>• Custom domains and white-labeling</li>
            <li>• Individual client analytics and reporting</li>
            <li>• Centralized management dashboard</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
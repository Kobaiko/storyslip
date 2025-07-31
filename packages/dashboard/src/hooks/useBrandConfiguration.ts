import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface BrandConfiguration {
  id: string;
  website_id: string;
  company_name: string;
  company_description: string;
  website_url: string;
  support_email: string;
  support_phone: string;
  timezone: string;
  language: string;
  currency: string;
  date_format: string;
  time_format: string;
  enable_white_labeling: boolean;
  hide_powered_by: boolean;
  custom_footer_text: string;
  analytics_tracking_id: string;
  custom_css: string;
  custom_js: string;
  seo_title_template: string;
  seo_description_template: string;
  social_sharing_enabled: boolean;
  comments_enabled: boolean;
  search_enabled: boolean;
  rss_enabled: boolean;
  colors: {
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
  };
  logo: {
    primary_logo_url: string;
    secondary_logo_url: string;
    favicon_url: string;
    logo_width: number;
    logo_height: number;
    logo_position: 'left' | 'center' | 'right';
    show_logo_text: boolean;
    logo_text: string;
    logo_alt_text: string;
  };
  domain: {
    custom_domain: string;
    subdomain: string;
    ssl_enabled: boolean;
    ssl_status: 'pending' | 'active' | 'error';
    dns_configured: boolean;
    domain_verified: boolean;
    redirect_www: boolean;
    force_https: boolean;
  };
  email_templates: {
    header_color: string;
    footer_color: string;
    button_color: string;
    text_color: string;
    background_color: string;
    custom_header_html: string;
    custom_footer_html: string;
    sender_name: string;
    sender_email: string;
    reply_to_email: string;
  };
  created_at: string;
  updated_at: string;
}

// Mock data generator
const generateMockBrandConfig = (websiteId: string): BrandConfiguration => ({
  id: `brand-${websiteId}`,
  website_id: websiteId,
  company_name: 'Your Company',
  company_description: 'A brief description of your company and what you do.',
  website_url: 'https://yourcompany.com',
  support_email: 'support@yourcompany.com',
  support_phone: '+1 (555) 123-4567',
  timezone: 'UTC',
  language: 'en',
  currency: 'USD',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  enable_white_labeling: false,
  hide_powered_by: false,
  custom_footer_text: '© 2024 Your Company. All rights reserved.',
  analytics_tracking_id: '',
  custom_css: '',
  custom_js: '',
  seo_title_template: '{title} | {company_name}',
  seo_description_template: '{excerpt} - Read more on {company_name}',
  social_sharing_enabled: true,
  comments_enabled: true,
  search_enabled: true,
  rss_enabled: true,
  colors: {
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
  logo: {
    primary_logo_url: '',
    secondary_logo_url: '',
    favicon_url: '',
    logo_width: 200,
    logo_height: 60,
    logo_position: 'left',
    show_logo_text: true,
    logo_text: 'Your Company',
    logo_alt_text: 'Company Logo',
  },
  domain: {
    custom_domain: '',
    subdomain: 'yourcompany',
    ssl_enabled: true,
    ssl_status: 'pending',
    dns_configured: false,
    domain_verified: false,
    redirect_www: true,
    force_https: true,
  },
  email_templates: {
    header_color: '#3B82F6',
    footer_color: '#F9FAFB',
    button_color: '#3B82F6',
    text_color: '#111827',
    background_color: '#FFFFFF',
    custom_header_html: '',
    custom_footer_html: '',
    sender_name: 'Your Company',
    sender_email: 'noreply@yourcompany.com',
    reply_to_email: 'support@yourcompany.com',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function useBrandConfiguration(websiteId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['brand-configuration', websiteId],
    queryFn: async () => {
      try {
        // In a real app, this would be an API call
        // const response = await api.get(`/websites/${websiteId}/brand`);
        // return response.data;
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Return mock data
        return generateMockBrandConfig(websiteId);
      } catch (error) {
        console.error('Failed to fetch brand configuration:', error);
        throw error;
      }
    },
    enabled: !!websiteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateBrandConfiguration = useMutation({
    mutationFn: async (config: Partial<BrandConfiguration>) => {
      try {
        // In a real app, this would be an API call
        // const response = await api.put(`/websites/${websiteId}/brand`, config);
        // return response.data;
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Return updated mock data
        return { ...generateMockBrandConfig(websiteId), ...config };
      } catch (error) {
        console.error('Failed to update brand configuration:', error);
        throw error;
      }
    },
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(['brand-configuration', websiteId], updatedConfig);
      queryClient.invalidateQueries({ queryKey: ['brand-configuration'] });
    },
  });

  const resetBrandConfiguration = useMutation({
    mutationFn: async () => {
      try {
        // In a real app, this would be an API call
        // const response = await api.post(`/websites/${websiteId}/brand/reset`);
        // return response.data;
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Return default mock data
        return generateMockBrandConfig(websiteId);
      } catch (error) {
        console.error('Failed to reset brand configuration:', error);
        throw error;
      }
    },
    onSuccess: (resetConfig) => {
      queryClient.setQueryData(['brand-configuration', websiteId], resetConfig);
      queryClient.invalidateQueries({ queryKey: ['brand-configuration'] });
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'primary' | 'secondary' | 'favicon' }) => {
      try {
        // In a real app, this would upload to your storage service
        // const formData = new FormData();
        // formData.append('file', file);
        // formData.append('type', type);
        // const response = await api.post(`/websites/${websiteId}/brand/logo`, formData);
        // return response.data;
        
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Return mock URL
        const reader = new FileReader();
        return new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } catch (error) {
        console.error('Failed to upload logo:', error);
        throw error;
      }
    },
  });

  const verifyDomain = useMutation({
    mutationFn: async (domain: string) => {
      try {
        // In a real app, this would verify the domain
        // const response = await api.post(`/websites/${websiteId}/brand/verify-domain`, { domain });
        // return response.data;
        
        // Simulate verification delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Return mock verification result
        return {
          verified: Math.random() > 0.5,
          dns_configured: Math.random() > 0.3,
          ssl_status: 'active' as const,
        };
      } catch (error) {
        console.error('Failed to verify domain:', error);
        throw error;
      }
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateBrandConfiguration,
    resetBrandConfiguration,
    uploadLogo,
    verifyDomain,
  };
}

// Hook for multi-client brand management (for agencies)
export function useMultiClientBrands() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['multi-client-brands'],
    queryFn: async () => {
      try {
        // In a real app, this would be an API call
        // const response = await api.get('/brand/clients');
        // return response.data;
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Return mock client data
        return [
          {
            id: 'client-1',
            name: 'Client Company A',
            website_id: 'website-1',
            domain: 'clienta.com',
            status: 'active',
            last_updated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'client-2',
            name: 'Client Company B',
            website_id: 'website-2',
            domain: 'clientb.com',
            status: 'pending',
            last_updated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
      } catch (error) {
        console.error('Failed to fetch client brands:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createClientBrand = useMutation({
    mutationFn: async (clientData: { name: string; domain: string; website_id: string }) => {
      try {
        // In a real app, this would be an API call
        // const response = await api.post('/brand/clients', clientData);
        // return response.data;
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Return mock created client
        return {
          id: `client-${Date.now()}`,
          ...clientData,
          status: 'pending',
          last_updated: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Failed to create client brand:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-client-brands'] });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    createClientBrand,
  };
}
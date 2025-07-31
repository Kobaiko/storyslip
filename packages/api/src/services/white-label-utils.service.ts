import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { brandService, BrandConfiguration } from './brand.service';
import { widgetBrandingService } from './widget-branding.service';
import { logger } from '../middleware/logger';

export interface WhiteLabelPackage {
  id: string;
  name: string;
  description: string;
  features: string[];
  price_monthly: number;
  price_yearly: number;
  max_websites: number;
  custom_domain: boolean;
  remove_branding: boolean;
  custom_email_templates: boolean;
  agency_features: boolean;
  priority_support: boolean;
}

export interface WhiteLabelUsage {
  websites_count: number;
  custom_domains_count: number;
  branded_emails_sent: number;
  widget_impressions: number;
  storage_used_mb: number;
}

export interface WhiteLabelAnalytics {
  period: string;
  brand_impressions: number;
  email_opens: number;
  email_clicks: number;
  domain_visits: number;
  widget_interactions: number;
  conversion_rate: number;
}

export class WhiteLabelUtilsService {
  /**
   * Get available white-label packages
   */
  async getWhiteLabelPackages(): Promise<WhiteLabelPackage[]> {
    // In a real implementation, this would come from a database or configuration
    return [
      {
        id: 'starter',
        name: 'Starter',
        description: 'Basic white-labeling for small projects',
        features: [
          'Custom colors and fonts',
          'Logo upload',
          'Basic email templates',
          '1 custom domain',
        ],
        price_monthly: 29,
        price_yearly: 290,
        max_websites: 3,
        custom_domain: true,
        remove_branding: false,
        custom_email_templates: true,
        agency_features: false,
        priority_support: false,
      },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Advanced white-labeling for growing businesses',
        features: [
          'Everything in Starter',
          'Remove StorySlip branding',
          'Advanced email customization',
          '5 custom domains',
          'Widget customization',
        ],
        price_monthly: 79,
        price_yearly: 790,
        max_websites: 10,
        custom_domain: true,
        remove_branding: true,
        custom_email_templates: true,
        agency_features: false,
        priority_support: true,
      },
      {
        id: 'agency',
        name: 'Agency',
        description: 'Complete white-labeling solution for agencies',
        features: [
          'Everything in Professional',
          'Agency template management',
          'Multi-client branding',
          'Unlimited custom domains',
          'White-label reseller program',
          'Custom CSS injection',
        ],
        price_monthly: 199,
        price_yearly: 1990,
        max_websites: -1, // Unlimited
        custom_domain: true,
        remove_branding: true,
        custom_email_templates: true,
        agency_features: true,
        priority_support: true,
      },
    ];
  }

  /**
   * Get white-label usage statistics
   */
  async getWhiteLabelUsage(userId: string): Promise<WhiteLabelUsage> {
    try {
      // Get websites count
      const { data: websites, error: websitesError } = await supabase
        .from('websites')
        .select('id')
        .eq('owner_id', userId);

      if (websitesError) {
        throw websitesError;
      }

      const websiteIds = websites?.map(w => w.id) || [];

      // Get custom domains count
      const { data: customDomains, error: domainsError } = await supabase
        .from('brand_configurations')
        .select('custom_domain')
        .in('website_id', websiteIds)
        .not('custom_domain', 'is', null);

      if (domainsError) {
        throw domainsError;
      }

      // Get email statistics (placeholder - would need email tracking table)
      const brandedEmailsSent = 0; // Would query email_logs table

      // Get widget statistics (placeholder - would need widget analytics table)
      const widgetImpressions = 0; // Would query widget_analytics table

      // Get storage usage (placeholder - would calculate file sizes)
      const storageUsedMb = 0; // Would query media files and calculate total size

      return {
        websites_count: websites?.length || 0,
        custom_domains_count: customDomains?.length || 0,
        branded_emails_sent: brandedEmailsSent,
        widget_impressions: widgetImpressions,
        storage_used_mb: storageUsedMb,
      };
    } catch (error) {
      logger.error('Failed to get white-label usage:', error);
      throw new ApiError('Failed to get white-label usage', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get white-label analytics
   */
  async getWhiteLabelAnalytics(
    userId: string,
    period: '7d' | '30d' | '90d' = '30d'
  ): Promise<WhiteLabelAnalytics> {
    try {
      // In a real implementation, this would query analytics tables
      // For now, return mock data
      return {
        period,
        brand_impressions: Math.floor(Math.random() * 10000),
        email_opens: Math.floor(Math.random() * 1000),
        email_clicks: Math.floor(Math.random() * 500),
        domain_visits: Math.floor(Math.random() * 5000),
        widget_interactions: Math.floor(Math.random() * 2000),
        conversion_rate: Math.random() * 10,
      };
    } catch (error) {
      logger.error('Failed to get white-label analytics:', error);
      throw new ApiError('Failed to get white-label analytics', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Validate white-label configuration
   */
  async validateWhiteLabelConfiguration(websiteId: string): Promise<{
    valid: boolean;
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      field?: string;
      suggestion?: string;
    }>;
    score: number;
  }> {
    try {
      const issues: Array<{
        type: 'error' | 'warning' | 'info';
        message: string;
        field?: string;
        suggestion?: string;
      }> = [];

      // Get brand configuration
      const brandConfig = await brandService.getBrandConfiguration(websiteId);

      // Check brand name
      if (!brandConfig.brand_name || brandConfig.brand_name.trim() === '') {
        issues.push({
          type: 'warning',
          message: 'Brand name is not set',
          field: 'brand_name',
          suggestion: 'Add a brand name to improve recognition',
        });
      }

      // Check logo
      if (!brandConfig.logo_url) {
        issues.push({
          type: 'warning',
          message: 'Brand logo is not uploaded',
          field: 'logo_url',
          suggestion: 'Upload a logo to strengthen brand identity',
        });
      }

      // Check color scheme
      if (brandConfig.primary_color === '#3b82f6') {
        issues.push({
          type: 'info',
          message: 'Using default primary color',
          field: 'primary_color',
          suggestion: 'Customize colors to match your brand',
        });
      }

      // Check custom domain
      if (!brandConfig.custom_domain) {
        issues.push({
          type: 'info',
          message: 'Custom domain not configured',
          field: 'custom_domain',
          suggestion: 'Set up a custom domain for professional appearance',
        });
      } else if (!brandConfig.domain_verified) {
        issues.push({
          type: 'error',
          message: 'Custom domain is not verified',
          field: 'custom_domain',
          suggestion: 'Complete domain verification to activate custom domain',
        });
      } else if (!brandConfig.ssl_enabled) {
        issues.push({
          type: 'warning',
          message: 'SSL certificate is not active',
          field: 'ssl_enabled',
          suggestion: 'Ensure SSL certificate is properly configured',
        });
      }

      // Check email configuration
      if (!brandConfig.email_from_name || !brandConfig.email_from_address) {
        issues.push({
          type: 'warning',
          message: 'Email branding not fully configured',
          field: 'email_from_name',
          suggestion: 'Set custom email sender name and address',
        });
      }

      // Check widget branding
      const widgetConfig = await widgetBrandingService.getWidgetBrandingConfig(websiteId);
      if (widgetConfig.showBranding && brandConfig.white_label_enabled) {
        issues.push({
          type: 'warning',
          message: 'Widget still shows StorySlip branding',
          field: 'showBranding',
          suggestion: 'Disable widget branding for full white-label experience',
        });
      }

      // Calculate score (0-100)
      const totalChecks = 8;
      const errorCount = issues.filter(i => i.type === 'error').length;
      const warningCount = issues.filter(i => i.type === 'warning').length;
      const infoCount = issues.filter(i => i.type === 'info').length;

      const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 10) - (infoCount * 5));

      return {
        valid: errorCount === 0,
        issues,
        score,
      };
    } catch (error) {
      logger.error('Failed to validate white-label configuration:', error);
      throw new ApiError('Failed to validate white-label configuration', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Generate white-label setup checklist
   */
  async generateSetupChecklist(websiteId: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    required: boolean;
    category: 'branding' | 'domain' | 'email' | 'widget';
    action_url?: string;
    estimated_time: number; // in minutes
  }>> {
    try {
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      const widgetConfig = await widgetBrandingService.getWidgetBrandingConfig(websiteId);

      return [
        {
          id: 'brand_name',
          title: 'Set Brand Name',
          description: 'Configure your brand name for consistent identity',
          completed: !!(brandConfig.brand_name && brandConfig.brand_name.trim()),
          required: true,
          category: 'branding',
          action_url: `/websites/${websiteId}/brand`,
          estimated_time: 2,
        },
        {
          id: 'upload_logo',
          title: 'Upload Brand Logo',
          description: 'Add your logo for emails and branding',
          completed: !!brandConfig.logo_url,
          required: true,
          category: 'branding',
          action_url: `/websites/${websiteId}/brand`,
          estimated_time: 5,
        },
        {
          id: 'customize_colors',
          title: 'Customize Color Scheme',
          description: 'Set brand colors for consistent visual identity',
          completed: brandConfig.primary_color !== '#3b82f6',
          required: false,
          category: 'branding',
          action_url: `/websites/${websiteId}/brand`,
          estimated_time: 10,
        },
        {
          id: 'configure_domain',
          title: 'Configure Custom Domain',
          description: 'Set up your custom domain (e.g., cms.yourdomain.com)',
          completed: !!brandConfig.custom_domain,
          required: false,
          category: 'domain',
          action_url: `/websites/${websiteId}/brand`,
          estimated_time: 15,
        },
        {
          id: 'verify_domain',
          title: 'Verify Custom Domain',
          description: 'Complete DNS configuration and domain verification',
          completed: brandConfig.domain_verified,
          required: false,
          category: 'domain',
          action_url: `/websites/${websiteId}/brand`,
          estimated_time: 30,
        },
        {
          id: 'setup_ssl',
          title: 'Enable SSL Certificate',
          description: 'Secure your custom domain with SSL',
          completed: brandConfig.ssl_enabled,
          required: false,
          category: 'domain',
          estimated_time: 5,
        },
        {
          id: 'configure_email',
          title: 'Configure Email Branding',
          description: 'Set custom sender name and email address',
          completed: !!(brandConfig.email_from_name && brandConfig.email_from_address),
          required: false,
          category: 'email',
          action_url: `/websites/${websiteId}/brand`,
          estimated_time: 10,
        },
        {
          id: 'customize_widget',
          title: 'Customize Widget Appearance',
          description: 'Configure widget colors, animations, and branding',
          completed: widgetConfig.theme !== 'auto' || widgetConfig.borderRadius !== 8,
          required: false,
          category: 'widget',
          action_url: `/websites/${websiteId}/widgets`,
          estimated_time: 15,
        },
        {
          id: 'remove_branding',
          title: 'Remove StorySlip Branding',
          description: 'Hide StorySlip branding for full white-label experience',
          completed: brandConfig.hide_storyslip_branding,
          required: false,
          category: 'branding',
          action_url: `/websites/${websiteId}/brand`,
          estimated_time: 2,
        },
      ];
    } catch (error) {
      logger.error('Failed to generate setup checklist:', error);
      throw new ApiError('Failed to generate setup checklist', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Export brand configuration
   */
  async exportBrandConfiguration(websiteId: string): Promise<{
    brand_config: BrandConfiguration;
    widget_config: any;
    css_variables: string;
    embed_code: string;
    export_date: string;
  }> {
    try {
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      const widgetConfig = await widgetBrandingService.getWidgetBrandingConfig(websiteId);
      const cssVariables = brandService.generateCSSVariables(brandConfig);
      const embedCode = await widgetBrandingService.generateBrandedEmbedCode(websiteId);

      return {
        brand_config: brandConfig,
        widget_config: widgetConfig,
        css_variables: cssVariables,
        embed_code: embedCode,
        export_date: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to export brand configuration:', error);
      throw new ApiError('Failed to export brand configuration', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Import brand configuration
   */
  async importBrandConfiguration(
    websiteId: string,
    importData: {
      brand_config?: Partial<BrandConfiguration>;
      widget_config?: any;
    }
  ): Promise<{
    brand_config: BrandConfiguration;
    widget_config: any;
    imported_fields: string[];
  }> {
    try {
      const importedFields: string[] = [];

      // Import brand configuration
      let brandConfig = await brandService.getBrandConfiguration(websiteId);
      if (importData.brand_config) {
        const updateData = { ...importData.brand_config };
        delete updateData.id;
        delete updateData.website_id;
        delete updateData.created_at;
        delete updateData.updated_at;

        brandConfig = await brandService.updateBrandConfiguration(websiteId, updateData);
        importedFields.push(...Object.keys(updateData));
      }

      // Import widget configuration
      let widgetConfig = await widgetBrandingService.getWidgetBrandingConfig(websiteId);
      if (importData.widget_config) {
        const updateData = { ...importData.widget_config };
        delete updateData.websiteId;

        widgetConfig = await widgetBrandingService.updateWidgetBrandingConfig(websiteId, updateData);
        importedFields.push(...Object.keys(updateData).map(k => `widget_${k}`));
      }

      return {
        brand_config: brandConfig,
        widget_config: widgetConfig,
        imported_fields: importedFields,
      };
    } catch (error) {
      logger.error('Failed to import brand configuration:', error);
      throw new ApiError('Failed to import brand configuration', 500, 'INTERNAL_ERROR', error);
    }
  }
}

export const whiteLabelUtilsService = new WhiteLabelUtilsService();
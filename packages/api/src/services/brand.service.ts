import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { HelperUtil } from '../utils/helpers';

export interface BrandConfiguration {
  id: string;
  website_id: string;
  brand_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  heading_font_family?: string;
  custom_css?: string;
  custom_domain?: string;
  domain_verified: boolean;
  ssl_enabled: boolean;
  email_from_name?: string;
  email_from_address?: string;
  email_header_color?: string;
  email_footer_text?: string;
  widget_theme: Record<string, any>;
  agency_id?: string;
  white_label_enabled: boolean;
  hide_storyslip_branding: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandUpdateInput {
  brand_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  font_family?: string;
  heading_font_family?: string;
  custom_css?: string;
  custom_domain?: string;
  email_from_name?: string;
  email_from_address?: string;
  email_header_color?: string;
  email_footer_text?: string;
  widget_theme?: Record<string, any>;
  white_label_enabled?: boolean;
  hide_storyslip_branding?: boolean;
}

export interface AgencyBrandTemplate {
  id: string;
  agency_id: string;
  template_name: string;
  template_description?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  heading_font_family?: string;
  custom_css?: string;
  email_header_color?: string;
  email_footer_text?: string;
  widget_theme: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DomainVerificationResult {
  verified: boolean;
  dns_records?: Array<{
    type: string;
    name: string;
    value: string;
    status: 'pending' | 'verified' | 'failed';
  }>;
  ssl_status?: 'pending' | 'active' | 'failed';
}

export class BrandService {
  /**
   * Get brand configuration for a website
   */
  async getBrandConfiguration(websiteId: string): Promise<BrandConfiguration> {
    try {
      const { data: config, error } = await supabase
        .from('brand_configurations')
        .select('*')
        .eq('website_id', websiteId)
        .single();

      if (error) {
        // If no configuration exists, create a default one
        if (error.code === 'PGRST116') {
          return await this.createDefaultBrandConfiguration(websiteId);
        }
        throw new ApiError('Failed to fetch brand configuration', 500, 'DATABASE_ERROR', error);
      }

      return config;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch brand configuration', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Update brand configuration
   */
  async updateBrandConfiguration(
    websiteId: string,
    input: BrandUpdateInput
  ): Promise<BrandConfiguration> {
    try {
      // Validate color codes if provided
      this.validateColorCodes(input);

      // Validate custom domain if provided
      if (input.custom_domain) {
        await this.validateCustomDomain(input.custom_domain, websiteId);
      }

      const updateData = HelperUtil.removeUndefined(input);

      const { data: config, error } = await supabase
        .from('brand_configurations')
        .update(updateData)
        .eq('website_id', websiteId)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to update brand configuration', 500, 'DATABASE_ERROR', error);
      }

      return config;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update brand configuration', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Generate CSS variables from brand configuration
   */
  generateCSSVariables(config: BrandConfiguration): string {
    return `
:root {
  --brand-primary: ${config.primary_color};
  --brand-secondary: ${config.secondary_color};
  --brand-accent: ${config.accent_color};
  --brand-background: ${config.background_color};
  --brand-text: ${config.text_color};
  --brand-font-family: ${config.font_family};
  --brand-heading-font: ${config.heading_font_family || config.font_family};
}

/* Brand-specific styles */
.brand-primary { color: var(--brand-primary); }
.brand-secondary { color: var(--brand-secondary); }
.brand-accent { color: var(--brand-accent); }
.brand-bg-primary { background-color: var(--brand-primary); }
.brand-bg-secondary { background-color: var(--brand-secondary); }
.brand-bg-accent { background-color: var(--brand-accent); }

/* Custom CSS */
${config.custom_css || ''}
    `.trim();
  }

  /**
   * Verify custom domain
   */
  async verifyCustomDomain(websiteId: string): Promise<DomainVerificationResult> {
    try {
      const config = await this.getBrandConfiguration(websiteId);
      
      if (!config.custom_domain) {
        throw new ApiError('No custom domain configured', 400, 'NO_CUSTOM_DOMAIN');
      }

      // In a real implementation, this would check DNS records and SSL status
      // For now, we'll simulate the verification process
      const verificationResult = await this.performDomainVerification(config.custom_domain);

      // Update verification status
      if (verificationResult.verified) {
        await supabase
          .from('brand_configurations')
          .update({
            domain_verified: true,
            ssl_enabled: verificationResult.ssl_status === 'active',
          })
          .eq('website_id', websiteId);
      }

      return verificationResult;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to verify custom domain', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get agency brand templates
   */
  async getAgencyBrandTemplates(agencyId: string): Promise<AgencyBrandTemplate[]> {
    try {
      const { data: templates, error } = await supabase
        .from('agency_brand_templates')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new ApiError('Failed to fetch agency brand templates', 500, 'DATABASE_ERROR', error);
      }

      return templates || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch agency brand templates', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Create agency brand template
   */
  async createAgencyBrandTemplate(
    agencyId: string,
    templateData: Omit<AgencyBrandTemplate, 'id' | 'agency_id' | 'created_at' | 'updated_at'>
  ): Promise<AgencyBrandTemplate> {
    try {
      // Validate color codes
      this.validateColorCodes(templateData);

      const { data: template, error } = await supabase
        .from('agency_brand_templates')
        .insert({
          ...templateData,
          agency_id: agencyId,
        })
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create agency brand template', 500, 'DATABASE_ERROR', error);
      }

      return template;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create agency brand template', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Apply agency template to website
   */
  async applyAgencyTemplate(
    websiteId: string,
    templateId: string,
    agencyId: string
  ): Promise<BrandConfiguration> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('agency_brand_templates')
        .select('*')
        .eq('id', templateId)
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        throw new ApiError('Agency brand template not found', 404, 'TEMPLATE_NOT_FOUND');
      }

      // Apply template to website
      const updateData = {
        primary_color: template.primary_color,
        secondary_color: template.secondary_color,
        accent_color: template.accent_color,
        background_color: template.background_color,
        text_color: template.text_color,
        font_family: template.font_family,
        heading_font_family: template.heading_font_family,
        custom_css: template.custom_css,
        email_header_color: template.email_header_color,
        email_footer_text: template.email_footer_text,
        widget_theme: template.widget_theme,
        agency_id: agencyId,
      };

      return await this.updateBrandConfiguration(websiteId, updateData);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to apply agency template', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Generate branded email template
   */
  generateBrandedEmailTemplate(
    config: BrandConfiguration,
    content: {
      subject: string;
      heading: string;
      body: string;
      buttonText?: string;
      buttonUrl?: string;
      footerLinks?: Array<{ text: string; url: string }>;
      unsubscribeUrl?: string;
    }
  ): { subject: string; html: string; text: string } {
    const brandName = config.brand_name || 'StorySlip';
    const headerColor = config.email_header_color || config.primary_color;
    const footerText = config.email_footer_text || `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${content.subject}</title>
        <style>
          body { 
            font-family: ${config.font_family}; 
            line-height: 1.6; 
            color: ${config.text_color}; 
            background-color: ${config.background_color};
            margin: 0;
            padding: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .header { 
            background: ${headerColor}; 
            color: white; 
            padding: 20px; 
            text-align: center; 
          }
          .logo { max-height: 50px; margin-bottom: 10px; }
          .content { padding: 30px 20px; background: ${config.background_color}; }
          .button { 
            display: inline-block; 
            background: ${config.primary_color}; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            font-size: 14px; 
            color: #666; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${config.logo_url ? `<img src="${config.logo_url}" alt="${brandName}" class="logo">` : ''}
            <h1>${brandName}</h1>
          </div>
          <div class="content">
            <h2>${content.heading}</h2>
            ${content.body}
            ${content.buttonText && content.buttonUrl ? 
              `<p style="text-align: center;">
                <a href="${content.buttonUrl}" class="button">${content.buttonText}</a>
              </p>` : ''
            }
          </div>
          <div class="footer">
            <p>${footerText}</p>
            ${content.footerLinks ? content.footerLinks.map(link => 
              `<a href="${link.url}" style="color: #666; margin: 0 10px;">${link.text}</a>`
            ).join('') : ''}
            ${content.unsubscribeUrl ? 
              `<p style="font-size: 12px; color: #999;">
                <a href="${content.unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
              </p>` : ''
            }
            ${!config.hide_storyslip_branding ? '<p style="font-size: 12px; color: #999;">Powered by StorySlip</p>' : ''}
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${brandName}

${content.heading}

${content.body.replace(/<[^>]*>/g, '')}

${content.buttonText && content.buttonUrl ? `${content.buttonText}: ${content.buttonUrl}` : ''}

${footerText}
${!config.hide_storyslip_branding ? 'Powered by StorySlip' : ''}
    `.trim();

    return {
      subject: content.subject,
      html,
      text,
    };
  }

  /**
   * Create default brand configuration
   */
  private async createDefaultBrandConfiguration(websiteId: string): Promise<BrandConfiguration> {
    try {
      // Get website name for default brand name
      const { data: website } = await supabase
        .from('websites')
        .select('name')
        .eq('id', websiteId)
        .single();

      const defaultConfig = {
        website_id: websiteId,
        brand_name: website?.name || 'My Website',
        primary_color: '#3b82f6',
        secondary_color: '#1e40af',
        accent_color: '#10b981',
        background_color: '#ffffff',
        text_color: '#111827',
        font_family: 'Inter, sans-serif',
        widget_theme: {},
        white_label_enabled: false,
        hide_storyslip_branding: false,
        domain_verified: false,
        ssl_enabled: false,
      };

      const { data: config, error } = await supabase
        .from('brand_configurations')
        .insert(defaultConfig)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create default brand configuration', 500, 'DATABASE_ERROR', error);
      }

      return config;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create default brand configuration', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Validate color codes
   */
  private validateColorCodes(input: any): void {
    const colorFields = [
      'primary_color', 'secondary_color', 'accent_color', 
      'background_color', 'text_color', 'email_header_color'
    ];

    for (const field of colorFields) {
      if (input[field] && !this.isValidHexColor(input[field])) {
        throw new ApiError(`Invalid color code for ${field}`, 400, 'INVALID_COLOR_CODE');
      }
    }
  }

  /**
   * Validate hex color code
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  /**
   * Validate custom domain
   */
  private async validateCustomDomain(domain: string, websiteId: string): Promise<void> {
    // Check if domain is already in use
    const { data: existingConfig } = await supabase
      .from('brand_configurations')
      .select('website_id')
      .eq('custom_domain', domain)
      .neq('website_id', websiteId)
      .single();

    if (existingConfig) {
      throw new ApiError('Custom domain is already in use', 409, 'DOMAIN_IN_USE');
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainRegex.test(domain)) {
      throw new ApiError('Invalid domain format', 400, 'INVALID_DOMAIN_FORMAT');
    }
  }

  /**
   * Perform domain verification (placeholder implementation)
   */
  private async performDomainVerification(domain: string): Promise<DomainVerificationResult> {
    // In a real implementation, this would:
    // 1. Check DNS records (A, CNAME, TXT)
    // 2. Verify SSL certificate
    // 3. Test domain accessibility
    
    // For now, we'll simulate a successful verification
    return {
      verified: true,
      dns_records: [
        {
          type: 'CNAME',
          name: domain,
          value: 'storyslip.com',
          status: 'verified',
        },
        {
          type: 'TXT',
          name: `_storyslip-verification.${domain}`,
          value: 'storyslip-verification=verified',
          status: 'verified',
        },
      ],
      ssl_status: 'active',
    };
  }
}

export const brandService = new BrandService();
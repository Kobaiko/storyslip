import { Request, Response } from 'express';
import { brandService } from '../services/brand.service';
import { domainVerificationService } from '../services/domain-verification.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';
import { teamService } from '../services/team.service';

export class BrandController {
  /**
   * Get brand configuration for a website
   */
  static getBrandConfiguration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const config = await brandService.getBrandConfiguration(websiteId);

      logDatabaseOperation('SELECT', 'brand_configurations', {
        websiteId,
        userId,
      });

      ResponseUtil.success(res, { config });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch brand configuration');
    }
  });

  /**
   * Update brand configuration
   */
  static updateBrandConfiguration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const updateData = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage settings
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_settings');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to manage brand settings');
      }

      const config = await brandService.updateBrandConfiguration(websiteId, updateData);

      logDatabaseOperation('UPDATE', 'brand_configurations', {
        websiteId,
        userId,
        updates: Object.keys(updateData),
      });

      logSecurityEvent('Brand configuration updated', {
        websiteId,
        updates: Object.keys(updateData),
      }, req);

      ResponseUtil.success(res, { config });
    } catch (error: any) {
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to update brand configuration');
    }
  });

  /**
   * Generate CSS for brand configuration
   */
  static generateBrandCSS = asyncHandler(async (req: Request, res: Response) => {
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      const config = await brandService.getBrandConfiguration(websiteId);
      const css = brandService.generateCSSVariables(config);

      res.set({
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      });

      res.send(css);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate brand CSS');
    }
  });

  /**
   * Verify custom domain
   */
  static verifyCustomDomain = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage settings
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_settings');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to verify custom domain');
      }

      // Get current brand configuration to get the domain
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      if (!brandConfig.custom_domain) {
        return ResponseUtil.badRequest(res, 'No custom domain configured for verification');
      }

      const verificationResult = await domainVerificationService.verifyDomain(websiteId, brandConfig.custom_domain);

      logDatabaseOperation('UPDATE', 'brand_configurations', {
        websiteId,
        userId,
        action: 'domain_verification',
        verified: verificationResult.verified,
      });

      logSecurityEvent('Custom domain verification', {
        websiteId,
        verified: verificationResult.verified,
      }, req);

      ResponseUtil.success(res, { verification: verificationResult });
    } catch (error: any) {
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to verify custom domain');
    }
  });

  /**
   * Get agency brand templates
   */
  static getAgencyBrandTemplates = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    try {
      const templates = await brandService.getAgencyBrandTemplates(userId);

      logDatabaseOperation('SELECT', 'agency_brand_templates', {
        agencyId: userId,
        count: templates.length,
      });

      ResponseUtil.success(res, { templates });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch agency brand templates');
    }
  });

  /**
   * Create agency brand template
   */
  static createAgencyBrandTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const templateData = req.body;

    try {
      const template = await brandService.createAgencyBrandTemplate(userId, templateData);

      logDatabaseOperation('INSERT', 'agency_brand_templates', {
        agencyId: userId,
        templateId: template.id,
        templateName: template.template_name,
      });

      logSecurityEvent('Agency brand template created', {
        templateId: template.id,
        templateName: template.template_name,
      }, req);

      ResponseUtil.created(res, { template });
    } catch (error: any) {
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to create agency brand template');
    }
  });

  /**
   * Apply agency template to website
   */
  static applyAgencyTemplate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { templateId } = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(templateId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage settings
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_settings');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to apply brand template');
      }

      const config = await brandService.applyAgencyTemplate(websiteId, templateId, userId);

      logDatabaseOperation('UPDATE', 'brand_configurations', {
        websiteId,
        userId,
        action: 'apply_agency_template',
        templateId,
      });

      logSecurityEvent('Agency brand template applied', {
        websiteId,
        templateId,
      }, req);

      ResponseUtil.success(res, { config });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to apply agency template');
    }
  });

  /**
   * Preview brand configuration
   */
  static previewBrandConfiguration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const previewData = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get current configuration
      const currentConfig = await brandService.getBrandConfiguration(websiteId);
      
      // Merge with preview data
      const previewConfig = { ...currentConfig, ...previewData };
      
      // Generate CSS for preview
      const css = brandService.generateCSSVariables(previewConfig);
      
      // Generate sample email template
      const emailTemplate = brandService.generateBrandedEmailTemplate(previewConfig, {
        subject: 'Welcome to Your Website',
        heading: 'Welcome!',
        body: '<p>This is a preview of how your branded emails will look.</p>',
        buttonText: 'Get Started',
        buttonUrl: '#',
      });

      ResponseUtil.success(res, {
        config: previewConfig,
        css,
        emailTemplate,
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate brand preview');
    }
  });

  /**
   * Reset brand configuration to defaults
   */
  static resetBrandConfiguration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage settings
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_settings');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to reset brand configuration');
      }

      // Reset to default values
      const defaultConfig = {
        primary_color: '#3b82f6',
        secondary_color: '#1e40af',
        accent_color: '#10b981',
        background_color: '#ffffff',
        text_color: '#111827',
        font_family: 'Inter, sans-serif',
        heading_font_family: null,
        custom_css: null,
        custom_domain: null,
        email_from_name: null,
        email_from_address: null,
        email_header_color: null,
        email_footer_text: null,
        widget_theme: {},
        white_label_enabled: false,
        hide_storyslip_branding: false,
      };

      const config = await brandService.updateBrandConfiguration(websiteId, defaultConfig);

      logDatabaseOperation('UPDATE', 'brand_configurations', {
        websiteId,
        userId,
        action: 'reset_to_defaults',
      });

      logSecurityEvent('Brand configuration reset', {
        websiteId,
      }, req);

      ResponseUtil.success(res, { config });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to reset brand configuration');
    }
  });
}

export default BrandController;
  /**

   * Get domain verification records
   */
  static getDomainVerificationRecords = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      if (!brandConfig.custom_domain) {
        return ResponseUtil.badRequest(res, 'No custom domain configured');
      }

      const records = domainVerificationService.generateVerificationRecords(
        brandConfig.custom_domain,
        websiteId
      );

      ResponseUtil.success(res, { 
        domain: brandConfig.custom_domain,
        records,
        instructions: {
          message: 'Configure the following DNS records with your domain provider:',
          steps: [
            'Choose either CNAME or A record configuration (not both)',
            'Add the TXT record for domain verification',
            'Wait for DNS propagation (up to 48 hours)',
            'Click "Verify Domain" to check configuration',
          ],
        },
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to get domain verification records');
    }
  });

  /**
   * Get SSL certificate information
   */
  static getSSLCertificateInfo = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      if (!brandConfig.custom_domain) {
        return ResponseUtil.badRequest(res, 'No custom domain configured');
      }

      if (!brandConfig.domain_verified) {
        return ResponseUtil.badRequest(res, 'Domain must be verified before checking SSL certificate');
      }

      const sslInfo = await domainVerificationService.getSSLCertificateInfo(brandConfig.custom_domain);

      ResponseUtil.success(res, { 
        domain: brandConfig.custom_domain,
        ssl_certificate: sslInfo,
        ssl_enabled: brandConfig.ssl_enabled,
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to get SSL certificate information');
    }
  });

  /**
   * Get domain verification summary
   */
  static getDomainVerificationSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Use database function to get summary
      const { supabase } = require('../config/supabase');
      const { data, error } = await supabase.rpc('get_domain_verification_summary', {
        website_id_param: websiteId,
      });

      if (error) {
        throw error;
      }

      ResponseUtil.success(res, { summary: data });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to get domain verification summary');
    }
  });

  /**
   * Schedule domain re-verification
   */
  static scheduleDomainReVerification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { delay_minutes = 5 } = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Check if user has permission to manage settings
      const hasPermission = await teamService.hasPermission(websiteId, userId, 'manage_settings');
      if (!hasPermission) {
        return ResponseUtil.forbidden(res, 'Insufficient permissions to schedule domain verification');
      }

      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      if (!brandConfig.custom_domain) {
        return ResponseUtil.badRequest(res, 'No custom domain configured');
      }

      await domainVerificationService.scheduleDomainReVerification(
        websiteId,
        brandConfig.custom_domain,
        delay_minutes
      );

      logSecurityEvent('Domain re-verification scheduled', {
        websiteId,
        domain: brandConfig.custom_domain,
        delay_minutes,
      }, req);

      ResponseUtil.success(res, { 
        message: 'Domain re-verification scheduled successfully',
        domain: brandConfig.custom_domain,
        scheduled_in_minutes: delay_minutes,
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to schedule domain re-verification');
    }
  });

  /**
   * Generate branded email preview
   */
  static generateBrandedEmailPreview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { template_type = 'welcome', preview_data = {} } = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      // Generate sample email content based on template type
      const sampleContent = {
        welcome: {
          subject: `Welcome to ${brandConfig.brand_name || 'Your Website'}!`,
          heading: 'Welcome aboard!',
          body: '<p>Thank you for joining us. We\'re excited to have you on board!</p><p>Get started by exploring your dashboard and creating your first piece of content.</p>',
          buttonText: 'Get Started',
          buttonUrl: `${process.env.DASHBOARD_URL}/websites/${websiteId}`,
        },
        invitation: {
          subject: `You're invited to join ${brandConfig.brand_name || 'Your Website'}`,
          heading: 'You\'ve been invited!',
          body: '<p>You\'ve been invited to collaborate on an exciting project.</p><p>Click below to accept your invitation and get started:</p>',
          buttonText: 'Accept Invitation',
          buttonUrl: `${process.env.DASHBOARD_URL}/invitations/accept/sample`,
        },
        password_reset: {
          subject: 'Reset your password',
          heading: 'Reset Your Password',
          body: '<p>We received a request to reset your password.</p><p>Click the button below to create a new password:</p>',
          buttonText: 'Reset Password',
          buttonUrl: `${process.env.DASHBOARD_URL}/auth/reset-password/sample`,
        },
      };

      const content = { ...sampleContent[template_type as keyof typeof sampleContent], ...preview_data };
      const emailTemplate = brandService.generateBrandedEmailTemplate(brandConfig, content);

      ResponseUtil.success(res, { 
        template_type,
        brand_config: {
          brand_name: brandConfig.brand_name,
          primary_color: brandConfig.primary_color,
          logo_url: brandConfig.logo_url,
          hide_storyslip_branding: brandConfig.hide_storyslip_branding,
        },
        email_template: emailTemplate,
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate branded email preview');
    }
  });
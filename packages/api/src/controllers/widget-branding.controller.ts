import { Request, Response } from 'express';
import { widgetBrandingService } from '../services/widget-branding.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';
import { teamService } from '../services/team.service';

export class WidgetBrandingController {
  /**
   * Get widget branding configuration
   */
  static getWidgetBrandingConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      const config = await widgetBrandingService.getWidgetBrandingConfig(websiteId);

      logDatabaseOperation('SELECT', 'widget_branding_configs', {
        websiteId,
        userId,
      });

      ResponseUtil.success(res, { config });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch widget branding configuration');
    }
  });

  /**
   * Update widget branding configuration
   */
  static updateWidgetBrandingConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
        return ResponseUtil.forbidden(res, 'Insufficient permissions to manage widget branding');
      }

      const config = await widgetBrandingService.updateWidgetBrandingConfig(websiteId, updateData);

      logDatabaseOperation('UPDATE', 'widget_branding_configs', {
        websiteId,
        userId,
        updates: Object.keys(updateData),
      });

      logSecurityEvent('Widget branding configuration updated', {
        websiteId,
        updates: Object.keys(updateData),
      }, req);

      ResponseUtil.success(res, { config });
    } catch (error: any) {
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to update widget branding configuration');
    }
  });

  /**
   * Generate widget stylesheet
   */
  static generateWidgetStylesheet = asyncHandler(async (req: Request, res: Response) => {
    const { websiteId } = req.params;
    const config = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      const stylesheet = await widgetBrandingService.generateWidgetStylesheet(websiteId, config);

      res.set({
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // Allow cross-origin requests for widget
      });

      res.send(stylesheet.css);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate widget stylesheet');
    }
  });

  /**
   * Generate branded embed code
   */
  static generateBrandedEmbedCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const options = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const embedCode = await widgetBrandingService.generateBrandedEmbedCode(websiteId, options);

      logDatabaseOperation('SELECT', 'brand_configurations', {
        websiteId,
        userId,
        action: 'generate_embed_code',
      });

      ResponseUtil.success(res, { embedCode });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate branded embed code');
    }
  });

  /**
   * Preview widget branding
   */
  static previewWidgetBranding = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const previewConfig = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Generate stylesheet with preview configuration
      const stylesheet = await widgetBrandingService.generateWidgetStylesheet(websiteId, previewConfig);
      
      // Generate embed code with preview configuration
      const embedCode = await widgetBrandingService.generateBrandedEmbedCode(websiteId, {
        customConfig: previewConfig,
      });

      ResponseUtil.success(res, {
        stylesheet,
        embedCode,
        previewConfig,
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate widget branding preview');
    }
  });

  /**
   * Reset widget branding to defaults
   */
  static resetWidgetBranding = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
        return ResponseUtil.forbidden(res, 'Insufficient permissions to reset widget branding');
      }

      // Reset to default values
      const defaultConfig = {
        theme: 'auto',
        borderRadius: 8,
        shadowLevel: 'md',
        animation: 'fade',
        position: 'bottom-right',
        showBranding: true,
        customCSS: '',
        mobileOptimized: true,
        rtlSupport: false,
      };

      const config = await widgetBrandingService.updateWidgetBrandingConfig(websiteId, defaultConfig);

      logDatabaseOperation('UPDATE', 'widget_branding_configs', {
        websiteId,
        userId,
        action: 'reset_to_defaults',
      });

      logSecurityEvent('Widget branding configuration reset', {
        websiteId,
      }, req);

      ResponseUtil.success(res, { config });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to reset widget branding configuration');
    }
  });
}

export default WidgetBrandingController;
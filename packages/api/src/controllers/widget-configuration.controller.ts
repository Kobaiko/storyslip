import { Request, Response } from 'express';
import { WidgetConfigurationService } from '../services/widget-configuration.service';
import { successResponse, errorResponse } from '../utils/response';

export class WidgetConfigurationController {
  /**
   * Create a new widget configuration
   */
  static async createWidget(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const userId = req.user?.id;
      const widgetData = req.body;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const result = await WidgetConfigurationService.createWidget(
        websiteId,
        userId,
        widgetData
      );

      if (result.error) {
        return errorResponse(res, 'Failed to create widget', 500, result.error);
      }

      return successResponse(res, result.data, 'Widget created successfully', 201);
    } catch (error) {
      console.error('Error creating widget:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Update widget configuration
   */
  static async updateWidget(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;
      const userId = req.user?.id;
      const updates = req.body;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const result = await WidgetConfigurationService.updateWidget(
        widgetId,
        userId,
        updates
      );

      if (result.error) {
        return errorResponse(res, 'Failed to update widget', 500, result.error);
      }

      return successResponse(res, result.data, 'Widget updated successfully');
    } catch (error) {
      console.error('Error updating widget:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get widget configuration
   */
  static async getWidget(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;
      const userId = req.user?.id;

      const result = await WidgetConfigurationService.getWidget(widgetId, userId);

      if (result.error) {
        return errorResponse(res, 'Widget not found', 404, result.error);
      }

      return successResponse(res, result.data, 'Widget retrieved successfully');
    } catch (error) {
      console.error('Error getting widget:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get public widget configuration (for rendering)
   */
  static async getPublicWidget(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;

      const result = await WidgetConfigurationService.getWidget(widgetId);

      if (result.error) {
        return errorResponse(res, 'Widget not found', 404, result.error);
      }

      // Only return public data needed for rendering
      const publicData = {
        id: result.data?.id,
        type: result.data?.type,
        layout: result.data?.layout,
        theme: result.data?.theme,
        settings: result.data?.settings,
        styling: result.data?.styling,
        content_filters: result.data?.content_filters,
        seo_settings: result.data?.seo_settings,
        performance_settings: result.data?.performance_settings,
        is_active: result.data?.is_active,
      };

      return successResponse(res, publicData, 'Widget configuration retrieved');
    } catch (error) {
      console.error('Error getting public widget:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * List widgets for a website
   */
  static async listWidgets(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const userId = req.user?.id;
      const { limit, offset, type, active_only } = req.query;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const options = {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        type: type as string,
        active_only: active_only === 'true',
      };

      const result = await WidgetConfigurationService.listWidgets(
        websiteId,
        userId,
        options
      );

      if (result.error) {
        return errorResponse(res, 'Failed to list widgets', 500, result.error);
      }

      return successResponse(res, result.data, 'Widgets retrieved successfully');
    } catch (error) {
      console.error('Error listing widgets:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Delete widget configuration
   */
  static async deleteWidget(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const result = await WidgetConfigurationService.deleteWidget(widgetId, userId);

      if (result.error) {
        return errorResponse(res, 'Failed to delete widget', 500, result.error);
      }

      return successResponse(res, result.data, 'Widget deleted successfully');
    } catch (error) {
      console.error('Error deleting widget:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Generate widget preview
   */
  static async generatePreview(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const result = await WidgetConfigurationService.generatePreview(widgetId, userId);

      if (result.error) {
        return errorResponse(res, 'Failed to generate preview', 500, result.error);
      }

      return successResponse(res, result.data, 'Preview generated successfully');
    } catch (error) {
      console.error('Error generating preview:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get widget analytics
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;
      const { start_date, end_date } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      if (!start_date || !end_date) {
        return errorResponse(res, 'Start date and end date are required', 400);
      }

      const dateRange = {
        start: start_date as string,
        end: end_date as string,
      };

      const result = await WidgetConfigurationService.getWidgetAnalytics(
        widgetId,
        userId,
        dateRange
      );

      if (result.error) {
        return errorResponse(res, 'Failed to get analytics', 500, result.error);
      }

      return successResponse(res, result.data, 'Analytics retrieved successfully');
    } catch (error) {
      console.error('Error getting analytics:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get widget templates
   */
  static async getTemplates(req: Request, res: Response) {
    try {
      const { category, type, premium_only } = req.query;

      // This would typically come from the database
      // For now, we'll return mock templates
      const templates = [
        {
          id: '1',
          name: 'Modern Blog Hub',
          description: 'A modern, clean blog hub with grid layout and search functionality',
          category: 'Blog',
          type: 'blog_hub',
          layout: 'grid',
          theme: 'modern',
          preview_image: '/templates/modern-blog-hub.jpg',
          is_premium: false,
        },
        {
          id: '2',
          name: 'Minimal Content List',
          description: 'A clean, minimal list view for blog posts',
          category: 'Blog',
          type: 'content_list',
          layout: 'list',
          theme: 'minimal',
          preview_image: '/templates/minimal-content-list.jpg',
          is_premium: false,
        },
        {
          id: '3',
          name: 'Magazine Style Hub',
          description: 'A magazine-style blog hub with featured posts and categories',
          category: 'Blog',
          type: 'blog_hub',
          layout: 'magazine',
          theme: 'magazine',
          preview_image: '/templates/magazine-style-hub.jpg',
          is_premium: true,
        },
      ];

      let filteredTemplates = templates;

      if (category) {
        filteredTemplates = filteredTemplates.filter(t => 
          t.category.toLowerCase() === (category as string).toLowerCase()
        );
      }

      if (type) {
        filteredTemplates = filteredTemplates.filter(t => t.type === type);
      }

      if (premium_only === 'true') {
        filteredTemplates = filteredTemplates.filter(t => t.is_premium);
      }

      return successResponse(res, filteredTemplates, 'Templates retrieved successfully');
    } catch (error) {
      console.error('Error getting templates:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Create widget from template
   */
  static async createFromTemplate(req: Request, res: Response) {
    try {
      const { websiteId, templateId } = req.params;
      const { name, customizations } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      // Get template configuration (this would come from database)
      const templateConfig = {
        type: 'blog_hub',
        layout: 'grid',
        theme: 'modern',
        settings: {
          posts_per_page: 12,
          show_excerpts: true,
          excerpt_length: 150,
          show_author: true,
          show_date: true,
          show_categories: true,
          enable_search: true,
          enable_filtering: true,
          show_hero_section: true,
          show_category_navigation: true,
          show_recent_posts: true,
          recent_posts_count: 5,
        },
        styling: {
          container_width: '1200px',
          grid_columns: 3,
          grid_gap: '2rem',
          primary_color: '#3b82f6',
          card_border_radius: '12px',
          card_shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        content_filters: {
          published_only: true,
          sort_by: 'date',
          sort_order: 'desc',
        },
        seo_settings: {
          structured_data_enabled: true,
          sitemap_included: true,
        },
        performance_settings: {
          enable_caching: true,
          cache_duration: 300,
          enable_lazy_loading: true,
          image_optimization: true,
        },
      };

      // Apply customizations
      const widgetData = {
        name: name || `Widget from ${templateId}`,
        is_active: true,
        ...templateConfig,
        ...customizations,
      };

      const result = await WidgetConfigurationService.createWidget(
        websiteId,
        userId,
        widgetData
      );

      if (result.error) {
        return errorResponse(res, 'Failed to create widget from template', 500, result.error);
      }

      return successResponse(res, result.data, 'Widget created from template successfully', 201);
    } catch (error) {
      console.error('Error creating widget from template:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Duplicate widget
   */
  static async duplicateWidget(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;
      const { name } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      // Get original widget
      const originalResult = await WidgetConfigurationService.getWidget(widgetId, userId);
      if (originalResult.error || !originalResult.data) {
        return errorResponse(res, 'Original widget not found', 404);
      }

      const original = originalResult.data;

      // Create duplicate
      const duplicateData = {
        name: name || `${original.name} (Copy)`,
        type: original.type,
        layout: original.layout,
        theme: original.theme,
        settings: original.settings,
        styling: original.styling,
        content_filters: original.content_filters,
        seo_settings: original.seo_settings,
        performance_settings: original.performance_settings,
        is_active: false, // Start as inactive
      };

      const result = await WidgetConfigurationService.createWidget(
        original.website_id,
        userId,
        duplicateData
      );

      if (result.error) {
        return errorResponse(res, 'Failed to duplicate widget', 500, result.error);
      }

      return successResponse(res, result.data, 'Widget duplicated successfully', 201);
    } catch (error) {
      console.error('Error duplicating widget:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Toggle widget active status
   */
  static async toggleActive(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      // Get current widget
      const widgetResult = await WidgetConfigurationService.getWidget(widgetId, userId);
      if (widgetResult.error || !widgetResult.data) {
        return errorResponse(res, 'Widget not found', 404);
      }

      // Toggle active status
      const result = await WidgetConfigurationService.updateWidget(
        widgetId,
        userId,
        { is_active: !widgetResult.data.is_active }
      );

      if (result.error) {
        return errorResponse(res, 'Failed to toggle widget status', 500, result.error);
      }

      return successResponse(res, result.data, 'Widget status updated successfully');
    } catch (error) {
      console.error('Error toggling widget status:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }

  /**
   * Get widget embed code
   */
  static async getEmbedCode(req: Request, res: Response) {
    try {
      const { widgetId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'Authentication required', 401);
      }

      const result = await WidgetConfigurationService.getWidget(widgetId, userId);

      if (result.error || !result.data) {
        return errorResponse(res, 'Widget not found', 404);
      }

      return successResponse(res, {
        embed_code: result.data.embed_code,
        preview_url: result.data.preview_url,
      }, 'Embed code retrieved successfully');
    } catch (error) {
      console.error('Error getting embed code:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  }
}

export default WidgetConfigurationController;
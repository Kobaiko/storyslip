import { Request, Response } from 'express';
import { widgetService } from '../services/widget.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { HelperUtil } from '../utils/helpers';

export class WidgetController {
  /**
   * Get widget configuration
   */
  static getConfig = asyncHandler(async (req: Request, res: Response) => {
    const { api_key } = req.query;

    if (!api_key) {
      return ResponseUtil.badRequest(res, 'API key is required');
    }

    try {
      const { website, configuration } = await widgetService.getWebsiteConfig(api_key as string);

      ResponseUtil.success(res, {
        website: {
          id: website.id,
          name: website.name,
          domain: website.domain,
        },
        configuration,
      });
    } catch (error: any) {
      if (error.statusCode === 401) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to get widget configuration');
    }
  });

  /**
   * Get content for widget
   */
  static getContent = asyncHandler(async (req: Request, res: Response) => {
    const { api_key, page = '1', limit = '10', category_id, tag_id } = req.query;

    if (!api_key) {
      return ResponseUtil.badRequest(res, 'API key is required');
    }

    try {
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(50, parseInt(limit as string) || 10); // Max 50 items per page

      const result = await widgetService.getWidgetContent(
        api_key as string,
        pageNum,
        limitNum,
        category_id as string,
        tag_id as string
      );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      if (error.statusCode === 401) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to get widget content');
    }
  });

  /**
   * Get single content item for widget
   */
  static getContentItem = asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const { api_key } = req.query;

    if (!api_key) {
      return ResponseUtil.badRequest(res, 'API key is required');
    }

    if (!HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid content ID format');
    }

    try {
      const content = await widgetService.getWidgetContentItem(api_key as string, contentId);

      ResponseUtil.success(res, { content });
    } catch (error: any) {
      if (error.statusCode === 401) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to get content item');
    }
  });

  /**
   * Get categories for widget
   */
  static getCategories = asyncHandler(async (req: Request, res: Response) => {
    const { api_key } = req.query;

    if (!api_key) {
      return ResponseUtil.badRequest(res, 'API key is required');
    }

    try {
      const categories = await widgetService.getWidgetCategories(api_key as string);

      ResponseUtil.success(res, { categories });
    } catch (error: any) {
      if (error.statusCode === 401) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to get widget categories');
    }
  });

  /**
   * Get tags for widget
   */
  static getTags = asyncHandler(async (req: Request, res: Response) => {
    const { api_key } = req.query;

    if (!api_key) {
      return ResponseUtil.badRequest(res, 'API key is required');
    }

    try {
      const tags = await widgetService.getWidgetTags(api_key as string);

      ResponseUtil.success(res, { tags });
    } catch (error: any) {
      if (error.statusCode === 401) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to get widget tags');
    }
  });

  /**
   * Search content for widget
   */
  static searchContent = asyncHandler(async (req: Request, res: Response) => {
    const { api_key, q, page = '1', limit = '10' } = req.query;

    if (!api_key) {
      return ResponseUtil.badRequest(res, 'API key is required');
    }

    if (!q || (q as string).trim().length === 0) {
      return ResponseUtil.badRequest(res, 'Search query is required');
    }

    try {
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(50, parseInt(limit as string) || 10);

      const result = await widgetService.searchWidgetContent(
        api_key as string,
        (q as string).trim(),
        pageNum,
        limitNum
      );

      ResponseUtil.success(res, result);
    } catch (error: any) {
      if (error.statusCode === 401) {
        return ResponseUtil.unauthorized(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to search widget content');
    }
  });

  /**
   * Health check for widget API
   */
  static healthCheck = asyncHandler(async (req: Request, res: Response) => {
    ResponseUtil.success(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });
}

export default WidgetController;
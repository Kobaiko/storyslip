import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';

export class CategoryController {
  /**
   * Create new category
   */
  static createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const categoryData = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const category = await categoryService.createCategory(websiteId, categoryData);

      logDatabaseOperation('INSERT', 'categories', { 
        categoryId: category.id, 
        websiteId, 
        userId,
        name: category.name
      });
      
      logSecurityEvent('Category created', { 
        categoryId: category.id, 
        websiteId,
        name: category.name
      }, req);

      ResponseUtil.created(res, { category });
    } catch (error: any) {
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to create category');
    }
  });

  /**
   * Get category by ID
   */
  static getCategoryById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, categoryId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(categoryId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const category = await categoryService.getCategoryById(categoryId, websiteId);

      logDatabaseOperation('SELECT', 'categories', { categoryId, websiteId, userId });

      ResponseUtil.success(res, { category });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to fetch category');
    }
  });

  /**
   * Get categories list
   */
  static getCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;
    const { hierarchy = 'false' } = req.query;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const includeHierarchy = hierarchy === 'true';
      const categories = await categoryService.getCategoriesByWebsite(websiteId, includeHierarchy);

      logDatabaseOperation('SELECT', 'categories', { 
        websiteId, 
        userId, 
        count: categories.length,
        includeHierarchy
      });

      ResponseUtil.success(res, { categories });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch categories');
    }
  });

  /**
   * Get category tree
   */
  static getCategoryTree = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

      const categoryTree = await categoryService.getCategoryTree(websiteId);

      logDatabaseOperation('SELECT', 'categories', { 
        websiteId, 
        userId, 
        action: 'tree'
      });

      ResponseUtil.success(res, { categories: categoryTree });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch category tree');
    }
  });

  /**
   * Update category
   */
  static updateCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, categoryId } = req.params;
    const updateData = req.body;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(categoryId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const category = await categoryService.updateCategory(categoryId, websiteId, updateData);

      logDatabaseOperation('UPDATE', 'categories', { 
        categoryId, 
        websiteId, 
        userId,
        updates: Object.keys(updateData),
        name: category.name
      });
      
      logSecurityEvent('Category updated', { 
        categoryId, 
        websiteId,
        name: category.name,
        updates: Object.keys(updateData)
      }, req);

      ResponseUtil.success(res, { category });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 409) {
        return ResponseUtil.conflict(res, error.message);
      }
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to update category');
    }
  });

  /**
   * Delete category
   */
  static deleteCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, categoryId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(categoryId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      await categoryService.deleteCategory(categoryId, websiteId);

      logDatabaseOperation('DELETE', 'categories', { categoryId, websiteId, userId });
      logSecurityEvent('Category deleted', { categoryId, websiteId }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      if (error.statusCode === 400) {
        return ResponseUtil.badRequest(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to delete category');
    }
  });
}

export default CategoryController;
import { supabase } from '../config/supabase';
import HelperUtil from '../utils/helpers';
import { Category } from '../types/database';
import { ApiError } from '../utils/response';

export interface CategoryCreateInput {
  name: string;
  slug?: string;
  description?: string;
  parent_id?: string;
}

export interface CategoryUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  parent_id?: string;
}

export class CategoryService {
  /**
   * Create new category
   */
  async createCategory(websiteId: string, input: CategoryCreateInput): Promise<Category> {
    try {
      // Generate slug if not provided
      const slug = input.slug || HelperUtil.generateSlug(input.name);

      // Check if slug already exists for this website
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('website_id', websiteId)
        .eq('slug', slug)
        .single();

      if (existingCategory) {
        throw new ApiError('Category with this slug already exists', 409, 'SLUG_EXISTS');
      }

      // Validate parent category if provided
      if (input.parent_id) {
        const { data: parentCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('id', input.parent_id)
          .eq('website_id', websiteId)
          .single();

        if (!parentCategory) {
          throw new ApiError('Parent category not found', 404, 'PARENT_NOT_FOUND');
        }
      }

      const categoryData = {
        name: input.name,
        slug,
        description: input.description,
        parent_id: input.parent_id,
        website_id: websiteId,
      };

      const { data: category, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to create category', 500, 'DATABASE_ERROR', error);
      }

      return category;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create category', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string, websiteId: string): Promise<Category> {
    try {
      const { data: category, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:parent_id(id, name, slug),
          children:categories!parent_id(id, name, slug)
        `)
        .eq('id', categoryId)
        .eq('website_id', websiteId)
        .single();

      if (error || !category) {
        throw new ApiError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      return category;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch category', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get categories list
   */
  async getCategoriesByWebsite(
    websiteId: string,
    includeHierarchy = false
  ): Promise<Category[]> {
    try {
      let query = supabase
        .from('categories')
        .select(`
          *,
          ${includeHierarchy ? 'parent:parent_id(id, name, slug), children:categories!parent_id(id, name, slug)' : ''}
        `)
        .eq('website_id', websiteId)
        .order('name');

      const { data: categories, error } = await query;

      if (error) {
        throw new ApiError('Failed to fetch categories', 500, 'DATABASE_ERROR', error);
      }

      return categories || [];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch categories', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getCategoryTree(websiteId: string): Promise<Category[]> {
    try {
      const categories = await this.getCategoriesByWebsite(websiteId, true);
      
      // Build tree structure
      const categoryMap = new Map<string, Category>();
      const rootCategories: Category[] = [];

      // First pass: create map
      categories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
      });

      // Second pass: build tree
      categories.forEach(category => {
        const categoryWithChildren = categoryMap.get(category.id)!;
        
        if (category.parent_id) {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(categoryWithChildren);
          }
        } else {
          rootCategories.push(categoryWithChildren);
        }
      });

      return rootCategories;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to build category tree', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    websiteId: string,
    input: CategoryUpdateInput
  ): Promise<Category> {
    try {
      // Verify category exists
      await this.getCategoryById(categoryId, websiteId);

      // Check slug uniqueness if being updated
      if (input.slug) {
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('website_id', websiteId)
          .eq('slug', input.slug)
          .neq('id', categoryId)
          .single();

        if (existingCategory) {
          throw new ApiError('Category with this slug already exists', 409, 'SLUG_EXISTS');
        }
      }

      // Validate parent category if being updated
      if (input.parent_id) {
        // Check if parent exists
        const { data: parentCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('id', input.parent_id)
          .eq('website_id', websiteId)
          .single();

        if (!parentCategory) {
          throw new ApiError('Parent category not found', 404, 'PARENT_NOT_FOUND');
        }

        // Check for circular reference
        if (await this.wouldCreateCircularReference(categoryId, input.parent_id)) {
          throw new ApiError('Cannot set parent: would create circular reference', 400, 'CIRCULAR_REFERENCE');
        }
      }

      const updateData = HelperUtil.removeUndefined(input);

      const { data: category, error } = await supabase
        .from('categories')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId)
        .eq('website_id', websiteId)
        .select()
        .single();

      if (error || !category) {
        throw new ApiError('Failed to update category', 500, 'DATABASE_ERROR', error);
      }

      return category;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update category', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string, websiteId: string): Promise<void> {
    try {
      // Verify category exists
      await this.getCategoryById(categoryId, websiteId);

      // Check if category has children
      const { data: children } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', categoryId)
        .limit(1);

      if (children && children.length > 0) {
        throw new ApiError('Cannot delete category with child categories', 400, 'HAS_CHILDREN');
      }

      // Check if category is used by content
      const { data: content } = await supabase
        .from('content_categories')
        .select('content_id')
        .eq('category_id', categoryId)
        .limit(1);

      if (content && content.length > 0) {
        throw new ApiError('Cannot delete category that is used by content', 400, 'CATEGORY_IN_USE');
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('website_id', websiteId);

      if (error) {
        throw new ApiError('Failed to delete category', 500, 'DATABASE_ERROR', error);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete category', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Check if setting a parent would create a circular reference
   */
  private async wouldCreateCircularReference(
    categoryId: string,
    parentId: string
  ): Promise<boolean> {
    if (categoryId === parentId) return true;

    // Get all descendants of the category
    const descendants = await this.getDescendants(categoryId);
    return descendants.some(desc => desc.id === parentId);
  }

  /**
   * Get all descendants of a category
   */
  private async getDescendants(categoryId: string): Promise<Category[]> {
    const { data: children } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', categoryId);

    if (!children || children.length === 0) return [];

    const descendants: Category[] = [...children];

    for (const child of children) {
      const childDescendants = await this.getDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }
}

export const categoryService = new CategoryService();
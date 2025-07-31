import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { contentService } from './content.service';
import { categoryService } from './category.service';
import { tagService } from './tag.service';
import { HelperUtil } from '../utils/helpers';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

export interface ContentExportOptions {
  format: 'json' | 'csv' | 'xml';
  includeMetadata: boolean;
  includeCategories: boolean;
  includeTags: boolean;
  includeAnalytics: boolean;
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface ContentImportOptions {
  format: 'json' | 'csv';
  updateExisting: boolean;
  createCategories: boolean;
  createTags: boolean;
  defaultStatus: 'draft' | 'published';
}

export interface ImportResult {
  imported: number;
  updated: number;
  errors: Array<{
    row: number;
    error: string;
    data?: any;
  }>;
  warnings: Array<{
    row: number;
    warning: string;
    data?: any;
  }>;
}

export class ContentImportExportService {
  /**
   * Export content from a website
   */
  async exportContent(
    websiteId: string,
    options: ContentExportOptions
  ): Promise<string> {
    try {
      // Build query based on options
      let query = supabase
        .from('content')
        .select(`
          *,
          ${options.includeCategories ? 'categories:content_categories(category:categories(*)),' : ''}
          ${options.includeTags ? 'tags:content_tags(tag:tags(*)),' : ''}
          ${options.includeAnalytics ? 'view_count,' : ''}
          author:users!author_id(id, name, email)
        `)
        .eq('website_id', websiteId);

      // Apply filters
      if (options.status?.length) {
        query = query.in('status', options.status);
      }

      if (options.dateFrom) {
        query = query.gte('created_at', options.dateFrom);
      }

      if (options.dateTo) {
        query = query.lte('created_at', options.dateTo);
      }

      const { data: content, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new ApiError('Failed to fetch content for export', 500, 'DATABASE_ERROR', error);
      }

      // Format data based on export format
      switch (options.format) {
        case 'json':
          return this.formatAsJSON(content || [], options);
        case 'csv':
          return this.formatAsCSV(content || [], options);
        case 'xml':
          return this.formatAsXML(content || [], options);
        default:
          throw new ApiError('Unsupported export format', 400, 'INVALID_FORMAT');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to export content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Import content to a website
   */
  async importContent(
    websiteId: string,
    userId: string,
    fileContent: string,
    options: ContentImportOptions
  ): Promise<ImportResult> {
    try {
      let contentData: any[];

      // Parse content based on format
      switch (options.format) {
        case 'json':
          contentData = JSON.parse(fileContent);
          break;
        case 'csv':
          contentData = await this.parseCSV(fileContent);
          break;
        default:
          throw new ApiError('Unsupported import format', 400, 'INVALID_FORMAT');
      }

      if (!Array.isArray(contentData)) {
        throw new ApiError('Import data must be an array', 400, 'INVALID_DATA');
      }

      const result: ImportResult = {
        imported: 0,
        updated: 0,
        errors: [],
        warnings: [],
      };

      // Process each content item
      for (let i = 0; i < contentData.length; i++) {
        const row = i + 1;
        const item = contentData[i];

        try {
          await this.processContentItem(websiteId, userId, item, options, result, row);
        } catch (error: any) {
          result.errors.push({
            row,
            error: error.message || 'Unknown error',
            data: item,
          });
        }
      }

      return result;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to import content', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get import/export templates
   */
  getImportTemplate(format: 'json' | 'csv'): string {
    const sampleData = {
      title: 'Sample Article Title',
      slug: 'sample-article-title',
      body: 'This is the main content of the article...',
      excerpt: 'This is a brief excerpt of the article.',
      status: 'draft',
      seo_title: 'SEO Optimized Title',
      seo_description: 'SEO meta description for the article.',
      seo_keywords: 'keyword1,keyword2,keyword3',
      featured_image_url: 'https://example.com/image.jpg',
      categories: 'Technology,Web Development',
      tags: 'JavaScript,React,Tutorial',
      scheduled_at: '2024-12-31T23:59:59Z',
    };

    switch (format) {
      case 'json':
        return JSON.stringify([sampleData], null, 2);
      case 'csv':
        return this.objectToCSV([sampleData]);
      default:
        throw new ApiError('Unsupported template format', 400, 'INVALID_FORMAT');
    }
  }

  /**
   * Validate import data
   */
  async validateImportData(
    websiteId: string,
    fileContent: string,
    format: 'json' | 'csv'
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    preview: any[];
  }> {
    try {
      let contentData: any[];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Parse content
      try {
        switch (format) {
          case 'json':
            contentData = JSON.parse(fileContent);
            break;
          case 'csv':
            contentData = await this.parseCSV(fileContent);
            break;
          default:
            throw new Error('Unsupported format');
        }
      } catch (error) {
        errors.push('Invalid file format or corrupted data');
        return { isValid: false, errors, warnings, preview: [] };
      }

      if (!Array.isArray(contentData)) {
        errors.push('Data must be an array of content items');
        return { isValid: false, errors, warnings, preview: [] };
      }

      if (contentData.length === 0) {
        errors.push('No content items found in the file');
        return { isValid: false, errors, warnings, preview: [] };
      }

      if (contentData.length > 1000) {
        warnings.push('Large import detected. Consider splitting into smaller batches.');
      }

      // Validate each item
      const requiredFields = ['title', 'body'];
      const optionalFields = ['slug', 'excerpt', 'status', 'seo_title', 'seo_description', 'categories', 'tags'];

      contentData.forEach((item, index) => {
        const row = index + 1;

        // Check required fields
        requiredFields.forEach(field => {
          if (!item[field] || item[field].trim() === '') {
            errors.push(`Row ${row}: Missing required field '${field}'`);
          }
        });

        // Validate field types and formats
        if (item.title && item.title.length > 500) {
          warnings.push(`Row ${row}: Title is very long (${item.title.length} characters)`);
        }

        if (item.slug && !/^[a-z0-9-]+$/.test(item.slug)) {
          warnings.push(`Row ${row}: Slug contains invalid characters. Use only lowercase letters, numbers, and hyphens.`);
        }

        if (item.status && !['draft', 'published', 'scheduled', 'archived'].includes(item.status)) {
          errors.push(`Row ${row}: Invalid status '${item.status}'. Must be one of: draft, published, scheduled, archived`);
        }

        if (item.scheduled_at && item.status !== 'scheduled') {
          warnings.push(`Row ${row}: scheduled_at provided but status is not 'scheduled'`);
        }

        if (item.seo_title && item.seo_title.length > 60) {
          warnings.push(`Row ${row}: SEO title is too long (${item.seo_title.length} characters). Recommended: under 60 characters.`);
        }

        if (item.seo_description && item.seo_description.length > 160) {
          warnings.push(`Row ${row}: SEO description is too long (${item.seo_description.length} characters). Recommended: under 160 characters.`);
        }
      });

      // Check for duplicate slugs
      const slugs = contentData
        .map(item => item.slug)
        .filter(slug => slug && slug.trim() !== '');
      
      const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);
      if (duplicateSlugs.length > 0) {
        errors.push(`Duplicate slugs found: ${[...new Set(duplicateSlugs)].join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        preview: contentData.slice(0, 5), // Return first 5 items as preview
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate import data'],
        warnings: [],
        preview: [],
      };
    }
  }

  /**
   * Private helper methods
   */
  private formatAsJSON(content: any[], options: ContentExportOptions): string {
    const exportData = content.map(item => {
      const exported: any = {
        title: item.title,
        slug: item.slug,
        body: item.body,
        excerpt: item.excerpt,
        status: item.status,
        seo_title: item.seo_title,
        seo_description: item.seo_description,
        seo_keywords: item.seo_keywords?.join(','),
        featured_image_url: item.featured_image_url,
      };

      if (options.includeMetadata) {
        exported.created_at = item.created_at;
        exported.updated_at = item.updated_at;
        exported.published_at = item.published_at;
        exported.author = item.author?.name;
      }

      if (options.includeCategories && item.categories) {
        exported.categories = item.categories.map((c: any) => c.category.name).join(',');
      }

      if (options.includeTags && item.tags) {
        exported.tags = item.tags.map((t: any) => t.tag.name).join(',');
      }

      if (options.includeAnalytics) {
        exported.view_count = item.view_count;
      }

      return exported;
    });

    return JSON.stringify(exportData, null, 2);
  }

  private formatAsCSV(content: any[], options: ContentExportOptions): string {
    if (content.length === 0) return '';

    const exportData = content.map(item => ({
      title: item.title,
      slug: item.slug,
      body: item.body,
      excerpt: item.excerpt,
      status: item.status,
      seo_title: item.seo_title,
      seo_description: item.seo_description,
      seo_keywords: item.seo_keywords?.join(','),
      featured_image_url: item.featured_image_url,
      categories: options.includeCategories && item.categories 
        ? item.categories.map((c: any) => c.category.name).join(',') 
        : '',
      tags: options.includeTags && item.tags 
        ? item.tags.map((t: any) => t.tag.name).join(',') 
        : '',
      ...(options.includeMetadata && {
        created_at: item.created_at,
        updated_at: item.updated_at,
        published_at: item.published_at,
        author: item.author?.name,
      }),
      ...(options.includeAnalytics && {
        view_count: item.view_count,
      }),
    }));

    return this.objectToCSV(exportData);
  }

  private formatAsXML(content: any[], options: ContentExportOptions): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<content>\n';

    content.forEach(item => {
      xml += '  <item>\n';
      xml += `    <title><![CDATA[${item.title}]]></title>\n`;
      xml += `    <slug>${item.slug}</slug>\n`;
      xml += `    <body><![CDATA[${item.body}]]></body>\n`;
      xml += `    <excerpt><![CDATA[${item.excerpt || ''}]]></excerpt>\n`;
      xml += `    <status>${item.status}</status>\n`;
      xml += `    <seo_title><![CDATA[${item.seo_title || ''}]]></seo_title>\n`;
      xml += `    <seo_description><![CDATA[${item.seo_description || ''}]]></seo_description>\n`;
      xml += `    <featured_image_url>${item.featured_image_url || ''}</featured_image_url>\n`;

      if (options.includeCategories && item.categories) {
        xml += '    <categories>\n';
        item.categories.forEach((c: any) => {
          xml += `      <category>${c.category.name}</category>\n`;
        });
        xml += '    </categories>\n';
      }

      if (options.includeTags && item.tags) {
        xml += '    <tags>\n';
        item.tags.forEach((t: any) => {
          xml += `      <tag>${t.tag.name}</tag>\n`;
        });
        xml += '    </tags>\n';
      }

      xml += '  </item>\n';
    });

    xml += '</content>';
    return xml;
  }

  private objectToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  private async parseCSV(csvContent: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from([csvContent]);

      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  private async processContentItem(
    websiteId: string,
    userId: string,
    item: any,
    options: ContentImportOptions,
    result: ImportResult,
    row: number
  ): Promise<void> {
    // Validate required fields
    if (!item.title || !item.body) {
      throw new Error('Missing required fields: title and body');
    }

    // Generate slug if not provided
    const slug = item.slug || HelperUtil.generateSlug(item.title);

    // Check if content already exists
    const { data: existingContent } = await supabase
      .from('content')
      .select('id')
      .eq('website_id', websiteId)
      .eq('slug', slug)
      .single();

    if (existingContent && !options.updateExisting) {
      result.warnings.push({
        row,
        warning: `Content with slug '${slug}' already exists. Skipping.`,
        data: item,
      });
      return;
    }

    // Process categories
    let categoryIds: string[] = [];
    if (item.categories) {
      const categoryNames = item.categories.split(',').map((name: string) => name.trim());
      categoryIds = await this.processCategories(websiteId, categoryNames, options.createCategories);
    }

    // Process tags
    let tagIds: string[] = [];
    if (item.tags) {
      const tagNames = item.tags.split(',').map((name: string) => name.trim());
      tagIds = await this.processTags(websiteId, tagNames, options.createTags);
    }

    // Prepare content data
    const contentData = {
      title: item.title,
      slug,
      body: item.body,
      excerpt: item.excerpt,
      status: item.status || options.defaultStatus,
      seo_title: item.seo_title,
      seo_description: item.seo_description,
      seo_keywords: item.seo_keywords ? item.seo_keywords.split(',').map((k: string) => k.trim()) : undefined,
      featured_image_url: item.featured_image_url,
      scheduled_at: item.scheduled_at,
      category_ids: categoryIds,
      tag_ids: tagIds,
    };

    if (existingContent && options.updateExisting) {
      // Update existing content
      await contentService.updateContent(existingContent.id, websiteId, contentData);
      result.updated++;
    } else {
      // Create new content
      await contentService.createContent(websiteId, userId, contentData);
      result.imported++;
    }
  }

  private async processCategories(websiteId: string, categoryNames: string[], createNew: boolean): Promise<string[]> {
    const categoryIds: string[] = [];

    for (const name of categoryNames) {
      if (!name) continue;

      // Check if category exists
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('website_id', websiteId)
        .eq('name', name)
        .single();

      if (existingCategory) {
        categoryIds.push(existingCategory.id);
      } else if (createNew) {
        // Create new category
        const { data: newCategory } = await categoryService.createCategory(websiteId, {
          name,
          slug: HelperUtil.generateSlug(name),
        });
        if (newCategory) {
          categoryIds.push(newCategory.id);
        }
      }
    }

    return categoryIds;
  }

  private async processTags(websiteId: string, tagNames: string[], createNew: boolean): Promise<string[]> {
    const tagIds: string[] = [];

    for (const name of tagNames) {
      if (!name) continue;

      // Check if tag exists
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('website_id', websiteId)
        .eq('name', name)
        .single();

      if (existingTag) {
        tagIds.push(existingTag.id);
      } else if (createNew) {
        // Create new tag
        const { data: newTag } = await tagService.createTag(websiteId, {
          name,
          slug: HelperUtil.generateSlug(name),
        });
        if (newTag) {
          tagIds.push(newTag.id);
        }
      }
    }

    return tagIds;
  }
}

export const contentImportExportService = new ContentImportExportService();
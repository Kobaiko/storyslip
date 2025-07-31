import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { HelperUtil } from '../utils/helpers';
import { brandService } from './brand.service';
import { CDNUtil } from '../utils/cdn';
import WidgetOptimizationService from './widget-optimization.service';
import Redis from 'ioredis';

// Redis client for caching
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface ContentDeliveryOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  tag?: string;
  sort?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface WidgetContentResponse {
  html: string;
  css: string;
  data: {
    items: any[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: {
    title?: string;
    description?: string;
    canonical?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    structuredData?: any;
  };
  performance: {
    cacheHit: boolean;
    renderTime: number;
    queryTime: number;
  };
}

export class WidgetContentDeliveryService {
  private static readonly CACHE_TTL = {
    CONTENT: 300, // 5 minutes
    CSS: 3600, // 1 hour
    METADATA: 1800, // 30 minutes
  };

  /**
   * Deliver optimized widget content with caching
   */
  async deliverContent(
    widgetId: string,
    options: ContentDeliveryOptions = {}
  ): Promise<WidgetContentResponse> {
    const startTime = Date.now();
    let cacheHit = false;
    let queryTime = 0;

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(widgetId, options);
      
      // Try to get from cache first
      const cachedContent = await this.getCachedContent(cacheKey);
      if (cachedContent) {
        cacheHit = true;
        return {
          ...cachedContent,
          performance: {
            cacheHit: true,
            renderTime: Date.now() - startTime,
            queryTime: 0,
          },
        };
      }

      // Get widget configuration
      const widget = await this.getWidgetConfig(widgetId);
      if (!widget || !widget.is_public) {
        throw new ApiError('Widget not found or not public', 404, 'WIDGET_NOT_FOUND');
      }

      // Check domain restrictions
      if (widget.allowed_domains?.length > 0 && options.referrer) {
        const referrerDomain = this.extractDomain(options.referrer);
        if (!widget.allowed_domains.includes(referrerDomain)) {
          throw new ApiError('Domain not allowed', 403, 'DOMAIN_NOT_ALLOWED');
        }
      }

      const queryStart = Date.now();

      // Get content based on widget type
      const contentData = await this.getOptimizedContent(widget, options);
      
      queryTime = Date.now() - queryStart;

      // Get brand configuration for styling
      const brandConfig = await this.getCachedBrandConfig(widget.website_id);
      
      // Generate HTML and CSS
      const rawHTML = await this.generateOptimizedHTML(widget, contentData, brandConfig);
      const rawCSS = await this.generateOptimizedCSS(widget, brandConfig);
      
      // Apply optimizations
      const optimized = await WidgetOptimizationService.optimizeContent(rawHTML, rawCSS, {
        minifyHTML: true,
        minifyCSS: true,
        optimizeImages: true,
        enableLazyLoading: true,
        generateResponsiveImages: true,
        inlineCriticalCSS: false, // Keep CSS separate for caching
        preloadResources: true,
      });
      
      // Generate SEO metadata
      const meta = await this.generateSEOMetadata(widget, contentData, options);

      const response: WidgetContentResponse = {
        html: optimized.html,
        css: optimized.css,
        data: contentData,
        meta,
        performance: {
          cacheHit: false,
          renderTime: Date.now() - startTime,
          queryTime,
        },
      };

      // Cache the response
      await this.cacheContent(cacheKey, response);

      return response;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to deliver widget content', 500, 'DELIVERY_ERROR', error);
    }
  }

  /**
   * Get optimized content with advanced caching and query optimization
   */
  private async getOptimizedContent(
    widget: any,
    options: ContentDeliveryOptions
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || widget.items_per_page, 50); // Cap at 50 items
    const offset = (page - 1) * limit;

    // Build optimized query based on widget type
    let query = supabase
      .from('content')
      .select(this.getOptimizedSelectFields(widget), { count: 'exact' })
      .eq('website_id', widget.website_id)
      .eq('status', 'published');

    // Apply content filters from widget configuration
    query = this.applyContentFilters(query, widget.content_filters);

    // Apply runtime filters
    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,excerpt.ilike.%${options.search}%`);
    }

    if (options.category) {
      query = query.in('id', 
        supabase
          .from('content_categories')
          .select('content_id')
          .in('category_id', [options.category])
      );
    }

    if (options.tag) {
      query = query.in('id',
        supabase
          .from('content_tags')
          .select('content_id')
          .in('tag_id', [options.tag])
      );
    }

    // Apply sorting
    const sortOrder = options.sort || widget.sort_order || 'created_at_desc';
    const [sortField, sortDirection] = sortOrder.split('_');
    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: content, error, count } = await query;

    if (error) {
      throw new ApiError('Failed to fetch content', 500, 'DATABASE_ERROR', error);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      items: content || [],
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Get optimized select fields based on widget configuration
   */
  private getOptimizedSelectFields(widget: any): string {
    const baseFields = ['id', 'title', 'slug', 'created_at', 'published_at'];
    const optionalFields = [];

    if (widget.show_excerpts) {
      optionalFields.push('excerpt');
    }

    if (widget.show_images) {
      optionalFields.push('featured_image_url');
    }

    if (widget.show_authors) {
      optionalFields.push('author:users!author_id(name, avatar_url)');
    }

    if (widget.show_categories) {
      optionalFields.push('categories:content_categories(category:categories(id, name, slug))');
    }

    if (widget.show_tags) {
      optionalFields.push('tags:content_tags(tag:tags(id, name, slug))');
    }

    // For single content widget, include full body
    if (widget.widget_type === 'single_content') {
      optionalFields.push('body', 'meta_title', 'meta_description');
    }

    return [...baseFields, ...optionalFields].join(', ');
  }

  /**
   * Apply content filters from widget configuration
   */
  private applyContentFilters(query: any, filters: any): any {
    if (!filters) return query;

    if (filters.category_ids?.length > 0) {
      query = query.in('id', 
        supabase
          .from('content_categories')
          .select('content_id')
          .in('category_id', filters.category_ids)
      );
    }

    if (filters.tag_ids?.length > 0) {
      query = query.in('id',
        supabase
          .from('content_tags')
          .select('content_id')
          .in('tag_id', filters.tag_ids)
      );
    }

    if (filters.author_ids?.length > 0) {
      query = query.in('author_id', filters.author_ids);
    }

    if (filters.date_from) {
      query = query.gte('published_at', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('published_at', filters.date_to);
    }

    return query;
  }

  /**
   * Generate optimized HTML with server-side rendering
   */
  private async generateOptimizedHTML(
    widget: any,
    contentData: any,
    brandConfig: any
  ): Promise<string> {
    const items = contentData.items || [];
    
    switch (widget.widget_type) {
      case 'content_list':
        return this.generateContentListHTML(widget, contentData, brandConfig);
      case 'single_content':
        return this.generateSingleContentHTML(widget, contentData, brandConfig);
      case 'category_feed':
        return this.generateCategoryFeedHTML(widget, contentData, brandConfig);
      default:
        return '<div class="storyslip-widget-error">Unsupported widget type</div>';
    }
  }

  /**
   * Generate optimized content list HTML
   */
  private generateContentListHTML(
    widget: any,
    contentData: any,
    brandConfig: any
  ): string {
    const items = contentData.items || [];
    
    const itemsHTML = items.map((item: any) => {
      const imageHTML = widget.show_images && item.featured_image_url
        ? `<img src="${item.featured_image_url}" alt="${HelperUtil.escapeHtml(item.title)}" class="storyslip-item-image" loading="lazy" decoding="async">`
        : '';
      
      const excerptHTML = widget.show_excerpts && item.excerpt
        ? `<p class="storyslip-item-excerpt">${HelperUtil.escapeHtml(item.excerpt)}</p>`
        : '';
      
      const dateHTML = widget.show_dates
        ? `<time class="storyslip-item-date" datetime="${item.published_at || item.created_at}">${new Date(item.published_at || item.created_at).toLocaleDateString()}</time>`
        : '';
      
      const authorHTML = widget.show_authors && item.author
        ? `<span class="storyslip-item-author">by ${HelperUtil.escapeHtml(item.author.name)}</span>`
        : '';
      
      const categoriesHTML = widget.show_categories && item.categories?.length
        ? `<div class="storyslip-item-categories">${item.categories.map((c: any) => `<span class="storyslip-category">${HelperUtil.escapeHtml(c.category.name)}</span>`).join('')}</div>`
        : '';
      
      const target = widget.open_links_in_new_tab ? 'target="_blank" rel="noopener noreferrer"' : '';
      
      return `
        <article class="storyslip-item" data-content-id="${item.id}">
          ${imageHTML}
          <div class="storyslip-item-content">
            <h3 class="storyslip-item-title">
              <a href="/${item.slug}" ${target} class="storyslip-item-link">${HelperUtil.escapeHtml(item.title)}</a>
            </h3>
            ${excerptHTML}
            <div class="storyslip-item-meta">
              ${dateHTML}
              ${authorHTML}
            </div>
            ${categoriesHTML}
          </div>
        </article>
      `;
    }).join('');
    
    const titleHTML = widget.title ? `<h2 class="storyslip-widget-title">${HelperUtil.escapeHtml(widget.title)}</h2>` : '';
    const descriptionHTML = widget.description ? `<p class="storyslip-widget-description">${HelperUtil.escapeHtml(widget.description)}</p>` : '';
    
    const paginationHTML = widget.enable_pagination && contentData.totalPages > 1
      ? this.generatePaginationHTML(contentData.page, contentData.totalPages)
      : '';
    
    const loadMoreHTML = widget.enable_infinite_scroll && contentData.hasMore
      ? '<button class="storyslip-load-more" data-page="' + (contentData.page + 1) + '">Load More</button>'
      : '';
    
    return `
      <div class="storyslip-widget storyslip-widget-${widget.theme}" data-widget-id="${widget.id}" data-widget-type="${widget.widget_type}">
        <div class="storyslip-widget-header">
          ${titleHTML}
          ${descriptionHTML}
        </div>
        <div class="storyslip-widget-content">
          ${itemsHTML}
        </div>
        ${paginationHTML}
        ${loadMoreHTML}
        ${!brandConfig.hide_storyslip_branding ? '<div class="storyslip-widget-footer"><a href="https://storyslip.com" target="_blank" rel="noopener">Powered by StorySlip</a></div>' : ''}
      </div>
    `;
  }

  /**
   * Generate single content HTML
   */
  private generateSingleContentHTML(
    widget: any,
    contentData: any,
    brandConfig: any
  ): string {
    const content = contentData.items[0];
    if (!content) {
      return '<div class="storyslip-widget-error">Content not found</div>';
    }
    
    const imageHTML = widget.show_images && content.featured_image_url
      ? `<img src="${content.featured_image_url}" alt="${HelperUtil.escapeHtml(content.title)}" class="storyslip-content-image" loading="lazy" decoding="async">`
      : '';
    
    const dateHTML = widget.show_dates
      ? `<time class="storyslip-content-date" datetime="${content.published_at || content.created_at}">${new Date(content.published_at || content.created_at).toLocaleDateString()}</time>`
      : '';
    
    const authorHTML = widget.show_authors && content.author
      ? `<span class="storyslip-content-author">by ${HelperUtil.escapeHtml(content.author.name)}</span>`
      : '';
    
    const target = widget.open_links_in_new_tab ? 'target="_blank" rel="noopener noreferrer"' : '';
    
    return `
      <div class="storyslip-widget storyslip-widget-${widget.theme}" data-widget-id="${widget.id}" data-widget-type="${widget.widget_type}">
        <article class="storyslip-single-content" data-content-id="${content.id}">
          ${imageHTML}
          <div class="storyslip-content-body">
            <h1 class="storyslip-content-title">
              <a href="/${content.slug}" ${target} class="storyslip-content-link">${HelperUtil.escapeHtml(content.title)}</a>
            </h1>
            <div class="storyslip-content-meta">
              ${dateHTML}
              ${authorHTML}
            </div>
            <div class="storyslip-content-text">${content.body || content.excerpt || ''}</div>
          </div>
        </article>
        ${!brandConfig.hide_storyslip_branding ? '<div class="storyslip-widget-footer"><a href="https://storyslip.com" target="_blank" rel="noopener">Powered by StorySlip</a></div>' : ''}
      </div>
    `;
  }

  /**
   * Generate category feed HTML
   */
  private generateCategoryFeedHTML(
    widget: any,
    contentData: any,
    brandConfig: any
  ): string {
    // Similar to content list but with category-specific styling
    return this.generateContentListHTML(widget, contentData, brandConfig);
  }

  /**
   * Generate pagination HTML
   */
  private generatePaginationHTML(currentPage: number, totalPages: number): string {
    const pages = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(`
        <button class="storyslip-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}" aria-label="Go to page ${i}">
          ${i}
        </button>
      `);
    }
    
    const prevBtn = currentPage > 1
      ? `<button class="storyslip-page-btn storyslip-prev-btn" data-page="${currentPage - 1}" aria-label="Previous page">Previous</button>`
      : '';
    
    const nextBtn = currentPage < totalPages
      ? `<button class="storyslip-page-btn storyslip-next-btn" data-page="${currentPage + 1}" aria-label="Next page">Next</button>`
      : '';
    
    return `
      <nav class="storyslip-pagination" role="navigation" aria-label="Pagination">
        ${prevBtn}
        ${pages.join('')}
        ${nextBtn}
      </nav>
    `;
  }

  /**
   * Generate optimized CSS with caching
   */
  private async generateOptimizedCSS(widget: any, brandConfig: any): Promise<string> {
    const cacheKey = `css:${widget.id}:${brandConfig.updated_at}`;
    
    const cachedCSS = await redis.get(cacheKey);
    if (cachedCSS) {
      return cachedCSS;
    }

    const css = this.buildOptimizedCSS(widget, brandConfig);
    
    // Cache CSS for 1 hour
    await redis.setex(cacheKey, this.CACHE_TTL.CSS, css);
    
    return css;
  }

  /**
   * Build optimized CSS
   */
  private buildOptimizedCSS(widget: any, brandConfig: any): string {
    const baseCSS = `
      .storyslip-widget {
        font-family: ${brandConfig.font_family || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
        color: ${brandConfig.text_color || '#333'};
        background: ${brandConfig.background_color || '#fff'};
        border-radius: ${widget.border_radius || '8px'};
        padding: ${widget.padding || '16px'};
        width: ${widget.width || '100%'};
        height: ${widget.height || 'auto'};
        overflow: auto;
        box-sizing: border-box;
        line-height: 1.6;
      }
      
      .storyslip-widget * {
        box-sizing: border-box;
      }
      
      .storyslip-widget-title {
        font-family: ${brandConfig.heading_font_family || brandConfig.font_family || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
        color: ${brandConfig.primary_color || '#007bff'};
        margin: 0 0 16px 0;
        font-size: 24px;
        font-weight: 600;
        line-height: 1.3;
      }
      
      .storyslip-widget-description {
        margin: 0 0 24px 0;
        color: ${brandConfig.text_color || '#666'};
        opacity: 0.8;
        line-height: 1.5;
      }
      
      .storyslip-item {
        margin-bottom: 24px;
        padding-bottom: 24px;
        border-bottom: 1px solid ${brandConfig.primary_color || '#007bff'}20;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .storyslip-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      
      .storyslip-item-image {
        width: 100%;
        height: 200px;
        object-fit: cover;
        border-radius: 8px;
        transition: transform 0.2s ease;
      }
      
      .storyslip-item-image:hover {
        transform: scale(1.02);
      }
      
      .storyslip-item-title {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.4;
      }
      
      .storyslip-item-link {
        color: ${brandConfig.text_color || '#333'};
        text-decoration: none;
        transition: color 0.2s ease;
      }
      
      .storyslip-item-link:hover {
        color: ${brandConfig.primary_color || '#007bff'};
        text-decoration: underline;
      }
      
      .storyslip-item-excerpt {
        margin: 0 0 12px 0;
        line-height: 1.6;
        opacity: 0.8;
        color: ${brandConfig.text_color || '#666'};
      }
      
      .storyslip-item-meta {
        font-size: 14px;
        opacity: 0.7;
        margin-bottom: 8px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      
      .storyslip-item-date {
        color: ${brandConfig.text_color || '#666'};
      }
      
      .storyslip-item-author {
        color: ${brandConfig.text_color || '#666'};
      }
      
      .storyslip-item-categories {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      
      .storyslip-category {
        display: inline-block;
        background: ${brandConfig.primary_color || '#007bff'};
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        text-decoration: none;
        transition: background-color 0.2s ease;
      }
      
      .storyslip-category:hover {
        background: ${this.darkenColor(brandConfig.primary_color || '#007bff', 10)};
      }
      
      .storyslip-pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin-top: 24px;
        flex-wrap: wrap;
      }
      
      .storyslip-page-btn {
        padding: 8px 12px;
        border: 1px solid ${brandConfig.primary_color || '#007bff'};
        background: transparent;
        color: ${brandConfig.primary_color || '#007bff'};
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
        min-width: 40px;
      }
      
      .storyslip-page-btn:hover,
      .storyslip-page-btn.active {
        background: ${brandConfig.primary_color || '#007bff'};
        color: white;
      }
      
      .storyslip-page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .storyslip-load-more {
        display: block;
        margin: 24px auto 0;
        padding: 12px 24px;
        background: ${brandConfig.primary_color || '#007bff'};
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: background-color 0.2s ease;
      }
      
      .storyslip-load-more:hover {
        background: ${this.darkenColor(brandConfig.primary_color || '#007bff', 10)};
      }
      
      .storyslip-widget-footer {
        text-align: center;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid ${brandConfig.primary_color || '#007bff'}20;
        font-size: 12px;
        opacity: 0.6;
      }
      
      .storyslip-widget-footer a {
        color: ${brandConfig.primary_color || '#007bff'};
        text-decoration: none;
      }
      
      .storyslip-widget-error {
        text-align: center;
        padding: 40px 20px;
        color: #dc3545;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 8px;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .storyslip-widget {
          padding: 12px;
        }
        
        .storyslip-widget-title {
          font-size: 20px;
        }
        
        .storyslip-item-title {
          font-size: 16px;
        }
        
        .storyslip-pagination {
          gap: 4px;
        }
        
        .storyslip-page-btn {
          padding: 6px 10px;
          font-size: 12px;
          min-width: 32px;
        }
      }
      
      /* Theme-specific styles */
      ${this.getThemeSpecificCSS(widget.theme, brandConfig)}
      
      /* Custom CSS */
      ${widget.custom_css || ''}
    `;
    
    return this.minifyCSS(baseCSS);
  }

  /**
   * Get theme-specific CSS
   */
  private getThemeSpecificCSS(theme: string, brandConfig: any): string {
    switch (theme) {
      case 'card':
        return `
          .storyslip-widget.storyslip-widget-card .storyslip-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: box-shadow 0.2s ease;
          }
          
          .storyslip-widget.storyslip-widget-card .storyslip-item:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          }
        `;
      case 'minimal':
        return `
          .storyslip-widget.storyslip-widget-minimal {
            padding: 8px;
          }
          
          .storyslip-widget.storyslip-widget-minimal .storyslip-item {
            margin-bottom: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .storyslip-widget.storyslip-widget-minimal .storyslip-item-title {
            font-size: 16px;
            margin-bottom: 4px;
          }
        `;
      case 'list':
        return `
          .storyslip-widget.storyslip-widget-list .storyslip-item {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            gap: 16px;
          }
          
          .storyslip-widget.storyslip-widget-list .storyslip-item-image {
            width: 120px;
            height: 80px;
            flex-shrink: 0;
          }
          
          .storyslip-widget.storyslip-widget-list .storyslip-item-content {
            flex: 1;
          }
        `;
      default:
        return '';
    }
  }

  /**
   * Generate SEO metadata
   */
  private async generateSEOMetadata(
    widget: any,
    contentData: any,
    options: ContentDeliveryOptions
  ): Promise<any> {
    const baseUrl = process.env.WIDGET_BASE_URL || 'https://widget.storyslip.com';
    const canonical = `${baseUrl}/widgets/${widget.id}`;
    
    const meta = {
      title: widget.meta_title || widget.title || 'StorySlip Widget',
      description: widget.meta_description || widget.description || 'Content powered by StorySlip',
      canonical,
      ogTitle: widget.meta_title || widget.title || 'StorySlip Widget',
      ogDescription: widget.meta_description || widget.description || 'Content powered by StorySlip',
      ogImage: contentData.items[0]?.featured_image_url || null,
    };

    // Generate structured data for SEO
    if (contentData.items.length > 0) {
      meta.structuredData = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': widget.title || 'Content List',
        'description': widget.description || 'Content powered by StorySlip',
        'numberOfItems': contentData.total,
        'itemListElement': contentData.items.slice(0, 10).map((item: any, index: number) => ({
          '@type': 'ListItem',
          'position': index + 1,
          'item': {
            '@type': 'Article',
            'headline': item.title,
            'description': item.excerpt,
            'url': `/${item.slug}`,
            'datePublished': item.published_at || item.created_at,
            'author': item.author ? {
              '@type': 'Person',
              'name': item.author.name
            } : undefined,
            'image': item.featured_image_url || undefined,
          }
        }))
      };
    }

    return meta;
  }

  /**
   * Cache management methods
   */
  private generateCacheKey(widgetId: string, options: ContentDeliveryOptions): string {
    const keyParts = [
      'widget',
      widgetId,
      options.page || 1,
      options.limit || 10,
      options.search || '',
      options.category || '',
      options.tag || '',
      options.sort || '',
    ];
    
    return keyParts.join(':');
  }

  private async getCachedContent(cacheKey: string): Promise<WidgetContentResponse | null> {
    try {
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  private async cacheContent(cacheKey: string, content: WidgetContentResponse): Promise<void> {
    try {
      await redis.setex(cacheKey, this.CACHE_TTL.CONTENT, JSON.stringify(content));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  private async getWidgetConfig(widgetId: string): Promise<any> {
    const cacheKey = `widget_config:${widgetId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    const { data: widget, error } = await supabase
      .from('widget_configurations')
      .select('*')
      .eq('id', widgetId)
      .single();

    if (error || !widget) {
      return null;
    }

    // Cache widget config for 30 minutes
    try {
      await redis.setex(cacheKey, 1800, JSON.stringify(widget));
    } catch (error) {
      console.error('Cache set error:', error);
    }

    return widget;
  }

  private async getCachedBrandConfig(websiteId: string): Promise<any> {
    const cacheKey = `brand_config:${websiteId}`;
    
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    const brandConfig = await brandService.getBrandConfiguration(websiteId);
    
    // Cache brand config for 1 hour
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(brandConfig));
    } catch (error) {
      console.error('Cache set error:', error);
    }

    return brandConfig;
  }

  /**
   * Cache invalidation methods
   */
  async invalidateWidgetCache(widgetId: string): Promise<void> {
    try {
      const pattern = `widget:${widgetId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      // Also invalidate widget config cache
      await redis.del(`widget_config:${widgetId}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  async invalidateBrandCache(websiteId: string): Promise<void> {
    try {
      await redis.del(`brand_config:${websiteId}`);
      
      // Invalidate CSS cache for all widgets of this website
      const pattern = `css:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Utility methods
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  private darkenColor(color: string, percent: number): string {
    // Simple color darkening - in production, use a proper color manipulation library
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) - amt;
      const G = (num >> 8 & 0x00FF) - amt;
      const B = (num & 0x0000FF) - amt;
      return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    return color;
  }

  private minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/;\s*}/g, '}') // Remove semicolon before closing brace
      .replace(/\s*{\s*/g, '{') // Remove spaces around opening brace
      .replace(/;\s*/g, ';') // Remove spaces after semicolon
      .replace(/,\s*/g, ',') // Remove spaces after comma
      .trim();
  }
}

export const widgetContentDeliveryService = new WidgetContentDeliveryService();
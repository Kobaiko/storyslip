import { Request, Response } from 'express';
import { WidgetService } from '../services/widget.service';
import { ContentService } from '../services/content.service';
import { AnalyticsService } from '../services/analytics.service';
import { WidgetBrandingService } from '../services/widget-branding.service';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/monitoring';

interface WidgetRenderRequest extends Request {
  params: {
    widgetId: string;
  };
  query: {
    page?: string;
    search?: string;
    category?: string;
    tag?: string;
    author?: string;
    format?: 'json' | 'html';
  };
}

interface AnalyticsTrackRequest extends Request {
  params: {
    widgetId: string;
  };
  body: {
    widget_id: string;
    type: string;
    url: string;
    referrer?: string;
    user_agent?: string;
    timestamp: string;
  };
}

export class WidgetRenderController {
  /**
   * Render widget for public consumption
   */
  static async renderWidget(req: WidgetRenderRequest, res: Response): Promise<void> {
    try {
      const { widgetId } = req.params;
      const { page = '1', search, category, tag, author, format = 'json' } = req.query;

      // Get widget configuration
      const widget = await WidgetService.getById(widgetId);
      if (!widget) {
        res.status(404).json(errorResponse('Widget not found', 'WIDGET_NOT_FOUND'));
        return;
      }

      // Check if widget is published
      if (!widget.is_published) {
        res.status(404).json(errorResponse('Widget not found', 'WIDGET_NOT_FOUND'));
        return;
      }

      // Get widget branding
      const branding = await WidgetBrandingService.getByWidgetId(widgetId);

      // Build content filters
      const filters = {
        page: parseInt(page),
        limit: widget.settings?.items_per_page || 10,
        search,
        category,
        tag,
        author,
        website_id: widget.website_id,
      };

      // Get content for widget
      const contentResult = await ContentService.getPublishedContent(filters);

      // Generate widget HTML, CSS, and JS
      const widgetData = await this.generateWidgetData(widget, contentResult, branding);

      // Set appropriate cache headers
      res.set({
        'Cache-Control': 'public, max-age=300, s-maxage=600', // 5 min browser, 10 min CDN
        'ETag': `"${widget.id}-${widget.updated_at}"`,
        'Vary': 'Accept, Accept-Encoding',
      });

      // Check if client has cached version
      const clientETag = req.headers['if-none-match'];
      if (clientETag === `"${widget.id}-${widget.updated_at}"`) {
        res.status(304).end();
        return;
      }

      if (format === 'html') {
        // Return complete HTML page for iframe embedding
        const htmlPage = this.generateHTMLPage(widgetData, widget);
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlPage);
      } else {
        // Return JSON for JavaScript integration
        res.json(successResponse(widgetData));
      }

      // Track widget render (async, don't wait)
      this.trackWidgetRender(widgetId, req).catch(error => {
        logger.error('Failed to track widget render:', error);
      });

    } catch (error) {
      logger.error('Widget render error:', error);
      res.status(500).json(errorResponse('Failed to render widget', 'RENDER_ERROR'));
    }
  }

  /**
   * Track widget analytics
   */
  static async trackAnalytics(req: AnalyticsTrackRequest, res: Response): Promise<void> {
    try {
      const { widgetId } = req.params;
      const analyticsData = req.body;

      // Validate widget exists
      const widget = await WidgetService.getById(widgetId);
      if (!widget) {
        res.status(404).json(errorResponse('Widget not found', 'WIDGET_NOT_FOUND'));
        return;
      }

      // Track the analytics event
      await AnalyticsService.trackWidgetEvent({
        widget_id: widgetId,
        event_type: 'view',
        url: analyticsData.url,
        referrer: analyticsData.referrer,
        user_agent: analyticsData.user_agent,
        timestamp: new Date(analyticsData.timestamp),
        metadata: {
          type: analyticsData.type,
        },
      });

      res.json(successResponse({ tracked: true }));

    } catch (error) {
      logger.error('Analytics tracking error:', error);
      res.status(500).json(errorResponse('Failed to track analytics', 'TRACKING_ERROR'));
    }
  }

  /**
   * Generate widget data (HTML, CSS, JS)
   */
  private static async generateWidgetData(
    widget: any,
    contentResult: any,
    branding: any
  ): Promise<{
    html: string;
    css: string;
    js: string;
    metadata: {
      title: string;
      description: string;
      canonical_url?: string;
      og_tags: Record<string, string>;
      structured_data: any;
    };
  }> {
    const { content, pagination } = contentResult;
    const settings = widget.settings || {};
    const theme = settings.theme || 'modern';
    const layout = settings.layout || 'grid';

    // Generate HTML
    const html = this.generateHTML(content, widget, layout, pagination);

    // Generate CSS with branding
    const css = this.generateCSS(theme, branding, settings);

    // Generate JavaScript
    const js = this.generateJS(widget, settings);

    // Generate metadata
    const metadata = this.generateMetadata(widget, content);

    return { html, css, js, metadata };
  }

  /**
   * Generate widget HTML
   */
  private static generateHTML(
    content: any[],
    widget: any,
    layout: string,
    pagination: any
  ): string {
    const settings = widget.settings || {};
    const showTitle = settings.show_title !== false;
    const showDescription = settings.show_description !== false;
    const showAuthor = settings.show_author !== false;
    const showDate = settings.show_date !== false;
    const showExcerpt = settings.show_excerpt !== false;

    let html = '<div class="storyslip-widget" data-layout="' + layout + '">';

    // Widget header
    if (widget.title && showTitle) {
      html += '<div class="storyslip-header">';
      html += '<h2 class="storyslip-title">' + this.escapeHtml(widget.title) + '</h2>';
      if (widget.description && showDescription) {
        html += '<p class="storyslip-description">' + this.escapeHtml(widget.description) + '</p>';
      }
      html += '</div>';
    }

    // Content container
    html += '<div class="storyslip-content storyslip-' + layout + '">';

    if (content.length === 0) {
      html += '<div class="storyslip-empty">No content available</div>';
    } else {
      content.forEach((item: any) => {
        html += '<article class="storyslip-item">';
        
        // Featured image
        if (item.featured_image && settings.show_images !== false) {
          html += '<div class="storyslip-image">';
          html += '<img src="' + this.escapeHtml(item.featured_image) + '" alt="' + this.escapeHtml(item.title) + '" loading="lazy">';
          html += '</div>';
        }

        // Content
        html += '<div class="storyslip-item-content">';
        
        // Title
        html += '<h3 class="storyslip-item-title">';
        if (item.canonical_url) {
          html += '<a href="' + this.escapeHtml(item.canonical_url) + '" target="_blank" rel="noopener">';
          html += this.escapeHtml(item.title);
          html += '</a>';
        } else {
          html += this.escapeHtml(item.title);
        }
        html += '</h3>';

        // Meta information
        if (showAuthor || showDate) {
          html += '<div class="storyslip-meta">';
          if (showAuthor && item.author_name) {
            html += '<span class="storyslip-author">By ' + this.escapeHtml(item.author_name) + '</span>';
          }
          if (showDate && item.published_at) {
            const date = new Date(item.published_at).toLocaleDateString();
            html += '<span class="storyslip-date">' + date + '</span>';
          }
          html += '</div>';
        }

        // Excerpt
        if (showExcerpt && item.excerpt) {
          html += '<div class="storyslip-excerpt">' + this.escapeHtml(item.excerpt) + '</div>';
        }

        // Tags
        if (item.tags && item.tags.length > 0 && settings.show_tags !== false) {
          html += '<div class="storyslip-tags">';
          item.tags.forEach((tag: any) => {
            html += '<span class="storyslip-tag">' + this.escapeHtml(tag.name) + '</span>';
          });
          html += '</div>';
        }

        html += '</div>'; // item-content
        html += '</article>';
      });
    }

    html += '</div>'; // content

    // Pagination
    if (pagination && pagination.total_pages > 1 && settings.show_pagination !== false) {
      html += '<div class="storyslip-pagination">';
      
      if (pagination.current_page > 1) {
        html += '<button class="storyslip-page-btn" data-page="' + (pagination.current_page - 1) + '">Previous</button>';
      }
      
      // Page numbers (show max 5 pages)
      const startPage = Math.max(1, pagination.current_page - 2);
      const endPage = Math.min(pagination.total_pages, startPage + 4);
      
      for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === pagination.current_page ? ' storyslip-active' : '';
        html += '<button class="storyslip-page-btn' + activeClass + '" data-page="' + i + '">' + i + '</button>';
      }
      
      if (pagination.current_page < pagination.total_pages) {
        html += '<button class="storyslip-page-btn" data-page="' + (pagination.current_page + 1) + '">Next</button>';
      }
      
      html += '</div>';
    }

    // Powered by (if not white-labeled)
    if (!widget.hide_branding) {
      html += '<div class="storyslip-powered-by">';
      html += '<a href="https://storyslip.com" target="_blank" rel="noopener">Powered by StorySlip</a>';
      html += '</div>';
    }

    html += '</div>'; // widget

    return html;
  }

  /**
   * Generate widget CSS
   */
  private static generateCSS(theme: string, branding: any, settings: any): string {
    const colors = branding?.colors || {};
    const fonts = branding?.fonts || {};
    
    // Base CSS
    let css = `
      .storyslip-widget {
        font-family: ${fonts.body || 'system-ui, -apple-system, sans-serif'};
        line-height: 1.6;
        color: ${colors.text || '#333'};
        background: ${colors.background || '#fff'};
        border-radius: 8px;
        overflow: hidden;
      }
      
      .storyslip-header {
        padding: 1.5rem;
        border-bottom: 1px solid ${colors.border || '#e5e7eb'};
      }
      
      .storyslip-title {
        font-family: ${fonts.heading || 'system-ui, -apple-system, sans-serif'};
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
        color: ${colors.primary || '#1f2937'};
      }
      
      .storyslip-description {
        margin: 0;
        color: ${colors.muted || '#6b7280'};
        font-size: 0.875rem;
      }
      
      .storyslip-content {
        padding: 1rem;
      }
      
      .storyslip-grid {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }
      
      .storyslip-list {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      
      .storyslip-carousel {
        display: flex;
        gap: 1rem;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        padding-bottom: 1rem;
      }
      
      .storyslip-carousel .storyslip-item {
        flex: 0 0 280px;
        scroll-snap-align: start;
      }
      
      .storyslip-item {
        background: ${colors.card || '#fff'};
        border: 1px solid ${colors.border || '#e5e7eb'};
        border-radius: 8px;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .storyslip-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      .storyslip-image {
        aspect-ratio: 16/9;
        overflow: hidden;
      }
      
      .storyslip-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .storyslip-item-content {
        padding: 1rem;
      }
      
      .storyslip-item-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 0.5rem 0;
        line-height: 1.4;
      }
      
      .storyslip-item-title a {
        color: ${colors.primary || '#1f2937'};
        text-decoration: none;
      }
      
      .storyslip-item-title a:hover {
        color: ${colors.accent || '#3b82f6'};
      }
      
      .storyslip-meta {
        display: flex;
        gap: 1rem;
        margin-bottom: 0.75rem;
        font-size: 0.75rem;
        color: ${colors.muted || '#6b7280'};
      }
      
      .storyslip-excerpt {
        font-size: 0.875rem;
        line-height: 1.5;
        color: ${colors.text || '#4b5563'};
        margin-bottom: 0.75rem;
      }
      
      .storyslip-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .storyslip-tag {
        background: ${colors.tag || '#f3f4f6'};
        color: ${colors.tagText || '#374151'};
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
      }
      
      .storyslip-pagination {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
        border-top: 1px solid ${colors.border || '#e5e7eb'};
      }
      
      .storyslip-page-btn {
        background: ${colors.button || '#f9fafb'};
        color: ${colors.buttonText || '#374151'};
        border: 1px solid ${colors.border || '#d1d5db'};
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
      }
      
      .storyslip-page-btn:hover {
        background: ${colors.buttonHover || '#f3f4f6'};
      }
      
      .storyslip-page-btn.storyslip-active {
        background: ${colors.accent || '#3b82f6'};
        color: white;
        border-color: ${colors.accent || '#3b82f6'};
      }
      
      .storyslip-empty {
        text-align: center;
        padding: 2rem;
        color: ${colors.muted || '#6b7280'};
        font-style: italic;
      }
      
      .storyslip-powered-by {
        text-align: center;
        padding: 0.75rem;
        border-top: 1px solid ${colors.border || '#e5e7eb'};
        background: ${colors.footer || '#f9fafb'};
      }
      
      .storyslip-powered-by a {
        color: ${colors.muted || '#6b7280'};
        text-decoration: none;
        font-size: 0.75rem;
      }
      
      .storyslip-powered-by a:hover {
        color: ${colors.accent || '#3b82f6'};
      }
      
      /* Responsive design */
      @media (max-width: 640px) {
        .storyslip-grid {
          grid-template-columns: 1fr;
        }
        
        .storyslip-carousel .storyslip-item {
          flex: 0 0 240px;
        }
        
        .storyslip-meta {
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .storyslip-pagination {
          flex-wrap: wrap;
        }
      }
    `;

    // Theme-specific styles
    if (theme === 'minimal') {
      css += `
        .storyslip-widget {
          border: none;
          background: transparent;
        }
        
        .storyslip-header {
          border-bottom: none;
          padding-bottom: 1rem;
        }
        
        .storyslip-item {
          border: none;
          background: transparent;
          box-shadow: none;
        }
        
        .storyslip-item:hover {
          transform: none;
          box-shadow: none;
        }
      `;
    } else if (theme === 'classic') {
      css += `
        .storyslip-widget {
          border: 2px solid ${colors.border || '#d1d5db'};
          border-radius: 0;
        }
        
        .storyslip-item {
          border-radius: 0;
          border: 1px solid ${colors.border || '#d1d5db'};
        }
        
        .storyslip-page-btn {
          border-radius: 0;
        }
      `;
    }

    return css;
  }

  /**
   * Generate widget JavaScript
   */
  private static generateJS(widget: any, settings: any): string {
    return `
      (function() {
        'use strict';
        
        // Widget configuration
        const widgetConfig = ${JSON.stringify({
          id: widget.id,
          settings: settings,
        })};
        
        // Initialize widget functionality
        function initWidget() {
          const widget = document.querySelector('[data-widget-id="${widget.id}"]');
          if (!widget) return;
          
          // Handle pagination
          const paginationBtns = widget.querySelectorAll('.storyslip-page-btn');
          paginationBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
              e.preventDefault();
              const page = this.getAttribute('data-page');
              loadPage(page);
            });
          });
          
          // Handle search (if search input exists)
          const searchInput = widget.querySelector('.storyslip-search');
          if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', function() {
              clearTimeout(searchTimeout);
              searchTimeout = setTimeout(() => {
                performSearch(this.value);
              }, 300);
            });
          }
          
          // Handle carousel navigation
          if (widget.classList.contains('storyslip-carousel')) {
            setupCarousel(widget);
          }
        }
        
        // Load specific page
        function loadPage(page) {
          const currentUrl = new URL(window.location);
          const widgetUrl = new URL('${process.env.API_URL || 'https://api.storyslip.com'}/api/widgets/public/${widget.id}/render');
          
          // Copy current query parameters
          currentUrl.searchParams.forEach((value, key) => {
            if (key !== 'page') {
              widgetUrl.searchParams.set(key, value);
            }
          });
          
          widgetUrl.searchParams.set('page', page);
          
          // Show loading state
          showLoading();
          
          fetch(widgetUrl.toString())
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                updateWidgetContent(data.data.html);
              } else {
                showError('Failed to load content');
              }
            })
            .catch(error => {
              console.error('Widget load error:', error);
              showError('Failed to load content');
            });
        }
        
        // Perform search
        function performSearch(query) {
          const widgetUrl = new URL('${process.env.API_URL || 'https://api.storyslip.com'}/api/widgets/public/${widget.id}/render');
          widgetUrl.searchParams.set('search', query);
          widgetUrl.searchParams.set('page', '1');
          
          showLoading();
          
          fetch(widgetUrl.toString())
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                updateWidgetContent(data.data.html);
              } else {
                showError('Search failed');
              }
            })
            .catch(error => {
              console.error('Search error:', error);
              showError('Search failed');
            });
        }
        
        // Setup carousel functionality
        function setupCarousel(carousel) {
          const content = carousel.querySelector('.storyslip-content');
          if (!content) return;
          
          let isScrolling = false;
          
          // Add scroll buttons
          const prevBtn = document.createElement('button');
          prevBtn.className = 'storyslip-carousel-btn storyslip-carousel-prev';
          prevBtn.innerHTML = '‹';
          prevBtn.addEventListener('click', () => scrollCarousel(-1));
          
          const nextBtn = document.createElement('button');
          nextBtn.className = 'storyslip-carousel-btn storyslip-carousel-next';
          nextBtn.innerHTML = '›';
          nextBtn.addEventListener('click', () => scrollCarousel(1));
          
          carousel.appendChild(prevBtn);
          carousel.appendChild(nextBtn);
          
          function scrollCarousel(direction) {
            if (isScrolling) return;
            isScrolling = true;
            
            const scrollAmount = 300;
            content.scrollBy({
              left: direction * scrollAmount,
              behavior: 'smooth'
            });
            
            setTimeout(() => {
              isScrolling = false;
            }, 300);
          }
        }
        
        // Update widget content
        function updateWidgetContent(html) {
          const widget = document.querySelector('[data-widget-id="${widget.id}"]');
          if (widget) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.querySelector('.storyslip-widget');
            
            if (newContent) {
              widget.innerHTML = newContent.innerHTML;
              initWidget(); // Re-initialize after content update
            }
          }
        }
        
        // Show loading state
        function showLoading() {
          const widget = document.querySelector('[data-widget-id="${widget.id}"]');
          if (widget) {
            const content = widget.querySelector('.storyslip-content');
            if (content) {
              content.style.opacity = '0.5';
              content.style.pointerEvents = 'none';
            }
          }
        }
        
        // Show error message
        function showError(message) {
          const widget = document.querySelector('[data-widget-id="${widget.id}"]');
          if (widget) {
            const content = widget.querySelector('.storyslip-content');
            if (content) {
              content.innerHTML = '<div class="storyslip-error">' + message + '</div>';
              content.style.opacity = '1';
              content.style.pointerEvents = 'auto';
            }
          }
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initWidget);
        } else {
          initWidget();
        }
        
        // Expose global functions for external use
        window.StorySlipWidget = window.StorySlipWidget || {};
        window.StorySlipWidget.reload = function(widgetId) {
          if (widgetId === '${widget.id}') {
            loadPage('1');
          }
        };
        
      })();
    `;
  }

  /**
   * Generate SEO metadata
   */
  private static generateMetadata(widget: any, content: any[]): {
    title: string;
    description: string;
    canonical_url?: string;
    og_tags: Record<string, string>;
    structured_data: any;
  } {
    const title = widget.title || 'Content Widget';
    const description = widget.description || 'Latest content updates';
    
    const og_tags: Record<string, string> = {
      'og:title': title,
      'og:description': description,
      'og:type': 'website',
    };

    // Add featured image from first content item
    if (content.length > 0 && content[0].featured_image) {
      og_tags['og:image'] = content[0].featured_image;
    }

    // Generate structured data
    const structured_data = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': title,
      'description': description,
      'numberOfItems': content.length,
      'itemListElement': content.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'item': {
          '@type': 'Article',
          'headline': item.title,
          'description': item.excerpt,
          'author': item.author_name ? {
            '@type': 'Person',
            'name': item.author_name,
          } : undefined,
          'datePublished': item.published_at,
          'url': item.canonical_url,
          'image': item.featured_image,
        },
      })),
    };

    return {
      title,
      description,
      canonical_url: widget.canonical_url,
      og_tags,
      structured_data,
    };
  }

  /**
   * Generate complete HTML page for iframe embedding
   */
  private static generateHTMLPage(widgetData: any, widget: any): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(widgetData.metadata.title)}</title>
  <meta name="description" content="${this.escapeHtml(widgetData.metadata.description)}">
  
  <!-- Open Graph tags -->
  ${Object.entries(widgetData.metadata.og_tags).map(([property, content]) => 
    `<meta property="${property}" content="${this.escapeHtml(content)}">`
  ).join('\n  ')}
  
  <!-- Structured data -->
  <script type="application/ld+json">
    ${JSON.stringify(widgetData.metadata.structured_data)}
  </script>
  
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, sans-serif;
    }
    ${widgetData.css}
  </style>
</head>
<body>
  ${widgetData.html}
  
  <script>
    ${widgetData.js}
  </script>
</body>
</html>`;
  }

  /**
   * Track widget render for analytics
   */
  private static async trackWidgetRender(widgetId: string, req: Request): Promise<void> {
    try {
      await AnalyticsService.trackWidgetEvent({
        widget_id: widgetId,
        event_type: 'render',
        url: req.headers.referer || 'direct',
        user_agent: req.headers['user-agent'],
        ip_address: req.ip,
        timestamp: new Date(),
        metadata: {
          format: req.query.format || 'json',
          page: req.query.page || '1',
        },
      });
    } catch (error) {
      // Don't throw - analytics failures shouldn't break widget rendering
      logger.error('Failed to track widget render:', error);
    }
  }

  /**
   * Get widget delivery script
   */
  static async getWidgetScript(req: Request, res: Response): Promise<void> {
    try {
      // Read the delivery script from our widget package
      const fs = require('fs');
      const path = require('path');
      
      // In production, this would be served from CDN
      const scriptPath = path.join(__dirname, '../../../widget/src/delivery.ts');
      
      // For now, serve the compiled JavaScript version
      const deliveryScript = `
        // StorySlip Widget Delivery Script v1.0.0
        // This script provides the global StorySlipWidget API
        
        ${fs.readFileSync(require.resolve('../../widget/src/delivery'), 'utf8')}
        
        // Auto-initialize widgets on page load
        document.addEventListener('DOMContentLoaded', function() {
          // Find all widget containers and auto-load them
          const containers = document.querySelectorAll('[data-storyslip-widget]');
          containers.forEach(container => {
            const widgetId = container.getAttribute('data-widget-id');
            const type = container.getAttribute('data-widget-type') || 'content';
            const layout = container.getAttribute('data-widget-layout') || 'grid';
            const theme = container.getAttribute('data-widget-theme') || 'modern';
            
            if (widgetId && container.id) {
              StorySlipWidget.load({
                widgetId: widgetId,
                containerId: container.id,
                type: type,
                layout: layout,
                theme: theme,
              });
            }
          });
        });
      `;

      res.send(deliveryScript);

    } catch (error) {
      logger.error('Widget script delivery error:', error);
      res.status(500).send('// Error loading widget script');
    }
  }

  /**
   * Get widget embed code
   */
  static async getEmbedCode(req: Request, res: Response): Promise<void> {
    try {
      const { widgetId } = req.params;
      const { type = 'javascript' } = req.query as { type?: string };

      // Get widget configuration
      const widget = await WidgetService.getById(widgetId);
      if (!widget) {
        res.status(404).json(errorResponse('Widget not found', 'WIDGET_NOT_FOUND'));
        return;
      }

      // Check if widget is published
      if (!widget.is_published) {
        res.status(404).json(errorResponse('Widget not found', 'WIDGET_NOT_FOUND'));
        return;
      }

      const baseUrl = process.env.API_URL || 'https://api.storyslip.com';
      const widgetUrl = `${baseUrl}/api/widgets/public/${widgetId}/render`;
      
      let embedCode = '';
      let previewUrl = '';

      switch (type) {
        case 'javascript':
          embedCode = `<!-- StorySlip Widget -->
<div id="storyslip-widget-${widgetId}" 
     data-storyslip-widget 
     data-widget-id="${widgetId}" 
     data-widget-type="${widget.type || 'content'}"
     data-widget-layout="${widget.settings?.layout || 'grid'}"
     data-widget-theme="${widget.settings?.theme || 'modern'}">
  Loading...
</div>
<script src="${baseUrl}/api/widgets/script.js" async></script>`;
          previewUrl = widgetUrl;
          break;

        case 'iframe':
          const iframeUrl = `${widgetUrl}?format=html`;
          embedCode = `<!-- StorySlip Widget (iframe) -->
<iframe src="${iframeUrl}" 
        width="100%" 
        height="400" 
        frameborder="0" 
        scrolling="auto"
        title="${this.escapeHtml(widget.title || 'Content Widget')}"
        loading="lazy">
</iframe>`;
          previewUrl = iframeUrl;
          break;

        case 'amp':
          embedCode = `<!-- StorySlip Widget (AMP) -->
<amp-iframe src="${widgetUrl}?format=html"
            width="100%"
            height="400"
            layout="responsive"
            sandbox="allow-scripts allow-same-origin"
            frameborder="0">
  <div placeholder>Loading widget...</div>
</amp-iframe>`;
          previewUrl = `${widgetUrl}?format=html`;
          break;

        default:
          res.status(400).json(errorResponse('Invalid embed type', 'INVALID_EMBED_TYPE'));
          return;
      }

      res.json(successResponse({
        embed_code: embedCode,
        preview_url: previewUrl,
        widget_id: widgetId,
        type: type,
      }));

    } catch (error) {
      logger.error('Embed code generation error:', error);
      res.status(500).json(errorResponse('Failed to generate embed code', 'EMBED_ERROR'));
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private static escapeHtml(text: string): string {
    if (typeof text !== 'string') return '';
    
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
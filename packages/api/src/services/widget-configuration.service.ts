import { supabase } from '../config/supabase';
import { DatabaseResult } from '../types/database';

export interface WidgetConfiguration {
  id: string;
  website_id: string;
  name: string;
  type: 'blog_hub' | 'content_list' | 'featured_posts' | 'category_grid' | 'search_widget';
  layout: 'grid' | 'list' | 'masonry' | 'carousel' | 'magazine';
  theme: 'modern' | 'minimal' | 'classic' | 'magazine' | 'dark' | 'custom';
  settings: WidgetSettings;
  styling: WidgetStyling;
  content_filters: ContentFilters;
  seo_settings: SEOSettings;
  performance_settings: PerformanceSettings;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  embed_code?: string;
  preview_url?: string;
}

export interface WidgetSettings {
  // Display settings
  posts_per_page: number;
  show_excerpts: boolean;
  excerpt_length: number;
  show_author: boolean;
  show_date: boolean;
  show_categories: boolean;
  show_tags: boolean;
  show_read_time: boolean;
  show_featured_image: boolean;
  
  // Navigation settings
  enable_pagination: boolean;
  enable_infinite_scroll: boolean;
  enable_search: boolean;
  enable_filtering: boolean;
  enable_sorting: boolean;
  
  // Blog hub specific settings
  show_hero_section: boolean;
  hero_post_id?: string;
  show_category_navigation: boolean;
  show_tag_cloud: boolean;
  show_archive_links: boolean;
  show_recent_posts: boolean;
  recent_posts_count: number;
  
  // Interactive features
  enable_comments: boolean;
  enable_social_sharing: boolean;
  enable_bookmarking: boolean;
  enable_print_view: boolean;
  
  // Content organization
  group_by_category: boolean;
  sticky_featured_posts: boolean;
  show_post_count: boolean;
}

export interface WidgetStyling {
  // Layout styling
  container_width: string;
  container_padding: string;
  grid_columns: number;
  grid_gap: string;
  
  // Typography
  font_family: string;
  heading_font_size: string;
  body_font_size: string;
  line_height: string;
  
  // Colors
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  border_color: string;
  hover_color: string;
  
  // Card styling
  card_background: string;
  card_border_radius: string;
  card_shadow: string;
  card_padding: string;
  
  // Button styling
  button_style: 'solid' | 'outline' | 'ghost';
  button_color: string;
  button_hover_color: string;
  
  // Custom CSS
  custom_css?: string;
}

export interface ContentFilters {
  // Content selection
  include_categories: string[];
  exclude_categories: string[];
  include_tags: string[];
  exclude_tags: string[];
  include_authors: string[];
  exclude_authors: string[];
  
  // Status filters
  published_only: boolean;
  featured_only: boolean;
  
  // Date filters
  date_range_start?: string;
  date_range_end?: string;
  
  // Content type filters
  content_types: string[];
  
  // Sorting
  sort_by: 'date' | 'title' | 'author' | 'category' | 'views' | 'custom';
  sort_order: 'asc' | 'desc';
}

export interface SEOSettings {
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_card: 'summary' | 'summary_large_image';
  structured_data_enabled: boolean;
  sitemap_included: boolean;
}

export interface PerformanceSettings {
  enable_caching: boolean;
  cache_duration: number; // in seconds
  enable_lazy_loading: boolean;
  image_optimization: boolean;
  enable_compression: boolean;
  preload_next_page: boolean;
  cdn_enabled: boolean;
}

export interface WidgetAnalytics {
  widget_id: string;
  views: number;
  clicks: number;
  engagement_rate: number;
  bounce_rate: number;
  average_time_on_page: number;
  popular_posts: Array<{
    post_id: string;
    title: string;
    views: number;
    clicks: number;
  }>;
  traffic_sources: Record<string, number>;
  device_breakdown: Record<string, number>;
  geographic_data: Record<string, number>;
}

export class WidgetConfigurationService {
  /**
   * Create a new widget configuration
   */
  static async createWidget(
    websiteId: string,
    userId: string,
    widgetData: Omit<WidgetConfiguration, 'id' | 'created_at' | 'updated_at' | 'embed_code' | 'preview_url'>
  ): Promise<DatabaseResult<WidgetConfiguration>> {
    try {
      // Verify user has permission to create widgets for this website
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select(`
          id,
          website_members!inner(user_id, role)
        `)
        .eq('id', websiteId)
        .eq('website_members.user_id', userId)
        .single();

      if (websiteError || !website) {
        return { data: null, error: new Error('Website not found or access denied') };
      }

      const userRole = website.website_members[0]?.role;
      if (!['owner', 'admin', 'editor'].includes(userRole)) {
        return { data: null, error: new Error('Insufficient permissions to create widgets') };
      }

      // Generate embed code and preview URL
      const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const embedCode = this.generateEmbedCode(widgetId, widgetData);
      const previewUrl = this.generatePreviewUrl(widgetId);

      // Create widget configuration
      const { data: widget, error } = await supabase
        .from('widget_configurations')
        .insert({
          id: widgetId,
          website_id: websiteId,
          name: widgetData.name,
          type: widgetData.type,
          layout: widgetData.layout,
          theme: widgetData.theme,
          settings: widgetData.settings,
          styling: widgetData.styling,
          content_filters: widgetData.content_filters,
          seo_settings: widgetData.seo_settings,
          performance_settings: widgetData.performance_settings,
          is_active: widgetData.is_active,
          embed_code: embedCode,
          preview_url: previewUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      // Create initial analytics record
      await this.initializeWidgetAnalytics(widgetId);

      return { data: widget, error: null };
    } catch (error) {
      console.error('Error creating widget:', error);
      return { data: null, error };
    }
  }

  /**
   * Update widget configuration
   */
  static async updateWidget(
    widgetId: string,
    userId: string,
    updates: Partial<WidgetConfiguration>
  ): Promise<DatabaseResult<WidgetConfiguration>> {
    try {
      // Verify user has permission to update this widget
      const { data: widget, error: widgetError } = await supabase
        .from('widget_configurations')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', widgetId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (widgetError || !widget) {
        return { data: null, error: new Error('Widget not found or access denied') };
      }

      const userRole = widget.website.website_members[0]?.role;
      if (!['owner', 'admin', 'editor'].includes(userRole)) {
        return { data: null, error: new Error('Insufficient permissions to update widget') };
      }

      // Update embed code if configuration changed
      let embedCode = widget.embed_code;
      if (updates.type || updates.layout || updates.theme || updates.settings || updates.styling) {
        embedCode = this.generateEmbedCode(widgetId, { ...widget, ...updates });
      }

      // Update widget
      const { data: updatedWidget, error } = await supabase
        .from('widget_configurations')
        .update({
          ...updates,
          embed_code: embedCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', widgetId)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: updatedWidget, error: null };
    } catch (error) {
      console.error('Error updating widget:', error);
      return { data: null, error };
    }
  }

  /**
   * Get widget configuration
   */
  static async getWidget(
    widgetId: string,
    userId?: string
  ): Promise<DatabaseResult<WidgetConfiguration>> {
    try {
      let query = supabase
        .from('widget_configurations')
        .select('*')
        .eq('id', widgetId);

      // If userId provided, verify access
      if (userId) {
        query = query.select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `).eq('website.website_members.user_id', userId);
      }

      const { data: widget, error } = await query.single();

      if (error) {
        return { data: null, error };
      }

      return { data: widget, error: null };
    } catch (error) {
      console.error('Error getting widget:', error);
      return { data: null, error };
    }
  }

  /**
   * List widgets for a website
   */
  static async listWidgets(
    websiteId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      active_only?: boolean;
    } = {}
  ): Promise<DatabaseResult<WidgetConfiguration[]>> {
    try {
      const { limit = 50, offset = 0, type, active_only = false } = options;

      // Verify user has access to this website
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select(`
          id,
          website_members!inner(user_id, role)
        `)
        .eq('id', websiteId)
        .eq('website_members.user_id', userId)
        .single();

      if (websiteError || !website) {
        return { data: null, error: new Error('Website not found or access denied') };
      }

      let query = supabase
        .from('widget_configurations')
        .select('*')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq('type', type);
      }

      if (active_only) {
        query = query.eq('is_active', true);
      }

      const { data: widgets, error } = await query;

      if (error) {
        return { data: null, error };
      }

      return { data: widgets || [], error: null };
    } catch (error) {
      console.error('Error listing widgets:', error);
      return { data: null, error };
    }
  }

  /**
   * Delete widget configuration
   */
  static async deleteWidget(
    widgetId: string,
    userId: string
  ): Promise<DatabaseResult<{ deleted: boolean }>> {
    try {
      // Verify user has permission to delete this widget
      const { data: widget, error: widgetError } = await supabase
        .from('widget_configurations')
        .select(`
          *,
          website:websites!inner(
            id,
            website_members!inner(user_id, role)
          )
        `)
        .eq('id', widgetId)
        .eq('website.website_members.user_id', userId)
        .single();

      if (widgetError || !widget) {
        return { data: null, error: new Error('Widget not found or access denied') };
      }

      const userRole = widget.website.website_members[0]?.role;
      if (!['owner', 'admin'].includes(userRole)) {
        return { data: null, error: new Error('Insufficient permissions to delete widget') };
      }

      // Delete widget and related data
      const { error: deleteError } = await supabase
        .from('widget_configurations')
        .delete()
        .eq('id', widgetId);

      if (deleteError) {
        return { data: null, error: deleteError };
      }

      // Clean up analytics data
      await supabase
        .from('widget_analytics')
        .delete()
        .eq('widget_id', widgetId);

      return { data: { deleted: true }, error: null };
    } catch (error) {
      console.error('Error deleting widget:', error);
      return { data: null, error };
    }
  }

  /**
   * Generate widget preview
   */
  static async generatePreview(
    widgetId: string,
    userId: string
  ): Promise<DatabaseResult<{ html: string; css: string; js: string }>> {
    try {
      const widgetResult = await this.getWidget(widgetId, userId);
      if (widgetResult.error || !widgetResult.data) {
        return { data: null, error: widgetResult.error || new Error('Widget not found') };
      }

      const widget = widgetResult.data;

      // Generate preview HTML, CSS, and JS
      const html = await this.generateWidgetHTML(widget);
      const css = await this.generateWidgetCSS(widget);
      const js = await this.generateWidgetJS(widget);

      return {
        data: { html, css, js },
        error: null,
      };
    } catch (error) {
      console.error('Error generating preview:', error);
      return { data: null, error };
    }
  }

  /**
   * Get widget analytics
   */
  static async getWidgetAnalytics(
    widgetId: string,
    userId: string,
    dateRange: { start: string; end: string }
  ): Promise<DatabaseResult<WidgetAnalytics>> {
    try {
      // Verify user has access to this widget
      const widgetResult = await this.getWidget(widgetId, userId);
      if (widgetResult.error || !widgetResult.data) {
        return { data: null, error: widgetResult.error || new Error('Widget not found') };
      }

      // Get analytics data
      const { data: analytics, error } = await supabase
        .from('widget_analytics')
        .select('*')
        .eq('widget_id', widgetId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);

      if (error) {
        return { data: null, error };
      }

      // Aggregate analytics data
      const aggregatedAnalytics = this.aggregateAnalytics(analytics || []);

      return { data: aggregatedAnalytics, error: null };
    } catch (error) {
      console.error('Error getting widget analytics:', error);
      return { data: null, error };
    }
  }

  /**
   * Generate embed code for widget
   */
  private static generateEmbedCode(widgetId: string, widget: any): string {
    const baseUrl = process.env.WIDGET_BASE_URL || 'https://widgets.storyslip.com';
    
    return `<div id="storyslip-widget-${widgetId}"></div>
<script>
(function() {
  var script = document.createElement('script');
  script.src = '${baseUrl}/widget.js';
  script.async = true;
  script.onload = function() {
    StorySlipWidget.init({
      widgetId: '${widgetId}',
      containerId: 'storyslip-widget-${widgetId}',
      type: '${widget.type}',
      layout: '${widget.layout}',
      theme: '${widget.theme}'
    });
  };
  document.head.appendChild(script);
})();
</script>`;
  }

  /**
   * Generate preview URL for widget
   */
  private static generatePreviewUrl(widgetId: string): string {
    const baseUrl = process.env.WIDGET_BASE_URL || 'https://widgets.storyslip.com';
    return `${baseUrl}/preview/${widgetId}`;
  }

  /**
   * Initialize analytics for new widget
   */
  private static async initializeWidgetAnalytics(widgetId: string): Promise<void> {
    try {
      await supabase
        .from('widget_analytics')
        .insert({
          widget_id: widgetId,
          date: new Date().toISOString().split('T')[0],
          views: 0,
          clicks: 0,
          engagement_rate: 0,
          bounce_rate: 0,
          average_time_on_page: 0,
          popular_posts: [],
          traffic_sources: {},
          device_breakdown: {},
          geographic_data: {},
        });
    } catch (error) {
      console.error('Error initializing widget analytics:', error);
    }
  }

  /**
   * Generate widget HTML
   */
  private static async generateWidgetHTML(widget: WidgetConfiguration): Promise<string> {
    // This would generate the actual HTML based on widget configuration
    // For now, returning a placeholder
    return `
      <div class="storyslip-widget storyslip-${widget.type} storyslip-${widget.theme}">
        <div class="widget-container">
          ${widget.type === 'blog_hub' ? this.generateBlogHubHTML(widget) : ''}
          ${widget.type === 'content_list' ? this.generateContentListHTML(widget) : ''}
          ${widget.type === 'featured_posts' ? this.generateFeaturedPostsHTML(widget) : ''}
        </div>
      </div>
    `;
  }

  /**
   * Generate blog hub HTML
   */
  private static generateBlogHubHTML(widget: WidgetConfiguration): string {
    const settings = widget.settings;
    
    return `
      ${settings.show_hero_section ? '<div class="blog-hero"></div>' : ''}
      ${settings.enable_search ? '<div class="blog-search"></div>' : ''}
      ${settings.show_category_navigation ? '<nav class="category-nav"></nav>' : ''}
      <main class="blog-content">
        <div class="posts-grid"></div>
        ${settings.enable_pagination ? '<div class="pagination"></div>' : ''}
      </main>
      <aside class="blog-sidebar">
        ${settings.show_recent_posts ? '<div class="recent-posts"></div>' : ''}
        ${settings.show_tag_cloud ? '<div class="tag-cloud"></div>' : ''}
        ${settings.show_archive_links ? '<div class="archive-links"></div>' : ''}
      </aside>
    `;
  }

  /**
   * Generate content list HTML
   */
  private static generateContentListHTML(widget: WidgetConfiguration): string {
    return `
      <div class="content-list">
        <div class="content-items"></div>
      </div>
    `;
  }

  /**
   * Generate featured posts HTML
   */
  private static generateFeaturedPostsHTML(widget: WidgetConfiguration): string {
    return `
      <div class="featured-posts">
        <div class="featured-items"></div>
      </div>
    `;
  }

  /**
   * Generate widget CSS
   */
  private static async generateWidgetCSS(widget: WidgetConfiguration): Promise<string> {
    const styling = widget.styling;
    
    return `
      .storyslip-widget {
        font-family: ${styling.font_family};
        color: ${styling.text_color};
        background-color: ${styling.background_color};
      }
      
      .widget-container {
        max-width: ${styling.container_width};
        padding: ${styling.container_padding};
      }
      
      .posts-grid {
        display: grid;
        grid-template-columns: repeat(${styling.grid_columns}, 1fr);
        gap: ${styling.grid_gap};
      }
      
      .post-card {
        background: ${styling.card_background};
        border-radius: ${styling.card_border_radius};
        box-shadow: ${styling.card_shadow};
        padding: ${styling.card_padding};
      }
      
      ${styling.custom_css || ''}
    `;
  }

  /**
   * Generate widget JavaScript
   */
  private static async generateWidgetJS(widget: WidgetConfiguration): Promise<string> {
    return `
      // Widget initialization and functionality
      (function() {
        const widget = {
          id: '${widget.id}',
          type: '${widget.type}',
          settings: ${JSON.stringify(widget.settings)},
          
          init: function() {
            this.loadContent();
            this.bindEvents();
          },
          
          loadContent: function() {
            // Load content based on widget configuration
          },
          
          bindEvents: function() {
            // Bind interactive events
          }
        };
        
        widget.init();
      })();
    `;
  }

  /**
   * Aggregate analytics data
   */
  private static aggregateAnalytics(analyticsData: any[]): WidgetAnalytics {
    // Aggregate the analytics data
    const totalViews = analyticsData.reduce((sum, item) => sum + (item.views || 0), 0);
    const totalClicks = analyticsData.reduce((sum, item) => sum + (item.clicks || 0), 0);
    
    return {
      widget_id: analyticsData[0]?.widget_id || '',
      views: totalViews,
      clicks: totalClicks,
      engagement_rate: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
      bounce_rate: 0, // Calculate based on actual data
      average_time_on_page: 0, // Calculate based on actual data
      popular_posts: [],
      traffic_sources: {},
      device_breakdown: {},
      geographic_data: {},
    };
  }
}

export default WidgetConfigurationService;
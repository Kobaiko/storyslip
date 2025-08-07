import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

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
  posts_per_page: number;
  show_excerpts: boolean;
  excerpt_length: number;
  show_author: boolean;
  show_date: boolean;
  show_categories: boolean;
  show_tags: boolean;
  show_read_time: boolean;
  show_featured_image: boolean;
  enable_pagination: boolean;
  enable_infinite_scroll: boolean;
  enable_search: boolean;
  enable_filtering: boolean;
  enable_sorting: boolean;
  show_hero_section: boolean;
  hero_post_id?: string;
  show_category_navigation: boolean;
  show_tag_cloud: boolean;
  show_archive_links: boolean;
  show_recent_posts: boolean;
  recent_posts_count: number;
  enable_comments: boolean;
  enable_social_sharing: boolean;
  enable_bookmarking: boolean;
  enable_print_view: boolean;
  group_by_category: boolean;
  sticky_featured_posts: boolean;
  show_post_count: boolean;
}

export interface WidgetStyling {
  container_width: string;
  container_padding: string;
  grid_columns: number;
  grid_gap: string;
  font_family: string;
  heading_font_size: string;
  body_font_size: string;
  line_height: string;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  border_color: string;
  hover_color: string;
  card_background: string;
  card_border_radius: string;
  card_shadow: string;
  card_padding: string;
  button_style: 'solid' | 'outline' | 'ghost';
  button_color: string;
  button_hover_color: string;
  custom_css?: string;
}

export interface ContentFilters {
  include_categories: string[];
  exclude_categories: string[];
  include_tags: string[];
  exclude_tags: string[];
  include_authors: string[];
  exclude_authors: string[];
  published_only: boolean;
  featured_only: boolean;
  date_range_start?: string;
  date_range_end?: string;
  content_types: string[];
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
  cache_duration: number;
  enable_lazy_loading: boolean;
  image_optimization: boolean;
  enable_compression: boolean;
  preload_next_page: boolean;
  cdn_enabled: boolean;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  layout: string;
  theme: string;
  preview_image: string;
  is_premium: boolean;
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

export function useWidgets(websiteId: string) {
  const queryClient = useQueryClient();

  const {
    data: widgets,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['widgets', websiteId],
    queryFn: async () => {
      const response = await api.get(`/widgets/websites/${websiteId}`);
      return response.data.data as WidgetConfiguration[];
    },
    enabled: !!websiteId,
  });

  const createWidgetMutation = useMutation({
    mutationFn: async (widgetData: Omit<WidgetConfiguration, 'id' | 'created_at' | 'updated_at' | 'embed_code' | 'preview_url'>) => {
      const response = await api.post(`/widgets/websites/${websiteId}`, widgetData);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets', websiteId] });
    },
  });

  const updateWidgetMutation = useMutation({
    mutationFn: async ({ widgetId, updates }: { widgetId: string; updates: Partial<WidgetConfiguration> }) => {
      const response = await api.put(`/widgets/${widgetId}`, updates);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets', websiteId] });
    },
  });

  const deleteWidgetMutation = useMutation({
    mutationFn: async (widgetId: string) => {
      await api.delete(`/widgets/${widgetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets', websiteId] });
    },
  });

  const duplicateWidgetMutation = useMutation({
    mutationFn: async ({ widgetId, name }: { widgetId: string; name: string }) => {
      const response = await api.post(`/widgets/${widgetId}/duplicate`, { name });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets', websiteId] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (widgetId: string) => {
      const response = await api.patch(`/widgets/${widgetId}/toggle-active`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets', websiteId] });
    },
  });

  return {
    widgets: widgets || [],
    isLoading,
    error,
    refetch,
    createWidget: createWidgetMutation.mutateAsync,
    updateWidget: updateWidgetMutation.mutateAsync,
    deleteWidget: deleteWidgetMutation.mutateAsync,
    duplicateWidget: duplicateWidgetMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    isCreating: createWidgetMutation.isPending,
    isUpdating: updateWidgetMutation.isPending,
    isDeleting: deleteWidgetMutation.isPending,
    isDuplicating: duplicateWidgetMutation.isPending,
    isToggling: toggleActiveMutation.isPending,
  };
}

export function useWidget(widgetId: string) {
  const queryClient = useQueryClient();

  const {
    data: widget,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['widget', widgetId],
    queryFn: async () => {
      const response = await api.get(`/widgets/${widgetId}`);
      return response.data.data as WidgetConfiguration;
    },
    enabled: !!widgetId,
  });

  const generatePreviewMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get(`/widgets/${widgetId}/preview`);
      return response.data.data;
    },
  });

  const getEmbedCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get(`/widgets/${widgetId}/embed`);
      return response.data.data;
    },
  });

  return {
    widget,
    isLoading,
    error,
    refetch,
    generatePreview: generatePreviewMutation.mutateAsync,
    getEmbedCode: getEmbedCodeMutation.mutateAsync,
    isGeneratingPreview: generatePreviewMutation.isPending,
    isGettingEmbedCode: getEmbedCodeMutation.isPending,
  };
}

export function useWidgetTemplates() {
  const {
    data: templates,
    isLoading,
    error
  } = useQuery({
    queryKey: ['widget-templates'],
    queryFn: async () => {
      const response = await api.get('/widgets/templates');
      return response.data.data as WidgetTemplate[];
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async ({ 
      websiteId, 
      templateId, 
      name, 
      customizations 
    }: { 
      websiteId: string; 
      templateId: string; 
      name: string; 
      customizations?: any 
    }) => {
      const response = await api.post(`/widgets/websites/${websiteId}/templates/${templateId}`, {
        name,
        customizations,
      });
      return response.data.data;
    },
  });

  return {
    templates: templates || [],
    isLoading,
    error,
    createFromTemplate: createFromTemplateMutation.mutateAsync,
    isCreatingFromTemplate: createFromTemplateMutation.isPending,
  };
}

export function useWidgetAnalytics(widgetId: string, dateRange: { start: string; end: string }) {
  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['widget-analytics', widgetId, dateRange],
    queryFn: async () => {
      const response = await api.get(`/widgets/${widgetId}/analytics`, {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
      });
      return response.data.data as WidgetAnalytics;
    },
    enabled: !!widgetId && !!dateRange.start && !!dateRange.end,
  });

  return {
    analytics,
    isLoading,
    error,
    refetch,
  };
}
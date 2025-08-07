import React, { useState } from 'react';
import { X, Sparkles, Palette, Settings, Code, Eye } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';
import { useWidgets, useWidgetTemplates, WidgetTemplate } from '../../hooks/useWidgets';

interface WidgetCreationModalProps {
  websiteId: string;
  templates: WidgetTemplate[];
  onClose: () => void;
}

export const WidgetCreationModal: React.FC<WidgetCreationModalProps> = ({
  websiteId,
  templates,
  onClose,
}) => {
  const { createWidget, isCreating } = useWidgets(websiteId);
  const { createFromTemplate, isCreatingFromTemplate } = useWidgetTemplates();
  
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);
  const [widgetName, setWidgetName] = useState('');
  const [customWidget, setCustomWidget] = useState({
    name: '',
    type: 'blog_hub' as const,
    layout: 'grid' as const,
    theme: 'modern' as const,
  });

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !widgetName) return;

    try {
      await createFromTemplate({
        websiteId,
        templateId: selectedTemplate.id,
        name: widgetName,
      });
      onClose();
    } catch (error) {
      console.error('Error creating widget from template:', error);
    }
  };

  const handleCreateCustomWidget = async () => {
    if (!customWidget.name) return;

    try {
      await createWidget({
        website_id: websiteId,
        name: customWidget.name,
        type: customWidget.type,
        layout: customWidget.layout,
        theme: customWidget.theme,
        settings: getDefaultSettings(customWidget.type),
        styling: getDefaultStyling(customWidget.theme),
        content_filters: getDefaultFilters(),
        seo_settings: getDefaultSEO(),
        performance_settings: getDefaultPerformance(),
        is_active: true,
      });
      onClose();
    } catch (error) {
      console.error('Error creating custom widget:', error);
    }
  };

  const getDefaultSettings = (type: string) => {
    const baseSettings = {
      posts_per_page: 12,
      show_excerpts: true,
      excerpt_length: 150,
      show_author: true,
      show_date: true,
      show_categories: true,
      show_tags: false,
      show_read_time: false,
      show_featured_image: true,
      enable_pagination: true,
      enable_infinite_scroll: false,
      enable_search: true,
      enable_filtering: true,
      enable_sorting: true,
      show_hero_section: false,
      show_category_navigation: true,
      show_tag_cloud: false,
      show_archive_links: false,
      show_recent_posts: true,
      recent_posts_count: 5,
      enable_comments: false,
      enable_social_sharing: true,
      enable_bookmarking: false,
      enable_print_view: false,
      group_by_category: false,
      sticky_featured_posts: false,
      show_post_count: false,
    };

    if (type === 'blog_hub') {
      return {
        ...baseSettings,
        show_hero_section: true,
        show_category_navigation: true,
        show_recent_posts: true,
        enable_search: true,
      };
    }

    return baseSettings;
  };

  const getDefaultStyling = (theme: string) => {
    const baseStyles = {
      container_width: '1200px',
      container_padding: '1rem',
      grid_columns: 3,
      grid_gap: '2rem',
      font_family: 'system-ui, sans-serif',
      heading_font_size: '1.5rem',
      body_font_size: '1rem',
      line_height: '1.6',
      card_border_radius: '12px',
      card_shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      card_padding: '1.5rem',
      button_style: 'solid' as const,
    };

    switch (theme) {
      case 'modern':
        return {
          ...baseStyles,
          primary_color: '#3b82f6',
          secondary_color: '#64748b',
          text_color: '#1f2937',
          background_color: '#ffffff',
          border_color: '#e5e7eb',
          hover_color: '#2563eb',
          card_background: '#ffffff',
          button_color: '#3b82f6',
          button_hover_color: '#2563eb',
        };
      case 'minimal':
        return {
          ...baseStyles,
          primary_color: '#1f2937',
          secondary_color: '#6b7280',
          text_color: '#111827',
          background_color: '#ffffff',
          border_color: '#f3f4f6',
          hover_color: '#374151',
          card_background: '#ffffff',
          button_color: '#1f2937',
          button_hover_color: '#374151',
          card_shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        };
      case 'dark':
        return {
          ...baseStyles,
          primary_color: '#60a5fa',
          secondary_color: '#9ca3af',
          text_color: '#f9fafb',
          background_color: '#111827',
          border_color: '#374151',
          hover_color: '#3b82f6',
          card_background: '#1f2937',
          button_color: '#60a5fa',
          button_hover_color: '#3b82f6',
        };
      default:
        return {
          ...baseStyles,
          primary_color: '#3b82f6',
          secondary_color: '#64748b',
          text_color: '#1f2937',
          background_color: '#ffffff',
          border_color: '#e5e7eb',
          hover_color: '#2563eb',
          card_background: '#ffffff',
          button_color: '#3b82f6',
          button_hover_color: '#2563eb',
        };
    }
  };

  const getDefaultFilters = () => ({
    include_categories: [],
    exclude_categories: [],
    include_tags: [],
    exclude_tags: [],
    include_authors: [],
    exclude_authors: [],
    published_only: true,
    featured_only: false,
    content_types: ['post'],
    sort_by: 'date' as const,
    sort_order: 'desc' as const,
  });

  const getDefaultSEO = () => ({
    twitter_card: 'summary' as const,
    structured_data_enabled: true,
    sitemap_included: true,
  });

  const getDefaultPerformance = () => ({
    enable_caching: true,
    cache_duration: 300,
    enable_lazy_loading: true,
    image_optimization: true,
    enable_compression: true,
    preload_next_page: false,
    cdn_enabled: false,
  });

  const getTemplatesByCategory = () => {
    const categories = templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    }, {} as Record<string, WidgetTemplate[]>);

    return categories;
  };

  const templateCategories = getTemplatesByCategory();

  const tabs = [
    { id: 'templates', label: 'Templates', icon: Sparkles },
    { id: 'custom', label: 'Custom', icon: Settings },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Create New Widget"
      size="xl"
    >
      <div className="p-6">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="mt-6">
          {activeTab === 'templates' ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose a Template</h3>
                <p className="text-gray-600 mb-6">
                  Start with a pre-designed template and customize it to match your needs.
                </p>

                {Object.entries(templateCategories).map(([category, categoryTemplates]) => (
                  <div key={category} className="mb-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryTemplates.map((template) => (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplate(template)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selectedTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="text-2xl">
                              {template.type === 'blog_hub' && '🏠'}
                              {template.type === 'content_list' && '📝'}
                              {template.type === 'featured_posts' && '⭐'}
                              {template.type === 'category_grid' && '📂'}
                              {template.type === 'search_widget' && '🔍'}
                            </div>
                            {template.is_premium && (
                              <Badge variant="warning" size="sm">Premium</Badge>
                            )}
                          </div>
                          <h5 className="font-semibold text-gray-900 mb-2">{template.name}</h5>
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="capitalize">{template.layout}</span>
                            <span>•</span>
                            <span className="capitalize">{template.theme}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {selectedTemplate && (
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Widget Name</h4>
                  <input
                    type="text"
                    placeholder="Enter widget name..."
                    value={widgetName}
                    onChange={(e) => setWidgetName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Custom Widget</h3>
                <p className="text-gray-600 mb-6">
                  Build a widget from scratch with your preferred settings.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Widget Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter widget name..."
                      value={customWidget.name}
                      onChange={(e) => setCustomWidget({ ...customWidget, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Widget Type
                    </label>
                    <select
                      value={customWidget.type}
                      onChange={(e) => setCustomWidget({ ...customWidget, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="blog_hub">🏠 Blog Hub - Complete blog page with navigation</option>
                      <option value="content_list">📝 Content List - Simple list of posts</option>
                      <option value="featured_posts">⭐ Featured Posts - Showcase featured content</option>
                      <option value="category_grid">📂 Category Grid - Organize by categories</option>
                      <option value="search_widget">🔍 Search Widget - Search functionality</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Layout
                      </label>
                      <select
                        value={customWidget.layout}
                        onChange={(e) => setCustomWidget({ ...customWidget, layout: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="grid">Grid</option>
                        <option value="list">List</option>
                        <option value="masonry">Masonry</option>
                        <option value="carousel">Carousel</option>
                        <option value="magazine">Magazine</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={customWidget.theme}
                        onChange={(e) => setCustomWidget({ ...customWidget, theme: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="modern">Modern</option>
                        <option value="minimal">Minimal</option>
                        <option value="classic">Classic</option>
                        <option value="magazine">Magazine</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {activeTab === 'templates' ? (
              <Button
                onClick={handleCreateFromTemplate}
                disabled={!selectedTemplate || !widgetName || isCreatingFromTemplate}
                className="flex items-center gap-2"
              >
                {isCreatingFromTemplate ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create from Template
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleCreateCustomWidget}
                disabled={!customWidget.name || isCreating}
                className="flex items-center gap-2"
              >
                {isCreating ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Settings className="w-4 h-4" />
                    Create Custom Widget
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
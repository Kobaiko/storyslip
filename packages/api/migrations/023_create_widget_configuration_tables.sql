-- Create widget configurations table
CREATE TABLE IF NOT EXISTS widget_configurations (
  id VARCHAR(255) PRIMARY KEY,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('blog_hub', 'content_list', 'featured_posts', 'category_grid', 'search_widget')),
  layout VARCHAR(50) NOT NULL CHECK (layout IN ('grid', 'list', 'masonry', 'carousel', 'magazine')),
  theme VARCHAR(50) NOT NULL CHECK (theme IN ('modern', 'minimal', 'classic', 'magazine', 'dark', 'custom')),
  settings JSONB NOT NULL DEFAULT '{}',
  styling JSONB NOT NULL DEFAULT '{}',
  content_filters JSONB NOT NULL DEFAULT '{}',
  seo_settings JSONB NOT NULL DEFAULT '{}',
  performance_settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  embed_code TEXT,
  preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for widget configurations
CREATE INDEX IF NOT EXISTS idx_widget_configurations_website_id ON widget_configurations(website_id);
CREATE INDEX IF NOT EXISTS idx_widget_configurations_type ON widget_configurations(type);
CREATE INDEX IF NOT EXISTS idx_widget_configurations_active ON widget_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_widget_configurations_created_at ON widget_configurations(created_at DESC);

-- Create widget analytics table
CREATE TABLE IF NOT EXISTS widget_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id VARCHAR(255) NOT NULL REFERENCES widget_configurations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  average_time_on_page INTEGER DEFAULT 0, -- in seconds
  popular_posts JSONB DEFAULT '[]',
  traffic_sources JSONB DEFAULT '{}',
  device_breakdown JSONB DEFAULT '{}',
  geographic_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique analytics per widget per date
  UNIQUE(widget_id, date)
);

-- Create indexes for widget analytics
CREATE INDEX IF NOT EXISTS idx_widget_analytics_widget_id ON widget_analytics(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_date ON widget_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_views ON widget_analytics(views DESC);

-- Create widget themes table for custom themes
CREATE TABLE IF NOT EXISTS widget_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  css_variables JSONB NOT NULL DEFAULT '{}',
  custom_css TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique theme names per website
  UNIQUE(website_id, name)
);

-- Create indexes for widget themes
CREATE INDEX IF NOT EXISTS idx_widget_themes_website_id ON widget_themes(website_id);
CREATE INDEX IF NOT EXISTS idx_widget_themes_default ON widget_themes(is_default);

-- Create widget templates table for pre-built configurations
CREATE TABLE IF NOT EXISTS widget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  layout VARCHAR(50) NOT NULL,
  theme VARCHAR(50) NOT NULL,
  default_settings JSONB NOT NULL DEFAULT '{}',
  default_styling JSONB NOT NULL DEFAULT '{}',
  preview_image TEXT,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for widget templates
CREATE INDEX IF NOT EXISTS idx_widget_templates_category ON widget_templates(category);
CREATE INDEX IF NOT EXISTS idx_widget_templates_type ON widget_templates(type);
CREATE INDEX IF NOT EXISTS idx_widget_templates_premium ON widget_templates(is_premium);

-- Create widget versions table for version control
CREATE TABLE IF NOT EXISTS widget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id VARCHAR(255) NOT NULL REFERENCES widget_configurations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  configuration JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique version numbers per widget
  UNIQUE(widget_id, version_number)
);

-- Create indexes for widget versions
CREATE INDEX IF NOT EXISTS idx_widget_versions_widget_id ON widget_versions(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_versions_version ON widget_versions(widget_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_widget_versions_created_by ON widget_versions(created_by);

-- Create widget performance metrics table
CREATE TABLE IF NOT EXISTS widget_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id VARCHAR(255) NOT NULL REFERENCES widget_configurations(id) ON DELETE CASCADE,
  metric_date TIMESTAMP WITH TIME ZONE NOT NULL,
  load_time_ms INTEGER,
  first_contentful_paint_ms INTEGER,
  largest_contentful_paint_ms INTEGER,
  cumulative_layout_shift DECIMAL(4,3),
  first_input_delay_ms INTEGER,
  total_blocking_time_ms INTEGER,
  page_size_kb INTEGER,
  requests_count INTEGER,
  cache_hit_rate DECIMAL(5,2),
  error_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for widget performance metrics
CREATE INDEX IF NOT EXISTS idx_widget_performance_widget_id ON widget_performance_metrics(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_performance_date ON widget_performance_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_widget_performance_load_time ON widget_performance_metrics(load_time_ms);

-- Create function to automatically create widget version on update
CREATE OR REPLACE FUNCTION create_widget_version_on_update()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Only create version if configuration actually changed
  IF OLD.settings != NEW.settings OR 
     OLD.styling != NEW.styling OR 
     OLD.content_filters != NEW.content_filters OR
     OLD.seo_settings != NEW.seo_settings OR
     OLD.performance_settings != NEW.performance_settings THEN
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM widget_versions
    WHERE widget_id = NEW.id;
    
    -- Create new version
    INSERT INTO widget_versions (
      widget_id,
      version_number,
      configuration,
      change_summary,
      created_by
    ) VALUES (
      NEW.id,
      next_version,
      jsonb_build_object(
        'settings', NEW.settings,
        'styling', NEW.styling,
        'content_filters', NEW.content_filters,
        'seo_settings', NEW.seo_settings,
        'performance_settings', NEW.performance_settings
      ),
      'Configuration updated',
      NEW.website_id -- This should be updated to track actual user
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create version on update
DROP TRIGGER IF EXISTS trigger_create_widget_version_on_update ON widget_configurations;
CREATE TRIGGER trigger_create_widget_version_on_update
  AFTER UPDATE ON widget_configurations
  FOR EACH ROW
  EXECUTE FUNCTION create_widget_version_on_update();

-- Create function to update widget analytics
CREATE OR REPLACE FUNCTION update_widget_analytics(
  p_widget_id VARCHAR(255),
  p_metric_type VARCHAR(50),
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO widget_analytics (widget_id, date, views, clicks)
  VALUES (p_widget_id, CURRENT_DATE, 
    CASE WHEN p_metric_type = 'view' THEN p_increment ELSE 0 END,
    CASE WHEN p_metric_type = 'click' THEN p_increment ELSE 0 END
  )
  ON CONFLICT (widget_id, date)
  DO UPDATE SET
    views = widget_analytics.views + CASE WHEN p_metric_type = 'view' THEN p_increment ELSE 0 END,
    clicks = widget_analytics.clicks + CASE WHEN p_metric_type = 'click' THEN p_increment ELSE 0 END,
    engagement_rate = CASE 
      WHEN widget_analytics.views + CASE WHEN p_metric_type = 'view' THEN p_increment ELSE 0 END > 0 
      THEN ((widget_analytics.clicks + CASE WHEN p_metric_type = 'click' THEN p_increment ELSE 0 END)::DECIMAL / 
            (widget_analytics.views + CASE WHEN p_metric_type = 'view' THEN p_increment ELSE 0 END)) * 100
      ELSE 0 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert default widget templates
INSERT INTO widget_templates (name, description, category, type, layout, theme, default_settings, default_styling, is_premium) VALUES
('Modern Blog Hub', 'A modern, clean blog hub with grid layout and search functionality', 'Blog', 'blog_hub', 'grid', 'modern', 
 '{"posts_per_page": 12, "show_excerpts": true, "excerpt_length": 150, "show_author": true, "show_date": true, "show_categories": true, "enable_search": true, "enable_filtering": true, "show_hero_section": true, "show_category_navigation": true, "show_recent_posts": true, "recent_posts_count": 5}',
 '{"container_width": "1200px", "grid_columns": 3, "grid_gap": "2rem", "primary_color": "#3b82f6", "card_border_radius": "12px", "card_shadow": "0 4px 6px -1px rgba(0, 0, 0, 0.1)"}',
 false),

('Minimal Content List', 'A clean, minimal list view for blog posts', 'Blog', 'content_list', 'list', 'minimal',
 '{"posts_per_page": 10, "show_excerpts": true, "excerpt_length": 200, "show_author": true, "show_date": true, "enable_pagination": true}',
 '{"container_width": "800px", "primary_color": "#1f2937", "font_family": "system-ui, sans-serif"}',
 false),

('Magazine Style Hub', 'A magazine-style blog hub with featured posts and categories', 'Blog', 'blog_hub', 'magazine', 'magazine',
 '{"posts_per_page": 15, "show_excerpts": true, "show_featured_image": true, "show_hero_section": true, "hero_post_id": null, "show_category_navigation": true, "sticky_featured_posts": true, "group_by_category": true}',
 '{"container_width": "1400px", "grid_columns": 4, "primary_color": "#dc2626", "secondary_color": "#fbbf24"}',
 true),

('Featured Posts Carousel', 'A carousel widget for showcasing featured blog posts', 'Featured', 'featured_posts', 'carousel', 'modern',
 '{"posts_per_page": 5, "show_excerpts": true, "show_featured_image": true, "enable_social_sharing": true}',
 '{"container_width": "100%", "card_border_radius": "8px", "primary_color": "#10b981"}',
 false),

('Category Grid', 'A grid layout for organizing posts by categories', 'Organization', 'category_grid', 'grid', 'modern',
 '{"posts_per_page": 20, "group_by_category": true, "show_post_count": true, "show_categories": true}',
 '{"grid_columns": 2, "grid_gap": "1.5rem", "primary_color": "#8b5cf6"}',
 false);

-- Create RLS policies for widget configurations
ALTER TABLE widget_configurations ENABLE ROW LEVEL SECURITY;

-- Users can view widgets for websites they have access to
CREATE POLICY "Users can view widgets for accessible websites" ON widget_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      JOIN website_members wm ON w.id = wm.website_id
      WHERE w.id = widget_configurations.website_id
      AND wm.user_id = auth.uid()
    )
  );

-- Users can create widgets for websites they can edit
CREATE POLICY "Users can create widgets for editable websites" ON widget_configurations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites w
      JOIN website_members wm ON w.id = wm.website_id
      WHERE w.id = widget_configurations.website_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Users can update widgets for websites they can edit
CREATE POLICY "Users can update widgets for editable websites" ON widget_configurations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      JOIN website_members wm ON w.id = wm.website_id
      WHERE w.id = widget_configurations.website_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Users can delete widgets for websites they own or admin
CREATE POLICY "Users can delete widgets for owned websites" ON widget_configurations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      JOIN website_members wm ON w.id = wm.website_id
      WHERE w.id = widget_configurations.website_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Create RLS policies for widget analytics
ALTER TABLE widget_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view analytics for widgets they have access to
CREATE POLICY "Users can view analytics for accessible widgets" ON widget_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM widget_configurations wc
      JOIN websites w ON wc.website_id = w.id
      JOIN website_members wm ON w.id = wm.website_id
      WHERE wc.id = widget_analytics.widget_id
      AND wm.user_id = auth.uid()
    )
  );

-- Create RLS policies for widget themes
ALTER TABLE widget_themes ENABLE ROW LEVEL SECURITY;

-- Users can manage themes for their websites
CREATE POLICY "Users can manage themes for their websites" ON widget_themes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM websites w
      JOIN website_members wm ON w.id = wm.website_id
      WHERE w.id = widget_themes.website_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Widget templates are publicly readable
ALTER TABLE widget_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Widget templates are publicly readable" ON widget_templates
  FOR SELECT
  USING (true);

-- Create RLS policies for widget versions
ALTER TABLE widget_versions ENABLE ROW LEVEL SECURITY;

-- Users can view versions for widgets they have access to
CREATE POLICY "Users can view versions for accessible widgets" ON widget_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM widget_configurations wc
      JOIN websites w ON wc.website_id = w.id
      JOIN website_members wm ON w.id = wm.website_id
      WHERE wc.id = widget_versions.widget_id
      AND wm.user_id = auth.uid()
    )
  );

-- Add comments for documentation
COMMENT ON TABLE widget_configurations IS 'Stores widget configuration and settings';
COMMENT ON TABLE widget_analytics IS 'Tracks widget performance and usage analytics';
COMMENT ON TABLE widget_themes IS 'Custom themes for widgets';
COMMENT ON TABLE widget_templates IS 'Pre-built widget templates';
COMMENT ON TABLE widget_versions IS 'Version history for widget configurations';
COMMENT ON TABLE widget_performance_metrics IS 'Performance metrics for widgets';

COMMENT ON COLUMN widget_configurations.type IS 'Type of widget: blog_hub, content_list, featured_posts, category_grid, search_widget';
COMMENT ON COLUMN widget_configurations.layout IS 'Layout style: grid, list, masonry, carousel, magazine';
COMMENT ON COLUMN widget_configurations.theme IS 'Theme: modern, minimal, classic, magazine, dark, custom';
COMMENT ON COLUMN widget_configurations.settings IS 'Widget-specific settings and configuration';
COMMENT ON COLUMN widget_configurations.styling IS 'Visual styling and appearance settings';
COMMENT ON COLUMN widget_configurations.content_filters IS 'Filters for content selection and display';
COMMENT ON COLUMN widget_configurations.embed_code IS 'Generated embed code for the widget';
COMMENT ON COLUMN widget_configurations.preview_url IS 'URL for widget preview';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_widget_configurations_website_type ON widget_configurations(website_id, type);
CREATE INDEX IF NOT EXISTS idx_widget_configurations_active_created ON widget_configurations(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_widget_analytics_widget_date ON widget_analytics(widget_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_widget_performance_widget_date ON widget_performance_metrics(widget_id, metric_date DESC);
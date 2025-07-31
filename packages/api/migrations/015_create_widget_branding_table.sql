-- Migration: Create widget branding configuration table
-- Description: Extends white-labeling with widget-specific branding options

-- Create widget branding configurations table
CREATE TABLE IF NOT EXISTS widget_branding_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Theme Configuration
  theme VARCHAR(10) DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  
  -- Visual Configuration
  border_radius INTEGER DEFAULT 8 CHECK (border_radius >= 0 AND border_radius <= 50),
  shadow_level VARCHAR(10) DEFAULT 'md' CHECK (shadow_level IN ('none', 'sm', 'md', 'lg', 'xl')),
  animation VARCHAR(10) DEFAULT 'fade' CHECK (animation IN ('none', 'fade', 'slide', 'scale')),
  position VARCHAR(20) DEFAULT 'bottom-right' CHECK (position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center')),
  
  -- Branding Options
  show_branding BOOLEAN DEFAULT TRUE,
  custom_css TEXT,
  
  -- Responsive and Accessibility
  mobile_optimized BOOLEAN DEFAULT TRUE,
  rtl_support BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(website_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_branding_configs_website_id ON widget_branding_configs(website_id);
CREATE INDEX IF NOT EXISTS idx_widget_branding_configs_theme ON widget_branding_configs(theme);
CREATE INDEX IF NOT EXISTS idx_widget_branding_configs_show_branding ON widget_branding_configs(show_branding);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_widget_branding_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_widget_branding_configs_updated_at
  BEFORE UPDATE ON widget_branding_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_branding_configs_updated_at();

-- Create default widget branding configurations for existing websites
INSERT INTO widget_branding_configs (website_id)
SELECT id FROM websites 
WHERE id NOT IN (SELECT website_id FROM widget_branding_configs);

-- Row Level Security (RLS) policies
ALTER TABLE widget_branding_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view widget branding configs for websites they have access to
CREATE POLICY widget_branding_configs_select_policy ON widget_branding_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = widget_branding_configs.website_id
      AND (
        w.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM website_users wu
          WHERE wu.website_id = w.id
          AND wu.user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Users can update widget branding configs for websites they have manage_settings permission
CREATE POLICY widget_branding_configs_update_policy ON widget_branding_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = widget_branding_configs.website_id
      AND (
        w.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM website_users wu
          WHERE wu.website_id = w.id
          AND wu.user_id = auth.uid()
          AND wu.role IN ('owner', 'admin')
        )
      )
    )
  );

-- Create function to automatically create widget branding config for new websites
CREATE OR REPLACE FUNCTION create_default_widget_branding_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO widget_branding_configs (website_id)
  VALUES (NEW.id)
  ON CONFLICT (website_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create widget branding config for new websites
DROP TRIGGER IF EXISTS trigger_create_default_widget_branding_config ON websites;
CREATE TRIGGER trigger_create_default_widget_branding_config
  AFTER INSERT ON websites
  FOR EACH ROW
  EXECUTE FUNCTION create_default_widget_branding_config();

-- Add comments for documentation
COMMENT ON TABLE widget_branding_configs IS 'Widget-specific branding and styling configurations';
COMMENT ON COLUMN widget_branding_configs.theme IS 'Widget color theme: light, dark, or auto (follows system preference)';
COMMENT ON COLUMN widget_branding_configs.border_radius IS 'Border radius in pixels (0-50)';
COMMENT ON COLUMN widget_branding_configs.shadow_level IS 'Drop shadow intensity level';
COMMENT ON COLUMN widget_branding_configs.animation IS 'Widget entrance animation type';
COMMENT ON COLUMN widget_branding_configs.position IS 'Default widget position on page';
COMMENT ON COLUMN widget_branding_configs.show_branding IS 'Whether to show StorySlip branding in widget';
COMMENT ON COLUMN widget_branding_configs.custom_css IS 'Custom CSS for widget styling';
COMMENT ON COLUMN widget_branding_configs.mobile_optimized IS 'Enable mobile-specific optimizations';
COMMENT ON COLUMN widget_branding_configs.rtl_support IS 'Enable right-to-left language support';
-- Create brand configuration table for white-labeling

CREATE TABLE IF NOT EXISTS brand_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  
  -- Brand Identity
  brand_name VARCHAR(255),
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Color Scheme
  primary_color VARCHAR(7) DEFAULT '#3b82f6', -- Hex color
  secondary_color VARCHAR(7) DEFAULT '#1e40af',
  accent_color VARCHAR(7) DEFAULT '#10b981',
  background_color VARCHAR(7) DEFAULT '#ffffff',
  text_color VARCHAR(7) DEFAULT '#111827',
  
  -- Typography
  font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
  heading_font_family VARCHAR(100),
  
  -- Custom CSS
  custom_css TEXT,
  
  -- Domain Configuration
  custom_domain VARCHAR(255),
  domain_verified BOOLEAN DEFAULT FALSE,
  ssl_enabled BOOLEAN DEFAULT FALSE,
  
  -- Email Branding
  email_from_name VARCHAR(255),
  email_from_address VARCHAR(255),
  email_header_color VARCHAR(7),
  email_footer_text TEXT,
  
  -- Widget Branding
  widget_theme JSONB DEFAULT '{}',
  
  -- Agency Features
  agency_id UUID REFERENCES users(id) ON DELETE SET NULL,
  white_label_enabled BOOLEAN DEFAULT FALSE,
  hide_storyslip_branding BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_configurations_website_id ON brand_configurations(website_id);
CREATE INDEX IF NOT EXISTS idx_brand_configurations_agency_id ON brand_configurations(agency_id);
CREATE INDEX IF NOT EXISTS idx_brand_configurations_custom_domain ON brand_configurations(custom_domain);
CREATE INDEX IF NOT EXISTS idx_brand_configurations_domain_verified ON brand_configurations(domain_verified);

-- Unique constraint for custom domains
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_configurations_custom_domain_unique 
ON brand_configurations(custom_domain) 
WHERE custom_domain IS NOT NULL AND custom_domain != '';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_brand_configurations_updated_at
  BEFORE UPDATE ON brand_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_configurations_updated_at();

-- Create default brand configuration for existing websites
INSERT INTO brand_configurations (website_id, brand_name)
SELECT id, name FROM websites 
WHERE id NOT IN (SELECT website_id FROM brand_configurations);

-- Create agency brand templates table
CREATE TABLE IF NOT EXISTS agency_brand_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,
  
  -- Template Configuration (same fields as brand_configurations)
  primary_color VARCHAR(7) DEFAULT '#3b82f6',
  secondary_color VARCHAR(7) DEFAULT '#1e40af',
  accent_color VARCHAR(7) DEFAULT '#10b981',
  background_color VARCHAR(7) DEFAULT '#ffffff',
  text_color VARCHAR(7) DEFAULT '#111827',
  font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
  heading_font_family VARCHAR(100),
  custom_css TEXT,
  email_header_color VARCHAR(7),
  email_footer_text TEXT,
  widget_theme JSONB DEFAULT '{}',
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for agency templates
CREATE INDEX IF NOT EXISTS idx_agency_brand_templates_agency_id ON agency_brand_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_brand_templates_active ON agency_brand_templates(is_active);

-- Add trigger for agency templates
CREATE TRIGGER trigger_update_agency_brand_templates_updated_at
  BEFORE UPDATE ON agency_brand_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_configurations_updated_at();
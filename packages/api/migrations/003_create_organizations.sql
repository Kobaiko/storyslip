-- Migration: Create organizations and organization membership tables
-- Description: Creates tables for organization management and user membership

-- Create organization_role enum
DO $$ BEGIN
    CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add organization reference to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique membership per organization
  UNIQUE(organization_id, user_id)
);

-- Update websites table to reference organizations
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

CREATE INDEX IF NOT EXISTS idx_users_current_organization_id ON users(current_organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

CREATE INDEX IF NOT EXISTS idx_websites_organization_id ON websites(organization_id);

-- Create function to generate unique slug
CREATE OR REPLACE FUNCTION generate_organization_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert name to slug format
  base_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure slug is not empty
  IF base_slug = '' THEN
    base_slug := 'organization';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically create organization for new users
CREATE OR REPLACE FUNCTION create_default_organization_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Generate organization name from user's name or email
  org_name := COALESCE(
    NULLIF(trim(NEW.first_name || ' ' || NEW.last_name), ''),
    split_part(NEW.email, '@', 1)
  ) || '''s Organization';
  
  -- Generate unique slug
  org_slug := generate_organization_slug(org_name);
  
  -- Create organization
  INSERT INTO organizations (name, slug, description)
  VALUES (
    org_name,
    org_slug,
    'Default organization for ' || COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email)
  )
  RETURNING id INTO new_org_id;
  
  -- Add user as organization owner
  INSERT INTO organization_members (organization_id, user_id, role, invited_by)
  VALUES (new_org_id, NEW.id, 'owner', NEW.id);
  
  -- Set as current organization
  UPDATE users SET current_organization_id = new_org_id WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic organization creation
DROP TRIGGER IF EXISTS trigger_create_default_organization ON users;
CREATE TRIGGER trigger_create_default_organization
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_organization_for_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_updated_at();

-- Migrate existing websites to have organization_id
-- This will create organizations for existing users who don't have them
DO $$
DECLARE
  website_record RECORD;
  user_org_id UUID;
BEGIN
  FOR website_record IN 
    SELECT w.id as website_id, w.owner_id, u.email, u.first_name, u.last_name
    FROM websites w
    JOIN users u ON u.id = w.owner_id
    WHERE w.organization_id IS NULL
  LOOP
    -- Check if user already has an organization
    SELECT current_organization_id INTO user_org_id
    FROM users 
    WHERE id = website_record.owner_id;
    
    -- If no organization, create one
    IF user_org_id IS NULL THEN
      INSERT INTO organizations (name, slug, description)
      VALUES (
        COALESCE(
          NULLIF(trim(website_record.first_name || ' ' || website_record.last_name), ''),
          split_part(website_record.email, '@', 1)
        ) || '''s Organization',
        generate_organization_slug(
          COALESCE(
            NULLIF(trim(website_record.first_name || ' ' || website_record.last_name), ''),
            split_part(website_record.email, '@', 1)
          ) || '''s Organization'
        ),
        'Organization for ' || website_record.email
      )
      RETURNING id INTO user_org_id;
      
      -- Add user as owner
      INSERT INTO organization_members (organization_id, user_id, role, invited_by)
      VALUES (user_org_id, website_record.owner_id, 'owner', website_record.owner_id);
      
      -- Update user's current organization
      UPDATE users SET current_organization_id = user_org_id WHERE id = website_record.owner_id;
    END IF;
    
    -- Update website to reference organization
    UPDATE websites SET organization_id = user_org_id WHERE id = website_record.website_id;
  END LOOP;
END $$;

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Organizations that own websites and manage teams';
COMMENT ON TABLE organization_members IS 'Organization membership and roles';

COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN organizations.settings IS 'Organization-specific settings and preferences';
COMMENT ON COLUMN organization_members.role IS 'User role within the organization';
COMMENT ON COLUMN organization_members.invited_by IS 'User who invited this member';
COMMENT ON COLUMN users.current_organization_id IS 'Currently active organization for the user';
COMMENT ON COLUMN websites.organization_id IS 'Organization that owns this website';
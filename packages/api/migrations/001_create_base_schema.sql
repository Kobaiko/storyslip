-- Migration: Create base schema for users, profiles, and organizations
-- Description: Creates the foundational tables for user management and organizations

-- Create user_role enum
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'author', 'viewer');

-- Create organization_role enum  
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member');

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL, -- References auth.users.id
  email VARCHAR(255) UNIQUE NOT NULL,
  current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(200),
  avatar_url TEXT,
  bio TEXT,
  phone VARCHAR(20),
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role organization_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique membership per organization
  UNIQUE(organization_id, user_id)
);

-- Create websites table
CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  domain VARCHAR(255),
  api_key VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique slug per organization
  UNIQUE(organization_id, slug)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_current_organization_id ON users(current_organization_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);

CREATE INDEX IF NOT EXISTS idx_websites_organization_id ON websites(organization_id);
CREATE INDEX IF NOT EXISTS idx_websites_owner_id ON websites(owner_id);
CREATE INDEX IF NOT EXISTS idx_websites_slug ON websites(slug);
CREATE INDEX IF NOT EXISTS idx_websites_api_key ON websites(api_key);
CREATE INDEX IF NOT EXISTS idx_websites_is_active ON websites(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY organizations_select_policy ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id IN (
        SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY organizations_insert_policy ON organizations
  FOR INSERT WITH CHECK (true); -- Users can create organizations

CREATE POLICY organizations_update_policy ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id IN (
        SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
      )
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY organizations_delete_policy ON organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
      AND om.user_id IN (
        SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
      )
      AND om.role = 'owner'
    )
  );

-- RLS Policies for users
CREATE POLICY users_select_policy ON users
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id IN (
        SELECT om2.organization_id FROM organization_members om2
        WHERE om2.user_id = users.id
      )
    )
  );

CREATE POLICY users_insert_policy ON users
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY users_update_policy ON users
  FOR UPDATE USING (auth_user_id = auth.uid());

CREATE POLICY users_delete_policy ON users
  FOR DELETE USING (auth_user_id = auth.uid());

-- RLS Policies for user_profiles
CREATE POLICY user_profiles_select_policy ON user_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id IN (
        SELECT om2.organization_id FROM organization_members om2
        WHERE om2.user_id = user_profiles.user_id
      )
    )
  );

CREATE POLICY user_profiles_insert_policy ON user_profiles
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY user_profiles_update_policy ON user_profiles
  FOR UPDATE USING (
    user_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY user_profiles_delete_policy ON user_profiles
  FOR DELETE USING (
    user_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for organization_members
CREATE POLICY organization_members_select_policy ON organization_members
  FOR SELECT USING (
    user_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
    )
  );

CREATE POLICY organization_members_insert_policy ON organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY organization_members_update_policy ON organization_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY organization_members_delete_policy ON organization_members
  FOR DELETE USING (
    user_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for websites
CREATE POLICY websites_select_policy ON websites
  FOR SELECT USING (
    owner_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id = websites.organization_id
    )
  );

CREATE POLICY websites_insert_policy ON websites
  FOR INSERT WITH CHECK (
    owner_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id = websites.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY websites_update_policy ON websites
  FOR UPDATE USING (
    owner_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id = websites.organization_id
      AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY websites_delete_policy ON websites
  FOR DELETE USING (
    owner_id IN (
      SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM organization_members om
      JOIN users u ON u.id = om.user_id
      WHERE u.auth_user_id = auth.uid()
      AND om.organization_id = websites.organization_id
      AND om.role = 'owner'
    )
  );

-- Create functions for automatic user creation and profile setup
CREATE OR REPLACE FUNCTION create_user_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id UUID;
  default_org_id UUID;
BEGIN
  -- Create user record
  INSERT INTO users (auth_user_id, email)
  VALUES (NEW.id, NEW.email)
  RETURNING id INTO new_user_id;
  
  -- Create user profile
  INSERT INTO user_profiles (user_id, display_name)
  VALUES (new_user_id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Create default organization
  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', split_part(NEW.email, '@', 1) || '''s Organization'),
    lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'organization_name', split_part(NEW.email, '@', 1)), '[^a-zA-Z0-9]', '-', 'g'))
  )
  RETURNING id INTO default_org_id;
  
  -- Add user as organization owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (default_org_id, new_user_id, 'owner');
  
  -- Set current organization
  UPDATE users SET current_organization_id = default_org_id WHERE id = new_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_on_signup();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_websites_updated_at
  BEFORE UPDATE ON websites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create helper functions
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  slug VARCHAR(100),
  description TEXT,
  logo_url TEXT,
  role organization_role,
  is_current BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.description,
    o.logo_url,
    om.role,
    (o.id = u.current_organization_id) as is_current
  FROM organizations o
  JOIN organization_members om ON om.organization_id = o.id
  JOIN users u ON u.id = om.user_id
  WHERE u.auth_user_id = user_uuid
  AND o.is_active = true
  ORDER BY is_current DESC, o.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_websites()
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  slug VARCHAR(100),
  description TEXT,
  domain VARCHAR(255),
  organization_name VARCHAR(255),
  role user_role
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.slug,
    w.description,
    w.domain,
    o.name as organization_name,
    CASE 
      WHEN w.owner_id = u.id THEN 'owner'::user_role
      ELSE COALESCE(wu.role, 'viewer'::user_role)
    END as role
  FROM websites w
  JOIN organizations o ON o.id = w.organization_id
  JOIN users u ON u.auth_user_id = auth.uid()
  LEFT JOIN website_users wu ON wu.website_id = w.id AND wu.user_id = u.id
  WHERE (
    w.owner_id = u.id
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = w.organization_id
      AND om.user_id = u.id
    )
  )
  AND w.is_active = true
  ORDER BY w.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION switch_organization(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_id_val UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_id_val FROM users WHERE auth_user_id = auth.uid();
  
  -- Check if user is member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = user_id_val
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Update current organization
  UPDATE users 
  SET current_organization_id = org_id
  WHERE id = user_id_val;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add table comments
COMMENT ON TABLE organizations IS 'Organizations that own websites and manage teams';
COMMENT ON TABLE users IS 'User accounts linked to Supabase auth';
COMMENT ON TABLE user_profiles IS 'Extended user profile information';
COMMENT ON TABLE organization_members IS 'Organization membership and roles';
COMMENT ON TABLE websites IS 'Websites managed by organizations';

-- Add column comments
COMMENT ON COLUMN users.auth_user_id IS 'References auth.users.id from Supabase Auth';
COMMENT ON COLUMN users.current_organization_id IS 'Currently active organization for the user';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether user has completed onboarding flow';
COMMENT ON COLUMN user_profiles.onboarding_step IS 'Current step in onboarding process';
COMMENT ON COLUMN websites.api_key IS 'API key for widget authentication';
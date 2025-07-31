-- Migration: Create team management tables
-- Description: Creates tables for user invitations and website team management

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'author',
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_pending_invitation UNIQUE (email, website_id, accepted_at) DEFERRABLE INITIALLY DEFERRED
);

-- Create website_users table for team management
CREATE TABLE IF NOT EXISTS website_users (
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'author',
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Primary key
  PRIMARY KEY (website_id, user_id),
  
  -- Constraints
  CONSTRAINT no_self_add CHECK (user_id != added_by OR role = 'owner')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_website_id ON user_invitations(website_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_invitations_accepted_at ON user_invitations(accepted_at);

CREATE INDEX IF NOT EXISTS idx_website_users_user_id ON website_users(user_id);
CREATE INDEX IF NOT EXISTS idx_website_users_website_id ON website_users(website_id);
CREATE INDEX IF NOT EXISTS idx_website_users_role ON website_users(role);
CREATE INDEX IF NOT EXISTS idx_website_users_added_by ON website_users(added_by);

-- Row Level Security (RLS) policies

-- Enable RLS on user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for websites they have access to
CREATE POLICY user_invitations_select_policy ON user_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = user_invitations.website_id
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

-- Policy: Users can create invitations for websites they have admin access to
CREATE POLICY user_invitations_insert_policy ON user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = user_invitations.website_id
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
    AND invited_by = auth.uid()
  );

-- Policy: Users can update invitations they created or for websites they own
CREATE POLICY user_invitations_update_policy ON user_invitations
  FOR UPDATE USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = user_invitations.website_id
      AND w.owner_id = auth.uid()
    )
  );

-- Policy: Users can delete invitations they created or for websites they own
CREATE POLICY user_invitations_delete_policy ON user_invitations
  FOR DELETE USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = user_invitations.website_id
      AND w.owner_id = auth.uid()
    )
  );

-- Enable RLS on website_users
ALTER TABLE website_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view team members for websites they have access to
CREATE POLICY website_users_select_policy ON website_users
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_users.website_id
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

-- Policy: Users can add team members to websites they have admin access to
CREATE POLICY website_users_insert_policy ON website_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_users.website_id
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
    AND added_by = auth.uid()
  );

-- Policy: Users can update team member roles for websites they have admin access to
CREATE POLICY website_users_update_policy ON website_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_users.website_id
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
    -- Cannot modify website owner
    AND NOT EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_users.website_id
      AND w.owner_id = website_users.user_id
    )
  );

-- Policy: Users can remove team members from websites they have admin access to
CREATE POLICY website_users_delete_policy ON website_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_users.website_id
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
    -- Cannot remove website owner
    AND NOT EXISTS (
      SELECT 1 FROM websites w
      WHERE w.id = website_users.website_id
      AND w.owner_id = website_users.user_id
    )
  );

-- Create function to automatically add website owner to website_users
CREATE OR REPLACE FUNCTION add_website_owner_to_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO website_users (website_id, user_id, role, added_by, added_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id, NOW())
  ON CONFLICT (website_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add website owner to team
DROP TRIGGER IF EXISTS trigger_add_website_owner_to_team ON websites;
CREATE TRIGGER trigger_add_website_owner_to_team
  AFTER INSERT ON websites
  FOR EACH ROW
  EXECUTE FUNCTION add_website_owner_to_team();

-- Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  DELETE FROM user_invitations
  WHERE expires_at < NOW()
  AND accepted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to prevent duplicate active invitations
CREATE OR REPLACE FUNCTION check_duplicate_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM user_invitations
    WHERE email = NEW.email
    AND website_id = NEW.website_id
    AND accepted_at IS NULL
    AND expires_at > NOW()
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email and website';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate invitations
DROP TRIGGER IF EXISTS trigger_check_duplicate_invitation ON user_invitations;
CREATE TRIGGER trigger_check_duplicate_invitation
  BEFORE INSERT OR UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_invitation();

-- Add comments for documentation
COMMENT ON TABLE user_invitations IS 'Stores email invitations for users to join websites';
COMMENT ON TABLE website_users IS 'Stores team membership information for websites';

COMMENT ON COLUMN user_invitations.token IS 'Secure token for invitation acceptance';
COMMENT ON COLUMN user_invitations.expires_at IS 'Invitation expiration timestamp';
COMMENT ON COLUMN user_invitations.accepted_at IS 'Timestamp when invitation was accepted';

COMMENT ON COLUMN website_users.role IS 'User role within the website team';
COMMENT ON COLUMN website_users.added_by IS 'User who added this team member';
COMMENT ON COLUMN website_users.added_at IS 'Timestamp when user was added to team';
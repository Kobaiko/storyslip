-- Migration: Add profile fields to users table
-- Description: Adds profile-related fields to the existing users table

-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Add comments for documentation
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile picture';
COMMENT ON COLUMN users.bio IS 'User biography/description';
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.timezone IS 'User preferred timezone';
COMMENT ON COLUMN users.language IS 'User preferred language';
COMMENT ON COLUMN users.preferences IS 'User preferences and settings';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed onboarding';
COMMENT ON COLUMN users.onboarding_step IS 'Current onboarding step';
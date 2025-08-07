-- Migration: Create widget API keys tables
-- Description: Add API key management for widget authentication and rate limiting

-- Create widget API keys table
CREATE TABLE IF NOT EXISTS widget_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '["read"]',
    rate_limit INTEGER NOT NULL DEFAULT 1000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER NOT NULL DEFAULT 0
);

-- Create widget API key usage tracking table
CREATE TABLE IF NOT EXISTS widget_api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID NOT NULL REFERENCES widget_api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    response_status INTEGER NOT NULL,
    response_time INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_api_keys_widget_id ON widget_api_keys(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_api_keys_key_hash ON widget_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_widget_api_keys_active ON widget_api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_widget_api_keys_expires ON widget_api_keys(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_widget_api_key_usage_key_id ON widget_api_key_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_widget_api_key_usage_timestamp ON widget_api_key_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_widget_api_key_usage_endpoint ON widget_api_key_usage(endpoint);

-- Create updated_at trigger for widget_api_keys
CREATE OR REPLACE FUNCTION update_widget_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_widget_api_keys_updated_at
    BEFORE UPDATE ON widget_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_widget_api_keys_updated_at();

-- Add RLS policies
ALTER TABLE widget_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_api_key_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage API keys for their own widgets
CREATE POLICY widget_api_keys_user_access ON widget_api_keys
    FOR ALL
    USING (
        widget_id IN (
            SELECT w.id FROM widgets w
            JOIN websites ws ON w.website_id = ws.id
            WHERE ws.user_id = auth.uid()
        )
    );

-- Policy: Users can view usage for their own API keys
CREATE POLICY widget_api_key_usage_user_access ON widget_api_key_usage
    FOR SELECT
    USING (
        key_id IN (
            SELECT ak.id FROM widget_api_keys ak
            JOIN widgets w ON ak.widget_id = w.id
            JOIN websites ws ON w.website_id = ws.id
            WHERE ws.user_id = auth.uid()
        )
    );

-- Policy: System can insert usage records (for API key tracking)
CREATE POLICY widget_api_key_usage_system_insert ON widget_api_key_usage
    FOR INSERT
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE widget_api_keys IS 'API keys for widget authentication and access control';
COMMENT ON TABLE widget_api_key_usage IS 'Usage tracking for widget API keys';

COMMENT ON COLUMN widget_api_keys.key_hash IS 'SHA-256 hash of the API key for secure storage';
COMMENT ON COLUMN widget_api_keys.permissions IS 'JSON array of permissions (read, write, admin)';
COMMENT ON COLUMN widget_api_keys.rate_limit IS 'Maximum requests per hour for this key';
COMMENT ON COLUMN widget_api_keys.usage_count IS 'Total number of times this key has been used';

COMMENT ON COLUMN widget_api_key_usage.endpoint IS 'API endpoint that was accessed';
COMMENT ON COLUMN widget_api_key_usage.response_time IS 'Response time in milliseconds';
COMMENT ON COLUMN widget_api_key_usage.response_status IS 'HTTP response status code';
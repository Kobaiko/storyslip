-- Enhanced Domain Verification System

-- Create domain verification queue table
CREATE TABLE IF NOT EXISTS domain_verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'processed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for domain verification queue
CREATE INDEX IF NOT EXISTS idx_domain_verification_queue_status ON domain_verification_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_domain_verification_queue_website_id ON domain_verification_queue(website_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_queue_domain ON domain_verification_queue(domain);

-- Create domain verification results table
CREATE TABLE IF NOT EXISTS domain_verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  ssl_status VARCHAR(20) DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  records JSONB DEFAULT '[]',
  verification_token VARCHAR(64),
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_check TIMESTAMP WITH TIME ZONE,
  ssl_certificate_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(website_id, domain)
);

-- Create indexes for domain verification results
CREATE INDEX IF NOT EXISTS idx_domain_verification_results_website_id ON domain_verification_results(website_id);
CREATE INDEX IF NOT EXISTS idx_domain_verification_results_domain ON domain_verification_results(domain);
CREATE INDEX IF NOT EXISTS idx_domain_verification_results_verified ON domain_verification_results(verified);
CREATE INDEX IF NOT EXISTS idx_domain_verification_results_next_check ON domain_verification_results(next_check);

-- Create SSL certificate monitoring table
CREATE TABLE IF NOT EXISTS ssl_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL UNIQUE,
  issued_to VARCHAR(255),
  issued_by VARCHAR(255),
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_to TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('valid', 'expired', 'invalid', 'unknown')),
  fingerprint VARCHAR(128),
  certificate_chain TEXT,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for SSL certificates
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_domain ON ssl_certificates(domain);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_status ON ssl_certificates(status);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_valid_to ON ssl_certificates(valid_to);

-- Create domain health monitoring table
CREATE TABLE IF NOT EXISTS domain_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) NOT NULL,
  check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('dns', 'ssl', 'http', 'https')),
  status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for domain health checks
CREATE INDEX IF NOT EXISTS idx_domain_health_checks_domain ON domain_health_checks(domain, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_health_checks_type ON domain_health_checks(check_type, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_health_checks_status ON domain_health_checks(status, checked_at DESC);

-- Create function to clean up old verification queue items
CREATE OR REPLACE FUNCTION cleanup_domain_verification_queue()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete processed items older than 7 days
  DELETE FROM domain_verification_queue
  WHERE status IN ('processed', 'failed')
  AND processed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete failed items with high retry count older than 1 day
  DELETE FROM domain_verification_queue
  WHERE status = 'failed'
  AND retry_count >= 5
  AND created_at < NOW() - INTERVAL '1 day';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get domain verification summary
CREATE OR REPLACE FUNCTION get_domain_verification_summary(website_id_param UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_domains INTEGER;
  verified_domains INTEGER;
  ssl_enabled_domains INTEGER;
  pending_verifications INTEGER;
  failed_verifications INTEGER;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO total_domains
  FROM brand_configurations
  WHERE website_id = website_id_param
  AND custom_domain IS NOT NULL
  AND custom_domain != '';
  
  SELECT COUNT(*) INTO verified_domains
  FROM brand_configurations
  WHERE website_id = website_id_param
  AND domain_verified = TRUE;
  
  SELECT COUNT(*) INTO ssl_enabled_domains
  FROM brand_configurations
  WHERE website_id = website_id_param
  AND ssl_enabled = TRUE;
  
  SELECT COUNT(*) INTO pending_verifications
  FROM domain_verification_queue
  WHERE website_id = website_id_param
  AND status IN ('scheduled', 'processing');
  
  SELECT COUNT(*) INTO failed_verifications
  FROM domain_verification_queue
  WHERE website_id = website_id_param
  AND status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours';
  
  -- Build result JSON
  result := json_build_object(
    'total_domains', total_domains,
    'verified_domains', verified_domains,
    'ssl_enabled_domains', ssl_enabled_domains,
    'pending_verifications', pending_verifications,
    'failed_verifications', failed_verifications,
    'verification_rate', CASE 
      WHEN total_domains > 0 THEN (verified_domains::FLOAT / total_domains * 100)::INTEGER
      ELSE 0
    END,
    'ssl_rate', CASE 
      WHEN verified_domains > 0 THEN (ssl_enabled_domains::FLOAT / verified_domains * 100)::INTEGER
      ELSE 0
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to schedule domain verification
CREATE OR REPLACE FUNCTION schedule_domain_verification(
  website_id_param UUID,
  domain_param VARCHAR(255),
  delay_minutes INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO domain_verification_queue (website_id, domain, scheduled_at)
  VALUES (
    website_id_param,
    domain_param,
    NOW() + (delay_minutes || ' minutes')::INTERVAL
  )
  ON CONFLICT (website_id, domain) DO UPDATE SET
    scheduled_at = NOW() + (delay_minutes || ' minutes')::INTERVAL,
    status = 'scheduled',
    retry_count = domain_verification_queue.retry_count + 1,
    updated_at = NOW()
  RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint to prevent duplicate queue entries
ALTER TABLE domain_verification_queue 
ADD CONSTRAINT unique_website_domain_queue 
UNIQUE (website_id, domain);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_domain_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_domain_verification_queue_updated_at
  BEFORE UPDATE ON domain_verification_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_verification_updated_at();

CREATE TRIGGER trigger_update_domain_verification_results_updated_at
  BEFORE UPDATE ON domain_verification_results
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_verification_updated_at();

CREATE TRIGGER trigger_update_ssl_certificates_updated_at
  BEFORE UPDATE ON ssl_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_domain_verification_updated_at();

-- Create RLS policies
ALTER TABLE domain_verification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssl_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_health_checks ENABLE ROW LEVEL SECURITY;

-- Domain verification queue policies
CREATE POLICY "Users can view their website domain verification queue" ON domain_verification_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM website_users wu
      WHERE wu.website_id = domain_verification_queue.website_id
      AND wu.user_id = auth.uid()
    )
  );

-- Domain verification results policies
CREATE POLICY "Users can view their website domain verification results" ON domain_verification_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM website_users wu
      WHERE wu.website_id = domain_verification_results.website_id
      AND wu.user_id = auth.uid()
    )
  );

-- SSL certificates policies (public read for verified domains)
CREATE POLICY "Public can view SSL certificate info for verified domains" ON ssl_certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brand_configurations bc
      WHERE bc.custom_domain = ssl_certificates.domain
      AND bc.domain_verified = TRUE
    )
  );

-- Domain health checks policies
CREATE POLICY "Users can view domain health checks for their websites" ON domain_health_checks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brand_configurations bc
      JOIN website_users wu ON wu.website_id = bc.website_id
      WHERE bc.custom_domain = domain_health_checks.domain
      AND wu.user_id = auth.uid()
    )
  );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_domain_verification_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION get_domain_verification_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_domain_verification(UUID, VARCHAR(255), INTEGER) TO authenticated;

-- Create view for domain verification overview
CREATE OR REPLACE VIEW domain_verification_overview AS
SELECT 
  bc.website_id,
  bc.custom_domain as domain,
  bc.domain_verified,
  bc.ssl_enabled,
  dvr.verified as verification_confirmed,
  dvr.ssl_status,
  dvr.last_checked,
  dvr.next_check,
  sc.status as ssl_certificate_status,
  sc.valid_to as ssl_expires_at,
  CASE 
    WHEN bc.domain_verified AND bc.ssl_enabled THEN 'active'
    WHEN bc.domain_verified AND NOT bc.ssl_enabled THEN 'verified_no_ssl'
    WHEN NOT bc.domain_verified THEN 'pending_verification'
    ELSE 'unknown'
  END as overall_status
FROM brand_configurations bc
LEFT JOIN domain_verification_results dvr ON dvr.website_id = bc.website_id AND dvr.domain = bc.custom_domain
LEFT JOIN ssl_certificates sc ON sc.domain = bc.custom_domain
WHERE bc.custom_domain IS NOT NULL AND bc.custom_domain != '';

-- Grant access to the view
GRANT SELECT ON domain_verification_overview TO authenticated;
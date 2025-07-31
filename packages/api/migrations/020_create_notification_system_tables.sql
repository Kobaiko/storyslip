-- Email Notification System Tables

-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT TRUE,
  categories JSONB DEFAULT '{
    "system": true,
    "content": true,
    "team": true,
    "analytics": true,
    "security": true
  }',
  frequency JSONB DEFAULT '{
    "immediate": true,
    "daily_digest": false,
    "weekly_summary": true
  }',
  quiet_hours JSONB DEFAULT '{
    "enabled": false,
    "start_time": "22:00",
    "end_time": "08:00",
    "timezone": "UTC"
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, website_id)
);

-- Create indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_website_id ON user_notification_preferences(website_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_email_enabled ON user_notification_preferences(email_enabled);

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('system', 'content', 'team', 'analytics', 'security')),
  trigger_event VARCHAR(255) NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  send_immediately BOOLEAN DEFAULT TRUE,
  delay_minutes INTEGER DEFAULT 0,
  frequency VARCHAR(20) CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly')),
  conditions JSONB DEFAULT '{}',
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE, -- NULL for global templates
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(trigger_event, website_id)
);

-- Create indexes for notification templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_trigger ON notification_templates(trigger_event);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_website_id ON notification_templates(website_id);

-- Create notification digest queue table
CREATE TABLE IF NOT EXISTS notification_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  template_id VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(255) NOT NULL,
  data JSONB DEFAULT '{}',
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notification digest queue
CREATE INDEX IF NOT EXISTS idx_notification_digest_queue_user_id ON notification_digest_queue(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_digest_queue_scheduled ON notification_digest_queue(scheduled_for) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_digest_queue_website_id ON notification_digest_queue(website_id);

-- Create notification history table
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
  template_id VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(255) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'opened', 'clicked')),
  error_message TEXT,
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notification history
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_template ON notification_history(template_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_website_id ON notification_history(website_id);

-- Create email analytics table
CREATE TABLE IF NOT EXISTS email_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notification_history(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for email analytics
CREATE INDEX IF NOT EXISTS idx_email_analytics_notification_id ON email_analytics(notification_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_analytics_event_type ON email_analytics(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_analytics_timestamp ON email_analytics(timestamp DESC);

-- Create notification jobs table for background processing
CREATE TABLE IF NOT EXISTS notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('daily_digest', 'weekly_digest', 'cleanup', 'process_queue')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notification jobs
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status_scheduled ON notification_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_type ON notification_jobs(type, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_created_at ON notification_jobs(created_at DESC);

-- Create function to get notification statistics
CREATE OR REPLACE FUNCTION get_notification_statistics(
  user_id_param UUID DEFAULT NULL,
  website_id_param UUID DEFAULT NULL,
  days_param INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_date TIMESTAMP WITH TIME ZONE;
BEGIN
  start_date := NOW() - (days_param || ' days')::INTERVAL;
  
  SELECT json_build_object(
    'period_days', days_param,
    'total_sent', COUNT(*),
    'success_rate', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'sent')::NUMERIC / COUNT(*) * 100), 2)
        ELSE 0
      END,
    'open_rate',
      CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'sent') > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::NUMERIC / COUNT(*) FILTER (WHERE status = 'sent') * 100), 2)
        ELSE 0
      END,
    'click_rate',
      CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'sent') > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::NUMERIC / COUNT(*) FILTER (WHERE status = 'sent') * 100), 2)
        ELSE 0
      END,
    'by_template', (
      SELECT json_object_agg(template_id, template_stats)
      FROM (
        SELECT 
          template_id,
          json_build_object(
            'sent', COUNT(*),
            'opened', COUNT(*) FILTER (WHERE opened_at IS NOT NULL),
            'clicked', COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)
          ) as template_stats
        FROM notification_history
        WHERE sent_at >= start_date
        AND (user_id_param IS NULL OR user_id = user_id_param)
        AND (website_id_param IS NULL OR website_id = website_id_param)
        GROUP BY template_id
      ) template_breakdown
    ),
    'daily_breakdown', (
      SELECT json_agg(
        json_build_object(
          'date', date,
          'sent', sent_count,
          'opened', opened_count,
          'clicked', clicked_count
        ) ORDER BY date
      )
      FROM (
        SELECT 
          DATE(sent_at) as date,
          COUNT(*) as sent_count,
          COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened_count,
          COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked_count
        FROM notification_history
        WHERE sent_at >= start_date
        AND (user_id_param IS NULL OR user_id = user_id_param)
        AND (website_id_param IS NULL OR website_id = website_id_param)
        GROUP BY DATE(sent_at)
        ORDER BY DATE(sent_at)
      ) daily_stats
    )
  ) INTO result
  FROM notification_history
  WHERE sent_at >= start_date
  AND (user_id_param IS NULL OR user_id = user_id_param)
  AND (website_id_param IS NULL OR website_id = website_id_param);
  
  RETURN COALESCE(result, json_build_object(
    'period_days', days_param,
    'total_sent', 0,
    'success_rate', 0,
    'open_rate', 0,
    'click_rate', 0,
    'by_template', '{}',
    'daily_breakdown', '[]'
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process digest queue
CREATE OR REPLACE FUNCTION process_notification_digest_queue(
  batch_size INTEGER DEFAULT 100
)
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  queue_record RECORD;
BEGIN
  -- Process scheduled notifications
  FOR queue_record IN 
    SELECT * FROM notification_digest_queue
    WHERE scheduled_for IS NOT NULL 
    AND scheduled_for <= NOW()
    AND processed_at IS NULL
    ORDER BY scheduled_for
    LIMIT batch_size
  LOOP
    -- Mark as processed
    UPDATE notification_digest_queue
    SET processed_at = NOW()
    WHERE id = queue_record.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
  history_retention_days INTEGER DEFAULT 90,
  queue_retention_days INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Delete old notification history
  DELETE FROM notification_history
  WHERE sent_at < NOW() - (history_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete old processed digest queue items
  DELETE FROM notification_digest_queue
  WHERE processed_at IS NOT NULL
  AND processed_at < NOW() - (queue_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Delete old email analytics
  DELETE FROM email_analytics
  WHERE timestamp < NOW() - (history_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER trigger_update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- Create view for notification dashboard
CREATE OR REPLACE VIEW notification_dashboard AS
SELECT 
  nh.user_id,
  nh.website_id,
  nh.template_id,
  nh.trigger_event,
  nh.status,
  nh.sent_at,
  nh.opened_at,
  nh.clicked_at,
  CASE 
    WHEN nh.opened_at IS NOT NULL THEN 'opened'
    WHEN nh.clicked_at IS NOT NULL THEN 'clicked'
    WHEN nh.status = 'sent' THEN 'delivered'
    ELSE nh.status
  END as engagement_status,
  u.name as user_name,
  u.email as user_email,
  w.name as website_name
FROM notification_history nh
JOIN users u ON u.id = nh.user_id
LEFT JOIN websites w ON w.id = nh.website_id;

-- Create RLS policies
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_digest_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_jobs ENABLE ROW LEVEL SECURITY;

-- User notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON user_notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Notification templates policies
CREATE POLICY "Users can view global notification templates" ON notification_templates
  FOR SELECT USING (website_id IS NULL);

CREATE POLICY "Website members can manage website notification templates" ON notification_templates
  FOR ALL USING (
    website_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM website_users wu
      WHERE wu.website_id = notification_templates.website_id
      AND wu.user_id = auth.uid()
      AND wu.role IN ('admin', 'editor')
    )
  );

-- Notification digest queue policies
CREATE POLICY "Users can view their own digest queue" ON notification_digest_queue
  FOR SELECT USING (user_id = auth.uid());

-- Notification history policies
CREATE POLICY "Users can view their own notification history" ON notification_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Website admins can view website notification history" ON notification_history
  FOR SELECT USING (
    website_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM website_users wu
      WHERE wu.website_id = notification_history.website_id
      AND wu.user_id = auth.uid()
      AND wu.role = 'admin'
    )
  );

-- Email analytics policies
CREATE POLICY "Users can view analytics for their notifications" ON email_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notification_history nh
      WHERE nh.id = email_analytics.notification_id
      AND nh.user_id = auth.uid()
    )
  );

-- Only system can manage notification jobs (no user access)
CREATE POLICY "System only access to notification jobs" ON notification_jobs
  FOR ALL USING (false);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_notification_statistics(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_notification_digest_queue(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications(INTEGER, INTEGER) TO authenticated;

-- Grant access to the view
GRANT SELECT ON notification_dashboard TO authenticated;

-- Grant access to the service role for background processing
GRANT ALL ON notification_jobs TO service_role;

-- Insert default notification templates
INSERT INTO notification_templates (
  id, name, description, category, trigger_event, subject_template, body_template, variables, is_active, send_immediately
) VALUES 
(
  gen_random_uuid(),
  'Welcome Email',
  'Welcome new users to the platform',
  'system',
  'user.registered',
  'Welcome to {{brand_name || "StorySlip"}}!',
  '<h1>Welcome, {{user_name}}!</h1><p>Thank you for joining {{brand_name || "StorySlip"}}. We''re excited to have you on board!</p>',
  '["user_name", "brand_name", "dashboard_url"]',
  true,
  true
),
(
  gen_random_uuid(),
  'Content Published',
  'Notify when content is published',
  'content',
  'content.published',
  'Your content "{{content_title}}" has been published',
  '<h1>Content Published Successfully!</h1><p>Hi {{user_name}},</p><p>Your content "<strong>{{content_title}}</strong>" has been published.</p>',
  '["user_name", "content_title", "website_name", "content_url"]',
  true,
  true
),
(
  gen_random_uuid(),
  'Team Invitation',
  'Invite users to join a team',
  'team',
  'team.invitation_sent',
  'You''re invited to join {{website_name}}',
  '<h1>You''ve been invited!</h1><p>{{inviter_name}} has invited you to join <strong>{{website_name}}</strong> as a {{role}}.</p>',
  '["inviter_name", "website_name", "role", "invitation_url"]',
  true,
  true
),
(
  gen_random_uuid(),
  'Password Reset',
  'Password reset instructions',
  'security',
  'auth.password_reset_requested',
  'Reset your password',
  '<h1>Reset Your Password</h1><p>Hi {{user_name}},</p><p>Click the button below to reset your password:</p><p><a href="{{reset_url}}">Reset Password</a></p>',
  '["user_name", "reset_url", "expires_at"]',
  true,
  true
)
ON CONFLICT (trigger_event, website_id) DO NOTHING;
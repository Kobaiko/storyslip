-- Widget Performance Monitoring Tables

-- Create widget performance metrics table
CREATE TABLE IF NOT EXISTS widget_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widget_configurations(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  render_time INTEGER NOT NULL, -- milliseconds
  query_time INTEGER NOT NULL, -- milliseconds
  cache_hit BOOLEAN DEFAULT FALSE,
  content_size INTEGER DEFAULT 0, -- bytes
  image_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  user_agent TEXT,
  region VARCHAR(50),
  viewport VARCHAR(20),
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_widget_performance_metrics_widget_id ON widget_performance_metrics(widget_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_widget_performance_metrics_timestamp ON widget_performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_widget_performance_metrics_render_time ON widget_performance_metrics(render_time);
CREATE INDEX IF NOT EXISTS idx_widget_performance_metrics_cache_hit ON widget_performance_metrics(cache_hit);
CREATE INDEX IF NOT EXISTS idx_widget_performance_metrics_region ON widget_performance_metrics(region);
CREATE INDEX IF NOT EXISTS idx_widget_performance_metrics_viewport ON widget_performance_metrics(viewport);

-- Create widget performance alerts table
CREATE TABLE IF NOT EXISTS widget_performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widget_configurations(id) ON DELETE CASCADE,
  max_render_time INTEGER DEFAULT 1000, -- milliseconds
  min_cache_hit_rate DECIMAL(3,2) DEFAULT 0.80, -- 80%
  max_error_rate DECIMAL(3,2) DEFAULT 0.05, -- 5%
  alert_email VARCHAR(255),
  alert_webhook_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(widget_id)
);

-- Create indexes for performance alerts
CREATE INDEX IF NOT EXISTS idx_widget_performance_alerts_widget_id ON widget_performance_alerts(widget_id);
CREATE INDEX IF NOT EXISTS idx_widget_performance_alerts_active ON widget_performance_alerts(is_active);

-- Create widget performance summary table (for faster queries)
CREATE TABLE IF NOT EXISTS widget_performance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widget_configurations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  avg_render_time INTEGER DEFAULT 0,
  p95_render_time INTEGER DEFAULT 0,
  cache_hit_rate DECIMAL(3,2) DEFAULT 0.00,
  error_rate DECIMAL(3,2) DEFAULT 0.00,
  unique_visitors INTEGER DEFAULT 0,
  total_content_size BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(widget_id, date)
);

-- Create indexes for performance summary
CREATE INDEX IF NOT EXISTS idx_widget_performance_summary_widget_id ON widget_performance_summary(widget_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_widget_performance_summary_date ON widget_performance_summary(date DESC);

-- Create widget usage analytics table
CREATE TABLE IF NOT EXISTS widget_usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widget_configurations(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'interaction', 'error'
  event_data JSONB DEFAULT '{}',
  user_session_id VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  page_url TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for usage analytics
CREATE INDEX IF NOT EXISTS idx_widget_usage_analytics_widget_id ON widget_usage_analytics(widget_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_widget_usage_analytics_event_type ON widget_usage_analytics(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_widget_usage_analytics_session ON widget_usage_analytics(user_session_id);
CREATE INDEX IF NOT EXISTS idx_widget_usage_analytics_timestamp ON widget_usage_analytics(timestamp DESC);

-- Create function to calculate daily performance summary
CREATE OR REPLACE FUNCTION calculate_daily_performance_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  widget_record RECORD;
BEGIN
  -- Process each widget for the target date
  FOR widget_record IN 
    SELECT DISTINCT widget_id 
    FROM widget_performance_metrics 
    WHERE DATE(timestamp) = target_date
  LOOP
    -- Calculate summary metrics for this widget and date
    INSERT INTO widget_performance_summary (
      widget_id,
      date,
      total_requests,
      avg_render_time,
      p95_render_time,
      cache_hit_rate,
      error_rate,
      unique_visitors,
      total_content_size
    )
    SELECT 
      widget_record.widget_id,
      target_date,
      COUNT(*) as total_requests,
      AVG(render_time)::INTEGER as avg_render_time,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY render_time)::INTEGER as p95_render_time,
      AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) as cache_hit_rate,
      AVG(CASE WHEN error_count > 0 THEN 1.0 ELSE 0.0 END) as error_rate,
      COUNT(DISTINCT referrer) as unique_visitors,
      SUM(content_size) as total_content_size
    FROM widget_performance_metrics
    WHERE widget_id = widget_record.widget_id
    AND DATE(timestamp) = target_date
    ON CONFLICT (widget_id, date) DO UPDATE SET
      total_requests = EXCLUDED.total_requests,
      avg_render_time = EXCLUDED.avg_render_time,
      p95_render_time = EXCLUDED.p95_render_time,
      cache_hit_rate = EXCLUDED.cache_hit_rate,
      error_rate = EXCLUDED.error_rate,
      unique_visitors = EXCLUDED.unique_visitors,
      total_content_size = EXCLUDED.total_content_size,
      updated_at = NOW();
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old performance metrics
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete old performance metrics
  DELETE FROM widget_performance_metrics
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete old usage analytics
  DELETE FROM widget_usage_analytics
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get widget performance overview
CREATE OR REPLACE FUNCTION get_widget_performance_overview(
  widget_id_param UUID,
  days_param INTEGER DEFAULT 7
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_date DATE;
BEGIN
  start_date := CURRENT_DATE - (days_param || ' days')::INTERVAL;
  
  SELECT json_build_object(
    'widget_id', widget_id_param,
    'period_days', days_param,
    'total_requests', COALESCE(SUM(total_requests), 0),
    'avg_render_time', COALESCE(AVG(avg_render_time), 0)::INTEGER,
    'best_render_time', COALESCE(MIN(avg_render_time), 0)::INTEGER,
    'worst_render_time', COALESCE(MAX(avg_render_time), 0)::INTEGER,
    'avg_cache_hit_rate', COALESCE(AVG(cache_hit_rate), 0),
    'avg_error_rate', COALESCE(AVG(error_rate), 0),
    'total_unique_visitors', COALESCE(SUM(unique_visitors), 0),
    'total_content_served', COALESCE(SUM(total_content_size), 0),
    'daily_breakdown', (
      SELECT json_agg(
        json_build_object(
          'date', date,
          'requests', total_requests,
          'render_time', avg_render_time,
          'cache_hit_rate', cache_hit_rate,
          'error_rate', error_rate
        ) ORDER BY date
      )
      FROM widget_performance_summary
      WHERE widget_id = widget_id_param
      AND date >= start_date
    )
  ) INTO result
  FROM widget_performance_summary
  WHERE widget_id = widget_id_param
  AND date >= start_date;
  
  RETURN COALESCE(result, json_build_object(
    'widget_id', widget_id_param,
    'period_days', days_param,
    'total_requests', 0,
    'avg_render_time', 0,
    'best_render_time', 0,
    'worst_render_time', 0,
    'avg_cache_hit_rate', 0,
    'avg_error_rate', 0,
    'total_unique_visitors', 0,
    'total_content_served', 0,
    'daily_breakdown', '[]'::json
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update performance summary updated_at
CREATE OR REPLACE FUNCTION update_performance_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_performance_summary_updated_at
  BEFORE UPDATE ON widget_performance_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_summary_updated_at();

CREATE TRIGGER trigger_update_performance_alerts_updated_at
  BEFORE UPDATE ON widget_performance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_summary_updated_at();

-- Create view for real-time performance monitoring
CREATE OR REPLACE VIEW widget_performance_realtime AS
SELECT 
  wpm.widget_id,
  COUNT(*) as requests_last_5min,
  AVG(wpm.render_time)::INTEGER as avg_render_time_5min,
  AVG(CASE WHEN wpm.cache_hit THEN 1.0 ELSE 0.0 END) as cache_hit_rate_5min,
  AVG(CASE WHEN wpm.error_count > 0 THEN 1.0 ELSE 0.0 END) as error_rate_5min,
  MAX(wpm.timestamp) as last_request_time,
  COUNT(DISTINCT wpm.referrer) as unique_referrers_5min
FROM widget_performance_metrics wpm
WHERE wpm.timestamp >= NOW() - INTERVAL '5 minutes'
GROUP BY wpm.widget_id;

-- Create RLS policies
ALTER TABLE widget_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_performance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Performance metrics policies (public read for widget owners)
CREATE POLICY "Widget owners can view performance metrics" ON widget_performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM widget_configurations wc
      JOIN websites w ON w.id = wc.website_id
      JOIN website_users wu ON wu.website_id = w.id
      WHERE wc.id = widget_performance_metrics.widget_id
      AND wu.user_id = auth.uid()
    )
  );

-- Performance alerts policies
CREATE POLICY "Widget owners can manage performance alerts" ON widget_performance_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM widget_configurations wc
      JOIN websites w ON w.id = wc.website_id
      JOIN website_users wu ON wu.website_id = w.id
      WHERE wc.id = widget_performance_alerts.widget_id
      AND wu.user_id = auth.uid()
    )
  );

-- Performance summary policies
CREATE POLICY "Widget owners can view performance summary" ON widget_performance_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM widget_configurations wc
      JOIN websites w ON w.id = wc.website_id
      JOIN website_users wu ON wu.website_id = w.id
      WHERE wc.id = widget_performance_summary.widget_id
      AND wu.user_id = auth.uid()
    )
  );

-- Usage analytics policies
CREATE POLICY "Widget owners can view usage analytics" ON widget_usage_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM widget_configurations wc
      JOIN websites w ON w.id = wc.website_id
      JOIN website_users wu ON wu.website_id = w.id
      WHERE wc.id = widget_usage_analytics.widget_id
      AND wu.user_id = auth.uid()
    )
  );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_daily_performance_summary(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_performance_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_widget_performance_overview(UUID, INTEGER) TO authenticated;

-- Grant access to the view
GRANT SELECT ON widget_performance_realtime TO authenticated;

-- Create scheduled job to calculate daily summaries (if pg_cron is available)
-- SELECT cron.schedule('calculate-daily-performance', '0 1 * * *', 'SELECT calculate_daily_performance_summary();');

-- Create scheduled job to cleanup old metrics (if pg_cron is available)
-- SELECT cron.schedule('cleanup-old-metrics', '0 2 * * 0', 'SELECT cleanup_old_performance_metrics(30);');

-- Insert sample performance alert configurations for existing widgets
INSERT INTO widget_performance_alerts (widget_id, max_render_time, min_cache_hit_rate, max_error_rate)
SELECT id, 1000, 0.80, 0.05
FROM widget_configurations
WHERE id NOT IN (SELECT widget_id FROM widget_performance_alerts)
ON CONFLICT (widget_id) DO NOTHING;
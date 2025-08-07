-- Migration: Create monitoring and error tracking tables
-- Description: Set up comprehensive monitoring system with events, health checks, performance metrics, and alerts

-- Monitoring events table for all system events
CREATE TABLE IF NOT EXISTS monitoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp BIGINT NOT NULL,
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('application', 'security', 'performance', 'business', 'system')),
  event VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  request_id VARCHAR(255),
  stack TEXT,
  fingerprint VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Health checks table for service monitoring
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time INTEGER NOT NULL,
  details JSONB DEFAULT '{}',
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Monitoring alerts table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('error_rate', 'response_time', 'availability', 'security', 'custom')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  threshold DECIMAL,
  current_value DECIMAL,
  timestamp BIGINT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at BIGINT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL NOT NULL,
  metric_type VARCHAR(50) NOT NULL DEFAULT 'gauge',
  tags JSONB DEFAULT '{}',
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Error fingerprints table for error grouping
CREATE TABLE IF NOT EXISTS error_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint VARCHAR(255) UNIQUE NOT NULL,
  error_name VARCHAR(255) NOT NULL,
  error_message TEXT NOT NULL,
  first_seen BIGINT NOT NULL,
  last_seen BIGINT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  stack_trace TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- System metrics table for resource monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('cpu', 'memory', 'disk', 'network')),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL NOT NULL,
  unit VARCHAR(20),
  hostname VARCHAR(255),
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Monitoring configuration table
CREATE TABLE IF NOT EXISTS monitoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monitoring_events_timestamp ON monitoring_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_level ON monitoring_events(level);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_category ON monitoring_events(category);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_event ON monitoring_events(event);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_fingerprint ON monitoring_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_user_id ON monitoring_events(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_request_id ON monitoring_events(request_id);

CREATE INDEX IF NOT EXISTS idx_health_checks_service ON health_checks(service);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type ON monitoring_alerts(type);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved ON monitoring_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp ON monitoring_alerts(timestamp);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_error_fingerprints_fingerprint ON error_fingerprints(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_resolved ON error_fingerprints(resolved);
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_last_seen ON error_fingerprints(last_seen);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_monitoring_config_key ON monitoring_config(config_key);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_monitoring_events_level_timestamp ON monitoring_events(level, timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_category_timestamp ON monitoring_events(category, timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_timestamp ON performance_metrics(metric_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_health_checks_service_timestamp ON health_checks(service, timestamp);

-- Create partial indexes for active alerts and unresolved errors
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_active ON monitoring_alerts(timestamp) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_error_fingerprints_active ON error_fingerprints(last_seen) WHERE resolved = FALSE;

-- Insert default monitoring configuration
INSERT INTO monitoring_config (config_key, config_value, description) VALUES
  ('health_check_interval', '30000', 'Health check interval in milliseconds'),
  ('metrics_collection_interval', '60000', 'Metrics collection interval in milliseconds'),
  ('alert_processing_interval', '300000', 'Alert processing interval in milliseconds'),
  ('event_retention_days', '30', 'Number of days to retain monitoring events'),
  ('performance_thresholds', '{
    "response_time": {"warning": 1000, "critical": 5000},
    "memory_usage": {"warning": 80, "critical": 95},
    "cpu_usage": {"warning": 80, "critical": 95},
    "error_rate": {"warning": 5, "critical": 10}
  }', 'Performance monitoring thresholds'),
  ('alert_settings', '{
    "error_rate_threshold": 10,
    "auto_resolve_time": 1800000,
    "notification_channels": ["email", "webhook"]
  }', 'Alert system configuration')
ON CONFLICT (config_key) DO NOTHING;

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_monitoring_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_error_fingerprints_updated_at
  BEFORE UPDATE ON error_fingerprints
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_timestamp();

CREATE TRIGGER trigger_monitoring_config_updated_at
  BEFORE UPDATE ON monitoring_config
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_timestamp();

-- Create function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data(retention_days INTEGER DEFAULT 30)
RETURNS TABLE(
  deleted_events INTEGER,
  deleted_health_checks INTEGER,
  deleted_metrics INTEGER,
  deleted_alerts INTEGER
) AS $$
DECLARE
  cutoff_timestamp BIGINT;
  events_deleted INTEGER;
  health_checks_deleted INTEGER;
  metrics_deleted INTEGER;
  alerts_deleted INTEGER;
BEGIN
  cutoff_timestamp := EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day' * retention_days) * 1000;
  
  -- Delete old monitoring events
  DELETE FROM monitoring_events WHERE timestamp < cutoff_timestamp;
  GET DIAGNOSTICS events_deleted = ROW_COUNT;
  
  -- Delete old health checks
  DELETE FROM health_checks WHERE timestamp < cutoff_timestamp;
  GET DIAGNOSTICS health_checks_deleted = ROW_COUNT;
  
  -- Delete old performance metrics
  DELETE FROM performance_metrics WHERE timestamp < cutoff_timestamp;
  GET DIAGNOSTICS metrics_deleted = ROW_COUNT;
  
  -- Delete old resolved alerts
  DELETE FROM monitoring_alerts WHERE timestamp < cutoff_timestamp AND resolved = TRUE;
  GET DIAGNOSTICS alerts_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT events_deleted, health_checks_deleted, metrics_deleted, alerts_deleted;
END;
$$ LANGUAGE plpgsql;

-- Create function to get error summary
CREATE OR REPLACE FUNCTION get_error_summary(
  start_timestamp BIGINT,
  end_timestamp BIGINT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
  fingerprint VARCHAR(255),
  error_name VARCHAR(255),
  error_message TEXT,
  occurrence_count BIGINT,
  first_seen BIGINT,
  last_seen BIGINT,
  resolved BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    me.fingerprint,
    COALESCE(ef.error_name, 'Unknown') as error_name,
    me.message as error_message,
    COUNT(*) as occurrence_count,
    MIN(me.timestamp) as first_seen,
    MAX(me.timestamp) as last_seen,
    COALESCE(ef.resolved, FALSE) as resolved
  FROM monitoring_events me
  LEFT JOIN error_fingerprints ef ON me.fingerprint = ef.fingerprint
  WHERE me.level IN ('error', 'critical')
    AND me.timestamp >= start_timestamp
    AND me.timestamp <= end_timestamp
    AND me.fingerprint IS NOT NULL
  GROUP BY me.fingerprint, ef.error_name, me.message, ef.resolved
  ORDER BY occurrence_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get performance metrics summary
CREATE OR REPLACE FUNCTION get_performance_summary(
  start_timestamp BIGINT,
  end_timestamp BIGINT,
  metric_name_filter VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE(
  metric_name VARCHAR(100),
  avg_value DECIMAL,
  min_value DECIMAL,
  max_value DECIMAL,
  sample_count BIGINT,
  latest_value DECIMAL,
  latest_timestamp BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.metric_name,
    AVG(pm.metric_value) as avg_value,
    MIN(pm.metric_value) as min_value,
    MAX(pm.metric_value) as max_value,
    COUNT(*) as sample_count,
    (SELECT metric_value FROM performance_metrics 
     WHERE metric_name = pm.metric_name 
     ORDER BY timestamp DESC LIMIT 1) as latest_value,
    (SELECT timestamp FROM performance_metrics 
     WHERE metric_name = pm.metric_name 
     ORDER BY timestamp DESC LIMIT 1) as latest_timestamp
  FROM performance_metrics pm
  WHERE pm.timestamp >= start_timestamp
    AND pm.timestamp <= end_timestamp
    AND (metric_name_filter IS NULL OR pm.metric_name = metric_name_filter)
  GROUP BY pm.metric_name
  ORDER BY pm.metric_name;
END;
$$ LANGUAGE plpgsql;

-- Create view for monitoring dashboard
CREATE OR REPLACE VIEW monitoring_dashboard AS
SELECT 
  'events' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE level = 'error') as error_count,
  COUNT(*) FILTER (WHERE level = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE level = 'warn') as warning_count,
  COUNT(*) FILTER (WHERE timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000) as last_hour_count
FROM monitoring_events
WHERE timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000

UNION ALL

SELECT 
  'alerts' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE resolved = FALSE) as error_count,
  COUNT(*) FILTER (WHERE severity = 'critical' AND resolved = FALSE) as critical_count,
  COUNT(*) FILTER (WHERE severity IN ('high', 'medium') AND resolved = FALSE) as warning_count,
  COUNT(*) FILTER (WHERE timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000) as last_hour_count
FROM monitoring_alerts
WHERE timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000

UNION ALL

SELECT 
  'health_checks' as metric_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE status = 'unhealthy') as error_count,
  0 as critical_count,
  COUNT(*) FILTER (WHERE status = 'degraded') as warning_count,
  COUNT(*) FILTER (WHERE timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000) as last_hour_count
FROM health_checks
WHERE timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON health_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON performance_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON error_fingerprints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_config TO authenticated;
GRANT SELECT ON monitoring_dashboard TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_monitoring_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_error_summary(BIGINT, BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_summary(BIGINT, BIGINT, VARCHAR) TO authenticated;

COMMENT ON TABLE monitoring_events IS 'Stores all monitoring events including errors, performance metrics, and business events';
COMMENT ON TABLE health_checks IS 'Stores health check results for various services';
COMMENT ON TABLE monitoring_alerts IS 'Stores system alerts and their resolution status';
COMMENT ON TABLE performance_metrics IS 'Stores performance metrics and measurements';
COMMENT ON TABLE error_fingerprints IS 'Stores unique error signatures for grouping similar errors';
COMMENT ON TABLE system_metrics IS 'Stores system-level metrics like CPU, memory usage';
COMMENT ON TABLE monitoring_config IS 'Stores monitoring system configuration';
COMMENT ON VIEW monitoring_dashboard IS 'Provides summary statistics for monitoring dashboard';
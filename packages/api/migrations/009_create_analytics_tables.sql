-- Create analytics tables for tracking page views and events

-- Page views table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  visitor_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id) ON DELETE SET NULL,
  visitor_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_data JSONB,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_page_views_website_id ON page_views(website_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_content_id ON page_views(content_id);
CREATE INDEX IF NOT EXISTS idx_page_views_url ON page_views(url);
CREATE INDEX IF NOT EXISTS idx_page_views_referrer ON page_views(referrer);
CREATE INDEX IF NOT EXISTS idx_page_views_device_type ON page_views(device_type);
CREATE INDEX IF NOT EXISTS idx_page_views_country ON page_views(country);
CREATE INDEX IF NOT EXISTS idx_page_views_utm_source ON page_views(utm_source);

CREATE INDEX IF NOT EXISTS idx_events_website_id ON events(website_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_content_id ON events(content_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_page_views_website_created ON page_views(website_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_website_created ON events(website_id, created_at);

-- Database functions for analytics queries

-- Function to get page views over time
CREATE OR REPLACE FUNCTION get_page_views_over_time(
  website_id_param UUID,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE,
  time_format_param TEXT
)
RETURNS TABLE(date TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(created_at, time_format_param) as date,
    COUNT(*) as count
  FROM page_views
  WHERE website_id = website_id_param
    AND created_at >= start_date_param
    AND created_at <= end_date_param
  GROUP BY TO_CHAR(created_at, time_format_param)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Function to get top content
CREATE OR REPLACE FUNCTION get_top_content(
  website_id_param UUID,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE,
  limit_param INTEGER
)
RETURNS TABLE(content_id UUID, title TEXT, views BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.content_id,
    COALESCE(c.title, 'Unknown') as title,
    COUNT(*) as views
  FROM page_views pv
  LEFT JOIN content c ON pv.content_id = c.id
  WHERE pv.website_id = website_id_param
    AND pv.created_at >= start_date_param
    AND pv.created_at <= end_date_param
    AND pv.content_id IS NOT NULL
  GROUP BY pv.content_id, c.title
  ORDER BY views DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get top referrers
CREATE OR REPLACE FUNCTION get_top_referrers(
  website_id_param UUID,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE,
  limit_param INTEGER
)
RETURNS TABLE(referrer TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(NULLIF(pv.referrer, ''), 'Direct') as referrer,
    COUNT(*) as count
  FROM page_views pv
  WHERE pv.website_id = website_id_param
    AND pv.created_at >= start_date_param
    AND pv.created_at <= end_date_param
  GROUP BY COALESCE(NULLIF(pv.referrer, ''), 'Direct')
  ORDER BY count DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get device breakdown
CREATE OR REPLACE FUNCTION get_device_breakdown(
  website_id_param UUID,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(device_type TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pv.device_type, 'unknown') as device_type,
    COUNT(*) as count
  FROM page_views pv
  WHERE pv.website_id = website_id_param
    AND pv.created_at >= start_date_param
    AND pv.created_at <= end_date_param
  GROUP BY COALESCE(pv.device_type, 'unknown')
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get geographic distribution
CREATE OR REPLACE FUNCTION get_geographic_distribution(
  website_id_param UUID,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(country TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pv.country, 'Unknown') as country,
    COUNT(*) as count
  FROM page_views pv
  WHERE pv.website_id = website_id_param
    AND pv.created_at >= start_date_param
    AND pv.created_at <= end_date_param
  GROUP BY COALESCE(pv.country, 'Unknown')
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get UTM source breakdown
CREATE OR REPLACE FUNCTION get_utm_source_breakdown(
  website_id_param UUID,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(utm_source TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pv.utm_source, 'Direct') as utm_source,
    COUNT(*) as count
  FROM page_views pv
  WHERE pv.website_id = website_id_param
    AND pv.created_at >= start_date_param
    AND pv.created_at <= end_date_param
  GROUP BY COALESCE(pv.utm_source, 'Direct')
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get event counts by type
CREATE OR REPLACE FUNCTION get_event_counts_by_type(
  website_id_param UUID,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(event_type TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.event_type,
    COUNT(*) as count
  FROM events e
  WHERE e.website_id = website_id_param
    AND e.created_at >= start_date_param
    AND e.created_at <= end_date_param
  GROUP BY e.event_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get website metrics
CREATE OR REPLACE FUNCTION get_website_metrics(
  website_id_param UUID,
  start_date_param TIMESTAMP WITH TIME ZONE,
  end_date_param TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  totalPageViews BIGINT,
  totalVisitors BIGINT,
  totalSessions BIGINT,
  averageSessionDuration NUMERIC,
  bounceRate NUMERIC
) AS $$
DECLARE
  total_page_views BIGINT;
  total_visitors BIGINT;
  total_sessions BIGINT;
  avg_session_duration NUMERIC;
  bounce_rate NUMERIC;
BEGIN
  -- Total page views
  SELECT COUNT(*) INTO total_page_views
  FROM page_views pv
  WHERE pv.website_id = website_id_param
    AND pv.created_at >= start_date_param
    AND pv.created_at <= end_date_param;

  -- Total unique visitors
  SELECT COUNT(DISTINCT visitor_id) INTO total_visitors
  FROM page_views pv
  WHERE pv.website_id = website_id_param
    AND pv.created_at >= start_date_param
    AND pv.created_at <= end_date_param;

  -- Total sessions
  SELECT COUNT(DISTINCT session_id) INTO total_sessions
  FROM page_views pv
  WHERE pv.website_id = website_id_param
    AND pv.created_at >= start_date_param
    AND pv.created_at <= end_date_param;

  -- Average session duration (simplified calculation)
  SELECT COALESCE(AVG(session_duration), 0) INTO avg_session_duration
  FROM (
    SELECT 
      session_id,
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as session_duration
    FROM page_views pv
    WHERE pv.website_id = website_id_param
      AND pv.created_at >= start_date_param
      AND pv.created_at <= end_date_param
    GROUP BY session_id
    HAVING COUNT(*) > 1
  ) session_durations;

  -- Bounce rate (sessions with only one page view)
  SELECT 
    CASE 
      WHEN total_sessions > 0 THEN
        (COUNT(*) * 100.0 / total_sessions)
      ELSE 0
    END INTO bounce_rate
  FROM (
    SELECT session_id
    FROM page_views pv
    WHERE pv.website_id = website_id_param
      AND pv.created_at >= start_date_param
      AND pv.created_at <= end_date_param
    GROUP BY session_id
    HAVING COUNT(*) = 1
  ) single_page_sessions;

  RETURN QUERY SELECT 
    total_page_views,
    total_visitors,
    total_sessions,
    COALESCE(avg_session_duration, 0),
    COALESCE(bounce_rate, 0);
END;
$$ LANGUAGE plpgsql;
# StorySlip Monitoring and Error Tracking System

## Overview

The StorySlip monitoring system provides comprehensive observability into application performance, errors, security events, and business metrics. It includes real-time monitoring, alerting, error tracking, and analytics capabilities.

## Features

### 🔍 Error Tracking
- **Automatic Error Detection**: Captures all unhandled errors and exceptions
- **Error Fingerprinting**: Groups similar errors for better analysis
- **Stack Trace Analysis**: Full stack traces with context information
- **Error Rate Monitoring**: Tracks error rates and triggers alerts
- **Context Preservation**: Captures user, request, and environment context

### 📊 Performance Monitoring
- **Response Time Tracking**: Monitors API endpoint performance
- **Resource Usage**: CPU, memory, and system metrics
- **Database Performance**: Query performance and connection pool stats
- **Event Loop Monitoring**: Node.js event loop lag detection
- **Custom Metrics**: Track business-specific performance indicators

### 🚨 Real-time Alerting
- **Threshold-based Alerts**: Configurable performance and error thresholds
- **Security Alerts**: Suspicious activity and security event notifications
- **Auto-resolution**: Automatic alert resolution when conditions improve
- **Alert Acknowledgment**: Manual alert acknowledgment and resolution

### 🔒 Security Monitoring
- **Suspicious Activity Detection**: SQL injection, XSS, and other attack patterns
- **Authentication Monitoring**: Failed login attempts and suspicious access
- **Rate Limiting Violations**: Tracks and alerts on rate limit breaches
- **Input Validation**: Monitors for malicious input patterns

### 📈 Business Analytics
- **User Activity Tracking**: User actions and engagement metrics
- **Content Analytics**: Content creation, publishing, and interaction stats
- **Widget Performance**: Widget usage and performance metrics
- **System Usage**: Overall system utilization and trends

### 🏥 Health Monitoring
- **Service Health Checks**: Automated health checks for critical services
- **Database Connectivity**: Database connection and query health
- **External Dependencies**: Third-party service availability
- **System Resources**: Memory, CPU, and disk usage monitoring

## Architecture

### Core Components

1. **MonitoringService**: Central service for event tracking and management
2. **Error Tracking Middleware**: Automatic error capture and context collection
3. **Performance Middleware**: Request/response time and resource monitoring
4. **Security Middleware**: Suspicious activity detection and logging
5. **Health Check System**: Automated service health monitoring
6. **Alert Management**: Alert creation, processing, and resolution

### Data Storage

The monitoring system uses PostgreSQL tables for persistent storage:

- `monitoring_events`: All monitoring events (errors, performance, business)
- `health_checks`: Service health check results
- `monitoring_alerts`: System alerts and their status
- `performance_metrics`: Performance measurements and metrics
- `error_fingerprints`: Unique error signatures for grouping
- `system_metrics`: System-level resource metrics

## API Endpoints

### Public Endpoints (No Authentication Required)

#### GET /api/monitoring/status
Basic system status information.

```json
{
  "status": "healthy",
  "uptime": 3600,
  "memory": {
    "used": 128,
    "total": 512
  },
  "timestamp": 1640995200000,
  "version": "1.0.0"
}
```

#### GET /api/monitoring/health
Public health check endpoint.

```json
{
  "status": "healthy",
  "timestamp": 1640995200000
}
```

### Authenticated Endpoints (Require Valid Token)

#### GET /api/monitoring/health/detailed
Detailed health information including service status.

```json
{
  "overall": "healthy",
  "services": [
    {
      "service": "database",
      "status": "healthy",
      "responseTime": 15,
      "timestamp": 1640995200000
    }
  ],
  "metrics": {
    "errorRate": 0.5,
    "uptime": 3600,
    "memory": {...},
    "cpu": {...}
  },
  "recentEvents": [...],
  "activeAlerts": [...]
}
```

#### GET /api/monitoring/events
Get monitoring events with filtering options.

**Query Parameters:**
- `start`: Start timestamp (default: 24 hours ago)
- `end`: End timestamp (default: now)
- `level`: Filter by event level (debug, info, warn, error, critical)
- `category`: Filter by category (application, security, performance, business, system)
- `event`: Filter by specific event type
- `limit`: Maximum number of events to return (default: 100)

#### GET /api/monitoring/metrics/performance
Get performance metrics and statistics.

#### GET /api/monitoring/metrics/errors
Get error metrics grouped by fingerprint.

#### GET /api/monitoring/alerts
Get system alerts (active or resolved).

#### POST /api/monitoring/alerts/:alertId/resolve
Resolve a specific alert.

#### POST /api/monitoring/alerts/:alertId/acknowledge
Acknowledge an alert without resolving it.

### Admin Endpoints (Require Admin Role)

#### GET /api/monitoring/config
Get monitoring system configuration.

#### PUT /api/monitoring/config
Update monitoring system configuration.

#### DELETE /api/monitoring/events/cleanup
Clean up old monitoring data.

#### POST /api/monitoring/events/export
Export monitoring events (JSON or CSV format).

#### POST /api/monitoring/test/error
Test error tracking system.

#### POST /api/monitoring/test/performance
Test performance tracking system.

#### POST /api/monitoring/test/alert
Test alert system.

## Usage Examples

### Tracking Custom Errors

```typescript
import { monitoringService } from '../services/monitoring.service';

try {
  // Your code here
} catch (error) {
  const eventId = monitoringService.trackError(error, {
    userId: req.user?.id,
    requestId: req.requestId,
    url: req.url,
    method: req.method,
    customData: { /* additional context */ }
  });
  
  // Handle error appropriately
  res.status(500).json({ 
    error: 'Internal server error',
    eventId 
  });
}
```

### Tracking Performance Metrics

```typescript
import { monitoringService } from '../services/monitoring.service';

// Track custom performance metric
monitoringService.trackPerformance('database_query_time', queryDuration, {
  query: 'SELECT_USERS',
  table: 'users',
  userId: req.user?.id
});

// Track business event
monitoringService.trackBusinessEvent('user_registration', {
  source: 'web',
  plan: 'premium',
  referrer: req.headers.referer
}, userId);
```

### Security Event Tracking

```typescript
import { monitoringService } from '../services/monitoring.service';

// Track suspicious activity
monitoringService.trackSecurityEvent('suspicious_login_attempt', 'high', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  attemptedEmail: req.body.email,
  failureReason: 'invalid_password',
  attemptCount: 5
});
```

### Custom Health Checks

```typescript
import { monitoringService } from '../services/monitoring.service';

// Perform custom health check
const healthCheck = await monitoringService.performHealthCheck('external_api', async () => {
  try {
    const response = await fetch('https://api.external-service.com/health');
    if (response.ok) {
      return { 
        status: 'healthy', 
        details: { responseTime: response.headers.get('x-response-time') }
      };
    } else {
      return { 
        status: 'degraded', 
        details: { statusCode: response.status }
      };
    }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      details: { error: error.message }
    };
  }
});
```

## Configuration

### Environment Variables

```bash
# Monitoring Configuration
MONITORING_ENABLED=true
MONITORING_LOG_LEVEL=info
MONITORING_RETENTION_DAYS=30

# Alert Configuration
ALERT_EMAIL_ENABLED=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_ERROR_RATE_THRESHOLD=10
ALERT_RESPONSE_TIME_THRESHOLD=5000

# Performance Thresholds
PERF_CPU_WARNING_THRESHOLD=70
PERF_CPU_CRITICAL_THRESHOLD=90
PERF_MEMORY_WARNING_THRESHOLD=80
PERF_MEMORY_CRITICAL_THRESHOLD=95
```

### Database Configuration

The monitoring system automatically creates the necessary database tables and indexes. Run the migration:

```bash
npm run migrate
```

### Performance Thresholds

Default performance thresholds can be configured:

```typescript
const thresholds = {
  response_time: { warning: 1000, critical: 5000 }, // milliseconds
  memory_usage: { warning: 80, critical: 95 },      // percentage
  cpu_usage: { warning: 80, critical: 95 },         // percentage
  error_rate: { warning: 5, critical: 10 }          // percentage
};
```

## Monitoring Dashboard

The system provides several views for monitoring data:

### Real-time Metrics
- Current system status
- Active alerts
- Recent errors
- Performance trends

### Historical Analysis
- Error trends over time
- Performance degradation patterns
- User activity patterns
- System resource usage trends

### Alert Management
- Active alerts with severity levels
- Alert history and resolution times
- Alert acknowledgment and resolution

## Best Practices

### Error Handling
1. **Always provide context**: Include user ID, request ID, and relevant data
2. **Use appropriate error levels**: Critical for system failures, error for user-facing issues
3. **Don't log sensitive data**: Sanitize passwords, tokens, and personal information
4. **Group similar errors**: Use consistent error messages for similar issues

### Performance Monitoring
1. **Track key metrics**: Response times, database queries, external API calls
2. **Set realistic thresholds**: Based on actual usage patterns and requirements
3. **Monitor trends**: Look for gradual degradation, not just spikes
4. **Track business metrics**: User actions, feature usage, conversion rates

### Security Monitoring
1. **Monitor authentication**: Failed logins, suspicious access patterns
2. **Track input validation**: SQL injection attempts, XSS attempts
3. **Monitor rate limits**: API abuse, brute force attempts
4. **Log security events**: With appropriate detail for investigation

### Alert Management
1. **Avoid alert fatigue**: Set appropriate thresholds to minimize false positives
2. **Prioritize alerts**: Use severity levels effectively
3. **Provide context**: Include enough information for quick resolution
4. **Auto-resolve when possible**: Reduce manual overhead

## Troubleshooting

### Common Issues

#### High Memory Usage
1. Check for memory leaks in application code
2. Review database connection pooling
3. Monitor cache usage and eviction
4. Check for large object retention

#### High Error Rates
1. Review recent deployments
2. Check external service dependencies
3. Monitor database performance
4. Review application logs

#### Performance Degradation
1. Check database query performance
2. Monitor external API response times
3. Review system resource usage
4. Check for increased load patterns

### Debugging Tools

#### Query Performance
```sql
-- Get slowest queries
SELECT * FROM get_performance_summary(
  EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour') * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  'response_time'
);
```

#### Error Analysis
```sql
-- Get error summary
SELECT * FROM get_error_summary(
  EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000,
  EXTRACT(EPOCH FROM NOW()) * 1000,
  20
);
```

#### System Health
```sql
-- Check monitoring dashboard
SELECT * FROM monitoring_dashboard;
```

## Integration with External Tools

### Grafana Dashboard
The monitoring system can be integrated with Grafana for advanced visualization:

1. Configure PostgreSQL data source
2. Import dashboard templates
3. Set up alerting rules
4. Configure notification channels

### Log Aggregation
Integration with log aggregation tools like ELK stack or Loki:

1. Configure log forwarding
2. Set up log parsing rules
3. Create monitoring dashboards
4. Configure log-based alerts

### APM Tools
Integration with Application Performance Monitoring tools:

1. Configure APM agent
2. Set up distributed tracing
3. Monitor service dependencies
4. Track user experience metrics

## Maintenance

### Regular Tasks

#### Daily
- Review active alerts
- Check error rates and trends
- Monitor system performance
- Verify health check status

#### Weekly
- Analyze performance trends
- Review security events
- Update alert thresholds if needed
- Check system resource usage

#### Monthly
- Clean up old monitoring data
- Review and update configurations
- Analyze long-term trends
- Update documentation

### Data Retention

The system automatically cleans up old data based on retention policies:

- Events: 30 days (configurable)
- Performance metrics: 30 days (configurable)
- Health checks: 7 days (configurable)
- Resolved alerts: 30 days (configurable)

### Backup and Recovery

Important monitoring data should be included in backup strategies:

1. Database backups include monitoring tables
2. Configuration backups for thresholds and settings
3. Alert history for compliance and analysis
4. Performance baselines for comparison

## Security Considerations

### Data Privacy
- Sanitize sensitive information in logs
- Implement proper access controls
- Encrypt monitoring data at rest
- Secure monitoring API endpoints

### Access Control
- Restrict admin endpoints to authorized users
- Implement proper authentication and authorization
- Log access to monitoring data
- Regular access review and cleanup

### Compliance
- Ensure monitoring practices comply with regulations
- Implement data retention policies
- Provide audit trails for monitoring access
- Document security procedures

## Support and Troubleshooting

For issues with the monitoring system:

1. Check system logs for errors
2. Verify database connectivity
3. Review configuration settings
4. Test individual components
5. Contact system administrators

## Future Enhancements

Planned improvements to the monitoring system:

- **Machine Learning**: Anomaly detection and predictive alerting
- **Advanced Analytics**: More sophisticated trend analysis
- **Integration APIs**: Better integration with external tools
- **Mobile Dashboard**: Mobile-friendly monitoring interface
- **Custom Dashboards**: User-configurable monitoring views
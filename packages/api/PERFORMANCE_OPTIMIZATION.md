# Performance Optimization Implementation

This document describes the comprehensive performance optimization system implemented for the StorySlip CMS API.

## Overview

The performance optimization system includes:

- **Caching Layer**: Redis-based caching with tagged invalidation
- **Database Optimizations**: Connection pooling, query optimization, and caching
- **API Optimizations**: Compression, rate limiting, response optimization
- **Performance Monitoring**: Real-time system and application metrics
- **Integration Service**: Unified service management and configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Integration Service                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Cache     │  │  Database   │  │     API     │         │
│  │  Service    │  │Optimization │  │Optimization │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Performance Monitor Service                   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Services

### 1. Cache Service (`cache.service.ts`)

**Features:**
- Redis-based caching with automatic serialization
- Tagged caching for intelligent invalidation
- Cache statistics and hit rate tracking
- Support for various data structures (strings, sets, lists)
- Decorators for method-level caching

**Key Methods:**
```typescript
// Basic operations
await cacheService.set(key, value, { ttl: 300 });
const value = await cacheService.get(key);
await cacheService.delete(key);

// Tagged caching
await cacheService.setWithTags(key, value, ['user:123', 'content'], { ttl: 300 });
await cacheService.invalidateByTags(['user:123']);

// Get-or-set pattern
const result = await cacheService.getOrSet(key, fetchFunction, { ttl: 300 });

// Statistics
const stats = cacheService.getStats();
```

**Cache Keys:**
```typescript
// Predefined cache key patterns
CacheKeys.content.byId(id)
CacheKeys.content.byWebsite(websiteId)
CacheKeys.widget.config(websiteId)
CacheKeys.user.profile(userId)
CacheKeys.analytics.dashboard(websiteId, period)
```

**Cache Tags:**
```typescript
// Predefined cache tags for invalidation
CacheTags.CONTENT
CacheTags.WIDGET
CacheTags.USER
CacheTags.ANALYTICS
```

### 2. Database Optimization Service (`database-optimization.service.ts`)

**Features:**
- Optimized connection pooling
- Query performance monitoring
- Automatic query caching
- Batch operations for bulk inserts/updates
- Query analysis and index suggestions

**Key Methods:**
```typescript
// Optimized query execution with caching
const results = await dbOptimizationService.executeOptimizedQuery(
  pool, 
  query, 
  params, 
  { 
    cacheKey: 'content:list', 
    cacheTTL: 300,
    tags: ['content'] 
  }
);

// Transaction support
const result = await dbOptimizationService.executeTransaction(pool, async (client) => {
  // Transaction operations
  return result;
});

// Batch operations
await dbOptimizationService.batchInsert(pool, 'table', columns, values);
await dbOptimizationService.bulkUpdate(pool, 'table', updates);

// Performance analysis
const analysis = await dbOptimizationService.analyzeQuery(pool, query, params);
const suggestions = await dbOptimizationService.suggestIndexes(pool);
```

**Query Builder:**
```typescript
const { query, params } = QueryBuilder.create()
  .select(['id', 'title', 'content'])
  .from('content')
  .where('website_id = ?', websiteId)
  .where('status = ?', 'published')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .build();
```

### 3. Performance Monitor Service (`performance-monitor.service.ts`)

**Features:**
- Real-time system metrics collection
- Request/response tracking
- Performance alerts and thresholds
- Endpoint statistics and analytics
- Health status monitoring

**Key Methods:**
```typescript
// Start monitoring
performanceMonitor.startMonitoring(30000); // 30 second intervals

// Record request metrics
performanceMonitor.recordRequest({
  path: '/api/content',
  method: 'GET',
  statusCode: 200,
  responseTime: 150
});

// Get performance summary
const summary = performanceMonitor.getPerformanceSummary();

// Health status
const health = performanceMonitor.getHealthStatus();

// Endpoint statistics
const stats = performanceMonitor.getEndpointStats();
```

**Metrics Collected:**
- CPU usage and load average
- Memory usage (system and process)
- Event loop delay
- Request/response times
- Error rates by endpoint
- Database query performance

### 4. API Optimization Service (`api-optimization.service.ts`)

**Features:**
- Response compression (gzip)
- Advanced rate limiting with Redis
- API versioning support
- Response optimization (ETag, caching headers)
- Security headers
- Request/response logging

**Middleware:**
```typescript
const middleware = createOptimizedAPIMiddleware();

app.use(middleware.compression);
app.use(middleware.rateLimit);
app.use(middleware.versioning);
app.use(middleware.responseOptimization);
app.use(middleware.securityHeaders);
app.use(middleware.logging);
app.use(middleware.errorHandling);
```

**Rate Limiting:**
```typescript
// Custom rate limiting
app.use('/api/upload', apiOptimizationService.createRateLimitMiddleware({
  windowMs: 60000,
  max: 5,
  message: 'Upload rate limit exceeded'
}));
```

### 5. Integration Service (`integration.service.ts`)

**Features:**
- Unified service initialization
- Configuration management
- Health check endpoints
- Graceful shutdown handling
- Service coordination

**Initialization:**
```typescript
await initializeOptimizedAPI(app, {
  database: {
    enableOptimizations: true,
    enableQueryCaching: true,
    enableConnectionPooling: true
  },
  cache: {
    enabled: true,
    defaultTTL: 300,
    enableTaggedCaching: true
  },
  performance: {
    enableMonitoring: true,
    monitoringInterval: 30000,
    enableAlerts: true
  },
  api: {
    enableCompression: true,
    enableRateLimit: true,
    enableVersioning: true,
    enableResponseOptimization: true,
    enableSecurityHeaders: true
  }
});
```

## Health Check Endpoints

### Basic Health Check
```
GET /health
```
Returns basic system health status.

### Detailed Health Check
```
GET /health/detailed
```
Returns comprehensive system metrics including:
- Database connection status
- Cache statistics
- Performance metrics
- Recent alerts
- Top endpoints by usage

### Readiness Probe
```
GET /health/ready
```
Kubernetes-compatible readiness probe.

### Liveness Probe
```
GET /health/live
```
Kubernetes-compatible liveness probe.

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=storyslip
DB_USER=postgres
DB_PASSWORD=

# Performance Monitoring
LOG_LEVEL=info
PERFORMANCE_MONITORING_INTERVAL=30000

# API Configuration
CORS_ORIGINS=http://localhost:3000,https://app.storyslip.com
API_VERSION=v1
```

### Performance Thresholds

```typescript
const thresholds = {
  cpu: { warning: 70, critical: 90 },      // CPU usage %
  memory: { warning: 80, critical: 95 },   // Memory usage %
  eventLoop: { warning: 50, critical: 100 }, // Event loop delay ms
  responseTime: { warning: 1000, critical: 5000 } // Response time ms
};
```

## Usage Examples

### Caching Content Queries

```typescript
import { cacheService, CacheKeys, CacheTags } from '../services/cache.service';

export class ContentService {
  async getContentById(id: string) {
    return await cacheService.getOrSet(
      CacheKeys.content.byId(id),
      () => this.fetchContentFromDatabase(id),
      { 
        ttl: 300,
        tags: [CacheTags.CONTENT]
      }
    );
  }

  async updateContent(id: string, data: any) {
    const result = await this.updateContentInDatabase(id, data);
    
    // Invalidate related cache
    await cacheService.invalidateByTags([CacheTags.CONTENT]);
    
    return result;
  }
}
```

### Optimized Database Queries

```typescript
import { dbOptimizationService } from '../services/database-optimization.service';

export class ContentRepository {
  async getPublishedContent(websiteId: string, page: number = 1, limit: number = 10) {
    const query = `
      SELECT c.*, u.name as author_name
      FROM content c
      JOIN users u ON c.author_id = u.id
      WHERE c.website_id = $1 AND c.status = 'published'
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const offset = (page - 1) * limit;
    
    return await dbOptimizationService.executeOptimizedQuery(
      this.pool,
      query,
      [websiteId, limit, offset],
      {
        cacheKey: CacheKeys.content.list(websiteId, page, limit),
        cacheTTL: 300,
        tags: [CacheTags.CONTENT, `website:${websiteId}`]
      }
    );
  }
}
```

### Performance Monitoring

```typescript
import { performanceMonitor } from '../services/performance-monitor.service';

// Custom middleware for tracking specific operations
export const trackContentOperations = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    performanceMonitor.recordRequest({
      path: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};
```

## Performance Metrics

### Cache Performance
- Hit rate percentage
- Average response time
- Memory usage
- Key distribution

### Database Performance
- Query execution times
- Connection pool utilization
- Slow query detection
- Index usage analysis

### API Performance
- Request/response times by endpoint
- Error rates
- Throughput (requests per minute)
- Response size distribution

### System Performance
- CPU usage
- Memory consumption
- Event loop delay
- Garbage collection metrics

## Monitoring and Alerting

### Built-in Alerts
- High CPU usage (>90%)
- High memory usage (>95%)
- Slow response times (>5s)
- High error rates (>10%)
- Event loop blocking (>100ms)

### Custom Alerts
```typescript
performanceMonitor.on('alert', (alert) => {
  if (alert.severity === 'critical') {
    // Send to external alerting system
    notificationService.sendAlert(alert);
  }
});
```

### Metrics Export
```typescript
// Export metrics for external monitoring systems
const metrics = integrationService.getPerformanceMetrics();

// Send to Prometheus, DataDog, etc.
metricsExporter.send(metrics);
```

## Best Practices

### Caching Strategy
1. Cache frequently accessed data with appropriate TTL
2. Use tagged caching for intelligent invalidation
3. Implement cache warming for critical data
4. Monitor cache hit rates and adjust strategies

### Database Optimization
1. Use connection pooling with appropriate pool sizes
2. Implement query caching for expensive operations
3. Use batch operations for bulk data changes
4. Monitor slow queries and optimize indexes

### API Performance
1. Enable compression for responses >1KB
2. Implement appropriate rate limiting
3. Use ETags for conditional requests
4. Add proper caching headers

### Monitoring
1. Set appropriate performance thresholds
2. Monitor key business metrics
3. Set up alerting for critical issues
4. Regular performance reviews and optimization

## Troubleshooting

### High Memory Usage
1. Check cache memory consumption
2. Review database connection pool sizes
3. Monitor for memory leaks in application code
4. Analyze garbage collection patterns

### Slow Response Times
1. Check database query performance
2. Review cache hit rates
3. Analyze network latency
4. Monitor event loop blocking

### High Error Rates
1. Check application logs for errors
2. Monitor database connection health
3. Review rate limiting configuration
4. Analyze error patterns by endpoint

### Cache Issues
1. Verify Redis connection and health
2. Check cache key expiration settings
3. Monitor cache memory usage
4. Review invalidation patterns

## Future Enhancements

### Planned Improvements
1. **Advanced Caching**: Multi-level caching with L1/L2 cache hierarchy
2. **Database Sharding**: Horizontal scaling for large datasets
3. **CDN Integration**: Static asset optimization and global distribution
4. **Machine Learning**: Predictive caching and performance optimization
5. **Real-time Analytics**: WebSocket-based real-time performance dashboards

### Monitoring Enhancements
1. **Custom Metrics**: Business-specific performance indicators
2. **Distributed Tracing**: Request tracing across microservices
3. **Anomaly Detection**: AI-powered performance anomaly detection
4. **Capacity Planning**: Predictive scaling recommendations

This performance optimization system provides a solid foundation for high-performance, scalable API operations while maintaining observability and reliability.
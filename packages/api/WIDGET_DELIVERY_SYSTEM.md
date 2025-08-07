# StorySlip Widget Delivery System

## Overview

The StorySlip Widget Delivery System provides a comprehensive solution for delivering content widgets to external websites with high performance, reliability, and security. The system includes caching, CDN integration, authentication, analytics, and error handling.

## Architecture

### Core Components

1. **Widget Delivery Service** (`packages/widget/src/delivery.ts`)
   - Client-side JavaScript library for widget loading
   - Handles caching, error handling, and performance optimization
   - Provides global `StorySlipWidget` API

2. **Widget Render Controller** (`packages/api/src/controllers/widget-render.controller.ts`)
   - Server-side widget rendering
   - Generates HTML, CSS, and JavaScript for widgets
   - Handles different output formats (JSON, HTML, AMP)

3. **Widget CDN Service** (`packages/api/src/services/widget-cdn.service.ts`)
   - Content optimization and caching
   - CDN integration for global delivery
   - Performance monitoring and metrics

4. **Widget Authentication Service** (`packages/api/src/services/widget-auth.service.ts`)
   - API key management and validation
   - Rate limiting and usage tracking
   - Permission-based access control

## API Endpoints

### Public Widget Rendering

```
GET /api/widgets/public/{widgetId}/render
```

**Parameters:**
- `widgetId` (path): Widget identifier
- `page` (query): Page number for pagination
- `search` (query): Search query filter
- `category` (query): Category filter
- `tag` (query): Tag filter
- `author` (query): Author filter
- `format` (query): Response format (`json` or `html`)

**Response (JSON format):**
```json
{
  "success": true,
  "data": {
    "html": "<div class=\"storyslip-widget\">...</div>",
    "css": ".storyslip-widget { ... }",
    "js": "(function() { ... })();",
    "metadata": {
      "title": "Widget Title",
      "description": "Widget Description",
      "canonical_url": "https://example.com/widget",
      "og_tags": {
        "og:title": "Widget Title",
        "og:description": "Widget Description"
      },
      "structured_data": {
        "@context": "https://schema.org",
        "@type": "ItemList"
      }
    }
  }
}
```

### Widget Script Delivery

```
GET /api/widgets/script.js
```

Delivers the widget delivery script with proper caching headers.

### Widget Embed Code Generation

```
GET /api/widgets/embed/{widgetId}
```

**Parameters:**
- `widgetId` (path): Widget identifier
- `type` (query): Embed type (`javascript`, `iframe`, or `amp`)

**Response:**
```json
{
  "success": true,
  "data": {
    "embed_code": "<div id=\"storyslip-widget-123\">...</div>",
    "preview_url": "https://api.storyslip.com/api/widgets/public/123/render"
  }
}
```

### Analytics Tracking

```
POST /api/widgets/{widgetId}/analytics/track
```

**Request Body:**
```json
{
  "widget_id": "widget-123",
  "type": "content",
  "url": "https://example.com/page",
  "referrer": "https://google.com",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Integration Methods

### 1. JavaScript Integration (Recommended)

```html
<!-- Add container div -->
<div id="my-widget" 
     data-storyslip-widget 
     data-widget-id="your-widget-id" 
     data-widget-type="content"
     data-widget-layout="grid"
     data-widget-theme="modern">
  Loading...
</div>

<!-- Load widget script -->
<script src="https://api.storyslip.com/api/widgets/script.js" async></script>
```

### 2. Manual JavaScript Integration

```html
<div id="my-widget">Loading...</div>

<script src="https://api.storyslip.com/api/widgets/script.js"></script>
<script>
  StorySlipWidget.load({
    widgetId: 'your-widget-id',
    containerId: 'my-widget',
    type: 'content',
    layout: 'grid',
    theme: 'modern'
  });
</script>
```

### 3. iframe Integration

```html
<iframe src="https://api.storyslip.com/api/widgets/public/your-widget-id/render?format=html" 
        width="100%" 
        height="400" 
        frameborder="0" 
        scrolling="auto"
        title="Content Widget">
</iframe>
```

### 4. AMP Integration

```html
<amp-iframe src="https://api.storyslip.com/api/widgets/public/your-widget-id/render?format=html"
            width="100%"
            height="400"
            layout="responsive"
            sandbox="allow-scripts allow-same-origin"
            frameborder="0">
  <div placeholder>Loading widget...</div>
</amp-iframe>
```

## Widget Configuration

### Theme Options

- **Modern** (default): Clean, contemporary design with cards and shadows
- **Minimal**: Simple, text-focused design with minimal styling
- **Classic**: Traditional design with borders and structured layout

### Layout Options

- **Grid** (default): Responsive grid layout for multiple items
- **List**: Vertical list layout for single-column display
- **Carousel**: Horizontal scrolling layout for featured content

### Customization Settings

```json
{
  "theme": "modern",
  "layout": "grid",
  "items_per_page": 10,
  "show_title": true,
  "show_description": true,
  "show_author": true,
  "show_date": true,
  "show_excerpt": true,
  "show_images": true,
  "show_tags": true,
  "show_pagination": true
}
```

## Performance Features

### Caching Strategy

1. **Browser Cache**: 5 minutes for widget content, 1 day for static assets
2. **CDN Cache**: 10 minutes for widget content, 1 week for static assets
3. **Application Cache**: In-memory caching with TTL-based expiration
4. **ETag Support**: Conditional requests to minimize bandwidth

### Content Optimization

1. **HTML Minification**: Removes unnecessary whitespace and comments
2. **CSS Minification**: Compresses stylesheets for faster loading
3. **JavaScript Minification**: Basic minification for widget scripts
4. **Image Optimization**: Lazy loading and responsive images

### CDN Integration

- Global content delivery network support
- Automatic region detection and routing
- Edge caching for improved performance
- Real-time cache invalidation

## Security Features

### API Key Authentication

- Secure API key generation and management
- Permission-based access control (read, write, admin)
- Rate limiting per API key
- Usage tracking and analytics

### Content Security

- HTML sanitization to prevent XSS attacks
- CSS scoping to prevent style conflicts
- JavaScript sandboxing for safe execution
- CORS headers for cross-origin requests

### Rate Limiting

- IP-based rate limiting for public endpoints
- API key-based rate limiting for authenticated requests
- Configurable limits per widget and user
- Automatic throttling and backoff

## Analytics and Monitoring

### Widget Analytics

- Page views and unique visitors
- Geographic distribution
- Referrer tracking
- Device and browser analytics
- Performance metrics (load time, error rates)

### Performance Monitoring

- Response time tracking
- Cache hit rates
- Error rate monitoring
- Resource usage metrics
- Real-time alerts and notifications

## Error Handling

### Client-Side Error Handling

- Graceful degradation for network failures
- Retry logic with exponential backoff
- Fallback content for loading errors
- User-friendly error messages

### Server-Side Error Handling

- Comprehensive error logging
- Structured error responses
- Health check endpoints
- Automatic failover and recovery

## Development and Testing

### Local Development

1. Start the API server:
   ```bash
   cd packages/api
   npm run dev
   ```

2. Test widget rendering:
   ```bash
   curl http://localhost:3001/api/widgets/public/your-widget-id/render
   ```

### Testing

Run the comprehensive test suite:

```bash
cd packages/api
npm test -- --testPathPattern=widget-delivery-integration
```

### Performance Testing

Load test the widget delivery system:

```bash
cd packages/api
npm run test:load -- --target-url=http://localhost:3001/api/widgets/public/test-widget/render
```

## Deployment

### Environment Variables

```bash
# API Configuration
API_URL=https://api.storyslip.com
CDN_ENABLED=true
CDN_BASE_URL=https://cdn.storyslip.com
CDN_REGIONS=us-east-1,eu-west-1,ap-southeast-1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=300

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=1000

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Production Deployment

1. **CDN Setup**: Configure CloudFront or similar CDN service
2. **Database**: Set up PostgreSQL with read replicas
3. **Cache**: Deploy Redis cluster for caching
4. **Monitoring**: Set up application performance monitoring
5. **Alerts**: Configure alerts for errors and performance issues

## Troubleshooting

### Common Issues

1. **Widget not loading**
   - Check widget ID and publication status
   - Verify CORS headers and domain restrictions
   - Check browser console for JavaScript errors

2. **Slow loading times**
   - Enable CDN and caching
   - Optimize widget content and images
   - Check database query performance

3. **Style conflicts**
   - Use CSS scoping and prefixes
   - Check for conflicting stylesheets
   - Use iframe integration for isolation

4. **Rate limiting errors**
   - Check API key limits and usage
   - Implement proper retry logic
   - Contact support for limit increases

### Debug Mode

Enable debug mode for detailed logging:

```javascript
StorySlipWidget.load({
  widgetId: 'your-widget-id',
  containerId: 'my-widget',
  debug: true
});
```

### Health Checks

Monitor system health:

```bash
# API Health
curl https://api.storyslip.com/api/status

# Widget Delivery Health
curl https://api.storyslip.com/api/widgets/script.js
```

## Support

For technical support and questions:

- Documentation: https://docs.storyslip.com
- Support Email: support@storyslip.com
- GitHub Issues: https://github.com/storyslip/storyslip/issues

## License

This widget delivery system is part of the StorySlip platform and is subject to the StorySlip Terms of Service and Privacy Policy.
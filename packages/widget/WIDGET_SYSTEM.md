# StorySlip Widget System

The StorySlip Widget System allows users to embed their content on external websites through customizable, responsive widgets.

## Overview

The widget system consists of:

1. **Backend API** - Manages widget configurations and serves content
2. **Embed Script** - JavaScript library for rendering widgets on external sites
3. **Analytics** - Tracks widget performance and user interactions
4. **Customization** - Theming, styling, and behavior configuration

## Widget Types

### Content List Widget
Displays a list of content items (articles, posts, etc.) with pagination and filtering.

**Features:**
- Configurable item count per page
- Show/hide images, excerpts, dates, authors, categories, tags
- Content filtering by categories, tags, status
- Multiple sort orders (date, title, etc.)
- Pagination or infinite scroll
- Search functionality

### Single Content Widget
Displays a single piece of content in detail.

**Features:**
- Full content display
- Configurable metadata display
- Custom styling options
- Click tracking

### Category Feed Widget
Displays content from specific categories.

**Features:**
- Category-specific content filtering
- All content list features
- Category-based theming

### Search Widget
Provides search functionality for content.

**Features:**
- Real-time search
- Search result display
- Search analytics

### Newsletter Widget
Displays newsletter signup form.

**Features:**
- Email collection
- Custom styling
- Integration with email services

## API Endpoints

### Protected Endpoints (Require Authentication)

#### Widget Management
- `POST /api/websites/{websiteId}/widgets` - Create widget
- `GET /api/websites/{websiteId}/widgets` - List widgets
- `GET /api/websites/{websiteId}/widgets/{widgetId}` - Get widget
- `PUT /api/websites/{websiteId}/widgets/{widgetId}` - Update widget
- `DELETE /api/websites/{websiteId}/widgets/{widgetId}` - Delete widget

#### Widget Tools
- `GET /api/websites/{websiteId}/widgets/{widgetId}/embed-code` - Generate embed code
- `GET /api/websites/{websiteId}/widgets/{widgetId}/analytics` - Get analytics

### Public Endpoints (No Authentication)

#### Widget Rendering
- `GET /api/widgets/{widgetId}/render` - Render widget content (JSON)
- `GET /api/widgets/{widgetId}/preview` - Preview widget (HTML)
- `POST /api/widgets/{widgetId}/track` - Track widget events

## Widget Configuration

### Basic Configuration
```json
{
  "widget_name": "Latest Articles",
  "widget_type": "content_list",
  "title": "Recent Blog Posts",
  "description": "Stay updated with our latest articles",
  "items_per_page": 10,
  "is_public": true
}
```

### Display Configuration
```json
{
  "show_images": true,
  "show_excerpts": true,
  "show_dates": true,
  "show_authors": false,
  "show_categories": true,
  "show_tags": false
}
```

### Content Filtering
```json
{
  "content_filters": {
    "category_ids": ["cat1", "cat2"],
    "tag_ids": ["tag1"],
    "status": "published"
  },
  "sort_order": "created_at_desc"
}
```

### Styling Configuration
```json
{
  "theme": "default",
  "width": "100%",
  "height": "auto",
  "border_radius": "8px",
  "padding": "16px",
  "custom_css": ".widget { background: #f5f5f5; }"
}
```

### Behavior Configuration
```json
{
  "auto_refresh": false,
  "refresh_interval": 300,
  "enable_search": true,
  "enable_pagination": true,
  "enable_infinite_scroll": false,
  "open_links_in_new_tab": true
}
```

### Access Control
```json
{
  "is_public": true,
  "allowed_domains": ["example.com", "blog.example.com"],
  "require_authentication": false
}
```

### Analytics Configuration
```json
{
  "track_clicks": true,
  "track_views": true,
  "custom_events": [
    {
      "name": "newsletter_signup",
      "selector": ".newsletter-form"
    }
  ]
}
```

## Embed Methods

### Method 1: Generated Embed Code
```html
<!-- StorySlip Widget: Latest Articles -->
<div id="storyslip-widget-123" style="width: 100%; height: auto;"></div>
<script>
(function() {
  var script = document.createElement('script');
  script.src = 'https://widget.storyslip.com/widget.js';
  script.async = true;
  script.onload = function() {
    StorySlipWidget.render({
      widgetId: 'widget-123',
      websiteId: 'website-456',
      containerId: 'storyslip-widget-123',
      theme: 'default',
      width: '100%',
      height: 'auto',
      trackViews: true,
      trackClicks: true,
      openLinksInNewTab: true
    });
  };
  document.head.appendChild(script);
})();
</script>
<!-- End StorySlip Widget -->
```

### Method 2: Data Attributes (Auto-initialization)
```html
<div 
  id="my-widget"
  data-storyslip-widget
  data-widget-id="widget-123"
  data-website-id="website-456"
  data-theme="minimal"
  data-width="100%"
  data-height="400px"
  data-track-views="true"
  data-track-clicks="true"
  data-open-links-new-tab="true">
</div>
<script src="https://widget.storyslip.com/widget.js" async></script>
```

### Method 3: Manual JavaScript
```html
<div id="my-widget"></div>
<script src="https://widget.storyslip.com/widget.js" async></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  const widget = StorySlipWidget.render({
    widgetId: 'widget-123',
    websiteId: 'website-456',
    containerId: 'my-widget',
    theme: 'card',
    trackViews: true,
    trackClicks: true
  });
  
  // Widget API methods
  // widget.refresh();
  // widget.goToPage(2);
  // widget.search('query');
  // widget.destroy();
});
</script>
```

## Themes

### Default Theme
Clean, minimal design with good readability.

### Card Theme
Card-based layout with shadows and rounded corners.

### List Theme
Simple list layout, compact and efficient.

### Minimal Theme
Ultra-minimal design with minimal styling.

### Custom Theme
Use `custom_css` to override default styles:

```css
.storyslip-widget {
  font-family: 'Custom Font', sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.storyslip-item-title a {
  color: #fff;
  text-decoration: none;
}

.storyslip-item-title a:hover {
  text-decoration: underline;
}
```

## Analytics

### Tracked Events

#### View Events
Automatically tracked when widget loads:
```json
{
  "event_type": "view",
  "event_data": {
    "page": 1,
    "referrer": "https://example.com/blog",
    "url": "https://example.com/blog/page"
  }
}
```

#### Click Events
Tracked when users click content links:
```json
{
  "event_type": "click",
  "event_data": {
    "content_id": "content-123",
    "content_title": "Article Title",
    "content_url": "/article-slug",
    "page": 1
  }
}
```

#### Interaction Events
Custom events for specific interactions:
```json
{
  "event_type": "interaction",
  "event_data": {
    "interaction_type": "search",
    "search_query": "javascript",
    "results_count": 15
  }
}
```

### Analytics Dashboard Data

#### Overview Metrics
- Total views
- Total clicks
- Total interactions
- Click-through rate (CTR)
- Average time on widget

#### Time-based Analytics
- Views by day/week/month
- Clicks by day/week/month
- Peak usage times

#### Content Performance
- Most viewed content
- Most clicked content
- Content engagement rates

#### Traffic Sources
- Top referrer domains
- Direct vs. referral traffic
- Geographic distribution (if available)

## Security Features

### Domain Restrictions
Limit widget embedding to specific domains:
```json
{
  "allowed_domains": ["example.com", "blog.example.com"]
}
```

### Rate Limiting
- Widget rendering: 200 requests/minute per IP
- Event tracking: 500 events/minute per IP
- Widget management: Standard API limits

### Content Security
- XSS protection in rendered content
- Sanitized HTML output
- Safe CSS injection

### Privacy
- No personal data collection by default
- GDPR-compliant tracking
- Optional IP anonymization

## Performance Optimization

### Caching
- Widget content cached for 5 minutes
- CSS cached until widget update
- CDN distribution for embed script

### Loading
- Async script loading
- Progressive enhancement
- Graceful degradation

### Size Optimization
- Minified embed script (~15KB gzipped)
- Optimized CSS generation
- Lazy loading for images

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- Fallback to cached content
- User-friendly error messages

### Configuration Errors
- Validation of widget configuration
- Default fallbacks for missing options
- Clear error reporting

### Rendering Errors
- Graceful degradation
- Error state UI
- Retry mechanisms

## Browser Support

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Android Chrome 60+

### Polyfills Included
- Fetch API
- Intersection Observer (for infinite scroll)
- Custom Elements (if needed)

## Development

### Building the Widget
```bash
cd packages/widget
npm run build
```

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Local Development
```bash
# Start development server
npm run dev

# Watch for changes
npm run watch
```

## Deployment

### CDN Deployment
The widget script is deployed to a CDN for global distribution:
- Production: `https://widget.storyslip.com/widget.js`
- Development: `https://widget-dev.storyslip.com/widget.js`

### Version Management
- Semantic versioning for widget releases
- Backward compatibility maintained
- Migration guides for breaking changes

## Troubleshooting

### Common Issues

#### Widget Not Loading
1. Check container element exists
2. Verify widget ID and website ID
3. Check browser console for errors
4. Verify domain restrictions

#### Styling Issues
1. Check CSS conflicts
2. Verify custom CSS syntax
3. Use browser dev tools to inspect
4. Check theme configuration

#### Analytics Not Working
1. Verify tracking is enabled
2. Check network requests in dev tools
3. Verify widget is public
4. Check rate limiting

#### Performance Issues
1. Check widget size and complexity
2. Verify CDN is being used
3. Check for JavaScript conflicts
4. Monitor network requests

### Debug Mode
Enable debug mode for detailed logging:
```javascript
StorySlipWidget.render({
  // ... config
  debug: true
});
```

### Support
For technical support:
- Documentation: https://docs.storyslip.com/widgets
- Support: support@storyslip.com
- Community: https://community.storyslip.com
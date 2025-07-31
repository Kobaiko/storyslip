# Widget Integration Guide

The StorySlip widget is a lightweight JavaScript library that allows you to embed dynamic content from your StorySlip CMS into any website. This guide covers installation, configuration, and customization options.

## Quick Start

### Basic Installation

Add the widget script to your HTML page:

```html
<script src="https://widget.storyslip.com/embed.js" 
        data-website-id="your-website-id">
</script>
```

The widget will automatically find a container element and render your content.

### Custom Container

Specify a custom container for the widget:

```html
<div id="my-content"></div>
<script src="https://widget.storyslip.com/embed.js" 
        data-website-id="your-website-id"
        data-container="#my-content">
</script>
```

## Configuration Options

### Data Attributes

Configure the widget using data attributes on the script tag:

```html
<script src="https://widget.storyslip.com/embed.js" 
        data-website-id="your-website-id"
        data-container="#content"
        data-theme="dark"
        data-layout="grid"
        data-limit="10"
        data-category="technology"
        data-auto-load="true"
        data-show-pagination="true">
</script>
```

#### Available Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-website-id` | string | **required** | Your website ID from StorySlip dashboard |
| `data-container` | string | `body` | CSS selector for the container element |
| `data-theme` | string | `light` | Theme: `light`, `dark`, or `auto` |
| `data-layout` | string | `list` | Layout: `list`, `grid`, `cards`, or `minimal` |
| `data-limit` | number | `20` | Number of content items to load |
| `data-category` | string | `null` | Filter by category slug |
| `data-tag` | string | `null` | Filter by tag slug |
| `data-auto-load` | boolean | `true` | Automatically load content on page load |
| `data-show-pagination` | boolean | `true` | Show pagination controls |
| `data-show-search` | boolean | `false` | Show search functionality |
| `data-show-filters` | boolean | `false` | Show category/tag filters |
| `data-animation` | string | `fade` | Animation: `fade`, `slide`, `none` |
| `data-responsive` | boolean | `true` | Enable responsive design |

### JavaScript Configuration

For more advanced configuration, use the JavaScript API:

```html
<div id="storyslip-widget"></div>
<script src="https://widget.storyslip.com/embed.js"></script>
<script>
  StorySlip.init({
    websiteId: 'your-website-id',
    container: '#storyslip-widget',
    theme: 'dark',
    layout: 'grid',
    limit: 12,
    onLoad: function(content) {
      console.log('Content loaded:', content);
    },
    onError: function(error) {
      console.error('Widget error:', error);
    },
    customStyles: {
      primaryColor: '#3B82F6',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '8px'
    }
  });
</script>
```

## Layouts and Themes

### Available Layouts

#### List Layout (Default)
```html
<script data-layout="list" ...></script>
```
- Vertical list of content items
- Shows title, excerpt, and metadata
- Good for blogs and news sites

#### Grid Layout
```html
<script data-layout="grid" ...></script>
```
- Responsive grid of content cards
- Shows featured images prominently
- Perfect for portfolios and galleries

#### Cards Layout
```html
<script data-layout="cards" ...></script>
```
- Card-based design with shadows
- Hover effects and animations
- Modern, clean appearance

#### Minimal Layout
```html
<script data-layout="minimal" ...></script>
```
- Clean, text-focused design
- Minimal visual elements
- Fast loading and accessible

### Themes

#### Light Theme (Default)
```html
<script data-theme="light" ...></script>
```

#### Dark Theme
```html
<script data-theme="dark" ...></script>
```

#### Auto Theme
```html
<script data-theme="auto" ...></script>
```
Automatically switches between light and dark based on user's system preference.

## Advanced Features

### Search and Filtering

Enable search and filtering capabilities:

```html
<script src="https://widget.storyslip.com/embed.js" 
        data-website-id="your-website-id"
        data-show-search="true"
        data-show-filters="true">
</script>
```

### Custom Styling

#### CSS Custom Properties

The widget supports CSS custom properties for easy theming:

```css
:root {
  --storyslip-primary-color: #3B82F6;
  --storyslip-secondary-color: #1E40AF;
  --storyslip-background-color: #ffffff;
  --storyslip-text-color: #374151;
  --storyslip-border-color: #E5E7EB;
  --storyslip-border-radius: 8px;
  --storyslip-font-family: 'Inter', sans-serif;
  --storyslip-font-size: 16px;
  --storyslip-line-height: 1.6;
}
```

#### Custom CSS Classes

Target specific widget elements:

```css
/* Widget container */
.storyslip-widget {
  max-width: 1200px;
  margin: 0 auto;
}

/* Content items */
.storyslip-item {
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid var(--storyslip-border-color);
  border-radius: var(--storyslip-border-radius);
}

/* Content titles */
.storyslip-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

/* Content excerpts */
.storyslip-excerpt {
  color: #6B7280;
  margin-bottom: 1rem;
}

/* Pagination */
.storyslip-pagination {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
}

/* Search box */
.storyslip-search {
  margin-bottom: 1.5rem;
}

/* Filters */
.storyslip-filters {
  margin-bottom: 1.5rem;
}
```

### JavaScript API

#### Initialization

```javascript
const widget = StorySlip.init({
  websiteId: 'your-website-id',
  container: '#content',
  // ... other options
});
```

#### Methods

```javascript
// Reload content
widget.reload();

// Load more content
widget.loadMore();

// Search content
widget.search('search query');

// Filter by category
widget.filterByCategory('technology');

// Filter by tag
widget.filterByTag('javascript');

// Clear filters
widget.clearFilters();

// Destroy widget
widget.destroy();
```

#### Events

```javascript
// Content loaded
widget.on('load', function(content) {
  console.log('Loaded content:', content);
});

// Content item clicked
widget.on('itemClick', function(item) {
  console.log('Clicked item:', item);
});

// Search performed
widget.on('search', function(query) {
  console.log('Search query:', query);
});

// Filter applied
widget.on('filter', function(filter) {
  console.log('Applied filter:', filter);
});

// Error occurred
widget.on('error', function(error) {
  console.error('Widget error:', error);
});
```

## Performance Optimization

### Lazy Loading

Enable lazy loading for better performance:

```html
<script src="https://widget.storyslip.com/embed.js" 
        data-website-id="your-website-id"
        data-lazy-load="true"
        data-lazy-threshold="200">
</script>
```

### Caching

The widget automatically caches content for improved performance. Configure cache settings:

```javascript
StorySlip.init({
  websiteId: 'your-website-id',
  cache: {
    enabled: true,
    duration: 300000, // 5 minutes in milliseconds
    storage: 'localStorage' // or 'sessionStorage'
  }
});
```

### Bundle Size

The widget is optimized for minimal bundle size:
- **Core widget**: ~15KB gzipped
- **With all features**: ~35KB gzipped
- **Lazy-loaded modules**: Additional features loaded on demand

## Responsive Design

The widget is fully responsive by default. Customize breakpoints:

```javascript
StorySlip.init({
  websiteId: 'your-website-id',
  responsive: {
    breakpoints: {
      mobile: 480,
      tablet: 768,
      desktop: 1024
    },
    layouts: {
      mobile: 'list',
      tablet: 'grid',
      desktop: 'grid'
    }
  }
});
```

## SEO Optimization

### Server-Side Rendering

For better SEO, use server-side rendering:

```html
<!-- Server-rendered content for SEO -->
<div id="storyslip-content">
  <article>
    <h2>Article Title</h2>
    <p>Article excerpt...</p>
  </article>
  <!-- More articles... -->
</div>

<!-- Widget will enhance the existing content -->
<script src="https://widget.storyslip.com/embed.js" 
        data-website-id="your-website-id"
        data-container="#storyslip-content"
        data-enhance="true">
</script>
```

### Meta Tags

The widget can automatically update meta tags:

```javascript
StorySlip.init({
  websiteId: 'your-website-id',
  seo: {
    updateMetaTags: true,
    titleTemplate: '%s | My Website',
    defaultDescription: 'Latest content from My Website'
  }
});
```

## Security

### Content Security Policy (CSP)

Add these directives to your CSP header:

```
script-src 'self' https://widget.storyslip.com;
connect-src 'self' https://api.storyslip.com;
img-src 'self' https://cdn.storyslip.com;
```

### API Key Security

Never expose your full API key in client-side code. The widget uses a public website ID that's safe to expose.

## Troubleshooting

### Common Issues

#### Widget Not Loading
```javascript
// Check if the script loaded correctly
if (typeof StorySlip === 'undefined') {
  console.error('StorySlip widget failed to load');
}

// Check for JavaScript errors
window.addEventListener('error', function(e) {
  if (e.filename && e.filename.includes('storyslip')) {
    console.error('StorySlip error:', e.message);
  }
});
```

#### Content Not Displaying
```javascript
// Enable debug mode
StorySlip.init({
  websiteId: 'your-website-id',
  debug: true, // Enables console logging
  onError: function(error) {
    console.error('Debug error:', error);
  }
});
```

#### Styling Issues
```css
/* Reset widget styles if needed */
.storyslip-widget * {
  box-sizing: border-box;
}

/* Ensure container has proper dimensions */
#storyslip-content {
  min-height: 200px;
  width: 100%;
}
```

### Debug Mode

Enable debug mode for detailed logging:

```html
<script src="https://widget.storyslip.com/embed.js" 
        data-website-id="your-website-id"
        data-debug="true">
</script>
```

## Integration Examples

### WordPress

```php
// Add to your theme's functions.php
function add_storyslip_widget() {
    ?>
    <script src="https://widget.storyslip.com/embed.js" 
            data-website-id="<?php echo get_option('storyslip_website_id'); ?>"
            data-container="#storyslip-content">
    </script>
    <?php
}
add_action('wp_footer', 'add_storyslip_widget');
```

### React

```jsx
import { useEffect, useRef } from 'react';

function StorySlipWidget({ websiteId, ...options }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.StorySlip) {
      window.StorySlip.init({
        websiteId,
        container: containerRef.current,
        ...options
      });
    }
  }, [websiteId, options]);

  return <div ref={containerRef} className="storyslip-widget" />;
}
```

### Vue.js

```vue
<template>
  <div ref="widgetContainer" class="storyslip-widget"></div>
</template>

<script>
export default {
  props: ['websiteId'],
  mounted() {
    if (window.StorySlip) {
      window.StorySlip.init({
        websiteId: this.websiteId,
        container: this.$refs.widgetContainer
      });
    }
  }
};
</script>
```

### Angular

```typescript
import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-storyslip-widget',
  template: '<div #widgetContainer class="storyslip-widget"></div>'
})
export class StorySlipWidgetComponent implements OnInit {
  @Input() websiteId: string;
  @ViewChild('widgetContainer', { static: true }) widgetContainer: ElementRef;

  ngOnInit() {
    if ((window as any).StorySlip) {
      (window as any).StorySlip.init({
        websiteId: this.websiteId,
        container: this.widgetContainer.nativeElement
      });
    }
  }
}
```

## Migration Guide

### From v1.x to v2.x

Key changes in v2.x:
- New JavaScript API with better error handling
- Improved responsive design
- Enhanced customization options
- Better performance and caching

Update your integration:

```javascript
// Old v1.x syntax
StorySlipWidget.render('website-id', '#container');

// New v2.x syntax
StorySlip.init({
  websiteId: 'website-id',
  container: '#container'
});
```

## Support

Need help with widget integration?

- **Documentation**: [https://docs.storyslip.com/widget](https://docs.storyslip.com/widget)
- **Examples**: [https://github.com/storyslip/widget-examples](https://github.com/storyslip/widget-examples)
- **Support**: [support@storyslip.com](mailto:support@storyslip.com)
- **Community**: [https://community.storyslip.com](https://community.storyslip.com)
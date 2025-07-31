# StorySlip Widget

A lightweight, embeddable JavaScript widget for displaying content and tracking analytics from your StorySlip CMS.

## Features

- **Content Display**: Show your latest content from StorySlip CMS
- **Analytics Tracking**: Automatic page view and event tracking
- **Privacy-Friendly**: Configurable cookie usage and tracking options
- **Lightweight**: Minimal footprint with no external dependencies
- **Customizable**: Flexible theming and styling options
- **SPA Support**: Automatic tracking for single-page applications

## Installation

### CDN (Recommended)

```html
<script src="https://cdn.storyslip.com/widget/v1/storyslip-widget.js"></script>
```

### NPM

```bash
npm install @storyslip/widget
```

## Quick Start

### Basic Setup

```html
<!DOCTYPE html>
<html>
<head>
    <meta name="storyslip:content-id" content="your-content-id">
</head>
<body>
    <div id="storyslip-widget"></div>
    
    <script src="https://cdn.storyslip.com/widget/v1/storyslip-widget.js"></script>
    <script>
        StorySlip.init({
            apiKey: 'your-api-key',
            domain: 'yourdomain.com'
        }, 'storyslip-widget');
    </script>
</body>
</html>
```

### ES Modules

```javascript
import StorySlip from '@storyslip/widget';

StorySlip.init({
    apiKey: 'your-api-key',
    domain: 'yourdomain.com'
}, 'storyslip-widget');
```

## Configuration Options

```javascript
StorySlip.init({
    // Required
    apiKey: 'your-api-key',           // Your StorySlip API key
    domain: 'yourdomain.com',         // Your website domain
    
    // Optional
    apiUrl: 'https://api.storyslip.com',  // API endpoint (default)
    theme: 'light',                   // 'light', 'dark', or 'auto'
    displayMode: 'inline',            // 'inline', 'popup', or 'sidebar'
    itemsPerPage: 10,                 // Number of content items to show
    position: 'bottom-right',         // Widget position (if not inline)
    
    // Privacy & Tracking
    disableTracking: false,           // Disable all analytics tracking
    disableCookies: false,            // Use sessionStorage instead of cookies
    
    // Styling
    customStyles: {                   // Custom CSS styles
        backgroundColor: '#ffffff',
        borderRadius: '8px'
    }
}, 'widget-container-id');
```

## Analytics Tracking

The widget automatically tracks:

- **Page Views**: Every page load and navigation
- **Content Views**: When content is displayed
- **User Interactions**: Clicks, scrolls, and custom events

### Manual Event Tracking

```javascript
// Track custom events
StorySlip.trackEvent('interaction', 'button_click', {
    buttonText: 'Subscribe',
    location: 'header'
});

// Track page views manually
StorySlip.trackPageView({
    url: '/custom-page',
    contentId: 'content-123'
});
```

### Privacy Compliance

The widget is designed with privacy in mind:

```javascript
StorySlip.init({
    apiKey: 'your-api-key',
    domain: 'yourdomain.com',
    disableTracking: true,    // Completely disable tracking
    disableCookies: true,     // Use sessionStorage only
});
```

## Content Meta Tags

Add meta tags to your pages for better content tracking:

```html
<meta name="storyslip:content-id" content="your-content-id">
<meta name="storyslip:content-type" content="article">
<meta name="storyslip:category" content="blog">
```

## Styling

### Default Themes

The widget comes with built-in themes:

```javascript
StorySlip.init({
    // ... other options
    theme: 'light',  // or 'dark', 'auto'
});
```

### Custom Styling

```javascript
StorySlip.init({
    // ... other options
    customStyles: {
        backgroundColor: '#f8f9fa',
        borderColor: '#dee2e6',
        textColor: '#212529',
        borderRadius: '12px',
        padding: '20px'
    }
});
```

### CSS Classes

You can also style the widget using CSS:

```css
.storyslip-widget {
    border: 2px solid #007bff;
    border-radius: 10px;
}

.storyslip-header h3 {
    color: #007bff;
    font-size: 20px;
}

.storyslip-content-item {
    padding: 15px 0;
}
```

## API Reference

### StorySlip.init(config, containerId?)

Initialize the widget with configuration options.

- `config` (object): Configuration options
- `containerId` (string, optional): DOM element ID to render the widget

### StorySlip.trackPageView(data?)

Manually track a page view.

- `data` (object, optional): Additional page view data
  - `url` (string): Page URL
  - `contentId` (string): Content identifier

### StorySlip.trackEvent(eventType, eventName, eventData?)

Track a custom event.

- `eventType` (string): Type of event (e.g., 'interaction', 'conversion')
- `eventName` (string): Name of the event (e.g., 'button_click')
- `eventData` (object, optional): Additional event data

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Examples

### Blog Widget

```html
<div id="blog-widget"></div>
<script>
    StorySlip.init({
        apiKey: 'your-api-key',
        domain: 'yourblog.com',
        displayMode: 'inline',
        itemsPerPage: 5,
        theme: 'light'
    }, 'blog-widget');
</script>
```

### Privacy-First Setup

```html
<script>
    StorySlip.init({
        apiKey: 'your-api-key',
        domain: 'yoursite.com',
        disableCookies: true,
        customStyles: {
            fontSize: '14px',
            padding: '16px'
        }
    });
</script>
```

## Support

For support and documentation, visit [docs.storyslip.com](https://docs.storyslip.com) or contact support@storyslip.com.

## License

MIT License - see LICENSE file for details.
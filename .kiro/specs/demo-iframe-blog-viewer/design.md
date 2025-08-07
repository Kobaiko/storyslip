# Demo Iframe Blog Viewer Design

## Overview

This design implements an iframe-based blog post viewer that integrates seamlessly with the existing demo section. When users click on blog posts in the demo widget, the content will be displayed in an iframe that overlays or replaces the current demo view, providing an immersive reading experience without leaving the demo context.

## Architecture

### Component Structure

```
DemoSection
├── WidgetPreview
│   ├── ContentCard (with iframe click handlers)
│   ├── ContentListItem (with iframe click handlers)
│   └── ContentCardLarge (with iframe click handlers)
└── IframeBlogViewer (new component)
    ├── IframeContainer
    ├── IframeHeader (with back button)
    ├── LoadingState
    └── ErrorState
```

### State Management

The demo section will manage the iframe state:
- `showIframe: boolean` - Controls iframe visibility
- `iframeUrl: string | null` - URL of the blog post to display
- `isLoading: boolean` - Loading state for iframe content
- `error: string | null` - Error state for failed loads

## Components and Interfaces

### IframeBlogViewer Component

```typescript
interface IframeBlogViewerProps {
  isOpen: boolean;
  blogUrl: string | null;
  onClose: () => void;
  deviceWidth: string; // From parent demo controls
}
```

**Features:**
- Full-screen overlay with iframe container
- Responsive design that adapts to demo device controls
- Loading states and error handling
- Smooth enter/exit animations
- Back button and close functionality

### Updated WidgetPreview Component

**Changes:**
- Replace modal click handlers with iframe handlers
- Pass iframe callback function to content components
- Maintain existing theme and layout functionality

### Blog Post URL Mapping

```typescript
const blogPostUrls: Record<string, string> = {
  'getting-started-with-storyslip': '/blog/getting-started-with-storyslip',
  'advanced-widget-customization': '/blog/advanced-widget-customization',
  'performance-optimization-tips': '/blog/performance-optimization-tips'
};
```

## Data Models

### Iframe State Interface

```typescript
interface IframeState {
  isOpen: boolean;
  url: string | null;
  isLoading: boolean;
  error: string | null;
}
```

### Blog Post Reference

```typescript
interface BlogPostReference {
  slug: string;
  url: string;
  title: string;
}
```

## Error Handling

### Loading States
1. **Initial Load**: Show skeleton/spinner while iframe loads
2. **Content Load**: Monitor iframe load events
3. **Timeout**: 10-second timeout for failed loads
4. **Retry**: Allow users to retry failed loads

### Error Scenarios
- Network connectivity issues
- Blog post not found (404)
- Iframe loading timeout
- Cross-origin policy violations

### Error Recovery
- Display user-friendly error messages
- Provide retry button
- Fallback to external link option
- Graceful degradation to modal or new tab

## Testing Strategy

### Unit Tests
- IframeBlogViewer component rendering
- State management and transitions
- Error handling scenarios
- Click handler functionality

### Integration Tests
- Demo section with iframe integration
- Device responsiveness
- Loading and error states
- Navigation flow testing

### E2E Tests
- Complete user journey from demo to blog post
- Cross-device compatibility
- Performance and loading times
- Error recovery flows

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Only load iframe when requested
2. **Preloading**: Optionally preload popular blog posts
3. **Caching**: Browser caching for iframe content
4. **Resource Cleanup**: Proper iframe disposal on close

### Monitoring
- Track iframe load times
- Monitor error rates
- Measure user engagement with iframe content
- Performance metrics for different devices

## Security Considerations

### Iframe Security
```html
<iframe
  src={blogUrl}
  sandbox="allow-scripts allow-same-origin allow-popups"
  referrerPolicy="strict-origin-when-cross-origin"
  loading="lazy"
/>
```

### Content Security Policy
- Ensure iframe sources are whitelisted
- Prevent unauthorized script execution
- Maintain proper origin isolation

## Responsive Design

### Desktop (1200px+)
- Iframe takes 80% of demo section width
- Side margins for visual breathing room
- Full height with proper aspect ratio

### Tablet (768px - 1199px)
- Iframe takes 90% of available width
- Adjusted header and controls
- Optimized touch interactions

### Mobile (< 768px)
- Full-width iframe display
- Simplified header with larger touch targets
- Optimized scrolling behavior

## Animation and Transitions

### Enter Animation
```css
.iframe-viewer-enter {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.iframe-viewer-enter-active {
  opacity: 1;
  transform: scale(1) translateY(0);
  transition: all 300ms ease-out;
}
```

### Exit Animation
```css
.iframe-viewer-exit {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.iframe-viewer-exit-active {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
  transition: all 250ms ease-in;
}
```

## Implementation Phases

### Phase 1: Core Iframe Component
- Create IframeBlogViewer component
- Implement basic iframe functionality
- Add loading and error states

### Phase 2: Demo Integration
- Update WidgetPreview click handlers
- Integrate iframe with demo section
- Add responsive design support

### Phase 3: Enhanced Features
- Add smooth animations
- Implement advanced error handling
- Optimize performance and loading

### Phase 4: Testing and Polish
- Comprehensive testing across devices
- Performance optimization
- User experience refinements
# Implementation Plan

- [x] 1. Create IframeBlogViewer component with basic functionality
  - Create the main IframeBlogViewer component with props interface
  - Implement iframe container with proper styling and responsive design
  - Add loading state with spinner/skeleton UI
  - Add error state with retry functionality
  - Implement close/back button with proper event handling
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.2, 3.3_

- [x] 2. Integrate iframe viewer with DemoSection component
  - Add iframe state management to DemoSection (isOpen, url, loading, error)
  - Create handleOpenIframe and handleCloseIframe functions
  - Pass iframe handlers down to WidgetPreview component
  - Add IframeBlogViewer component to DemoSection render
  - Implement smooth transitions between demo and iframe views
  - _Requirements: 1.1, 2.2, 2.3, 4.4_

- [x] 3. Update WidgetPreview to use iframe handlers
  - Replace BlogPostModal import and usage with iframe handlers
  - Update handlePostClick to call iframe handler instead of modal
  - Remove modal-related state and functions
  - Pass iframe click handler to all content components
  - Create blog post URL mapping for iframe sources
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Update content components click handlers
  - Modify ContentCard component to use iframe click handler
  - Update ContentListItem component to use iframe click handler  
  - Update ContentCardLarge component to use iframe click handler
  - Ensure all components prevent default link navigation
  - Test click handling across all layout types (grid, list, cards)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Implement responsive iframe design
  - Add responsive CSS for desktop, tablet, and mobile viewports
  - Implement device-aware iframe sizing based on demo device controls
  - Add proper aspect ratio handling for different screen sizes
  - Test iframe display across all demo device size options
  - Ensure iframe content remains readable on all devices
  - _Requirements: 1.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Add iframe security and performance optimizations
  - Implement proper iframe sandbox attributes for security
  - Add loading timeout handling (10 second limit)
  - Implement proper resource cleanup on iframe close
  - Add error boundary for iframe-related errors
  - Test cross-origin policy handling
  - _Requirements: 3.1, 3.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Enhance user experience with animations and polish
  - Add smooth enter/exit animations using Framer Motion
  - Implement loading skeleton that matches blog post layout
  - Add keyboard navigation support (ESC to close)
  - Optimize iframe loading performance
  - Add accessibility attributes and ARIA labels
  - _Requirements: 2.3, 3.2, 5.4_

- [ ] 8. Test iframe functionality across all scenarios
  - Test all three blog posts load correctly in iframe
  - Verify responsive behavior on different device sizes
  - Test error handling for network failures and timeouts
  - Verify iframe security and isolation
  - Test performance and loading times
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 6.1, 6.2_
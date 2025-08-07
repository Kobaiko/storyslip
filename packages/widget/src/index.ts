// StorySlip Widget Entry Point - Simple Version for Showcase
export { StorySlipWidget } from './widget-simple';
export type { WidgetConfig, ContentItem } from './widget-simple';

// Auto-initialize widgets on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Auto-initialize widgets with data attributes
    const widgets = document.querySelectorAll('[data-storyslip-widget]');
    widgets.forEach((element) => {
      const config = {
        websiteId: element.getAttribute('data-website-id') || 'demo',
        theme: (element.getAttribute('data-theme') as any) || 'modern',
        limit: parseInt(element.getAttribute('data-limit') || '5')
      };
      
      import('./widget-simple').then(({ StorySlipWidget }) => {
        new StorySlipWidget(element as HTMLElement, config);
      });
    });
  });
}
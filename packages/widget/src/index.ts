/**
 * StorySlip Widget - Lightweight Embeddable Content Widget
 * Optimized for minimal footprint (<50KB) with progressive enhancement
 * Supports multiple display modes and automatic styling inheritance
 */

import StorySlipWidget from './widget';
import analytics from './analytics';

// Export widget class and analytics for advanced usage
export { StorySlipWidget, analytics };

// Create global instance for simple usage
const storyslip = new StorySlipWidget();

// Auto-initialize if config is found in window
if (typeof window !== 'undefined' && (window as any).StorySlipConfig) {
  storyslip.init((window as any).StorySlipConfig);
}

// Global initialization function for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).StorySlip = {
    init: (config: any, containerId?: string) => {
      storyslip.init(config, containerId);
    },
    show: () => storyslip.show(),
    hide: () => storyslip.hide(),
    toggle: () => storyslip.toggle(),
    refresh: () => storyslip.refresh(),
    destroy: () => storyslip.destroy(),
    trackPageView: (data?: { url?: string; contentId?: string }) => {
      analytics.trackPageView(data);
    },
    trackEvent: (eventType: string, eventName: string, eventData?: Record<string, any>) => {
      analytics.trackEvent({
        eventType,
        eventName,
        eventData,
      });
    },
  };
}

export default storyslip;
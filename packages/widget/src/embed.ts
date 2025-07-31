/**
 * StorySlip Widget Embed Script
 * This script is loaded on external websites to render StorySlip widgets
 */

interface StorySlipWidgetConfig {
  widgetId: string;
  websiteId: string;
  containerId: string;
  theme?: string;
  width?: string;
  height?: string;
  trackViews?: boolean;
  trackClicks?: boolean;
  openLinksInNewTab?: boolean;
  apiBaseUrl?: string;
}

interface WidgetRenderResponse {
  html: string;
  css: string;
  data: any;
  meta: {
    title?: string;
    description?: string;
  };
}

class StorySlipWidget {
  private static instances: Map<string, StorySlipWidget> = new Map();
  private config: StorySlipWidgetConfig;
  private container: HTMLElement | null = null;
  private sessionId: string;
  private currentPage: number = 1;
  private isLoading: boolean = false;

  constructor(config: StorySlipWidgetConfig) {
    this.config = {
      apiBaseUrl: 'https://api.storyslip.com',
      trackViews: true,
      trackClicks: true,
      openLinksInNewTab: true,
      ...config,
    };
    this.sessionId = this.generateSessionId();
  }

  /**
   * Render widget in the specified container
   */
  static render(config: StorySlipWidgetConfig): StorySlipWidget {
    const widget = new StorySlipWidget(config);
    widget.init();
    StorySlipWidget.instances.set(config.containerId, widget);
    return widget;
  }

  /**
   * Get widget instance by container ID
   */
  static getInstance(containerId: string): StorySlipWidget | undefined {
    return StorySlipWidget.instances.get(containerId);
  }

  /**
   * Initialize the widget
   */
  private async init(): Promise<void> {
    try {
      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        console.error(`StorySlip Widget: Container with ID "${this.config.containerId}" not found`);
        return;
      }

      // Add loading state
      this.showLoading();

      // Load widget content
      await this.loadWidget();

      // Track initial view
      if (this.config.trackViews) {
        this.trackEvent('view', {
          page: this.currentPage,
          referrer: document.referrer,
          url: window.location.href,
        });
      }
    } catch (error) {
      console.error('StorySlip Widget: Failed to initialize', error);
      this.showError('Failed to load widget');
    }
  }

  /**
   * Load widget content from API
   */
  private async loadWidget(page: number = 1, search?: string): Promise<void> {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const params = new URLSearchParams();
      if (page > 1) params.append('page', page.toString());
      if (search) params.append('search', search);

      const url = `${this.config.apiBaseUrl}/widgets/${this.config.widgetId}/render?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: { data: WidgetRenderResponse } = await response.json();
      const widgetData = result.data;

      // Inject CSS if not already present
      this.injectCSS(widgetData.css);

      // Render HTML
      this.renderHTML(widgetData.html);

      // Set up event listeners
      this.setupEventListeners();

      // Update page state
      this.currentPage = page;

    } catch (error) {
      console.error('StorySlip Widget: Failed to load content', error);
      this.showError('Failed to load content');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Inject CSS styles
   */
  private injectCSS(css: string): void {
    const styleId = `storyslip-widget-styles-${this.config.widgetId}`;
    
    // Remove existing styles
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new styles
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Render HTML content
   */
  private renderHTML(html: string): void {
    if (!this.container) return;
    
    this.container.innerHTML = html;
  }

  /**
   * Set up event listeners for widget interactions
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    // Handle pagination clicks
    const paginationButtons = this.container.querySelectorAll('.storyslip-page-btn');
    paginationButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt((e.target as HTMLElement).getAttribute('data-page') || '1');
        this.loadWidget(page);
      });
    });

    // Handle content link clicks
    const contentLinks = this.container.querySelectorAll('.storyslip-item-link, .storyslip-content-link');
    contentLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        if (this.config.trackClicks) {
          const contentId = (e.target as HTMLElement).closest('[data-content-id]')?.getAttribute('data-content-id');
          const title = (e.target as HTMLElement).textContent || '';
          const url = (e.target as HTMLAnchorElement).href;
          
          this.trackEvent('click', {
            content_id: contentId,
            content_title: title,
            content_url: url,
            page: this.currentPage,
          });
        }

        // Handle link opening behavior
        if (this.config.openLinksInNewTab) {
          (e.target as HTMLAnchorElement).target = '_blank';
          (e.target as HTMLAnchorElement).rel = 'noopener noreferrer';
        }
      });
    });

    // Handle search if enabled
    const searchInput = this.container.querySelector('.storyslip-search-input') as HTMLInputElement;
    if (searchInput) {
      let searchTimeout: NodeJS.Timeout;
      
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          const query = (e.target as HTMLInputElement).value;
          this.loadWidget(1, query);
        }, 500);
      });
    }

    // Handle infinite scroll if enabled
    const widgetElement = this.container.querySelector('.storyslip-widget');
    if (widgetElement && widgetElement.classList.contains('infinite-scroll')) {
      this.setupInfiniteScroll();
    }
  }

  /**
   * Set up infinite scroll functionality
   */
  private setupInfiniteScroll(): void {
    if (!this.container) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading) {
          this.loadWidget(this.currentPage + 1);
        }
      });
    }, {
      rootMargin: '100px',
    });

    // Observe the last item in the widget
    const lastItem = this.container.querySelector('.storyslip-item:last-child');
    if (lastItem) {
      observer.observe(lastItem);
    }
  }

  /**
   * Track widget events
   */
  private async trackEvent(eventType: 'view' | 'click' | 'interaction', eventData: Record<string, any> = {}): Promise<void> {
    try {
      const url = `${this.config.apiBaseUrl}/widgets/${this.config.widgetId}/track`;
      
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
        },
        body: JSON.stringify({
          event_type: eventType,
          event_data: eventData,
          website_id: this.config.websiteId,
        }),
      });
    } catch (error) {
      // Silently fail for tracking errors
      console.debug('StorySlip Widget: Failed to track event', error);
    }
  }

  /**
   * Show loading state
   */
  private showLoading(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="storyslip-widget-loading">
        <div class="storyslip-spinner"></div>
        <p>Loading content...</p>
      </div>
    `;
    
    // Add loading styles
    this.injectCSS(`
      .storyslip-widget-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
      }
      
      .storyslip-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #007bff;
        border-radius: 50%;
        animation: storyslip-spin 1s linear infinite;
        margin-bottom: 16px;
      }
      
      @keyframes storyslip-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .storyslip-widget-loading p {
        margin: 0;
        color: #666;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `);
  }

  /**
   * Show error state
   */
  private showError(message: string): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="storyslip-widget-error">
        <p>⚠️ ${message}</p>
        <button class="storyslip-retry-btn" onclick="this.closest('.storyslip-widget-error').dispatchEvent(new CustomEvent('retry'))">
          Retry
        </button>
      </div>
    `;
    
    // Add error styles
    this.injectCSS(`
      .storyslip-widget-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        background: #fff5f5;
        border: 1px solid #fed7d7;
        border-radius: 8px;
      }
      
      .storyslip-widget-error p {
        margin: 0 0 16px 0;
        color: #c53030;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .storyslip-retry-btn {
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .storyslip-retry-btn:hover {
        background: #0056b3;
      }
    `);
    
    // Handle retry
    const errorContainer = this.container.querySelector('.storyslip-widget-error');
    if (errorContainer) {
      errorContainer.addEventListener('retry', () => {
        this.init();
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return 'ss_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Refresh widget content
   */
  public refresh(): void {
    this.loadWidget(this.currentPage);
  }

  /**
   * Navigate to specific page
   */
  public goToPage(page: number): void {
    this.loadWidget(page);
  }

  /**
   * Search widget content
   */
  public search(query: string): void {
    this.loadWidget(1, query);
  }

  /**
   * Destroy widget instance
   */
  public destroy(): void {
    // Remove CSS
    const styleId = `storyslip-widget-styles-${this.config.widgetId}`;
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Remove from instances
    StorySlipWidget.instances.delete(this.config.containerId);
  }
}

// Make StorySlipWidget available globally
(window as any).StorySlipWidget = StorySlipWidget;

// Auto-initialize widgets with data attributes
document.addEventListener('DOMContentLoaded', () => {
  const autoWidgets = document.querySelectorAll('[data-storyslip-widget]');
  autoWidgets.forEach((element) => {
    const config = {
      widgetId: element.getAttribute('data-widget-id'),
      websiteId: element.getAttribute('data-website-id'),
      containerId: element.id,
      theme: element.getAttribute('data-theme'),
      width: element.getAttribute('data-width'),
      height: element.getAttribute('data-height'),
      trackViews: element.getAttribute('data-track-views') !== 'false',
      trackClicks: element.getAttribute('data-track-clicks') !== 'false',
      openLinksInNewTab: element.getAttribute('data-open-links-new-tab') !== 'false',
    };

    if (config.widgetId && config.websiteId && config.containerId) {
      StorySlipWidget.render(config as StorySlipWidgetConfig);
    }
  });
});

export { StorySlipWidget, type StorySlipWidgetConfig };
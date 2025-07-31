/**
 * StorySlip Widget - Lightweight Embeddable Content Widget
 * Optimized for minimal footprint (<50KB) with progressive enhancement
 * Supports multiple display modes and automatic styling inheritance
 */

interface StorySlipConfig {
  apiKey: string;
  domain: string;
  apiUrl?: string;
  disableTracking?: boolean;
  disableCookies?: boolean;
  theme?: 'light' | 'dark' | 'auto' | 'inherit';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  customStyles?: Record<string, string>;
  displayMode?: 'inline' | 'popup' | 'sidebar' | 'modal' | 'floating';
  itemsPerPage?: number;
  autoResize?: boolean;
  inheritStyles?: boolean;
  animation?: 'fade' | 'slide' | 'none';
  responsive?: boolean;
  lazyLoad?: boolean;
  cacheContent?: boolean;
  showPoweredBy?: boolean;
  maxWidth?: string;
  maxHeight?: string;
  borderRadius?: string;
  shadow?: boolean;
  closeButton?: boolean;
  overlay?: boolean;
  zIndex?: number;
}

interface ContentItem {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  published_at: string;
  featured_image_url?: string;
}

class StorySlipWidget {
  private config: StorySlipConfig;
  private containerElement: HTMLElement | null = null;
  private widgetElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private initialized: boolean = false;
  private isVisible: boolean = false;
  private contentCache: Map<string, ContentItem[]> = new Map();
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.config = {
      apiKey: '',
      domain: '',
      apiUrl: 'https://api.storyslip.com',
      theme: 'inherit',
      position: 'bottom-right',
      displayMode: 'inline',
      itemsPerPage: 5,
      autoResize: true,
      inheritStyles: true,
      animation: 'fade',
      responsive: true,
      lazyLoad: true,
      cacheContent: true,
      showPoweredBy: true,
      maxWidth: '400px',
      maxHeight: '600px',
      borderRadius: '8px',
      shadow: true,
      closeButton: true,
      overlay: true,
      zIndex: 9999,
    };
  }  /**
   
* Initialize StorySlip widget with progressive enhancement
   */
  init(config: StorySlipConfig, containerId?: string): void {
    this.config = { ...this.config, ...config };

    // Validate required configuration
    if (!this.config.apiKey) {
      console.error('StorySlip: API key is required');
      return;
    }

    if (!this.config.domain) {
      console.error('StorySlip: Domain is required');
      return;
    }

    // Initialize container
    if (containerId) {
      this.containerElement = document.getElementById(containerId);
      if (!this.containerElement) {
        console.error(`StorySlip: Container element with ID "${containerId}" not found`);
        return;
      }
    } else if (this.config.displayMode !== 'inline') {
      // Create container for non-inline modes
      this.containerElement = document.body;
    }

    // Initialize widget
    this.setupWidget();
    this.injectStyles();
    this.setupEventListeners();
    this.setupObservers();

    // Load content
    if (this.config.lazyLoad && this.config.displayMode === 'inline') {
      this.setupLazyLoading();
    } else {
      this.loadContent();
    }

    this.initialized = true;
    this.trackEvent('widget', 'initialized');
  }

  /**
   * Show widget (for popup/modal modes)
   */
  show(): void {
    if (!this.initialized || this.isVisible) return;

    if (this.config.displayMode === 'popup' || this.config.displayMode === 'modal') {
      this.createOverlay();
    }

    this.createWidget();
    this.isVisible = true;
    this.trackEvent('widget', 'shown');
  }

  /**
   * Hide widget
   */
  hide(): void {
    if (!this.isVisible) return;

    if (this.widgetElement) {
      this.animateOut(() => {
        this.widgetElement?.remove();
        this.widgetElement = null;
      });
    }

    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }

    this.isVisible = false;
    this.trackEvent('widget', 'hidden');
  }

  /**
   * Toggle widget visibility
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Refresh widget content
   */
  refresh(): void {
    if (this.config.cacheContent) {
      this.contentCache.clear();
    }
    this.loadContent();
    this.trackEvent('widget', 'refreshed');
  } 
 /**
   * Setup widget based on display mode
   */
  private setupWidget(): void {
    switch (this.config.displayMode) {
      case 'inline':
        this.createWidget();
        break;
      case 'floating':
        this.createFloatingTrigger();
        break;
      case 'popup':
      case 'modal':
      case 'sidebar':
        // These modes are shown on demand
        break;
    }
  }

  /**
   * Create widget element
   */
  private createWidget(): void {
    if (this.widgetElement) return;

    this.widgetElement = document.createElement('div');
    this.widgetElement.className = `storyslip-widget storyslip-${this.config.displayMode}`;
    this.widgetElement.setAttribute('data-theme', this.config.theme || 'inherit');

    // Create widget structure
    this.widgetElement.innerHTML = `
      <div class="storyslip-widget-container">
        ${this.config.closeButton && this.config.displayMode !== 'inline' ? 
          '<button class="storyslip-close" aria-label="Close">&times;</button>' : ''
        }
        <div class="storyslip-header">
          <h3 class="storyslip-title">Latest Content</h3>
        </div>
        <div class="storyslip-content">
          <div class="storyslip-loading">Loading...</div>
        </div>
        ${this.config.showPoweredBy ? 
          '<div class="storyslip-footer">Powered by <a href="https://storyslip.com" target="_blank">StorySlip</a></div>' : ''
        }
      </div>
    `;

    // Add event listeners
    if (this.config.closeButton) {
      const closeBtn = this.widgetElement.querySelector('.storyslip-close');
      closeBtn?.addEventListener('click', () => this.hide());
    }

    // Append to container
    if (this.containerElement) {
      this.containerElement.appendChild(this.widgetElement);
    }

    // Animate in
    this.animateIn();
  }

  /**
   * Create floating trigger button
   */
  private createFloatingTrigger(): void {
    const trigger = document.createElement('button');
    trigger.className = 'storyslip-floating-trigger';
    trigger.innerHTML = '💬';
    trigger.setAttribute('aria-label', 'Open StorySlip Widget');
    
    trigger.addEventListener('click', () => {
      this.config.displayMode = 'popup'; // Switch to popup mode
      this.show();
    });

    document.body.appendChild(trigger);
  }

  /**
   * Create overlay for modal/popup modes
   */
  private createOverlay(): void {
    if (!this.config.overlay || this.overlayElement) return;

    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'storyslip-overlay';
    this.overlayElement.addEventListener('click', () => {
      if (this.config.displayMode === 'popup') {
        this.hide();
      }
    });

    document.body.appendChild(this.overlayElement);
  }

  /**
   * Load content from API
   */
  private async loadContent(): Promise<void> {
    try {
      const cacheKey = `${this.config.apiKey}-${this.config.itemsPerPage}`;
      
      // Check cache first
      if (this.config.cacheContent && this.contentCache.has(cacheKey)) {
        this.renderContent(this.contentCache.get(cacheKey)!);
        return;
      }

      // Fetch from API
      const response = await fetch(`${this.config.apiUrl}/widget/${this.config.apiKey}/content?limit=${this.config.itemsPerPage}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.success ? data.data : [];

      // Cache content
      if (this.config.cacheContent) {
        this.contentCache.set(cacheKey, content);
      }

      this.renderContent(content);
    } catch (error) {
      console.error('StorySlip: Failed to load content', error);
      this.renderError();
    }
  }  /
**
   * Render content in widget
   */
  private renderContent(content: ContentItem[]): void {
    if (!this.widgetElement) return;

    const contentContainer = this.widgetElement.querySelector('.storyslip-content');
    if (!contentContainer) return;

    if (content.length === 0) {
      contentContainer.innerHTML = '<div class="storyslip-empty">No content available</div>';
      return;
    }

    const contentHTML = content.map(item => `
      <article class="storyslip-item">
        ${item.featured_image_url ? 
          `<img src="${item.featured_image_url}" alt="${item.title}" class="storyslip-image" loading="lazy">` : ''
        }
        <div class="storyslip-item-content">
          <h4 class="storyslip-item-title">
            <a href="${item.url}" target="_blank" rel="noopener">${item.title}</a>
          </h4>
          <p class="storyslip-item-excerpt">${item.excerpt}</p>
          <time class="storyslip-item-date">${this.formatDate(item.published_at)}</time>
        </div>
      </article>
    `).join('');

    contentContainer.innerHTML = contentHTML;

    // Add click tracking
    contentContainer.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link) {
        this.trackEvent('content', 'click', {
          url: link.href,
          title: link.textContent,
        });
      }
    });
  }

  /**
   * Render error state
   */
  private renderError(): void {
    if (!this.widgetElement) return;

    const contentContainer = this.widgetElement.querySelector('.storyslip-content');
    if (contentContainer) {
      contentContainer.innerHTML = '<div class="storyslip-error">Failed to load content</div>';
    }
  }

  /**
   * Inject widget styles
   */
  private injectStyles(): void {
    if (this.styleElement) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'storyslip-widget-styles';
    
    const inheritedStyles = this.config.inheritStyles ? this.getInheritedStyles() : {};
    const css = this.generateCSS(inheritedStyles);
    
    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);
  }

  /**
   * Get inherited styles from host website
   */
  private getInheritedStyles(): Record<string, string> {
    const computedStyle = window.getComputedStyle(document.body);
    return {
      fontFamily: computedStyle.fontFamily,
      fontSize: computedStyle.fontSize,
      lineHeight: computedStyle.lineHeight,
      color: computedStyle.color,
    };
  }

  /**
   * Generate CSS for widget
   */
  private generateCSS(inheritedStyles: Record<string, string>): string {
    const theme = this.getThemeColors();
    
    return `
      .storyslip-widget {
        font-family: ${inheritedStyles.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
        font-size: ${inheritedStyles.fontSize || '14px'};
        line-height: ${inheritedStyles.lineHeight || '1.5'};
        color: ${theme.text};
        background: ${theme.background};
        border: 1px solid ${theme.border};
        border-radius: ${this.config.borderRadius};
        max-width: ${this.config.maxWidth};
        max-height: ${this.config.maxHeight};
        overflow: hidden;
        z-index: ${this.config.zIndex};
        ${this.config.shadow ? 'box-shadow: 0 4px 12px rgba(0,0,0,0.15);' : ''}
        ${this.getPositionStyles()}
      }

      .storyslip-widget-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .storyslip-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: ${theme.textSecondary};
        z-index: 1;
      }

      .storyslip-header {
        padding: 16px;
        border-bottom: 1px solid ${theme.border};
        background: ${theme.headerBackground};
      }

      .storyslip-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: ${theme.text};
      }

      .storyslip-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .storyslip-item {
        display: flex;
        padding: 12px;
        border-bottom: 1px solid ${theme.border};
        transition: background-color 0.2s;
      }

      .storyslip-item:hover {
        background-color: ${theme.hover};
      }

      .storyslip-item:last-child {
        border-bottom: none;
      }

      .storyslip-image {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 4px;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .storyslip-item-content {
        flex: 1;
        min-width: 0;
      }

      .storyslip-item-title {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 500;
      }

      .storyslip-item-title a {
        color: ${theme.link};
        text-decoration: none;
      }

      .storyslip-item-title a:hover {
        text-decoration: underline;
      }

      .storyslip-item-excerpt {
        margin: 0 0 4px 0;
        font-size: 12px;
        color: ${theme.textSecondary};
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .storyslip-item-date {
        font-size: 11px;
        color: ${theme.textSecondary};
      }

      .storyslip-footer {
        padding: 8px 16px;
        border-top: 1px solid ${theme.border};
        font-size: 11px;
        color: ${theme.textSecondary};
        text-align: center;
      }

      .storyslip-footer a {
        color: ${theme.link};
        text-decoration: none;
      }

      .storyslip-loading, .storyslip-error, .storyslip-empty {
        padding: 20px;
        text-align: center;
        color: ${theme.textSecondary};
      }

      .storyslip-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: ${this.config.zIndex! - 1};
      }

      .storyslip-floating-trigger {
        position: fixed;
        ${this.getPositionStyles()}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${theme.primary};
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: ${this.config.zIndex};
        transition: transform 0.2s;
      }

      .storyslip-floating-trigger:hover {
        transform: scale(1.1);
      }

      ${this.getResponsiveStyles()}
      ${this.getAnimationStyles()}
      ${this.getDisplayModeStyles()}
    `;
  }  /**

   * Get theme colors based on configuration
   */
  private getThemeColors(): Record<string, string> {
    const isDark = this.config.theme === 'dark' || 
      (this.config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      return {
        background: '#1f2937',
        headerBackground: '#111827',
        text: '#f9fafb',
        textSecondary: '#9ca3af',
        border: '#374151',
        hover: '#374151',
        link: '#60a5fa',
        primary: '#3b82f6',
      };
    }

    return {
      background: '#ffffff',
      headerBackground: '#f9fafb',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      hover: '#f9fafb',
      link: '#3b82f6',
      primary: '#3b82f6',
    };
  }

  /**
   * Get position styles based on configuration
   */
  private getPositionStyles(): string {
    if (this.config.displayMode === 'inline') return '';

    const position = this.config.position || 'bottom-right';
    const spacing = '20px';

    switch (position) {
      case 'bottom-right':
        return `position: fixed; bottom: ${spacing}; right: ${spacing};`;
      case 'bottom-left':
        return `position: fixed; bottom: ${spacing}; left: ${spacing};`;
      case 'top-right':
        return `position: fixed; top: ${spacing}; right: ${spacing};`;
      case 'top-left':
        return `position: fixed; top: ${spacing}; left: ${spacing};`;
      case 'center':
        return `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);`;
      default:
        return `position: fixed; bottom: ${spacing}; right: ${spacing};`;
    }
  }

  /**
   * Get responsive styles
   */
  private getResponsiveStyles(): string {
    if (!this.config.responsive) return '';

    return `
      @media (max-width: 768px) {
        .storyslip-widget {
          max-width: calc(100vw - 40px);
          max-height: calc(100vh - 40px);
        }
        
        .storyslip-widget.storyslip-sidebar {
          width: 100vw;
          height: 100vh;
          max-width: none;
          max-height: none;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          transform: none !important;
        }
      }
    `;
  }

  /**
   * Get animation styles
   */
  private getAnimationStyles(): string {
    if (this.config.animation === 'none') return '';

    return `
      .storyslip-widget {
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      .storyslip-widget.storyslip-animate-in {
        opacity: 1;
        transform: scale(1);
      }
      
      .storyslip-widget.storyslip-animate-out {
        opacity: 0;
        transform: scale(0.95);
      }
      
      .storyslip-overlay {
        transition: opacity 0.3s ease;
      }
    `;
  }

  /**
   * Get display mode specific styles
   */
  private getDisplayModeStyles(): string {
    return `
      .storyslip-widget.storyslip-sidebar {
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        max-height: none;
        border-radius: 0;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      }
      
      .storyslip-widget.storyslip-sidebar.storyslip-animate-in {
        transform: translateX(0);
      }
      
      .storyslip-widget.storyslip-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 90vw;
        max-height: 90vh;
      }
    `;
  }

  /**
   * Animate widget in
   */
  private animateIn(): void {
    if (!this.widgetElement || this.config.animation === 'none') return;

    this.widgetElement.classList.remove('storyslip-animate-out');
    this.widgetElement.classList.add('storyslip-animate-in');
  }

  /**
   * Animate widget out
   */
  private animateOut(callback: () => void): void {
    if (!this.widgetElement || this.config.animation === 'none') {
      callback();
      return;
    }

    this.widgetElement.classList.remove('storyslip-animate-in');
    this.widgetElement.classList.add('storyslip-animate-out');

    setTimeout(callback, 300);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Handle theme changes
    if (this.config.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        this.updateStyles();
      });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.config.autoResize) {
        this.handleResize();
      }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible && this.config.displayMode !== 'inline') {
        this.hide();
      }
    });
  }

  /**
   * Setup observers for performance optimization
   */
  private setupObservers(): void {
    // Intersection Observer for lazy loading
    if ('IntersectionObserver' in window && this.config.lazyLoad) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadContent();
            this.intersectionObserver?.unobserve(entry.target);
          }
        });
      });
    }

    // Resize Observer for auto-resize
    if ('ResizeObserver' in window && this.config.autoResize) {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });

      if (this.containerElement) {
        this.resizeObserver.observe(this.containerElement);
      }
    }
  }

  /**
   * Setup lazy loading
   */
  private setupLazyLoading(): void {
    if (this.intersectionObserver && this.containerElement) {
      this.intersectionObserver.observe(this.containerElement);
    }
  }

  /**
   * Handle resize events
   */
  private handleResize(): void {
    if (!this.widgetElement) return;

    // Adjust widget size based on viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    if (viewport.width < 768) {
      this.widgetElement.style.maxWidth = 'calc(100vw - 40px)';
      this.widgetElement.style.maxHeight = 'calc(100vh - 40px)';
    } else {
      this.widgetElement.style.maxWidth = this.config.maxWidth!;
      this.widgetElement.style.maxHeight = this.config.maxHeight!;
    }
  }

  /**
   * Update styles (for theme changes)
   */
  private updateStyles(): void {
    if (this.styleElement) {
      const inheritedStyles = this.config.inheritStyles ? this.getInheritedStyles() : {};
      this.styleElement.textContent = this.generateCSS(inheritedStyles);
    }
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Track events (simplified analytics)
   */
  private trackEvent(category: string, action: string, data?: any): void {
    if (this.config.disableTracking) return;

    // Simple tracking - in a real implementation this would use the analytics module
    console.debug('StorySlip Event:', { category, action, data });
  }

  /**
   * Cleanup widget
   */
  destroy(): void {
    this.hide();
    
    if (this.styleElement) {
      this.styleElement.remove();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.contentCache.clear();
    this.initialized = false;
  }
}

export default StorySlipWidget;
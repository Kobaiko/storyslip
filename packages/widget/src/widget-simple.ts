// Simple StorySlip Widget for Showcase
export interface WidgetConfig {
  apiUrl?: string;
  websiteId: string;
  theme?: 'modern' | 'minimal' | 'classic';
  limit?: number;
}

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author?: string;
}

export class StorySlipWidget {
  private config: WidgetConfig;
  private container: HTMLElement;

  constructor(container: HTMLElement, config: WidgetConfig) {
    this.container = container;
    this.config = {
      apiUrl: 'http://localhost:3000',
      theme: 'modern',
      limit: 5,
      ...config
    };
    
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.render();
      await this.loadContent();
    } catch (error) {
      console.error('StorySlip Widget Error:', error);
      this.renderError();
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="storyslip-widget storyslip-theme-${this.config.theme}">
        <div class="storyslip-header">
          <h3>Latest Content</h3>
        </div>
        <div class="storyslip-content">
          <div class="storyslip-loading">Loading...</div>
        </div>
        <div class="storyslip-footer">
          <a href="http://localhost:3002" target="_blank">Powered by StorySlip</a>
        </div>
      </div>
    `;
    
    this.injectStyles();
  }

  private async loadContent(): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/content?limit=${this.config.limit}`);
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        this.renderContent(data.data);
      } else {
        this.renderError();
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      this.renderError();
    }
  }

  private renderContent(content: ContentItem[]): void {
    const contentContainer = this.container.querySelector('.storyslip-content');
    if (!contentContainer) return;

    if (content.length === 0) {
      contentContainer.innerHTML = '<p class="storyslip-empty">No content available</p>';
      return;
    }

    const contentHtml = content.map(item => `
      <article class="storyslip-item">
        <h4 class="storyslip-title">${this.escapeHtml(item.title)}</h4>
        <div class="storyslip-excerpt">${this.escapeHtml(item.content.substring(0, 150))}...</div>
        <div class="storyslip-meta">
          ${item.author ? `<span class="storyslip-author">By ${this.escapeHtml(item.author)}</span>` : ''}
          <span class="storyslip-date">${this.formatDate(item.created_at)}</span>
        </div>
      </article>
    `).join('');

    contentContainer.innerHTML = contentHtml;
  }

  private renderError(): void {
    const contentContainer = this.container.querySelector('.storyslip-content');
    if (!contentContainer) return;

    contentContainer.innerHTML = `
      <div class="storyslip-error">
        <p>Unable to load content</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  private injectStyles(): void {
    if (document.getElementById('storyslip-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'storyslip-widget-styles';
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }

  private getStyles(): string {
    const baseStyles = `
      .storyslip-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        background: white;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .storyslip-header {
        padding: 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #e1e5e9;
      }
      
      .storyslip-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
      }
      
      .storyslip-content {
        padding: 16px;
        max-height: 400px;
        overflow-y: auto;
      }
      
      .storyslip-item {
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e1e5e9;
      }
      
      .storyslip-item:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }
      
      .storyslip-title {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        line-height: 1.4;
      }
      
      .storyslip-excerpt {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #4a5568;
        line-height: 1.5;
      }
      
      .storyslip-meta {
        font-size: 12px;
        color: #718096;
        display: flex;
        gap: 12px;
      }
      
      .storyslip-footer {
        padding: 12px 16px;
        background: #f8f9fa;
        border-top: 1px solid #e1e5e9;
        text-align: center;
      }
      
      .storyslip-footer a {
        font-size: 12px;
        color: #718096;
        text-decoration: none;
      }
      
      .storyslip-footer a:hover {
        color: #4a5568;
      }
      
      .storyslip-loading, .storyslip-empty, .storyslip-error {
        text-align: center;
        padding: 32px;
        color: #718096;
      }
      
      .storyslip-error button {
        margin-top: 8px;
        padding: 8px 16px;
        background: #3182ce;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .storyslip-error button:hover {
        background: #2c5aa0;
      }
    `;

    const themeStyles = this.getThemeStyles();
    return baseStyles + themeStyles;
  }

  private getThemeStyles(): string {
    switch (this.config.theme) {
      case 'minimal':
        return `
          .storyslip-theme-minimal {
            border: none;
            box-shadow: none;
            background: transparent;
          }
          .storyslip-theme-minimal .storyslip-header {
            background: transparent;
            border-bottom: 2px solid #e1e5e9;
            padding: 8px 0;
          }
          .storyslip-theme-minimal .storyslip-content {
            padding: 16px 0;
          }
          .storyslip-theme-minimal .storyslip-footer {
            background: transparent;
            border-top: 1px solid #e1e5e9;
          }
        `;
      
      case 'classic':
        return `
          .storyslip-theme-classic {
            border: 2px solid #2d3748;
            border-radius: 0;
            box-shadow: 4px 4px 0 rgba(45, 55, 72, 0.1);
          }
          .storyslip-theme-classic .storyslip-header {
            background: #2d3748;
            color: white;
          }
          .storyslip-theme-classic .storyslip-header h3 {
            color: white;
          }
          .storyslip-theme-classic .storyslip-footer {
            background: #2d3748;
          }
          .storyslip-theme-classic .storyslip-footer a {
            color: #cbd5e0;
          }
        `;
      
      default: // modern
        return `
          .storyslip-theme-modern .storyslip-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .storyslip-theme-modern .storyslip-header h3 {
            color: white;
          }
          .storyslip-theme-modern .storyslip-title {
            color: #667eea;
          }
        `;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }
}

// Auto-initialize widgets
document.addEventListener('DOMContentLoaded', () => {
  const widgets = document.querySelectorAll('[data-storyslip-widget]');
  widgets.forEach((element) => {
    const config = {
      websiteId: element.getAttribute('data-website-id') || 'demo',
      theme: element.getAttribute('data-theme') as any || 'modern',
      limit: parseInt(element.getAttribute('data-limit') || '5')
    };
    
    new StorySlipWidget(element as HTMLElement, config);
  });
});

// Export for manual initialization
(window as any).StorySlipWidget = StorySlipWidget;
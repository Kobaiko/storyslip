import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { brandService, BrandConfiguration } from './brand.service';

export interface WidgetBrandingConfig {
  websiteId: string;
  theme: 'light' | 'dark' | 'auto';
  borderRadius: number;
  shadowLevel: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  animation: 'none' | 'fade' | 'slide' | 'scale';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  showBranding: boolean;
  customCSS: string;
  mobileOptimized: boolean;
  rtlSupport: boolean;
}

export interface WidgetStylesheet {
  css: string;
  variables: Record<string, string>;
  mediaQueries: string[];
}

export class WidgetBrandingService {
  /**
   * Generate widget stylesheet with brand configuration
   */
  async generateWidgetStylesheet(
    websiteId: string,
    config?: Partial<WidgetBrandingConfig>
  ): Promise<WidgetStylesheet> {
    try {
      // Get brand configuration
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      // Get widget-specific configuration
      const widgetConfig = await this.getWidgetBrandingConfig(websiteId);
      
      // Merge with provided config
      const finalConfig = { ...widgetConfig, ...config };
      
      // Generate CSS variables
      const variables = this.generateCSSVariables(brandConfig, finalConfig);
      
      // Generate base CSS
      const baseCss = this.generateBaseCSS(finalConfig);
      
      // Generate theme-specific CSS
      const themeCSS = this.generateThemeCSS(brandConfig, finalConfig);
      
      // Generate responsive CSS
      const responsiveCSS = this.generateResponsiveCSS(finalConfig);
      
      // Generate animation CSS
      const animationCSS = this.generateAnimationCSS(finalConfig);
      
      // Combine all CSS
      const css = [
        this.generateCSSVariablesString(variables),
        baseCss,
        themeCSS,
        responsiveCSS,
        animationCSS,
        finalConfig.customCSS || '',
      ].join('\n\n');
      
      return {
        css,
        variables,
        mediaQueries: this.generateMediaQueries(finalConfig),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to generate widget stylesheet', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get widget branding configuration
   */
  async getWidgetBrandingConfig(websiteId: string): Promise<WidgetBrandingConfig> {
    try {
      const { data: config, error } = await supabase
        .from('widget_branding_configs')
        .select('*')
        .eq('website_id', websiteId)
        .single();

      if (error) {
        // If no configuration exists, return defaults
        if (error.code === 'PGRST116') {
          return this.getDefaultWidgetConfig(websiteId);
        }
        throw new ApiError('Failed to fetch widget branding config', 500, 'DATABASE_ERROR', error);
      }

      return config;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch widget branding config', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Update widget branding configuration
   */
  async updateWidgetBrandingConfig(
    websiteId: string,
    config: Partial<WidgetBrandingConfig>
  ): Promise<WidgetBrandingConfig> {
    try {
      const { data: updatedConfig, error } = await supabase
        .from('widget_branding_configs')
        .upsert({
          website_id: websiteId,
          ...config,
        })
        .select()
        .single();

      if (error) {
        throw new ApiError('Failed to update widget branding config', 500, 'DATABASE_ERROR', error);
      }

      return updatedConfig;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update widget branding config', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Generate branded widget embed code
   */
  async generateBrandedEmbedCode(
    websiteId: string,
    options: {
      containerId?: string;
      displayMode?: 'inline' | 'popup' | 'sidebar';
      autoLoad?: boolean;
      customConfig?: Record<string, any>;
    } = {}
  ): Promise<string> {
    try {
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      const widgetConfig = await this.getWidgetBrandingConfig(websiteId);
      
      const {
        containerId = 'storyslip-widget',
        displayMode = 'inline',
        autoLoad = true,
        customConfig = {},
      } = options;

      const embedCode = `
<!-- StorySlip Widget${brandConfig.hide_storyslip_branding ? '' : ' - Powered by StorySlip'} -->
<div id="${containerId}"></div>
<script>
(function() {
  // Widget configuration
  window.StorySlipConfig = {
    websiteId: '${websiteId}',
    containerId: '${containerId}',
    displayMode: '${displayMode}',
    theme: '${widgetConfig.theme}',
    branding: {
      showBranding: ${widgetConfig.showBranding},
      primaryColor: '${brandConfig.primary_color}',
      secondaryColor: '${brandConfig.secondary_color}',
      fontFamily: '${brandConfig.font_family}',
      borderRadius: ${widgetConfig.borderRadius},
      shadowLevel: '${widgetConfig.shadowLevel}',
      animation: '${widgetConfig.animation}',
    },
    customConfig: ${JSON.stringify(customConfig)},
    autoLoad: ${autoLoad}
  };

  // Load widget stylesheet
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '${process.env.API_URL || 'https://api.storyslip.com'}/api/brand/${websiteId}/widget.css';
  document.head.appendChild(link);

  // Load widget script
  var script = document.createElement('script');
  script.src = '${process.env.WIDGET_URL || 'https://widget.storyslip.com'}/widget.js';
  script.async = true;
  document.head.appendChild(script);
})();
</script>
${brandConfig.hide_storyslip_branding ? '' : '<!-- End StorySlip Widget -->'}
      `.trim();

      return embedCode;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to generate branded embed code', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Generate CSS variables for widget
   */
  private generateCSSVariables(
    brandConfig: BrandConfiguration,
    widgetConfig: WidgetBrandingConfig
  ): Record<string, string> {
    return {
      // Brand colors
      '--widget-primary': brandConfig.primary_color,
      '--widget-secondary': brandConfig.secondary_color,
      '--widget-accent': brandConfig.accent_color,
      '--widget-background': brandConfig.background_color,
      '--widget-text': brandConfig.text_color,
      
      // Typography
      '--widget-font-family': brandConfig.font_family,
      '--widget-heading-font': brandConfig.heading_font_family || brandConfig.font_family,
      
      // Widget-specific
      '--widget-border-radius': `${widgetConfig.borderRadius}px`,
      '--widget-shadow': this.getShadowValue(widgetConfig.shadowLevel),
      '--widget-animation-duration': widgetConfig.animation === 'none' ? '0s' : '0.3s',
      
      // Responsive breakpoints
      '--widget-mobile-breakpoint': '768px',
      '--widget-tablet-breakpoint': '1024px',
    };
  }

  /**
   * Generate CSS variables string
   */
  private generateCSSVariablesString(variables: Record<string, string>): string {
    const variableDeclarations = Object.entries(variables)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    return `:root {\n${variableDeclarations}\n}`;
  }

  /**
   * Generate base CSS for widget
   */
  private generateBaseCSS(config: WidgetBrandingConfig): string {
    return `
.storyslip-widget {
  font-family: var(--widget-font-family);
  color: var(--widget-text);
  background: var(--widget-background);
  border-radius: var(--widget-border-radius);
  box-shadow: var(--widget-shadow);
  transition: all var(--widget-animation-duration) ease;
  position: relative;
  overflow: hidden;
}

.storyslip-widget * {
  box-sizing: border-box;
}

.storyslip-widget h1,
.storyslip-widget h2,
.storyslip-widget h3,
.storyslip-widget h4,
.storyslip-widget h5,
.storyslip-widget h6 {
  font-family: var(--widget-heading-font);
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.storyslip-widget p {
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.storyslip-widget a {
  color: var(--widget-primary);
  text-decoration: none;
  transition: color var(--widget-animation-duration) ease;
}

.storyslip-widget a:hover {
  color: var(--widget-secondary);
}

.storyslip-widget button {
  background: var(--widget-primary);
  color: white;
  border: none;
  border-radius: var(--widget-border-radius);
  padding: 0.5rem 1rem;
  font-family: var(--widget-font-family);
  cursor: pointer;
  transition: all var(--widget-animation-duration) ease;
}

.storyslip-widget button:hover {
  background: var(--widget-secondary);
  transform: translateY(-1px);
}

.storyslip-widget input,
.storyslip-widget textarea {
  border: 1px solid #e5e7eb;
  border-radius: var(--widget-border-radius);
  padding: 0.5rem;
  font-family: var(--widget-font-family);
  width: 100%;
  transition: border-color var(--widget-animation-duration) ease;
}

.storyslip-widget input:focus,
.storyslip-widget textarea:focus {
  outline: none;
  border-color: var(--widget-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
    `.trim();
  }

  /**
   * Generate theme-specific CSS
   */
  private generateThemeCSS(
    brandConfig: BrandConfiguration,
    config: WidgetBrandingConfig
  ): string {
    if (config.theme === 'dark') {
      return `
.storyslip-widget {
  --widget-background: #1f2937;
  --widget-text: #f9fafb;
}

.storyslip-widget input,
.storyslip-widget textarea {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}
      `.trim();
    }

    if (config.theme === 'auto') {
      return `
@media (prefers-color-scheme: dark) {
  .storyslip-widget {
    --widget-background: #1f2937;
    --widget-text: #f9fafb;
  }

  .storyslip-widget input,
  .storyslip-widget textarea {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
}
      `.trim();
    }

    return '';
  }

  /**
   * Generate responsive CSS
   */
  private generateResponsiveCSS(config: WidgetBrandingConfig): string {
    if (!config.mobileOptimized) return '';

    return `
@media (max-width: 768px) {
  .storyslip-widget {
    border-radius: ${Math.max(config.borderRadius - 4, 0)}px;
    margin: 0.5rem;
  }

  .storyslip-widget h1 { font-size: 1.5rem; }
  .storyslip-widget h2 { font-size: 1.25rem; }
  .storyslip-widget h3 { font-size: 1.125rem; }
  
  .storyslip-widget button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .storyslip-widget {
    border-radius: ${Math.max(config.borderRadius - 8, 0)}px;
  }
}
    `.trim();
  }

  /**
   * Generate animation CSS
   */
  private generateAnimationCSS(config: WidgetBrandingConfig): string {
    if (config.animation === 'none') return '';

    const animations = {
      fade: `
@keyframes storyslip-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.storyslip-widget {
  animation: storyslip-fade-in var(--widget-animation-duration) ease;
}
      `,
      slide: `
@keyframes storyslip-slide-in {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.storyslip-widget {
  animation: storyslip-slide-in var(--widget-animation-duration) ease;
}
      `,
      scale: `
@keyframes storyslip-scale-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.storyslip-widget {
  animation: storyslip-scale-in var(--widget-animation-duration) ease;
}
      `,
    };

    return animations[config.animation] || '';
  }

  /**
   * Generate media queries
   */
  private generateMediaQueries(config: WidgetBrandingConfig): string[] {
    const queries = ['(max-width: 768px)', '(max-width: 480px)'];
    
    if (config.theme === 'auto') {
      queries.push('(prefers-color-scheme: dark)');
    }
    
    if (config.rtlSupport) {
      queries.push('(dir: rtl)');
    }
    
    return queries;
  }

  /**
   * Get shadow value for shadow level
   */
  private getShadowValue(level: string): string {
    const shadows = {
      none: 'none',
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    };
    
    return shadows[level] || shadows.md;
  }

  /**
   * Get default widget configuration
   */
  private getDefaultWidgetConfig(websiteId: string): WidgetBrandingConfig {
    return {
      websiteId,
      theme: 'auto',
      borderRadius: 8,
      shadowLevel: 'md',
      animation: 'fade',
      position: 'bottom-right',
      showBranding: true,
      customCSS: '',
      mobileOptimized: true,
      rtlSupport: false,
    };
  }
}

export const widgetBrandingService = new WidgetBrandingService();
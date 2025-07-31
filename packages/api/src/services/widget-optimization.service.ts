import { CDNUtil } from '../utils/cdn';
import { HelperUtil } from '../utils/helpers';

export interface OptimizationOptions {
  minifyHTML?: boolean;
  minifyCSS?: boolean;
  optimizeImages?: boolean;
  enableLazyLoading?: boolean;
  generateResponsiveImages?: boolean;
  inlineCriticalCSS?: boolean;
  preloadResources?: boolean;
}

export interface OptimizedContent {
  html: string;
  css: string;
  criticalCSS?: string;
  preloadHeaders?: string;
  optimizedImages: Array<{
    original: string;
    optimized: string;
    srcset?: string;
  }>;
  performance: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    optimizations: string[];
  };
}

export class WidgetOptimizationService {
  /**
   * Optimize widget content for delivery
   */
  static async optimizeContent(
    html: string,
    css: string,
    options: OptimizationOptions = {}
  ): Promise<OptimizedContent> {
    const originalSize = html.length + css.length;
    const optimizations: string[] = [];
    
    let optimizedHTML = html;
    let optimizedCSS = css;
    let criticalCSS: string | undefined;
    let preloadHeaders: string | undefined;
    const optimizedImages: Array<{
      original: string;
      optimized: string;
      srcset?: string;
    }> = [];

    // Minify HTML
    if (options.minifyHTML !== false) {
      optimizedHTML = this.minifyHTML(optimizedHTML);
      optimizations.push('HTML minification');
    }

    // Minify CSS
    if (options.minifyCSS !== false) {
      optimizedCSS = this.minifyCSS(optimizedCSS);
      optimizations.push('CSS minification');
    }

    // Extract and inline critical CSS
    if (options.inlineCriticalCSS) {
      const criticalResult = this.extractCriticalCSS(optimizedHTML, optimizedCSS);
      criticalCSS = criticalResult.critical;
      optimizedCSS = criticalResult.remaining;
      optimizations.push('Critical CSS extraction');
    }

    // Optimize images
    if (options.optimizeImages !== false) {
      const imageResult = await this.optimizeImages(optimizedHTML, {
        generateResponsive: options.generateResponsiveImages,
        enableLazyLoading: options.enableLazyLoading,
      });
      optimizedHTML = imageResult.html;
      optimizedImages.push(...imageResult.images);
      if (imageResult.images.length > 0) {
        optimizations.push('Image optimization');
      }
    }

    // Generate preload headers
    if (options.preloadResources) {
      preloadHeaders = this.generatePreloadHeaders(optimizedHTML, optimizedCSS);
      if (preloadHeaders) {
        optimizations.push('Resource preloading');
      }
    }

    // Add lazy loading to images
    if (options.enableLazyLoading !== false) {
      optimizedHTML = this.addLazyLoading(optimizedHTML);
      optimizations.push('Lazy loading');
    }

    const optimizedSize = optimizedHTML.length + optimizedCSS.length;
    const compressionRatio = originalSize > 0 ? (originalSize - optimizedSize) / originalSize : 0;

    return {
      html: optimizedHTML,
      css: optimizedCSS,
      criticalCSS,
      preloadHeaders,
      optimizedImages,
      performance: {
        originalSize,
        optimizedSize,
        compressionRatio,
        optimizations,
      },
    };
  }

  /**
   * Minify HTML content
   */
  private static minifyHTML(html: string): string {
    return html
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove extra whitespace between tags
      .replace(/>\s+</g, '><')
      // Remove leading/trailing whitespace
      .replace(/^\s+|\s+$/gm, '')
      // Collapse multiple spaces
      .replace(/\s{2,}/g, ' ')
      // Remove empty lines
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Minify CSS content
   */
  private static minifyCSS(css: string): string {
    return css
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove semicolon before closing brace
      .replace(/;\s*}/g, '}')
      // Remove spaces around braces and colons
      .replace(/\s*{\s*/g, '{')
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*;\s*/g, ';')
      // Remove spaces after commas
      .replace(/,\s*/g, ',')
      // Remove trailing semicolons
      .replace(/;}/g, '}')
      .trim();
  }

  /**
   * Extract critical CSS that affects above-the-fold content
   */
  private static extractCriticalCSS(html: string, css: string): {
    critical: string;
    remaining: string;
  } {
    // Simple critical CSS extraction - in production, use a proper tool like Penthouse
    const criticalSelectors = [
      '.storyslip-widget',
      '.storyslip-widget-header',
      '.storyslip-widget-title',
      '.storyslip-widget-description',
      '.storyslip-item:first-child',
      '.storyslip-item:nth-child(1)',
      '.storyslip-item:nth-child(2)',
    ];

    const cssRules = css.split('}').filter(rule => rule.trim());
    const criticalRules: string[] = [];
    const remainingRules: string[] = [];

    cssRules.forEach(rule => {
      const selector = rule.split('{')[0]?.trim();
      const isCritical = criticalSelectors.some(criticalSelector =>
        selector?.includes(criticalSelector)
      );

      if (isCritical) {
        criticalRules.push(rule + '}');
      } else {
        remainingRules.push(rule + '}');
      }
    });

    return {
      critical: criticalRules.join(''),
      remaining: remainingRules.join(''),
    };
  }

  /**
   * Optimize images in HTML content
   */
  private static async optimizeImages(
    html: string,
    options: {
      generateResponsive?: boolean;
      enableLazyLoading?: boolean;
    } = {}
  ): Promise<{
    html: string;
    images: Array<{
      original: string;
      optimized: string;
      srcset?: string;
    }>;
  }> {
    const images: Array<{
      original: string;
      optimized: string;
      srcset?: string;
    }> = [];

    // Find all img tags
    const imgRegex = /<img([^>]+)>/gi;
    let optimizedHTML = html;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const imgTag = match[0];
      const attributes = match[1];
      
      // Extract src attribute
      const srcMatch = attributes.match(/src=["']([^"']+)["']/);
      if (!srcMatch) continue;

      const originalSrc = srcMatch[1];
      
      // Skip if already optimized or is a data URL
      if (originalSrc.startsWith('data:') || originalSrc.includes('cdn.storyslip.com')) {
        continue;
      }

      // Optimize image URL
      const optimizedSrc = CDNUtil.optimizeImageUrl(originalSrc, {
        quality: 80,
        format: 'auto',
      });

      let newImgTag = imgTag.replace(originalSrc, optimizedSrc);

      // Generate responsive srcset if enabled
      let srcset: string | undefined;
      if (options.generateResponsive) {
        srcset = CDNUtil.generateResponsiveSrcSet(originalSrc);
        newImgTag = newImgTag.replace(
          /src=["']([^"']+)["']/,
          `src="${optimizedSrc}" srcset="${srcset}"`
        );
      }

      // Add loading="lazy" if not present and lazy loading is enabled
      if (options.enableLazyLoading && !attributes.includes('loading=')) {
        newImgTag = newImgTag.replace('<img', '<img loading="lazy"');
      }

      // Add decoding="async" for better performance
      if (!attributes.includes('decoding=')) {
        newImgTag = newImgTag.replace('<img', '<img decoding="async"');
      }

      optimizedHTML = optimizedHTML.replace(imgTag, newImgTag);

      images.push({
        original: originalSrc,
        optimized: optimizedSrc,
        srcset,
      });
    }

    return {
      html: optimizedHTML,
      images,
    };
  }

  /**
   * Add lazy loading to images and other resources
   */
  private static addLazyLoading(html: string): string {
    // Add loading="lazy" to images that don't have it
    let optimizedHTML = html.replace(
      /<img(?![^>]*loading=)([^>]*?)>/gi,
      '<img loading="lazy"$1>'
    );

    // Add loading="lazy" to iframes
    optimizedHTML = optimizedHTML.replace(
      /<iframe(?![^>]*loading=)([^>]*?)>/gi,
      '<iframe loading="lazy"$1>'
    );

    return optimizedHTML;
  }

  /**
   * Generate preload headers for critical resources
   */
  private static generatePreloadHeaders(html: string, css: string): string {
    const resources: Array<{
      url: string;
      type: 'script' | 'style' | 'font' | 'image';
      crossorigin?: boolean;
    }> = [];

    // Find critical images (first few images)
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    let imgCount = 0;

    while ((imgMatch = imgRegex.exec(html)) !== null && imgCount < 2) {
      const src = imgMatch[1];
      if (!src.startsWith('data:')) {
        resources.push({
          url: src,
          type: 'image',
        });
        imgCount++;
      }
    }

    // Find external stylesheets
    const linkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
    let linkMatch;

    while ((linkMatch = linkRegex.exec(html)) !== null) {
      resources.push({
        url: linkMatch[1],
        type: 'style',
        crossorigin: true,
      });
    }

    // Find external scripts
    const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let scriptMatch;

    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      resources.push({
        url: scriptMatch[1],
        type: 'script',
        crossorigin: true,
      });
    }

    return CDNUtil.generatePreloadHeaders(resources);
  }

  /**
   * Optimize CSS for specific viewport
   */
  static optimizeCSSForViewport(
    css: string,
    viewport: 'mobile' | 'tablet' | 'desktop'
  ): string {
    const viewportSizes = {
      mobile: 768,
      tablet: 1024,
      desktop: 1200,
    };

    const maxWidth = viewportSizes[viewport];
    
    // Remove media queries that don't apply to this viewport
    let optimizedCSS = css;

    // Remove desktop-only styles for mobile
    if (viewport === 'mobile') {
      optimizedCSS = optimizedCSS.replace(
        /@media[^{]*\(min-width:\s*(\d+)px\)[^{]*\{[^{}]*\{[^{}]*\}[^{}]*\}/gi,
        (match, minWidth) => {
          return parseInt(minWidth) > maxWidth ? '' : match;
        }
      );
    }

    return optimizedCSS;
  }

  /**
   * Generate AMP-compatible HTML
   */
  static generateAMPVersion(html: string, css: string): {
    html: string;
    css: string;
  } {
    let ampHTML = html;
    let ampCSS = css;

    // Replace img tags with amp-img
    ampHTML = ampHTML.replace(
      /<img([^>]+)>/gi,
      (match, attributes) => {
        // Extract width and height or set defaults
        const widthMatch = attributes.match(/width=["'](\d+)["']/);
        const heightMatch = attributes.match(/height=["'](\d+)["']/);
        
        const width = widthMatch ? widthMatch[1] : '300';
        const height = heightMatch ? heightMatch[1] : '200';
        
        return `<amp-img${attributes} width="${width}" height="${height}" layout="responsive"></amp-img>`;
      }
    );

    // Remove JavaScript-dependent features
    ampHTML = ampHTML.replace(/onclick=["'][^"']*["']/gi, '');
    ampHTML = ampHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    // Inline CSS (AMP requires all CSS to be inline)
    ampCSS = this.minifyCSS(ampCSS);

    return {
      html: ampHTML,
      css: ampCSS,
    };
  }

  /**
   * Calculate performance score
   */
  static calculatePerformanceScore(metrics: {
    renderTime: number;
    queryTime: number;
    cacheHit: boolean;
    contentSize: number;
    imageCount: number;
    optimizations: string[];
  }): {
    score: number;
    breakdown: Record<string, number>;
    recommendations: string[];
  } {
    const breakdown: Record<string, number> = {};
    const recommendations: string[] = [];

    // Render time score (0-30 points)
    if (metrics.renderTime < 100) {
      breakdown.renderTime = 30;
    } else if (metrics.renderTime < 300) {
      breakdown.renderTime = 20;
    } else if (metrics.renderTime < 500) {
      breakdown.renderTime = 10;
    } else {
      breakdown.renderTime = 0;
      recommendations.push('Optimize render time (currently ' + metrics.renderTime + 'ms)');
    }

    // Query time score (0-20 points)
    if (metrics.queryTime < 50) {
      breakdown.queryTime = 20;
    } else if (metrics.queryTime < 100) {
      breakdown.queryTime = 15;
    } else if (metrics.queryTime < 200) {
      breakdown.queryTime = 10;
    } else {
      breakdown.queryTime = 0;
      recommendations.push('Optimize database queries (currently ' + metrics.queryTime + 'ms)');
    }

    // Cache utilization score (0-20 points)
    breakdown.cacheUtilization = metrics.cacheHit ? 20 : 0;
    if (!metrics.cacheHit) {
      recommendations.push('Enable caching to improve performance');
    }

    // Content size score (0-15 points)
    if (metrics.contentSize < 50000) { // < 50KB
      breakdown.contentSize = 15;
    } else if (metrics.contentSize < 100000) { // < 100KB
      breakdown.contentSize = 10;
    } else if (metrics.contentSize < 200000) { // < 200KB
      breakdown.contentSize = 5;
    } else {
      breakdown.contentSize = 0;
      recommendations.push('Reduce content size (currently ' + Math.round(metrics.contentSize / 1024) + 'KB)');
    }

    // Optimization score (0-15 points)
    const optimizationCount = metrics.optimizations.length;
    if (optimizationCount >= 4) {
      breakdown.optimizations = 15;
    } else if (optimizationCount >= 2) {
      breakdown.optimizations = 10;
    } else if (optimizationCount >= 1) {
      breakdown.optimizations = 5;
    } else {
      breakdown.optimizations = 0;
      recommendations.push('Enable content optimizations (minification, image optimization, etc.)');
    }

    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    return {
      score: totalScore,
      breakdown,
      recommendations,
    };
  }
}

export default WidgetOptimizationService;
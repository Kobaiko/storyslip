/**
 * CDN utilities for widget content delivery optimization
 */

export interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  regions: string[];
  cacheHeaders: {
    static: string;
    dynamic: string;
    api: string;
  };
}

export class CDNUtil {
  private static config: CDNConfig = {
    enabled: process.env.CDN_ENABLED === 'true',
    baseUrl: process.env.CDN_BASE_URL || 'https://cdn.storyslip.com',
    regions: (process.env.CDN_REGIONS || 'us-east-1,us-west-2,eu-west-1').split(','),
    cacheHeaders: {
      static: 'public, max-age=31536000, immutable', // 1 year for static assets
      dynamic: 'public, max-age=300, s-maxage=300', // 5 minutes for dynamic content
      api: 'public, max-age=60, s-maxage=60', // 1 minute for API responses
    },
  };

  /**
   * Get optimized CDN URL for widget assets
   */
  static getAssetUrl(path: string, version?: string): string {
    if (!this.config.enabled) {
      return path;
    }

    const versionParam = version ? `?v=${version}` : '';
    return `${this.config.baseUrl}${path}${versionParam}`;
  }

  /**
   * Get cache headers for different content types
   */
  static getCacheHeaders(type: 'static' | 'dynamic' | 'api'): Record<string, string> {
    const baseHeaders = {
      'Cache-Control': this.config.cacheHeaders[type],
      'Vary': 'Accept-Encoding, Origin',
    };

    if (type === 'static') {
      return {
        ...baseHeaders,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
      };
    }

    return baseHeaders;
  }

  /**
   * Generate ETag for content
   */
  static generateETag(content: string, version?: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return version ? `"${version}-${hash.substring(0, 8)}"` : `"${hash.substring(0, 16)}"`;
  }

  /**
   * Check if content should be compressed
   */
  static shouldCompress(contentType: string, size: number): boolean {
    const compressibleTypes = [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'text/xml',
      'application/xml',
      'image/svg+xml',
    ];

    return compressibleTypes.some(type => contentType.includes(type)) && size > 1024; // Only compress if > 1KB
  }

  /**
   * Get optimal region for request
   */
  static getOptimalRegion(clientIP?: string, acceptLanguage?: string): string {
    // Simple region selection based on IP geolocation (in production, use a proper service)
    if (!clientIP) {
      return this.config.regions[0];
    }

    // Basic IP-based region detection (this is simplified)
    const ipParts = clientIP.split('.');
    const firstOctet = parseInt(ipParts[0]);

    if (firstOctet >= 1 && firstOctet <= 126) {
      return 'us-east-1'; // North America
    } else if (firstOctet >= 128 && firstOctet <= 191) {
      return 'eu-west-1'; // Europe
    } else {
      return 'us-west-2'; // Asia-Pacific/Others
    }
  }

  /**
   * Generate widget embed URL with CDN optimization
   */
  static generateEmbedUrl(widgetId: string, options: {
    version?: string;
    region?: string;
    format?: 'json' | 'html';
  } = {}): string {
    const { version, region, format = 'json' } = options;
    
    let baseUrl = this.config.enabled ? this.config.baseUrl : '';
    
    if (region && this.config.regions.includes(region)) {
      baseUrl = baseUrl.replace('cdn.', `${region}.cdn.`);
    }

    const path = `/widgets/${widgetId}/render`;
    const params = new URLSearchParams();
    
    if (version) {
      params.append('v', version);
    }
    
    if (format === 'html') {
      params.append('format', 'html');
    }

    const queryString = params.toString();
    return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Optimize image URLs for CDN delivery
   */
  static optimizeImageUrl(imageUrl: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  } = {}): string {
    if (!this.config.enabled || !imageUrl) {
      return imageUrl;
    }

    const { width, height, quality = 80, format = 'auto' } = options;
    const params = new URLSearchParams();

    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    if (quality !== 80) params.append('q', quality.toString());
    if (format !== 'auto') params.append('f', format);

    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}${params.toString()}`;
  }

  /**
   * Preload critical resources
   */
  static generatePreloadHeaders(resources: Array<{
    url: string;
    type: 'script' | 'style' | 'font' | 'image';
    crossorigin?: boolean;
  }>): string {
    return resources
      .map(resource => {
        const crossorigin = resource.crossorigin ? '; crossorigin' : '';
        return `<${resource.url}>; rel=preload; as=${resource.type}${crossorigin}`;
      })
      .join(', ');
  }

  /**
   * Generate security headers for CDN
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  }

  /**
   * Calculate cache key for content
   */
  static generateCacheKey(
    widgetId: string,
    params: Record<string, any>,
    userContext?: {
      region?: string;
      language?: string;
      device?: string;
    }
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const contextParts = [];
    if (userContext?.region) contextParts.push(`r:${userContext.region}`);
    if (userContext?.language) contextParts.push(`l:${userContext.language}`);
    if (userContext?.device) contextParts.push(`d:${userContext.device}`);

    const context = contextParts.length > 0 ? `|${contextParts.join('|')}` : '';
    
    return `widget:${widgetId}:${sortedParams}${context}`;
  }

  /**
   * Check if request supports modern formats
   */
  static supportsModernFormats(acceptHeader: string): {
    webp: boolean;
    avif: boolean;
    brotli: boolean;
  } {
    return {
      webp: acceptHeader.includes('image/webp'),
      avif: acceptHeader.includes('image/avif'),
      brotli: acceptHeader.includes('br'),
    };
  }

  /**
   * Generate responsive image srcset
   */
  static generateResponsiveSrcSet(
    baseUrl: string,
    widths: number[] = [320, 640, 960, 1280, 1920]
  ): string {
    return widths
      .map(width => `${this.optimizeImageUrl(baseUrl, { width })} ${width}w`)
      .join(', ');
  }

  /**
   * Purge CDN cache for specific content
   */
  static async purgeCacheByTag(tags: string[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Implementation would depend on CDN provider (CloudFlare, AWS CloudFront, etc.)
      const purgeUrl = `${this.config.baseUrl}/purge`;
      
      await fetch(purgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CDN_API_KEY}`,
        },
        body: JSON.stringify({ tags }),
      });
    } catch (error) {
      console.error('CDN cache purge failed:', error);
    }
  }

  /**
   * Get performance metrics for CDN
   */
  static getPerformanceMetrics(): {
    cacheHitRate: number;
    averageResponseTime: number;
    bandwidthSaved: number;
  } {
    // In production, this would fetch real metrics from CDN provider
    return {
      cacheHitRate: 0.85, // 85% cache hit rate
      averageResponseTime: 45, // 45ms average response time
      bandwidthSaved: 0.70, // 70% bandwidth saved
    };
  }
}

export default CDNUtil;
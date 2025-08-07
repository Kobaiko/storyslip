import { logger } from '../utils/monitoring';

interface CDNConfig {
  enabled: boolean;
  baseUrl: string;
  regions: string[];
  cacheSettings: {
    staticAssets: number;
    widgetContent: number;
    apiResponses: number;
  };
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  etag: string;
}

export class WidgetCDNService {
  private static instance: WidgetCDNService;
  private cache: Map<string, CacheEntry> = new Map();
  private config: CDNConfig;

  private constructor() {
    this.config = {
      enabled: process.env.CDN_ENABLED === 'true',
      baseUrl: process.env.CDN_BASE_URL || 'https://cdn.storyslip.com',
      regions: (process.env.CDN_REGIONS || 'us-east-1,eu-west-1,ap-southeast-1').split(','),
      cacheSettings: {
        staticAssets: 86400 * 7, // 1 week
        widgetContent: 300, // 5 minutes
        apiResponses: 60, // 1 minute
      },
    };

    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  public static getInstance(): WidgetCDNService {
    if (!WidgetCDNService.instance) {
      WidgetCDNService.instance = new WidgetCDNService();
    }
    return WidgetCDNService.instance;
  }

  /**
   * Get optimized widget script URL
   */
  public getWidgetScriptUrl(version?: string): string {
    if (!this.config.enabled) {
      return `${process.env.API_URL || 'https://api.storyslip.com'}/api/widgets/script.js`;
    }

    const versionParam = version ? `?v=${version}` : '';
    return `${this.config.baseUrl}/widget/script.js${versionParam}`;
  }

  /**
   * Get optimized widget render URL
   */
  public getWidgetRenderUrl(widgetId: string, params?: Record<string, string>): string {
    const baseUrl = this.config.enabled 
      ? this.config.baseUrl 
      : process.env.API_URL || 'https://api.storyslip.com';

    let url = `${baseUrl}/api/widgets/public/${widgetId}/render`;
    
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  /**
   * Cache widget content with TTL
   */
  public cacheWidgetContent(
    key: string, 
    data: any, 
    ttl?: number
  ): void {
    const cacheEntry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheSettings.widgetContent * 1000,
      etag: this.generateETag(data),
    };

    this.cache.set(key, cacheEntry);
  }

  /**
   * Get cached widget content
   */
  public getCachedWidgetContent(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Invalidate widget cache
   */
  public invalidateWidgetCache(widgetId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache.entries()) {
      if (key.includes(widgetId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    logger.info(`Invalidated ${keysToDelete.length} cache entries for widget ${widgetId}`);
  }

  /**
   * Get cache headers for widget responses
   */
  public getCacheHeaders(type: 'static' | 'content' | 'api', etag?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Vary': 'Accept, Accept-Encoding',
    };

    switch (type) {
      case 'static':
        headers['Cache-Control'] = `public, max-age=${this.config.cacheSettings.staticAssets}, s-maxage=${this.config.cacheSettings.staticAssets * 2}`;
        break;
      case 'content':
        headers['Cache-Control'] = `public, max-age=${this.config.cacheSettings.widgetContent}, s-maxage=${this.config.cacheSettings.widgetContent * 2}`;
        break;
      case 'api':
        headers['Cache-Control'] = `public, max-age=${this.config.cacheSettings.apiResponses}, s-maxage=${this.config.cacheSettings.apiResponses * 2}`;
        break;
    }

    if (etag) {
      headers['ETag'] = `"${etag}"`;
    }

    return headers;
  }

  /**
   * Preload widget content for faster delivery
   */
  public async preloadWidgetContent(widgetId: string): Promise<void> {
    try {
      // This would typically trigger background jobs to warm up the cache
      // For now, we'll just log the intent
      logger.info(`Preloading content for widget ${widgetId}`);
      
      // In a real implementation, you might:
      // 1. Fetch and cache the widget configuration
      // 2. Pre-render common widget variations
      // 3. Push content to edge locations
      // 4. Warm up database queries

    } catch (error) {
      logger.error(`Failed to preload widget content for ${widgetId}:`, error);
    }
  }

  /**
   * Get performance metrics for widget delivery
   */
  public getPerformanceMetrics(): {
    cacheHitRate: number;
    cacheSize: number;
    averageResponseTime: number;
    totalRequests: number;
  } {
    // In a real implementation, this would collect actual metrics
    return {
      cacheHitRate: 0.85, // 85% cache hit rate
      cacheSize: this.cache.size,
      averageResponseTime: 120, // 120ms average
      totalRequests: 10000, // Example total requests
    };
  }

  /**
   * Optimize widget content for delivery
   */
  public optimizeWidgetContent(content: {
    html: string;
    css: string;
    js: string;
  }): {
    html: string;
    css: string;
    js: string;
    optimizations: string[];
  } {
    const optimizations: string[] = [];

    // Minify HTML
    let optimizedHtml = content.html
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .trim();
    
    if (optimizedHtml.length < content.html.length) {
      optimizations.push('HTML minification');
    }

    // Minify CSS
    let optimizedCss = content.css
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
      .replace(/\s*{\s*/g, '{') // Clean up braces
      .replace(/\s*}\s*/g, '}')
      .replace(/\s*,\s*/g, ',') // Clean up commas
      .replace(/\s*:\s*/g, ':') // Clean up colons
      .trim();

    if (optimizedCss.length < content.css.length) {
      optimizations.push('CSS minification');
    }

    // Minify JavaScript (basic minification)
    let optimizedJs = content.js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();

    if (optimizedJs.length < content.js.length) {
      optimizations.push('JavaScript minification');
    }

    return {
      html: optimizedHtml,
      css: optimizedCss,
      js: optimizedJs,
      optimizations,
    };
  }

  /**
   * Generate ETag for content
   */
  private generateETag(data: any): string {
    const crypto = require('crypto');
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Get nearest CDN region for client
   */
  public getNearestRegion(clientIP?: string): string {
    // In a real implementation, this would use GeoIP lookup
    // For now, return the first configured region
    return this.config.regions[0] || 'us-east-1';
  }

  /**
   * Generate widget delivery analytics
   */
  public async trackDeliveryMetrics(widgetId: string, metrics: {
    loadTime: number;
    cacheHit: boolean;
    region: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      // In a real implementation, this would send metrics to analytics service
      logger.debug('Widget delivery metrics:', {
        widgetId,
        ...metrics,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      logger.error('Failed to track delivery metrics:', error);
    }
  }
}
import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { Content } from '../types/database';

export interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  recommendations: string[];
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
}

export class SEOService {
  /**
   * Generate XML sitemap for a website
   */
  async generateSitemap(websiteId: string, baseUrl: string): Promise<string> {
    try {
      // Get all published content
      const { data: content, error } = await supabase
        .from('content')
        .select('slug, updated_at, created_at')
        .eq('website_id', websiteId)
        .eq('status', 'published')
        .order('updated_at', { ascending: false });

      if (error) {
        throw new ApiError('Failed to fetch content for sitemap', 500, 'DATABASE_ERROR', error);
      }

      const entries: SitemapEntry[] = [];

      // Add homepage
      entries.push({
        url: baseUrl,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'daily',
        priority: 1.0,
      });

      // Add content pages
      if (content) {
        content.forEach(item => {
          entries.push({
            url: `${baseUrl}/${item.slug}`,
            lastmod: item.updated_at ? item.updated_at.split('T')[0] : item.created_at.split('T')[0],
            changefreq: 'weekly',
            priority: 0.8,
          });
        });
      }

      // Generate XML
      const xml = this.generateSitemapXML(entries);
      
      return xml;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to generate sitemap', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Generate XML string from sitemap entries
   */
  private generateSitemapXML(entries: SitemapEntry[]): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    const urlsetClose = '</urlset>';

    const urls = entries.map(entry => `
  <url>
    <loc>${this.escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('');

    return `${xmlHeader}\n${urlsetOpen}${urls}\n${urlsetClose}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Analyze content for SEO issues
   */
  analyzeSEO(content: Content): SEOAnalysis {
    const issues: SEOIssue[] = [];
    let score = 100;

    // Check title
    if (!content.title || content.title.trim().length === 0) {
      issues.push({
        type: 'error',
        field: 'title',
        message: 'Title is missing',
        suggestion: 'Add a descriptive title for your content',
      });
      score -= 20;
    } else if (content.title.length < 30) {
      issues.push({
        type: 'warning',
        field: 'title',
        message: 'Title is too short',
        suggestion: 'Consider making your title at least 30 characters long',
      });
      score -= 5;
    } else if (content.title.length > 60) {
      issues.push({
        type: 'warning',
        field: 'title',
        message: 'Title is too long',
        suggestion: 'Keep your title under 60 characters for better search results',
      });
      score -= 5;
    }

    // Check SEO title
    if (!content.seo_title || content.seo_title.trim().length === 0) {
      issues.push({
        type: 'warning',
        field: 'seo_title',
        message: 'SEO title is missing',
        suggestion: 'Add a custom SEO title optimized for search engines',
      });
      score -= 10;
    } else if (content.seo_title.length > 60) {
      issues.push({
        type: 'warning',
        field: 'seo_title',
        message: 'SEO title is too long',
        suggestion: 'Keep your SEO title under 60 characters',
      });
      score -= 5;
    }

    // Check meta description
    if (!content.seo_description || content.seo_description.trim().length === 0) {
      issues.push({
        type: 'error',
        field: 'seo_description',
        message: 'Meta description is missing',
        suggestion: 'Add a compelling meta description to improve click-through rates',
      });
      score -= 15;
    } else if (content.seo_description.length < 120) {
      issues.push({
        type: 'warning',
        field: 'seo_description',
        message: 'Meta description is too short',
        suggestion: 'Make your meta description at least 120 characters long',
      });
      score -= 5;
    } else if (content.seo_description.length > 160) {
      issues.push({
        type: 'warning',
        field: 'seo_description',
        message: 'Meta description is too long',
        suggestion: 'Keep your meta description under 160 characters',
      });
      score -= 5;
    }

    // Check excerpt
    if (!content.excerpt || content.excerpt.trim().length === 0) {
      issues.push({
        type: 'info',
        field: 'excerpt',
        message: 'Excerpt is missing',
        suggestion: 'Add an excerpt to provide a summary of your content',
      });
      score -= 5;
    }

    // Check content length
    if (!content.body || content.body.trim().length === 0) {
      issues.push({
        type: 'error',
        field: 'body',
        message: 'Content body is empty',
        suggestion: 'Add substantial content to your post',
      });
      score -= 25;
    } else {
      const wordCount = this.countWords(content.body);
      if (wordCount < 300) {
        issues.push({
          type: 'warning',
          field: 'body',
          message: 'Content is too short',
          suggestion: 'Consider adding more content. Aim for at least 300 words',
        });
        score -= 10;
      }
    }

    // Check slug
    if (!content.slug || content.slug.trim().length === 0) {
      issues.push({
        type: 'error',
        field: 'slug',
        message: 'URL slug is missing',
        suggestion: 'Add a SEO-friendly URL slug',
      });
      score -= 10;
    } else if (content.slug.length > 50) {
      issues.push({
        type: 'warning',
        field: 'slug',
        message: 'URL slug is too long',
        suggestion: 'Keep your URL slug under 50 characters',
      });
      score -= 5;
    }

    // Check featured image
    if (!content.featured_image_url) {
      issues.push({
        type: 'info',
        field: 'featured_image_url',
        message: 'Featured image is missing',
        suggestion: 'Add a featured image to improve social media sharing',
      });
      score -= 5;
    }

    // Check keywords
    if (!content.seo_keywords || content.seo_keywords.trim().length === 0) {
      issues.push({
        type: 'info',
        field: 'seo_keywords',
        message: 'SEO keywords are missing',
        suggestion: 'Add relevant keywords to help with search engine optimization',
      });
      score -= 5;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues);

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  /**
   * Count words in text content
   */
  private countWords(text: string): number {
    // Remove HTML tags and count words
    const plainText = text.replace(/<[^>]*>/g, ' ');
    const words = plainText.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  /**
   * Generate SEO recommendations based on issues
   */
  private generateRecommendations(issues: SEOIssue[]): string[] {
    const recommendations: string[] = [];

    const errorCount = issues.filter(issue => issue.type === 'error').length;
    const warningCount = issues.filter(issue => issue.type === 'warning').length;

    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} critical SEO issue${errorCount > 1 ? 's' : ''} first`);
    }

    if (warningCount > 0) {
      recommendations.push(`Address ${warningCount} SEO warning${warningCount > 1 ? 's' : ''} to improve ranking`);
    }

    // Specific recommendations based on common issues
    const hasMetaDescription = !issues.some(issue => issue.field === 'seo_description' && issue.type === 'error');
    const hasTitle = !issues.some(issue => issue.field === 'title' && issue.type === 'error');
    const hasContent = !issues.some(issue => issue.field === 'body' && issue.type === 'error');

    if (hasMetaDescription && hasTitle && hasContent) {
      recommendations.push('Your content has good basic SEO structure');
    }

    if (issues.some(issue => issue.field === 'body' && issue.message.includes('short'))) {
      recommendations.push('Consider expanding your content with more detailed information');
    }

    if (issues.some(issue => issue.field === 'featured_image_url')) {
      recommendations.push('Add a featured image to improve social media engagement');
    }

    if (issues.some(issue => issue.field === 'seo_keywords')) {
      recommendations.push('Research and add relevant keywords for better search visibility');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your content is well-optimized for SEO!');
    }

    return recommendations;
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(websiteId: string, baseUrl: string): string {
    const sitemapUrl = `${baseUrl}/sitemap.xml`;
    
    return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${sitemapUrl}

# Crawl-delay
Crawl-delay: 1`;
  }

  /**
   * Get SEO performance metrics for a website
   */
  async getSEOMetrics(websiteId: string): Promise<{
    totalContent: number;
    publishedContent: number;
    contentWithSEOTitle: number;
    contentWithMetaDescription: number;
    contentWithKeywords: number;
    contentWithFeaturedImage: number;
    averageContentLength: number;
    seoCompletionRate: number;
  }> {
    try {
      const { data: content, error } = await supabase
        .from('content')
        .select('seo_title, seo_description, seo_keywords, featured_image_url, body, status')
        .eq('website_id', websiteId);

      if (error) {
        throw new ApiError('Failed to fetch SEO metrics', 500, 'DATABASE_ERROR', error);
      }

      if (!content || content.length === 0) {
        return {
          totalContent: 0,
          publishedContent: 0,
          contentWithSEOTitle: 0,
          contentWithMetaDescription: 0,
          contentWithKeywords: 0,
          contentWithFeaturedImage: 0,
          averageContentLength: 0,
          seoCompletionRate: 0,
        };
      }

      const totalContent = content.length;
      const publishedContent = content.filter(item => item.status === 'published').length;
      const contentWithSEOTitle = content.filter(item => item.seo_title && item.seo_title.trim().length > 0).length;
      const contentWithMetaDescription = content.filter(item => item.seo_description && item.seo_description.trim().length > 0).length;
      const contentWithKeywords = content.filter(item => item.seo_keywords && item.seo_keywords.trim().length > 0).length;
      const contentWithFeaturedImage = content.filter(item => item.featured_image_url && item.featured_image_url.trim().length > 0).length;

      const totalWords = content.reduce((sum, item) => sum + this.countWords(item.body || ''), 0);
      const averageContentLength = totalContent > 0 ? Math.round(totalWords / totalContent) : 0;

      // Calculate SEO completion rate (percentage of content with all SEO fields filled)
      const fullyOptimizedContent = content.filter(item => 
        item.seo_title && item.seo_title.trim().length > 0 &&
        item.seo_description && item.seo_description.trim().length > 0 &&
        item.seo_keywords && item.seo_keywords.trim().length > 0 &&
        item.featured_image_url && item.featured_image_url.trim().length > 0
      ).length;

      const seoCompletionRate = totalContent > 0 ? Math.round((fullyOptimizedContent / totalContent) * 100) : 0;

      return {
        totalContent,
        publishedContent,
        contentWithSEOTitle,
        contentWithMetaDescription,
        contentWithKeywords,
        contentWithFeaturedImage,
        averageContentLength,
        seoCompletionRate,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to get SEO metrics', 500, 'INTERNAL_ERROR', error);
    }
  }
}

export const seoService = new SEOService();
import { Request, Response } from 'express';
import { seoService } from '../services/seo.service';
import { contentService } from '../services/content.service';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';
import { supabase } from '../config/supabase';

export class SEOController {
  /**
   * Generate and serve XML sitemap
   */
  static generateSitemap = asyncHandler(async (req: Request, res: Response) => {
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Get website info to determine base URL
      const { data: website, error } = await supabase
        .from('websites')
        .select('domain')
        .eq('id', websiteId)
        .single();

      if (error || !website) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const baseUrl = `https://${website.domain}`;
      const sitemap = await seoService.generateSitemap(websiteId, baseUrl);

      res.set({
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      });

      res.send(sitemap);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate sitemap');
    }
  });

  /**
   * Generate and serve robots.txt
   */
  static generateRobotsTxt = asyncHandler(async (req: Request, res: Response) => {
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Get website info to determine base URL
      const { data: website, error } = await supabase
        .from('websites')
        .select('domain')
        .eq('id', websiteId)
        .single();

      if (error || !website) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const baseUrl = `https://${website.domain}`;
      const robotsTxt = seoService.generateRobotsTxt(websiteId, baseUrl);

      res.set({
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      });

      res.send(robotsTxt);
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate robots.txt');
    }
  });

  /**
   * Analyze content for SEO issues
   */
  static analyzeContentSEO = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId, contentId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId) || !HelperUtil.isValidUuid(contentId)) {
      return ResponseUtil.badRequest(res, 'Invalid ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get content
      const content = await contentService.getContentById(contentId, websiteId);

      // Analyze SEO
      const analysis = seoService.analyzeSEO(content);

      logDatabaseOperation('SELECT', 'content', {
        contentId,
        websiteId,
        userId,
        action: 'seo_analysis',
      });

      ResponseUtil.success(res, { analysis });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return ResponseUtil.notFound(res, error.message);
      }
      ResponseUtil.internalError(res, error.message || 'Failed to analyze content SEO');
    }
  });

  /**
   * Get SEO metrics for a website
   */
  static getSEOMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const metrics = await seoService.getSEOMetrics(websiteId);

      logDatabaseOperation('SELECT', 'content', {
        websiteId,
        userId,
        action: 'seo_metrics',
      });

      ResponseUtil.success(res, { metrics });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to fetch SEO metrics');
    }
  });

  /**
   * Get SEO recommendations for improving website
   */
  static getSEORecommendations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { websiteId } = req.params;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if user has access to website
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get all content for analysis
      const { data: content, error } = await supabase
        .from('content')
        .select('*')
        .eq('website_id', websiteId);

      if (error) {
        throw new Error('Failed to fetch content for SEO analysis');
      }

      const recommendations: string[] = [];
      let totalScore = 0;
      let contentCount = 0;

      if (content && content.length > 0) {
        content.forEach(item => {
          const analysis = seoService.analyzeSEO(item);
          totalScore += analysis.score;
          contentCount++;
        });

        const averageScore = Math.round(totalScore / contentCount);

        // Generate website-level recommendations
        if (averageScore < 70) {
          recommendations.push('Your content needs significant SEO improvements');
          recommendations.push('Focus on adding meta descriptions and optimizing titles');
        } else if (averageScore < 85) {
          recommendations.push('Your SEO is good but can be improved');
          recommendations.push('Consider adding more detailed content and featured images');
        } else {
          recommendations.push('Excellent SEO! Keep up the good work');
        }

        // Check for common issues across content
        const contentWithoutMetaDesc = content.filter(item => 
          !item.seo_description || item.seo_description.trim().length === 0
        ).length;

        const contentWithoutImages = content.filter(item => 
          !item.featured_image_url || item.featured_image_url.trim().length === 0
        ).length;

        if (contentWithoutMetaDesc > content.length * 0.5) {
          recommendations.push('Add meta descriptions to improve click-through rates');
        }

        if (contentWithoutImages > content.length * 0.7) {
          recommendations.push('Add featured images to improve social media sharing');
        }

        // Content length recommendations
        const shortContent = content.filter(item => {
          const wordCount = (item.body || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
          return wordCount < 300;
        }).length;

        if (shortContent > content.length * 0.3) {
          recommendations.push('Consider expanding short articles with more detailed information');
        }
      } else {
        recommendations.push('Start by creating content to improve your SEO');
        recommendations.push('Focus on quality, keyword-optimized articles');
      }

      logDatabaseOperation('SELECT', 'content', {
        websiteId,
        userId,
        action: 'seo_recommendations',
      });

      ResponseUtil.success(res, {
        recommendations,
        averageScore: contentCount > 0 ? Math.round(totalScore / contentCount) : 0,
        contentAnalyzed: contentCount,
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, error.message || 'Failed to generate SEO recommendations');
    }
  });
}

export default SEOController;
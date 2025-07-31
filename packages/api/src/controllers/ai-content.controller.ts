import { Request, Response } from 'express';
import { aiContentService } from '../services/ai-content.service';
import { logger } from '../utils/logger';
import { successResponse, errorResponse } from '../utils/response';

export class AIContentController {
  /**
   * Generate content using AI
   */
  async generateContent(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const {
        prompt,
        contentType,
        tone,
        length,
        keywords,
        targetAudience,
        language,
        includeOutline
      } = req.body;

      // Validate required fields
      if (!prompt || !contentType || !tone || !length) {
        errorResponse(res, 'Missing required fields: prompt, contentType, tone, length', 400);
        return;
      }

      const result = await aiContentService.generateContent({
        prompt,
        contentType,
        tone,
        length,
        keywords,
        targetAudience,
        language,
        includeOutline
      }, userId);

      successResponse(res, result, 'Content generated successfully');

    } catch (error) {
      logger.error('Generate content error:', error);
      errorResponse(res, error.message || 'Failed to generate content', 500);
    }
  }

  /**
   * Enhance existing content
   */
  async enhanceContent(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const {
        content,
        enhancementType,
        targetKeywords,
        tone
      } = req.body;

      if (!content || !enhancementType) {
        errorResponse(res, 'Missing required fields: content, enhancementType', 400);
        return;
      }

      const result = await aiContentService.enhanceContent({
        content,
        enhancementType,
        targetKeywords,
        tone
      }, userId);

      successResponse(res, result, 'Content enhanced successfully');

    } catch (error) {
      logger.error('Enhance content error:', error);
      errorResponse(res, error.message || 'Failed to enhance content', 500);
    }
  }

  /**
   * Translate content
   */
  async translateContent(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const {
        content,
        sourceLanguage,
        targetLanguage,
        preserveFormatting
      } = req.body;

      if (!content || !sourceLanguage || !targetLanguage) {
        errorResponse(res, 'Missing required fields: content, sourceLanguage, targetLanguage', 400);
        return;
      }

      const result = await aiContentService.translateContent({
        content,
        sourceLanguage,
        targetLanguage,
        preserveFormatting
      }, userId);

      successResponse(res, result, 'Content translated successfully');

    } catch (error) {
      logger.error('Translate content error:', error);
      errorResponse(res, error.message || 'Failed to translate content', 500);
    }
  }

  /**
   * Generate content ideas
   */
  async generateIdeas(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const {
        topic,
        industry,
        contentType,
        count
      } = req.body;

      if (!contentType) {
        errorResponse(res, 'Missing required field: contentType', 400);
        return;
      }

      const ideas = await aiContentService.generateIdeas({
        topic,
        industry,
        contentType,
        count
      }, userId);

      successResponse(res, { ideas }, 'Content ideas generated successfully');

    } catch (error) {
      logger.error('Generate ideas error:', error);
      errorResponse(res, error.message || 'Failed to generate ideas', 500);
    }
  }

  /**
   * Analyze content
   */
  async analyzeContent(req: Request, res: Response): Promise<void> {
    try {
      const { content, targetKeywords } = req.body;

      if (!content) {
        errorResponse(res, 'Missing required field: content', 400);
        return;
      }

      const analysis = await aiContentService.analyzeContent(content, targetKeywords);

      successResponse(res, analysis, 'Content analyzed successfully');

    } catch (error) {
      logger.error('Analyze content error:', error);
      errorResponse(res, error.message || 'Failed to analyze content', 500);
    }
  }

  /**
   * Get user's AI usage stats
   */
  async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const remainingRequests = aiContentService.getRemainingRequests(userId);

      const stats = {
        remainingRequests,
        totalRequests: 50,
        resetTime: new Date(Date.now() + (60 * 60 * 1000)).toISOString()
      };

      successResponse(res, stats, 'Usage stats retrieved successfully');

    } catch (error) {
      logger.error('Get usage stats error:', error);
      errorResponse(res, error.message || 'Failed to get usage stats', 500);
    }
  }

  /**
   * Get AI writing templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = [
        {
          id: 'blog_post',
          name: 'Blog Post',
          description: 'Create engaging blog posts with SEO optimization',
          prompts: [
            'Write a comprehensive guide about [topic]',
            'Create a listicle about [topic]',
            'Write a how-to article for [topic]',
            'Create a comparison post between [option1] and [option2]'
          ],
          defaultSettings: {
            contentType: 'blog_post',
            tone: 'conversational',
            length: 'medium',
            includeOutline: true
          }
        },
        {
          id: 'social_media',
          name: 'Social Media Post',
          description: 'Create engaging social media content',
          prompts: [
            'Write a compelling social media post about [topic]',
            'Create an announcement post for [event/product]',
            'Write a motivational post about [theme]',
            'Create a behind-the-scenes post about [process]'
          ],
          defaultSettings: {
            contentType: 'social_media',
            tone: 'casual',
            length: 'short',
            includeOutline: false
          }
        },
        {
          id: 'email',
          name: 'Email Newsletter',
          description: 'Write effective email newsletters',
          prompts: [
            'Write a welcome email for new subscribers',
            'Create a newsletter about [topic]',
            'Write a promotional email for [product/service]',
            'Create a re-engagement email for inactive subscribers'
          ],
          defaultSettings: {
            contentType: 'email',
            tone: 'friendly',
            length: 'medium',
            includeOutline: false
          }
        },
        {
          id: 'product_description',
          name: 'Product Description',
          description: 'Write compelling product descriptions',
          prompts: [
            'Write a product description for [product name]',
            'Create a feature-focused description for [product]',
            'Write a benefit-driven description for [product]',
            'Create a technical specification description for [product]'
          ],
          defaultSettings: {
            contentType: 'product_description',
            tone: 'persuasive',
            length: 'short',
            includeOutline: false
          }
        },
        {
          id: 'landing_page',
          name: 'Landing Page',
          description: 'Create high-converting landing page content',
          prompts: [
            'Write landing page copy for [product/service]',
            'Create a sales page for [offer]',
            'Write a lead magnet landing page for [resource]',
            'Create an event registration page for [event]'
          ],
          defaultSettings: {
            contentType: 'landing_page',
            tone: 'persuasive',
            length: 'long',
            includeOutline: true
          }
        },
        {
          id: 'article',
          name: 'Article',
          description: 'Write informative articles and guides',
          prompts: [
            'Write an informative article about [topic]',
            'Create a research-based article on [subject]',
            'Write a news article about [event/development]',
            'Create an opinion piece on [controversial topic]'
          ],
          defaultSettings: {
            contentType: 'article',
            tone: 'professional',
            length: 'long',
            includeOutline: true
          }
        }
      ];

      successResponse(res, { templates }, 'Templates retrieved successfully');

    } catch (error) {
      logger.error('Get templates error:', error);
      errorResponse(res, error.message || 'Failed to get templates', 500);
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(req: Request, res: Response): Promise<void> {
    try {
      const languages = [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
        { code: 'fr', name: 'French', nativeName: 'Français' },
        { code: 'de', name: 'German', nativeName: 'Deutsch' },
        { code: 'it', name: 'Italian', nativeName: 'Italiano' },
        { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
        { code: 'ru', name: 'Russian', nativeName: 'Русский' },
        { code: 'ja', name: 'Japanese', nativeName: '日本語' },
        { code: 'ko', name: 'Korean', nativeName: '한국어' },
        { code: 'zh', name: 'Chinese', nativeName: '中文' },
        { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
        { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
        { code: 'da', name: 'Danish', nativeName: 'Dansk' },
        { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
        { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
        { code: 'pl', name: 'Polish', nativeName: 'Polski' },
        { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
        { code: 'th', name: 'Thai', nativeName: 'ไทย' }
      ];

      successResponse(res, { languages }, 'Supported languages retrieved successfully');

    } catch (error) {
      logger.error('Get supported languages error:', error);
      errorResponse(res, error.message || 'Failed to get supported languages', 500);
    }
  }
}
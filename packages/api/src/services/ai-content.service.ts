import Replicate from 'replicate';
import { logger } from '../utils/logger';
import { cacheService, CacheKeys } from './cache.service';

interface AIContentRequest {
  prompt: string;
  contentType: 'article' | 'blog_post' | 'social_media' | 'email' | 'product_description' | 'landing_page';
  tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'conversational' | 'persuasive';
  length: 'short' | 'medium' | 'long';
  keywords?: string[];
  targetAudience?: string;
  language?: string;
  includeOutline?: boolean;
}

interface AIContentResponse {
  content: string;
  title?: string;
  outline?: string[];
  keywords?: string[];
  seoScore?: number;
  readabilityScore?: number;
  suggestions?: string[];
}

interface AIEnhancementRequest {
  content: string;
  enhancementType: 'grammar' | 'seo' | 'tone' | 'readability' | 'engagement';
  targetKeywords?: string[];
  tone?: string;
}

interface AITranslationRequest {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  preserveFormatting?: boolean;
}

interface AIIdeaRequest {
  topic?: string;
  industry?: string;
  contentType: string;
  count?: number;
}

class AIContentService {
  private replicate: Replicate;
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  /**
   * Generate content using AI
   */
  async generateContent(request: AIContentRequest, userId: string): Promise<AIContentResponse> {
    try {
      // Check rate limits
      await this.checkRateLimit(userId);

      // Create cache key
      const cacheKey = `ai_content:${Buffer.from(JSON.stringify(request)).toString('base64')}`;
      
      // Check cache first
      const cached = await cacheService.get<AIContentResponse>(cacheKey);
      if (cached) {
        logger.info('AI content served from cache', { userId, contentType: request.contentType });
        return cached;
      }

      // Build prompt based on request
      const prompt = this.buildContentPrompt(request);

      // Generate content using Replicate
      const output = await this.replicate.run(
        "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
        {
          input: {
            prompt,
            max_new_tokens: this.getMaxTokens(request.length),
            temperature: 0.7,
            top_p: 0.9,
            repetition_penalty: 1.15,
          }
        }
      ) as string[];

      const generatedText = output.join('');

      // Parse and structure the response
      const response = await this.parseContentResponse(generatedText, request);

      // Cache the result
      await cacheService.set(cacheKey, response, { ttl: 3600 }); // 1 hour cache

      // Update rate limit
      this.updateRateLimit(userId);

      logger.info('AI content generated successfully', { 
        userId, 
        contentType: request.contentType,
        contentLength: response.content.length 
      });

      return response;

    } catch (error) {
      logger.error('AI content generation failed:', error);
      throw new Error('Failed to generate content. Please try again.');
    }
  }

  /**
   * Enhance existing content
   */
  async enhanceContent(request: AIEnhancementRequest, userId: string): Promise<AIContentResponse> {
    try {
      await this.checkRateLimit(userId);

      const cacheKey = `ai_enhance:${Buffer.from(JSON.stringify(request)).toString('base64')}`;
      
      const cached = await cacheService.get<AIContentResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt = this.buildEnhancementPrompt(request);

      const output = await this.replicate.run(
        "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
        {
          input: {
            prompt,
            max_new_tokens: Math.min(request.content.length * 1.5, 2000),
            temperature: 0.5,
            top_p: 0.9,
          }
        }
      ) as string[];

      const enhancedText = output.join('');
      const response = await this.parseEnhancementResponse(enhancedText, request);

      await cacheService.set(cacheKey, response, { ttl: 1800 }); // 30 minutes cache
      this.updateRateLimit(userId);

      logger.info('Content enhanced successfully', { 
        userId, 
        enhancementType: request.enhancementType 
      });

      return response;

    } catch (error) {
      logger.error('Content enhancement failed:', error);
      throw new Error('Failed to enhance content. Please try again.');
    }
  }

  /**
   * Translate content
   */
  async translateContent(request: AITranslationRequest, userId: string): Promise<AIContentResponse> {
    try {
      await this.checkRateLimit(userId);

      const cacheKey = `ai_translate:${request.sourceLanguage}:${request.targetLanguage}:${Buffer.from(request.content).toString('base64').substring(0, 50)}`;
      
      const cached = await cacheService.get<AIContentResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt = this.buildTranslationPrompt(request);

      const output = await this.replicate.run(
        "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
        {
          input: {
            prompt,
            max_new_tokens: request.content.length * 1.2,
            temperature: 0.3,
            top_p: 0.9,
          }
        }
      ) as string[];

      const translatedText = output.join('');
      const response = { content: translatedText.trim() };

      await cacheService.set(cacheKey, response, { ttl: 7200 }); // 2 hours cache
      this.updateRateLimit(userId);

      logger.info('Content translated successfully', { 
        userId, 
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage 
      });

      return response;

    } catch (error) {
      logger.error('Content translation failed:', error);
      throw new Error('Failed to translate content. Please try again.');
    }
  }

  /**
   * Generate content ideas
   */
  async generateIdeas(request: AIIdeaRequest, userId: string): Promise<string[]> {
    try {
      await this.checkRateLimit(userId);

      const cacheKey = `ai_ideas:${Buffer.from(JSON.stringify(request)).toString('base64')}`;
      
      const cached = await cacheService.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const prompt = this.buildIdeasPrompt(request);

      const output = await this.replicate.run(
        "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
        {
          input: {
            prompt,
            max_new_tokens: 800,
            temperature: 0.8,
            top_p: 0.9,
          }
        }
      ) as string[];

      const ideasText = output.join('');
      const ideas = this.parseIdeasResponse(ideasText, request.count || 10);

      await cacheService.set(cacheKey, ideas, { ttl: 1800 }); // 30 minutes cache
      this.updateRateLimit(userId);

      logger.info('Content ideas generated successfully', { 
        userId, 
        topic: request.topic,
        count: ideas.length 
      });

      return ideas;

    } catch (error) {
      logger.error('Content ideas generation failed:', error);
      throw new Error('Failed to generate content ideas. Please try again.');
    }
  }

  /**
   * Analyze content for SEO and readability
   */
  async analyzeContent(content: string, targetKeywords?: string[]): Promise<{
    seoScore: number;
    readabilityScore: number;
    suggestions: string[];
    keywordDensity: Record<string, number>;
    readingTime: number;
  }> {
    try {
      const analysis = {
        seoScore: this.calculateSEOScore(content, targetKeywords),
        readabilityScore: this.calculateReadabilityScore(content),
        suggestions: this.generateSEOSuggestions(content, targetKeywords),
        keywordDensity: this.calculateKeywordDensity(content, targetKeywords),
        readingTime: this.calculateReadingTime(content)
      };

      return analysis;

    } catch (error) {
      logger.error('Content analysis failed:', error);
      throw new Error('Failed to analyze content.');
    }
  }

  /**
   * Build content generation prompt
   */
  private buildContentPrompt(request: AIContentRequest): string {
    const { prompt, contentType, tone, length, keywords, targetAudience, language = 'English' } = request;

    let systemPrompt = `You are an expert content writer. Create high-quality ${contentType.replace('_', ' ')} content in ${language}.

Content Requirements:
- Type: ${contentType.replace('_', ' ')}
- Tone: ${tone}
- Length: ${length}
- Language: ${language}`;

    if (targetAudience) {
      systemPrompt += `\n- Target Audience: ${targetAudience}`;
    }

    if (keywords && keywords.length > 0) {
      systemPrompt += `\n- Include these keywords naturally: ${keywords.join(', ')}`;
    }

    if (request.includeOutline) {
      systemPrompt += `\n- Include a content outline at the beginning`;
    }

    systemPrompt += `\n\nUser Request: ${prompt}

Please provide:
1. A compelling title
2. ${request.includeOutline ? 'An outline\n3. ' : ''}The main content
${request.includeOutline ? '4.' : '3.'} SEO-friendly meta description

Format your response clearly with headers for each section.`;

    return systemPrompt;
  }

  /**
   * Build enhancement prompt
   */
  private buildEnhancementPrompt(request: AIEnhancementRequest): string {
    const { content, enhancementType, targetKeywords, tone } = request;

    let systemPrompt = `You are an expert content editor. Enhance the following content for ${enhancementType}.

Enhancement Focus: ${enhancementType}`;

    if (targetKeywords && targetKeywords.length > 0) {
      systemPrompt += `\nTarget Keywords: ${targetKeywords.join(', ')}`;
    }

    if (tone) {
      systemPrompt += `\nDesired Tone: ${tone}`;
    }

    systemPrompt += `\n\nOriginal Content:\n${content}

Please provide the enhanced version with improvements for ${enhancementType}. Maintain the original structure and meaning while making the specified improvements.`;

    return systemPrompt;
  }

  /**
   * Build translation prompt
   */
  private buildTranslationPrompt(request: AITranslationRequest): string {
    const { content, sourceLanguage, targetLanguage, preserveFormatting = true } = request;

    return `Translate the following content from ${sourceLanguage} to ${targetLanguage}.

Requirements:
- Maintain the original meaning and context
- Use natural, fluent language
- ${preserveFormatting ? 'Preserve formatting and structure' : 'Focus on natural flow over formatting'}
- Adapt cultural references appropriately

Content to translate:
${content}

Provide only the translated content:`;
  }

  /**
   * Build ideas generation prompt
   */
  private buildIdeasPrompt(request: AIIdeaRequest): string {
    const { topic, industry, contentType, count = 10 } = request;

    let systemPrompt = `Generate ${count} creative and engaging content ideas for ${contentType}.`;

    if (topic) {
      systemPrompt += `\nTopic: ${topic}`;
    }

    if (industry) {
      systemPrompt += `\nIndustry: ${industry}`;
    }

    systemPrompt += `\n\nRequirements:
- Ideas should be specific and actionable
- Include variety in approach and angle
- Consider current trends and audience interests
- Make each idea unique and compelling

Format: Provide a numbered list of ideas, each on a new line.`;

    return systemPrompt;
  }

  /**
   * Parse content generation response
   */
  private async parseContentResponse(text: string, request: AIContentRequest): Promise<AIContentResponse> {
    const lines = text.split('\n').filter(line => line.trim());
    
    let title = '';
    let content = '';
    let outline: string[] = [];
    
    // Extract title
    const titleMatch = text.match(/(?:Title|Headline):\s*(.+)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Extract outline if requested
    if (request.includeOutline) {
      const outlineMatch = text.match(/(?:Outline|Structure):\s*((?:\n.*?)*?)(?:\n\n|Content:|$)/i);
      if (outlineMatch) {
        outline = outlineMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)))
          .map(line => line.replace(/^[-•\d.]\s*/, ''));
      }
    }

    // Extract main content
    const contentMatch = text.match(/(?:Content|Article|Post):\s*([\s\S]*?)(?:\n\nMeta Description:|$)/i);
    if (contentMatch) {
      content = contentMatch[1].trim();
    } else {
      // Fallback: use the entire text if no clear structure
      content = text.trim();
    }

    // Analyze the generated content
    const analysis = await this.analyzeContent(content, request.keywords);

    return {
      content,
      title: title || this.generateTitleFromContent(content),
      outline: outline.length > 0 ? outline : undefined,
      keywords: request.keywords,
      seoScore: analysis.seoScore,
      readabilityScore: analysis.readabilityScore,
      suggestions: analysis.suggestions
    };
  }

  /**
   * Parse enhancement response
   */
  private async parseEnhancementResponse(text: string, request: AIEnhancementRequest): Promise<AIContentResponse> {
    const content = text.trim();
    const analysis = await this.analyzeContent(content, request.targetKeywords);

    return {
      content,
      seoScore: analysis.seoScore,
      readabilityScore: analysis.readabilityScore,
      suggestions: analysis.suggestions
    };
  }

  /**
   * Parse ideas response
   */
  private parseIdeasResponse(text: string, count: number): string[] {
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line && /^\d+\./.test(line))
      .map(line => line.replace(/^\d+\.\s*/, ''))
      .slice(0, count);

    return lines.length > 0 ? lines : [
      'Create a comprehensive guide on your topic',
      'Share behind-the-scenes insights',
      'Compare different approaches or solutions',
      'Interview industry experts',
      'Create a case study from real experience'
    ];
  }

  /**
   * Calculate SEO score
   */
  private calculateSEOScore(content: string, keywords?: string[]): number {
    let score = 50; // Base score

    // Content length check
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 300) score += 10;
    if (wordCount >= 1000) score += 10;

    // Keyword usage
    if (keywords && keywords.length > 0) {
      const contentLower = content.toLowerCase();
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        const occurrences = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
        const density = (occurrences / wordCount) * 100;
        
        if (density >= 0.5 && density <= 2.5) {
          score += 5;
        }
      });
    }

    // Structure checks
    if (content.includes('\n\n')) score += 5; // Paragraphs
    if (/#{1,6}\s/.test(content)) score += 5; // Headers
    if (content.includes('- ') || content.includes('• ')) score += 5; // Lists

    return Math.min(score, 100);
  }

  /**
   * Calculate readability score (simplified Flesch Reading Ease)
   */
  private calculateReadabilityScore(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;
    
    if (word.endsWith('e')) count--;
    if (word.endsWith('le') && word.length > 2) count++;
    
    return Math.max(1, count);
  }

  /**
   * Generate SEO suggestions
   */
  private generateSEOSuggestions(content: string, keywords?: string[]): string[] {
    const suggestions: string[] = [];
    const wordCount = content.split(/\s+/).length;

    if (wordCount < 300) {
      suggestions.push('Consider expanding your content to at least 300 words for better SEO');
    }

    if (keywords && keywords.length > 0) {
      const contentLower = content.toLowerCase();
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        if (!contentLower.includes(keywordLower)) {
          suggestions.push(`Consider including the keyword "${keyword}" in your content`);
        }
      });
    }

    if (!content.includes('\n\n')) {
      suggestions.push('Break your content into paragraphs for better readability');
    }

    if (!/#{1,6}\s/.test(content)) {
      suggestions.push('Add headers to structure your content better');
    }

    return suggestions;
  }

  /**
   * Calculate keyword density
   */
  private calculateKeywordDensity(content: string, keywords?: string[]): Record<string, number> {
    if (!keywords || keywords.length === 0) return {};

    const words = content.toLowerCase().split(/\s+/);
    const totalWords = words.length;
    const density: Record<string, number> = {};

    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const occurrences = words.filter(word => word.includes(keywordLower)).length;
      density[keyword] = (occurrences / totalWords) * 100;
    });

    return density;
  }

  /**
   * Calculate reading time
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Generate title from content
   */
  private generateTitleFromContent(content: string): string {
    const firstSentence = content.split(/[.!?]/)[0];
    return firstSentence.length > 60 
      ? firstSentence.substring(0, 57) + '...'
      : firstSentence;
  }

  /**
   * Get max tokens based on length
   */
  private getMaxTokens(length: string): number {
    switch (length) {
      case 'short': return 500;
      case 'medium': return 1000;
      case 'long': return 2000;
      default: return 1000;
    }
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(userId: string): Promise<void> {
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimits.set(userId, {
        count: 0,
        resetTime: now + (60 * 60 * 1000) // 1 hour
      });
      return;
    }

    if (userLimit.count >= 50) { // 50 requests per hour
      throw new Error('Rate limit exceeded. Please try again later.');
    }
  }

  /**
   * Update rate limit
   */
  private updateRateLimit(userId: string): void {
    const userLimit = this.rateLimits.get(userId);
    if (userLimit) {
      userLimit.count++;
    }
  }

  /**
   * Get user's remaining rate limit
   */
  getRemainingRequests(userId: string): number {
    const userLimit = this.rateLimits.get(userId);
    if (!userLimit || Date.now() > userLimit.resetTime) {
      return 50;
    }
    return Math.max(0, 50 - userLimit.count);
  }
}

export const aiContentService = new AIContentService();
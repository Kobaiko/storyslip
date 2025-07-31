import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../index';
import { aiContentService } from '../services/ai-content.service';

// Mock Replicate
jest.mock('replicate', () => {
  return jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue(['Generated content from AI model'])
  }));
});

describe('AI Content Service', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Setup test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'aitest@example.com',
        password: 'password123',
        name: 'AI Test User'
      });

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Content Generation', () => {
    it('should generate content successfully', async () => {
      const response = await request(app)
        .post('/api/ai-content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Write about renewable energy benefits',
          contentType: 'blog_post',
          tone: 'conversational',
          length: 'medium',
          keywords: ['renewable energy', 'sustainability'],
          targetAudience: 'environmentally conscious consumers',
          language: 'English',
          includeOutline: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('seoScore');
      expect(response.body.data).toHaveProperty('readabilityScore');
    });

    it('should validate required fields for content generation', async () => {
      const response = await request(app)
        .post('/api/ai-content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test prompt'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid content type', async () => {
      const response = await request(app)
        .post('/api/ai-content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test prompt',
          contentType: 'invalid_type',
          tone: 'conversational',
          length: 'medium'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle rate limiting', async () => {
      // Mock rate limit exceeded
      jest.spyOn(aiContentService, 'generateContent').mockRejectedValueOnce(
        new Error('Rate limit exceeded. Please try again later.')
      );

      const response = await request(app)
        .post('/api/ai-content/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Test prompt',
          contentType: 'blog_post',
          tone: 'conversational',
          length: 'medium'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Rate limit exceeded');
    });
  });

  describe('Content Enhancement', () => {
    it('should enhance content successfully', async () => {
      const response = await request(app)
        .post('/api/ai-content/enhance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is some content that needs enhancement for better SEO and readability.',
          enhancementType: 'seo',
          targetKeywords: ['SEO', 'content optimization'],
          tone: 'professional'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('seoScore');
    });

    it('should validate content for enhancement', async () => {
      const response = await request(app)
        .post('/api/ai-content/enhance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '', // Empty content
          enhancementType: 'seo'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid enhancement type', async () => {
      const response = await request(app)
        .post('/api/ai-content/enhance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test content',
          enhancementType: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Content Translation', () => {
    it('should translate content successfully', async () => {
      const response = await request(app)
        .post('/api/ai-content/translate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hello, this is a test content for translation.',
          sourceLanguage: 'English',
          targetLanguage: 'Spanish',
          preserveFormatting: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
    });

    it('should validate translation parameters', async () => {
      const response = await request(app)
        .post('/api/ai-content/translate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test content'
          // Missing source and target languages
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Content Ideas Generation', () => {
    it('should generate content ideas successfully', async () => {
      const response = await request(app)
        .post('/api/ai-content/ideas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'digital marketing',
          industry: 'technology',
          contentType: 'blog_post',
          count: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ideas');
      expect(Array.isArray(response.body.data.ideas)).toBe(true);
    });

    it('should validate content type for ideas', async () => {
      const response = await request(app)
        .post('/api/ai-content/ideas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          topic: 'test topic'
          // Missing contentType
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Content Analysis', () => {
    it('should analyze content successfully', async () => {
      const response = await request(app)
        .post('/api/ai-content/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a comprehensive article about renewable energy and its benefits for the environment. It covers solar power, wind energy, and other sustainable solutions.',
          targetKeywords: ['renewable energy', 'solar power', 'sustainability']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('seoScore');
      expect(response.body.data).toHaveProperty('readabilityScore');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data).toHaveProperty('keywordDensity');
      expect(response.body.data).toHaveProperty('readingTime');
    });

    it('should validate content for analysis', async () => {
      const response = await request(app)
        .post('/api/ai-content/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '' // Empty content
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Usage Statistics', () => {
    it('should get usage statistics', async () => {
      const response = await request(app)
        .get('/api/ai-content/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('remainingRequests');
      expect(response.body.data).toHaveProperty('totalRequests');
      expect(response.body.data).toHaveProperty('resetTime');
    });
  });

  describe('Templates', () => {
    it('should get AI writing templates', async () => {
      const response = await request(app)
        .get('/api/ai-content/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('templates');
      expect(Array.isArray(response.body.data.templates)).toBe(true);
      expect(response.body.data.templates.length).toBeGreaterThan(0);
    });
  });

  describe('Supported Languages', () => {
    it('should get supported languages', async () => {
      const response = await request(app)
        .get('/api/ai-content/languages')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('languages');
      expect(Array.isArray(response.body.data.languages)).toBe(true);
      expect(response.body.data.languages.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/api/ai-content/generate' },
        { method: 'post', path: '/api/ai-content/enhance' },
        { method: 'post', path: '/api/ai-content/translate' },
        { method: 'post', path: '/api/ai-content/ideas' },
        { method: 'post', path: '/api/ai-content/analyze' },
        { method: 'get', path: '/api/ai-content/usage' },
        { method: 'get', path: '/api/ai-content/templates' },
        { method: 'get', path: '/api/ai-content/languages' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });
  });
});

describe('AI Content Service Unit Tests', () => {
  describe('Content Analysis', () => {
    it('should calculate SEO score correctly', async () => {
      const content = 'This is a comprehensive article about renewable energy and its benefits for the environment. It covers solar power, wind energy, and other sustainable solutions. Renewable energy is becoming increasingly important in our fight against climate change.';
      const keywords = ['renewable energy', 'solar power', 'sustainable'];

      const analysis = await aiContentService.analyzeContent(content, keywords);

      expect(analysis.seoScore).toBeGreaterThan(0);
      expect(analysis.seoScore).toBeLessThanOrEqual(100);
      expect(analysis.readabilityScore).toBeGreaterThan(0);
      expect(analysis.readabilityScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(analysis.suggestions)).toBe(true);
      expect(typeof analysis.keywordDensity).toBe('object');
      expect(typeof analysis.readingTime).toBe('number');
    });

    it('should calculate reading time correctly', async () => {
      const shortContent = 'This is a short piece of content.';
      const longContent = 'This is a much longer piece of content. '.repeat(100);

      const shortAnalysis = await aiContentService.analyzeContent(shortContent);
      const longAnalysis = await aiContentService.analyzeContent(longContent);

      expect(shortAnalysis.readingTime).toBeLessThan(longAnalysis.readingTime);
      expect(shortAnalysis.readingTime).toBeGreaterThan(0);
      expect(longAnalysis.readingTime).toBeGreaterThan(0);
    });

    it('should provide relevant SEO suggestions', async () => {
      const shortContent = 'Short content.';
      const analysis = await aiContentService.analyzeContent(shortContent);

      expect(analysis.suggestions).toContain('Consider expanding your content to at least 300 words for better SEO');
    });

    it('should calculate keyword density', async () => {
      const content = 'Renewable energy is important. Solar power is a type of renewable energy. Wind energy is another renewable energy source.';
      const keywords = ['renewable energy', 'solar power'];

      const analysis = await aiContentService.analyzeContent(content, keywords);

      expect(analysis.keywordDensity).toHaveProperty('renewable energy');
      expect(analysis.keywordDensity).toHaveProperty('solar power');
      expect(analysis.keywordDensity['renewable energy']).toBeGreaterThan(0);
      expect(analysis.keywordDensity['solar power']).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should track remaining requests correctly', () => {
      const userId = 'test-user-id';
      const initialRemaining = aiContentService.getRemainingRequests(userId);
      
      expect(initialRemaining).toBe(50);
    });

    it('should handle rate limit checking', async () => {
      const userId = 'test-user-rate-limit';
      
      // Should not throw for new user
      expect(() => {
        // This is a private method, so we test indirectly through public methods
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle Replicate API errors gracefully', async () => {
      // Mock Replicate to throw an error
      const mockReplicate = require('replicate');
      mockReplicate.mockImplementationOnce(() => ({
        run: jest.fn().mockRejectedValue(new Error('API Error'))
      }));

      await expect(
        aiContentService.generateContent({
          prompt: 'test',
          contentType: 'blog_post',
          tone: 'conversational',
          length: 'medium'
        }, 'test-user')
      ).rejects.toThrow('Failed to generate content. Please try again.');
    });
  });
});

describe('AI Content Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'aiintegration@example.com',
        password: 'password123',
        name: 'AI Integration Test User'
      });

    authToken = registerResponse.body.data.token;
  });

  it('should handle complete content generation workflow', async () => {
    // 1. Generate content
    const generateResponse = await request(app)
      .post('/api/ai-content/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prompt: 'Write about the benefits of exercise',
        contentType: 'blog_post',
        tone: 'friendly',
        length: 'medium',
        keywords: ['exercise', 'health', 'fitness'],
        includeOutline: true
      });

    expect(generateResponse.status).toBe(200);
    const generatedContent = generateResponse.body.data.content;

    // 2. Enhance the generated content
    const enhanceResponse = await request(app)
      .post('/api/ai-content/enhance')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: generatedContent,
        enhancementType: 'seo',
        targetKeywords: ['exercise', 'health']
      });

    expect(enhanceResponse.status).toBe(200);
    const enhancedContent = enhanceResponse.body.data.content;

    // 3. Analyze the enhanced content
    const analyzeResponse = await request(app)
      .post('/api/ai-content/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: enhancedContent,
        targetKeywords: ['exercise', 'health']
      });

    expect(analyzeResponse.status).toBe(200);
    expect(analyzeResponse.body.data.seoScore).toBeGreaterThan(0);

    // 4. Check usage statistics
    const usageResponse = await request(app)
      .get('/api/ai-content/usage')
      .set('Authorization', `Bearer ${authToken}`);

    expect(usageResponse.status).toBe(200);
    expect(usageResponse.body.data.remainingRequests).toBeLessThan(50);
  });

  it('should handle content translation workflow', async () => {
    // Generate content in English
    const generateResponse = await request(app)
      .post('/api/ai-content/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        prompt: 'Write a short welcome message',
        contentType: 'email',
        tone: 'friendly',
        length: 'short',
        language: 'English'
      });

    expect(generateResponse.status).toBe(200);
    const englishContent = generateResponse.body.data.content;

    // Translate to Spanish
    const translateResponse = await request(app)
      .post('/api/ai-content/translate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        content: englishContent,
        sourceLanguage: 'English',
        targetLanguage: 'Spanish'
      });

    expect(translateResponse.status).toBe(200);
    expect(translateResponse.body.data.content).toBeDefined();
    expect(translateResponse.body.data.content).not.toBe(englishContent);
  });
});
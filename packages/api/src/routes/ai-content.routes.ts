import { Router } from 'express';
import { AIContentController } from '../controllers/ai-content.controller';
import { authMiddleware } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validation';
import { rateLimitConfigs } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();
const aiContentController = new AIContentController();

// Validation schemas
const generateContentSchema = Joi.object({
  prompt: Joi.string().required().min(10).max(1000),
  contentType: Joi.string().required().valid(
    'article', 'blog_post', 'social_media', 'email', 'product_description', 'landing_page'
  ),
  tone: Joi.string().required().valid(
    'professional', 'casual', 'friendly', 'authoritative', 'conversational', 'persuasive'
  ),
  length: Joi.string().required().valid('short', 'medium', 'long'),
  keywords: Joi.array().items(Joi.string()).optional(),
  targetAudience: Joi.string().optional().max(200),
  language: Joi.string().optional().default('English'),
  includeOutline: Joi.boolean().optional().default(false)
});

const enhanceContentSchema = Joi.object({
  content: Joi.string().required().min(50).max(10000),
  enhancementType: Joi.string().required().valid(
    'grammar', 'seo', 'tone', 'readability', 'engagement'
  ),
  targetKeywords: Joi.array().items(Joi.string()).optional(),
  tone: Joi.string().optional().valid(
    'professional', 'casual', 'friendly', 'authoritative', 'conversational', 'persuasive'
  )
});

const translateContentSchema = Joi.object({
  content: Joi.string().required().min(10).max(10000),
  sourceLanguage: Joi.string().required().min(2).max(10),
  targetLanguage: Joi.string().required().min(2).max(10),
  preserveFormatting: Joi.boolean().optional().default(true)
});

const generateIdeasSchema = Joi.object({
  topic: Joi.string().optional().max(200),
  industry: Joi.string().optional().max(100),
  contentType: Joi.string().required().max(50),
  count: Joi.number().optional().min(1).max(20).default(10)
});

const analyzeContentSchema = Joi.object({
  content: Joi.string().required().min(50).max(10000),
  targetKeywords: Joi.array().items(Joi.string()).optional()
});

// Apply authentication to all routes
router.use(authMiddleware);

// Apply AI-specific rate limiting (more restrictive)
const aiRateLimit = rateLimitConfigs.createCustomLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 requests per hour
  message: 'AI content generation rate limit exceeded. Please try again later.',
  standardHeaders: true
});

router.use(aiRateLimit);

/**
 * @swagger
 * /api/ai-content/generate:
 *   post:
 *     summary: Generate content using AI
 *     tags: [AI Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - contentType
 *               - tone
 *               - length
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The content generation prompt
 *                 example: "Write about the benefits of renewable energy"
 *               contentType:
 *                 type: string
 *                 enum: [article, blog_post, social_media, email, product_description, landing_page]
 *                 example: "blog_post"
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, friendly, authoritative, conversational, persuasive]
 *                 example: "conversational"
 *               length:
 *                 type: string
 *                 enum: [short, medium, long]
 *                 example: "medium"
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["renewable energy", "sustainability"]
 *               targetAudience:
 *                 type: string
 *                 example: "environmentally conscious consumers"
 *               language:
 *                 type: string
 *                 default: "English"
 *               includeOutline:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                     title:
 *                       type: string
 *                     outline:
 *                       type: array
 *                       items:
 *                         type: string
 *                     seoScore:
 *                       type: number
 *                     readabilityScore:
 *                       type: number
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/generate', 
  validationMiddleware(generateContentSchema),
  aiContentController.generateContent.bind(aiContentController)
);

/**
 * @swagger
 * /api/ai-content/enhance:
 *   post:
 *     summary: Enhance existing content
 *     tags: [AI Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - enhancementType
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content to enhance
 *               enhancementType:
 *                 type: string
 *                 enum: [grammar, seo, tone, readability, engagement]
 *                 example: "seo"
 *               targetKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, friendly, authoritative, conversational, persuasive]
 *     responses:
 *       200:
 *         description: Content enhanced successfully
 */
router.post('/enhance',
  validationMiddleware(enhanceContentSchema),
  aiContentController.enhanceContent.bind(aiContentController)
);

/**
 * @swagger
 * /api/ai-content/translate:
 *   post:
 *     summary: Translate content to another language
 *     tags: [AI Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - sourceLanguage
 *               - targetLanguage
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content to translate
 *               sourceLanguage:
 *                 type: string
 *                 example: "English"
 *               targetLanguage:
 *                 type: string
 *                 example: "Spanish"
 *               preserveFormatting:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Content translated successfully
 */
router.post('/translate',
  validationMiddleware(translateContentSchema),
  aiContentController.translateContent.bind(aiContentController)
);

/**
 * @swagger
 * /api/ai-content/ideas:
 *   post:
 *     summary: Generate content ideas
 *     tags: [AI Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentType
 *             properties:
 *               topic:
 *                 type: string
 *                 example: "digital marketing"
 *               industry:
 *                 type: string
 *                 example: "technology"
 *               contentType:
 *                 type: string
 *                 example: "blog_post"
 *               count:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 10
 *     responses:
 *       200:
 *         description: Content ideas generated successfully
 */
router.post('/ideas',
  validationMiddleware(generateIdeasSchema),
  aiContentController.generateIdeas.bind(aiContentController)
);

/**
 * @swagger
 * /api/ai-content/analyze:
 *   post:
 *     summary: Analyze content for SEO and readability
 *     tags: [AI Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: The content to analyze
 *               targetKeywords:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Content analyzed successfully
 */
router.post('/analyze',
  validationMiddleware(analyzeContentSchema),
  aiContentController.analyzeContent.bind(aiContentController)
);

/**
 * @swagger
 * /api/ai-content/usage:
 *   get:
 *     summary: Get AI usage statistics
 *     tags: [AI Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage statistics retrieved successfully
 */
router.get('/usage',
  aiContentController.getUsageStats.bind(aiContentController)
);

/**
 * @swagger
 * /api/ai-content/templates:
 *   get:
 *     summary: Get AI writing templates
 *     tags: [AI Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 */
router.get('/templates',
  aiContentController.getTemplates.bind(aiContentController)
);

/**
 * @swagger
 * /api/ai-content/languages:
 *   get:
 *     summary: Get supported languages for translation
 *     tags: [AI Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Supported languages retrieved successfully
 */
router.get('/languages',
  aiContentController.getSupportedLanguages.bind(aiContentController)
);

export default router;
import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StorySlip CMS API',
      version,
      description: `
        StorySlip CMS is a powerful, white-label content management system that allows you to embed dynamic content into any website.
        
        ## Features
        - **Multi-tenant Architecture**: Manage multiple websites and brands from a single platform
        - **White-label Support**: Customize branding, domains, and email templates
        - **Rich Content Management**: Create, schedule, and manage content with SEO optimization
        - **Team Collaboration**: Invite team members with role-based permissions
        - **Analytics & Insights**: Track content performance and user engagement
        - **Lightweight Widget**: Embed content with a minimal JavaScript widget
        - **API-First Design**: Full REST API for custom integrations
        
        ## Authentication
        This API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API endpoints are rate-limited to ensure fair usage:
        - Authentication endpoints: 5 requests per minute
        - Content operations: 100 requests per minute
        - Analytics endpoints: 50 requests per minute
        - General endpoints: 200 requests per minute
        
        ## Error Handling
        The API returns consistent error responses with the following structure:
        \`\`\`json
        {
          "success": false,
          "message": "Error description",
          "error": "ERROR_CODE",
          "details": {}
        }
        \`\`\`
        
        ## Pagination
        List endpoints support pagination with the following query parameters:
        - \`limit\`: Number of items per page (default: 20, max: 100)
        - \`offset\`: Number of items to skip (default: 0)
        
        ## Webhooks
        StorySlip supports webhooks for real-time notifications. Configure webhook URLs in your dashboard to receive events for:
        - Content published/updated
        - User invitations
        - Analytics milestones
        - System notifications
      `,
      contact: {
        name: 'StorySlip Support',
        email: 'support@storyslip.com',
        url: 'https://storyslip.com/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.storyslip.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Website API key for widget endpoints',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'An error occurred',
            },
            error: {
              type: 'string',
              example: 'VALIDATION_ERROR',
            },
            details: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
        Success: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
            data: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          required: ['success', 'data', 'pagination'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  example: 100,
                },
                limit: {
                  type: 'integer',
                  example: 20,
                },
                offset: {
                  type: 'integer',
                  example: 0,
                },
                hasMore: {
                  type: 'boolean',
                  example: true,
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          required: ['id', 'email', 'name', 'created_at'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            avatar_url: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/avatar.jpg',
            },
            role: {
              type: 'string',
              enum: ['admin', 'user'],
              example: 'user',
            },
            is_verified: {
              type: 'boolean',
              example: true,
            },
            last_login: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-15T10:30:00Z',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        Website: {
          type: 'object',
          required: ['id', 'name', 'domain', 'api_key', 'created_at'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'My Blog',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'A personal blog about technology',
            },
            domain: {
              type: 'string',
              example: 'myblog.com',
            },
            api_key: {
              type: 'string',
              example: 'sk_live_1234567890abcdef',
            },
            is_verified: {
              type: 'boolean',
              example: true,
            },
            settings: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  example: 'default',
                },
                auto_publish: {
                  type: 'boolean',
                  example: false,
                },
                seo_enabled: {
                  type: 'boolean',
                  example: true,
                },
              },
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        Content: {
          type: 'object',
          required: ['id', 'title', 'content', 'status', 'created_at'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            title: {
              type: 'string',
              example: 'Getting Started with StorySlip',
            },
            slug: {
              type: 'string',
              example: 'getting-started-with-storyslip',
            },
            content: {
              type: 'string',
              example: '<p>This is the content of the article...</p>',
            },
            excerpt: {
              type: 'string',
              nullable: true,
              example: 'Learn how to get started with StorySlip CMS',
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'scheduled', 'archived'],
              example: 'published',
            },
            featured_image: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/image.jpg',
            },
            seo_title: {
              type: 'string',
              nullable: true,
              example: 'Getting Started with StorySlip - Complete Guide',
            },
            seo_description: {
              type: 'string',
              nullable: true,
              example: 'Learn how to set up and use StorySlip CMS for your website',
            },
            published_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-15T10:00:00Z',
            },
            scheduled_for: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-20T09:00:00Z',
            },
            view_count: {
              type: 'integer',
              example: 1250,
            },
            categories: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Category',
              },
            },
            tags: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Tag',
              },
            },
            author: {
              $ref: '#/components/schemas/User',
            },
            website_id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00Z',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        Category: {
          type: 'object',
          required: ['id', 'name', 'slug'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'Technology',
            },
            slug: {
              type: 'string',
              example: 'technology',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'Articles about technology and software',
            },
            color: {
              type: 'string',
              nullable: true,
              example: '#3B82F6',
            },
            content_count: {
              type: 'integer',
              example: 25,
            },
          },
        },
        Tag: {
          type: 'object',
          required: ['id', 'name', 'slug'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: {
              type: 'string',
              example: 'JavaScript',
            },
            slug: {
              type: 'string',
              example: 'javascript',
            },
            content_count: {
              type: 'integer',
              example: 15,
            },
          },
        },
        Analytics: {
          type: 'object',
          properties: {
            period: {
              type: 'string',
              example: '30d',
            },
            total_views: {
              type: 'integer',
              example: 15420,
            },
            unique_visitors: {
              type: 'integer',
              example: 8750,
            },
            bounce_rate: {
              type: 'number',
              format: 'float',
              example: 0.35,
            },
            avg_session_duration: {
              type: 'integer',
              example: 180,
              description: 'Average session duration in seconds',
            },
            top_content: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  content_id: {
                    type: 'string',
                    format: 'uuid',
                  },
                  title: {
                    type: 'string',
                  },
                  views: {
                    type: 'integer',
                  },
                },
              },
            },
            traffic_sources: {
              type: 'object',
              properties: {
                direct: {
                  type: 'integer',
                  example: 5200,
                },
                search: {
                  type: 'integer',
                  example: 7800,
                },
                social: {
                  type: 'integer',
                  example: 1920,
                },
                referral: {
                  type: 'integer',
                  example: 500,
                },
              },
            },
          },
        },
        BrandConfiguration: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            brand_name: {
              type: 'string',
              example: 'My Brand',
            },
            logo_url: {
              type: 'string',
              format: 'uri',
              nullable: true,
              example: 'https://example.com/logo.png',
            },
            primary_color: {
              type: 'string',
              example: '#3B82F6',
            },
            secondary_color: {
              type: 'string',
              example: '#1E40AF',
            },
            custom_domain: {
              type: 'string',
              nullable: true,
              example: 'cms.mybrand.com',
            },
            email_templates: {
              type: 'object',
              properties: {
                header_html: {
                  type: 'string',
                },
                footer_html: {
                  type: 'string',
                },
                styles: {
                  type: 'string',
                },
              },
            },
            website_id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
          },
        },
        Invitation: {
          type: 'object',
          required: ['id', 'email', 'role', 'status', 'created_at'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'newuser@example.com',
            },
            role: {
              type: 'string',
              enum: ['admin', 'editor', 'viewer'],
              example: 'editor',
            },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'expired'],
              example: 'pending',
            },
            message: {
              type: 'string',
              nullable: true,
              example: 'Welcome to our team!',
            },
            invited_by: {
              $ref: '#/components/schemas/User',
            },
            expires_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-22T00:00:00Z',
            },
            accepted_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2024-01-16T14:30:00Z',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:00:00Z',
            },
          },
        },
        WebhookEvent: {
          type: 'object',
          required: ['id', 'event', 'data', 'timestamp'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            event: {
              type: 'string',
              enum: [
                'content.published',
                'content.updated',
                'content.deleted',
                'user.invited',
                'user.joined',
                'analytics.milestone',
              ],
              example: 'content.published',
            },
            data: {
              type: 'object',
              additionalProperties: true,
              example: {
                content_id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'New Article Published',
                url: 'https://example.com/articles/new-article',
              },
            },
            website_id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
      },
      parameters: {
        websiteId: {
          name: 'websiteId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'Website ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        contentId: {
          name: 'contentId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'Content ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        userId: {
          name: 'userId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'User ID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        limit: {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          description: 'Number of items to return',
        },
        offset: {
          name: 'offset',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 0,
            default: 0,
          },
          description: 'Number of items to skip',
        },
        search: {
          name: 'search',
          in: 'query',
          schema: {
            type: 'string',
          },
          description: 'Search query',
        },
        status: {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['draft', 'published', 'scheduled', 'archived'],
          },
          description: 'Filter by content status',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Authentication required',
                error: 'UNAUTHORIZED',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Insufficient permissions',
                error: 'FORBIDDEN',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Resource not found',
                error: 'NOT_FOUND',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Validation failed',
                error: 'VALIDATION_ERROR',
                details: {
                  field: 'email',
                  message: 'Invalid email format',
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Rate limit exceeded',
                error: 'RATE_LIMIT_EXCEEDED',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and account management',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Websites',
        description: 'Website management and configuration',
      },
      {
        name: 'Content',
        description: 'Content creation and management',
      },
      {
        name: 'Categories',
        description: 'Content categorization',
      },
      {
        name: 'Tags',
        description: 'Content tagging',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting',
      },
      {
        name: 'Team',
        description: 'Team management and invitations',
      },
      {
        name: 'Branding',
        description: 'White-label branding configuration',
      },
      {
        name: 'Notifications',
        description: 'Email notifications and preferences',
      },
      {
        name: 'Widget',
        description: 'Widget content delivery (public endpoints)',
      },
      {
        name: 'Webhooks',
        description: 'Webhook configuration and events',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/services/*.ts',
  ],
};

export const specs = swaggerJsdoc(options);
export default specs;
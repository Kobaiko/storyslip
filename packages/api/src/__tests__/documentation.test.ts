import request from 'supertest';
import app from '../index';
import { specs } from '../config/swagger';

describe('API Documentation', () => {
  describe('Documentation Landing Page', () => {
    it('should serve documentation landing page', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.text).toContain('StorySlip CMS API');
      expect(response.text).toContain('Interactive API Docs');
      expect(response.text).toContain('Getting Started Guide');
      expect(response.text).toContain('Widget Integration');
      expect(response.text).toContain('Webhook Reference');
    });
  });

  describe('Swagger UI', () => {
    it('should serve Swagger UI', async () => {
      const response = await request(app)
        .get('/api/docs/swagger')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
    });
  });

  describe('OpenAPI Specification', () => {
    it('should serve OpenAPI JSON', async () => {
      const response = await request(app)
        .get('/api/docs/openapi.json')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body).toHaveProperty('components');
      expect(response.body.info.title).toBe('StorySlip CMS API');
    });

    it('should have valid OpenAPI specification structure', () => {
      expect(specs).toHaveProperty('openapi', '3.0.0');
      expect(specs).toHaveProperty('info');
      expect(specs).toHaveProperty('servers');
      expect(specs).toHaveProperty('components');
      expect(specs).toHaveProperty('tags');

      // Check info section
      expect(specs.info).toHaveProperty('title', 'StorySlip CMS API');
      expect(specs.info).toHaveProperty('version');
      expect(specs.info).toHaveProperty('description');
      expect(specs.info).toHaveProperty('contact');

      // Check security schemes
      expect(specs.components.securitySchemes).toHaveProperty('bearerAuth');
      expect(specs.components.securitySchemes).toHaveProperty('apiKey');

      // Check common schemas
      expect(specs.components.schemas).toHaveProperty('Error');
      expect(specs.components.schemas).toHaveProperty('Success');
      expect(specs.components.schemas).toHaveProperty('User');
      expect(specs.components.schemas).toHaveProperty('Website');
      expect(specs.components.schemas).toHaveProperty('Content');
    });
  });

  describe('Documentation Pages', () => {
    it('should serve getting started guide', async () => {
      const response = await request(app)
        .get('/api/docs/guide')
        .expect(200);

      expect(response.text).toContain('Getting Started with StorySlip CMS API');
      expect(response.text).toContain('Authentication');
      expect(response.text).toContain('Quick Start Tutorial');
      expect(response.text).toContain('Base URL');
    });

    it('should serve widget integration guide', async () => {
      const response = await request(app)
        .get('/api/docs/widget')
        .expect(200);

      expect(response.text).toContain('Widget Integration Guide');
      expect(response.text).toContain('Quick Start');
      expect(response.text).toContain('Configuration Options');
      expect(response.text).toContain('data-website-id');
    });

    it('should serve webhooks documentation', async () => {
      const response = await request(app)
        .get('/api/docs/webhooks')
        .expect(200);

      expect(response.text).toContain('Webhooks Documentation');
      expect(response.text).toContain('Setting Up Webhooks');
      expect(response.text).toContain('Webhook Events');
      expect(response.text).toContain('Security');
    });

    it('should serve SDKs page', async () => {
      const response = await request(app)
        .get('/api/docs/sdks')
        .expect(200);

      expect(response.text).toContain('SDKs and Libraries');
      expect(response.text).toContain('JavaScript/Node.js');
      expect(response.text).toContain('Python');
      expect(response.text).toContain('PHP');
      expect(response.text).toContain('Ruby');
    });

    it('should return 404 for non-existent documentation page', async () => {
      const response = await request(app)
        .get('/api/docs/non-existent')
        .expect(404);

      expect(response.text).toContain('Documentation Not Found');
    });
  });

  describe('Health Check', () => {
    it('should provide API health information', async () => {
      const response = await request(app)
        .get('/api/docs/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('documentation');
      expect(response.body).toHaveProperty('endpoints');

      // Check documentation links
      expect(response.body.documentation).toHaveProperty('interactive');
      expect(response.body.documentation).toHaveProperty('openapi');
      expect(response.body.documentation).toHaveProperty('guide');

      // Check endpoint information
      expect(response.body.endpoints).toHaveProperty('auth');
      expect(response.body.endpoints).toHaveProperty('users');
      expect(response.body.endpoints).toHaveProperty('websites');
      expect(response.body.endpoints).toHaveProperty('content');
    });
  });

  describe('Documentation Headers', () => {
    it('should add documentation headers to responses', async () => {
      const response = await request(app)
        .get('/api/docs/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-api-version', '1.0');
      expect(response.headers).toHaveProperty('x-api-docs');
      expect(response.headers).toHaveProperty('x-api-swagger');
    });
  });

  describe('OpenAPI Schema Validation', () => {
    it('should have valid authentication schemas', () => {
      const schemas = specs.components.schemas;

      // Login request schema
      expect(schemas.LoginRequest).toHaveProperty('type', 'object');
      expect(schemas.LoginRequest.required).toContain('email');
      expect(schemas.LoginRequest.required).toContain('password');
      expect(schemas.LoginRequest.properties).toHaveProperty('email');
      expect(schemas.LoginRequest.properties).toHaveProperty('password');

      // Register request schema
      expect(schemas.RegisterRequest).toHaveProperty('type', 'object');
      expect(schemas.RegisterRequest.required).toContain('name');
      expect(schemas.RegisterRequest.required).toContain('email');
      expect(schemas.RegisterRequest.required).toContain('password');

      // Auth response schema
      expect(schemas.AuthResponse).toHaveProperty('type', 'object');
      expect(schemas.AuthResponse.properties).toHaveProperty('success');
      expect(schemas.AuthResponse.properties).toHaveProperty('data');
    });

    it('should have valid content schemas', () => {
      const schemas = specs.components.schemas;

      // Content schema
      expect(schemas.Content).toHaveProperty('type', 'object');
      expect(schemas.Content.required).toContain('id');
      expect(schemas.Content.required).toContain('title');
      expect(schemas.Content.required).toContain('content');
      expect(schemas.Content.required).toContain('status');

      // Content properties
      expect(schemas.Content.properties).toHaveProperty('id');
      expect(schemas.Content.properties).toHaveProperty('title');
      expect(schemas.Content.properties).toHaveProperty('content');
      expect(schemas.Content.properties).toHaveProperty('status');
      expect(schemas.Content.properties).toHaveProperty('categories');
      expect(schemas.Content.properties).toHaveProperty('tags');
    });

    it('should have valid website schemas', () => {
      const schemas = specs.components.schemas;

      // Website schema
      expect(schemas.Website).toHaveProperty('type', 'object');
      expect(schemas.Website.required).toContain('id');
      expect(schemas.Website.required).toContain('name');
      expect(schemas.Website.required).toContain('domain');
      expect(schemas.Website.required).toContain('api_key');

      // Website properties
      expect(schemas.Website.properties).toHaveProperty('id');
      expect(schemas.Website.properties).toHaveProperty('name');
      expect(schemas.Website.properties).toHaveProperty('domain');
      expect(schemas.Website.properties).toHaveProperty('api_key');
      expect(schemas.Website.properties).toHaveProperty('settings');
    });

    it('should have valid error response schemas', () => {
      const schemas = specs.components.schemas;
      const responses = specs.components.responses;

      // Error schema
      expect(schemas.Error).toHaveProperty('type', 'object');
      expect(schemas.Error.required).toContain('success');
      expect(schemas.Error.required).toContain('message');
      expect(schemas.Error.properties).toHaveProperty('success');
      expect(schemas.Error.properties).toHaveProperty('message');
      expect(schemas.Error.properties).toHaveProperty('error');

      // Common error responses
      expect(responses).toHaveProperty('UnauthorizedError');
      expect(responses).toHaveProperty('ForbiddenError');
      expect(responses).toHaveProperty('NotFoundError');
      expect(responses).toHaveProperty('ValidationError');
      expect(responses).toHaveProperty('RateLimitError');
    });
  });

  describe('API Tags', () => {
    it('should have comprehensive API tags', () => {
      const tags = specs.tags;
      const tagNames = tags.map((tag: any) => tag.name);

      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Websites');
      expect(tagNames).toContain('Content');
      expect(tagNames).toContain('Categories');
      expect(tagNames).toContain('Tags');
      expect(tagNames).toContain('Analytics');
      expect(tagNames).toContain('Team');
      expect(tagNames).toContain('Branding');
      expect(tagNames).toContain('Notifications');
      expect(tagNames).toContain('Widget');
      expect(tagNames).toContain('Webhooks');

      // Check tag descriptions
      tags.forEach((tag: any) => {
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('description');
        expect(typeof tag.name).toBe('string');
        expect(typeof tag.description).toBe('string');
      });
    });
  });

  describe('Security Configuration', () => {
    it('should have proper security schemes', () => {
      const securitySchemes = specs.components.securitySchemes;

      // Bearer auth
      expect(securitySchemes.bearerAuth).toHaveProperty('type', 'http');
      expect(securitySchemes.bearerAuth).toHaveProperty('scheme', 'bearer');
      expect(securitySchemes.bearerAuth).toHaveProperty('bearerFormat', 'JWT');

      // API key
      expect(securitySchemes.apiKey).toHaveProperty('type', 'apiKey');
      expect(securitySchemes.apiKey).toHaveProperty('in', 'header');
      expect(securitySchemes.apiKey).toHaveProperty('name', 'X-API-Key');
    });

    it('should have default security requirement', () => {
      expect(specs.security).toEqual([{ bearerAuth: [] }]);
    });
  });

  describe('Server Configuration', () => {
    it('should have proper server configuration', () => {
      const servers = specs.servers;

      expect(servers).toHaveLength(2);
      expect(servers[0]).toHaveProperty('description', 'Development server');
      expect(servers[1]).toHaveProperty('url', 'https://api.storyslip.com');
      expect(servers[1]).toHaveProperty('description', 'Production server');
    });
  });

  describe('Parameter Definitions', () => {
    it('should have common parameter definitions', () => {
      const parameters = specs.components.parameters;

      expect(parameters).toHaveProperty('websiteId');
      expect(parameters).toHaveProperty('contentId');
      expect(parameters).toHaveProperty('userId');
      expect(parameters).toHaveProperty('limit');
      expect(parameters).toHaveProperty('offset');
      expect(parameters).toHaveProperty('search');
      expect(parameters).toHaveProperty('status');

      // Check parameter structure
      expect(parameters.websiteId).toHaveProperty('name', 'websiteId');
      expect(parameters.websiteId).toHaveProperty('in', 'path');
      expect(parameters.websiteId).toHaveProperty('required', true);
      expect(parameters.websiteId.schema).toHaveProperty('type', 'string');
      expect(parameters.websiteId.schema).toHaveProperty('format', 'uuid');
    });
  });

  describe('Content Types', () => {
    it('should handle JSON content type properly', async () => {
      const response = await request(app)
        .get('/api/docs/openapi.json')
        .expect('Content-Type', /application\/json/);

      expect(response.body).toBeDefined();
      expect(typeof response.body).toBe('object');
    });

    it('should handle HTML content type for documentation pages', async () => {
      const response = await request(app)
        .get('/api/docs/guide')
        .expect('Content-Type', /text\/html/);

      expect(response.text).toBeDefined();
      expect(typeof response.text).toBe('string');
    });
  });

  describe('Documentation Completeness', () => {
    it('should have comprehensive API coverage in OpenAPI spec', () => {
      // This test ensures that major API endpoints are documented
      const paths = Object.keys(specs.paths || {});
      
      // Should have authentication endpoints
      expect(paths.some(path => path.includes('/auth/login'))).toBe(true);
      expect(paths.some(path => path.includes('/auth/register'))).toBe(true);
      
      // Should have user management endpoints
      expect(paths.some(path => path.includes('/users'))).toBe(true);
      
      // Should have website management endpoints
      expect(paths.some(path => path.includes('/websites'))).toBe(true);
      
      // Should have content management endpoints
      expect(paths.some(path => path.includes('/content'))).toBe(true);
    });

    it('should have proper HTTP methods documented', () => {
      const paths = specs.paths || {};
      let hasGetMethod = false;
      let hasPostMethod = false;
      let hasPutMethod = false;
      let hasDeleteMethod = false;

      Object.values(paths).forEach((pathItem: any) => {
        if (pathItem.get) hasGetMethod = true;
        if (pathItem.post) hasPostMethod = true;
        if (pathItem.put) hasPutMethod = true;
        if (pathItem.delete) hasDeleteMethod = true;
      });

      expect(hasGetMethod).toBe(true);
      expect(hasPostMethod).toBe(true);
      expect(hasPutMethod).toBe(true);
      expect(hasDeleteMethod).toBe(true);
    });
  });
});
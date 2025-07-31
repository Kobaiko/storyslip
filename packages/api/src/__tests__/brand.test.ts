import request from 'supertest';
import { app } from '../index';
import { supabase } from '../config/supabase';
import { createTestUser, createTestWebsite, getAuthToken } from './helpers/testHelpers';

describe('Brand Configuration API', () => {
  let authToken: string;
  let userId: string;
  let websiteId: string;

  beforeAll(async () => {
    // Create test user and website
    const user = await createTestUser();
    userId = user.id;
    authToken = await getAuthToken(user.email);
    
    const website = await createTestWebsite(userId);
    websiteId = website.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('brand_configurations').delete().eq('website_id', websiteId);
    await supabase.from('websites').delete().eq('id', websiteId);
    await supabase.from('users').delete().eq('id', userId);
  });

  describe('GET /api/websites/:websiteId/brand', () => {
    it('should return brand configuration', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config).toHaveProperty('id');
      expect(response.body.data.config).toHaveProperty('website_id', websiteId);
      expect(response.body.data.config).toHaveProperty('primary_color');
      expect(response.body.data.config).toHaveProperty('secondary_color');
      expect(response.body.data.config).toHaveProperty('brand_name');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/brand`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle invalid website ID', async () => {
      const response = await request(app)
        .get('/api/websites/invalid-uuid/brand')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/websites/:websiteId/brand', () => {
    it('should update brand configuration', async () => {
      const updateData = {
        brand_name: 'Updated Brand Name',
        primary_color: '#ff0000',
        secondary_color: '#00ff00',
        accent_color: '#0000ff',
        font_family: 'Arial, sans-serif',
        custom_css: '.custom { color: red; }',
      };

      const response = await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.brand_name).toBe('Updated Brand Name');
      expect(response.body.data.config.primary_color).toBe('#ff0000');
      expect(response.body.data.config.secondary_color).toBe('#00ff00');
      expect(response.body.data.config.accent_color).toBe('#0000ff');
      expect(response.body.data.config.font_family).toBe('Arial, sans-serif');
      expect(response.body.data.config.custom_css).toBe('.custom { color: red; }');
    });

    it('should validate color codes', async () => {
      const updateData = {
        primary_color: 'invalid-color',
      };

      const response = await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate URLs', async () => {
      const updateData = {
        logo_url: 'invalid-url',
      };

      const response = await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle custom domain configuration', async () => {
      const updateData = {
        custom_domain: 'example.com',
      };

      const response = await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.custom_domain).toBe('example.com');
      expect(response.body.data.config.domain_verified).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .send({ brand_name: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/brand/:websiteId/css', () => {
    it('should generate CSS for brand configuration', async () => {
      const response = await request(app)
        .get(`/api/brand/${websiteId}/css`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/css');
      expect(response.text).toContain(':root');
      expect(response.text).toContain('--brand-primary');
      expect(response.text).toContain('--brand-secondary');
      expect(response.text).toContain('--brand-accent');
    });

    it('should handle invalid website ID', async () => {
      const response = await request(app)
        .get('/api/brand/invalid-uuid/css')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/websites/:websiteId/brand/verify-domain', () => {
    beforeEach(async () => {
      // Set up a custom domain for testing
      await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ custom_domain: 'test-domain.com' });
    });

    it('should verify custom domain', async () => {
      const response = await request(app)
        .post(`/api/websites/${websiteId}/brand/verify-domain`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.verification).toHaveProperty('verified');
      expect(response.body.data.verification).toHaveProperty('dns_records');
      expect(response.body.data.verification).toHaveProperty('ssl_status');
    });

    it('should handle missing custom domain', async () => {
      // Remove custom domain first
      await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ custom_domain: '' });

      const response = await request(app)
        .post(`/api/websites/${websiteId}/brand/verify-domain`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('No custom domain configured');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/websites/${websiteId}/brand/verify-domain`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/websites/:websiteId/brand/preview', () => {
    it('should generate brand preview', async () => {
      const previewData = {
        primary_color: '#purple',
        brand_name: 'Preview Brand',
        font_family: 'Georgia, serif',
      };

      const response = await request(app)
        .post(`/api/websites/${websiteId}/brand/preview`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(previewData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('config');
      expect(response.body.data).toHaveProperty('css');
      expect(response.body.data).toHaveProperty('emailTemplate');
      expect(response.body.data.config.brand_name).toBe('Preview Brand');
      expect(response.body.data.css).toContain('Georgia, serif');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/websites/${websiteId}/brand/preview`)
        .send({ primary_color: '#ff0000' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/websites/:websiteId/brand/reset', () => {
    it('should reset brand configuration to defaults', async () => {
      // First, update some settings
      await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          brand_name: 'Custom Brand',
          primary_color: '#ff0000',
          custom_css: '.custom { color: red; }',
        });

      // Then reset
      const response = await request(app)
        .post(`/api/websites/${websiteId}/brand/reset`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.primary_color).toBe('#3b82f6'); // Default color
      expect(response.body.data.config.custom_css).toBeNull();
      expect(response.body.data.config.white_label_enabled).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/websites/${websiteId}/brand/reset`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Agency Brand Templates', () => {
    let templateId: string;

    describe('POST /api/agency/brand-templates', () => {
      it('should create agency brand template', async () => {
        const templateData = {
          template_name: 'Test Template',
          template_description: 'A test brand template',
          primary_color: '#ff6b6b',
          secondary_color: '#4ecdc4',
          accent_color: '#45b7d1',
          font_family: 'Roboto, sans-serif',
          custom_css: '.template { margin: 10px; }',
        };

        const response = await request(app)
          .post('/api/agency/brand-templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send(templateData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.template).toHaveProperty('id');
        expect(response.body.data.template.template_name).toBe('Test Template');
        expect(response.body.data.template.primary_color).toBe('#ff6b6b');
        expect(response.body.data.template.font_family).toBe('Roboto, sans-serif');

        templateId = response.body.data.template.id;
      });

      it('should validate template data', async () => {
        const templateData = {
          template_name: '', // Invalid: empty name
          primary_color: 'invalid-color', // Invalid: bad color format
        };

        const response = await request(app)
          .post('/api/agency/brand-templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send(templateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/agency/brand-templates')
          .send({ template_name: 'Test' })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });

    describe('GET /api/agency/brand-templates', () => {
      it('should return agency brand templates', async () => {
        const response = await request(app)
          .get('/api/agency/brand-templates')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.templates)).toBe(true);
        expect(response.body.data.templates.length).toBeGreaterThan(0);
        expect(response.body.data.templates[0]).toHaveProperty('template_name');
        expect(response.body.data.templates[0]).toHaveProperty('primary_color');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/agency/brand-templates')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });

    describe('POST /api/websites/:websiteId/brand/apply-template', () => {
      it('should apply agency template to website', async () => {
        const response = await request(app)
          .post(`/api/websites/${websiteId}/brand/apply-template`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ templateId })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.config.primary_color).toBe('#ff6b6b');
        expect(response.body.data.config.secondary_color).toBe('#4ecdc4');
        expect(response.body.data.config.font_family).toBe('Roboto, sans-serif');
        expect(response.body.data.config.agency_id).toBe(userId);
      });

      it('should handle template not found', async () => {
        const nonExistentTemplateId = '123e4567-e89b-12d3-a456-426614174000';
        
        const response = await request(app)
          .post(`/api/websites/${websiteId}/brand/apply-template`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ templateId: nonExistentTemplateId })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Agency brand template not found');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post(`/api/websites/${websiteId}/brand/apply-template`)
          .send({ templateId })
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });
    });

    afterAll(async () => {
      // Clean up template
      if (templateId) {
        await supabase.from('agency_brand_templates').delete().eq('id', templateId);
      }
    });
  });

  describe('White Label Features', () => {
    it('should enable white labeling', async () => {
      const response = await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          white_label_enabled: true,
          hide_storyslip_branding: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.white_label_enabled).toBe(true);
      expect(response.body.data.config.hide_storyslip_branding).toBe(true);
    });

    it('should configure email branding', async () => {
      const response = await request(app)
        .put(`/api/websites/${websiteId}/brand`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email_from_name: 'Custom Brand',
          email_from_address: 'noreply@custombrand.com',
          email_header_color: '#ff0000',
          email_footer_text: 'Custom footer text',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.email_from_name).toBe('Custom Brand');
      expect(response.body.data.config.email_from_address).toBe('noreply@custombrand.com');
      expect(response.body.data.config.email_header_color).toBe('#ff0000');
      expect(response.body.data.config.email_footer_text).toBe('Custom footer text');
    });
  });
});
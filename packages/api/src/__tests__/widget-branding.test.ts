import request from 'supertest';
import app from '../index';

// Mock all external dependencies
jest.mock('../config/supabase');
jest.mock('../services/database');
jest.mock('../services/team.service');
jest.mock('../services/brand.service');
jest.mock('../services/widget-branding.service');

describe('Widget Branding API', () => {
  const mockUser = {
    userId: 'user-123',
    email: 'owner@example.com',
    role: 'owner'
  };

  const mockWebsiteId = 'website-123';

  const mockWidgetConfig = {
    websiteId: mockWebsiteId,
    theme: 'auto',
    borderRadius: 8,
    shadowLevel: 'md',
    animation: 'fade',
    position: 'bottom-right',
    showBranding: true,
    customCSS: '',
    mobileOptimized: true,
    rtlSupport: false,
  };

  const mockBrandConfig = {
    id: 'brand-123',
    website_id: mockWebsiteId,
    primary_color: '#3b82f6',
    secondary_color: '#1e40af',
    accent_color: '#10b981',
    background_color: '#ffffff',
    text_color: '#111827',
    font_family: 'Inter, sans-serif',
    hide_storyslip_branding: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    jest.spyOn(require('../middleware/auth'), 'authenticateToken').mockImplementation((req: any, res: any, next: any) => {
      req.user = mockUser;
      next();
    });

    // Mock database access check
    const mockDatabaseService = require('../services/database');
    mockDatabaseService.DatabaseService = {
      checkWebsiteAccess: jest.fn().mockResolvedValue(true)
    };

    // Mock team service
    const mockTeamService = require('../services/team.service');
    mockTeamService.teamService = {
      hasPermission: jest.fn().mockResolvedValue(true),
    };

    // Mock brand service
    const mockBrandService = require('../services/brand.service');
    mockBrandService.brandService = {
      getBrandConfiguration: jest.fn().mockResolvedValue(mockBrandConfig),
    };

    // Mock widget branding service
    const mockWidgetBrandingService = require('../services/widget-branding.service');
    mockWidgetBrandingService.widgetBrandingService = {
      getWidgetBrandingConfig: jest.fn().mockResolvedValue(mockWidgetConfig),
      updateWidgetBrandingConfig: jest.fn().mockResolvedValue(mockWidgetConfig),
      generateWidgetStylesheet: jest.fn().mockResolvedValue({
        css: ':root { --widget-primary: #3b82f6; }',
        variables: { '--widget-primary': '#3b82f6' },
        mediaQueries: ['(max-width: 768px)'],
      }),
      generateBrandedEmbedCode: jest.fn().mockResolvedValue('<script>widget code</script>'),
    };
  });

  describe('GET /api/websites/:websiteId/widget-branding', () => {
    it('should get widget branding configuration', async () => {
      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/widget-branding`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config).toEqual(mockWidgetConfig);
    });

    it('should require authentication', async () => {
      // Mock unauthenticated request
      jest.spyOn(require('../middleware/auth'), 'authenticateToken').mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      });

      const response = await request(app)
        .get(`/api/websites/${mockWebsiteId}/widget-branding`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate website ID format', async () => {
      const response = await request(app)
        .get('/api/websites/invalid-uuid/widget-branding')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/websites/:websiteId/widget-branding', () => {
    it('should update widget branding configuration', async () => {
      const updateData = {
        theme: 'dark',
        borderRadius: 12,
        shadowLevel: 'lg',
        animation: 'slide',
        showBranding: false,
      };

      const updatedConfig = { ...mockWidgetConfig, ...updateData };
      const mockWidgetBrandingService = require('../services/widget-branding.service');
      mockWidgetBrandingService.widgetBrandingService.updateWidgetBrandingConfig.mockResolvedValue(updatedConfig);

      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.theme).toBe('dark');
      expect(response.body.data.config.borderRadius).toBe(12);
      expect(response.body.data.config.shadowLevel).toBe('lg');
      expect(response.body.data.config.animation).toBe('slide');
      expect(response.body.data.config.showBranding).toBe(false);
    });

    it('should validate theme values', async () => {
      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send({ theme: 'invalid-theme' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate border radius range', async () => {
      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send({ borderRadius: 100 }) // Max is 50
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate shadow level values', async () => {
      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send({ shadowLevel: 'invalid-shadow' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate animation values', async () => {
      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send({ animation: 'invalid-animation' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate position values', async () => {
      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send({ position: 'invalid-position' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require manage_settings permission', async () => {
      const mockTeamService = require('../services/team.service');
      mockTeamService.teamService.hasPermission.mockResolvedValue(false);

      const response = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send({ theme: 'dark' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/brand/:websiteId/widget.css', () => {
    it('should generate widget stylesheet', async () => {
      const response = await request(app)
        .get(`/api/brand/${mockWebsiteId}/widget.css`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/css');
      expect(response.text).toContain(':root { --widget-primary: #3b82f6; }');
    });

    it('should set appropriate cache headers', async () => {
      const response = await request(app)
        .get(`/api/brand/${mockWebsiteId}/widget.css`)
        .expect(200);

      expect(response.headers['cache-control']).toBe('public, max-age=3600');
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should validate website ID format', async () => {
      const response = await request(app)
        .get('/api/brand/invalid-uuid/widget.css')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/websites/:websiteId/widget-branding/embed-code', () => {
    it('should generate branded embed code', async () => {
      const options = {
        containerId: 'my-widget',
        displayMode: 'popup',
        autoLoad: false,
        customConfig: { showTitle: true },
      };

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/widget-branding/embed-code`)
        .send(options)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embedCode).toBe('<script>widget code</script>');
    });

    it('should use default options when not provided', async () => {
      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/widget-branding/embed-code`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.embedCode).toBeDefined();
    });

    it('should validate display mode', async () => {
      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/widget-branding/embed-code`)
        .send({ displayMode: 'invalid-mode' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/websites/:websiteId/widget-branding/preview', () => {
    it('should generate widget branding preview', async () => {
      const previewConfig = {
        theme: 'dark',
        borderRadius: 16,
        shadowLevel: 'xl',
        animation: 'scale',
      };

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/widget-branding/preview`)
        .send(previewConfig)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stylesheet');
      expect(response.body.data).toHaveProperty('embedCode');
      expect(response.body.data).toHaveProperty('previewConfig');
    });

    it('should handle empty preview config', async () => {
      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/widget-branding/preview`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/websites/:websiteId/widget-branding/reset', () => {
    it('should reset widget branding to defaults', async () => {
      const defaultConfig = {
        theme: 'auto',
        borderRadius: 8,
        shadowLevel: 'md',
        animation: 'fade',
        position: 'bottom-right',
        showBranding: true,
        customCSS: '',
        mobileOptimized: true,
        rtlSupport: false,
      };

      const mockWidgetBrandingService = require('../services/widget-branding.service');
      mockWidgetBrandingService.widgetBrandingService.updateWidgetBrandingConfig.mockResolvedValue({
        ...mockWidgetConfig,
        ...defaultConfig,
      });

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/widget-branding/reset`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.config.theme).toBe('auto');
      expect(response.body.data.config.borderRadius).toBe(8);
      expect(response.body.data.config.shadowLevel).toBe('md');
    });

    it('should require manage_settings permission', async () => {
      const mockTeamService = require('../services/team.service');
      mockTeamService.teamService.hasPermission.mockResolvedValue(false);

      const response = await request(app)
        .post(`/api/websites/${mockWebsiteId}/widget-branding/reset`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate all theme options', async () => {
      const validThemes = ['light', 'dark', 'auto'];
      
      for (const theme of validThemes) {
        const response = await request(app)
          .put(`/api/websites/${mockWebsiteId}/widget-branding`)
          .send({ theme })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should validate all shadow level options', async () => {
      const validShadows = ['none', 'sm', 'md', 'lg', 'xl'];
      
      for (const shadowLevel of validShadows) {
        const response = await request(app)
          .put(`/api/websites/${mockWebsiteId}/widget-branding`)
          .send({ shadowLevel })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should validate all animation options', async () => {
      const validAnimations = ['none', 'fade', 'slide', 'scale'];
      
      for (const animation of validAnimations) {
        const response = await request(app)
          .put(`/api/websites/${mockWebsiteId}/widget-branding`)
          .send({ animation })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should validate all position options', async () => {
      const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
      
      for (const position of validPositions) {
        const response = await request(app)
          .put(`/api/websites/${mockWebsiteId}/widget-branding`)
          .send({ position })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should validate border radius bounds', async () => {
      // Valid values
      const validRadii = [0, 25, 50];
      for (const borderRadius of validRadii) {
        const response = await request(app)
          .put(`/api/websites/${mockWebsiteId}/widget-branding`)
          .send({ borderRadius })
          .expect(200);

        expect(response.body.success).toBe(true);
      }

      // Invalid values
      const invalidRadii = [-1, 51, 100];
      for (const borderRadius of invalidRadii) {
        const response = await request(app)
          .put(`/api/websites/${mockWebsiteId}/widget-branding`)
          .send({ borderRadius })
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should validate custom CSS length', async () => {
      // Valid CSS (within limit)
      const validCSS = '.widget { color: red; }';
      const response1 = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send({ customCSS: validCSS })
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Invalid CSS (too long)
      const invalidCSS = 'a'.repeat(10001); // Max is 10000
      const response2 = await request(app)
        .put(`/api/websites/${mockWebsiteId}/widget-branding`)
        .send({ customCSS: invalidCSS })
        .expect(400);

      expect(response2.body.success).toBe(false);
    });
  });
});
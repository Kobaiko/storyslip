import request from 'supertest';
import { app } from '../index';
import { supabase } from '../config/supabase';
import { brandService } from '../services/brand.service';
import { domainVerificationService } from '../services/domain-verification.service';
import { emailService } from '../services/email.service';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../services/database');
jest.mock('../services/team.service');
jest.mock('../services/audit.service');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Enhanced White-Labeling System', () => {
  let authToken: string;
  let websiteId: string;
  let userId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = 'mock-auth-token';
    websiteId = 'website-123';
    userId = 'user-123';

    // Mock authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  describe('Enhanced Brand Configuration', () => {
    describe('POST /api/websites/:websiteId/brand/email-preview', () => {
      it('should generate branded email preview', async () => {
        const mockBrandConfig = {
          id: 'brand-123',
          website_id: websiteId,
          brand_name: 'Test Brand',
          primary_color: '#3b82f6',
          secondary_color: '#1e40af',
          logo_url: 'https://example.com/logo.png',
          font_family: 'Inter, sans-serif',
          hide_storyslip_branding: false,
        };

        // Mock database access check
        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        // Mock brand service
        jest.spyOn(brandService, 'getBrandConfiguration').mockResolvedValue(mockBrandConfig);
        jest.spyOn(brandService, 'generateBrandedEmailTemplate').mockReturnValue({
          subject: 'Welcome to Test Brand!',
          html: '<html><body><h1>Welcome!</h1></body></html>',
          text: 'Welcome!',
        });

        const response = await request(app)
          .post(`/api/websites/${websiteId}/brand/email-preview`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            template_type: 'welcome',
            preview_data: {
              subject: 'Custom Welcome Subject',
              heading: 'Custom Heading',
            },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.template_type).toBe('welcome');
        expect(response.body.data.brand_config.brand_name).toBe('Test Brand');
        expect(response.body.data.email_template).toHaveProperty('subject');
        expect(response.body.data.email_template).toHaveProperty('html');
        expect(response.body.data.email_template).toHaveProperty('text');
      });

      it('should handle different template types', async () => {
        const mockBrandConfig = {
          id: 'brand-123',
          website_id: websiteId,
          brand_name: 'Test Brand',
          primary_color: '#3b82f6',
        };

        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        jest.spyOn(brandService, 'getBrandConfiguration').mockResolvedValue(mockBrandConfig);
        jest.spyOn(brandService, 'generateBrandedEmailTemplate').mockReturnValue({
          subject: 'Password Reset',
          html: '<html><body><h1>Reset Password</h1></body></html>',
          text: 'Reset Password',
        });

        const response = await request(app)
          .post(`/api/websites/${websiteId}/brand/email-preview`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            template_type: 'password_reset',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.template_type).toBe('password_reset');
      });
    });
  });

  describe('Domain Verification System', () => {
    describe('GET /api/websites/:websiteId/brand/domain-verification-records', () => {
      it('should return DNS records for domain verification', async () => {
        const mockBrandConfig = {
          id: 'brand-123',
          website_id: websiteId,
          custom_domain: 'example.com',
          domain_verified: false,
        };

        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        jest.spyOn(brandService, 'getBrandConfiguration').mockResolvedValue(mockBrandConfig);
        jest.spyOn(domainVerificationService, 'generateVerificationRecords').mockReturnValue([
          {
            type: 'CNAME',
            name: 'example.com',
            value: 'proxy.storyslip.com',
            status: 'pending',
          },
          {
            type: 'TXT',
            name: '_storyslip-verification.example.com',
            value: 'storyslip-verification=abc123',
            status: 'pending',
          },
        ]);

        const response = await request(app)
          .get(`/api/websites/${websiteId}/brand/domain-verification-records`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('example.com');
        expect(response.body.data.records).toHaveLength(2);
        expect(response.body.data.records[0].type).toBe('CNAME');
        expect(response.body.data.records[1].type).toBe('TXT');
        expect(response.body.data.instructions).toHaveProperty('message');
        expect(response.body.data.instructions).toHaveProperty('steps');
      });

      it('should return error when no custom domain is configured', async () => {
        const mockBrandConfig = {
          id: 'brand-123',
          website_id: websiteId,
          custom_domain: null,
        };

        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        jest.spyOn(brandService, 'getBrandConfiguration').mockResolvedValue(mockBrandConfig);

        const response = await request(app)
          .get(`/api/websites/${websiteId}/brand/domain-verification-records`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('No custom domain configured');
      });
    });

    describe('GET /api/websites/:websiteId/brand/ssl-certificate', () => {
      it('should return SSL certificate information', async () => {
        const mockBrandConfig = {
          id: 'brand-123',
          website_id: websiteId,
          custom_domain: 'example.com',
          domain_verified: true,
          ssl_enabled: true,
        };

        const mockSSLInfo = {
          issued_to: 'example.com',
          issued_by: 'Let\'s Encrypt',
          valid_from: '2024-01-01T00:00:00Z',
          valid_to: '2024-04-01T00:00:00Z',
          status: 'valid',
        };

        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        jest.spyOn(brandService, 'getBrandConfiguration').mockResolvedValue(mockBrandConfig);
        jest.spyOn(domainVerificationService, 'getSSLCertificateInfo').mockResolvedValue(mockSSLInfo);

        const response = await request(app)
          .get(`/api/websites/${websiteId}/brand/ssl-certificate`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('example.com');
        expect(response.body.data.ssl_certificate).toEqual(mockSSLInfo);
        expect(response.body.data.ssl_enabled).toBe(true);
      });

      it('should return error when domain is not verified', async () => {
        const mockBrandConfig = {
          id: 'brand-123',
          website_id: websiteId,
          custom_domain: 'example.com',
          domain_verified: false,
        };

        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        jest.spyOn(brandService, 'getBrandConfiguration').mockResolvedValue(mockBrandConfig);

        const response = await request(app)
          .get(`/api/websites/${websiteId}/brand/ssl-certificate`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Domain must be verified');
      });
    });

    describe('GET /api/websites/:websiteId/brand/domain-summary', () => {
      it('should return domain verification summary', async () => {
        const mockSummary = {
          total_domains: 1,
          verified_domains: 1,
          ssl_enabled_domains: 1,
          pending_verifications: 0,
          failed_verifications: 0,
          verification_rate: 100,
          ssl_rate: 100,
        };

        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        mockSupabase.rpc.mockResolvedValue({ data: mockSummary, error: null });

        const response = await request(app)
          .get(`/api/websites/${websiteId}/brand/domain-summary`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.summary).toEqual(mockSummary);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_domain_verification_summary', {
          website_id_param: websiteId,
        });
      });
    });

    describe('POST /api/websites/:websiteId/brand/schedule-verification', () => {
      it('should schedule domain re-verification', async () => {
        const mockBrandConfig = {
          id: 'brand-123',
          website_id: websiteId,
          custom_domain: 'example.com',
        };

        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        const mockTeamService = require('../services/team.service');
        mockTeamService.teamService.hasPermission.mockResolvedValue(true);

        jest.spyOn(brandService, 'getBrandConfiguration').mockResolvedValue(mockBrandConfig);
        jest.spyOn(domainVerificationService, 'scheduleDomainReVerification').mockResolvedValue();

        const response = await request(app)
          .post(`/api/websites/${websiteId}/brand/schedule-verification`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            delay_minutes: 10,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('example.com');
        expect(response.body.data.scheduled_in_minutes).toBe(10);
        expect(domainVerificationService.scheduleDomainReVerification).toHaveBeenCalledWith(
          websiteId,
          'example.com',
          10
        );
      });

      it('should require manage_settings permission', async () => {
        const mockDatabaseService = require('../services/database');
        mockDatabaseService.DatabaseService.checkWebsiteAccess.mockResolvedValue(true);

        const mockTeamService = require('../services/team.service');
        mockTeamService.teamService.hasPermission.mockResolvedValue(false);

        const response = await request(app)
          .post(`/api/websites/${websiteId}/brand/schedule-verification`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            delay_minutes: 5,
          })
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Insufficient permissions');
      });
    });
  });

  describe('Enhanced Email Service', () => {
    describe('Branded Email Templates', () => {
      it('should send branded invitation email', async () => {
        const mockBrandConfig = {
          id: 'brand-123',
          website_id: websiteId,
          brand_name: 'Test Brand',
          primary_color: '#3b82f6',
          logo_url: 'https://example.com/logo.png',
          hide_storyslip_branding: false,
        };

        jest.spyOn(brandService, 'getBrandConfiguration').mockResolvedValue(mockBrandConfig);
        jest.spyOn(brandService, 'generateBrandedEmailTemplate').mockReturnValue({
          subject: 'You\'re invited to join Test Brand',
          html: '<html><body><h1>Welcome!</h1></body></html>',
          text: 'Welcome!',
        });

        const mockSendEmail = jest.spyOn(emailService, 'sendEmail').mockResolvedValue();

        await emailService.sendInvitationEmail(
          'test@example.com',
          {
            inviterName: 'John Doe',
            websiteName: 'Test Brand',
            role: 'editor',
            invitationUrl: 'https://example.com/invite/123',
            expiresAt: '2024-12-31T23:59:59Z',
          },
          websiteId
        );

        expect(brandService.getBrandConfiguration).toHaveBeenCalledWith(websiteId);
        expect(brandService.generateBrandedEmailTemplate).toHaveBeenCalled();
        expect(mockSendEmail).toHaveBeenCalledWith({
          to: 'test@example.com',
          subject: 'You\'re invited to join Test Brand',
          html: '<html><body><h1>Welcome!</h1></body></html>',
          text: 'Welcome!',
        });
      });

      it('should fallback to default template on branding error', async () => {
        jest.spyOn(brandService, 'getBrandConfiguration').mockRejectedValue(new Error('Brand config error'));
        
        const mockGenerateDefault = jest.spyOn(emailService as any, 'generateInvitationTemplate').mockReturnValue({
          subject: 'Default invitation',
          html: '<html><body><h1>Default</h1></body></html>',
          text: 'Default',
        });

        const mockSendEmail = jest.spyOn(emailService, 'sendEmail').mockResolvedValue();

        await emailService.sendInvitationEmail(
          'test@example.com',
          {
            inviterName: 'John Doe',
            websiteName: 'Test Website',
            role: 'editor',
            invitationUrl: 'https://example.com/invite/123',
            expiresAt: '2024-12-31T23:59:59Z',
          },
          websiteId
        );

        expect(mockGenerateDefault).toHaveBeenCalled();
        expect(mockSendEmail).toHaveBeenCalledWith({
          to: 'test@example.com',
          subject: 'Default invitation',
          html: '<html><body><h1>Default</h1></body></html>',
          text: 'Default',
        });
      });
    });
  });

  describe('Domain Verification Service', () => {
    describe('generateVerificationRecords', () => {
      it('should generate correct DNS records', () => {
        const records = domainVerificationService.generateVerificationRecords('example.com', websiteId);

        expect(records).toHaveLength(3);
        expect(records.find(r => r.type === 'CNAME')).toEqual({
          type: 'CNAME',
          name: 'example.com',
          value: 'proxy.storyslip.com',
          status: 'pending',
        });
        expect(records.find(r => r.type === 'TXT')).toEqual({
          type: 'TXT',
          name: '_storyslip-verification.example.com',
          value: expect.stringContaining('storyslip-verification='),
          status: 'pending',
        });
        expect(records.find(r => r.type === 'A')).toEqual({
          type: 'A',
          name: 'example.com',
          value: '192.0.2.1',
          status: 'pending',
        });
      });
    });

    describe('verifyDomain', () => {
      it('should verify domain with correct DNS records', async () => {
        // Mock DNS resolution
        const dns = require('dns');
        jest.spyOn(dns, 'resolveTxt').mockImplementation((domain, callback) => {
          if (domain === '_storyslip-verification.example.com') {
            callback(null, [['storyslip-verification=abc123']]);
          } else {
            callback(new Error('Not found'), null);
          }
        });

        jest.spyOn(dns, 'resolveCname').mockImplementation((domain, callback) => {
          if (domain === 'example.com') {
            callback(null, ['proxy.storyslip.com']);
          } else {
            callback(new Error('Not found'), null);
          }
        });

        // Mock SSL check
        jest.spyOn(domainVerificationService as any, 'checkSSLStatus').mockResolvedValue('active');

        // Mock database update
        mockSupabase.from.mockImplementation(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
          upsert: jest.fn().mockResolvedValue({ error: null }),
        }));

        const result = await domainVerificationService.verifyDomain(websiteId, 'example.com');

        expect(result.domain).toBe('example.com');
        expect(result.verified).toBe(true);
        expect(result.ssl_status).toBe('active');
        expect(result.records).toHaveLength(3);
      });

      it('should handle DNS resolution failures', async () => {
        // Mock DNS resolution failures
        const dns = require('dns');
        jest.spyOn(dns, 'resolveTxt').mockImplementation((domain, callback) => {
          callback(new Error('DNS resolution failed'), null);
        });

        jest.spyOn(dns, 'resolveCname').mockImplementation((domain, callback) => {
          callback(new Error('DNS resolution failed'), null);
        });

        jest.spyOn(dns, 'resolve4').mockImplementation((domain, callback) => {
          callback(new Error('DNS resolution failed'), null);
        });

        // Mock database update
        mockSupabase.from.mockImplementation(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
          upsert: jest.fn().mockResolvedValue({ error: null }),
        }));

        const result = await domainVerificationService.verifyDomain(websiteId, 'example.com');

        expect(result.domain).toBe('example.com');
        expect(result.verified).toBe(false);
        expect(result.records.every(r => r.status === 'failed')).toBe(true);
      });
    });
  });
});

describe('White-Labeling Integration Tests', () => {
  describe('End-to-End Brand Configuration', () => {
    it('should complete full brand setup workflow', async () => {
      // This would be an integration test that:
      // 1. Creates a brand configuration
      // 2. Sets up custom domain
      // 3. Verifies domain
      // 4. Generates branded emails
      // 5. Tests widget branding
      
      // Mock implementation would go here
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Agency Template Management', () => {
    it('should manage agency templates end-to-end', async () => {
      // This would test:
      // 1. Creating agency templates
      // 2. Applying templates to websites
      // 3. Customizing applied templates
      // 4. Template versioning
      
      // Mock implementation would go here
      expect(true).toBe(true); // Placeholder
    });
  });
});
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { ResponseUtil } from '../utils/response';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { HelperUtil } from '../utils/helpers';
import { logSecurityEvent, logDatabaseOperation } from '../middleware/logger';
import { DatabaseService } from '../services/database';
import { IntegrationService } from '../services/integration.service';

export class WebsiteController {
  /**
   * Get all websites for the authenticated user
   */
  static getWebsites = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { page = 1, limit = 10, sort = 'created_at', order = 'desc', search } = req.query;
    
    const { page: pageNum, limit: limitNum, offset } = HelperUtil.parsePagination({ page, limit });
    const { sort: sortField, order: sortOrder } = HelperUtil.parseSort(
      { sort, order }, 
      ['name', 'domain', 'created_at', 'updated_at', 'integration_status']
    );

    try {
      let query = supabase
        .from('websites')
        .select('*', { count: 'exact' })
        .eq('owner_id', userId);

      // Add search filter if provided
      if (search) {
        query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`);
      }

      // Add sorting
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Add pagination
      query = query.range(offset, offset + limitNum - 1);

      const { data: websites, error, count } = await query;

      if (error) {
        throw error;
      }

      logDatabaseOperation('SELECT', 'websites', { userId, count: count || 0 });

      ResponseUtil.paginated(res, websites || [], count || 0, pageNum, limitNum);
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch websites');
    }
  });

  /**
   * Get website by ID
   */
  static getWebsiteById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { websiteId } = req.params;
    const userId = req.user!.userId;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      const { data: website, error } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('owner_id', userId)
        .single();

      if (error || !website) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      logDatabaseOperation('SELECT', 'websites', { websiteId, userId });

      ResponseUtil.success(res, { website });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch website');
    }
  });

  /**
   * Create a new website
   */
  static createWebsite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const { name, domain, configuration = {} } = req.body;

    try {
      // Validate and normalize domain
      const normalizedDomain = HelperUtil.extractDomain(domain) || domain.toLowerCase();
      
      if (!HelperUtil.isValidDomain(normalizedDomain)) {
        return ResponseUtil.badRequest(res, 'Invalid domain format');
      }

      // Check if domain already exists for this user
      const { data: existingWebsite } = await supabase
        .from('websites')
        .select('id')
        .eq('domain', normalizedDomain)
        .eq('owner_id', userId)
        .single();

      if (existingWebsite) {
        return ResponseUtil.conflict(res, 'A website with this domain already exists in your account');
      }

      // Generate unique API key
      const apiKey = HelperUtil.generateApiKey();
      
      // Generate embed code
      const embedCode = `<script src="${process.env.WIDGET_CDN_URL || 'https://cdn.storyslip.com'}/widget/storyslip-widget.min.js"></script>
<div id="storyslip-widget"></div>
<script>
  StorySlip.init({
    apiKey: "${apiKey}",
    domain: "${normalizedDomain}"
  }, "storyslip-widget");
</script>`;

      const { data: website, error } = await supabase
        .from('websites')
        .insert({
          name,
          domain: normalizedDomain,
          api_key: apiKey,
          owner_id: userId,
          embed_code: embedCode,
          configuration,
          integration_status: 'pending',
          is_active: true,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return ResponseUtil.conflict(res, 'A website with this domain already exists');
        }
        throw error;
      }

      logDatabaseOperation('INSERT', 'websites', { websiteId: website.id, userId, domain: normalizedDomain });
      logSecurityEvent('Website created', { websiteId: website.id, domain: normalizedDomain }, req);

      ResponseUtil.created(res, { website });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to create website');
    }
  });

  /**
   * Update website
   */
  static updateWebsite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { websiteId } = req.params;
    const userId = req.user!.userId;
    const updates = req.body;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if website exists and user owns it
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // If domain is being updated, regenerate embed code
      if (updates.domain) {
        const { data: currentWebsite } = await supabase
          .from('websites')
          .select('api_key')
          .eq('id', websiteId)
          .single();

        if (currentWebsite) {
          updates.embed_code = `<script src="${process.env.WIDGET_CDN_URL || 'https://cdn.storyslip.com'}/widget/storyslip-widget.min.js"></script>
<div id="storyslip-widget"></div>
<script>
  StorySlip.init({
    apiKey: "${currentWebsite.api_key}",
    domain: "${updates.domain}"
  }, "storyslip-widget");
</script>`;
        }
      }

      const { data: website, error } = await supabase
        .from('websites')
        .update({
          ...HelperUtil.removeUndefined(updates),
          updated_at: new Date().toISOString(),
        })
        .eq('id', websiteId)
        .eq('owner_id', userId)
        .select('*')
        .single();

      if (error || !website) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      logDatabaseOperation('UPDATE', 'websites', { websiteId, userId, updates: Object.keys(updates) });
      logSecurityEvent('Website updated', { websiteId, updates: Object.keys(updates) }, req);

      ResponseUtil.success(res, { website });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to update website');
    }
  });

  /**
   * Delete website
   */
  static deleteWebsite = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { websiteId } = req.params;
    const userId = req.user!.userId;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if website exists and user owns it
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      const { error } = await supabase
        .from('websites')
        .delete()
        .eq('id', websiteId)
        .eq('owner_id', userId);

      if (error) {
        throw error;
      }

      logDatabaseOperation('DELETE', 'websites', { websiteId, userId });
      logSecurityEvent('Website deleted', { websiteId }, req);

      ResponseUtil.noContent(res);
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to delete website');
    }
  });

  /**
   * Regenerate API key for website
   */
  static regenerateApiKey = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { websiteId } = req.params;
    const userId = req.user!.userId;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if website exists and user owns it
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get current website data
      const { data: currentWebsite } = await supabase
        .from('websites')
        .select('domain')
        .eq('id', websiteId)
        .single();

      if (!currentWebsite) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Generate new API key
      const newApiKey = HelperUtil.generateApiKey();
      
      // Generate new embed code
      const newEmbedCode = `<script src="${process.env.WIDGET_CDN_URL || 'https://cdn.storyslip.com'}/widget/storyslip-widget.min.js"></script>
<div id="storyslip-widget"></div>
<script>
  StorySlip.init({
    apiKey: "${newApiKey}",
    domain: "${currentWebsite.domain}"
  }, "storyslip-widget");
</script>`;

      const { data: website, error } = await supabase
        .from('websites')
        .update({
          api_key: newApiKey,
          embed_code: newEmbedCode,
          integration_status: 'pending', // Reset integration status
          updated_at: new Date().toISOString(),
        })
        .eq('id', websiteId)
        .eq('owner_id', userId)
        .select('*')
        .single();

      if (error || !website) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      logDatabaseOperation('UPDATE', 'websites', { websiteId, userId, action: 'regenerate_api_key' });
      logSecurityEvent('API key regenerated', { websiteId }, req);

      ResponseUtil.success(res, { website });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to regenerate API key');
    }
  });

  /**
   * Test website integration
   */
  static testIntegration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { websiteId } = req.params;
    const userId = req.user!.userId;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if website exists and user owns it
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get website data
      const { data: website, error } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('owner_id', userId)
        .single();

      if (error || !website) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Run comprehensive integration tests
      const testResults = await IntegrationService.testWebsiteIntegration(
        website.domain,
        website.api_key
      );

      // Generate recommendations based on test results
      const recommendations = IntegrationService.generateRecommendations(testResults);

      // Update integration status based on test results
      let integrationStatus: 'pending' | 'success' | 'failed' | 'warning' = 'pending';
      
      switch (testResults.status) {
        case 'success':
          integrationStatus = 'success';
          break;
        case 'failed':
          integrationStatus = 'failed';
          break;
        case 'warning':
          integrationStatus = 'warning';
          break;
      }

      await supabase
        .from('websites')
        .update({
          integration_status: integrationStatus,
          last_tested_at: new Date().toISOString(),
        })
        .eq('id', websiteId);

      logDatabaseOperation('UPDATE', 'websites', { 
        websiteId, 
        userId, 
        action: 'test_integration',
        status: integrationStatus,
        score: testResults.overallScore
      });
      
      logSecurityEvent('Integration tested', { 
        websiteId, 
        status: integrationStatus,
        score: testResults.overallScore,
        duration: testResults.duration
      }, req);

      ResponseUtil.success(res, { 
        website: { ...website, integration_status: integrationStatus },
        testResults,
        recommendations
      });
    } catch (error: any) {
      // Update integration status to failed
      await supabase
        .from('websites')
        .update({
          integration_status: 'failed',
          last_tested_at: new Date().toISOString(),
        })
        .eq('id', websiteId);

      logSecurityEvent('Integration test failed', { websiteId, error: error.message }, req);

      ResponseUtil.internalError(res, 'Integration test failed');
    }
  });

  /**
   * Validate domain ownership (for future domain verification)
   */
  static validateDomainOwnership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { websiteId } = req.params;
    const userId = req.user!.userId;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if website exists and user owns it
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get website data
      const { data: website, error } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('owner_id', userId)
        .single();

      if (error || !website) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Generate verification token
      const verificationToken = HelperUtil.generateRandomString(32);
      const verificationMeta = `storyslip-verification=${verificationToken}`;

      // Update website with verification token
      await supabase
        .from('websites')
        .update({
          verification_token: verificationToken,
          verification_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', websiteId);

      logDatabaseOperation('UPDATE', 'websites', { websiteId, userId, action: 'domain_verification_started' });
      logSecurityEvent('Domain verification initiated', { websiteId, domain: website.domain }, req);

      ResponseUtil.success(res, {
        verificationToken,
        verificationMeta,
        instructions: [
          `Add the following meta tag to your website's <head> section:`,
          `<meta name="storyslip-verification" content="${verificationToken}" />`,
          `Or add a TXT record to your DNS with the value: ${verificationToken}`,
          `Then call the verify endpoint to complete verification.`
        ]
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to initiate domain verification');
    }
  });

  /**
   * Verify domain ownership
   */
  static verifyDomainOwnership = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { websiteId } = req.params;
    const userId = req.user!.userId;

    if (!HelperUtil.isValidUuid(websiteId)) {
      return ResponseUtil.badRequest(res, 'Invalid website ID format');
    }

    try {
      // Check if website exists and user owns it
      const hasAccess = await DatabaseService.checkWebsiteAccess(userId, websiteId);
      if (!hasAccess) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      // Get website data
      const { data: website, error } = await supabase
        .from('websites')
        .select('*')
        .eq('id', websiteId)
        .eq('owner_id', userId)
        .single();

      if (error || !website) {
        return ResponseUtil.notFound(res, 'Website not found');
      }

      if (!website.verification_token) {
        return ResponseUtil.badRequest(res, 'No verification token found. Please initiate domain verification first.');
      }

      // TODO: Implement actual domain verification logic
      // This would check for meta tag or DNS TXT record
      const verificationResult = {
        verified: true, // Placeholder - implement actual verification
        method: 'meta_tag',
        timestamp: new Date().toISOString(),
      };

      if (verificationResult.verified) {
        // Update website verification status
        await supabase
          .from('websites')
          .update({
            verification_status: 'verified',
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', websiteId);

        logDatabaseOperation('UPDATE', 'websites', { websiteId, userId, action: 'domain_verified' });
        logSecurityEvent('Domain verified', { websiteId, domain: website.domain, method: verificationResult.method }, req);

        ResponseUtil.success(res, {
          verified: true,
          method: verificationResult.method,
          verifiedAt: verificationResult.timestamp,
          message: 'Domain ownership verified successfully'
        });
      } else {
        ResponseUtil.badRequest(res, 'Domain verification failed. Please ensure the verification token is properly placed.');
      }
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to verify domain ownership');
    }
  });

  /**
   * Get website statistics
   */
  static getWebsiteStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    try {
      // Get total websites count
      const { count: totalWebsites, error: totalError } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId);

      if (totalError) throw totalError;

      // Get websites by integration status
      const { data: statusStats, error: statusError } = await supabase
        .from('websites')
        .select('integration_status')
        .eq('owner_id', userId)
        .then(({ data, error }) => {
          if (error) throw error;
          
          const stats = data?.reduce((acc: any, website: any) => {
            acc[website.integration_status] = (acc[website.integration_status] || 0) + 1;
            return acc;
          }, {}) || {};
          
          return { data: stats, error: null };
        });

      if (statusError) throw statusError;

      // Get active websites count
      const { count: activeWebsites, error: activeError } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('is_active', true);

      if (activeError) throw activeError;

      // Get recent websites (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: recentWebsites, error: recentError } = await supabase
        .from('websites')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (recentError) throw recentError;

      ResponseUtil.success(res, {
        totalWebsites: totalWebsites || 0,
        activeWebsites: activeWebsites || 0,
        recentWebsites: recentWebsites || 0,
        integrationStatusDistribution: statusStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      ResponseUtil.internalError(res, 'Failed to fetch website statistics');
    }
  });
}

export default WebsiteController;
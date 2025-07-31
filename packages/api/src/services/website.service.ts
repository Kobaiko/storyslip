import { supabase } from './database';
import HelperUtil from '../utils/helpers';
import { Website, WebsiteCreateInput, WebsiteUpdateInput } from '../types/database';
import { ApiError } from '../utils/response';

export class WebsiteService {
  async createWebsite(userId: string, input: WebsiteCreateInput): Promise<Website> {
    // Validate domain format
    if (!HelperUtil.isValidDomain(input.domain)) {
      throw new ApiError('Invalid domain format', 400, 'INVALID_DOMAIN');
    }

    // Check if domain already exists
    const { data: existingWebsite } = await supabase
      .from('websites')
      .select('id')
      .eq('domain', input.domain)
      .single();

    if (existingWebsite) {
      throw new ApiError('Domain already registered', 409, 'DOMAIN_EXISTS');
    }

    // Generate unique API key and embed code
    const apiKey = HelperUtil.generateApiKey();
    const embedCode = HelperUtil.generateEmbedCode(apiKey, input.domain);

    const websiteData = {
      name: input.name,
      domain: input.domain,
      api_key: apiKey,
      owner_id: userId,
      embed_code: embedCode,
      integration_status: 'pending' as const,
      configuration: input.configuration || {}
    };

    const { data, error } = await supabase
      .from('websites')
      .insert(websiteData)
      .select()
      .single();

    if (error) {
      throw new ApiError('Failed to create website', 500, 'DATABASE_ERROR', error);
    }

    return data;
  }

  async getWebsiteById(websiteId: string, userId: string): Promise<Website> {
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('owner_id', userId)
      .single();

    if (error || !data) {
      throw new ApiError('Website not found', 404, 'WEBSITE_NOT_FOUND');
    }

    return data;
  }

  async getWebsitesByUserId(userId: string, page = 1, limit = 10): Promise<{
    websites: Website[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;

    // Get total count
    const { count } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);

    // Get paginated results
    const { data, error } = await supabase
      .from('websites')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new ApiError('Failed to fetch websites', 500, 'DATABASE_ERROR', error);
    }

    return {
      websites: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  async updateWebsite(websiteId: string, userId: string, input: WebsiteUpdateInput): Promise<Website> {
    // Verify ownership
    await this.getWebsiteById(websiteId, userId);

    // If domain is being updated, validate it
    if (input.domain && !HelperUtil.isValidDomain(input.domain)) {
      throw new ApiError('Invalid domain format', 400, 'INVALID_DOMAIN');
    }

    // Check if new domain already exists (if domain is being changed)
    if (input.domain) {
      const { data: existingWebsite } = await supabase
        .from('websites')
        .select('id')
        .eq('domain', input.domain)
        .neq('id', websiteId)
        .single();

      if (existingWebsite) {
        throw new ApiError('Domain already registered', 409, 'DOMAIN_EXISTS');
      }
    }

    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.domain) updateData.domain = input.domain;
    if (input.configuration) updateData.configuration = input.configuration;

    const { data, error } = await supabase
      .from('websites')
      .update(updateData)
      .eq('id', websiteId)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) {
      throw new ApiError('Failed to update website', 500, 'DATABASE_ERROR', error);
    }

    return data;
  }

  async deleteWebsite(websiteId: string, userId: string): Promise<void> {
    // Verify ownership
    await this.getWebsiteById(websiteId, userId);

    const { error } = await supabase
      .from('websites')
      .delete()
      .eq('id', websiteId)
      .eq('owner_id', userId);

    if (error) {
      throw new ApiError('Failed to delete website', 500, 'DATABASE_ERROR', error);
    }
  }

  async regenerateApiKey(websiteId: string, userId: string): Promise<Website> {
    // Verify ownership
    const website = await this.getWebsiteById(websiteId, userId);

    // Generate new API key and embed code
    const newApiKey = HelperUtil.generateApiKey();
    const newEmbedCode = HelperUtil.generateEmbedCode(newApiKey, website.domain);

    const { data, error } = await supabase
      .from('websites')
      .update({
        api_key: newApiKey,
        embed_code: newEmbedCode,
        integration_status: 'pending'
      })
      .eq('id', websiteId)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) {
      throw new ApiError('Failed to regenerate API key', 500, 'DATABASE_ERROR', error);
    }

    return data;
  }

  async updateIntegrationStatus(websiteId: string, status: 'pending' | 'verified' | 'failed'): Promise<void> {
    const { error } = await supabase
      .from('websites')
      .update({ integration_status: status })
      .eq('id', websiteId);

    if (error) {
      throw new ApiError('Failed to update integration status', 500, 'DATABASE_ERROR', error);
    }
  }
}

export const websiteService = new WebsiteService();
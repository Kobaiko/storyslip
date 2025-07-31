export type UserRole = 'owner' | 'admin' | 'editor' | 'author';
export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'business' | 'enterprise';
export type IntegrationStatus = 'pending' | 'success' | 'failed' | 'testing';
export type ContentStatus = 'draft' | 'review' | 'published' | 'scheduled' | 'archived';
export type AnalyticsEventType = 'page_view' | 'content_view' | 'click' | 'engagement' | 'conversion';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  email_verified: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires_at?: string;
  avatar_url?: string;
  metadata: Record<string, any>;
}

export interface Website {
  id: string;
  name: string;
  domain: string;
  api_key: string;
  owner_id: string;
  integration_status: IntegrationStatus;
  embed_code: string;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website_id: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  website_id: string;
  created_at: string;
}

export interface Content {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  status: ContentStatus;
  published_at?: string;
  scheduled_at?: string;
  author_id: string;
  website_id: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  featured_image_url?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  website_id: string;
  content_id?: string;
  event_type: AnalyticsEventType;
  user_id?: string;
  session_id: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  page_url?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  website_id: string;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface WebsiteUser {
  website_id: string;
  user_id: string;
  role: UserRole;
  added_by: string;
  added_at: string;
}

export interface BrandConfiguration {
  id: string;
  user_id: string;
  website_id?: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_domain?: string;
  remove_platform_branding: boolean;
  custom_css?: string;
  email_templates: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  website_id: string;
  user_id: string;
  action: string;
  target_user_id?: string;
  details: Record<string, any>;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Database query result types
export interface DatabaseResult<T> {
  data: T | null;
  error: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Input types for API operations
export interface WebsiteCreateInput {
  name: string;
  domain: string;
  configuration?: Record<string, any>;
}

export interface WebsiteUpdateInput {
  name?: string;
  domain?: string;
  configuration?: Record<string, any>;
}
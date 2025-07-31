import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          if (error?.response?.status === 408 || error?.response?.status === 429) {
            return failureCount < 2;
          }
          return false;
        }
        // Retry on network errors and 5xx errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry on network errors and 5xx errors
        return failureCount < 2;
      },
    },
  },
});

// Query key factory for consistent key management
export const queryKeys = {
  // Authentication
  auth: {
    user: ['auth', 'user'] as const,
    permissions: ['auth', 'permissions'] as const,
  },

  // Websites
  websites: {
    all: ['websites'] as const,
    list: (filters?: Record<string, any>) => ['websites', 'list', filters] as const,
    detail: (id: string) => ['websites', 'detail', id] as const,
    settings: (id: string) => ['websites', 'settings', id] as const,
    integration: (id: string) => ['websites', 'integration', id] as const,
  },

  // Content
  content: {
    all: ['content'] as const,
    list: (websiteId: string, filters?: Record<string, any>) => 
      ['content', 'list', websiteId, filters] as const,
    detail: (websiteId: string, id: string) => 
      ['content', 'detail', websiteId, id] as const,
    drafts: (websiteId: string) => ['content', 'drafts', websiteId] as const,
    published: (websiteId: string) => ['content', 'published', websiteId] as const,
    scheduled: (websiteId: string) => ['content', 'scheduled', websiteId] as const,
  },

  // Categories
  categories: {
    all: (websiteId: string) => ['categories', websiteId] as const,
    list: (websiteId: string, filters?: Record<string, any>) => 
      ['categories', 'list', websiteId, filters] as const,
    detail: (websiteId: string, id: string) => 
      ['categories', 'detail', websiteId, id] as const,
  },

  // Tags
  tags: {
    all: (websiteId: string) => ['tags', websiteId] as const,
    list: (websiteId: string, filters?: Record<string, any>) => 
      ['tags', 'list', websiteId, filters] as const,
    popular: (websiteId: string) => ['tags', 'popular', websiteId] as const,
  },

  // Widgets
  widgets: {
    all: (websiteId: string) => ['widgets', websiteId] as const,
    list: (websiteId: string, filters?: Record<string, any>) => 
      ['widgets', 'list', websiteId, filters] as const,
    detail: (websiteId: string, id: string) => 
      ['widgets', 'detail', websiteId, id] as const,
    preview: (websiteId: string, id: string) => 
      ['widgets', 'preview', websiteId, id] as const,
  },

  // Team Management
  team: {
    members: (websiteId: string) => ['team', 'members', websiteId] as const,
    member: (websiteId: string, userId: string) => 
      ['team', 'member', websiteId, userId] as const,
    invitations: (websiteId: string) => ['team', 'invitations', websiteId] as const,
    invitation: (websiteId: string, invitationId: string) => 
      ['team', 'invitation', websiteId, invitationId] as const,
    roles: (websiteId: string) => ['team', 'roles', websiteId] as const,
  },

  // Analytics
  analytics: {
    overview: (websiteId: string, period?: string) => 
      ['analytics', 'overview', websiteId, period] as const,
    content: (websiteId: string, period?: string) => 
      ['analytics', 'content', websiteId, period] as const,
    traffic: (websiteId: string, period?: string) => 
      ['analytics', 'traffic', websiteId, period] as const,
    widgets: (websiteId: string, period?: string) => 
      ['analytics', 'widgets', websiteId, period] as const,
    realtime: (websiteId: string) => ['analytics', 'realtime', websiteId] as const,
  },

  // Brand Configuration
  brand: {
    config: (websiteId: string) => ['brand', 'config', websiteId] as const,
    themes: (websiteId: string) => ['brand', 'themes', websiteId] as const,
    assets: (websiteId: string) => ['brand', 'assets', websiteId] as const,
  },

  // Media
  media: {
    list: (websiteId: string, filters?: Record<string, any>) => 
      ['media', 'list', websiteId, filters] as const,
    detail: (websiteId: string, id: string) => 
      ['media', 'detail', websiteId, id] as const,
    folders: (websiteId: string) => ['media', 'folders', websiteId] as const,
  },

  // SEO
  seo: {
    settings: (websiteId: string) => ['seo', 'settings', websiteId] as const,
    sitemap: (websiteId: string) => ['seo', 'sitemap', websiteId] as const,
    meta: (websiteId: string, contentId: string) => 
      ['seo', 'meta', websiteId, contentId] as const,
  },

  // Audit Logs
  audit: {
    logs: (websiteId: string, filters?: Record<string, any>) => 
      ['audit', 'logs', websiteId, filters] as const,
    activity: (websiteId: string, userId?: string) => 
      ['audit', 'activity', websiteId, userId] as const,
  },
} as const;

// Helper function to invalidate related queries
export const invalidateQueries = {
  // Invalidate all content-related queries
  content: (websiteId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.content(websiteId) });
  },

  // Invalidate all team-related queries
  team: (websiteId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.team.members(websiteId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.team.invitations(websiteId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.audit.logs(websiteId) });
  },

  // Invalidate all website-related queries
  website: (websiteId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.websites.detail(websiteId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.websites.settings(websiteId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.overview(websiteId) });
  },

  // Invalidate all analytics queries
  analytics: (websiteId: string) => {
    queryClient.invalidateQueries({ 
      queryKey: ['analytics', websiteId],
      type: 'all'
    });
  },
};

// Error handling utilities
export const handleQueryError = (error: any) => {
  console.error('Query error:', error);
  
  // Handle specific error types
  if (error?.response?.status === 401) {
    // Redirect to login or refresh token
    queryClient.clear();
    window.location.href = '/login';
  } else if (error?.response?.status === 403) {
    // Handle permission errors
    console.warn('Permission denied');
  } else if (error?.response?.status >= 500) {
    // Handle server errors
    console.error('Server error occurred');
  }
};

// Prefetch utilities
export const prefetchQueries = {
  // Prefetch user data after login
  userSession: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.auth.user,
      queryFn: () => fetch('/api/auth/me').then(res => res.json()),
    });
  },

  // Prefetch website data
  websiteData: async (websiteId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.websites.detail(websiteId),
        queryFn: () => fetch(`/api/websites/${websiteId}`).then(res => res.json()),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.content.list(websiteId),
        queryFn: () => fetch(`/api/websites/${websiteId}/content`).then(res => res.json()),
      }),
    ]);
  },
};

export default queryClient;
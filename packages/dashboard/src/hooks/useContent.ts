import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

export interface Content {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  status: 'draft' | 'review' | 'published' | 'scheduled' | 'archived';
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
  author?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  categories?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface ContentCreateInput {
  title: string;
  body: string;
  excerpt?: string;
  status?: 'draft' | 'review' | 'published' | 'scheduled';
  published_at?: string;
  scheduled_at?: string;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  featured_image_url?: string;
  category_ids?: string[];
  tag_ids?: string[];
}

export interface ContentUpdateInput extends Partial<ContentCreateInput> {
  slug?: string;
}

export interface ContentFilters {
  status?: string;
  author_id?: string;
  category_id?: string;
  tag_id?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const useContent = (websiteId: string, filters?: ContentFilters) => {
  return useQuery({
    queryKey: queryKeys.content.list(websiteId, filters),
    queryFn: async () => {
      const response = await apiClient.get<{
        items: Content[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/websites/${websiteId}/content`, { params: filters });
      return response.data;
    },
    enabled: !!websiteId,
  });
};

export const useContentItem = (websiteId: string, contentId: string) => {
  return useQuery({
    queryKey: queryKeys.content.detail(websiteId, contentId),
    queryFn: async () => {
      const response = await apiClient.get<Content>(`/websites/${websiteId}/content/${contentId}`);
      return response.data;
    },
    enabled: !!(websiteId && contentId),
  });
};

export const useCreateContent = (websiteId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContentCreateInput) => {
      const response = await apiClient.post<Content>(`/websites/${websiteId}/content`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
    },
  });
};

export const useUpdateContent = (websiteId: string, contentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContentUpdateInput) => {
      const response = await apiClient.put<Content>(`/websites/${websiteId}/content/${contentId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.detail(websiteId, contentId) });
    },
  });
};

export const useDeleteContent = (websiteId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      await apiClient.delete(`/websites/${websiteId}/content/${contentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
    },
  });
};

export const usePublishContent = (websiteId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const response = await apiClient.post<Content>(`/websites/${websiteId}/content/${contentId}/publish`);
      return response.data;
    },
    onSuccess: (_, contentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.detail(websiteId, contentId) });
    },
  });
};

export const useUnpublishContent = (websiteId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const response = await apiClient.post<Content>(`/websites/${websiteId}/content/${contentId}/unpublish`);
      return response.data;
    },
    onSuccess: (_, contentId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.content.detail(websiteId, contentId) });
    },
  });
};

export const useDuplicateContent = (websiteId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const response = await apiClient.post<Content>(`/websites/${websiteId}/content/${contentId}/duplicate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
    },
  });
};
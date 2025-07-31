import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

export interface Website {
  id: string;
  name: string;
  domain: string;
  api_key: string;
  owner_id: string;
  integration_status: 'pending' | 'success' | 'failed' | 'testing';
  embed_code: string;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_tested_at?: string;
  is_active: boolean;
}

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

export const useWebsites = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.websites.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<Website[]>('/websites', { params: filters });
      return response.data || [];
    },
  });
};

export const useWebsite = (websiteId: string) => {
  return useQuery({
    queryKey: queryKeys.websites.detail(websiteId),
    queryFn: async () => {
      const response = await apiClient.get<Website>(`/websites/${websiteId}`);
      return response.data;
    },
    enabled: !!websiteId,
  });
};

export const useCreateWebsite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WebsiteCreateInput) => {
      const response = await apiClient.post<Website>('/websites', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
    },
  });
};

export const useUpdateWebsite = (websiteId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WebsiteUpdateInput) => {
      const response = await apiClient.put<Website>(`/websites/${websiteId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.websites.detail(websiteId) });
    },
  });
};

export const useDeleteWebsite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (websiteId: string) => {
      await apiClient.delete(`/websites/${websiteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
    },
  });
};

export const useTestIntegration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (websiteId: string) => {
      const response = await apiClient.post<{ status: string; errors?: string[] }>(`/websites/${websiteId}/test-integration`);
      return response.data;
    },
    onSuccess: (_, websiteId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.websites.detail(websiteId) });
    },
  });
};
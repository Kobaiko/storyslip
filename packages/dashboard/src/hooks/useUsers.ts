import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  send_invitation?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  role?: 'admin' | 'editor' | 'viewer';
  status?: 'active' | 'inactive';
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
}

// Get current user profile
export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: () => apiClient.get<User>('/auth/me'),
    select: (data) => data.data,
  });
};

// Get users list for a website
export const useUsers = (websiteId: string, filters?: UserFilters) => {
  return useQuery({
    queryKey: queryKeys.team.members(websiteId),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      
      const queryString = params.toString();
      const url = `/websites/${websiteId}/team/members${queryString ? `?${queryString}` : ''}`;
      
      return apiClient.get<User[]>(url);
    },
    select: (data) => data.data,
    enabled: !!websiteId,
  });
};

// Get single user
export const useUser = (websiteId: string, userId: string) => {
  return useQuery({
    queryKey: ['users', websiteId, userId],
    queryFn: () => apiClient.get<User>(`/websites/${websiteId}/team/members/${userId}`),
    select: (data) => data.data,
    enabled: !!websiteId && !!userId,
  });
};

// Create user mutation
export const useCreateUser = (websiteId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: CreateUserInput) =>
      apiClient.post<User>(`/websites/${websiteId}/team/invite`, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.members(websiteId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invitations(websiteId) });
    },
  });
};

// Update user mutation
export const useUpdateUser = (websiteId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: UpdateUserInput }) =>
      apiClient.put<User>(`/websites/${websiteId}/team/members/${userId}`, userData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.members(websiteId) });
      queryClient.setQueryData(['users', websiteId, variables.userId], data.data);
    },
  });
};

// Delete user mutation
export const useDeleteUser = (websiteId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/websites/${websiteId}/team/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.members(websiteId) });
    },
  });
};

// Update current user profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: { name?: string; email?: string; avatar_url?: string }) =>
      apiClient.put<User>('/users/profile', userData),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.user, data);
    },
  });
};

// Change password
export const useChangePassword = () => {
  return useMutation({
    mutationFn: (passwordData: { current_password: string; new_password: string }) =>
      apiClient.put('/users/password', passwordData),
  });
};

// Resend invitation
export const useResendInvitation = (websiteId: string) => {
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.post(`/websites/${websiteId}/team/invitations/${invitationId}/resend`),
  });
};

// Cancel invitation
export const useCancelInvitation = (websiteId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (invitationId: string) =>
      apiClient.delete(`/websites/${websiteId}/team/invitations/${invitationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invitations(websiteId) });
    },
  });
};
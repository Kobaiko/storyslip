// API client configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get auth token from localStorage
    const token = localStorage.getItem('auth_token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = {
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          code: errorData.code,
        };
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw {
          message: error.message,
          status: 0,
        } as ApiError;
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, String(params[key]));
        }
      });
    }
    
    return this.request<T>(url.pathname + url.search);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload method
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, String(additionalData[key]));
      });
    }

    const token = localStorage.getItem('auth_token');
    
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    });
  }
}

export const api = new ApiClient(API_BASE_URL);

// Convenience methods for common API calls
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: { email: string; password: string; name: string }) =>
    api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  refreshToken: () => api.post('/auth/refresh'),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  
  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }),
};

export const contentApi = {
  getAll: (params?: any) => api.get('/content', params),
  getById: (id: string) => api.get(`/content/${id}`),
  create: (data: any) => api.post('/content', data),
  update: (id: string, data: any) => api.put(`/content/${id}`, data),
  delete: (id: string) => api.delete(`/content/${id}`),
  publish: (id: string) => api.post(`/content/${id}/publish`),
  unpublish: (id: string) => api.post(`/content/${id}/unpublish`),
};

export const analyticsApi = {
  getOverview: (params: any) => api.get('/analytics/overview', params),
  getRealTime: (websiteId: string) => api.get(`/analytics/realtime/${websiteId}`),
  getContent: (params: any) => api.get('/analytics/content', params),
  getTrafficSources: (params: any) => api.get('/analytics/traffic-sources', params),
  getCountries: (params: any) => api.get('/analytics/countries', params),
  getDevices: (params: any) => api.get('/analytics/devices', params),
  export: (params: any) => api.get('/analytics/export', params),
};

export const websiteApi = {
  getAll: () => api.get('/websites'),
  getById: (id: string) => api.get(`/websites/${id}`),
  create: (data: any) => api.post('/websites', data),
  update: (id: string, data: any) => api.put(`/websites/${id}`, data),
  delete: (id: string) => api.delete(`/websites/${id}`),
  getAnalytics: (id: string, params?: any) => api.get(`/websites/${id}/analytics`, params),
};

export const widgetApi = {
  getAll: () => api.get('/widgets'),
  getById: (id: string) => api.get(`/widgets/${id}`),
  create: (data: any) => api.post('/widgets', data),
  update: (id: string, data: any) => api.put(`/widgets/${id}`, data),
  delete: (id: string) => api.delete(`/widgets/${id}`),
  getCode: (id: string) => api.get(`/widgets/${id}/code`),
};

export const teamApi = {
  getMembers: () => api.get('/team/members'),
  inviteMember: (data: { email: string; role: string }) => api.post('/team/invite', data),
  updateMember: (id: string, data: any) => api.put(`/team/members/${id}`, data),
  removeMember: (id: string) => api.delete(`/team/members/${id}`),
  getInvitations: () => api.get('/team/invitations'),
  cancelInvitation: (id: string) => api.delete(`/team/invitations/${id}`),
};

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: any) => api.put('/user/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/user/password', data),
  uploadAvatar: (file: File) => api.upload('/user/avatar', file),
  deleteAccount: () => api.delete('/user/account'),
};

export const mediaApi = {
  upload: (file: File, folder?: string) =>
    api.upload('/media/upload', file, folder ? { folder } : undefined),
  getAll: (params?: any) => api.get('/media', params),
  delete: (id: string) => api.delete(`/media/${id}`),
  getById: (id: string) => api.get(`/media/${id}`),
};

// Error handling utility
export function isApiError(error: any): error is ApiError {
  return error && typeof error.status === 'number' && typeof error.message === 'string';
}

// Response type guards
export function isSuccessResponse<T>(response: any): response is ApiResponse<T> {
  return response && response.success === true;
}

export default api;
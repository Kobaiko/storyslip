import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = apiClient.getToken();
      if (token) {
        try {
          const response = await apiClient.get<User>('/auth/me');
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            apiClient.clearToken();
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          apiClient.clearToken();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/login', {
        email,
        password,
      });

      if (response.success && response.data) {
        const { user: userData, token } = response.data;
        apiClient.setToken(token);
        setUser(userData);
      } else {
        throw new Error(response.error?.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    try {
      const response = await apiClient.post<{ user: User; token: string }>('/auth/register', {
        email,
        password,
        name,
      });

      if (response.success && response.data) {
        const { user: userData, token } = response.data;
        apiClient.setToken(token);
        setUser(userData);
      } else {
        throw new Error(response.error?.message || 'Registration failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.message || 'Registration failed');
    }
  };

  const logout = () => {
    apiClient.clearToken();
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>): Promise<void> => {
    try {
      const response = await apiClient.put<User>('/users/profile', updates);
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to update user');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to update user');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';
import SessionManager from '../lib/session';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'editor' | 'author';
  subscription_tier: 'free' | 'starter' | 'professional' | 'business' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  language: string;
  theme: string;
  email_notifications: boolean;
  marketing_emails: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
  preferences: Record<string, any>;
  social_links: Record<string, any>;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  subscription_tier: string;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  isAuthenticated: boolean;
  sessionInfo: any;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check session status from our session manager
        const sessionStatus = await SessionManager.checkSessionStatus();
        
        if (sessionStatus.authenticated && sessionStatus.user) {
          // Get Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            setSupabaseUser(session.user);
            
            // Get full user profile from API
            const response = await apiClient.get('/auth/profile');
            if (response.success && response.data) {
              setUser(response.data.user);
              setProfile(response.data.profile);
              
              // Set organization if available
              if (response.data.profile?.organizations) {
                setOrganization(response.data.profile.organizations);
              }
            }
          }
          
          setSessionInfo(sessionStatus.sessionInfo);
        } else {
          // Try to get session info from cookie
          const localSessionInfo = SessionManager.getSessionInfo();
          if (localSessionInfo) {
            setSessionInfo(localSessionInfo);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up Supabase auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setSupabaseUser(session.user);
          
          // Fetch user profile
          try {
            const response = await apiClient.get('/auth/profile');
            if (response.success && response.data) {
              setUser(response.data.user);
              setProfile(response.data.profile);
              
              if (response.data.profile?.organizations) {
                setOrganization(response.data.profile.organizations);
              }
            }
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setOrganization(null);
          setSupabaseUser(null);
          setSessionInfo(null);
        }
      }
    );

    // Set up automatic session refresh
    SessionManager.setupAutoRefresh();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const result = await SessionManager.login(email, password);
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      // The session manager handles cookies, so we just need to update our state
      setUser(result.user);
      
      // Get full profile data
      const response = await apiClient.get('/auth/profile');
      if (response.success && response.data) {
        setProfile(response.data.profile);
        if (response.data.profile?.organizations) {
          setOrganization(response.data.profile.organizations);
        }
      }

      // Update session info
      const sessionStatus = await SessionManager.checkSessionStatus();
      setSessionInfo(sessionStatus.sessionInfo);
      
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    try {
      const result = await SessionManager.register(email, password, name);
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      // Registration successful - user will need to verify email
      // Don't set user state yet, show verification message instead
      
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await SessionManager.logout();
      
      // Clear all state
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setSupabaseUser(null);
      setSessionInfo(null);
      
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state anyway for security
      setUser(null);
      setProfile(null);
      setOrganization(null);
      setSupabaseUser(null);
      setSessionInfo(null);
    }
  };

  const updateUser = async (updates: Partial<User>): Promise<void> => {
    try {
      const response = await apiClient.put('/auth/profile', updates);
      
      if (response.success && response.data) {
        setUser(response.data.user);
      } else {
        throw new Error(response.error?.message || 'Failed to update user');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to update user');
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    try {
      const response = await apiClient.put('/auth/profile', { profile: updates });
      
      if (response.success && response.data) {
        setProfile(response.data.profile);
      } else {
        throw new Error(response.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to update profile');
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const success = await SessionManager.refreshSession();
      
      if (success) {
        // Update session info
        const sessionStatus = await SessionManager.checkSessionStatus();
        setSessionInfo(sessionStatus.sessionInfo);
      }
      
      return success;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    organization,
    supabaseUser,
    loading,
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    refreshSession,
    isAuthenticated: !!user,
    sessionInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
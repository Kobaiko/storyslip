import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
  data?: Record<string, any>;
}

export interface OnboardingProgress {
  user_id: string;
  current_step: number;
  completed_steps: string[];
  is_completed: boolean;
  completed_at?: string;
  steps: OnboardingStep[];
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  // Get onboarding progress
  const {
    data: progress,
    isLoading,
    error,
    refetch
  } = useQuery<OnboardingProgress>({
    queryKey: ['onboarding', 'progress'],
    queryFn: async () => {
      const response = await api.get('/onboarding/progress');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check if onboarding should be shown
  const {
    data: shouldShow,
    isLoading: isCheckingShow
  } = useQuery<boolean>({
    queryKey: ['onboarding', 'should-show'],
    queryFn: async () => {
      const response = await api.get('/onboarding/should-show');
      return response.data.data.should_show;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Complete step mutation
  const completeStepMutation = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: string; data?: Record<string, any> }) => {
      const response = await api.post('/onboarding/step/complete', {
        step_id: stepId,
        data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/onboarding/complete');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Skip onboarding mutation
  const skipOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/onboarding/skip');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Reset onboarding mutation
  const resetOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/onboarding/reset');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  const completeStep = async (stepId: string, data?: Record<string, any>) => {
    try {
      await completeStepMutation.mutateAsync({ stepId, data });
    } catch (error) {
      console.error('Failed to complete step:', error);
      throw error;
    }
  };

  const completeOnboarding = async () => {
    try {
      await completeOnboardingMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  };

  const skipOnboarding = async () => {
    try {
      await skipOnboardingMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      throw error;
    }
  };

  const resetOnboarding = async () => {
    try {
      await resetOnboardingMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
      throw error;
    }
  };

  return {
    // Data
    progress,
    shouldShow,
    
    // Loading states
    isLoading: isLoading || isCheckingShow,
    isCompletingStep: completeStepMutation.isPending,
    isCompletingOnboarding: completeOnboardingMutation.isPending,
    isSkipping: skipOnboardingMutation.isPending,
    isResetting: resetOnboardingMutation.isPending,
    
    // Error states
    error,
    stepError: completeStepMutation.error,
    completeError: completeOnboardingMutation.error,
    skipError: skipOnboardingMutation.error,
    resetError: resetOnboardingMutation.error,
    
    // Actions
    completeStep,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    refetch,
  };
}
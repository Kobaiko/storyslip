import { useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '../components/ui/Toast';
import { apiClient } from '../lib/api';

interface AutoSaveOptions {
  websiteId: string;
  contentId?: string;
  delay?: number; // milliseconds
  enabled?: boolean;
  onSave?: (data: any) => void;
  onError?: (error: any) => void;
}

interface AutoSaveData {
  title?: string;
  body?: string;
  excerpt?: string;
  status?: string;
  [key: string]: any;
}

export function useAutoSave({
  websiteId,
  contentId,
  delay = 30000, // 30 seconds default
  enabled = true,
  onSave,
  onError,
}: AutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');
  const { success, error: showError } = useToast();

  const autoSaveMutation = useMutation({
    mutationFn: async (data: AutoSaveData) => {
      if (contentId) {
        // Update existing content
        const response = await apiClient.put(`/websites/${websiteId}/content/${contentId}`, {
          ...data,
          status: 'draft', // Always save as draft for auto-save
        });
        return response.data;
      } else {
        // Create new content as draft
        const response = await apiClient.post(`/websites/${websiteId}/content`, {
          ...data,
          status: 'draft',
        });
        return response.data;
      }
    },
    onSuccess: (data) => {
      onSave?.(data);
      // Don't show success toast for auto-save to avoid spam
    },
    onError: (error) => {
      onError?.(error);
      console.error('Auto-save failed:', error);
      // Don't show error toast for auto-save failures
    },
  });

  const scheduleAutoSave = useCallback((data: AutoSaveData) => {
    if (!enabled || !data.title || !data.body) return;

    // Create a hash of the data to avoid unnecessary saves
    const dataHash = JSON.stringify(data);
    if (dataHash === lastSavedRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule new auto-save
    timeoutRef.current = setTimeout(() => {
      lastSavedRef.current = dataHash;
      autoSaveMutation.mutate(data);
    }, delay);
  }, [enabled, delay, autoSaveMutation]);

  const saveNow = useCallback((data: AutoSaveData) => {
    if (!enabled) return;

    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const dataHash = JSON.stringify(data);
    lastSavedRef.current = dataHash;
    autoSaveMutation.mutate(data);
  }, [enabled, autoSaveMutation]);

  const cancelAutoSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    scheduleAutoSave,
    saveNow,
    cancelAutoSave,
    isAutoSaving: autoSaveMutation.isPending,
    autoSaveError: autoSaveMutation.error,
    lastAutoSave: autoSaveMutation.data,
  };
}

export default useAutoSave;
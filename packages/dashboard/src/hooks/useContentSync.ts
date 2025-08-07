import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { useToast } from '../components/ui/Toast';

interface ContentSyncOptions {
  websiteId: string;
  contentId?: string;
  enabled?: boolean;
  onConflict?: (localData: any, serverData: any) => void;
}

interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  hasConflicts: boolean;
  pendingChanges: number;
}

export function useContentSync({
  websiteId,
  contentId,
  enabled = true,
  onConflict,
}: ContentSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    lastSync: null,
    hasConflicts: false,
    pendingChanges: 0,
  });

  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { error: showError } = useToast();

  const connect = () => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // In a real implementation, this would connect to your WebSocket server
      // For now, we'll simulate the connection
      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/content-sync`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Content sync connected');
        setSyncStatus(prev => ({ ...prev, isConnected: true }));
        
        // Subscribe to content updates
        if (contentId) {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            websiteId,
            contentId,
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleSyncMessage(message);
        } catch (error) {
          console.error('Failed to parse sync message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Content sync disconnected');
        setSyncStatus(prev => ({ ...prev, isConnected: false }));
        
        // Attempt to reconnect after a delay
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Content sync error:', error);
        showError('Connection to real-time sync lost');
      };

    } catch (error) {
      console.error('Failed to connect to content sync:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setSyncStatus(prev => ({ ...prev, isConnected: false }));
  };

  const handleSyncMessage = (message: any) => {
    switch (message.type) {
      case 'content_updated':
        handleContentUpdate(message.data);
        break;
      case 'content_conflict':
        handleContentConflict(message.data);
        break;
      case 'sync_status':
        setSyncStatus(prev => ({
          ...prev,
          lastSync: new Date(message.timestamp),
          pendingChanges: message.pendingChanges || 0,
        }));
        break;
      default:
        console.log('Unknown sync message type:', message.type);
    }
  };

  const handleContentUpdate = (data: any) => {
    // Update the query cache with new data
    if (contentId) {
      queryClient.setQueryData(
        queryKeys.content.detail(websiteId, contentId),
        data
      );
    }
    
    // Invalidate content list to refresh
    queryClient.invalidateQueries({
      queryKey: queryKeys.content.list(websiteId),
    });

    setSyncStatus(prev => ({
      ...prev,
      lastSync: new Date(),
    }));
  };

  const handleContentConflict = (data: any) => {
    setSyncStatus(prev => ({
      ...prev,
      hasConflicts: true,
    }));

    if (onConflict) {
      onConflict(data.localData, data.serverData);
    }
  };

  const sendUpdate = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'content_update',
        websiteId,
        contentId,
        data,
        timestamp: new Date().toISOString(),
      }));
    }
  };

  const resolveConflict = (resolution: 'local' | 'server' | 'merge', mergedData?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resolve_conflict',
        websiteId,
        contentId,
        resolution,
        data: mergedData,
      }));
    }

    setSyncStatus(prev => ({
      ...prev,
      hasConflicts: false,
    }));
  };

  // Connect when enabled
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, websiteId, contentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    syncStatus,
    sendUpdate,
    resolveConflict,
    connect,
    disconnect,
  };
}

export default useContentSync;
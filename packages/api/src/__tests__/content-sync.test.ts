import request from 'supertest';
import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import app from '../index';
import { supabase } from '../config/supabase';
import { ContentVersioningService } from '../services/content-versioning.service';

// Mock dependencies
jest.mock('../config/supabase');
jest.mock('../services/content-versioning.service');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockVersioningService = ContentVersioningService as jest.Mocked<typeof ContentVersioningService>;

describe('Content Synchronization System', () => {
  let authToken: string;
  let userId: string;
  let websiteId: string;
  let contentId: string;

  beforeEach(() => {
    userId = 'user-123';
    websiteId = 'website-123';
    contentId = 'content-123';
    authToken = jwt.sign({ sub: userId }, process.env.JWT_SECRET || 'test-secret');

    // Reset mocks
    jest.clearAllMocks();

    // Mock successful authentication
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: contentId,
                  title: 'Test Content',
                  body: 'Test body',
                  website: {
                    id: websiteId,
                    website_members: [{ user_id: userId, role: 'editor' }],
                  },
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any);
  });

  describe('Version History API', () => {
    it('should get version history for content', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          content_id: contentId,
          version_number: 2,
          title: 'Updated Title',
          body: 'Updated body',
          user_id: userId,
          created_at: '2023-01-02T00:00:00Z',
        },
        {
          id: 'version-2',
          content_id: contentId,
          version_number: 1,
          title: 'Original Title',
          body: 'Original body',
          user_id: userId,
          created_at: '2023-01-01T00:00:00Z',
        },
      ];

      mockVersioningService.getVersionHistory.mockResolvedValue({
        data: mockVersions,
        error: null,
      });

      const response = await request(app)
        .get(`/api/content-sync/${websiteId}/${contentId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockVersions);
      expect(mockVersioningService.getVersionHistory).toHaveBeenCalledWith(contentId, 50, 0);
    });

    it('should get specific version of content', async () => {
      const mockVersion = {
        id: 'version-1',
        content_id: contentId,
        version_number: 1,
        title: 'Version 1 Title',
        body: 'Version 1 body',
        user_id: userId,
        created_at: '2023-01-01T00:00:00Z',
      };

      mockVersioningService.getVersion.mockResolvedValue({
        data: mockVersion,
        error: null,
      });

      const response = await request(app)
        .get(`/api/content-sync/${websiteId}/${contentId}/versions/1`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockVersion);
      expect(mockVersioningService.getVersion).toHaveBeenCalledWith(contentId, 1);
    });

    it('should compare two versions', async () => {
      const mockComparison = {
        version1: {
          id: 'version-1',
          version_number: 1,
          title: 'Original Title',
          body: 'Original body',
        },
        version2: {
          id: 'version-2',
          version_number: 2,
          title: 'Updated Title',
          body: 'Updated body',
        },
        differences: [
          {
            field: 'title',
            oldValue: 'Original Title',
            newValue: 'Updated Title',
            changeType: 'modified',
          },
        ],
        conflictFields: ['title'],
      };

      mockVersioningService.compareVersions.mockResolvedValue({
        data: mockComparison,
        error: null,
      });

      const response = await request(app)
        .get(`/api/content-sync/${websiteId}/${contentId}/versions/compare?version1=1&version2=2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockComparison);
      expect(mockVersioningService.compareVersions).toHaveBeenCalledWith(contentId, 1, 2);
    });
  });

  describe('Content Locking API', () => {
    it('should acquire content lock', async () => {
      const mockLock = {
        id: 'lock-123',
        content_id: contentId,
        website_id: websiteId,
        user_id: userId,
        locked_at: '2023-01-01T00:00:00Z',
        expires_at: '2023-01-01T00:10:00Z',
      };

      // Mock no existing lock
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }, // No rows found
                }),
              }),
            }),
          }),
        }),
      } as any);

      // Mock successful lock creation
      mockSupabase.from.mockReturnValueOnce({
        upsert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockLock,
              error: null,
            }),
          }),
        }),
      } as any);

      const response = await request(app)
        .post(`/api/content-sync/${websiteId}/${contentId}/lock`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockLock);
    });

    it('should reject lock acquisition when content is locked by another user', async () => {
      const existingLock = {
        id: 'lock-456',
        content_id: contentId,
        website_id: websiteId,
        user_id: 'other-user',
        locked_at: '2023-01-01T00:00:00Z',
        expires_at: '2023-01-01T00:10:00Z',
      };

      // Mock existing lock by another user
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gt: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: existingLock,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const response = await request(app)
        .post(`/api/content-sync/${websiteId}/${contentId}/lock`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('locked by another user');
    });

    it('should release content lock', async () => {
      const deletedLock = {
        id: 'lock-123',
        content_id: contentId,
        website_id: websiteId,
        user_id: userId,
      };

      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: deletedLock,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const response = await request(app)
        .delete(`/api/content-sync/${websiteId}/${contentId}/lock`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.released).toBe(true);
    });

    it('should extend content lock', async () => {
      const extendedLock = {
        id: 'lock-123',
        content_id: contentId,
        website_id: websiteId,
        user_id: userId,
        expires_at: '2023-01-01T00:20:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: extendedLock,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const response = await request(app)
        .put(`/api/content-sync/${websiteId}/${contentId}/lock`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ minutes: 20 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(extendedLock);
    });
  });

  describe('Conflict Detection API', () => {
    it('should detect conflicts in content changes', async () => {
      const mockConflictResult = {
        hasConflicts: true,
        conflicts: [
          {
            field: 'title',
            oldValue: 'Original Title',
            newValue: 'Conflicting Title',
            changeType: 'modified',
          },
        ],
        currentVersion: {
          id: 'version-2',
          version_number: 2,
          title: 'Current Title',
          body: 'Current body',
        },
      };

      mockVersioningService.detectConflicts.mockResolvedValue({
        data: mockConflictResult,
        error: null,
      });

      const response = await request(app)
        .post(`/api/content-sync/${websiteId}/${contentId}/conflicts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Conflicting Title',
          body: 'Conflicting body',
          baseVersion: 1,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockConflictResult);
      expect(mockVersioningService.detectConflicts).toHaveBeenCalledWith(
        contentId,
        {
          title: 'Conflicting Title',
          body: 'Conflicting body',
        },
        1
      );
    });
  });

  describe('Version Restoration API', () => {
    it('should restore content to specific version', async () => {
      const restoredContent = {
        id: contentId,
        title: 'Restored Title',
        body: 'Restored body',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockVersioningService.restoreVersion.mockResolvedValue({
        data: restoredContent,
        error: null,
      });

      const response = await request(app)
        .post(`/api/content-sync/${websiteId}/${contentId}/versions/1/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(restoredContent);
      expect(mockVersioningService.restoreVersion).toHaveBeenCalledWith(contentId, 1, userId);
    });

    it('should reject restoration with insufficient permissions', async () => {
      // Mock user with viewer role
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: contentId,
                    website: {
                      website_members: [{ user_id: userId, role: 'viewer' }],
                    },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const response = await request(app)
        .post(`/api/content-sync/${websiteId}/${contentId}/versions/1/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient permissions');
    });
  });

  describe('Version Statistics API', () => {
    it('should get version statistics', async () => {
      const mockStats = {
        totalVersions: 5,
        latestVersion: 5,
        firstCreated: '2023-01-01T00:00:00Z',
        lastModified: '2023-01-05T00:00:00Z',
        contributors: ['user-123', 'user-456'],
      };

      mockVersioningService.getVersionStats.mockResolvedValue({
        data: mockStats,
        error: null,
      });

      const response = await request(app)
        .get(`/api/content-sync/${websiteId}/${contentId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(mockVersioningService.getVersionStats).toHaveBeenCalledWith(contentId);
    });
  });

  describe('WebSocket Integration', () => {
    let wsServer: any;
    let wsClient: WebSocket;

    beforeAll((done) => {
      // Start test server
      wsServer = app.listen(0, () => {
        const port = (wsServer.address() as any).port;
        
        // Create WebSocket client
        wsClient = new WebSocket(`ws://localhost:${port}/content-sync?token=${authToken}`);
        
        wsClient.on('open', () => {
          done();
        });
      });
    });

    afterAll((done) => {
      wsClient.close();
      wsServer.close(done);
    });

    it('should establish WebSocket connection with valid token', (done) => {
      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          expect(message.clientId).toBeDefined();
          done();
        }
      });
    });

    it('should handle content subscription', (done) => {
      const subscribeMessage = {
        type: 'subscribe',
        websiteId,
        contentId,
      };

      wsClient.send(JSON.stringify(subscribeMessage));

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'sync_status') {
          expect(message.subscribed).toBe(true);
          expect(message.websiteId).toBe(websiteId);
          expect(message.contentId).toBe(contentId);
          done();
        }
      });
    });

    it('should handle ping/pong for connection health', (done) => {
      const pingMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
      };

      wsClient.send(JSON.stringify(pingMessage));

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'pong') {
          expect(message.timestamp).toBeDefined();
          done();
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid content ID', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          }),
        }),
      } as any);

      const response = await request(app)
        .get(`/api/content-sync/${websiteId}/invalid-content-id/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Content not found');
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/content-sync/${websiteId}/${contentId}/versions`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle service errors gracefully', async () => {
      mockVersioningService.getVersionHistory.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      const response = await request(app)
        .get(`/api/content-sync/${websiteId}/${contentId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get version history');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent lock requests', async () => {
      const lockPromises = Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/content-sync/${websiteId}/${contentId}/lock`)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const results = await Promise.allSettled(lockPromises);
      
      // Only one should succeed, others should get 409 conflict
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 200);
      const conflicts = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 409);

      expect(successful.length).toBe(1);
      expect(conflicts.length).toBe(9);
    });

    it('should handle large version history requests', async () => {
      const largeVersionList = Array.from({ length: 1000 }, (_, i) => ({
        id: `version-${i}`,
        content_id: contentId,
        version_number: i + 1,
        title: `Version ${i + 1}`,
        body: `Body for version ${i + 1}`,
        user_id: userId,
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      }));

      mockVersioningService.getVersionHistory.mockResolvedValue({
        data: largeVersionList.slice(0, 50), // Simulate pagination
        error: null,
      });

      const response = await request(app)
        .get(`/api/content-sync/${websiteId}/${contentId}/versions?limit=50`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(50);
      expect(mockVersioningService.getVersionHistory).toHaveBeenCalledWith(contentId, 50, 0);
    });
  });
});
import request from 'supertest';
import { app } from '../index';
import { supabase } from '../config/supabase';
import { createTestUser, createTestWebsite, getAuthToken } from './helpers/testHelpers';
import path from 'path';

describe('Media API', () => {
  let authToken: string;
  let userId: string;
  let websiteId: string;

  beforeAll(async () => {
    // Create test user and website
    const user = await createTestUser();
    userId = user.id;
    authToken = await getAuthToken(user.email);
    
    const website = await createTestWebsite(userId);
    websiteId = website.id;
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('media_files').delete().eq('website_id', websiteId);
    await supabase.from('websites').delete().eq('id', websiteId);
    await supabase.from('users').delete().eq('id', userId);
  });

  describe('POST /api/websites/:websiteId/media/upload', () => {
    it('should upload image file successfully', async () => {
      const testImagePath = path.join(__dirname, 'fixtures', 'test-image.png');
      
      const response = await request(app)
        .post(`/api/websites/${websiteId}/media/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake-image-data'), 'test-image.png')
        .field('alt_text', 'Test image')
        .field('caption', 'This is a test image')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.file).toHaveProperty('id');
      expect(response.body.data.file.original_filename).toBe('test-image.png');
      expect(response.body.data.file.alt_text).toBe('Test image');
      expect(response.body.data.file.caption).toBe('This is a test image');
      expect(response.body.data).toHaveProperty('url');
    });

    it('should reject unsupported file types', async () => {
      const response = await request(app)
        .post(`/api/websites/${websiteId}/media/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake-exe-data'), 'malware.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not allowed');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/websites/${websiteId}/media/upload`)
        .attach('file', Buffer.from('fake-image-data'), 'test.png')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should require file to be provided', async () => {
      const response = await request(app)
        .post(`/api/websites/${websiteId}/media/upload`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('No file provided');
    });

    it('should handle invalid website ID', async () => {
      const response = await request(app)
        .post('/api/websites/invalid-uuid/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('fake-image-data'), 'test.png')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/websites/:websiteId/media', () => {
    let testFileId: string;

    beforeEach(async () => {
      // Create a test media file
      const { data: file } = await supabase
        .from('media_files')
        .insert({
          website_id: websiteId,
          filename: 'test-file.jpg',
          original_filename: 'test-file.jpg',
          file_path: `${websiteId}/media/test-file.jpg`,
          file_size: 1024,
          mime_type: 'image/jpeg',
          alt_text: 'Test image',
          uploaded_by: userId,
        })
        .select()
        .single();

      testFileId = file.id;
    });

    afterEach(async () => {
      // Clean up test file
      if (testFileId) {
        await supabase.from('media_files').delete().eq('id', testFileId);
      }
    });

    it('should return media files list', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('filename');
      expect(response.body.data[0]).toHaveProperty('original_filename');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 5);
    });

    it('should support filtering by type', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'image' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support search', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/websites/:websiteId/media/:fileId', () => {
    let testFileId: string;

    beforeEach(async () => {
      // Create a test media file
      const { data: file } = await supabase
        .from('media_files')
        .insert({
          website_id: websiteId,
          filename: 'test-file.jpg',
          original_filename: 'test-file.jpg',
          file_path: `${websiteId}/media/test-file.jpg`,
          file_size: 1024,
          mime_type: 'image/jpeg',
          alt_text: 'Test image',
          uploaded_by: userId,
        })
        .select()
        .single();

      testFileId = file.id;
    });

    afterEach(async () => {
      // Clean up test file
      if (testFileId) {
        await supabase.from('media_files').delete().eq('id', testFileId);
      }
    });

    it('should return media file by ID', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media/${testFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.file).toHaveProperty('id', testFileId);
      expect(response.body.data.file).toHaveProperty('original_filename', 'test-file.jpg');
      expect(response.body.data).toHaveProperty('url');
    });

    it('should handle file not found', async () => {
      const nonExistentFileId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media/${nonExistentFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Media file not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media/${testFileId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PUT /api/websites/:websiteId/media/:fileId', () => {
    let testFileId: string;

    beforeEach(async () => {
      // Create a test media file
      const { data: file } = await supabase
        .from('media_files')
        .insert({
          website_id: websiteId,
          filename: 'test-file.jpg',
          original_filename: 'test-file.jpg',
          file_path: `${websiteId}/media/test-file.jpg`,
          file_size: 1024,
          mime_type: 'image/jpeg',
          alt_text: 'Test image',
          uploaded_by: userId,
        })
        .select()
        .single();

      testFileId = file.id;
    });

    afterEach(async () => {
      // Clean up test file
      if (testFileId) {
        await supabase.from('media_files').delete().eq('id', testFileId);
      }
    });

    it('should update media file metadata', async () => {
      const updateData = {
        alt_text: 'Updated alt text',
        caption: 'Updated caption',
      };

      const response = await request(app)
        .put(`/api/websites/${websiteId}/media/${testFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.file.alt_text).toBe('Updated alt text');
      expect(response.body.data.file.caption).toBe('Updated caption');
    });

    it('should handle file not found', async () => {
      const nonExistentFileId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .put(`/api/websites/${websiteId}/media/${nonExistentFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ alt_text: 'Updated' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Media file not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/websites/${websiteId}/media/${testFileId}`)
        .send({ alt_text: 'Updated' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('DELETE /api/websites/:websiteId/media/:fileId', () => {
    let testFileId: string;

    beforeEach(async () => {
      // Create a test media file
      const { data: file } = await supabase
        .from('media_files')
        .insert({
          website_id: websiteId,
          filename: 'test-file.jpg',
          original_filename: 'test-file.jpg',
          file_path: `${websiteId}/media/test-file.jpg`,
          file_size: 1024,
          mime_type: 'image/jpeg',
          alt_text: 'Test image',
          uploaded_by: userId,
        })
        .select()
        .single();

      testFileId = file.id;
    });

    it('should delete media file', async () => {
      const response = await request(app)
        .delete(`/api/websites/${websiteId}/media/${testFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify file is deleted
      const { data: deletedFile } = await supabase
        .from('media_files')
        .select()
        .eq('id', testFileId)
        .single();

      expect(deletedFile).toBeNull();
    });

    it('should handle file not found', async () => {
      const nonExistentFileId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .delete(`/api/websites/${websiteId}/media/${nonExistentFileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Media file not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/websites/${websiteId}/media/${testFileId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/websites/:websiteId/media/stats', () => {
    it('should return media statistics', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFiles');
      expect(response.body.data).toHaveProperty('totalSize');
      expect(response.body.data).toHaveProperty('imageCount');
      expect(response.body.data).toHaveProperty('documentCount');
      expect(response.body.data).toHaveProperty('recentUploads');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/websites/${websiteId}/media/stats`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
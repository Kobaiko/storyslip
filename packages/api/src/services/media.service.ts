import { supabase } from '../config/supabase';
import { ApiError } from '../utils/response';
import { HelperUtil } from '../utils/helpers';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface MediaFile {
  id: string;
  website_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  alt_text?: string;
  caption?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface MediaUploadResult {
  file: MediaFile;
  url: string;
}

export class MediaService {
  private static readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  private static readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Configure multer for file uploads
   */
  static getMulterConfig() {
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: {
        fileSize: this.MAX_FILE_SIZE,
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          ...this.ALLOWED_IMAGE_TYPES,
          ...this.ALLOWED_DOCUMENT_TYPES
        ];

        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new ApiError(
            `File type ${file.mimetype} is not allowed`,
            400,
            'INVALID_FILE_TYPE'
          ));
        }
      },
    });
  }

  /**
   * Upload file to Supabase Storage
   */
  async uploadFile(
    websiteId: string,
    userId: string,
    file: Express.Multer.File,
    options: {
      alt_text?: string;
      caption?: string;
    } = {}
  ): Promise<MediaUploadResult> {
    try {
      // Validate file size based on type
      const maxSize = this.ALLOWED_IMAGE_TYPES.includes(file.mimetype) 
        ? MediaService.MAX_IMAGE_SIZE 
        : MediaService.MAX_FILE_SIZE;

      if (file.size > maxSize) {
        throw new ApiError(
          `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
          400,
          'FILE_TOO_LARGE'
        );
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const filename = `${uuidv4()}${fileExtension}`;
      const filePath = `${websiteId}/media/${filename}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
        });

      if (uploadError) {
        throw new ApiError('Failed to upload file', 500, 'UPLOAD_ERROR', uploadError);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Save file metadata to database
      const mediaData = {
        website_id: websiteId,
        filename,
        original_filename: file.originalname,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.mimetype,
        alt_text: options.alt_text,
        caption: options.caption,
        uploaded_by: userId,
      };

      const { data: mediaFile, error: dbError } = await supabase
        .from('media_files')
        .insert(mediaData)
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('media').remove([filePath]);
        throw new ApiError('Failed to save file metadata', 500, 'DATABASE_ERROR', dbError);
      }

      return {
        file: mediaFile,
        url: urlData.publicUrl,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to upload file', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get media files for a website
   */
  async getMediaFiles(
    websiteId: string,
    filters: {
      type?: 'image' | 'document';
      search?: string;
    } = {},
    page = 1,
    limit = 20
  ): Promise<{
    files: MediaFile[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      let query = supabase
        .from('media_files')
        .select('*', { count: 'exact' })
        .eq('website_id', websiteId);

      // Apply filters
      if (filters.type === 'image') {
        query = query.in('mime_type', MediaService.ALLOWED_IMAGE_TYPES);
      } else if (filters.type === 'document') {
        query = query.in('mime_type', MediaService.ALLOWED_DOCUMENT_TYPES);
      }

      if (filters.search) {
        query = query.or(`original_filename.ilike.%${filters.search}%,alt_text.ilike.%${filters.search}%,caption.ilike.%${filters.search}%`);
      }

      // Apply pagination and sorting
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: files, error, count } = await query;

      if (error) {
        throw new ApiError('Failed to fetch media files', 500, 'DATABASE_ERROR', error);
      }

      return {
        files: files || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch media files', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get media file by ID
   */
  async getMediaFileById(fileId: string, websiteId: string): Promise<MediaFile> {
    try {
      const { data: file, error } = await supabase
        .from('media_files')
        .select('*')
        .eq('id', fileId)
        .eq('website_id', websiteId)
        .single();

      if (error || !file) {
        throw new ApiError('Media file not found', 404, 'FILE_NOT_FOUND');
      }

      return file;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch media file', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Update media file metadata
   */
  async updateMediaFile(
    fileId: string,
    websiteId: string,
    updates: {
      alt_text?: string;
      caption?: string;
    }
  ): Promise<MediaFile> {
    try {
      // Verify file exists
      await this.getMediaFileById(fileId, websiteId);

      const { data: file, error } = await supabase
        .from('media_files')
        .update({
          ...HelperUtil.removeUndefined(updates),
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId)
        .eq('website_id', websiteId)
        .select()
        .single();

      if (error || !file) {
        throw new ApiError('Failed to update media file', 500, 'DATABASE_ERROR', error);
      }

      return file;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update media file', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Delete media file
   */
  async deleteMediaFile(fileId: string, websiteId: string): Promise<void> {
    try {
      // Get file info first
      const file = await this.getMediaFileById(fileId, websiteId);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('media')
        .remove([file.file_path]);

      if (storageError) {
        console.error('Failed to delete file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_files')
        .delete()
        .eq('id', fileId)
        .eq('website_id', websiteId);

      if (dbError) {
        throw new ApiError('Failed to delete media file', 500, 'DATABASE_ERROR', dbError);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete media file', 500, 'INTERNAL_ERROR', error);
    }
  }

  /**
   * Get media file URL
   */
  getMediaFileUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Get media usage statistics
   */
  async getMediaStats(websiteId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    imageCount: number;
    documentCount: number;
    recentUploads: number;
  }> {
    try {
      // Get all files for the website
      const { data: files } = await supabase
        .from('media_files')
        .select('mime_type, file_size, created_at')
        .eq('website_id', websiteId);

      if (!files) {
        return {
          totalFiles: 0,
          totalSize: 0,
          imageCount: 0,
          documentCount: 0,
          recentUploads: 0,
        };
      }

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
      const imageCount = files.filter(file => 
        MediaService.ALLOWED_IMAGE_TYPES.includes(file.mime_type)
      ).length;
      const documentCount = files.filter(file => 
        MediaService.ALLOWED_DOCUMENT_TYPES.includes(file.mime_type)
      ).length;

      // Count recent uploads (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentUploads = files.filter(file => 
        new Date(file.created_at) >= sevenDaysAgo
      ).length;

      return {
        totalFiles,
        totalSize,
        imageCount,
        documentCount,
        recentUploads,
      };
    } catch (error) {
      throw new ApiError('Failed to get media statistics', 500, 'INTERNAL_ERROR', error);
    }
  }
}

export const mediaService = new MediaService();
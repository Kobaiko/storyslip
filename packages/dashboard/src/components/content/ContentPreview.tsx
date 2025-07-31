import React from 'react';
import { 
  Eye, 
  ExternalLink, 
  Calendar, 
  User, 
  Tag, 
  Folder,
  Clock,
  Globe
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Content } from '../../hooks/useContent';
import { formatDate, formatRelativeTime } from '../../lib/utils';

interface ContentPreviewProps {
  content: Content;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onPublish?: () => void;
  websiteUrl?: string;
}

export function ContentPreview({
  content,
  isOpen,
  onClose,
  onEdit,
  onPublish,
  websiteUrl = 'https://example.com',
}: ContentPreviewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'scheduled': return 'warning';
      case 'review': return 'info';
      default: return 'secondary';
    }
  };

  const previewUrl = `${websiteUrl}/${content.slug}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Content Preview"
      size="xl"
    >
      <div className="flex h-[80vh]">
        {/* Sidebar with metadata */}
        <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Status and Actions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant={getStatusColor(content.status)}>
                  {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                </Badge>
                
                <div className="flex items-center space-x-2">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEdit}
                    >
                      Edit
                    </Button>
                  )}
                  
                  {onPublish && content.status !== 'published' && (
                    <Button
                      size="sm"
                      onClick={onPublish}
                    >
                      Publish
                    </Button>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                leftIcon={<ExternalLink className="h-4 w-4" />}
                onClick={() => window.open(previewUrl, '_blank')}
              >
                View Live
              </Button>
            </div>

            {/* Content Info */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Content Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Author:</span>
                    <span className="font-medium">{content.author?.name || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Created:</span>
                    <span>{formatDate(content.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Updated:</span>
                    <span>{formatRelativeTime(content.updated_at)}</span>
                  </div>
                  
                  {content.published_at && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Published:</span>
                      <span>{formatDate(content.published_at)}</span>
                    </div>
                  )}
                  
                  {content.scheduled_at && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Scheduled:</span>
                      <span>{formatDate(content.scheduled_at)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Views:</span>
                    <span>{content.view_count.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Categories */}
              {content.categories && content.categories.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Folder className="h-4 w-4 mr-1" />
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {content.categories.map((category) => (
                      <Badge key={category.id} variant="secondary" size="sm">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {content.tags && content.tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Tag className="h-4 w-4 mr-1" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {content.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline" size="sm">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* SEO Info */}
              {(content.seo_title || content.seo_description || content.seo_keywords) && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">SEO</h4>
                  <div className="space-y-2 text-sm">
                    {content.seo_title && (
                      <div>
                        <span className="text-gray-600">Title:</span>
                        <p className="text-gray-900 mt-1">{content.seo_title}</p>
                      </div>
                    )}
                    
                    {content.seo_description && (
                      <div>
                        <span className="text-gray-600">Description:</span>
                        <p className="text-gray-900 mt-1">{content.seo_description}</p>
                      </div>
                    )}
                    
                    {content.seo_keywords && (
                      <div>
                        <span className="text-gray-600">Keywords:</span>
                        <p className="text-gray-900 mt-1">{content.seo_keywords}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* URL */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">URL</h4>
                <div className="text-sm">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
                    {previewUrl}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main preview area */}
        <div className="flex-1 overflow-y-auto">
          {/* Featured Image */}
          {content.featured_image_url && (
            <div className="w-full h-64 bg-gray-100">
              <img
                src={content.featured_image_url}
                alt={content.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            <article className="prose prose-lg max-w-none">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {content.title}
              </h1>
              
              {content.excerpt && (
                <p className="text-xl text-gray-600 mb-6 font-medium leading-relaxed">
                  {content.excerpt}
                </p>
              )}
              
              <div 
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: content.body }} 
              />
            </article>
          </div>
        </div>
      </div>

      <style jsx>{`
        .prose-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 2rem 0 1rem 0;
          line-height: 1.2;
        }
        
        .prose-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.5rem 0 0.75rem 0;
          line-height: 1.3;
        }
        
        .prose-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1.25rem 0 0.5rem 0;
          line-height: 1.4;
        }
        
        .prose-content p {
          margin: 1rem 0;
          line-height: 1.7;
          color: #374151;
        }
        
        .prose-content ul, .prose-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }
        
        .prose-content li {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        
        .prose-content blockquote {
          border-left: 4px solid #E5E7EB;
          padding-left: 1.5rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #6B7280;
          background-color: #F9FAFB;
          padding: 1rem 1.5rem;
          border-radius: 0.375rem;
        }
        
        .prose-content pre {
          background-color: #F3F4F6;
          padding: 1.5rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 1.5rem 0;
        }
        
        .prose-content code {
          background-color: #F3F4F6;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
        }
        
        .prose-content a {
          color: #3B82F6;
          text-decoration: underline;
          text-decoration-color: #93C5FD;
          text-underline-offset: 2px;
        }
        
        .prose-content a:hover {
          text-decoration-color: #3B82F6;
        }
        
        .prose-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .prose-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        
        .prose-content th,
        .prose-content td {
          border: 1px solid #E5E7EB;
          padding: 0.75rem;
          text-align: left;
        }
        
        .prose-content th {
          background-color: #F9FAFB;
          font-weight: 600;
        }
      `}</style>
    </Modal>
  );
}
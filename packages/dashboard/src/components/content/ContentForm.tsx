import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Save, 
  Eye, 
  Send, 
  Calendar, 
  Tag, 
  Folder, 
  Image, 
  Settings,
  Globe,
  Clock,
  User,
  Edit3
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Form, FormField, FormActions, Textarea, Select, Checkbox } from '../ui/Form';
import { FormContainer } from '../ui/FormContainer';
import { FormFieldGroup, ContentMetadataFieldGroup, SEOFieldGroup } from '../ui/FormFieldGroup';
import { Badge } from '../ui/Badge';
import { Modal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { RichTextEditor } from './RichTextEditor';
import { Content } from '../../hooks/useContent';
import { slugify, formatDate } from '../../lib/utils';

// Validation schema
const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional(),
  body: z.string().min(1, 'Content body is required'),
  status: z.enum(['draft', 'review', 'published', 'scheduled']),
  published_at: z.string().optional(),
  scheduled_at: z.string().optional(),
  seo_title: z.string().max(60, 'SEO title should be less than 60 characters').optional(),
  seo_description: z.string().max(160, 'SEO description should be less than 160 characters').optional(),
  seo_keywords: z.string().optional(),
  featured_image_url: z.string().url().optional().or(z.literal('')),
  category_ids: z.array(z.string()).optional(),
  tag_ids: z.array(z.string()).optional(),
});

type ContentFormData = z.infer<typeof contentSchema>;

interface ContentFormProps {
  content?: Content | null;
  websiteId: string;
  onSubmit: (data: ContentFormData) => Promise<void>;
  onSaveDraft?: (data: ContentFormData) => Promise<void>;
  onPreview?: (data: ContentFormData) => void;
  loading?: boolean;
  mode: 'create' | 'edit';
  categories?: Array<{ id: string; name: string; slug: string }>;
  tags?: Array<{ id: string; name: string; slug: string }>;
  onImageUpload?: (file: File) => Promise<string>;
}

export function ContentForm({
  content,
  websiteId,
  onSubmit,
  onSaveDraft,
  onPreview,
  loading = false,
  mode,
  categories = [],
  tags = [],
  onImageUpload,
}: ContentFormProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'settings'>('content');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const seoModal = useModal();
  const settingsModal = useModal();
  const { success, error: showError } = useToast();

  const form = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: content?.title || '',
      slug: content?.slug || '',
      excerpt: content?.excerpt || '',
      body: content?.body || '',
      status: content?.status || 'draft',
      published_at: content?.published_at || '',
      scheduled_at: content?.scheduled_at || '',
      seo_title: content?.seo_title || '',
      seo_description: content?.seo_description || '',
      seo_keywords: content?.seo_keywords || '',
      featured_image_url: content?.featured_image_url || '',
      category_ids: content?.categories?.map(c => c.id) || [],
      tag_ids: content?.tags?.map(t => t.id) || [],
    },
  });

  const watchedTitle = form.watch('title');
  const watchedStatus = form.watch('status');
  const watchedBody = form.watch('body');

  // Auto-generate slug from title
  React.useEffect(() => {
    if (watchedTitle && mode === 'create') {
      const generatedSlug = slugify(watchedTitle);
      form.setValue('slug', generatedSlug);
    }
  }, [watchedTitle, mode, form]);

  // Auto-save functionality
  React.useEffect(() => {
    if (!autoSaveEnabled || !onSaveDraft || mode === 'create') return;

    const timer = setTimeout(() => {
      const formData = form.getValues();
      if (formData.title && formData.body) {
        onSaveDraft(formData).then(() => {
          setLastSaved(new Date());
        }).catch(() => {
          // Silently fail auto-save
        });
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(timer);
  }, [watchedTitle, watchedBody, autoSaveEnabled, onSaveDraft, mode, form]);

  const handleSubmit = async (data: ContentFormData) => {
    try {
      await onSubmit(data);
      success(`Content ${mode === 'create' ? 'created' : 'updated'} successfully`);
    } catch (error: any) {
      showError(error.message || `Failed to ${mode} content`);
    }
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    
    try {
      const data = form.getValues();
      await onSaveDraft({ ...data, status: 'draft' });
      setLastSaved(new Date());
      success('Draft saved successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to save draft');
    }
  };

  const handlePreview = () => {
    if (onPreview) {
      const data = form.getValues();
      onPreview(data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'scheduled': return 'warning';
      case 'review': return 'info';
      default: return 'secondary';
    }
  };

  const tabs = [
    { id: 'content', label: 'Content', icon: Edit3 },
    { id: 'seo', label: 'SEO', icon: Globe },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <FormContainer maxWidth="full" centered={false}>
      <Form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {mode === 'create' ? 'Create New Content' : 'Edit Content'}
                </h1>
                {lastSaved && (
                  <p className="text-sm text-gray-500">
                    Last saved {formatDate(lastSaved.toISOString())}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <Badge variant={getStatusColor(watchedStatus)}>
                  {watchedStatus.charAt(0).toUpperCase() + watchedStatus.slice(1)}
                </Badge>
                
                {onSaveDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    leftIcon={<Save className="h-4 w-4" />}
                    size="lg"
                  >
                    Save Draft
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  leftIcon={<Eye className="h-4 w-4" />}
                  size="lg"
                >
                  Preview
                </Button>
              </div>
            </div>

            {/* Content Metadata */}
            <Card>
              <CardContent className="p-6">
                <ContentMetadataFieldGroup>
                  <Input
                    label="Title"
                    placeholder="Enter content title..."
                    value={form.watch('title')}
                    onChange={(e) => form.setValue('title', e.target.value)}
                    error={form.formState.errors.title?.message}
                  />

                  <Input
                    label="Slug"
                    placeholder="content-slug"
                    value={form.watch('slug')}
                    onChange={(e) => form.setValue('slug', e.target.value)}
                    error={form.formState.errors.slug?.message}
                    helperText="URL-friendly version of the title"
                  />

                  <div className="sm:col-span-2">
                    <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
                      Excerpt (Optional)
                    </label>
                    <textarea
                      id="excerpt"
                      rows={3}
                      value={form.watch('excerpt') || ''}
                      onChange={(e) => form.setValue('excerpt', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Brief description of the content..."
                    />
                    {form.formState.errors.excerpt && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.excerpt.message}
                      </p>
                    )}
                  </div>
                </ContentMetadataFieldGroup>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  value={form.watch('body')}
                  onChange={(value) => form.setValue('body', value)}
                  placeholder="Start writing your content..."
                  height="500px"
                  onImageUpload={onImageUpload}
                />
                {form.formState.errors.body && (
                  <p className="text-sm text-red-600 mt-2">
                    {form.formState.errors.body.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* SEO Section */}
            <Card>
              <CardContent className="p-6">
                <SEOFieldGroup>
                  <Input
                    label="SEO Title"
                    placeholder="Optimized title for search engines..."
                    value={form.watch('seo_title') || ''}
                    onChange={(e) => form.setValue('seo_title', e.target.value)}
                    error={form.formState.errors.seo_title?.message}
                    helperText={`${form.watch('seo_title')?.length || 0}/60 characters`}
                  />

                  <div className="sm:col-span-2">
                    <label htmlFor="seo_description" className="block text-sm font-medium text-gray-700 mb-2">
                      SEO Description
                    </label>
                    <textarea
                      id="seo_description"
                      rows={3}
                      value={form.watch('seo_description') || ''}
                      onChange={(e) => form.setValue('seo_description', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Brief description for search results..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {form.watch('seo_description')?.length || 0}/160 characters
                    </p>
                    {form.formState.errors.seo_description && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.seo_description.message}
                      </p>
                    )}
                  </div>

                  <Input
                    label="SEO Keywords"
                    placeholder="keyword1, keyword2, keyword3"
                    value={form.watch('seo_keywords') || ''}
                    onChange={(e) => form.setValue('seo_keywords', e.target.value)}
                    error={form.formState.errors.seo_keywords?.message}
                    helperText="Comma-separated keywords"
                  />
                </SEOFieldGroup>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="h-5 w-5 mr-2" />
                  Publish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormFieldGroup layout="single" spacing="normal">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      value={form.watch('status')}
                      onChange={(e) => form.setValue('status', e.target.value as any)}
                      className="w-full h-11 px-4 py-3 text-base border border-gray-300 bg-white rounded-lg shadow-sm transition-all duration-200
                        hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        sm:h-12 sm:px-4 sm:py-3"
                    >
                      <option value="draft">Draft</option>
                      <option value="review">Under Review</option>
                      <option value="published">Published</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>

                  {watchedStatus === 'scheduled' && (
                    <Input
                      label="Schedule Date"
                      type="datetime-local"
                      value={form.watch('scheduled_at') || ''}
                      onChange={(e) => form.setValue('scheduled_at', e.target.value)}
                      error={form.formState.errors.scheduled_at?.message}
                    />
                  )}

                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full"
                    leftIcon={<Send className="h-4 w-4" />}
                    size="lg"
                  >
                    {watchedStatus === 'published' ? 'Publish' : 
                     watchedStatus === 'scheduled' ? 'Schedule' : 
                     'Save'}
                  </Button>
                </FormFieldGroup>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Folder className="h-5 w-5 mr-2" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.watch('category_ids')?.includes(category.id) || false}
                        onChange={(e) => {
                          const currentIds = form.watch('category_ids') || [];
                          if (e.target.checked) {
                            form.setValue('category_ids', [...currentIds, category.id]);
                          } else {
                            form.setValue('category_ids', currentIds.filter(id => id !== category.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.watch('tag_ids')?.includes(tag.id) || false}
                        onChange={(e) => {
                          const currentIds = form.watch('tag_ids') || [];
                          if (e.target.checked) {
                            form.setValue('tag_ids', [...currentIds, tag.id]);
                          } else {
                            form.setValue('tag_ids', currentIds.filter(id => id !== tag.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Image className="h-5 w-5 mr-2" />
                  Featured Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormFieldGroup layout="single">
                  <Input
                    label="Image URL"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={form.watch('featured_image_url') || ''}
                    onChange={(e) => form.setValue('featured_image_url', e.target.value)}
                    error={form.formState.errors.featured_image_url?.message}
                  />
                  
                  {form.watch('featured_image_url') && (
                    <div className="mt-3">
                      <img
                        src={form.watch('featured_image_url')}
                        alt="Featured"
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </FormFieldGroup>
              </CardContent>
            </Card>

            {/* Auto-save Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Auto-save
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Enable auto-save</span>
                    <p className="text-xs text-gray-500">Automatically save drafts every 30 seconds</p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>
        </div>
      </Form>
    </FormContainer>
  );
}
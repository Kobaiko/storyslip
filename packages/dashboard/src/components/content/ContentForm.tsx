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
import { Form, FormField, FormActions, Input, Textarea, Select, Checkbox } from '../ui/Form';
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
    <div className="max-w-6xl mx-auto">
      <Form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                  >
                    Save Draft
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  leftIcon={<Eye className="h-4 w-4" />}
                >
                  Preview
                </Button>
              </div>
            </div>

            {/* Title and Slug */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <FormField>
                  <Input
                    label="Title"
                    placeholder="Enter content title..."
                    {...form.register('title')}
                    error={form.formState.errors.title?.message}
                  />
                </FormField>

                <FormField>
                  <Input
                    label="Slug"
                    placeholder="content-slug"
                    {...form.register('slug')}
                    error={form.formState.errors.slug?.message}
                    helperText="URL-friendly version of the title"
                  />
                </FormField>

                <FormField>
                  <Textarea
                    label="Excerpt (Optional)"
                    placeholder="Brief description of the content..."
                    {...form.register('excerpt')}
                    error={form.formState.errors.excerpt?.message}
                    rows={3}
                  />
                </FormField>
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
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  SEO Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField>
                  <Input
                    label="SEO Title"
                    placeholder="Optimized title for search engines..."
                    {...form.register('seo_title')}
                    error={form.formState.errors.seo_title?.message}
                    helperText={`${form.watch('seo_title')?.length || 0}/60 characters`}
                  />
                </FormField>

                <FormField>
                  <Textarea
                    label="SEO Description"
                    placeholder="Brief description for search results..."
                    {...form.register('seo_description')}
                    error={form.formState.errors.seo_description?.message}
                    helperText={`${form.watch('seo_description')?.length || 0}/160 characters`}
                    rows={3}
                  />
                </FormField>

                <FormField>
                  <Input
                    label="SEO Keywords"
                    placeholder="keyword1, keyword2, keyword3"
                    {...form.register('seo_keywords')}
                    error={form.formState.errors.seo_keywords?.message}
                    helperText="Comma-separated keywords"
                  />
                </FormField>
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
              <CardContent className="space-y-4">
                <FormField>
                  <Select
                    label="Status"
                    value={form.watch('status')}
                    onChange={(e) => form.setValue('status', e.target.value as any)}
                    options={[
                      { value: 'draft', label: 'Draft' },
                      { value: 'review', label: 'Under Review' },
                      { value: 'published', label: 'Published' },
                      { value: 'scheduled', label: 'Scheduled' },
                    ]}
                  />
                </FormField>

                {watchedStatus === 'scheduled' && (
                  <FormField>
                    <Input
                      label="Schedule Date"
                      type="datetime-local"
                      {...form.register('scheduled_at')}
                      error={form.formState.errors.scheduled_at?.message}
                    />
                  </FormField>
                )}

                <FormActions>
                  <Button
                    type="submit"
                    loading={loading}
                    className="w-full"
                    leftIcon={<Send className="h-4 w-4" />}
                  >
                    {watchedStatus === 'published' ? 'Publish' : 
                     watchedStatus === 'scheduled' ? 'Schedule' : 
                     'Save'}
                  </Button>
                </FormActions>
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
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categories.map((category) => (
                    <Checkbox
                      key={category.id}
                      label={category.name}
                      checked={form.watch('category_ids')?.includes(category.id) || false}
                      onChange={(e) => {
                        const currentIds = form.watch('category_ids') || [];
                        if (e.target.checked) {
                          form.setValue('category_ids', [...currentIds, category.id]);
                        } else {
                          form.setValue('category_ids', currentIds.filter(id => id !== category.id));
                        }
                      }}
                    />
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
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tags.map((tag) => (
                    <Checkbox
                      key={tag.id}
                      label={tag.name}
                      checked={form.watch('tag_ids')?.includes(tag.id) || false}
                      onChange={(e) => {
                        const currentIds = form.watch('tag_ids') || [];
                        if (e.target.checked) {
                          form.setValue('tag_ids', [...currentIds, tag.id]);
                        } else {
                          form.setValue('tag_ids', currentIds.filter(id => id !== tag.id));
                        }
                      }}
                    />
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
                <FormField>
                  <Input
                    label="Image URL"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    {...form.register('featured_image_url')}
                    error={form.formState.errors.featured_image_url?.message}
                  />
                </FormField>
                
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
                <Checkbox
                  label="Enable auto-save"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  helperText="Automatically save drafts every 30 seconds"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </Form>
    </div>
  );
}
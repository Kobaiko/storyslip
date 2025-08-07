import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal, useModal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { ContentList } from '../components/content/ContentList';
import { EnhancedContentForm } from '../components/content/EnhancedContentForm';
import { ContentPublishingWorkflow } from '../components/content/ContentPublishingWorkflow';
import { 
  useContent, 
  useCreateContent, 
  useUpdateContent, 
  useDeleteContent,
  useDuplicateContent,
  usePublishContent,
  useUnpublishContent,
  Content 
} from '../hooks/useContent';

// Mock website ID - in real app this would come from context or route params
const MOCK_WEBSITE_ID = '123e4567-e89b-12d3-a456-426614174001';

const ContentPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const previewModal = useModal();
  const { success, error: showError } = useToast();

  // API hooks
  const { data: contentData, isLoading, error, refetch } = useContent(MOCK_WEBSITE_ID, {
    ...filters,
    page: currentPage,
    limit: 10,
  });

  const createContentMutation = useCreateContent(MOCK_WEBSITE_ID);
  const updateContentMutation = useUpdateContent(MOCK_WEBSITE_ID, selectedContent?.id || '');
  const deleteContentMutation = useDeleteContent(MOCK_WEBSITE_ID);
  const duplicateContentMutation = useDuplicateContent(MOCK_WEBSITE_ID);
  const publishContentMutation = usePublishContent(MOCK_WEBSITE_ID);
  const unpublishContentMutation = useUnpublishContent(MOCK_WEBSITE_ID);

  // Mock data for categories and tags
  const mockCategories = [
    { id: '1', name: 'Technology', slug: 'technology' },
    { id: '2', name: 'Design', slug: 'design' },
    { id: '3', name: 'Business', slug: 'business' },
  ];

  const mockTags = [
    { id: '1', name: 'React', slug: 'react' },
    { id: '2', name: 'JavaScript', slug: 'javascript' },
    { id: '3', name: 'TypeScript', slug: 'typescript' },
    { id: '4', name: 'CSS', slug: 'css' },
  ];

  const mockAuthors = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
  ];

  const handleCreateContent = async (data: any) => {
    try {
      await createContentMutation.mutateAsync(data);
      success('Content created successfully');
      setCurrentView('list');
    } catch (error: any) {
      showError(error.message || 'Failed to create content');
    }
  };

  const handleUpdateContent = async (data: any) => {
    try {
      await updateContentMutation.mutateAsync(data);
      success('Content updated successfully');
      setCurrentView('list');
      setSelectedContent(null);
    } catch (error: any) {
      showError(error.message || 'Failed to update content');
    }
  };

  const handleDeleteContent = async (contentId: string) => {
    await deleteContentMutation.mutateAsync(contentId);
  };

  const handleDuplicateContent = async (contentId: string) => {
    await duplicateContentMutation.mutateAsync(contentId);
  };

  const handlePublishContent = async (contentId: string) => {
    await publishContentMutation.mutateAsync(contentId);
  };

  const handleUnpublishContent = async (contentId: string) => {
    await unpublishContentMutation.mutateAsync(contentId);
  };

  const handleEditContent = (content: Content) => {
    setSelectedContent(content);
    setCurrentView('edit');
  };

  const handlePreviewContent = (content: Content) => {
    setSelectedContent(content);
    previewModal.open();
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    // Mock image upload - in real app this would upload to your storage service
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`https://via.placeholder.com/800x400?text=${encodeURIComponent(file.name)}`);
      }, 1000);
    });
  };

  if (currentView === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('list')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Content
          </Button>
        </div>
        
        <EnhancedContentForm
          websiteId={MOCK_WEBSITE_ID}
          onSubmit={handleCreateContent}
          onSaveDraft={handleCreateContent}
          onPreview={(data) => console.log('Preview:', data)}
          loading={createContentMutation.isPending}
          mode="create"
          categories={mockCategories}
          tags={mockTags}
          onImageUpload={handleImageUpload}
        />
      </div>
    );
  }

  if (currentView === 'edit' && selectedContent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentView('list');
              setSelectedContent(null);
            }}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Content
          </Button>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <EnhancedContentForm
              content={selectedContent}
              websiteId={MOCK_WEBSITE_ID}
              onSubmit={handleUpdateContent}
              onSaveDraft={handleUpdateContent}
              onPreview={(data) => console.log('Preview:', data)}
              loading={updateContentMutation.isPending}
              mode="edit"
              categories={mockCategories}
              tags={mockTags}
              onImageUpload={handleImageUpload}
            />
          </div>
          
          <div className="xl:col-span-1">
            <ContentPublishingWorkflow
              content={selectedContent}
              onPublish={async (options) => {
                await handlePublishContent(selectedContent.id);
              }}
              onSchedule={async (options) => {
                // Handle scheduling with options
                console.log('Schedule options:', options);
              }}
              onSubmitForReview={async (options) => {
                // Handle review submission
                console.log('Review options:', options);
              }}
              onPreview={() => handlePreviewContent(selectedContent)}
              loading={publishContentMutation.isPending || unpublishContentMutation.isPending}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content</h1>
          <p className="text-gray-600">Manage your articles, posts, and other content</p>
        </div>
        <Button onClick={() => setCurrentView('create')}>
          <Plus className="h-4 w-4 mr-2" />
          New Content
        </Button>
      </div>

      {/* Content List */}
      <ContentList
        content={contentData?.items || []}
        loading={isLoading}
        error={error}
        totalPages={contentData?.totalPages || 1}
        currentPage={currentPage}
        totalItems={contentData?.total || 0}
        onPageChange={setCurrentPage}
        onEdit={handleEditContent}
        onDelete={handleDeleteContent}
        onDuplicate={handleDuplicateContent}
        onPublish={handlePublishContent}
        onUnpublish={handleUnpublishContent}
        onPreview={handlePreviewContent}
        onFilterChange={setFilters}
        categories={mockCategories}
        authors={mockAuthors}
      />

      {/* Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={() => {
          previewModal.close();
          setSelectedContent(null);
        }}
        title={selectedContent?.title || 'Content Preview'}
        size="xl"
      >
        {selectedContent && (
          <div className="p-6">
            <div className="prose prose-sm max-w-none">
              <h1>{selectedContent.title}</h1>
              {selectedContent.excerpt && (
                <p className="lead text-gray-600">{selectedContent.excerpt}</p>
              )}
              <div dangerouslySetInnerHTML={{ __html: selectedContent.body }} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export { ContentPage };
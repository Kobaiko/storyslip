import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Eye, 
  Trash2, 
  Copy, 
  MoreHorizontal,
  Calendar,
  User,
  Tag,
  Folder,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Table, Pagination } from '../ui/Table';
import { Modal, ConfirmModal, useModal } from '../ui/Modal';
import { Select, Input } from '../ui/Form';
import { LoadingState } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { Content } from '../../hooks/useContent';
import { formatDate, formatRelativeTime, truncateText } from '../../lib/utils';

interface ContentListProps {
  content: Content[];
  loading?: boolean;
  error?: string | null;
  totalPages?: number;
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onEdit: (content: Content) => void;
  onDelete: (contentId: string) => Promise<void>;
  onDuplicate: (contentId: string) => Promise<void>;
  onPublish: (contentId: string) => Promise<void>;
  onUnpublish: (contentId: string) => Promise<void>;
  onPreview: (content: Content) => void;
  onFilterChange: (filters: ContentFilters) => void;
  categories?: Array<{ id: string; name: string }>;
  authors?: Array<{ id: string; name: string }>;
}

interface ContentFilters {
  search?: string;
  status?: string;
  category_id?: string;
  author_id?: string;
  sort?: string;
}

export function ContentList({
  content,
  loading = false,
  error = null,
  totalPages = 1,
  currentPage = 1,
  totalItems = 0,
  onPageChange,
  onEdit,
  onDelete,
  onDuplicate,
  onPublish,
  onUnpublish,
  onPreview,
  onFilterChange,
  categories = [],
  authors = [],
}: ContentListProps) {
  const [filters, setFilters] = useState<ContentFilters>({});
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [contentToDelete, setContentToDelete] = useState<Content | null>(null);
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const deleteModal = useModal();
  const bulkActionsModal = useModal();
  const { success, error: showError } = useToast();

  const handleFilterChange = (key: keyof ContentFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDelete = async () => {
    if (!contentToDelete) return;

    try {
      await onDelete(contentToDelete.id);
      success('Content deleted successfully');
      deleteModal.close();
      setContentToDelete(null);
    } catch (error: any) {
      showError(error.message || 'Failed to delete content');
    }
  };

  const handleDuplicate = async (content: Content) => {
    try {
      await onDuplicate(content.id);
      success('Content duplicated successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to duplicate content');
    }
  };

  const handlePublishToggle = async (content: Content) => {
    try {
      if (content.status === 'published') {
        await onUnpublish(content.id);
        success('Content unpublished successfully');
      } else {
        await onPublish(content.id);
        success('Content published successfully');
      }
    } catch (error: any) {
      showError(error.message || 'Failed to update content status');
    }
  };

  const handleBulkSelect = (contentId: string, selected: boolean) => {
    if (selected) {
      setBulkSelected([...bulkSelected, contentId]);
    } else {
      setBulkSelected(bulkSelected.filter(id => id !== contentId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setBulkSelected(content.map(c => c.id));
    } else {
      setBulkSelected([]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'review':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'scheduled': return 'warning';
      case 'review': return 'info';
      default: return 'secondary';
    }
  };

  const columns = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          checked={bulkSelected.length === content.length && content.length > 0}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300"
        />
      ),
      render: (_: any, item: Content) => (
        <input
          type="checkbox"
          checked={bulkSelected.includes(item.id)}
          onChange={(e) => handleBulkSelect(item.id, e.target.checked)}
          className="rounded border-gray-300"
        />
      ),
      width: '50px',
    },
    {
      key: 'title',
      title: 'Content',
      render: (value: string, item: Content) => (
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {value}
              </h3>
              {item.excerpt && (
                <p className="text-sm text-gray-500 mt-1">
                  {truncateText(item.excerpt, 100)}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span>{item.author?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3" />
                  <span>{item.view_count} views</span>
                </div>
                {item.categories && item.categories.length > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Folder className="h-3 w-3" />
                    <span>{item.categories[0].name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string, item: Content) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(value)}
          <Badge variant={getStatusBadgeVariant(value)}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Badge>
          {item.scheduled_at && value === 'scheduled' && (
            <div className="text-xs text-gray-500">
              {formatDate(item.scheduled_at)}
            </div>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'updated_at',
      title: 'Last Modified',
      render: (value: string) => (
        <div className="text-sm text-gray-600">
          {formatRelativeTime(value)}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'published_at',
      title: 'Published',
      render: (value: string | undefined) => (
        <div className="text-sm text-gray-600">
          {value ? formatDate(value) : 'Not published'}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, item: Content) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPreview(item)}
            title="Preview"
          >
            <Eye className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDuplicate(item)}
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePublishToggle(item)}
            title={item.status === 'published' ? 'Unpublish' : 'Publish'}
            className={item.status === 'published' ? 'text-yellow-600' : 'text-green-600'}
          >
            {item.status === 'published' ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setContentToDelete(item);
              deleteModal.open();
            }}
            className="text-red-600 hover:text-red-700"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search content..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="h-4 w-4" />}
          >
            Filters
          </Button>
          
          {bulkSelected.length > 0 && (
            <Button
              variant="outline"
              onClick={bulkActionsModal.open}
            >
              Bulk Actions ({bulkSelected.length})
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'review', label: 'Under Review' },
                  { value: 'published', label: 'Published' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'archived', label: 'Archived' },
                ]}
                placeholder="Filter by status"
              />
              
              <Select
                value={filters.category_id || ''}
                onChange={(e) => handleFilterChange('category_id', e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map(cat => ({ value: cat.id, label: cat.name })),
                ]}
                placeholder="Filter by category"
              />
              
              <Select
                value={filters.author_id || ''}
                onChange={(e) => handleFilterChange('author_id', e.target.value)}
                options={[
                  { value: '', label: 'All Authors' },
                  ...authors.map(author => ({ value: author.id, label: author.name })),
                ]}
                placeholder="Filter by author"
              />
              
              <Select
                value={filters.sort || ''}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                options={[
                  { value: '', label: 'Default Sort' },
                  { value: 'title_asc', label: 'Title A-Z' },
                  { value: 'title_desc', label: 'Title Z-A' },
                  { value: 'created_desc', label: 'Newest First' },
                  { value: 'created_asc', label: 'Oldest First' },
                  { value: 'updated_desc', label: 'Recently Modified' },
                  { value: 'views_desc', label: 'Most Viewed' },
                ]}
                placeholder="Sort by"
              />
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({});
                  onFilterChange({});
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Content ({totalItems})
            </CardTitle>
            
            {content.length > 0 && (
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalItems)} of {totalItems}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <LoadingState
            loading={loading}
            error={error}
            isEmpty={content.length === 0}
            emptyComponent={
              <div className="text-center py-8">
                <Edit className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No content found
                </h3>
                <p className="text-gray-500 mb-4">
                  {Object.keys(filters).some(key => filters[key as keyof ContentFilters])
                    ? "No content matches your current filters."
                    : "Get started by creating your first piece of content."
                  }
                </p>
              </div>
            }
          >
            <Table
              data={content}
              columns={columns}
              loading={loading}
            />
            
            {totalPages > 1 && onPageChange && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                  showInfo={true}
                  totalItems={totalItems}
                  itemsPerPage={10}
                />
              </div>
            )}
          </LoadingState>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          deleteModal.close();
          setContentToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Content"
        message={`Are you sure you want to delete "${contentToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Content"
        type="danger"
      />
    </div>
  );
}
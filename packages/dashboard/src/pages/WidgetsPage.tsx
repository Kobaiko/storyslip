import React, { useState } from 'react';
import { Plus, Search, Filter, Grid, List, MoreVertical, Eye, Copy, Edit, Trash2, Power, BarChart3 } from 'lucide-react';
import { useWidgets, useWidgetTemplates } from '../hooks/useWidgets';
import { useWebsites } from '../hooks/useWebsites';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { WidgetCreationModal } from '../components/widgets/WidgetCreationModal';
import { WidgetPreviewModal } from '../components/widgets/WidgetPreviewModal';
import { WidgetAnalyticsModal } from '../components/widgets/WidgetAnalyticsModal';
import { EmbedCodeModal } from '../components/widgets/EmbedCodeModal';

const WidgetsPage: React.FC = () => {
  const { websites, selectedWebsite } = useWebsites();
  const { widgets, isLoading, deleteWidget, duplicateWidget, toggleActive } = useWidgets(selectedWebsite?.id || '');
  const { templates } = useWidgetTemplates();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter widgets based on search and type
  const filteredWidgets = widgets.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         widget.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || widget.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDeleteWidget = async () => {
    if (selectedWidget) {
      await deleteWidget(selectedWidget.id);
      setShowDeleteConfirm(false);
      setSelectedWidget(null);
    }
  };

  const handleDuplicateWidget = async (widget: any) => {
    await duplicateWidget({
      widgetId: widget.id,
      name: `${widget.name} (Copy)`,
    });
  };

  const handleToggleActive = async (widget: any) => {
    await toggleActive(widget.id);
  };

  const getWidgetTypeIcon = (type: string) => {
    switch (type) {
      case 'blog_hub':
        return '🏠';
      case 'content_list':
        return '📝';
      case 'featured_posts':
        return '⭐';
      case 'category_grid':
        return '📂';
      case 'search_widget':
        return '🔍';
      default:
        return '🔧';
    }
  };

  const getWidgetTypeLabel = (type: string) => {
    switch (type) {
      case 'blog_hub':
        return 'Blog Hub';
      case 'content_list':
        return 'Content List';
      case 'featured_posts':
        return 'Featured Posts';
      case 'category_grid':
        return 'Category Grid';
      case 'search_widget':
        return 'Search Widget';
      default:
        return type;
    }
  };

  if (!selectedWebsite) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Website Selected</h2>
          <p className="text-gray-600">Please select a website to manage widgets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Widgets</h1>
          <p className="text-gray-600 mt-1">Create and manage blog widgets for {selectedWebsite.name}</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Widget
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="blog_hub">Blog Hub</option>
            <option value="content_list">Content List</option>
            <option value="featured_posts">Featured Posts</option>
            <option value="category_grid">Category Grid</option>
            <option value="search_widget">Search Widget</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Widgets Grid/List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : filteredWidgets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm || filterType !== 'all' ? 'No widgets found' : 'No widgets yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first widget to get started'
            }
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Widget
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }>
          {filteredWidgets.map((widget) => (
            <div
              key={widget.id}
              className={`bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow ${
                viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
              }`}
            >
              {viewMode === 'grid' ? (
                <>
                  {/* Widget Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{getWidgetTypeIcon(widget.type)}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{widget.name}</h3>
                        <p className="text-sm text-gray-500">{getWidgetTypeLabel(widget.type)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={widget.is_active ? 'success' : 'secondary'}>
                        {widget.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="relative">
                        <button
                          onClick={() => setSelectedWidget(widget)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Widget Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Layout:</span>
                      <span className="font-medium capitalize">{widget.layout}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Theme:</span>
                      <span className="font-medium capitalize">{widget.theme}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-medium">
                        {new Date(widget.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedWidget(widget);
                        setShowPreviewModal(true);
                      }}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedWidget(widget);
                        setShowEmbedModal(true);
                      }}
                      className="flex-1"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Embed
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* List View */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl">{getWidgetTypeIcon(widget.type)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{widget.name}</h3>
                      <p className="text-sm text-gray-500">
                        {getWidgetTypeLabel(widget.type)} • {widget.layout} • {widget.theme}
                      </p>
                    </div>
                    <Badge variant={widget.is_active ? 'success' : 'secondary'}>
                      {widget.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <div className="text-sm text-gray-500">
                      {new Date(widget.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedWidget(widget);
                        setShowAnalyticsModal(true);
                      }}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedWidget(widget);
                        setShowPreviewModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateWidget(widget)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(widget)}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedWidget(widget);
                        setShowDeleteConfirm(true);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <WidgetCreationModal
          websiteId={selectedWebsite.id}
          templates={templates}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showPreviewModal && selectedWidget && (
        <WidgetPreviewModal
          widget={selectedWidget}
          onClose={() => {
            setShowPreviewModal(false);
            setSelectedWidget(null);
          }}
        />
      )}

      {showAnalyticsModal && selectedWidget && (
        <WidgetAnalyticsModal
          widget={selectedWidget}
          onClose={() => {
            setShowAnalyticsModal(false);
            setSelectedWidget(null);
          }}
        />
      )}

      {showEmbedModal && selectedWidget && (
        <EmbedCodeModal
          widget={selectedWidget}
          onClose={() => {
            setShowEmbedModal(false);
            setSelectedWidget(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedWidget && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedWidget(null);
          }}
          title="Delete Widget"
        >
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{selectedWidget.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedWidget(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteWidget}
              >
                Delete Widget
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export { WidgetsPage };
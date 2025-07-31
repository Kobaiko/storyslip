import React, { useState } from 'react';
import { 
  CheckSquare, 
  Trash2, 
  Send, 
  Archive, 
  Copy, 
  Tag, 
  Folder,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select, Input } from '../ui/Form';
import { Modal, ConfirmModal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { Content } from '../../hooks/useContent';

interface ContentBulkActionsProps {
  selectedContent: Content[];
  onClearSelection: () => void;
  onBulkDelete: (contentIds: string[]) => Promise<void>;
  onBulkPublish: (contentIds: string[]) => Promise<void>;
  onBulkUnpublish: (contentIds: string[]) => Promise<void>;
  onBulkArchive: (contentIds: string[]) => Promise<void>;
  onBulkDuplicate: (contentIds: string[]) => Promise<void>;
  onBulkSchedule: (contentIds: string[], scheduledAt: string) => Promise<void>;
  onBulkUpdateCategories: (contentIds: string[], categoryIds: string[]) => Promise<void>;
  onBulkUpdateTags: (contentIds: string[], tagIds: string[]) => Promise<void>;
  categories?: Array<{ id: string; name: string }>;
  tags?: Array<{ id: string; name: string }>;
}

export function ContentBulkActions({
  selectedContent,
  onClearSelection,
  onBulkDelete,
  onBulkPublish,
  onBulkUnpublish,
  onBulkArchive,
  onBulkDuplicate,
  onBulkSchedule,
  onBulkUpdateCategories,
  onBulkUpdateTags,
  categories = [],
  tags = [],
}: ContentBulkActionsProps) {
  const [selectedAction, setSelectedAction] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const deleteModal = useModal();
  const scheduleModal = useModal();
  const categoriesModal = useModal();
  const tagsModal = useModal();
  const { success, error: showError } = useToast();

  const selectedIds = selectedContent.map(c => c.id);
  const selectedCount = selectedContent.length;

  const handleAction = async (action: string) => {
    try {
      switch (action) {
        case 'publish':
          await onBulkPublish(selectedIds);
          success(`${selectedCount} items published successfully`);
          break;
        case 'unpublish':
          await onBulkUnpublish(selectedIds);
          success(`${selectedCount} items unpublished successfully`);
          break;
        case 'archive':
          await onBulkArchive(selectedIds);
          success(`${selectedCount} items archived successfully`);
          break;
        case 'duplicate':
          await onBulkDuplicate(selectedIds);
          success(`${selectedCount} items duplicated successfully`);
          break;
        case 'delete':
          deleteModal.open();
          return;
        case 'schedule':
          scheduleModal.open();
          return;
        case 'categories':
          categoriesModal.open();
          return;
        case 'tags':
          tagsModal.open();
          return;
      }
      
      onClearSelection();
      setSelectedAction('');
    } catch (error: any) {
      showError(error.message || 'Failed to perform bulk action');
    }
  };

  const handleDelete = async () => {
    try {
      await onBulkDelete(selectedIds);
      success(`${selectedCount} items deleted successfully`);
      onClearSelection();
      deleteModal.close();
    } catch (error: any) {
      showError(error.message || 'Failed to delete items');
    }
  };

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) return;

    try {
      const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
      await onBulkSchedule(selectedIds, scheduledAt);
      success(`${selectedCount} items scheduled successfully`);
      onClearSelection();
      scheduleModal.close();
      setScheduledDate('');
      setScheduledTime('');
    } catch (error: any) {
      showError(error.message || 'Failed to schedule items');
    }
  };

  const handleUpdateCategories = async () => {
    try {
      await onBulkUpdateCategories(selectedIds, selectedCategories);
      success(`Categories updated for ${selectedCount} items`);
      onClearSelection();
      categoriesModal.close();
      setSelectedCategories([]);
    } catch (error: any) {
      showError(error.message || 'Failed to update categories');
    }
  };

  const handleUpdateTags = async () => {
    try {
      await onBulkUpdateTags(selectedIds, selectedTags);
      success(`Tags updated for ${selectedCount} items`);
      onClearSelection();
      tagsModal.close();
      setSelectedTags([]);
    } catch (error: any) {
      showError(error.message || 'Failed to update tags');
    }
  };

  const actionOptions = [
    { value: '', label: 'Choose an action...' },
    { value: 'publish', label: 'Publish' },
    { value: 'unpublish', label: 'Unpublish' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'archive', label: 'Archive' },
    { value: 'duplicate', label: 'Duplicate' },
    { value: 'categories', label: 'Update Categories' },
    { value: 'tags', label: 'Update Tags' },
    { value: 'delete', label: 'Delete' },
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'publish': return <Send className="h-4 w-4" />;
      case 'unpublish': return <Archive className="h-4 w-4" />;
      case 'schedule': return <Calendar className="h-4 w-4" />;
      case 'archive': return <Archive className="h-4 w-4" />;
      case 'duplicate': return <Copy className="h-4 w-4" />;
      case 'categories': return <Folder className="h-4 w-4" />;
      case 'tags': return <Tag className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      default: return null;
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  options={actionOptions}
                  className="min-w-48"
                />
                
                <Button
                  onClick={() => handleAction(selectedAction)}
                  disabled={!selectedAction}
                  leftIcon={getActionIcon(selectedAction)}
                >
                  Apply
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
            >
              Clear Selection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleDelete}
        title="Delete Content"
        message={`Are you sure you want to delete ${selectedCount} item${selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmText="Delete Items"
        type="danger"
      />

      {/* Schedule Modal */}
      <Modal
        isOpen={scheduleModal.isOpen}
        onClose={() => {
          scheduleModal.close();
          setScheduledDate('');
          setScheduledTime('');
        }}
        title="Schedule Content"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <p className="text-gray-600 mb-4">
              Schedule {selectedCount} item{selectedCount !== 1 ? 's' : ''} to be published at a specific time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            
            <Input
              label="Time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                scheduleModal.close();
                setScheduledDate('');
                setScheduledTime('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!scheduledDate || !scheduledTime}
              leftIcon={<Calendar className="h-4 w-4" />}
            >
              Schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Categories Modal */}
      <Modal
        isOpen={categoriesModal.isOpen}
        onClose={() => {
          categoriesModal.close();
          setSelectedCategories([]);
        }}
        title="Update Categories"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <p className="text-gray-600 mb-4">
              Update categories for {selectedCount} item{selectedCount !== 1 ? 's' : ''}.
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categories.map((category) => (
              <label key={category.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCategories([...selectedCategories, category.id]);
                    } else {
                      setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{category.name}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                categoriesModal.close();
                setSelectedCategories([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCategories}
              leftIcon={<Folder className="h-4 w-4" />}
            >
              Update Categories
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tags Modal */}
      <Modal
        isOpen={tagsModal.isOpen}
        onClose={() => {
          tagsModal.close();
          setSelectedTags([]);
        }}
        title="Update Tags"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <p className="text-gray-600 mb-4">
              Update tags for {selectedCount} item{selectedCount !== 1 ? 's' : ''}.
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTags([...selectedTags, tag.id]);
                    } else {
                      setSelectedTags(selectedTags.filter(id => id !== tag.id));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{tag.name}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                tagsModal.close();
                setSelectedTags([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTags}
              leftIcon={<Tag className="h-4 w-4" />}
            >
              Update Tags
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
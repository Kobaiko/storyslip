import React, { useState, useEffect } from 'react';
import { Building, Users, Settings, Trash2, Save, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Form } from '../ui/Form';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Toast } from '../ui';
import { Modal } from '../ui/Modal';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  settings: Record<string, any>;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OrganizationSettingsProps {
  organizationId: string;
  onOrganizationUpdate?: (organization: Organization) => void;
  onOrganizationDelete?: () => void;
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({
  organizationId,
  onOrganizationUpdate,
  onOrganizationDelete,
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website_url: '',
    logo_url: '',
  });

  useEffect(() => {
    if (organizationId) {
      loadOrganization();
    }
  }, [organizationId]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/organizations/${organizationId}`);
      
      if (response.data.success) {
        const org = response.data.data;
        setOrganization(org);
        setFormData({
          name: org.name || '',
          description: org.description || '',
          website_url: org.website_url || '',
          logo_url: org.logo_url || '',
        });
      } else {
        setToast({ message: 'Failed to load organization', type: 'error' });
      }
    } catch (error) {
      console.error('Load organization error:', error);
      setToast({ message: 'Failed to load organization', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await api.put(`/organizations/${organizationId}`, formData);
      
      if (response.data.success) {
        const updatedOrg = response.data.data;
        setOrganization(updatedOrg);
        setToast({ message: 'Organization updated successfully', type: 'success' });
        onOrganizationUpdate?.(updatedOrg);
      } else {
        setToast({ message: 'Failed to update organization', type: 'error' });
      }
    } catch (error) {
      console.error('Update organization error:', error);
      setToast({ message: 'Failed to update organization', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToast({ message: 'Please select an image file', type: 'error' });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Image must be smaller than 5MB', type: 'error' });
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);

      // This would typically upload to a file storage service
      // For now, we'll simulate the upload and use a placeholder URL
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const logoUrl = `https://via.placeholder.com/200x200?text=${encodeURIComponent(organization?.name || 'Logo')}`;
      
      setFormData(prev => ({
        ...prev,
        logo_url: logoUrl,
      }));
      
      setToast({ message: 'Logo uploaded successfully', type: 'success' });
    } catch (error) {
      console.error('Logo upload error:', error);
      setToast({ message: 'Failed to upload logo', type: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setToast({ message: 'Please type DELETE to confirm', type: 'error' });
      return;
    }

    try {
      setDeleting(true);
      const response = await api.delete(`/organizations/${organizationId}`, {
        data: { confirm: 'DELETE' }
      });
      
      if (response.data.success) {
        setToast({ message: 'Organization deleted successfully', type: 'success' });
        setShowDeleteModal(false);
        onOrganizationDelete?.();
      } else {
        setToast({ message: 'Failed to delete organization', type: 'error' });
      }
    } catch (error: any) {
      console.error('Delete organization error:', error);
      const message = error.response?.data?.message || 'Failed to delete organization';
      setToast({ message, type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const canEdit = organization?.role === 'owner' || organization?.role === 'admin';
  const canDelete = organization?.role === 'owner';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Organization not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Building className="h-6 w-6 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-900">Organization Settings</h2>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
              {organization.role}
            </span>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Logo Section */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                  {formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt="Organization logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
              <div>
                <label className="block">
                  <span className="sr-only">Choose logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={!canEdit || uploadingLogo}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter organization name"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Describe your organization..."
                maxLength={1000}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </p>
            </div>

            <div>
              <label htmlFor="website_url" className="block text-sm font-medium text-gray-700 mb-1">
                Website URL
              </label>
              <input
                type="url"
                id="website_url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="https://example.com"
              />
            </div>

            {/* Organization Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Organization Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Slug:</span>
                  <span className="ml-2 font-mono text-gray-900">{organization.slug}</span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(organization.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {canEdit && (
              <div className="flex justify-between">
                <div>
                  {canDelete && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDeleteModal(true)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Organization
                    </Button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Form>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Organization"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <Trash2 className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">This action cannot be undone</h4>
                <p className="text-sm text-red-700 mt-1">
                  Deleting this organization will permanently remove all associated data, including websites and content.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="delete-confirmation" className="block text-sm font-medium text-gray-700 mb-2">
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="DELETE"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting || deleteConfirmation !== 'DELETE'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Organization'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationSettings;
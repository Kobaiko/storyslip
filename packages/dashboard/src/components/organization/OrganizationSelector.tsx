import React, { useState, useEffect } from 'react';
import { ChevronDown, Building, Check, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Toast } from '../ui';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  is_current: boolean;
}

interface OrganizationSelectorProps {
  onOrganizationChange?: (organization: Organization) => void;
  showCreateButton?: boolean;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  onOrganizationChange,
  showCreateButton = true,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/organizations');
      
      if (response.data.success) {
        const orgs = response.data.data;
        setOrganizations(orgs);
        
        // Find current organization
        const current = orgs.find((org: Organization) => org.is_current);
        if (current) {
          setCurrentOrganization(current);
        }
      } else {
        setToast({ message: 'Failed to load organizations', type: 'error' });
      }
    } catch (error) {
      console.error('Load organizations error:', error);
      setToast({ message: 'Failed to load organizations', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (organization: Organization) => {
    if (organization.id === currentOrganization?.id) {
      setIsOpen(false);
      return;
    }

    try {
      setSwitching(true);
      const response = await api.post(`/organizations/${organization.id}/switch`);
      
      if (response.data.success) {
        setCurrentOrganization(organization);
        setOrganizations(prev => 
          prev.map(org => ({
            ...org,
            is_current: org.id === organization.id,
          }))
        );
        setToast({ message: `Switched to ${organization.name}`, type: 'success' });
        onOrganizationChange?.(organization);
      } else {
        setToast({ message: 'Failed to switch organization', type: 'error' });
      }
    } catch (error) {
      console.error('Switch organization error:', error);
      setToast({ message: 'Failed to switch organization', type: 'error' });
    } finally {
      setSwitching(false);
      setIsOpen(false);
    }
  };

  const handleCreateOrganization = () => {
    // This would typically open a modal or navigate to create page
    // For now, we'll just close the dropdown
    setIsOpen(false);
    // You can emit an event or call a callback here
    console.log('Create organization clicked');
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-100 rounded-lg">
        <Building className="h-4 w-4 text-red-600" />
        <span className="text-sm text-red-600">No organization selected</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center justify-between w-full px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-2">
          <Building className="h-4 w-4 text-gray-500" />
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900 truncate max-w-48">
              {currentOrganization.name}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {currentOrganization.role}
            </div>
          </div>
        </div>
        {switching ? (
          <LoadingSpinner size="sm" />
        ) : (
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="py-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => switchOrganization(org)}
                className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {org.name}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {org.role}
                    </div>
                  </div>
                </div>
                {org.is_current && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))}
            
            {showCreateButton && (
              <>
                <div className="border-t border-gray-200 my-1" />
                <button
                  onClick={handleCreateOrganization}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-blue-600"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Create Organization</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationSelector;
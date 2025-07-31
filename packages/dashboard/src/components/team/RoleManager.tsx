import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  Edit, 
  Check, 
  X, 
  Info,
  AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Form';
import { Modal, ConfirmModal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  is_system: boolean;
  user_count: number;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface RoleManagerProps {
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  onUpdateUserRole: (userId: string, roleId: string) => Promise<void>;
  onCreateRole?: (roleData: Partial<Role>) => Promise<void>;
  onUpdateRole?: (roleId: string, roleData: Partial<Role>) => Promise<void>;
  onDeleteRole?: (roleId: string) => Promise<void>;
}

const DEFAULT_ROLES = {
  admin: {
    name: 'Admin',
    description: 'Full access to all features and settings',
    permissions: ['*'],
    color: 'red',
  },
  editor: {
    name: 'Editor',
    description: 'Can create, edit, and publish content',
    permissions: [
      'content.create',
      'content.edit',
      'content.publish',
      'content.delete',
      'categories.manage',
      'tags.manage',
      'media.upload',
    ],
    color: 'yellow',
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to content and analytics',
    permissions: [
      'content.view',
      'analytics.view',
    ],
    color: 'blue',
  },
};

export function RoleManager({
  roles,
  permissions,
  loading,
  onUpdateUserRole,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
}: RoleManagerProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const detailModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();
  const { success, error: showError } = useToast();

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin': return 'error';
      case 'editor': return 'warning';
      case 'viewer': return 'info';
      default: return 'default';
    }
  };

  const getPermissionsByCategory = (rolePermissions: string[]) => {
    const categories: Record<string, Permission[]> = {};
    
    permissions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      
      if (rolePermissions.includes('*') || rolePermissions.includes(permission.id)) {
        categories[permission.category].push(permission);
      }
    });
    
    return categories;
  };

  const handleViewRole = (role: Role) => {
    setSelectedRole(role);
    detailModal.open();
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    editModal.open();
  };

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    deleteModal.open();
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete || !onDeleteRole) return;

    try {
      await onDeleteRole(roleToDelete.id);
      success('Role deleted successfully');
      deleteModal.close();
      setRoleToDelete(null);
    } catch (error: any) {
      showError(error.message || 'Failed to delete role');
    }
  };

  const canEditRole = (role: Role) => {
    return !role.is_system && onUpdateRole;
  };

  const canDeleteRole = (role: Role) => {
    return !role.is_system && role.user_count === 0 && onDeleteRole;
  };

  return (
    <>
      <div className="space-y-6">
        {/* Role Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant={getRoleBadgeVariant(role.name)}>
                    <Shield className="h-3 w-3 mr-1" />
                    {role.name}
                  </Badge>
                  {role.is_system && (
                    <Badge variant="secondary" size="sm">
                      System
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-medium text-gray-900 mb-2">{role.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{role.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    {role.user_count} {role.user_count === 1 ? 'user' : 'users'}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewRole(role)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    
                    {canEditRole(role) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Role Permissions Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th key={role.id} className="text-center py-3 px-4 font-medium text-gray-900">
                        <Badge variant={getRoleBadgeVariant(role.name)} size="sm">
                          {role.name}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((permission) => (
                    <tr key={permission.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{permission.name}</div>
                          <div className="text-sm text-gray-500">{permission.description}</div>
                        </div>
                      </td>
                      {roles.map((role) => (
                        <td key={role.id} className="text-center py-3 px-4">
                          {role.permissions.includes('*') || role.permissions.includes(permission.id) ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Detail Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        title={selectedRole ? `${selectedRole.name} Role` : 'Role Details'}
        size="lg"
      >
        {selectedRole && (
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedRole.name}</h3>
                <p className="text-gray-600">{selectedRole.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={getRoleBadgeVariant(selectedRole.name)}>
                  <Shield className="h-3 w-3 mr-1" />
                  {selectedRole.name}
                </Badge>
                {selectedRole.is_system && (
                  <Badge variant="secondary">System Role</Badge>
                )}
              </div>
            </div>

            {/* User Count */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  {selectedRole.user_count} {selectedRole.user_count === 1 ? 'user has' : 'users have'} this role
                </span>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Permissions</h4>
              {selectedRole.permissions.includes('*') ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">
                      Full Administrative Access
                    </span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    This role has unrestricted access to all features and settings.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(getPermissionsByCategory(selectedRole.permissions)).map(([category, perms]) => (
                    <div key={category}>
                      <h5 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                        {category.replace('_', ' ')}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {perms.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-gray-900">{permission.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={detailModal.close}>
                Close
              </Button>
              
              {canEditRole(selectedRole) && (
                <Button
                  onClick={() => {
                    detailModal.close();
                    handleEditRole(selectedRole);
                  }}
                  leftIcon={<Edit className="h-4 w-4" />}
                >
                  Edit Role
                </Button>
              )}
              
              {canDeleteRole(selectedRole) && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    detailModal.close();
                    handleDeleteRole(selectedRole);
                  }}
                >
                  Delete Role
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={confirmDeleteRole}
        title="Delete Role"
        message={`Are you sure you want to delete the "${roleToDelete?.name}" role? This action cannot be undone.`}
        confirmText="Delete Role"
        type="danger"
      />
    </>
  );
}
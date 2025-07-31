import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Shield, 
  UserCheck, 
  UserX,
  Clock,
  Trash2,
  Edit,
  Users,
  Activity,
  Settings
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, User } from '../hooks/useUsers';
import { InvitationManager } from '../components/team/InvitationManager';
import { RoleManager } from '../components/team/RoleManager';
import { UserActivityLog } from '../components/team/UserActivityLog';

// Mock website ID - in real app this would come from context or route params
const MOCK_WEBSITE_ID = '123e4567-e89b-12d3-a456-426614174001';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; name: string; role: string }) => void;
  isLoading: boolean;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading 
}) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'viewer',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({ email: '', name: '', role: 'viewer' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Team Member" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john@example.com"
          required
          fullWidth
        />
        
        <Input
          label="Full Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
          required
          fullWidth
        />
        
        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={[
            { value: 'admin', label: 'Admin - Full access' },
            { value: 'editor', label: 'Editor - Can manage content' },
            { value: 'viewer', label: 'Viewer - Read-only access' },
          ]}
          fullWidth
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; role: string; status: string }) => void;
  user: User | null;
  isLoading: boolean;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  user,
  isLoading 
}) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    role: user?.role || 'viewer',
    status: user?.status || 'active',
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        role: user.role,
        status: user.status,
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Team Member" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <Input
          label="Full Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
          required
          fullWidth
        />
        
        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={[
            { value: 'admin', label: 'Admin - Full access' },
            { value: 'editor', label: 'Editor - Can manage content' },
            { value: 'viewer', label: 'Viewer - Read-only access' },
          ]}
          fullWidth
        />
        
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          fullWidth
        />
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            Update Member
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const TeamPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'roles' | 'activity'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // API hooks
  const { data: users, isLoading, error } = useUsers(MOCK_WEBSITE_ID, {
    search: searchQuery,
    role: roleFilter,
    status: statusFilter,
  });

  const createUserMutation = useCreateUser(MOCK_WEBSITE_ID);
  const updateUserMutation = useUpdateUser(MOCK_WEBSITE_ID);
  const deleteUserMutation = useDeleteUser(MOCK_WEBSITE_ID);

  const handleInviteUser = async (userData: { email: string; name: string; role: string }) => {
    try {
      await createUserMutation.mutateAsync({
        email: userData.email,
        name: userData.name,
        role: userData.role as 'admin' | 'editor' | 'viewer',
        send_invitation: true,
      });
      setIsInviteModalOpen(false);
    } catch (error) {
      console.error('Failed to invite user:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (userData: { name: string; role: string; status: string }) => {
    if (!selectedUser) return;
    
    try {
      await updateUserMutation.mutateAsync({
        userId: selectedUser.id,
        userData: {
          name: userData.name,
          role: userData.role as 'admin' | 'editor' | 'viewer',
          status: userData.status as 'active' | 'inactive',
        },
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to remove this team member?')) {
      try {
        await deleteUserMutation.mutateAsync(userId);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'editor': return 'warning';
      case 'viewer': return 'info';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <UserCheck className="h-4 w-4" />;
      case 'inactive': return <UserX className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Failed to load team members. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock data for other components (in real app, these would come from API)
  const mockInvitations = [
    {
      id: '1',
      email: 'john@example.com',
      role: 'editor' as const,
      status: 'pending' as const,
      invited_by: { id: '1', name: 'Admin User', email: 'admin@example.com' },
      invited_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invitation_url: 'https://app.storyslip.com/invite/abc123',
    },
  ];

  const mockRoles = [
    {
      id: '1',
      name: 'Admin',
      description: 'Full access to all features',
      permissions: ['*'],
      color: 'red',
      is_system: true,
      user_count: 1,
    },
    {
      id: '2',
      name: 'Editor',
      description: 'Can create and edit content',
      permissions: ['content.create', 'content.edit', 'content.publish'],
      color: 'yellow',
      is_system: true,
      user_count: 3,
    },
    {
      id: '3',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: ['content.view'],
      color: 'blue',
      is_system: true,
      user_count: 2,
    },
  ];

  const mockPermissions = [
    { id: 'content.create', name: 'Create Content', description: 'Create new content', category: 'content' },
    { id: 'content.edit', name: 'Edit Content', description: 'Edit existing content', category: 'content' },
    { id: 'content.publish', name: 'Publish Content', description: 'Publish content', category: 'content' },
    { id: 'content.view', name: 'View Content', description: 'View content', category: 'content' },
  ];

  const mockActivities = [
    {
      id: '1',
      user: { id: '1', name: 'John Doe', email: 'john@example.com' },
      action: 'user.login',
      resource_type: 'user',
      created_at: new Date().toISOString(),
      severity: 'low' as const,
    },
  ];

  const tabs = [
    { id: 'members', label: 'Team Members', icon: Users },
    { id: 'invitations', label: 'Invitations', icon: Mail },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'activity', label: 'Activity Log', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600">Manage your team members, roles, and permissions</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search team members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Roles' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'editor', label: 'Editor' },
                    { value: 'viewer', label: 'Viewer' },
                  ]}
                  placeholder="Filter by role"
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'pending', label: 'Pending' },
                  ]}
                  placeholder="Filter by status"
                />
              </div>
            </CardContent>
          </Card>

          {/* Team Members Table */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({users?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" text="Loading team members..." />
                </div>
              ) : users && users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.name}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <span className="text-white text-sm font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            <Shield className="h-3 w-3 mr-1" />
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(user.status)}>
                            {getStatusIcon(user.status)}
                            <span className="ml-1">
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.last_login_at ? (
                            <span className="text-sm text-gray-600">
                              {new Date(user.last_login_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">No team members found</div>
                  <Button onClick={() => setIsInviteModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Your First Member
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'invitations' && (
        <InvitationManager
          websiteId={MOCK_WEBSITE_ID}
          invitations={mockInvitations}
          loading={false}
          error={null}
          onResendInvitation={async (id) => console.log('Resend', id)}
          onCancelInvitation={async (id) => console.log('Cancel', id)}
          onRefresh={() => console.log('Refresh invitations')}
        />
      )}

      {activeTab === 'roles' && (
        <RoleManager
          roles={mockRoles}
          permissions={mockPermissions}
          loading={false}
          onUpdateUserRole={async (userId, roleId) => console.log('Update role', userId, roleId)}
        />
      )}

      {activeTab === 'activity' && (
        <UserActivityLog
          websiteId={MOCK_WEBSITE_ID}
          activities={mockActivities}
          loading={false}
          error={null}
          onRefresh={() => console.log('Refresh activity')}
        />
      )}

      {/* Modals */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInviteUser}
        isLoading={createUserMutation.isPending}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleUpdateUser}
        user={selectedUser}
        isLoading={updateUserMutation.isPending}
      />
    </div>
  );
};

export { TeamPage };
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Mail, Crown, Shield, User, MoreVertical, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Toast } from '../ui';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  joined_at: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

interface OrganizationMembersProps {
  organizationId: string;
  currentUserRole: string;
}

export const OrganizationMembers: React.FC<OrganizationMembersProps> = ({
  organizationId,
  currentUserRole,
}) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadMembers();
    }
  }, [organizationId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/organizations/${organizationId}/members`);
      
      if (response.data.success) {
        setMembers(response.data.data);
      } else {
        setToast({ message: 'Failed to load members', type: 'error' });
      }
    } catch (error) {
      console.error('Load members error:', error);
      setToast({ message: 'Failed to load members', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      setToast({ message: 'Email is required', type: 'error' });
      return;
    }

    try {
      setInviting(true);
      const response = await api.post(`/organizations/${organizationId}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      
      if (response.data.success) {
        setToast({ message: 'Member invited successfully', type: 'success' });
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('member');
        loadMembers(); // Reload to show new member
      } else {
        setToast({ message: 'Failed to invite member', type: 'error' });
      }
    } catch (error: any) {
      console.error('Invite member error:', error);
      const message = error.response?.data?.message || 'Failed to invite member';
      setToast({ message, type: 'error' });
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member') => {
    try {
      setUpdatingRole(memberId);
      const response = await api.put(`/organizations/${organizationId}/members/${memberId}/role`, {
        role: newRole,
      });
      
      if (response.data.success) {
        setMembers(prev => 
          prev.map(member => 
            member.id === memberId 
              ? { ...member, role: newRole }
              : member
          )
        );
        setToast({ message: 'Member role updated successfully', type: 'success' });
      } else {
        setToast({ message: 'Failed to update member role', type: 'error' });
      }
    } catch (error: any) {
      console.error('Update member role error:', error);
      const message = error.response?.data?.message || 'Failed to update member role';
      setToast({ message, type: 'error' });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    try {
      setRemoving(true);
      const response = await api.delete(`/organizations/${organizationId}/members/${selectedMember.id}`);
      
      if (response.data.success) {
        setMembers(prev => prev.filter(member => member.id !== selectedMember.id));
        setToast({ message: 'Member removed successfully', type: 'success' });
        setShowRemoveModal(false);
        setSelectedMember(null);
      } else {
        setToast({ message: 'Failed to remove member', type: 'error' });
      }
    } catch (error: any) {
      console.error('Remove member error:', error);
      const message = error.response?.data?.message || 'Failed to remove member';
      setToast({ message, type: 'error' });
    } finally {
      setRemoving(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canRemoveMember = (member: OrganizationMember) => {
    return canManageMembers && member.role !== 'owner';
  };
  const canUpdateRole = (member: OrganizationMember) => {
    return canManageMembers && member.role !== 'owner';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-gray-500" />
              <h2 className="text-xl font-semibold text-gray-900">Organization Members</h2>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                {members.length}
              </span>
            </div>
            {canManageMembers && (
              <Button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center space-x-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>Invite Member</span>
              </Button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {members.map((member) => (
            <div key={member.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {member.user.avatar_url ? (
                    <img
                      src={member.user.avatar_url}
                      alt={`${member.user.first_name} ${member.user.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900">
                      {member.user.first_name && member.user.last_name
                        ? `${member.user.first_name} ${member.user.last_name}`
                        : member.user.email.split('@')[0]
                      }
                    </h3>
                    {getRoleIcon(member.role)}
                  </div>
                  <p className="text-sm text-gray-500">{member.user.email}</p>
                  <p className="text-xs text-gray-400">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getRoleBadgeColor(member.role)}`}>
                    {member.role}
                  </span>
                  
                  {canUpdateRole(member) && (
                    <Select
                      value={member.role}
                      onChange={(value) => handleUpdateRole(member.id, value as 'admin' | 'member')}
                      disabled={updatingRole === member.id}
                      className="text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </Select>
                  )}
                </div>

                {canRemoveMember(member) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(member);
                      setShowRemoveModal(true);
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}

                {updatingRole === member.id && (
                  <LoadingSpinner size="sm" />
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div className="px-6 py-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Member"
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="invite-email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <Select
              value={inviteRole}
              onChange={(value) => setInviteRole(value as 'admin' | 'member')}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Admins can manage organization settings and members. Members can access organization resources.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowInviteModal(false)}
              disabled={inviting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={inviting}
            >
              {inviting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Inviting...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Modal */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Remove Member"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <Trash2 className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Remove member from organization</h4>
                <p className="text-sm text-red-700 mt-1">
                  {selectedMember && (
                    <>
                      Are you sure you want to remove <strong>{selectedMember.user.email}</strong> from this organization?
                      They will lose access to all organization resources.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRemoveModal(false)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRemoveMember}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {removing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationMembers;
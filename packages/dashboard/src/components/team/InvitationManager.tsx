import React, { useState } from 'react';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2,
  Send,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Table } from '../ui/Table';
import { Modal, useModal } from '../ui/Modal';
import { LoadingState } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { formatDate, formatRelativeTime, copyToClipboard } from '../../lib/utils';

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: {
    id: string;
    name: string;
    email: string;
  };
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  invitation_url?: string;
}

interface InvitationManagerProps {
  websiteId: string;
  invitations: Invitation[];
  loading: boolean;
  error: string | null;
  onResendInvitation: (invitationId: string) => Promise<void>;
  onCancelInvitation: (invitationId: string) => Promise<void>;
  onRefresh: () => void;
}

export function InvitationManager({
  websiteId,
  invitations,
  loading,
  error,
  onResendInvitation,
  onCancelInvitation,
  onRefresh,
}: InvitationManagerProps) {
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const detailModal = useModal();
  const { success, error: showError } = useToast();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'expired': return 'error';
      case 'cancelled': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'accepted': return <CheckCircle className="h-3 w-3" />;
      case 'expired': return <XCircle className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'editor': return 'warning';
      case 'viewer': return 'info';
      default: return 'default';
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    setActionLoading(invitation.id);
    try {
      await onResendInvitation(invitation.id);
      success('Invitation resent successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to resend invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    if (!window.confirm(`Are you sure you want to cancel the invitation for ${invitation.email}?`)) {
      return;
    }

    setActionLoading(invitation.id);
    try {
      await onCancelInvitation(invitation.id);
      success('Invitation cancelled successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to cancel invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyInvitationLink = async (invitation: Invitation) => {
    if (!invitation.invitation_url) {
      showError('Invitation link not available');
      return;
    }

    try {
      await copyToClipboard(invitation.invitation_url);
      success('Invitation link copied to clipboard');
    } catch (error) {
      showError('Failed to copy invitation link');
    }
  };

  const handleViewDetails = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    detailModal.open();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const canResend = (invitation: Invitation) => {
    return invitation.status === 'pending' || invitation.status === 'expired';
  };

  const canCancel = (invitation: Invitation) => {
    return invitation.status === 'pending';
  };

  const columns = [
    {
      key: 'email',
      title: 'Email',
      render: (value: string, invitation: Invitation) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">
            Invited by {invitation.invited_by.name}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      render: (value: string) => (
        <Badge variant={getRoleBadgeVariant(value)}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string, invitation: Invitation) => (
        <div className="space-y-1">
          <Badge variant={getStatusBadgeVariant(value)}>
            {getStatusIcon(value)}
            <span className="ml-1">
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </span>
          </Badge>
          {value === 'pending' && isExpired(invitation.expires_at) && (
            <div className="text-xs text-red-600">Expired</div>
          )}
        </div>
      ),
    },
    {
      key: 'invited_at',
      title: 'Invited',
      render: (value: string) => (
        <div className="text-sm text-gray-600">
          {formatRelativeTime(value)}
        </div>
      ),
    },
    {
      key: 'expires_at',
      title: 'Expires',
      render: (value: string, invitation: Invitation) => (
        <div className="text-sm text-gray-600">
          {invitation.status === 'accepted' ? (
            <span className="text-green-600">Accepted</span>
          ) : isExpired(value) ? (
            <span className="text-red-600">Expired</span>
          ) : (
            formatRelativeTime(value)
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, invitation: Invitation) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(invitation)}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          {canResend(invitation) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResendInvitation(invitation)}
              loading={actionLoading === invitation.id}
              disabled={!!actionLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
          
          {invitation.invitation_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyInvitationLink(invitation)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          
          {canCancel(invitation) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCancelInvitation(invitation)}
              loading={actionLoading === invitation.id}
              disabled={!!actionLoading}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              loading={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <LoadingState
            loading={loading}
            error={error}
            isEmpty={invitations.length === 0}
            emptyComponent={
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No pending invitations
                </h3>
                <p className="text-gray-500">
                  All team invitations have been accepted or expired.
                </p>
              </div>
            }
          >
            <Table
              data={invitations}
              columns={columns}
              loading={loading}
            />
          </LoadingState>
        </CardContent>
      </Card>

      {/* Invitation Detail Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={detailModal.close}
        title="Invitation Details"
        size="md"
      >
        {selectedInvitation && (
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedInvitation.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <div className="mt-1">
                  <Badge variant={getRoleBadgeVariant(selectedInvitation.role)}>
                    {selectedInvitation.role.charAt(0).toUpperCase() + selectedInvitation.role.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <div className="mt-1">
                <Badge variant={getStatusBadgeVariant(selectedInvitation.status)}>
                  {getStatusIcon(selectedInvitation.status)}
                  <span className="ml-1">
                    {selectedInvitation.status.charAt(0).toUpperCase() + selectedInvitation.status.slice(1)}
                  </span>
                </Badge>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Invited At</label>
                <p className="text-sm text-gray-900">
                  {formatDate(selectedInvitation.invited_at)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Expires At</label>
                <p className={`text-sm ${isExpired(selectedInvitation.expires_at) ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(selectedInvitation.expires_at)}
                  {isExpired(selectedInvitation.expires_at) && ' (Expired)'}
                </p>
              </div>
            </div>

            {selectedInvitation.accepted_at && (
              <div>
                <label className="text-sm font-medium text-gray-700">Accepted At</label>
                <p className="text-sm text-green-600">
                  {formatDate(selectedInvitation.accepted_at)}
                </p>
              </div>
            )}

            {/* Invited By */}
            <div>
              <label className="text-sm font-medium text-gray-700">Invited By</label>
              <div className="mt-1">
                <p className="text-sm text-gray-900">{selectedInvitation.invited_by.name}</p>
                <p className="text-sm text-gray-500">{selectedInvitation.invited_by.email}</p>
              </div>
            </div>

            {/* Invitation Link */}
            {selectedInvitation.invitation_url && (
              <div>
                <label className="text-sm font-medium text-gray-700">Invitation Link</label>
                <div className="mt-1 flex items-center space-x-2">
                  <input
                    type="text"
                    value={selectedInvitation.invitation_url}
                    readOnly
                    className="flex-1 text-sm bg-gray-50 border border-gray-300 rounded px-3 py-2"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyInvitationLink(selectedInvitation)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={detailModal.close}
              >
                Close
              </Button>
              
              {canResend(selectedInvitation) && (
                <Button
                  onClick={() => {
                    handleResendInvitation(selectedInvitation);
                    detailModal.close();
                  }}
                  loading={actionLoading === selectedInvitation.id}
                  leftIcon={<Send className="h-4 w-4" />}
                >
                  Resend Invitation
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
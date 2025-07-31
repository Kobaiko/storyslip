import React, { useState } from 'react';
import { AlertTriangle, Trash2, Download, UserX, Archive } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';
import { ConfirmModal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

export function DangerZone() {
  const [confirmText, setConfirmText] = useState('');
  const deleteAccountModal = useModal();
  const deleteDataModal = useModal();
  const deactivateModal = useModal();
  const { success, error: showError } = useToast();

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      showError('Please type DELETE to confirm');
      return;
    }
    
    try {
      // Mock account deletion
      await new Promise(resolve => setTimeout(resolve, 2000));
      success('Account deletion initiated. You will receive a confirmation email.');
      deleteAccountModal.close();
      setConfirmText('');
    } catch (error) {
      showError('Failed to delete account');
    }
  };

  const handleDeleteAllData = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      showError('Please type DELETE ALL DATA to confirm');
      return;
    }
    
    try {
      // Mock data deletion
      await new Promise(resolve => setTimeout(resolve, 2000));
      success('All data deletion initiated. This process may take a few minutes.');
      deleteDataModal.close();
      setConfirmText('');
    } catch (error) {
      showError('Failed to delete data');
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      // Mock account deactivation
      await new Promise(resolve => setTimeout(resolve, 1000));
      success('Account deactivated successfully');
      deactivateModal.close();
    } catch (error) {
      showError('Failed to deactivate account');
    }
  };

  const handleExportBeforeDelete = async () => {
    try {
      // Mock export
      await new Promise(resolve => setTimeout(resolve, 2000));
      success('Export started. You will receive an email when ready.');
    } catch (error) {
      showError('Failed to start export');
    }
  };

  return (
    <div className="space-y-6">
      {/* Warning Header */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-medium text-red-800">Danger Zone</h3>
            <p className="text-sm text-red-700">
              These actions are irreversible. Please proceed with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Export Data Before Deletion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-orange-600">
            <Download className="h-5 w-5 mr-2" />
            Export Data Before Deletion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            We recommend exporting your data before performing any destructive actions. 
            This ensures you have a backup of all your content and settings.
          </p>
          
          <Button
            onClick={handleExportBeforeDelete}
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            Export All Data
          </Button>
        </CardContent>
      </Card>

      {/* Deactivate Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-yellow-600">
            <UserX className="h-5 w-5 mr-2" />
            Deactivate Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Temporarily deactivate your account. You can reactivate it later by logging in. 
            Your data will be preserved but your account will be inaccessible.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="font-medium text-yellow-800 mb-1">What happens when you deactivate:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Your profile becomes invisible to other users</li>
              <li>• You won't receive any notifications</li>
              <li>• Your content remains published but attributed to "Deactivated User"</li>
              <li>• You can reactivate anytime by logging in</li>
            </ul>
          </div>
          
          <Button
            onClick={deactivateModal.open}
            variant="outline"
            leftIcon={<UserX className="h-4 w-4" />}
            className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
          >
            Deactivate Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete All Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <Archive className="h-5 w-5 mr-2" />
            Delete All Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Permanently delete all your content, settings, and associated data. 
            Your account will remain active but all data will be lost.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="font-medium text-red-800 mb-1">This will permanently delete:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• All your content and drafts</li>
              <li>• All analytics and performance data</li>
              <li>• All custom settings and configurations</li>
              <li>• All uploaded media files</li>
              <li>• All team associations and permissions</li>
            </ul>
          </div>
          
          <Button
            onClick={deleteDataModal.open}
            variant="outline"
            leftIcon={<Archive className="h-4 w-4" />}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Delete All Data
          </Button>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <Trash2 className="h-5 w-5 mr-2" />
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="font-medium text-red-800 mb-1">This will permanently:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Delete your account and profile</li>
              <li>• Remove all your content and data</li>
              <li>• Cancel any active subscriptions</li>
              <li>• Remove you from all teams</li>
              <li>• Delete all API keys and integrations</li>
            </ul>
          </div>
          
          <Button
            onClick={deleteAccountModal.open}
            variant="outline"
            leftIcon={<Trash2 className="h-4 w-4" />}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Deactivate Account Modal */}
      <ConfirmModal
        isOpen={deactivateModal.isOpen}
        onClose={deactivateModal.close}
        onConfirm={handleDeactivateAccount}
        title="Deactivate Account"
        message="Are you sure you want to deactivate your account? You can reactivate it later by logging in."
        confirmText="Deactivate"
        confirmVariant="warning"
      />

      {/* Delete All Data Modal */}
      <ConfirmModal
        isOpen={deleteDataModal.isOpen}
        onClose={() => {
          deleteDataModal.close();
          setConfirmText('');
        }}
        onConfirm={handleDeleteAllData}
        title="Delete All Data"
        confirmText="Delete All Data"
        confirmVariant="danger"
        requiresTextConfirmation
        confirmationText="DELETE ALL DATA"
        message={
          <div className="space-y-3">
            <p>This will permanently delete all your data. This action cannot be undone.</p>
            <p>Type <strong>DELETE ALL DATA</strong> to confirm:</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE ALL DATA"
              className="font-mono"
            />
          </div>
        }
      />

      {/* Delete Account Modal */}
      <ConfirmModal
        isOpen={deleteAccountModal.isOpen}
        onClose={() => {
          deleteAccountModal.close();
          setConfirmText('');
        }}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        confirmText="Delete Account"
        confirmVariant="danger"
        requiresTextConfirmation
        confirmationText="DELETE"
        message={
          <div className="space-y-3">
            <p>This will permanently delete your account and all associated data. This action cannot be undone.</p>
            <p>Type <strong>DELETE</strong> to confirm:</p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="font-mono"
            />
          </div>
        }
      />
    </div>
  );
}
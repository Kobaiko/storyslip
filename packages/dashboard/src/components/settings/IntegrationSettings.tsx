import React, { useState } from 'react';
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { Modal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  created_at: string;
  last_used: string;
}

export function IntegrationSettings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Production API',
      key: 'sk_live_1234567890abcdef',
      permissions: ['read', 'write'],
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_used: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const createKeyModal = useModal();
  const { success, error: showError } = useToast();

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      success('API key copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      showError('Failed to copy API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys({ ...showKeys, [keyId]: !showKeys[keyId] });
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      success('API key deleted successfully');
    } catch (error) {
      showError('Failed to delete API key');
    }
  };

  const createApiKey = async (name: string, permissions: string[]) => {
    try {
      const newKey: ApiKey = {
        id: Date.now().toString(),
        name,
        key: `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        permissions,
        created_at: new Date().toISOString(),
        last_used: 'Never',
      };
      setApiKeys([...apiKeys, newKey]);
      success('API key created successfully');
      createKeyModal.close();
    } catch (error) {
      showError('Failed to create API key');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2" />
              API Keys
            </CardTitle>
            <Button
              onClick={createKeyModal.open}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create API Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No API keys created yet</p>
                <p className="text-sm text-gray-500">Create your first API key to get started</p>
              </div>
            ) : (
              apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{apiKey.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created {new Date(apiKey.created_at).toLocaleDateString()} • 
                        Last used {apiKey.last_used === 'Never' ? 'Never' : new Date(apiKey.last_used).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {apiKey.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" size="sm">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-50 rounded-md p-2 font-mono text-sm">
                      {showKeys[apiKey.id] ? apiKey.key : '••••••••••••••••••••••••••••••••'}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                    >
                      {copiedKey === apiKey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiKey(apiKey.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      <Modal
        isOpen={createKeyModal.isOpen}
        onClose={createKeyModal.close}
        title="Create API Key"
        size="md"
      >
        <CreateApiKeyForm onSubmit={createApiKey} onCancel={createKeyModal.close} />
      </Modal>
    </div>
  );
}

function CreateApiKeyForm({ onSubmit, onCancel }: { 
  onSubmit: (name: string, permissions: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['read']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name, permissions);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <Input
        label="API Key Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Production API, Development Key"
        required
      />
      
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          Permissions
        </label>
        <div className="space-y-2">
          {['read', 'write', 'delete'].map((permission) => (
            <label key={permission} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={permissions.includes(permission)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPermissions([...permissions, permission]);
                  } else {
                    setPermissions(permissions.filter(p => p !== permission));
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 capitalize">{permission}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          Create API Key
        </Button>
      </div>
    </form>
  );
}
import React, { useState } from 'react';
import { 
  AlertTriangle, 
  User, 
  Clock, 
  ArrowRight, 
  Check, 
  X,
  GitMerge,
  Download,
  Upload
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { formatDate } from '../../lib/utils';

interface ConflictData {
  localData: {
    title: string;
    body: string;
    excerpt?: string;
    lastModified: string;
    modifiedBy: string;
  };
  serverData: {
    title: string;
    body: string;
    excerpt?: string;
    lastModified: string;
    modifiedBy: string;
  };
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: ConflictData;
  onResolve: (resolution: 'local' | 'server' | 'merge', mergedData?: any) => void;
  loading?: boolean;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  conflictData,
  onResolve,
  loading = false,
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'server' | 'merge'>('local');
  const [mergedData, setMergedData] = useState({
    title: conflictData.localData.title,
    body: conflictData.localData.body,
    excerpt: conflictData.localData.excerpt || '',
  });

  const handleResolve = () => {
    if (selectedResolution === 'merge') {
      onResolve(selectedResolution, mergedData);
    } else {
      onResolve(selectedResolution);
    }
  };

  const getConflictFields = () => {
    const conflicts = [];
    
    if (conflictData.localData.title !== conflictData.serverData.title) {
      conflicts.push('title');
    }
    
    if (conflictData.localData.body !== conflictData.serverData.body) {
      conflicts.push('body');
    }
    
    if (conflictData.localData.excerpt !== conflictData.serverData.excerpt) {
      conflicts.push('excerpt');
    }
    
    return conflicts;
  };

  const conflictFields = getConflictFields();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Content Conflict"
      size="xl"
    >
      <div className="p-6 space-y-6">
        {/* Conflict Warning */}
        <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Content Conflict Detected</h3>
            <p className="text-sm text-yellow-700 mt-1">
              This content has been modified by someone else while you were editing. 
              Please choose how to resolve the conflict.
            </p>
          </div>
        </div>

        {/* Conflict Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center text-blue-700">
                <User className="h-4 w-4 mr-2" />
                Your Changes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">
                    Modified {formatDate(conflictData.localData.lastModified)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">
                    By {conflictData.localData.modifiedBy}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center text-red-700">
                <Download className="h-4 w-4 mr-2" />
                Server Changes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">
                    Modified {formatDate(conflictData.serverData.lastModified)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">
                    By {conflictData.serverData.modifiedBy}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conflicted Fields */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Conflicted Fields</h3>
          <div className="space-y-3">
            {conflictFields.map((field) => (
              <div key={field} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="warning" size="sm">
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="font-medium text-blue-700">Your Version:</div>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-gray-700">
                      {conflictData.localData[field as keyof typeof conflictData.localData] || 'Empty'}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium text-red-700">Server Version:</div>
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-gray-700">
                      {conflictData.serverData[field as keyof typeof conflictData.serverData] || 'Empty'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Options */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Resolution Options</h3>
          <div className="space-y-3">
            {/* Keep Local Changes */}
            <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="resolution"
                value="local"
                checked={selectedResolution === 'local'}
                onChange={(e) => setSelectedResolution(e.target.value as 'local')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900">Keep Your Changes</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Overwrite the server version with your local changes. The other person's changes will be lost.
                </p>
              </div>
            </label>

            {/* Accept Server Changes */}
            <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="resolution"
                value="server"
                checked={selectedResolution === 'server'}
                onChange={(e) => setSelectedResolution(e.target.value as 'server')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-gray-900">Accept Server Changes</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Discard your changes and use the server version. Your local changes will be lost.
                </p>
              </div>
            </label>

            {/* Manual Merge */}
            <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="resolution"
                value="merge"
                checked={selectedResolution === 'merge'}
                onChange={(e) => setSelectedResolution(e.target.value as 'merge')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <GitMerge className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-gray-900">Manual Merge</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Manually combine both versions by editing the content below.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Manual Merge Editor */}
        {selectedResolution === 'merge' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Edit Merged Content</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={mergedData.title}
                  onChange={(e) => setMergedData({ ...mergedData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excerpt
                </label>
                <textarea
                  value={mergedData.excerpt}
                  onChange={(e) => setMergedData({ ...mergedData, excerpt: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Body
                </label>
                <textarea
                  value={mergedData.body}
                  onChange={(e) => setMergedData({ ...mergedData, body: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleResolve} loading={loading}>
            <Check className="h-4 w-4 mr-2" />
            Resolve Conflict
          </Button>
        </div>
      </div>
    </Modal>
  );
}
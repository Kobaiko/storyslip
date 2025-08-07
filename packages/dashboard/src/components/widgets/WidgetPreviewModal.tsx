import React, { useState, useEffect } from 'react';
import { X, Eye, Monitor, Tablet, Smartphone, Maximize2, ExternalLink } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useWidget } from '../../hooks/useWidgets';

interface WidgetPreviewModalProps {
  widget: any;
  onClose: () => void;
}

export const WidgetPreviewModal: React.FC<WidgetPreviewModalProps> = ({
  widget,
  onClose,
}) => {
  const { generatePreview, isGeneratingPreview } = useWidget(widget.id);
  const [previewData, setPreviewData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      setIsLoading(true);
      const preview = await generatePreview();
      setPreviewData(preview);
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getViewportStyles = () => {
    switch (viewMode) {
      case 'desktop':
        return { width: '100%', height: '600px' };
      case 'tablet':
        return { width: '768px', height: '600px', margin: '0 auto' };
      case 'mobile':
        return { width: '375px', height: '600px', margin: '0 auto' };
      default:
        return { width: '100%', height: '600px' };
    }
  };

  const generatePreviewHTML = () => {
    if (!previewData) return '';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Widget Preview</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: system-ui, sans-serif;
            background-color: #f9fafb;
          }
          ${previewData.css}
        </style>
      </head>
      <body>
        ${previewData.html}
        <script>
          ${previewData.js}
        </script>
      </body>
      </html>
    `;
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Preview: ${widget.name}`}
      size="full"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {widget.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="capitalize">{widget.type.replace('_', ' ')}</span>
              <span>•</span>
              <span className="capitalize">{widget.layout}</span>
              <span>•</span>
              <span className="capitalize">{widget.theme}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('desktop')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'desktop'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Desktop view"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('tablet')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'tablet'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Tablet view"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'mobile'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Mobile view"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadPreview}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Refresh
            </Button>

            {widget.preview_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(widget.preview_url, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </Button>
            )}
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 p-4 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LoadingSpinner />
                <p className="text-gray-600 mt-4">Generating preview...</p>
              </div>
            </div>
          ) : previewData ? (
            <div className="h-full">
              <div
                className="bg-white rounded-lg shadow-sm border overflow-hidden"
                style={getViewportStyles()}
              >
                <iframe
                  srcDoc={generatePreviewHTML()}
                  className="w-full h-full border-0"
                  title="Widget Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
              
              {/* Preview Info */}
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">Preview Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium capitalize">
                      {widget.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Layout:</span>
                    <span className="ml-2 font-medium capitalize">{widget.layout}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Theme:</span>
                    <span className="ml-2 font-medium capitalize">{widget.theme}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 font-medium ${
                      widget.is_active ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {widget.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Preview Not Available
                </h3>
                <p className="text-gray-600 mb-4">
                  Unable to generate preview for this widget.
                </p>
                <Button onClick={loadPreview} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-white">
          <div className="text-sm text-gray-500">
            Last updated: {new Date(widget.updated_at).toLocaleString()}
          </div>
          <Button onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
};
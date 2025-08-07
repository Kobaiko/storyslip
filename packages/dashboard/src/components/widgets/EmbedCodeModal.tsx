import React, { useState, useEffect } from 'react';
import { Copy, Check, Code, ExternalLink, Settings, Eye } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';
import { useWidget } from '../../hooks/useWidgets';

interface EmbedCodeModalProps {
  widget: any;
  onClose: () => void;
}

export const EmbedCodeModal: React.FC<EmbedCodeModalProps> = ({
  widget,
  onClose,
}) => {
  const { getEmbedCode, isGettingEmbedCode } = useWidget(widget.id);
  const [embedData, setEmbedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('embed');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadEmbedCode();
  }, []);

  const loadEmbedCode = async () => {
    try {
      const data = await getEmbedCode();
      setEmbedData(data);
    } catch (error) {
      console.error('Error loading embed code:', error);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(type);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getWordPressCode = () => {
    if (!embedData?.embed_code) return '';
    
    return `<?php
// Add this to your WordPress theme's functions.php file
function add_storyslip_widget() {
    echo '${embedData.embed_code.replace(/'/g, "\\'")}';
}

// Or use this shortcode in posts/pages: [storyslip_widget]
function storyslip_widget_shortcode() {
    return '${embedData.embed_code.replace(/'/g, "\\'")}';
}
add_shortcode('storyslip_widget', 'storyslip_widget_shortcode');
?>`;
  };

  const getReactCode = () => {
    if (!embedData?.embed_code) return '';
    
    return `import React, { useEffect } from 'react';

const StorySlipWidget = () => {
  useEffect(() => {
    // Load StorySlip widget script
    const script = document.createElement('script');
    script.src = 'https://widgets.storyslip.com/widget.js';
    script.async = true;
    script.onload = () => {
      if (window.StorySlipWidget) {
        window.StorySlipWidget.init({
          widgetId: '${widget.id}',
          containerId: 'storyslip-widget-${widget.id}',
          type: '${widget.type}',
          layout: '${widget.layout}',
          theme: '${widget.theme}'
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src="https://widgets.storyslip.com/widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return <div id="storyslip-widget-${widget.id}"></div>;
};

export default StorySlipWidget;`;
  };

  const getVueCode = () => {
    if (!embedData?.embed_code) return '';
    
    return `<template>
  <div id="storyslip-widget-${widget.id}"></div>
</template>

<script>
export default {
  name: 'StorySlipWidget',
  mounted() {
    this.loadWidget();
  },
  methods: {
    loadWidget() {
      const script = document.createElement('script');
      script.src = 'https://widgets.storyslip.com/widget.js';
      script.async = true;
      script.onload = () => {
        if (window.StorySlipWidget) {
          window.StorySlipWidget.init({
            widgetId: '${widget.id}',
            containerId: 'storyslip-widget-${widget.id}',
            type: '${widget.type}',
            layout: '${widget.layout}',
            theme: '${widget.theme}'
          });
        }
      };
      document.head.appendChild(script);
    }
  },
  beforeUnmount() {
    // Cleanup
    const existingScript = document.querySelector('script[src="https://widgets.storyslip.com/widget.js"]');
    if (existingScript) {
      existingScript.remove();
    }
  }
}
</script>`;
  };

  const tabs = [
    { id: 'embed', label: 'HTML Embed', icon: Code },
    { id: 'wordpress', label: 'WordPress', icon: Settings },
    { id: 'react', label: 'React', icon: Code },
    { id: 'vue', label: 'Vue.js', icon: Code },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Embed Widget"
      size="lg"
    >
      <div className="p-6">
        {/* Widget Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{widget.name}</h3>
            <Badge variant={widget.is_active ? 'success' : 'secondary'}>
              {widget.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="capitalize">{widget.type.replace('_', ' ')}</span>
            <span>•</span>
            <span className="capitalize">{widget.layout}</span>
            <span>•</span>
            <span className="capitalize">{widget.theme}</span>
          </div>
          {widget.preview_url && (
            <div className="mt-2">
              <a
                href={widget.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Eye className="w-3 h-3" />
                Preview Widget
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="mt-6">
          {activeTab === 'embed' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">HTML Embed Code</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(embedData?.embed_code || '', 'html')}
                  className="flex items-center gap-2"
                >
                  {copiedCode === 'html' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  <code>{embedData?.embed_code || 'Loading...'}</code>
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Copy and paste this code into your HTML where you want the widget to appear.
                The widget will automatically load and display your content.
              </p>
            </div>
          )}

          {activeTab === 'wordpress' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">WordPress Integration</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getWordPressCode(), 'wordpress')}
                  className="flex items-center gap-2"
                >
                  {copiedCode === 'wordpress' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  <code>{getWordPressCode()}</code>
                </pre>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p><strong>Option 1:</strong> Add the function to your theme's functions.php file and call it in your templates.</p>
                <p><strong>Option 2:</strong> Use the shortcode <code className="bg-gray-100 px-1 rounded">[storyslip_widget]</code> in any post or page.</p>
              </div>
            </div>
          )}

          {activeTab === 'react' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">React Component</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getReactCode(), 'react')}
                  className="flex items-center gap-2"
                >
                  {copiedCode === 'react' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  <code>{getReactCode()}</code>
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Import and use this React component in your application. The widget will automatically
                initialize when the component mounts.
              </p>
            </div>
          )}

          {activeTab === 'vue' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Vue.js Component</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getVueCode(), 'vue')}
                  className="flex items-center gap-2"
                >
                  {copiedCode === 'vue' ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
                  <code>{getVueCode()}</code>
                </pre>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Use this Vue.js component in your application. The widget will load when the component
                is mounted and clean up when unmounted.
              </p>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">Integration Tips</h5>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• The widget is responsive and will adapt to its container width</li>
            <li>• Make sure the widget is active before embedding it on your site</li>
            <li>• You can customize the widget appearance in the widget settings</li>
            <li>• The widget will automatically update when you make changes</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="text-sm text-gray-500">
            Widget ID: <code className="bg-gray-100 px-1 rounded">{widget.id}</code>
          </div>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
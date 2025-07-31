import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Globe, 
  Settings, 
  Code, 
  Eye, 
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Copy
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Form, FormField, FormActions, Textarea } from '../ui/Form';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { copyToClipboard, isValidUrl } from '../../lib/utils';
import { Website } from '../../hooks/useWebsites';

// Validation schema
const websiteSchema = z.object({
  name: z.string().min(2, 'Website name must be at least 2 characters'),
  domain: z.string().url('Please enter a valid URL').refine((url) => {
    try {
      const domain = new URL(url);
      return domain.protocol === 'http:' || domain.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Please enter a valid HTTP or HTTPS URL'),
  description: z.string().optional(),
});

type WebsiteFormData = z.infer<typeof websiteSchema>;

interface WebsiteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WebsiteFormData) => Promise<void>;
  website?: Website | null;
  loading?: boolean;
  mode: 'create' | 'edit';
}

export function WebsiteForm({
  isOpen,
  onClose,
  onSubmit,
  website,
  loading = false,
  mode,
}: WebsiteFormProps) {
  const [step, setStep] = useState<'details' | 'preview'>('details');
  const { success, error: showError } = useToast();

  const form = useForm<WebsiteFormData>({
    resolver: zodResolver(websiteSchema),
    defaultValues: {
      name: website?.name || '',
      domain: website?.domain || '',
      description: '',
    },
  });

  React.useEffect(() => {
    if (website && mode === 'edit') {
      form.reset({
        name: website.name,
        domain: website.domain,
        description: '',
      });
    } else if (mode === 'create') {
      form.reset({
        name: '',
        domain: '',
        description: '',
      });
    }
  }, [website, mode, form]);

  const handleSubmit = async (data: WebsiteFormData) => {
    try {
      await onSubmit(data);
      form.reset();
      setStep('details');
      onClose();
    } catch (error: any) {
      showError(error.message || `Failed to ${mode} website`);
    }
  };

  const handleClose = () => {
    form.reset();
    setStep('details');
    onClose();
  };

  const watchedDomain = form.watch('domain');
  const watchedName = form.watch('name');

  const generateEmbedCode = (domain: string, websiteId?: string) => {
    const id = websiteId || 'YOUR_WEBSITE_ID';
    return `<script src="https://cdn.storyslip.com/widget.js"></script>
<div id="storyslip-widget" data-website-id="${id}"></div>
<script>
  StorySlip.init({
    websiteId: '${id}',
    domain: '${domain}',
    theme: 'auto'
  });
</script>`;
  };

  const handleCopyEmbedCode = async () => {
    const embedCode = generateEmbedCode(watchedDomain, website?.id);
    try {
      await copyToClipboard(embedCode);
      success('Embed code copied to clipboard');
    } catch (error) {
      showError('Failed to copy embed code');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'create' ? 'Add New Website' : 'Edit Website'}
      size="lg"
    >
      <div className="p-6">
        {/* Step Navigation */}
        <div className="flex items-center mb-6">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'details' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
            }`}>
              <Settings className="h-4 w-4" />
            </div>
            <span className={`ml-2 text-sm font-medium ${
              step === 'details' ? 'text-gray-900' : 'text-gray-500'
            }`}>
              Website Details
            </span>
          </div>
          
          <div className="flex-1 mx-4">
            <div className="h-px bg-gray-300" />
          </div>
          
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <Eye className="h-4 w-4" />
            </div>
            <span className={`ml-2 text-sm font-medium ${
              step === 'preview' ? 'text-gray-900' : 'text-gray-500'
            }`}>
              Preview & Code
            </span>
          </div>
        </div>

        {step === 'details' && (
          <Form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-6">
              <FormField>
                <Input
                  label="Website Name"
                  placeholder="My Awesome Blog"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                  leftIcon={<Globe className="h-4 w-4" />}
                />
              </FormField>

              <FormField>
                <Input
                  label="Website URL"
                  placeholder="https://example.com"
                  {...form.register('domain')}
                  error={form.formState.errors.domain?.message}
                  leftIcon={<ExternalLink className="h-4 w-4" />}
                  helperText="Enter the full URL where you'll embed the StorySlip widget"
                />
              </FormField>

              <FormField>
                <Textarea
                  label="Description (Optional)"
                  placeholder="Brief description of your website..."
                  {...form.register('description')}
                  error={form.formState.errors.description?.message}
                  rows={3}
                />
              </FormField>

              {/* Domain Validation Preview */}
              {watchedDomain && isValidUrl(watchedDomain) && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Domain validation passed
                        </p>
                        <p className="text-sm text-gray-500">
                          {new URL(watchedDomain).hostname}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <FormActions>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                
                {mode === 'create' && (
                  <Button
                    type="button"
                    onClick={() => {
                      if (form.formState.isValid) {
                        setStep('preview');
                      } else {
                        form.trigger();
                      }
                    }}
                    disabled={!form.formState.isValid}
                  >
                    Next: Preview
                  </Button>
                )}
                
                {mode === 'edit' && (
                  <Button
                    type="submit"
                    loading={loading}
                  >
                    Update Website
                  </Button>
                )}
              </FormActions>
            </div>
          </Form>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            {/* Website Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Website Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900">{watchedName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Domain</label>
                    <p className="text-sm text-gray-900">{watchedDomain}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Badge variant="warning">Pending Integration</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Embed Code Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="h-5 w-5 mr-2" />
                  Embed Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-900 rounded-lg p-4 relative">
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      <code>{generateEmbedCode(watchedDomain)}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyEmbedCode}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800">Next Steps</h4>
                        <ul className="text-sm text-blue-700 mt-1 space-y-1">
                          <li>• Copy the embed code above</li>
                          <li>• Paste it into your website's HTML</li>
                          <li>• Test the integration using our testing tool</li>
                          <li>• Configure widget settings and styling</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('details')}
              >
                Back
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                loading={loading}
              >
                Create Website
              </Button>
            </FormActions>
          </div>
        )}
      </div>
    </Modal>
  );
}
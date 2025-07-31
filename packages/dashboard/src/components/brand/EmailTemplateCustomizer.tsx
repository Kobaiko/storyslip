import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Eye, 
  Send, 
  Palette, 
  Code, 
  User,
  Settings
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Form';
import { Modal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface EmailTemplateCustomizerProps {
  config: any;
  onChange: () => void;
  onSave: (config: any) => void;
}

interface EmailTemplateConfig {
  header_color: string;
  footer_color: string;
  button_color: string;
  text_color: string;
  background_color: string;
  custom_header_html: string;
  custom_footer_html: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string;
}

const emailTemplates = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    subject: 'Welcome to {company_name}!',
    description: 'Sent to new users when they sign up',
  },
  {
    id: 'invitation',
    name: 'Team Invitation',
    subject: 'You\'ve been invited to join {company_name}',
    description: 'Sent when inviting team members',
  },
  {
    id: 'password_reset',
    name: 'Password Reset',
    subject: 'Reset your password',
    description: 'Sent when users request password reset',
  },
  {
    id: 'content_published',
    name: 'Content Published',
    subject: 'Your content has been published',
    description: 'Sent when content is published',
  },
  {
    id: 'weekly_digest',
    name: 'Weekly Digest',
    subject: 'Your weekly content digest',
    description: 'Weekly summary of content performance',
  },
];

export function EmailTemplateCustomizer({ 
  config, 
  onChange, 
  onSave 
}: EmailTemplateCustomizerProps) {
  const [emailConfig, setEmailConfig] = useState<EmailTemplateConfig>({
    header_color: '#3B82F6',
    footer_color: '#F9FAFB',
    button_color: '#3B82F6',
    text_color: '#111827',
    background_color: '#FFFFFF',
    custom_header_html: '',
    custom_footer_html: '',
    sender_name: 'Your Company',
    sender_email: 'noreply@yourcompany.com',
    reply_to_email: 'support@yourcompany.com',
    ...config?.email_templates,
  });

  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [previewData, setPreviewData] = useState({
    user_name: 'John Doe',
    company_name: 'Your Company',
    reset_link: 'https://example.com/reset',
    invitation_link: 'https://example.com/invite',
  });

  const previewModal = useModal();
  const testEmailModal = useModal();
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (config?.email_templates) {
      setEmailConfig({ ...emailConfig, ...config.email_templates });
    }
  }, [config]);

  const handleConfigChange = (field: keyof EmailTemplateConfig, value: string) => {
    const newConfig = { ...emailConfig, [field]: value };
    setEmailConfig(newConfig);
    onChange();
  };

  const handleSave = () => {
    onSave({ ...config, email_templates: emailConfig });
  };

  const sendTestEmail = async (templateId: string, testEmail: string) => {
    try {
      // Mock sending test email
      await new Promise(resolve => setTimeout(resolve, 1000));
      success(`Test email sent to ${testEmail}`);
      testEmailModal.close();
    } catch (error) {
      showError('Failed to send test email');
    }
  };

  const generateEmailPreview = (templateId: string) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (!template) return '';

    const baseStyles = `
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: ${emailConfig.text_color};
          background-color: ${emailConfig.background_color};
          margin: 0;
          padding: 20px;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .email-header {
          background-color: ${emailConfig.header_color};
          color: white;
          padding: 30px;
          text-align: center;
        }
        .email-body {
          padding: 30px;
        }
        .email-footer {
          background-color: ${emailConfig.footer_color};
          padding: 20px;
          text-align: center;
          font-size: 14px;
          color: #6B7280;
        }
        .button {
          display: inline-block;
          background-color: ${emailConfig.button_color};
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
        }
        .button:hover {
          opacity: 0.9;
        }
      </style>
    `;

    let content = '';
    switch (templateId) {
      case 'welcome':
        content = `
          <div class="email-header">
            ${emailConfig.custom_header_html || `<h1>Welcome to ${previewData.company_name}!</h1>`}
          </div>
          <div class="email-body">
            <h2>Hi ${previewData.user_name},</h2>
            <p>Welcome to ${previewData.company_name}! We're excited to have you on board.</p>
            <p>Here are some things you can do to get started:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Explore our features</li>
              <li>Connect with your team</li>
            </ul>
            <a href="#" class="button">Get Started</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The ${previewData.company_name} Team</p>
          </div>
        `;
        break;
      case 'invitation':
        content = `
          <div class="email-header">
            ${emailConfig.custom_header_html || `<h1>You're Invited!</h1>`}
          </div>
          <div class="email-body">
            <h2>Hi there,</h2>
            <p>You've been invited to join ${previewData.company_name} by ${previewData.user_name}.</p>
            <p>Click the button below to accept the invitation and create your account:</p>
            <a href="${previewData.invitation_link}" class="button">Accept Invitation</a>
            <p>This invitation will expire in 7 days.</p>
            <p>Best regards,<br>The ${previewData.company_name} Team</p>
          </div>
        `;
        break;
      case 'password_reset':
        content = `
          <div class="email-header">
            ${emailConfig.custom_header_html || `<h1>Reset Your Password</h1>`}
          </div>
          <div class="email-body">
            <h2>Hi ${previewData.user_name},</h2>
            <p>We received a request to reset your password for your ${previewData.company_name} account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${previewData.reset_link}" class="button">Reset Password</a>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>Best regards,<br>The ${previewData.company_name} Team</p>
          </div>
        `;
        break;
      default:
        content = `
          <div class="email-header">
            ${emailConfig.custom_header_html || `<h1>${template.name}</h1>`}
          </div>
          <div class="email-body">
            <h2>Hi ${previewData.user_name},</h2>
            <p>This is a preview of the ${template.name.toLowerCase()} email template.</p>
            <a href="#" class="button">Call to Action</a>
            <p>Best regards,<br>The ${previewData.company_name} Team</p>
          </div>
        `;
    }

    const footer = `
      <div class="email-footer">
        ${emailConfig.custom_footer_html || `
          <p>© 2024 ${previewData.company_name}. All rights reserved.</p>
          <p>You received this email because you have an account with us.</p>
        `}
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${template.subject.replace('{company_name}', previewData.company_name)}</title>
        ${baseStyles}
      </head>
      <body>
        <div class="email-container">
          ${content}
          ${footer}
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Sender Name"
              value={emailConfig.sender_name}
              onChange={(e) => handleConfigChange('sender_name', e.target.value)}
              placeholder="Your Company"
            />
            
            <Input
              label="Sender Email"
              type="email"
              value={emailConfig.sender_email}
              onChange={(e) => handleConfigChange('sender_email', e.target.value)}
              placeholder="noreply@yourcompany.com"
            />
            
            <Input
              label="Reply-To Email"
              type="email"
              value={emailConfig.reply_to_email}
              onChange={(e) => handleConfigChange('reply_to_email', e.target.value)}
              placeholder="support@yourcompany.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Email Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Header Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={emailConfig.header_color}
                  onChange={(e) => handleConfigChange('header_color', e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={emailConfig.header_color}
                  onChange={(e) => handleConfigChange('header_color', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Button Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={emailConfig.button_color}
                  onChange={(e) => handleConfigChange('button_color', e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={emailConfig.button_color}
                  onChange={(e) => handleConfigChange('button_color', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Text Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={emailConfig.text_color}
                  onChange={(e) => handleConfigChange('text_color', e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={emailConfig.text_color}
                  onChange={(e) => handleConfigChange('text_color', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Background
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={emailConfig.background_color}
                  onChange={(e) => handleConfigChange('background_color', e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={emailConfig.background_color}
                  onChange={(e) => handleConfigChange('background_color', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Footer Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={emailConfig.footer_color}
                  onChange={(e) => handleConfigChange('footer_color', e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={emailConfig.footer_color}
                  onChange={(e) => handleConfigChange('footer_color', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom HTML */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Code className="h-5 w-5 mr-2" />
            Custom HTML
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Custom Header HTML"
            value={emailConfig.custom_header_html}
            onChange={(e) => handleConfigChange('custom_header_html', e.target.value)}
            placeholder="<h1>Custom Header</h1>"
            rows={4}
            helperText="Custom HTML for email headers (optional)"
          />
          
          <Textarea
            label="Custom Footer HTML"
            value={emailConfig.custom_footer_html}
            onChange={(e) => handleConfigChange('custom_footer_html', e.target.value)}
            placeholder="<p>Custom footer content</p>"
            rows={4}
            helperText="Custom HTML for email footers (optional)"
          />
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Email Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select
              label="Select Template"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              options={emailTemplates.map(template => ({
                value: template.id,
                label: template.name,
              }))}
            />
            
            <div className="grid grid-cols-1 gap-4">
              {emailTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Subject: {template.subject}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          previewModal.open();
                        }}
                        leftIcon={<Eye className="h-4 w-4" />}
                      >
                        Preview
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          testEmailModal.open();
                        }}
                        leftIcon={<Send className="h-4 w-4" />}
                      >
                        Test
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          leftIcon={<Mail className="h-4 w-4" />}
        >
          Save Email Templates
        </Button>
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={previewModal.close}
        title={`Preview: ${emailTemplates.find(t => t.id === selectedTemplate)?.name}`}
        size="xl"
      >
        <div className="p-6">
          <div 
            className="border rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ 
              __html: generateEmailPreview(selectedTemplate) 
            }}
          />
        </div>
      </Modal>

      {/* Test Email Modal */}
      <TestEmailModal
        isOpen={testEmailModal.isOpen}
        onClose={testEmailModal.close}
        onSend={(email) => sendTestEmail(selectedTemplate, email)}
        templateName={emailTemplates.find(t => t.id === selectedTemplate)?.name || ''}
      />
    </div>
  );
}

interface TestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  templateName: string;
}

function TestEmailModal({ isOpen, onClose, onSend, templateName }: TestEmailModalProps) {
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!testEmail) return;
    
    setSending(true);
    try {
      await onSend(testEmail);
      setTestEmail('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Send Test Email: ${templateName}`}
      size="sm"
    >
      <div className="p-6 space-y-4">
        <Input
          label="Test Email Address"
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="test@example.com"
          required
        />
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            loading={sending}
            disabled={!testEmail}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Send Test Email
          </Button>
        </div>
      </div>
    </Modal>
  );
}
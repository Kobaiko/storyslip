import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Copy,
  RefreshCw,
  Settings,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { Modal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface DomainConfigurationProps {
  config: any;
  onChange: () => void;
  onSave: (config: any) => void;
}

interface DomainConfig {
  custom_domain: string;
  subdomain: string;
  ssl_enabled: boolean;
  ssl_status: 'pending' | 'active' | 'error';
  dns_configured: boolean;
  domain_verified: boolean;
  redirect_www: boolean;
  force_https: boolean;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
  status: 'pending' | 'active' | 'error';
}

export function DomainConfiguration({ 
  config, 
  onChange, 
  onSave 
}: DomainConfigurationProps) {
  const [domainConfig, setDomainConfig] = useState<DomainConfig>({
    custom_domain: '',
    subdomain: '',
    ssl_enabled: true,
    ssl_status: 'pending',
    dns_configured: false,
    domain_verified: false,
    redirect_www: true,
    force_https: true,
    ...config?.domain,
  });

  const [checking, setChecking] = useState(false);
  const [dnsRecords] = useState<DNSRecord[]>([
    {
      type: 'CNAME',
      name: 'www',
      value: 'storyslip-cdn.example.com',
      ttl: 300,
      status: 'pending',
    },
    {
      type: 'A',
      name: '@',
      value: '192.0.2.1',
      ttl: 300,
      status: 'pending',
    },
    {
      type: 'TXT',
      name: '_storyslip-verification',
      value: 'storyslip-site-verification=abc123def456',
      ttl: 300,
      status: 'pending',
    },
  ]);

  const dnsModal = useModal();
  const { success, error: showError } = useToast();

  useEffect(() => {
    if (config?.domain) {
      setDomainConfig({ ...domainConfig, ...config.domain });
    }
  }, [config]);

  const handleInputChange = (field: keyof DomainConfig, value: any) => {
    const newConfig = { ...domainConfig, [field]: value };
    setDomainConfig(newConfig);
    onChange();
  };

  const handleSave = () => {
    onSave({ ...config, domain: domainConfig });
  };

  const checkDomainStatus = async () => {
    setChecking(true);
    try {
      // Mock domain verification check
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random verification results
      const verified = Math.random() > 0.5;
      const dnsConfigured = Math.random() > 0.3;
      
      setDomainConfig({
        ...domainConfig,
        domain_verified: verified,
        dns_configured: dnsConfigured,
        ssl_status: verified && dnsConfigured ? 'active' : 'pending',
      });
      
      if (verified && dnsConfigured) {
        success('Domain verification successful!');
      } else {
        showError('Domain verification failed. Please check your DNS settings.');
      }
    } catch (error) {
      showError('Failed to check domain status');
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success('Copied to clipboard');
    } catch (error) {
      showError('Failed to copy to clipboard');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Domain Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Custom Domain Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Custom Domain"
              value={domainConfig.custom_domain}
              onChange={(e) => handleInputChange('custom_domain', e.target.value)}
              placeholder="blog.yourcompany.com"
              helperText="Your custom domain name"
            />
            
            <Input
              label="Subdomain"
              value={domainConfig.subdomain}
              onChange={(e) => handleInputChange('subdomain', e.target.value)}
              placeholder="yourcompany"
              helperText="Subdomain on storyslip.com"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Current URL</p>
              <p className="text-sm text-gray-600">
                {domainConfig.custom_domain || `${domainConfig.subdomain || 'yoursite'}.storyslip.com`}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ExternalLink className="h-4 w-4" />}
              onClick={() => window.open(
                `https://${domainConfig.custom_domain || `${domainConfig.subdomain || 'yoursite'}.storyslip.com`}`,
                '_blank'
              )}
            >
              Visit Site
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Domain Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Domain Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Domain Verified</p>
                <p className="text-sm text-gray-600">DNS configuration</p>
              </div>
              {getStatusBadge(domainConfig.domain_verified ? 'active' : 'pending')}
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">SSL Certificate</p>
                <p className="text-sm text-gray-600">HTTPS encryption</p>
              </div>
              {getStatusBadge(domainConfig.ssl_status)}
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-gray-900">DNS Configured</p>
                <p className="text-sm text-gray-600">Records pointing correctly</p>
              </div>
              {getStatusBadge(domainConfig.dns_configured ? 'active' : 'pending')}
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={checkDomainStatus}
              loading={checking}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Check Domain Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DNS Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              DNS Configuration
            </CardTitle>
            
            <Button
              variant="outline"
              size="sm"
              onClick={dnsModal.open}
              leftIcon={<Info className="h-4 w-4" />}
            >
              Setup Instructions
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add these DNS records to your domain provider to connect your custom domain:
            </p>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">TTL</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dnsRecords.map((record, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {record.type}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {record.name}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 max-w-xs truncate">
                        {record.value}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {record.ttl}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(record.status)}
                          <span className="text-sm text-gray-600 capitalize">
                            {record.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(record.value)}
                          leftIcon={<Copy className="h-3 w-3" />}
                        >
                          Copy
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Domain Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Redirect www to non-www</p>
                <p className="text-sm text-gray-600">
                  Automatically redirect www.yourdomain.com to yourdomain.com
                </p>
              </div>
              <input
                type="checkbox"
                checked={domainConfig.redirect_www}
                onChange={(e) => handleInputChange('redirect_www', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Force HTTPS</p>
                <p className="text-sm text-gray-600">
                  Automatically redirect HTTP traffic to HTTPS
                </p>
              </div>
              <input
                type="checkbox"
                checked={domainConfig.force_https}
                onChange={(e) => handleInputChange('force_https', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">SSL Certificate</p>
                <p className="text-sm text-gray-600">
                  Enable SSL/TLS encryption for secure connections
                </p>
              </div>
              <input
                type="checkbox"
                checked={domainConfig.ssl_enabled}
                onChange={(e) => handleInputChange('ssl_enabled', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          leftIcon={<Globe className="h-4 w-4" />}
        >
          Save Domain Configuration
        </Button>
      </div>

      {/* DNS Setup Instructions Modal */}
      <Modal
        isOpen={dnsModal.isOpen}
        onClose={dnsModal.close}
        title="DNS Setup Instructions"
        size="lg"
      >
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              How to configure your DNS
            </h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Access your domain provider</p>
                  <p>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Find DNS management</p>
                  <p>Look for "DNS Management", "DNS Settings", or "Name Servers" section</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add DNS records</p>
                  <p>Create the DNS records shown in the table above with exact values</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="font-medium text-gray-900">Wait for propagation</p>
                  <p>DNS changes can take up to 48 hours to propagate worldwide</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                  5
                </div>
                <div>
                  <p className="font-medium text-gray-900">Verify configuration</p>
                  <p>Use the "Check Domain Status" button to verify your setup</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Important Notes</p>
                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                  <li>• Remove any existing A or CNAME records for the same subdomain</li>
                  <li>• TTL (Time To Live) can be set between 300-3600 seconds</li>
                  <li>• Contact support if you need help with DNS configuration</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={dnsModal.close}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
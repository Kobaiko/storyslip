import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  CreditCard,
  Key,
  Database,
  Mail,
  Smartphone
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Switch } from '../components/ui/Switch';
import { Badge } from '../components/ui/Badge';
import { FormContainer } from '../components/ui/FormContainer';
import { FormFieldGroup } from '../components/ui/FormFieldGroup';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: true,
    security: true
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Globe },
    { id: 'billing', label: 'Billing', icon: CreditCard }
  ];

  const renderProfileSettings = () => (
    <FormContainer maxWidth="lg" centered={false}>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <FormFieldGroup layout="two-column" spacing="normal">
            <Input label="First Name" defaultValue="John" />
            <Input label="Last Name" defaultValue="Doe" />
            <div className="sm:col-span-2">
              <Input label="Email Address" defaultValue="john.doe@example.com" type="email" />
            </div>
            <div className="sm:col-span-2">
              <Input label="Company" defaultValue="StorySlip Inc." />
            </div>
          </FormFieldGroup>
          <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
            <Button size="lg">Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <FormFieldGroup layout="single">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <Button variant="outline" size="lg">Upload New Picture</Button>
                <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF. Max size 2MB.</p>
              </div>
            </div>
          </FormFieldGroup>
        </CardContent>
      </Card>
    </FormContainer>
  );

  const renderNotificationSettings = () => (
    <FormContainer maxWidth="lg" centered={false}>
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <FormFieldGroup layout="single" spacing="loose">
            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-4">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive notifications via email</p>
                </div>
              </div>
              <Switch 
                checked={notifications.email}
                onCheckedChange={(checked) => setNotifications({...notifications, email: checked})}
              />
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-4">
                <Smartphone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-500">Receive push notifications on your devices</p>
                </div>
              </div>
              <Switch 
                checked={notifications.push}
                onCheckedChange={(checked) => setNotifications({...notifications, push: checked})}
              />
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-4">
                <Bell className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Marketing Updates</p>
                  <p className="text-sm text-gray-500">Receive updates about new features and tips</p>
                </div>
              </div>
              <Switch 
                checked={notifications.marketing}
                onCheckedChange={(checked) => setNotifications({...notifications, marketing: checked})}
              />
            </div>

            <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-4">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">Security Alerts</p>
                  <p className="text-sm text-gray-500">Get notified about security events</p>
                </div>
              </div>
              <Switch 
                checked={notifications.security}
                onCheckedChange={(checked) => setNotifications({...notifications, security: checked})}
              />
            </div>
          </FormFieldGroup>
        </CardContent>
      </Card>
    </FormContainer>
  );

  const renderSecuritySettings = () => (
    <FormContainer maxWidth="lg" centered={false}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent>
            <FormFieldGroup layout="single" spacing="normal">
              <Input label="Current Password" type="password" />
              <Input label="New Password" type="password" />
              <Input label="Confirm New Password" type="password" />
            </FormFieldGroup>
            <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
              <Button size="lg">Update Password</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <FormFieldGroup layout="single">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">2FA Status</p>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    Disabled
                  </Badge>
                  <Button variant="outline" size="lg">Enable 2FA</Button>
                </div>
              </div>
            </FormFieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <FormFieldGroup layout="single" spacing="normal">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Key className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Production API Key</p>
                    <p className="text-sm text-gray-500">sk_prod_••••••••••••••••</p>
                  </div>
                </div>
                <Button variant="outline" size="lg">Regenerate</Button>
              </div>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Key className="w-4 h-4 mr-2" />
                Create New API Key
              </Button>
            </FormFieldGroup>
          </CardContent>
        </Card>
      </div>
    </FormContainer>
  );

  const renderAppearanceSettings = () => (
    <FormContainer maxWidth="lg" centered={false}>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <FormFieldGroup layout="single" spacing="loose">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Theme</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <div className="w-full h-16 bg-white border rounded-lg mb-3 shadow-sm"></div>
                  <p className="text-sm text-center font-medium">Light</p>
                </div>
                <div className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <div className="w-full h-16 bg-gray-900 border rounded-lg mb-3"></div>
                  <p className="text-sm text-center font-medium">Dark</p>
                </div>
                <div className="p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <div className="w-full h-16 bg-gradient-to-br from-white to-gray-900 border rounded-lg mb-3"></div>
                  <p className="text-sm text-center font-medium">Auto</p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select 
                id="language"
                className="w-full h-11 px-4 py-3 text-base border border-gray-300 bg-white rounded-lg shadow-sm transition-all duration-200
                  hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  sm:h-12 sm:px-4 sm:py-3"
              >
                <option>English (US)</option>
                <option>English (UK)</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
          </FormFieldGroup>
        </CardContent>
      </Card>
    </FormContainer>
  );

  const renderIntegrationsSettings = () => (
    <FormContainer maxWidth="lg" centered={false}>
      <Card>
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
        </CardHeader>
        <CardContent>
          <FormFieldGroup layout="single" spacing="normal">
            {[
              { name: 'Google Analytics', status: 'Connected', icon: '📊' },
              { name: 'Slack', status: 'Not Connected', icon: '💬' },
              { name: 'Zapier', status: 'Connected', icon: '⚡' },
              { name: 'Webhook', status: 'Not Connected', icon: '🔗' }
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{integration.name}</p>
                    <p className="text-sm text-gray-500">{integration.status}</p>
                  </div>
                </div>
                <Button variant="outline" size="lg">
                  {integration.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            ))}
          </FormFieldGroup>
        </CardContent>
      </Card>
    </FormContainer>
  );

  const renderBillingSettings = () => (
    <FormContainer maxWidth="lg" centered={false}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <FormFieldGroup layout="single">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Professional Plan</p>
                  <p className="text-sm text-gray-500">$29/month • Billed monthly</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge>Active</Badge>
                  <Button variant="outline" size="lg">Change Plan</Button>
                </div>
              </div>
            </FormFieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <FormFieldGroup layout="single">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                    <p className="text-sm text-gray-500">Expires 12/25</p>
                  </div>
                </div>
                <Button variant="outline" size="lg">Update</Button>
              </div>
            </FormFieldGroup>
          </CardContent>
        </Card>
      </div>
    </FormContainer>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileSettings();
      case 'notifications': return renderNotificationSettings();
      case 'security': return renderSecuritySettings();
      case 'appearance': return renderAppearanceSettings();
      case 'integrations': return renderIntegrationsSettings();
      case 'billing': return renderBillingSettings();
      default: return renderProfileSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 ${
                        activeTab === tab.id ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
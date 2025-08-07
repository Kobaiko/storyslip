import React, { useState } from 'react';
import { 
  Zap, 
  Users, 
  BarChart3, 
  Palette, 
  Shield, 
  Rocket,
  Brain,
  Globe,
  Settings,
  Monitor,
  Play,
  ExternalLink,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';

const ShowcasePage: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: 'AI-Powered Content',
      description: 'Generate and enhance content with advanced AI assistance',
      status: 'active',
      demo: '/content?demo=ai',
      highlights: ['GPT-4 Integration', 'Content Enhancement', 'SEO Optimization', 'Multi-language Support']
    },
    {
      icon: <Palette className="h-6 w-6" />,
      title: 'Widget Builder',
      description: 'Create beautiful, embeddable widgets with multiple themes',
      status: 'active',
      demo: '/widgets?demo=builder',
      highlights: ['3 Premium Themes', 'Live Preview', 'Responsive Design', 'Custom CSS']
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Team Management',
      description: 'Collaborate with team members and manage permissions',
      status: 'active',
      demo: '/team?demo=collaboration',
      highlights: ['Role-based Access', 'Activity Tracking', 'Team Invitations', 'Audit Logs']
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Analytics Dashboard',
      description: 'Track performance with real-time analytics and insights',
      status: 'active',
      demo: '/analytics?demo=realtime',
      highlights: ['Real-time Data', 'Custom Reports', 'Performance Metrics', 'Export Options']
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'White-Label Branding',
      description: 'Customize the platform with your own branding',
      status: 'active',
      demo: '/brand?demo=customization',
      highlights: ['Custom Logos', 'Color Schemes', 'Domain Setup', 'Email Templates']
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Enterprise Security',
      description: 'Advanced security features and compliance tools',
      status: 'active',
      demo: '/security?demo=features',
      highlights: ['2FA Authentication', 'Audit Trails', 'Data Encryption', 'Compliance Reports']
    },
    {
      icon: <Monitor className="h-6 w-6" />,
      title: 'Monitoring & Health',
      description: 'Comprehensive monitoring and health check systems',
      status: 'active',
      demo: '/monitoring?demo=dashboard',
      highlights: ['System Health', 'Performance Metrics', 'Error Tracking', 'Uptime Monitoring']
    },
    {
      icon: <Rocket className="h-6 w-6" />,
      title: 'Production Deployment',
      description: 'One-click production deployment with zero downtime',
      status: 'active',
      demo: '/deployment?demo=production',
      highlights: ['Zero Downtime', 'Auto Rollback', 'Health Checks', 'Monitoring Integration']
    }
  ];

  const stats = [
    { label: 'Total Features', value: '50+', change: '+12 this month', icon: <Zap className="h-5 w-5" /> },
    { label: 'API Endpoints', value: '120+', change: '+8 this week', icon: <Settings className="h-5 w-5" /> },
    { label: 'Test Coverage', value: '95%', change: '+5% this sprint', icon: <CheckCircle className="h-5 w-5" /> },
    { label: 'Performance Score', value: '98/100', change: 'Excellent', icon: <Star className="h-5 w-5" /> }
  ];

  const demoScenarios = [
    {
      title: 'Content Creator Workflow',
      description: 'Experience the complete content creation process',
      steps: [
        'Login to dashboard',
        'Create new content with AI assistance',
        'Optimize for SEO',
        'Schedule publication',
        'Monitor performance'
      ],
      duration: '5 min',
      difficulty: 'Beginner'
    },
    {
      title: 'Widget Integration',
      description: 'Build and deploy widgets across different sites',
      steps: [
        'Design custom widget',
        'Configure theme and layout',
        'Generate embed code',
        'Test on different sites',
        'Track analytics'
      ],
      duration: '8 min',
      difficulty: 'Intermediate'
    },
    {
      title: 'Team Collaboration',
      description: 'Set up team workflows and permissions',
      steps: [
        'Invite team members',
        'Assign roles and permissions',
        'Collaborate on content',
        'Review and approve changes',
        'Monitor team activity'
      ],
      duration: '10 min',
      difficulty: 'Advanced'
    },
    {
      title: 'Enterprise Setup',
      description: 'Configure white-label branding and deployment',
      steps: [
        'Upload custom branding',
        'Configure domain settings',
        'Customize email templates',
        'Set up monitoring',
        'Deploy to production'
      ],
      duration: '15 min',
      difficulty: 'Expert'
    }
  ];

  const quickLinks = [
    { name: 'Marketing Site', url: 'http://localhost:3002', icon: <Globe className="h-4 w-4" /> },
    { name: 'API Documentation', url: 'http://localhost:3000/api/docs', icon: <Settings className="h-4 w-4" /> },
    { name: 'Health Check', url: 'http://localhost:3000/api/monitoring/health', icon: <Monitor className="h-4 w-4" /> },
    { name: 'Help Center', url: '/help', icon: <Users className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center px-4 py-2 bg-white/10 rounded-full text-sm font-medium">
              <Zap className="h-4 w-4 mr-2" />
              Production Ready • Enterprise Grade • AI-Powered
            </div>
            
            <h1 className="text-5xl font-bold">
              StorySlip Complete Showcase
            </h1>
            
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Explore the full power of StorySlip - from basic content management to advanced enterprise features. 
              This interactive showcase demonstrates every capability of our platform.
            </p>
            
            <div className="flex justify-center gap-4 pt-4">
              <button 
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
                onClick={() => setActiveDemo('tour')}
              >
                <Play className="h-5 w-5" />
                Start Interactive Tour
              </button>
              <button 
                className="border border-white/30 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors flex items-center gap-2"
                onClick={() => window.open('http://localhost:3002', '_blank')}
              >
                <ExternalLink className="h-5 w-5" />
                View Marketing Site
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {stat.icon}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              </div>
              <div className="text-xs text-green-600 font-medium">{stat.change}</div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${feature.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <span className="text-xs text-gray-500 capitalize">{feature.status}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
                
                <div className="space-y-2 mb-4">
                  {feature.highlights.map((highlight, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {highlight}
                    </div>
                  ))}
                </div>
                
                <button 
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  onClick={() => window.location.href = feature.demo}
                >
                  <Play className="h-4 w-4" />
                  Try Demo
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Scenarios */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Guided Demo Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {demoScenarios.map((scenario, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{scenario.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{scenario.description}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3" />
                      {scenario.duration}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      scenario.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                      scenario.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                      scenario.difficulty === 'Advanced' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {scenario.difficulty}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  {scenario.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </div>
                      {step}
                    </div>
                  ))}
                </div>
                
                <button 
                  className="w-full border border-blue-600 text-blue-600 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                  onClick={() => setActiveDemo(scenario.title)}
                >
                  <Play className="h-4 w-4" />
                  Start Scenario
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Access</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => (
              <button
                key={index}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                onClick={() => {
                  if (link.url.startsWith('http')) {
                    window.open(link.url, '_blank');
                  } else {
                    window.location.href = link.url;
                  }
                }}
              >
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  {link.icon}
                </div>
                <span className="font-medium text-gray-900">{link.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Demo Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Demo Instructions & Sample Data</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Demo Accounts
              </h4>
              <div className="space-y-2 text-sm">
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium">Admin Account</div>
                  <div className="text-gray-600">admin@storyslip.com</div>
                  <div className="text-gray-600">Password: demo123</div>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <div className="font-medium">User Account</div>
                  <div className="text-gray-600">user@storyslip.com</div>
                  <div className="text-gray-600">Password: demo123</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Sample Data
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Pre-loaded blog posts and content
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Sample widgets with different themes
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Demo analytics and performance data
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Test team members and permissions
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Rocket className="h-5 w-5 text-blue-600" />
                Key Highlights
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <strong>Content Management:</strong> Create, edit, and publish content with AI assistance
                </div>
                <div>
                  <strong>Widget System:</strong> Build and embed widgets with live preview
                </div>
                <div>
                  <strong>Team Collaboration:</strong> Invite members and manage permissions
                </div>
                <div>
                  <strong>Enterprise Features:</strong> White-labeling, monitoring, and deployment
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-600 rounded-full">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-medium text-blue-900">Pro Tip</div>
                <div className="text-blue-800 text-sm">
                  Start with the "Content Creator Workflow" scenario to get familiar with the platform, 
                  then explore the advanced features like AI content generation and widget building.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowcasePage;
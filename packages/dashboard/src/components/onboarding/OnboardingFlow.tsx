import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Globe, 
  FileText, 
  BarChart3, 
  Users, 
  Palette,
  Zap,
  Play,
  X,
  HelpCircle,
  BookOpen,
  Video,
  MessageCircle,
  Lightbulb
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { HelpCenter } from '../help/HelpCenter';
import { GuidedTour } from '../help/ContextualHelp';
import { QuickHelp } from '../help/ContextualHelp';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  isCompleted: boolean;
  isOptional?: boolean;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to StorySlip',
      description: 'Let\'s get you started with your content management journey',
      icon: Zap,
      component: WelcomeStep,
      isCompleted: false,
    },
    {
      id: 'create-website',
      title: 'Create Your First Website',
      description: 'Set up your website to start managing content',
      icon: Globe,
      component: CreateWebsiteStep,
      isCompleted: false,
    },
    {
      id: 'add-content',
      title: 'Add Your First Content',
      description: 'Create and publish your first article or page',
      icon: FileText,
      component: AddContentStep,
      isCompleted: false,
    },
    {
      id: 'customize-widget',
      title: 'Customize Your Widget',
      description: 'Style your content widget to match your brand',
      icon: Palette,
      component: CustomizeWidgetStep,
      isCompleted: false,
      isOptional: true,
    },
    {
      id: 'invite-team',
      title: 'Invite Team Members',
      description: 'Collaborate with your team on content creation',
      icon: Users,
      component: InviteTeamStep,
      isCompleted: false,
      isOptional: true,
    },
    {
      id: 'analytics-setup',
      title: 'Set Up Analytics',
      description: 'Track your content performance and engagement',
      icon: BarChart3,
      component: AnalyticsSetupStep,
      isCompleted: false,
      isOptional: true,
    },
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    // Load user's onboarding progress
    loadOnboardingProgress();
  }, []);

  const loadOnboardingProgress = async () => {
    try {
      const response = await api.get('/user/onboarding-progress');
      if (response.data.completed_steps) {
        setCompletedSteps(new Set(response.data.completed_steps));
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    }
  };

  const markStepCompleted = async (stepId: string) => {
    try {
      await api.post('/user/onboarding-progress', {
        step_id: stepId,
        completed: true,
      });
      
      setCompletedSteps(prev => new Set([...prev, stepId]));
    } catch (error) {
      console.error('Failed to save onboarding progress:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipStep = () => {
    if (currentStepData.isOptional) {
      handleNext();
    }
  };

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await api.post('/user/onboarding-complete');
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepComplete = (stepId: string) => {
    markStepCompleted(stepId);
    handleNext();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="relative">
        {/* Header buttons */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
          <button
            onClick={() => setShowHelpCenter(true)}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Get help"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="Close onboarding"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Getting Started
            </h2>
            <span className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step navigation */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = completedSteps.has(step.id);
              const isPast = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                      ${isActive 
                        ? 'border-blue-600 bg-blue-600 text-white' 
                        : isCompleted || isPast
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`
                        w-8 h-0.5 mx-2 transition-all
                        ${isPast || isCompleted ? 'bg-green-600' : 'bg-gray-300'}
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current step content */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600">
              {currentStepData.description}
            </p>
            {currentStepData.isOptional && (
              <Badge variant="secondary" className="mt-2">
                Optional
              </Badge>
            )}
          </div>

          {/* Step component */}
          <div className="min-h-[300px]">
            <currentStepData.component
              onComplete={() => handleStepComplete(currentStepData.id)}
              onSkip={handleSkipStep}
              isCompleted={completedSteps.has(currentStepData.id)}
            />
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Previous
          </Button>

          <div className="flex items-center space-x-3">
            {currentStepData.isOptional && (
              <Button
                variant="ghost"
                onClick={handleSkipStep}
              >
                Skip
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              disabled={isLoading}
              rightIcon={
                currentStep === steps.length - 1 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )
              }
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>

        {/* Quick Help Tips */}
        <QuickHelp
          tips={[
            {
              id: 'tip-1',
              title: 'Need Help?',
              description: 'Click the help button (?) at any time to access our comprehensive help center with guides, videos, and live support.',
              icon: HelpCircle
            },
            {
              id: 'tip-2',
              title: 'Video Tutorials',
              description: 'Watch step-by-step video tutorials for each feature to learn at your own pace.',
              icon: Video
            },
            {
              id: 'tip-3',
              title: 'Live Support',
              description: 'Get instant help from our support team through live chat or create a support ticket.',
              icon: MessageCircle
            }
          ]}
          className="mt-6"
        />
      </div>

      {/* Help Center Modal */}
      <HelpCenter
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        initialCategory="getting-started"
      />

      {/* Guided Tour */}
      <GuidedTour
        isActive={showGuidedTour}
        tourId="onboarding-tour"
        steps={[
          {
            id: 'welcome',
            title: 'Welcome to StorySlip',
            content: 'This onboarding flow will help you get started with StorySlip in just a few minutes.',
            target: '.onboarding-welcome',
            position: 'bottom'
          },
          {
            id: 'progress',
            title: 'Track Your Progress',
            content: 'The progress bar shows how far you are in the onboarding process.',
            target: '.onboarding-progress',
            position: 'bottom'
          },
          {
            id: 'help',
            title: 'Get Help Anytime',
            content: 'Click the help button to access our comprehensive help center.',
            target: '.onboarding-help',
            position: 'left'
          }
        ]}
        onComplete={() => setShowGuidedTour(false)}
        onSkip={() => setShowGuidedTour(false)}
      />
    </Modal>
  );
}

// Individual step components
function WelcomeStep({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <Zap className="h-10 w-10 text-blue-600" />
      </div>
      
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome, {user?.name}! 👋
        </h4>
        <p className="text-gray-600 max-w-md mx-auto">
          StorySlip helps you manage and display your content beautifully across any website. 
          Let's set up your account in just a few minutes.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">What you'll accomplish:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Create your first website</li>
          <li>• Add and publish content</li>
          <li>• Customize your content widget</li>
          <li>• Set up analytics tracking</li>
        </ul>
      </div>

      <Button onClick={onComplete} size="lg" className="w-full">
        Let's Get Started
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

function CreateWebsiteStep({ onComplete }: { onComplete: () => void }) {
  const [websiteName, setWebsiteName] = useState('');
  const [websiteDomain, setWebsiteDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateWebsite = async () => {
    if (!websiteName.trim() || !websiteDomain.trim()) return;

    try {
      setIsLoading(true);
      await api.post('/websites', {
        name: websiteName,
        domain: websiteDomain,
        description: 'Created during onboarding',
      });
      onComplete();
    } catch (error) {
      console.error('Failed to create website:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="h-8 w-8 text-green-600" />
        </div>
        <p className="text-gray-600">
          Create your first website to start managing content
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website Name
            </label>
            <input
              type="text"
              value={websiteName}
              onChange={(e) => setWebsiteName(e.target.value)}
              placeholder="My Awesome Blog"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website Domain
            </label>
            <input
              type="text"
              value={websiteDomain}
              onChange={(e) => setWebsiteDomain(e.target.value)}
              placeholder="myblog.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Don't worry, you can change this later
            </p>
          </div>

          <Button
            onClick={handleCreateWebsite}
            disabled={!websiteName.trim() || !websiteDomain.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating...' : 'Create Website'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AddContentStep({ onComplete }: { onComplete: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateContent = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      setIsLoading(true);
      // Get the first website (created in previous step)
      const websitesResponse = await api.get('/websites');
      const website = websitesResponse.data[0];

      await api.post(`/websites/${website.id}/content`, {
        title,
        content: `<p>${content}</p>`,
        status: 'published',
        excerpt: content.substring(0, 150),
      });
      onComplete();
    } catch (error) {
      console.error('Failed to create content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-purple-600" />
        </div>
        <p className="text-gray-600">
          Create your first piece of content
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Article Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Welcome to My Blog"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your first article here..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button
            onClick={handleCreateContent}
            disabled={!title.trim() || !content.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? 'Publishing...' : 'Publish Article'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomizeWidgetStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [isLoading, setIsLoading] = useState(false);

  const handleCustomizeWidget = async () => {
    try {
      setIsLoading(true);
      // Get the first website
      const websitesResponse = await api.get('/websites');
      const website = websitesResponse.data[0];

      await api.put(`/websites/${website.id}/branding`, {
        primary_color: primaryColor,
        brand_name: website.name,
      });
      onComplete();
    } catch (error) {
      console.error('Failed to customize widget:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Palette className="h-8 w-8 text-pink-600" />
        </div>
        <p className="text-gray-600">
          Customize your widget to match your brand
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">Preview</h5>
            <div className="bg-white border border-gray-200 rounded p-3">
              <div 
                className="h-2 rounded mb-2"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="text-sm text-gray-600">
                Your widget will use this color for buttons and accents
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleCustomizeWidget}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving...' : 'Apply Customization'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InviteTeamStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInviteTeam = async () => {
    if (!email.trim()) return;

    try {
      setIsLoading(true);
      // Get the first website
      const websitesResponse = await api.get('/websites');
      const website = websitesResponse.data[0];

      await api.post(`/websites/${website.id}/team/invite`, {
        email,
        role: 'editor',
        message: 'Welcome to our team!',
      });
      onComplete();
    } catch (error) {
      console.error('Failed to invite team member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-indigo-600" />
        </div>
        <p className="text-gray-600">
          Invite team members to collaborate on content
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Member Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              They'll receive an invitation email to join your team
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleInviteTeam}
              disabled={!email.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsSetupStep({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="h-8 w-8 text-yellow-600" />
        </div>
        <p className="text-gray-600">
          Analytics are automatically enabled for your content
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Check className="h-5 w-5 text-green-600" />
              <h5 className="font-medium text-green-900">Analytics Ready!</h5>
            </div>
            <p className="text-sm text-green-800">
              Your content views, engagement, and performance metrics are being tracked automatically.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-medium text-gray-900">What you'll see:</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Page views and unique visitors</li>
              <li>• Content engagement metrics</li>
              <li>• Traffic sources and referrers</li>
              <li>• Real-time activity dashboard</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
            >
              Skip for Now
            </Button>
            <Button
              onClick={onComplete}
              className="flex-1"
            >
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
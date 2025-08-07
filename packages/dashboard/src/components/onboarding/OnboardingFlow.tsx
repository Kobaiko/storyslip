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
  Lightbulb,
  User
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../hooks/useOnboarding';
import { api } from '../../lib/api';
import { HelpCenter } from '../help/HelpCenter';
import { GuidedTour } from '../help/ContextualHelp';
import { QuickHelp } from '../help/ContextualHelp';

interface OnboardingStepComponent {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  component: React.ComponentType<any>;
  isOptional?: boolean;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { progress, completeStep, isCompletingStep } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);

  const stepComponents: OnboardingStepComponent[] = [
    {
      id: 'welcome',
      title: 'Welcome to StorySlip',
      description: 'Let\'s get you started with your content management journey',
      icon: Zap,
      component: WelcomeStep,
    },
    {
      id: 'profile_setup',
      title: 'Complete Your Profile',
      description: 'Add your personal information and preferences',
      icon: User,
      component: ProfileSetupStep,
    },
    {
      id: 'organization_setup',
      title: 'Set Up Your Organization',
      description: 'Configure your organization settings',
      icon: Users,
      component: OrganizationSetupStep,
    },
    {
      id: 'create_website',
      title: 'Create Your First Website',
      description: 'Set up your website to start managing content',
      icon: Globe,
      component: CreateWebsiteStep,
    },
    {
      id: 'add_content',
      title: 'Add Your First Content',
      description: 'Create and publish your first article or page',
      icon: FileText,
      component: AddContentStep,
    },
    {
      id: 'customize_widget',
      title: 'Customize Your Widget',
      description: 'Style your content widget to match your brand',
      icon: Palette,
      component: CustomizeWidgetStep,
      isOptional: true,
    },
    {
      id: 'invite_team',
      title: 'Invite Team Members',
      description: 'Collaborate with your team on content creation',
      icon: Users,
      component: InviteTeamStep,
      isOptional: true,
    },
    {
      id: 'analytics_setup',
      title: 'Set Up Analytics',
      description: 'Track your content performance and engagement',
      icon: BarChart3,
      component: AnalyticsSetupStep,
      isOptional: true,
    },
  ];

  // Use progress from API if available
  useEffect(() => {
    if (progress) {
      setCurrentStep(progress.current_step);
    }
  }, [progress]);

  const currentStepData = stepComponents[currentStep];
  const progressPercentage = ((currentStep + 1) / stepComponents.length) * 100;
  const completedSteps = progress?.completed_steps || [];
  const steps = progress?.steps || [];

  const handleNext = () => {
    if (currentStep < stepComponents.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
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

  const handleStepComplete = async (stepId: string, data?: Record<string, any>) => {
    try {
      await completeStep(stepId, data);
      handleNext();
    } catch (error) {
      console.error('Failed to complete step:', error);
    }
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
              Step {currentStep + 1} of {stepComponents.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Step navigation */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            {stepComponents.map((stepComponent, index) => {
              const Icon = stepComponent.icon;
              const isActive = index === currentStep;
              const step = steps.find(s => s.id === stepComponent.id);
              const isCompleted = step?.is_completed || false;
              const isPast = index < currentStep;
              
              return (
                <div key={stepComponent.id} className="flex items-center">
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
                  {index < stepComponents.length - 1 && (
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
              onComplete={(data?: Record<string, any>) => handleStepComplete(currentStepData.id, data)}
              onSkip={handleSkipStep}
              isCompleted={steps.find(s => s.id === currentStepData.id)?.is_completed || false}
              isLoading={isCompletingStep}
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
              disabled={isCompletingStep}
              rightIcon={
                currentStep === stepComponents.length - 1 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )
              }
            >
              {currentStep === stepComponents.length - 1 ? 'Complete' : 'Next'}
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
interface StepProps {
  onComplete: (data?: Record<string, any>) => void;
  onSkip?: () => void;
  isCompleted: boolean;
  isLoading?: boolean;
}

function WelcomeStep({ onComplete, isLoading }: StepProps) {
  const { user } = useAuth();

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
        <Zap className="h-10 w-10 text-blue-600" />
      </div>
      
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome, {user?.name || user?.email}! 👋
        </h4>
        <p className="text-gray-600 max-w-md mx-auto">
          StorySlip helps you manage and display your content beautifully across any website. 
          Let's set up your account in just a few minutes.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">What you'll accomplish:</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Complete your profile</li>
          <li>• Set up your organization</li>
          <li>• Create your first website</li>
          <li>• Add and publish content</li>
          <li>• Customize your content widget</li>
          <li>• Set up analytics tracking</li>
        </ul>
      </div>

      <Button 
        onClick={() => onComplete({ welcomed: true })} 
        size="lg" 
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Getting Started...' : 'Let\'s Get Started'}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

function ProfileSetupStep({ onComplete, isLoading }: StepProps) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');

  const handleComplete = async () => {
    if (!name.trim()) return;

    try {
      // Update user profile
      await api.put('/profile', {
        name: name.trim(),
        bio: bio.trim(),
        company: company.trim(),
      });

      onComplete({
        name: name.trim(),
        bio: bio.trim(),
        company: company.trim(),
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-purple-600" />
        </div>
        <p className="text-gray-600">
          Complete your profile to personalize your experience
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio (Optional)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company (Optional)
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your company name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button
            onClick={handleComplete}
            disabled={!name.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? 'Saving Profile...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function OrganizationSetupStep({ onComplete, isLoading }: StepProps) {
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');

  const handleComplete = async () => {
    if (!orgName.trim()) return;

    try {
      // Create organization
      await api.post('/organizations', {
        name: orgName.trim(),
        description: orgDescription.trim(),
      });

      onComplete({
        name: orgName.trim(),
        description: orgDescription.trim(),
      });
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-indigo-600" />
        </div>
        <p className="text-gray-600">
          Set up your organization to manage team access and branding
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="My Company"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
              placeholder="Brief description of your organization..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button
            onClick={handleComplete}
            disabled={!orgName.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating Organization...' : 'Create Organization'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateWebsiteStep({ onComplete, isLoading }: StepProps) {
  const [websiteName, setWebsiteName] = useState('');
  const [websiteDomain, setWebsiteDomain] = useState('');

  const handleCreateWebsite = async () => {
    if (!websiteName.trim() || !websiteDomain.trim()) return;

    try {
      const response = await api.post('/websites', {
        name: websiteName.trim(),
        domain: websiteDomain.trim(),
        description: 'Created during onboarding',
      });

      onComplete({
        website_id: response.data.id,
        name: websiteName.trim(),
        domain: websiteDomain.trim(),
      });
    } catch (error) {
      console.error('Failed to create website:', error);
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
              Website Name *
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
              Website Domain *
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
            {isLoading ? 'Creating Website...' : 'Create Website'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AddContentStep({ onComplete, isLoading }: StepProps) {
  const [title, setTitle] = useState('Welcome to My Blog');
  const [content, setContent] = useState('This is my first article created with StorySlip! I\'m excited to start sharing my thoughts and ideas with the world.');

  const handleCreateContent = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      // Get the first website (created in previous step)
      const websitesResponse = await api.get('/websites');
      const website = websitesResponse.data.data?.[0];

      if (!website) {
        console.error('No website found');
        return;
      }

      const response = await api.post(`/websites/${website.id}/content`, {
        title: title.trim(),
        content: `<p>${content.trim()}</p>`,
        status: 'published',
        excerpt: content.trim().substring(0, 150),
      });

      onComplete({
        content_id: response.data.id,
        title: title.trim(),
        website_id: website.id,
      });
    } catch (error) {
      console.error('Failed to create content:', error);
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
              Article Title *
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
              Content *
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
            {isLoading ? 'Publishing Article...' : 'Publish Article'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomizeWidgetStep({ onComplete, onSkip, isLoading }: StepProps) {
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');

  const handleCustomizeWidget = async () => {
    try {
      // Get the first website
      const websitesResponse = await api.get('/websites');
      const website = websitesResponse.data.data?.[0];

      if (!website) {
        console.error('No website found');
        return;
      }

      await api.put(`/websites/${website.id}/branding`, {
        primary_color: primaryColor,
        brand_name: website.name,
      });

      onComplete({
        primary_color: primaryColor,
        website_id: website.id,
      });
    } catch (error) {
      console.error('Failed to customize widget:', error);
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
              disabled={isLoading}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleCustomizeWidget}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Saving Customization...' : 'Apply Customization'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InviteTeamStep({ onComplete, onSkip, isLoading }: StepProps) {
  const [email, setEmail] = useState('');

  const handleInviteTeam = async () => {
    if (!email.trim()) return;

    try {
      // Get the first website
      const websitesResponse = await api.get('/websites');
      const website = websitesResponse.data.data?.[0];

      if (!website) {
        console.error('No website found');
        return;
      }

      await api.post(`/websites/${website.id}/team/invite`, {
        email: email.trim(),
        role: 'editor',
        message: 'Welcome to our team!',
      });

      onComplete({
        invited_email: email.trim(),
        website_id: website.id,
      });
    } catch (error) {
      console.error('Failed to invite team member:', error);
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
              disabled={isLoading}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleInviteTeam}
              disabled={!email.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsSetupStep({ onComplete, onSkip, isLoading }: StepProps) {
  const handleComplete = () => {
    onComplete({
      analytics_enabled: true,
      setup_completed: true,
    });
  };

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
              disabled={isLoading}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleComplete}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Setting up Analytics...' : 'Complete Setup'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  MessageCircle, 
  Book, 
  Video, 
  Search,
  Zap,
  Settings,
  X,
  Minimize2,
  Maximize2,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { HelpCenter } from './HelpCenter';
import { SupportSystem } from './SupportSystem';
import { TroubleshootingGuide } from './TroubleshootingGuide';
import { DocumentationSystem } from './DocumentationSystem';
import { GuidedTour, Tooltip, HelpButton, QuickHelp } from './ContextualHelp';

interface HelpIntegrationProps {
  className?: string;
}

export function HelpIntegration({ className = '' }: HelpIntegrationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeView, setActiveView] = useState<'help' | 'support' | 'docs' | 'troubleshoot'>('help');
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    // Check for unread support messages
    checkUnreadMessages();
    
    // Set up periodic check
    const interval = setInterval(checkUnreadMessages, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkUnreadMessages = async () => {
    try {
      // This would be replaced with actual API call
      // const response = await api.get('/support/unread-count');
      // setUnreadMessages(response.data.count);
      setUnreadMessages(0); // Placeholder
    } catch (error) {
      console.error('Failed to check unread messages:', error);
    }
  };

  const quickActions = [
    {
      id: 'search',
      title: 'Search Help',
      description: 'Find answers quickly',
      icon: Search,
      action: () => {
        setActiveView('help');
        setIsOpen(true);
      }
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Get instant help',
      icon: MessageCircle,
      action: () => {
        setActiveView('support');
        setIsOpen(true);
      },
      badge: unreadMessages > 0 ? unreadMessages.toString() : undefined
    },
    {
      id: 'docs',
      title: 'Documentation',
      description: 'Browse guides',
      icon: Book,
      action: () => {
        setActiveView('docs');
        setIsOpen(true);
      }
    },
    {
      id: 'troubleshoot',
      title: 'Troubleshoot',
      description: 'Fix common issues',
      icon: Zap,
      action: () => {
        setActiveView('troubleshoot');
        setIsOpen(true);
      }
    },
    {
      id: 'call',
      title: 'Schedule Call',
      description: 'Talk to an expert',
      icon: Phone,
      action: () => {
        window.open('https://calendly.com/storyslip-support', '_blank');
      }
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'Send us an email',
      icon: Mail,
      action: () => {
        window.location.href = 'mailto:support@storyslip.com';
      }
    }
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'help':
        return <HelpCenter isOpen={true} onClose={() => setIsOpen(false)} />;
      case 'support':
        return <SupportSystem />;
      case 'docs':
        return <DocumentationSystem />;
      case 'troubleshoot':
        return <TroubleshootingGuide />;
      default:
        return <HelpCenter isOpen={true} onClose={() => setIsOpen(false)} />;
    }
  };

  return (
    <>
      {/* Help Widget */}
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        {/* Quick Actions Menu */}
        {showQuickActions && (
          <div className="mb-4">
            <Card className="shadow-xl border-2 border-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Quick Help</h3>
                  <button
                    onClick={() => setShowQuickActions(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className="flex flex-col items-center p-3 text-center rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-colors relative"
                      >
                        <div className="relative">
                          <Icon className="h-6 w-6 text-gray-600 mb-2" />
                          {action.badge && (
                            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center p-0">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900 mb-1">
                          {action.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {action.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Need more help?</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveView('help');
                        setIsOpen(true);
                        setShowQuickActions(false);
                      }}
                      rightIcon={<ExternalLink className="h-3 w-3" />}
                    >
                      Help Center
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Help Button */}
        <Tooltip content="Get help and support" position="left">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center relative group"
          >
            <HelpCircle className="h-6 w-6" />
            {unreadMessages > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[20px] h-[20px] flex items-center justify-center p-0">
                {unreadMessages}
              </Badge>
            )}
            
            {/* Pulse animation for unread messages */}
            {unreadMessages > 0 && (
              <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-75" />
            )}
          </button>
        </Tooltip>
      </div>

      {/* Full Help Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          
          <div className={`absolute right-0 top-0 h-full bg-white shadow-xl transition-all duration-300 ${
            isMinimized ? 'w-80' : 'w-full max-w-6xl'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeView === 'help' && 'Help Center'}
                  {activeView === 'support' && 'Support'}
                  {activeView === 'docs' && 'Documentation'}
                  {activeView === 'troubleshoot' && 'Troubleshooting'}
                </h2>
                
                {!isMinimized && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveView('help')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        activeView === 'help'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Help
                    </button>
                    <button
                      onClick={() => setActiveView('support')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors relative ${
                        activeView === 'support'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Support
                      {unreadMessages > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[16px] h-[16px] flex items-center justify-center p-0">
                          {unreadMessages}
                        </Badge>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveView('docs')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        activeView === 'docs'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Docs
                    </button>
                    <button
                      onClick={() => setActiveView('troubleshoot')}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        activeView === 'troubleshoot'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Troubleshoot
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <div className="h-full pb-16 overflow-hidden">
                {renderContent()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Context-aware help components for specific pages
export function PageHelp({ 
  page, 
  tips = [],
  tourSteps = [],
  className = '' 
}: {
  page: string;
  tips?: Array<{
    id: string;
    title: string;
    description: string;
    icon?: React.ComponentType<any>;
  }>;
  tourSteps?: Array<{
    id: string;
    title: string;
    content: string;
    target: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
  }>;
  className?: string;
}) {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour for this page
    const tourKey = `tour-${page}-completed`;
    const hasSeenTour = localStorage.getItem(tourKey);
    
    if (!hasSeenTour && tourSteps.length > 0) {
      // Show tour after a short delay
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [page, tourSteps]);

  return (
    <div className={className}>
      {/* Quick Tips */}
      {tips.length > 0 && (
        <QuickHelp tips={tips} className="mb-4" />
      )}

      {/* Page-specific help button */}
      <div className="fixed bottom-24 right-6 z-40">
        <HelpButton
          helpText={`Get help with ${page}`}
          className="bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:shadow-xl transition-shadow"
        />
      </div>

      {/* Guided tour */}
      {tourSteps.length > 0 && (
        <GuidedTour
          isActive={showTour}
          tourId={`${page}-tour`}
          steps={tourSteps}
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}
    </div>
  );
}

// Hook for managing help state
export function useHelp() {
  const [helpState, setHelpState] = useState({
    showHelp: false,
    activeView: 'help' as 'help' | 'support' | 'docs' | 'troubleshoot',
    unreadMessages: 0
  });

  const openHelp = (view?: 'help' | 'support' | 'docs' | 'troubleshoot') => {
    setHelpState(prev => ({
      ...prev,
      showHelp: true,
      activeView: view || 'help'
    }));
  };

  const closeHelp = () => {
    setHelpState(prev => ({
      ...prev,
      showHelp: false
    }));
  };

  const setUnreadMessages = (count: number) => {
    setHelpState(prev => ({
      ...prev,
      unreadMessages: count
    }));
  };

  return {
    ...helpState,
    openHelp,
    closeHelp,
    setUnreadMessages
  };
}
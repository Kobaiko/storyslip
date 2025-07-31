import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Search, 
  Filter, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Download,
  Share,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  User,
  Tag,
  Lightbulb,
  Zap,
  Settings,
  Code,
  Globe,
  Smartphone
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { api } from '../../lib/api';

interface TroubleshootingIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  symptoms: string[];
  causes: string[];
  solutions: TroubleshootingSolution[];
  relatedIssues: string[];
  tags: string[];
  lastUpdated: string;
  views: number;
  helpful: number;
  notHelpful: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
}

interface TroubleshootingSolution {
  id: string;
  title: string;
  steps: TroubleshootingStep[];
  successRate: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  requirements?: string[];
  warnings?: string[];
}

interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  type: 'action' | 'check' | 'code' | 'info' | 'warning';
  content?: string;
  expectedResult?: string;
  troubleshooting?: string;
  screenshot?: string;
  videoUrl?: string;
}

interface DiagnosticTest {
  id: string;
  name: string;
  description: string;
  category: string;
  automated: boolean;
  steps: Array<{
    id: string;
    name: string;
    test: () => Promise<{ passed: boolean; message: string; details?: any }>;
  }>;
}

interface TroubleshootingGuideProps {
  className?: string;
}

export function TroubleshootingGuide({ className = '' }: TroubleshootingGuideProps) {
  const [issues, setIssues] = useState<TroubleshootingIssue[]>([]);
  const [diagnosticTests, setDiagnosticTests] = useState<DiagnosticTest[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<TroubleshootingIssue | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'diagnose' | 'guided'>('browse');

  const categories = [
    { id: 'all', name: 'All Issues', icon: AlertTriangle },
    { id: 'widget-display', name: 'Widget Display', icon: Globe },
    { id: 'content-loading', name: 'Content Loading', icon: Zap },
    { id: 'customization', name: 'Customization', icon: Settings },
    { id: 'integration', name: 'Integration', icon: Code },
    { id: 'mobile', name: 'Mobile Issues', icon: Smartphone },
    { id: 'performance', name: 'Performance', icon: Lightbulb },
  ];

  useEffect(() => {
    loadTroubleshootingData();
  }, [selectedCategory, selectedSeverity, searchQuery]);

  const loadTroubleshootingData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        severity: selectedSeverity,
        search: searchQuery,
      });

      const [issuesResponse, testsResponse] = await Promise.all([
        api.get(`/troubleshooting/issues?${params}`),
        api.get('/troubleshooting/diagnostic-tests')
      ]);

      setIssues(issuesResponse.data);
      setDiagnosticTests(testsResponse.data);
    } catch (error) {
      console.error('Failed to load troubleshooting data:', error);
      loadFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFallbackData = () => {
    setIssues([
      {
        id: '1',
        title: 'Widget not displaying on website',
        description: 'The StorySlip widget is not appearing on your website after embedding the code.',
        category: 'widget-display',
        severity: 'high',
        symptoms: [
          'Widget embed code is added but nothing appears',
          'Console shows no errors',
          'Other widgets on the site work fine'
        ],
        causes: [
          'Incorrect embed code placement',
          'CSS conflicts with existing styles',
          'JavaScript errors preventing widget load',
          'Domain not whitelisted in widget settings'
        ],
        solutions: [
          {
            id: '1',
            title: 'Verify embed code placement',
            successRate: 85,
            difficulty: 'easy',
            estimatedTime: 5,
            steps: [
              {
                id: '1',
                title: 'Check embed code location',
                description: 'Ensure the widget embed code is placed in the correct location in your HTML.',
                type: 'check',
                content: 'The embed code should be placed where you want the widget to appear, typically within the <body> tag.',
                expectedResult: 'Widget should appear at the specified location'
              },
              {
                id: '2',
                title: 'Verify embed code syntax',
                description: 'Check that the embed code is complete and properly formatted.',
                type: 'code',
                content: '<script src="https://widget.storyslip.com/embed.js" data-widget-id="your-widget-id"></script>',
                expectedResult: 'No syntax errors in browser console'
              }
            ]
          },
          {
            id: '2',
            title: 'Check for CSS conflicts',
            successRate: 70,
            difficulty: 'medium',
            estimatedTime: 15,
            steps: [
              {
                id: '3',
                title: 'Inspect widget container',
                description: 'Use browser developer tools to inspect the widget container element.',
                type: 'action',
                content: 'Right-click where the widget should appear and select "Inspect Element"',
                expectedResult: 'Widget container element should be visible in DOM'
              },
              {
                id: '4',
                title: 'Check CSS display properties',
                description: 'Verify that the widget container has proper display properties.',
                type: 'check',
                content: 'Look for display: none, visibility: hidden, or z-index issues',
                expectedResult: 'Widget container should be visible and properly positioned'
              }
            ]
          }
        ],
        relatedIssues: ['2', '3'],
        tags: ['widget', 'display', 'embed', 'css'],
        lastUpdated: '2024-01-15',
        views: 1250,
        helpful: 89,
        notHelpful: 12,
        difficulty: 'medium',
        estimatedTime: 20
      },
      {
        id: '2',
        title: 'Content not loading in widget',
        description: 'The widget appears but content is not loading or showing as empty.',
        category: 'content-loading',
        severity: 'medium',
        symptoms: [
          'Widget container appears but shows loading spinner indefinitely',
          'Empty state message appears instead of content',
          'Network requests to API are failing'
        ],
        causes: [
          'API endpoint issues',
          'Authentication problems',
          'Content not published',
          'Network connectivity issues'
        ],
        solutions: [
          {
            id: '3',
            title: 'Verify content publication status',
            successRate: 90,
            difficulty: 'easy',
            estimatedTime: 3,
            steps: [
              {
                id: '5',
                title: 'Check content status in dashboard',
                description: 'Verify that your content is published and not in draft status.',
                type: 'check',
                content: 'Go to your StorySlip dashboard and check the status of your content items.',
                expectedResult: 'Content should show as "Published" status'
              }
            ]
          }
        ],
        relatedIssues: ['1', '4'],
        tags: ['content', 'loading', 'api', 'published'],
        lastUpdated: '2024-01-14',
        views: 890,
        helpful: 67,
        notHelpful: 8,
        difficulty: 'easy',
        estimatedTime: 10
      }
    ]);

    setDiagnosticTests([
      {
        id: '1',
        name: 'Widget Connectivity Test',
        description: 'Tests if the widget can connect to StorySlip servers',
        category: 'connectivity',
        automated: true,
        steps: [
          {
            id: '1',
            name: 'API Endpoint Reachability',
            test: async () => {
              try {
                const response = await fetch('https://api.storyslip.com/health');
                return {
                  passed: response.ok,
                  message: response.ok ? 'API endpoint is reachable' : 'API endpoint is not responding',
                  details: { status: response.status }
                };
              } catch (error) {
                return {
                  passed: false,
                  message: 'Failed to reach API endpoint',
                  details: { error: error.message }
                };
              }
            }
          },
          {
            id: '2',
            name: 'Widget Script Loading',
            test: async () => {
              try {
                const response = await fetch('https://widget.storyslip.com/embed.js');
                return {
                  passed: response.ok,
                  message: response.ok ? 'Widget script loads successfully' : 'Widget script failed to load',
                  details: { status: response.status }
                };
              } catch (error) {
                return {
                  passed: false,
                  message: 'Failed to load widget script',
                  details: { error: error.message }
                };
              }
            }
          }
        ]
      }
    ]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'hard': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'easy': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (selectedCategory !== 'all' && issue.category !== selectedCategory) return false;
    if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) return false;
    if (searchQuery && !issue.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !issue.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (selectedIssue) {
    return (
      <IssueDetailView 
        issue={selectedIssue} 
        onBack={() => setSelectedIssue(null)}
        className={className}
      />
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Troubleshooting Guide</h1>
            <p className="text-gray-600 mt-1">Find solutions to common issues and problems</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
              Export Guide
            </Button>
            <Button variant="outline" leftIcon={<Share className="h-4 w-4" />}>
              Share
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'browse'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Browse Issues
          </button>
          <button
            onClick={() => setActiveTab('diagnose')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'diagnose'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Run Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('guided')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'guided'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Guided Troubleshooting
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 p-6 overflow-y-auto">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'browse' && (
            <BrowseIssues 
              issues={filteredIssues}
              onSelectIssue={setSelectedIssue}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'diagnose' && (
            <DiagnosticTests tests={diagnosticTests} />
          )}
          {activeTab === 'guided' && (
            <GuidedTroubleshooting />
          )}
        </div>
      </div>
    </div>
  );
}

function BrowseIssues({ 
  issues, 
  onSelectIssue, 
  isLoading 
}: { 
  issues: TroubleshootingIssue[]; 
  onSelectIssue: (issue: TroubleshootingIssue) => void;
  isLoading: boolean;
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'hard': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'easy': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No issues found</h3>
        <p className="text-gray-600">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        {issues.map((issue) => (
          <Card 
            key={issue.id} 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelectIssue(issue)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 mb-2">
                    {issue.title}
                  </h3>
                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {issue.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge className={`border ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </Badge>
                  <Badge className={getDifficultyColor(issue.difficulty)}>
                    {issue.difficulty}
                  </Badge>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {issue.estimatedTime} min
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {issue.helpful}
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {issue.views}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {issue.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {issue.tags.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{issue.tags.length - 4}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DiagnosticTests({ tests }: { tests: DiagnosticTest[] }) {
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());

  const runDiagnosticTest = async (test: DiagnosticTest) => {
    setRunningTests(prev => new Set([...prev, test.id]));
    
    const results = [];
    for (const step of test.steps) {
      try {
        const result = await step.test();
        results.push({ stepId: step.id, ...result });
      } catch (error) {
        results.push({
          stepId: step.id,
          passed: false,
          message: 'Test failed to execute',
          details: { error: error.message }
        });
      }
    }
    
    setTestResults(prev => new Map([...prev, [test.id, results]]));
    setRunningTests(prev => {
      const newSet = new Set(prev);
      newSet.delete(test.id);
      return newSet;
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Diagnostic Tests</h2>
        <p className="text-gray-600">
          Run automated tests to identify common issues with your StorySlip integration.
        </p>
      </div>

      <div className="space-y-4">
        {tests.map((test) => {
          const isRunning = runningTests.has(test.id);
          const results = testResults.get(test.id);
          
          return (
            <Card key={test.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {test.name}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {test.description}
                    </p>
                    <Badge variant="secondary">
                      {test.automated ? 'Automated' : 'Manual'}
                    </Badge>
                  </div>
                  
                  <Button
                    onClick={() => runDiagnosticTest(test)}
                    disabled={isRunning}
                    leftIcon={isRunning ? <LoadingSpinner size="sm" /> : <Play className="h-4 w-4" />}
                  >
                    {isRunning ? 'Running...' : 'Run Test'}
                  </Button>
                </div>

                {results && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Test Results</h4>
                    <div className="space-y-2">
                      {results.map((result: any, index: number) => {
                        const step = test.steps.find(s => s.id === result.stepId);
                        return (
                          <div
                            key={index}
                            className={`flex items-start space-x-3 p-3 rounded-lg ${
                              result.passed ? 'bg-green-50' : 'bg-red-50'
                            }`}
                          >
                            {result.passed ? (
                              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">
                                {step?.name}
                              </h5>
                              <p className={`text-sm ${
                                result.passed ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {result.message}
                              </p>
                              {result.details && (
                                <details className="mt-2">
                                  <summary className="text-xs text-gray-500 cursor-pointer">
                                    View Details
                                  </summary>
                                  <pre className="text-xs text-gray-600 mt-1 bg-gray-100 p-2 rounded overflow-x-auto">
                                    {JSON.stringify(result.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function GuidedTroubleshooting() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const questions = [
    {
      id: 0,
      question: "What type of issue are you experiencing?",
      options: [
        { value: 'widget-not-showing', label: 'Widget is not showing on my website' },
        { value: 'content-not-loading', label: 'Content is not loading in the widget' },
        { value: 'styling-issues', label: 'Widget styling or appearance issues' },
        { value: 'performance-issues', label: 'Widget is loading slowly' },
        { value: 'mobile-issues', label: 'Issues on mobile devices' },
        { value: 'other', label: 'Other issue' }
      ]
    },
    {
      id: 1,
      question: "When did you first notice this issue?",
      options: [
        { value: 'just-now', label: 'Just now / Today' },
        { value: 'few-days', label: 'A few days ago' },
        { value: 'week-ago', label: 'About a week ago' },
        { value: 'longer', label: 'Longer than a week ago' }
      ]
    },
    {
      id: 2,
      question: "Have you made any recent changes to your website or widget configuration?",
      options: [
        { value: 'yes-website', label: 'Yes, I updated my website' },
        { value: 'yes-widget', label: 'Yes, I changed widget settings' },
        { value: 'yes-both', label: 'Yes, I changed both' },
        { value: 'no-changes', label: 'No, I haven\'t made any changes' }
      ]
    }
  ];

  const handleAnswer = (questionId: number, answer: string) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, answer);
    setAnswers(newAnswers);

    if (questionId < questions.length - 1) {
      setCurrentStep(questionId + 1);
    } else {
      generateRecommendations(newAnswers);
    }
  };

  const generateRecommendations = (userAnswers: Map<number, string>) => {
    const issueType = userAnswers.get(0);
    const timing = userAnswers.get(1);
    const changes = userAnswers.get(2);

    const recs = [];

    if (issueType === 'widget-not-showing') {
      recs.push('Check that the widget embed code is properly placed in your HTML');
      recs.push('Verify that there are no JavaScript errors in your browser console');
      if (changes === 'yes-website' || changes === 'yes-both') {
        recs.push('Review recent website changes that might conflict with the widget');
      }
    } else if (issueType === 'content-not-loading') {
      recs.push('Verify that your content is published and not in draft status');
      recs.push('Check your internet connection and try refreshing the page');
      if (timing === 'just-now') {
        recs.push('There might be a temporary service issue - try again in a few minutes');
      }
    } else if (issueType === 'styling-issues') {
      recs.push('Check for CSS conflicts between your website styles and the widget');
      recs.push('Review your widget customization settings in the dashboard');
      recs.push('Try temporarily disabling other CSS frameworks or plugins');
    }

    setRecommendations(recs);
  };

  const resetGuide = () => {
    setCurrentStep(0);
    setAnswers(new Map());
    setRecommendations([]);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Guided Troubleshooting</h2>
          <p className="text-gray-600">
            Answer a few questions to get personalized troubleshooting recommendations.
          </p>
        </div>

        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Question {currentStep + 1} of {questions.length}
                  </h3>
                  <div className="text-sm text-gray-500">
                    {Math.round(((currentStep + 1) / questions.length) * 100)}% complete
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {questions[currentStep].question}
                </h4>
                <div className="space-y-2">
                  {questions[currentStep].options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(currentStep, option.value)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  leftIcon={<ChevronRight className="h-4 w-4 rotate-180" />}
                >
                  Previous Question
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Recommendations Ready
                </h3>
                <p className="text-gray-600">
                  Based on your answers, here are some steps to try:
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-gray-700">{rec}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center space-x-3">
                <Button onClick={resetGuide} leftIcon={<RotateCcw className="h-4 w-4" />}>
                  Start Over
                </Button>
                <Button variant="outline" leftIcon={<MessageSquare className="h-4 w-4" />}>
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function IssueDetailView({ 
  issue, 
  onBack, 
  className = '' 
}: { 
  issue: TroubleshootingIssue; 
  onBack: () => void; 
  className?: string; 
}) {
  const [selectedSolution, setSelectedSolution] = useState<TroubleshootingSolution | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isHelpful, setIsHelpful] = useState<boolean | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'hard': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'easy': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleStepCompletion = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const handleFeedback = async (helpful: boolean) => {
    setIsHelpful(helpful);
    try {
      await api.post(`/troubleshooting/issues/${issue.id}/feedback`, {
        helpful
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  if (selectedSolution) {
    return (
      <SolutionDetailView
        solution={selectedSolution}
        onBack={() => setSelectedSolution(null)}
        completedSteps={completedSteps}
        onToggleStep={toggleStepCompletion}
        className={className}
      />
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} leftIcon={<ChevronRight className="h-4 w-4 rotate-180" />}>
          Back to Issues
        </Button>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" leftIcon={<Copy className="h-4 w-4" />}>
            Copy Link
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Share className="h-4 w-4" />}>
            Share
          </Button>
        </div>
      </div>

      {/* Issue Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{issue.title}</h1>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Badge className={`border ${getSeverityColor(issue.severity)}`}>
              {issue.severity} severity
            </Badge>
            <Badge className={getDifficultyColor(issue.difficulty)}>
              {issue.difficulty}
            </Badge>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              ~{issue.estimatedTime} minutes
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {issue.views} views
            </div>
            <span>Updated {new Date(issue.lastUpdated).toLocaleDateString()}</span>
          </div>
        </div>

        <p className="text-lg text-gray-600 mb-6">{issue.description}</p>

        <div className="flex flex-wrap gap-2">
          {issue.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      {/* Symptoms */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Symptoms</h2>
        <ul className="space-y-2">
          {issue.symptoms.map((symptom, index) => (
            <li key={index} className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{symptom}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Possible Causes */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Possible Causes</h2>
        <ul className="space-y-2">
          {issue.causes.map((cause, index) => (
            <li key={index} className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{cause}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Solutions */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Solutions</h2>
        <div className="space-y-4">
          {issue.solutions.map((solution) => (
            <Card 
              key={solution.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedSolution(solution)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {solution.title}
                    </h3>
                    <div className="flex items-center space-x-4 mb-3">
                      <Badge className={getDifficultyColor(solution.difficulty)}>
                        {solution.difficulty}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        ~{solution.estimatedTime} min
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                        {solution.successRate}% success rate
                      </div>
                    </div>
                    <p className="text-gray-600">
                      {solution.steps.length} steps to complete
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Feedback */}
      <section className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Was this helpful?</span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={isHelpful === true ? 'default' : 'outline'}
                onClick={() => handleFeedback(true)}
                leftIcon={<ThumbsUp className="h-4 w-4" />}
              >
                {issue.helpful}
              </Button>
              <Button
                size="sm"
                variant={isHelpful === false ? 'default' : 'outline'}
                onClick={() => handleFeedback(false)}
                leftIcon={<ThumbsDown className="h-4 w-4" />}
              >
                {issue.notHelpful}
              </Button>
            </div>
          </div>
          
          <Button variant="outline" leftIcon={<MessageSquare className="h-4 w-4" />}>
            Contact Support
          </Button>
        </div>
      </section>
    </div>
  );
}

function SolutionDetailView({
  solution,
  onBack,
  completedSteps,
  onToggleStep,
  className = ''
}: {
  solution: TroubleshootingSolution;
  onBack: () => void;
  completedSteps: Set<string>;
  onToggleStep: (stepId: string) => void;
  className?: string;
}) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'hard': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'easy': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'action': return Play;
      case 'check': return CheckCircle;
      case 'code': return Code;
      case 'info': return Info;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'action': return 'text-blue-600';
      case 'check': return 'text-green-600';
      case 'code': return 'text-purple-600';
      case 'info': return 'text-gray-600';
      case 'warning': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const completedCount = solution.steps.filter(step => completedSteps.has(step.id)).length;
  const progress = (completedCount / solution.steps.length) * 100;

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} leftIcon={<ChevronRight className="h-4 w-4 rotate-180" />}>
          Back to Issue
        </Button>
      </div>

      {/* Solution Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{solution.title}</h1>
        
        <div className="flex items-center space-x-4 mb-4">
          <Badge className={getDifficultyColor(solution.difficulty)}>
            {solution.difficulty}
          </Badge>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            ~{solution.estimatedTime} minutes
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
            {solution.successRate}% success rate
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {completedCount} of {solution.steps.length} steps completed
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Requirements */}
        {solution.requirements && solution.requirements.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-blue-900 mb-2">Requirements</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              {solution.requirements.map((req, index) => (
                <li key={index}>• {req}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {solution.warnings && solution.warnings.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-orange-900 mb-2">⚠️ Important Warnings</h3>
            <ul className="text-sm text-orange-800 space-y-1">
              {solution.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </header>

      {/* Steps */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Solution Steps</h2>
        <div className="space-y-6">
          {solution.steps.map((step, index) => {
            const StepIcon = getStepIcon(step.type);
            const isCompleted = completedSteps.has(step.id);
            
            return (
              <Card key={step.id} className={isCompleted ? 'bg-green-50 border-green-200' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => onToggleStep(step.id)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isCompleted
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </button>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <StepIcon className={`h-4 w-4 ${getStepColor(step.type)}`} />
                        <h3 className={`font-semibold ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                          {step.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {step.type}
                        </Badge>
                      </div>
                      
                      <p className={`mb-4 ${isCompleted ? 'text-green-800' : 'text-gray-700'}`}>
                        {step.description}
                      </p>
                      
                      {step.content && (
                        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-4">
                          {step.type === 'code' ? (
                            <pre className="text-sm text-gray-800 overflow-x-auto">
                              <code>{step.content}</code>
                            </pre>
                          ) : (
                            <p className="text-sm text-gray-800">{step.content}</p>
                          )}
                          {step.type === 'code' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              leftIcon={<Copy className="h-4 w-4" />}
                              onClick={() => navigator.clipboard.writeText(step.content || '')}
                            >
                              Copy Code
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {step.expectedResult && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                          <h4 className="text-sm font-medium text-green-900 mb-1">Expected Result:</h4>
                          <p className="text-sm text-green-800">{step.expectedResult}</p>
                        </div>
                      )}
                      
                      {step.troubleshooting && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-yellow-900 mb-1">If this doesn't work:</h4>
                          <p className="text-sm text-yellow-800">{step.troubleshooting}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Completion */}
      {progress === 100 && (
        <div className="mt-8 text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Solution Completed! 🎉
            </h3>
            <p className="text-green-800 mb-4">
              You've completed all steps in this solution. Your issue should now be resolved.
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Button leftIcon={<ThumbsUp className="h-4 w-4" />}>
                This Worked
              </Button>
              <Button variant="outline" leftIcon={<MessageSquare className="h-4 w-4" />}>
                Still Need Help
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink,
  Code,
  Globe,
  Clock,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { formatRelativeTime } from '../../lib/utils';

interface TestResult {
  id: string;
  test_name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: string;
  execution_time?: number;
}

interface IntegrationTestResult {
  overall_status: 'passed' | 'failed' | 'warning';
  tests: TestResult[];
  tested_at: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  warnings: number;
  performance_score?: number;
}

interface IntegrationTesterProps {
  websiteId: string;
  websiteDomain: string;
  lastTestResult?: IntegrationTestResult | null;
  onTest: () => Promise<IntegrationTestResult>;
  loading?: boolean;
}

const TEST_DESCRIPTIONS = {
  'domain_accessibility': 'Checks if the website domain is accessible',
  'cors_headers': 'Verifies CORS headers allow widget embedding',
  'widget_script_load': 'Tests if the widget script loads successfully',
  'widget_initialization': 'Validates widget initialization and configuration',
  'content_delivery': 'Tests content loading and display functionality',
  'responsive_design': 'Checks widget responsiveness across devices',
  'performance': 'Measures widget loading and rendering performance',
  'security': 'Validates security headers and HTTPS configuration',
};

export function IntegrationTester({
  websiteId,
  websiteDomain,
  lastTestResult,
  onTest,
  loading = false,
}: IntegrationTesterProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const handleRunTest = async () => {
    setIsRunning(true);
    setCurrentTest('Starting tests...');
    
    try {
      const result = await onTest();
      
      if (result.overall_status === 'passed') {
        success('Integration test completed successfully!');
      } else if (result.overall_status === 'warning') {
        success('Integration test completed with warnings');
      } else {
        showError('Integration test failed. Please check the results below.');
      }
    } catch (error: any) {
      showError(error.message || 'Failed to run integration test');
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPerformanceGrade = (score?: number) => {
    if (!score) return 'N/A';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Integration Testing
          </CardTitle>
          <div className="flex items-center space-x-3">
            {lastTestResult && (
              <span className="text-sm text-gray-500">
                Last tested {formatRelativeTime(lastTestResult.tested_at)}
              </span>
            )}
            <Button
              onClick={handleRunTest}
              loading={loading || isRunning}
              disabled={loading || isRunning}
              leftIcon={<Play className="h-4 w-4" />}
            >
              {isRunning ? 'Running Tests...' : 'Run Integration Test'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Website Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <Globe className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Testing Domain</p>
              <p className="text-sm text-gray-500">{websiteDomain}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(websiteDomain, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Test Status */}
          {isRunning && currentTest && (
            <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-blue-800">{currentTest}</span>
            </div>
          )}

          {/* Test Results */}
          {lastTestResult && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className={`p-4 rounded-lg border ${getOverallStatusColor(lastTestResult.overall_status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(lastTestResult.overall_status)}
                    <div>
                      <h3 className="text-sm font-medium">
                        Integration Status: {lastTestResult.overall_status.charAt(0).toUpperCase() + lastTestResult.overall_status.slice(1)}
                      </h3>
                      <p className="text-sm opacity-75">
                        {lastTestResult.passed_tests}/{lastTestResult.total_tests} tests passed
                        {lastTestResult.warnings > 0 && `, ${lastTestResult.warnings} warnings`}
                      </p>
                    </div>
                  </div>
                  
                  {lastTestResult.performance_score && (
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {getPerformanceGrade(lastTestResult.performance_score)}
                      </div>
                      <div className="text-xs opacity-75">
                        Performance: {lastTestResult.performance_score}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Results List */}
              <div className="space-y-3">
                {lastTestResult.tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(test.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {TEST_DESCRIPTIONS[test.test_name as keyof typeof TEST_DESCRIPTIONS] || test.test_name}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {test.execution_time && (
                            <span className="text-xs text-gray-500">
                              {test.execution_time}ms
                            </span>
                          )}
                          <Badge variant={getStatusBadgeVariant(test.status)} size="sm">
                            {test.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {test.message}
                      </p>
                      
                      {test.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            View details
                          </summary>
                          <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono text-gray-700">
                            {test.details}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Need help fixing integration issues?
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/docs/integration-guide', '_blank')}
                  >
                    <Code className="h-4 w-4 mr-1" />
                    View Guide
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunTest}
                    loading={loading || isRunning}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retest
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* No Test Results */}
          {!lastTestResult && !isRunning && (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Integration Tests Run
              </h3>
              <p className="text-gray-500 mb-4">
                Run your first integration test to verify your website setup.
              </p>
              <Button onClick={handleRunTest} loading={loading}>
                <Play className="h-4 w-4 mr-2" />
                Run First Test
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
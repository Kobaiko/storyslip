import { IntegrationService } from '../integration.service';
import { HelperUtil } from '../../utils/helpers';

// Mock helper utilities
jest.mock('../../utils/helpers');
const mockHelperUtil = HelperUtil as jest.Mocked<typeof HelperUtil>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('IntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('testWebsiteIntegration', () => {
    const mockDomain = 'example.com';
    const mockApiKey = 'a'.repeat(64); // 64 character hex string

    beforeEach(() => {
      mockHelperUtil.isValidDomain.mockReturnValue(true);
    });

    it('should run all integration tests successfully', async () => {
      // Mock successful responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response) // Domain accessibility HTTPS
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response) // Widget script accessibility
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response); // SSL configuration

      const result = await IntegrationService.testWebsiteIntegration(mockDomain, mockApiKey);

      expect(result.status).toBe('success');
      expect(result.tests).toHaveLength(6);
      expect(result.overallScore).toBe(100);
      expect(result.duration).toBeGreaterThan(0);
      
      // Check that all tests passed
      const passedTests = result.tests.filter(test => test.status === 'passed');
      expect(passedTests).toHaveLength(6);
    });

    it('should handle domain validation failure', async () => {
      mockHelperUtil.isValidDomain.mockReturnValue(false);

      const result = await IntegrationService.testWebsiteIntegration('invalid-domain', mockApiKey);

      expect(result.status).toBe('failed');
      const domainTest = result.tests.find(test => test.name === 'Domain Format Validation');
      expect(domainTest?.status).toBe('failed');
      expect(domainTest?.message).toBe('Domain format is invalid');
    });

    it('should handle API key format validation failure', async () => {
      const invalidApiKey = 'invalid-key';

      const result = await IntegrationService.testWebsiteIntegration(mockDomain, invalidApiKey);

      expect(result.status).toBe('failed');
      const apiKeyTest = result.tests.find(test => test.name === 'API Key Format');
      expect(apiKeyTest?.status).toBe('failed');
      expect(apiKeyTest?.message).toBe('API key format is invalid');
    });

    it('should handle domain accessibility issues', async () => {
      // Mock failed responses for both HTTPS and HTTP
      mockFetch
        .mockRejectedValueOnce(new Error('Connection refused')) // HTTPS
        .mockRejectedValueOnce(new Error('Connection refused')) // HTTP
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response) // Widget script (should still work)
        .mockRejectedValueOnce(new Error('Connection refused')); // SSL test

      const result = await IntegrationService.testWebsiteIntegration(mockDomain, mockApiKey);

      expect(result.status).toBe('warning');
      const accessibilityTest = result.tests.find(test => test.name === 'Domain Accessibility');
      expect(accessibilityTest?.status).toBe('warning');
      expect(accessibilityTest?.message).toBe('Domain accessibility could not be verified');
    });

    it('should handle widget script accessibility issues', async () => {
      // Mock domain accessibility success but widget script failure
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response) // Domain accessibility
        .mockRejectedValueOnce(new Error('Script not found')) // Widget script
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response); // SSL test

      const result = await IntegrationService.testWebsiteIntegration(mockDomain, mockApiKey);

      expect(result.status).toBe('warning');
      const widgetTest = result.tests.find(test => test.name === 'Widget Script Accessibility');
      expect(widgetTest?.status).toBe('warning');
      expect(widgetTest?.message).toBe('Widget script accessibility could not be verified');
    });

    it('should handle mixed test results', async () => {
      // Mock some successful and some failed responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response) // Domain accessibility - success
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response) // Widget script - warning
        .mockRejectedValueOnce(new Error('SSL error')); // SSL test - warning

      const result = await IntegrationService.testWebsiteIntegration(mockDomain, mockApiKey);

      expect(result.status).toBe('warning');
      expect(result.overallScore).toBeLessThan(100);
      expect(result.overallScore).toBeGreaterThan(0);

      const passedTests = result.tests.filter(test => test.status === 'passed');
      const warningTests = result.tests.filter(test => test.status === 'warning');
      
      expect(passedTests.length).toBeGreaterThan(0);
      expect(warningTests.length).toBeGreaterThan(0);
    });

    it('should handle timeout scenarios', async () => {
      // Mock a timeout scenario
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 15000);
        })
      );

      // Fast-forward time to trigger timeout
      const testPromise = IntegrationService.testWebsiteIntegration(mockDomain, mockApiKey);
      jest.advanceTimersByTime(15000);

      const result = await testPromise;

      expect(result.status).toBe('warning');
      const accessibilityTest = result.tests.find(test => test.name === 'Domain Accessibility');
      expect(accessibilityTest?.status).toBe('warning');
    });

    it('should handle complete test suite failure', async () => {
      // Mock an error that causes the entire test suite to fail
      mockHelperUtil.isValidDomain.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await IntegrationService.testWebsiteIntegration(mockDomain, mockApiKey);

      expect(result.status).toBe('failed');
      expect(result.overallScore).toBe(0);
      
      const suiteTest = result.tests.find(test => test.name === 'Test Suite Execution');
      expect(suiteTest?.status).toBe('failed');
      expect(suiteTest?.message).toBe('Integration test suite encountered an error');
    });

    it('should test both HTTP and HTTPS for domain accessibility', async () => {
      // Mock HTTPS failure but HTTP success
      mockFetch
        .mockRejectedValueOnce(new Error('HTTPS failed')) // HTTPS
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response) // HTTP - success
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response) // Widget script
        .mockRejectedValueOnce(new Error('SSL failed')); // SSL test

      const result = await IntegrationService.testWebsiteIntegration(mockDomain, mockApiKey);

      const accessibilityTest = result.tests.find(test => test.name === 'Domain Accessibility');
      expect(accessibilityTest?.status).toBe('passed');
      expect(accessibilityTest?.details?.accessibleUrl).toBe(`http://${mockDomain}`);
    });

    it('should validate API key format correctly', async () => {
      const testCases = [
        { key: 'a'.repeat(64), valid: true }, // Valid 64-char hex
        { key: 'A'.repeat(64), valid: false }, // Uppercase not allowed
        { key: 'a'.repeat(63), valid: false }, // Too short
        { key: 'a'.repeat(65), valid: false }, // Too long
        { key: 'g'.repeat(64), valid: false }, // Invalid hex character
        { key: '', valid: false }, // Empty
      ];

      for (const testCase of testCases) {
        const result = await IntegrationService.testWebsiteIntegration(mockDomain, testCase.key);
        
        const apiKeyTest = result.tests.find(test => test.name === 'API Key Format');
        if (testCase.valid) {
          expect(apiKeyTest?.status).toBe('passed');
        } else {
          expect(apiKeyTest?.status).toBe('failed');
        }
      }
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for failed domain accessibility', () => {
      const testSuite = {
        status: 'warning' as const,
        tests: [
          {
            name: 'Domain Accessibility',
            status: 'failed' as const,
            message: 'Domain not accessible',
          }
        ],
        timestamp: '2024-01-01T00:00:00Z',
        duration: 1000,
        overallScore: 50,
      };

      const recommendations = IntegrationService.generateRecommendations(testSuite);

      expect(recommendations).toContain('Ensure your domain is accessible and not blocked by firewalls');
      expect(recommendations).toContain('Check that your website is properly deployed and running');
    });

    it('should generate recommendations for SSL issues', () => {
      const testSuite = {
        status: 'warning' as const,
        tests: [
          {
            name: 'SSL/HTTPS Configuration',
            status: 'warning' as const,
            message: 'SSL issues detected',
          }
        ],
        timestamp: '2024-01-01T00:00:00Z',
        duration: 1000,
        overallScore: 80,
      };

      const recommendations = IntegrationService.generateRecommendations(testSuite);

      expect(recommendations).toContain('Consider enabling HTTPS for better security and SEO');
      expect(recommendations).toContain('Ensure SSL certificate is properly configured');
    });

    it('should generate recommendations for widget script issues', () => {
      const testSuite = {
        status: 'warning' as const,
        tests: [
          {
            name: 'Widget Script Accessibility',
            status: 'failed' as const,
            message: 'Widget script not accessible',
          }
        ],
        timestamp: '2024-01-01T00:00:00Z',
        duration: 1000,
        overallScore: 70,
      };

      const recommendations = IntegrationService.generateRecommendations(testSuite);

      expect(recommendations).toContain('Check your network connection and firewall settings');
      expect(recommendations).toContain('Ensure the StorySlip CDN is accessible from your location');
    });

    it('should generate recommendations for API key issues', () => {
      const testSuite = {
        status: 'failed' as const,
        tests: [
          {
            name: 'API Key Format',
            status: 'failed' as const,
            message: 'Invalid API key format',
          }
        ],
        timestamp: '2024-01-01T00:00:00Z',
        duration: 1000,
        overallScore: 30,
      };

      const recommendations = IntegrationService.generateRecommendations(testSuite);

      expect(recommendations).toContain('Regenerate your API key if it appears to be corrupted');
      expect(recommendations).toContain('Contact support if API key issues persist');
    });

    it('should generate recommendations based on overall score', () => {
      const lowScoreTestSuite = {
        status: 'failed' as const,
        tests: [],
        timestamp: '2024-01-01T00:00:00Z',
        duration: 1000,
        overallScore: 50,
      };

      const recommendations = IntegrationService.generateRecommendations(lowScoreTestSuite);

      expect(recommendations).toContain('Review the failed tests and address the underlying issues');
      expect(recommendations).toContain('Consider testing integration again after making necessary changes');
    });

    it('should generate success recommendations for perfect score', () => {
      const perfectTestSuite = {
        status: 'success' as const,
        tests: [],
        timestamp: '2024-01-01T00:00:00Z',
        duration: 1000,
        overallScore: 100,
      };

      const recommendations = IntegrationService.generateRecommendations(perfectTestSuite);

      expect(recommendations).toContain('Great! Your integration is ready to go');
      expect(recommendations).toContain('You can now start creating content for your website');
    });

    it('should handle empty test results', () => {
      const emptyTestSuite = {
        status: 'success' as const,
        tests: [],
        timestamp: '2024-01-01T00:00:00Z',
        duration: 1000,
        overallScore: 100,
      };

      const recommendations = IntegrationService.generateRecommendations(emptyTestSuite);

      expect(recommendations).toHaveLength(2); // Should have success recommendations
      expect(recommendations).toContain('Great! Your integration is ready to go');
    });
  });
});
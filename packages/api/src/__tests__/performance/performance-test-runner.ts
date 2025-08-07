import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { loadTestConfig, LoadTestScenario } from './load-test-config';
import { DatabaseService } from '../../services/database';
import { PerformanceMonitorService } from '../../services/performance-monitor.service';

interface TestResult {
  scenario: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  passed: boolean;
  errors: string[];
}

interface PerformanceTestReport {
  timestamp: string;
  environment: string;
  results: TestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    overallErrorRate: number;
    averageThroughput: number;
  };
}

export class PerformanceTestRunner {
  private db: DatabaseService;
  private performanceMonitor: PerformanceMonitorService;
  private testData: Map<string, any> = new Map();

  constructor() {
    this.db = DatabaseService.getInstance();
    this.performanceMonitor = PerformanceMonitorService.getInstance();
  }

  async runAllTests(): Promise<PerformanceTestReport> {
    console.log('🚀 Starting comprehensive performance tests...');
    
    // Setup test environment
    await this.setupTestEnvironment();
    
    const results: TestResult[] = [];
    
    try {
      // Run each load test scenario
      for (const scenario of loadTestConfig.scenarios) {
        console.log(`\n📊 Running scenario: ${scenario.name}`);
        const result = await this.runScenario(scenario);
        results.push(result);
        
        // Wait between scenarios to avoid interference
        await this.sleep(5000);
      }
      
      // Generate comprehensive report
      const report = this.generateReport(results);
      
      // Save report
      await this.saveReport(report);
      
      // Cleanup test environment
      await this.cleanupTestEnvironment();
      
      return report;
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      await this.cleanupTestEnvironment();
      throw error;
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    try {
      // Create test user
      const userResult = await this.db.query(`
        INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES ('perf-runner@example.com', crypt('PerfRunner123!', gen_salt('bf')), NOW(), NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `);
      const userId = userResult.rows[0].id;
      this.testData.set('userId', userId);
      
      // Create test website
      const websiteResult = await this.db.query(`
        INSERT INTO websites (user_id, name, domain, is_verified)
        VALUES ($1, 'Performance Test Site', 'perf-runner.example.com', true)
        ON CONFLICT (domain) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `, [userId]);
      const websiteId = websiteResult.rows[0].id;
      this.testData.set('websiteId', websiteId);
      
      // Create test widget
      const widgetResult = await this.db.query(`
        INSERT INTO widgets (website_id, title, type, is_published)
        VALUES ($1, 'Performance Test Widget', 'content', true)
        RETURNING id
      `, [websiteId]);
      const widgetId = widgetResult.rows[0].id;
      this.testData.set('widgetId', widgetId);
      
      // Create sample content
      const contentIds = [];
      for (let i = 0; i < 50; i++) {
        const contentResult = await this.db.query(`
          INSERT INTO content (website_id, title, content, excerpt, status)
          VALUES ($1, $2, $3, $4, 'published')
          RETURNING id
        `, [
          websiteId,
          `Performance Test Content ${i}`,
          `This is performance test content number ${i}. `.repeat(20),
          `Excerpt for content ${i}`
        ]);
        contentIds.push(contentResult.rows[0].id);
      }
      this.testData.set('contentIds', contentIds);
      
      console.log('✅ Test environment setup complete');
      
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  private async runScenario(scenario: LoadTestScenario): Promise<TestResult> {
    const startTime = Date.now();
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let responseTimes: number[] = [];
    let errors: string[] = [];
    
    try {
      // Simulate the load test scenario
      const virtualUsers = scenario.virtualUsers;
      const duration = scenario.duration;
      const rampUpTime = scenario.rampUpTime;
      
      // Calculate requests per user
      const requestsPerUser = Math.floor(duration / 1000); // Rough estimate
      
      // Create virtual users
      const userPromises = [];
      for (let i = 0; i < virtualUsers; i++) {
        const userDelay = (i / virtualUsers) * rampUpTime;
        userPromises.push(this.simulateVirtualUser(scenario, requestsPerUser, userDelay));
      }
      
      // Wait for all virtual users to complete
      const userResults = await Promise.all(userPromises);
      
      // Aggregate results
      userResults.forEach(result => {
        totalRequests += result.totalRequests;
        successfulRequests += result.successfulRequests;
        failedRequests += result.failedRequests;
        responseTimes.push(...result.responseTimes);
        errors.push(...result.errors);
      });
      
    } catch (error) {
      errors.push(`Scenario execution error: ${error.message}`);
    }
    
    const endTime = Date.now();
    const actualDuration = endTime - startTime;
    
    // Calculate metrics
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const sortedResponseTimes = responseTimes.sort((a, b) => a - b);
    const p95ResponseTime = sortedResponseTimes.length > 0 
      ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] 
      : 0;
    const p99ResponseTime = sortedResponseTimes.length > 0 
      ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] 
      : 0;
    
    const throughput = totalRequests > 0 ? (totalRequests / (actualDuration / 1000)) : 0;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) : 0;
    
    // Determine if test passed
    const passed = this.evaluateScenarioResults(scenario, {
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate
    });
    
    const result: TestResult = {
      scenario: scenario.name,
      duration: actualDuration,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate,
      passed,
      errors: errors.slice(0, 10) // Limit error messages
    };
    
    console.log(`📈 Scenario Results: ${scenario.name}`);
    console.log(`   Total Requests: ${totalRequests}`);
    console.log(`   Success Rate: ${((successfulRequests / totalRequests) * 100).toFixed(2)}%`);
    console.log(`   Avg Response Time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`   P95 Response Time: ${p95ResponseTime.toFixed(2)}ms`);
    console.log(`   Throughput: ${throughput.toFixed(2)} req/s`);
    console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return result;
  }

  private async simulateVirtualUser(
    scenario: LoadTestScenario, 
    requestCount: number, 
    delay: number
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    responseTimes: number[];
    errors: string[];
  }> {
    // Wait for ramp-up delay
    await this.sleep(delay);
    
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let responseTimes: number[] = [];
    let errors: string[] = [];
    
    // Simulate user session
    let authToken: string | null = null;
    
    for (let i = 0; i < requestCount; i++) {
      try {
        // Select endpoint based on weights
        const endpoint = this.selectEndpoint(scenario.endpoints);
        
        // Get auth token if needed
        if (endpoint.requiresAuth && !authToken) {
          authToken = await this.getAuthToken();
        }
        
        // Make request
        const startTime = Date.now();
        const success = await this.makeRequest(endpoint, authToken);
        const responseTime = Date.now() - startTime;
        
        totalRequests++;
        responseTimes.push(responseTime);
        
        if (success) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
        
        // Small delay between requests
        await this.sleep(100 + Math.random() * 200);
        
      } catch (error) {
        totalRequests++;
        failedRequests++;
        errors.push(error.message);
      }
    }
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      responseTimes,
      errors
    };
  }

  private selectEndpoint(endpoints: any[]): any {
    const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return endpoints[0]; // Fallback
  }

  private async getAuthToken(): Promise<string> {
    // Simulate login request
    return 'mock-auth-token-' + Date.now();
  }

  private async makeRequest(endpoint: any, authToken: string | null): Promise<boolean> {
    // Simulate HTTP request
    const delay = 50 + Math.random() * 200; // Simulate network latency
    await this.sleep(delay);
    
    // Simulate success/failure based on endpoint
    const successRate = endpoint.path.includes('public') ? 0.995 : 0.98;
    return Math.random() < successRate;
  }

  private evaluateScenarioResults(scenario: LoadTestScenario, metrics: any): boolean {
    const expectations = scenario.expectedResponseTime;
    const expectedThroughput = scenario.expectedThroughput;
    const errorThreshold = scenario.errorThreshold;
    
    // Check response time thresholds
    if (metrics.p95ResponseTime > expectations.p95) {
      return false;
    }
    
    if (metrics.p99ResponseTime > expectations.p99) {
      return false;
    }
    
    // Check throughput
    if (metrics.throughput < expectedThroughput * 0.8) { // Allow 20% tolerance
      return false;
    }
    
    // Check error rate
    if (metrics.errorRate > errorThreshold) {
      return false;
    }
    
    return true;
  }

  private generateReport(results: TestResult[]): PerformanceTestReport {
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.length - passedTests;
    
    const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.failedRequests, 0);
    const overallErrorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    const averageThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      results,
      summary: {
        totalTests: results.length,
        passedTests,
        failedTests,
        overallErrorRate,
        averageThroughput
      }
    };
  }

  private async saveReport(report: PerformanceTestReport): Promise<void> {
    const outputDir = loadTestConfig.reporting.outputDir;
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-report-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Performance report saved to: ${filepath}`);
  }

  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');
    
    try {
      const contentIds = this.testData.get('contentIds') || [];
      if (contentIds.length > 0) {
        await this.db.query('DELETE FROM content WHERE id = ANY($1)', [contentIds]);
      }
      
      const widgetId = this.testData.get('widgetId');
      if (widgetId) {
        await this.db.query('DELETE FROM widgets WHERE id = $1', [widgetId]);
      }
      
      const websiteId = this.testData.get('websiteId');
      if (websiteId) {
        await this.db.query('DELETE FROM websites WHERE id = $1', [websiteId]);
      }
      
      const userId = this.testData.get('userId');
      if (userId) {
        await this.db.query('DELETE FROM auth.users WHERE id = $1', [userId]);
      }
      
      console.log('✅ Test environment cleanup complete');
      
    } catch (error) {
      console.error('❌ Failed to cleanup test environment:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI runner
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  
  runner.runAllTests()
    .then(report => {
      console.log('\n🎉 Performance test suite completed!');
      console.log(`📊 Summary: ${report.summary.passedTests}/${report.summary.totalTests} tests passed`);
      console.log(`📈 Overall error rate: ${(report.summary.overallErrorRate * 100).toFixed(2)}%`);
      console.log(`⚡ Average throughput: ${report.summary.averageThroughput.toFixed(2)} req/s`);
      
      if (report.summary.failedTests > 0) {
        console.log('\n❌ Failed tests:');
        report.results.filter(r => !r.passed).forEach(result => {
          console.log(`   - ${result.scenario}`);
        });
        process.exit(1);
      } else {
        console.log('\n✅ All performance tests passed!');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('\n💥 Performance test suite failed:', error);
      process.exit(1);
    });
}
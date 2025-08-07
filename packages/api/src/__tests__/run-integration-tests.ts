#!/usr/bin/env ts-node

import { spawn, ChildProcess } from 'child_process';
import { DatabaseService } from '../services/database';

interface TestSuite {
  name: string;
  pattern: string;
  timeout: number;
  parallel?: boolean;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Unit Tests',
    pattern: 'src/__tests__/unit/**/*.test.ts',
    timeout: 30000,
    parallel: true,
  },
  {
    name: 'Integration Tests',
    pattern: 'src/__tests__/integration/**/*.test.ts',
    timeout: 60000,
    parallel: true,
  },
  {
    name: 'API Tests',
    pattern: 'src/__tests__/**/*.test.ts',
    timeout: 45000,
    parallel: true,
  },
  {
    name: 'E2E Tests',
    pattern: 'src/__tests__/e2e/**/*.e2e.test.ts',
    timeout: 120000,
    parallel: false,
  },
];

class IntegrationTestRunner {
  private db: DatabaseService;
  private processes: ChildProcess[] = [];

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async run() {
    console.log('🚀 Starting StorySlip Integration Test Suite');
    console.log('=' .repeat(60));

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run test suites
      const results = await this.runTestSuites();

      // Generate final report
      await this.generateFinalReport(results);

      // Cleanup
      await this.cleanup();

      // Exit with appropriate code
      const hasFailures = results.some(result => result.failed > 0);
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      console.error('❌ Test runner failed:', error);
      await this.cleanup();
      process.exit(1);
    }
  }

  private async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    try {
      // Verify database connection
      await this.db.query('SELECT 1');
      console.log('✅ Database connection verified');

      // Set test environment variables
      process.env.NODE_ENV = 'test';
      process.env.LOG_LEVEL = 'error';
      process.env.DISABLE_ANALYTICS = 'true';

      // Start required services
      await this.startServices();

      console.log('✅ Test environment setup completed');

    } catch (error) {
      console.error('❌ Test environment setup failed:', error);
      throw error;
    }
  }

  private async startServices() {
    console.log('🚀 Starting required services...');

    // Start API server in test mode
    const apiProcess = spawn('npm', ['run', 'dev'], {
      env: { ...process.env, NODE_ENV: 'test', PORT: '3001' },
      stdio: 'pipe',
    });

    this.processes.push(apiProcess);

    // Wait for API to be ready
    await this.waitForService('http://localhost:3001/api/status', 30000);
    console.log('✅ API server started');

    // Start dashboard in test mode (if needed for E2E tests)
    if (process.env.RUN_E2E_TESTS !== 'false') {
      const dashboardProcess = spawn('npm', ['run', 'dev'], {
        cwd: '../dashboard',
        env: { ...process.env, NODE_ENV: 'test', PORT: '3002' },
        stdio: 'pipe',
      });

      this.processes.push(dashboardProcess);

      // Wait for dashboard to be ready
      await this.waitForService('http://localhost:3002', 30000);
      console.log('✅ Dashboard started');

      // Start marketing site in test mode
      const marketingProcess = spawn('npm', ['run', 'dev'], {
        cwd: '../marketing',
        env: { ...process.env, NODE_ENV: 'test', PORT: '3000' },
        stdio: 'pipe',
      });

      this.processes.push(marketingProcess);

      // Wait for marketing site to be ready
      await this.waitForService('http://localhost:3000', 30000);
      console.log('✅ Marketing site started');
    }
  }

  private async waitForService(url: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Service at ${url} did not start within ${timeout}ms`);
  }

  private async runTestSuites(): Promise<Array<{
    name: string;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  }>> {
    const results = [];

    for (const suite of TEST_SUITES) {
      console.log(`\n🧪 Running ${suite.name}...`);
      console.log('-'.repeat(40));

      const result = await this.runTestSuite(suite);
      results.push(result);

      if (result.failed > 0) {
        console.log(`❌ ${suite.name} had ${result.failed} failures`);
      } else {
        console.log(`✅ ${suite.name} passed (${result.passed} tests)`);
      }
    }

    return results;
  }

  private async runTestSuite(suite: TestSuite): Promise<{
    name: string;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      let command: string[];
      let options: any = {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'test' },
      };

      if (suite.name === 'E2E Tests') {
        // Use Playwright for E2E tests
        command = ['npx', 'playwright', 'test', '--config=playwright.config.ts'];
      } else {
        // Use Jest for other tests
        command = [
          'npx', 'jest',
          '--testPathPattern=' + suite.pattern,
          '--testTimeout=' + suite.timeout,
          '--verbose',
          '--coverage=false',
          '--detectOpenHandles',
          '--forceExit',
        ];

        if (suite.parallel) {
          command.push('--runInBand=false');
        } else {
          command.push('--runInBand');
        }
      }

      const process = spawn(command[0], command.slice(1), options);
      
      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log(data.toString());
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.error(data.toString());
      });

      process.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        // Parse test results from output
        const result = this.parseTestResults(stdout, stderr, suite.name);
        result.duration = duration;

        if (code === 0) {
          resolve(result);
        } else {
          // Don't reject, just mark as failed
          result.failed = result.failed || 1;
          resolve(result);
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private parseTestResults(stdout: string, stderr: string, suiteName: string): {
    name: string;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  } {
    // Basic parsing - in a real implementation, you'd parse the actual test output
    const result = {
      name: suiteName,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };

    // Jest output parsing
    const jestMatch = stdout.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (jestMatch) {
      result.failed = parseInt(jestMatch[1]);
      result.passed = parseInt(jestMatch[2]);
      return result;
    }

    // Playwright output parsing
    const playwrightMatch = stdout.match(/(\d+)\s+passed.*?(\d+)\s+failed/);
    if (playwrightMatch) {
      result.passed = parseInt(playwrightMatch[1]);
      result.failed = parseInt(playwrightMatch[2]);
      return result;
    }

    // Fallback: assume success if no errors in stderr
    if (!stderr.includes('Error') && !stderr.includes('FAIL')) {
      result.passed = 1; // At least one test passed
    } else {
      result.failed = 1; // At least one test failed
    }

    return result;
  }

  private async generateFinalReport(results: Array<{
    name: string;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  }>) {
    console.log('\n📊 Final Test Report');
    console.log('=' .repeat(60));

    const totals = results.reduce((acc, result) => ({
      passed: acc.passed + result.passed,
      failed: acc.failed + result.failed,
      skipped: acc.skipped + result.skipped,
      duration: acc.duration + result.duration,
    }), { passed: 0, failed: 0, skipped: 0, duration: 0 });

    console.log(`Total Tests: ${totals.passed + totals.failed + totals.skipped}`);
    console.log(`Passed: ${totals.passed}`);
    console.log(`Failed: ${totals.failed}`);
    console.log(`Skipped: ${totals.skipped}`);
    console.log(`Total Duration: ${Math.round(totals.duration / 1000)}s`);

    console.log('\nSuite Breakdown:');
    results.forEach(result => {
      const status = result.failed > 0 ? '❌' : '✅';
      console.log(`${status} ${result.name}: ${result.passed} passed, ${result.failed} failed (${Math.round(result.duration / 1000)}s)`);
    });

    // Write report to file
    const fs = require('fs');
    const path = require('path');
    
    const reportPath = path.join(process.cwd(), 'test-results', 'integration-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totals,
      suites: results,
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private async cleanup() {
    console.log('\n🧹 Cleaning up...');

    // Kill all spawned processes
    this.processes.forEach(process => {
      if (!process.killed) {
        process.kill('SIGTERM');
      }
    });

    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Force kill if still running
    this.processes.forEach(process => {
      if (!process.killed) {
        process.kill('SIGKILL');
      }
    });

    console.log('✅ Cleanup completed');
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner };
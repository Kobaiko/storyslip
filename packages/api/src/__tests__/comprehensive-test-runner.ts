import fs from 'fs/promises';
import path from 'path';
import { VulnerabilityScanner } from './security/vulnerability-scanner';
import { PerformanceTestRunner } from './performance/performance-test-runner';
import { ComprehensiveTestReport, SecurityTestResult, PerformanceTestResult } from '../types/performance';

export class ComprehensiveTestRunner {
  private vulnerabilityScanner: VulnerabilityScanner;
  private performanceTestRunner: PerformanceTestRunner;

  constructor() {
    this.vulnerabilityScanner = new VulnerabilityScanner();
    this.performanceTestRunner = new PerformanceTestRunner();
  }

  async runAllTests(): Promise<ComprehensiveTestReport> {
    console.log('🚀 Starting comprehensive security and performance testing suite...');
    
    const startTime = Date.now();
    
    try {
      // Run security tests
      console.log('\n🔒 Phase 1: Security Testing');
      const securityResults = await this.vulnerabilityScanner.runComprehensiveScan();
      
      // Run performance tests
      console.log('\n⚡ Phase 2: Performance Testing');
      const performanceReport = await this.performanceTestRunner.runAllTests();
      
      // Convert performance results to our format
      const performanceResults: PerformanceTestResult[] = performanceReport.results.map(result => ({
        test_name: result.scenario,
        category: this.categorizePerformanceTest(result.scenario),
        passed: result.passed,
        actual_value: result.averageResponseTime,
        expected_value: 1000, // Default expectation
        unit: 'ms',
        description: `${result.scenario}: ${result.passed ? 'PASSED' : 'FAILED'}`,
        details: `Throughput: ${result.throughput.toFixed(2)} req/s, Error Rate: ${(result.errorRate * 100).toFixed(2)}%`
      }));
      
      const endTime = Date.now();
      const testDuration = endTime - startTime;
      
      // Generate comprehensive report
      const report = this.generateComprehensiveReport(
        securityResults,
        performanceResults,
        testDuration
      );
      
      // Save report
      await this.saveComprehensiveReport(report);
      
      // Print summary
      this.printTestSummary(report);
      
      return report;
      
    } catch (error) {
      console.error('❌ Comprehensive test suite failed:', error);
      throw error;
    }
  }

  private categorizePerformanceTest(testName: string): 'response_time' | 'throughput' | 'concurrency' | 'memory' | 'database' | 'caching' {
    if (testName.toLowerCase().includes('response') || testName.toLowerCase().includes('time')) {
      return 'response_time';
    } else if (testName.toLowerCase().includes('concurrent') || testName.toLowerCase().includes('load')) {
      return 'concurrency';
    } else if (testName.toLowerCase().includes('memory')) {
      return 'memory';
    } else if (testName.toLowerCase().includes('database') || testName.toLowerCase().includes('db')) {
      return 'database';
    } else if (testName.toLowerCase().includes('cache') || testName.toLowerCase().includes('cdn')) {
      return 'caching';
    } else {
      return 'throughput';
    }
  }

  private generateComprehensiveReport(
    securityResults: SecurityTestResult[],
    performanceResults: PerformanceTestResult[],
    testDuration: number
  ): ComprehensiveTestReport {
    const totalTests = securityResults.length + performanceResults.length;
    const passedTests = securityResults.filter(r => r.passed).length + 
                      performanceResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    const criticalIssues = securityResults.filter(r => !r.passed && r.severity === 'critical').length;
    const highIssues = securityResults.filter(r => !r.passed && r.severity === 'high').length;
    const mediumIssues = securityResults.filter(r => !r.passed && r.severity === 'medium').length;
    const lowIssues = securityResults.filter(r => !r.passed && r.severity === 'low').length;
    
    const recommendations = this.generateRecommendations(securityResults, performanceResults);
    
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      test_duration: testDuration,
      security_results: securityResults,
      performance_results: performanceResults,
      summary: {
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: failedTests,
        critical_issues: criticalIssues,
        high_issues: highIssues,
        medium_issues: mediumIssues,
        low_issues: lowIssues
      },
      recommendations
    };
  }

  private generateRecommendations(
    securityResults: SecurityTestResult[],
    performanceResults: PerformanceTestResult[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Security recommendations
    const criticalSecurityIssues = securityResults.filter(r => !r.passed && r.severity === 'critical');
    const highSecurityIssues = securityResults.filter(r => !r.passed && r.severity === 'high');
    
    if (criticalSecurityIssues.length > 0) {
      recommendations.push('🚨 URGENT: Address critical security vulnerabilities immediately');
      criticalSecurityIssues.forEach(issue => {
        if (issue.remediation) {
          recommendations.push(`   - ${issue.test_name}: ${issue.remediation}`);
        }
      });
    }
    
    if (highSecurityIssues.length > 0) {
      recommendations.push('⚠️ HIGH PRIORITY: Address high severity security issues');
      highSecurityIssues.forEach(issue => {
        if (issue.remediation) {
          recommendations.push(`   - ${issue.test_name}: ${issue.remediation}`);
        }
      });
    }
    
    // Performance recommendations
    const failedPerformanceTests = performanceResults.filter(r => !r.passed);
    
    if (failedPerformanceTests.length > 0) {
      recommendations.push('📈 PERFORMANCE: Optimize failing performance tests');
      
      const responseTimeIssues = failedPerformanceTests.filter(r => r.category === 'response_time');
      if (responseTimeIssues.length > 0) {
        recommendations.push('   - Optimize API response times - consider caching, database indexing, and code optimization');
      }
      
      const concurrencyIssues = failedPerformanceTests.filter(r => r.category === 'concurrency');
      if (concurrencyIssues.length > 0) {
        recommendations.push('   - Improve concurrency handling - consider connection pooling and async processing');
      }
      
      const databaseIssues = failedPerformanceTests.filter(r => r.category === 'database');
      if (databaseIssues.length > 0) {
        recommendations.push('   - Optimize database performance - add indexes, optimize queries, consider read replicas');
      }
      
      const memoryIssues = failedPerformanceTests.filter(r => r.category === 'memory');
      if (memoryIssues.length > 0) {
        recommendations.push('   - Address memory issues - check for memory leaks and optimize memory usage');
      }
    }
    
    // General recommendations
    if (securityResults.filter(r => r.passed).length / securityResults.length > 0.9) {
      recommendations.push('✅ SECURITY: Good security posture - maintain current security practices');
    }
    
    if (performanceResults.filter(r => r.passed).length / performanceResults.length > 0.8) {
      recommendations.push('✅ PERFORMANCE: Good performance baseline - monitor and maintain');
    }
    
    // Infrastructure recommendations
    recommendations.push('🔧 INFRASTRUCTURE: Consider implementing:');
    recommendations.push('   - Automated security scanning in CI/CD pipeline');
    recommendations.push('   - Performance monitoring and alerting');
    recommendations.push('   - Regular security audits and penetration testing');
    recommendations.push('   - Load testing in staging environment');
    recommendations.push('   - Database performance monitoring');
    
    return recommendations;
  }

  private async saveComprehensiveReport(report: ComprehensiveTestReport): Promise<void> {
    const outputDir = './test-results';
    await fs.mkdir(outputDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON report
    const jsonFilename = `comprehensive-test-report-${timestamp}.json`;
    const jsonFilepath = path.join(outputDir, jsonFilename);
    await fs.writeFile(jsonFilepath, JSON.stringify(report, null, 2));
    
    // Save HTML report
    const htmlContent = this.generateHTMLReport(report);
    const htmlFilename = `comprehensive-test-report-${timestamp}.html`;
    const htmlFilepath = path.join(outputDir, htmlFilename);
    await fs.writeFile(htmlFilepath, htmlContent);
    
    // Save CSV summary
    const csvContent = this.generateCSVSummary(report);
    const csvFilename = `test-summary-${timestamp}.csv`;
    const csvFilepath = path.join(outputDir, csvFilename);
    await fs.writeFile(csvFilepath, csvContent);
    
    console.log(`\n📄 Reports saved:`);
    console.log(`   JSON: ${jsonFilepath}`);
    console.log(`   HTML: ${htmlFilepath}`);
    console.log(`   CSV:  ${csvFilepath}`);
  }

  private generateHTMLReport(report: ComprehensiveTestReport): string {
    const securitySummary = this.generateSecuritySummaryHTML(report.security_results);
    const performanceSummary = this.generatePerformanceSummaryHTML(report.performance_results);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StorySlip Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .number { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .critical { color: #dc3545; background-color: #f8d7da; }
        .high { color: #856404; background-color: #fff3cd; }
        .medium { color: #0c5460; background-color: #d1ecf1; }
        .low { color: #155724; background-color: #d4edda; }
        .section { margin-bottom: 30px; }
        .section h2 { border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .recommendations { background-color: #e9ecef; padding: 20px; border-radius: 6px; }
        .recommendations ul { margin: 10px 0; }
        .recommendations li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ StorySlip Comprehensive Test Report</h1>
            <p>Generated: ${report.timestamp}</p>
            <p>Environment: ${report.environment}</p>
            <p>Test Duration: ${(report.test_duration / 1000).toFixed(2)} seconds</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="number">${report.summary.total_tests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="number passed">${report.summary.passed_tests}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="number failed">${report.summary.failed_tests}</div>
            </div>
            <div class="summary-card critical">
                <h3>Critical Issues</h3>
                <div class="number">${report.summary.critical_issues}</div>
            </div>
            <div class="summary-card high">
                <h3>High Issues</h3>
                <div class="number">${report.summary.high_issues}</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🔒 Security Test Results</h2>
            ${securitySummary}
        </div>
        
        <div class="section">
            <h2>⚡ Performance Test Results</h2>
            ${performanceSummary}
        </div>
        
        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  private generateSecuritySummaryHTML(results: SecurityTestResult[]): string {
    const tableRows = results.map(result => `
        <tr class="${result.passed ? 'passed' : result.severity}">
            <td>${result.test_name}</td>
            <td>${result.category}</td>
            <td>${result.severity}</td>
            <td>${result.passed ? '✅ PASSED' : '❌ FAILED'}</td>
            <td>${result.description}</td>
            <td>${result.remediation || 'N/A'}</td>
        </tr>
    `).join('');
    
    return `
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Remediation</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
  }

  private generatePerformanceSummaryHTML(results: PerformanceTestResult[]): string {
    const tableRows = results.map(result => `
        <tr class="${result.passed ? 'passed' : 'failed'}">
            <td>${result.test_name}</td>
            <td>${result.category}</td>
            <td>${result.passed ? '✅ PASSED' : '❌ FAILED'}</td>
            <td>${result.actual_value.toFixed(2)} ${result.unit}</td>
            <td>${result.expected_value} ${result.unit}</td>
            <td>${result.description}</td>
        </tr>
    `).join('');
    
    return `
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actual Value</th>
                    <th>Expected Value</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
  }

  private generateCSVSummary(report: ComprehensiveTestReport): string {
    const headers = ['Type', 'Test Name', 'Category', 'Status', 'Severity/Value', 'Description'];
    const rows = [headers.join(',')];
    
    // Add security results
    report.security_results.forEach(result => {
      rows.push([
        'Security',
        `"${result.test_name}"`,
        result.category,
        result.passed ? 'PASSED' : 'FAILED',
        result.severity,
        `"${result.description}"`
      ].join(','));
    });
    
    // Add performance results
    report.performance_results.forEach(result => {
      rows.push([
        'Performance',
        `"${result.test_name}"`,
        result.category,
        result.passed ? 'PASSED' : 'FAILED',
        `${result.actual_value} ${result.unit}`,
        `"${result.description}"`
      ].join(','));
    });
    
    return rows.join('\n');
  }

  private printTestSummary(report: ComprehensiveTestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPREHENSIVE TEST SUITE COMPLETED');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Test Summary:`);
    console.log(`   Total Tests: ${report.summary.total_tests}`);
    console.log(`   Passed: ${report.summary.passed_tests} (${((report.summary.passed_tests / report.summary.total_tests) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${report.summary.failed_tests} (${((report.summary.failed_tests / report.summary.total_tests) * 100).toFixed(1)}%)`);
    console.log(`   Test Duration: ${(report.test_duration / 1000).toFixed(2)} seconds`);
    
    console.log(`\n🔒 Security Issues:`);
    console.log(`   Critical: ${report.summary.critical_issues}`);
    console.log(`   High: ${report.summary.high_issues}`);
    console.log(`   Medium: ${report.summary.medium_issues}`);
    console.log(`   Low: ${report.summary.low_issues}`);
    
    if (report.summary.critical_issues > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES DETECTED - IMMEDIATE ACTION REQUIRED!');
    } else if (report.summary.high_issues > 0) {
      console.log('\n⚠️ High severity security issues detected - should be addressed soon');
    } else {
      console.log('\n✅ No critical or high severity security issues detected');
    }
    
    const performancePassed = report.performance_results.filter(r => r.passed).length;
    const performanceTotal = report.performance_results.length;
    console.log(`\n⚡ Performance: ${performancePassed}/${performanceTotal} tests passed (${((performancePassed / performanceTotal) * 100).toFixed(1)}%)`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      report.recommendations.slice(0, 5).forEach(rec => {
        console.log(`   ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

// CLI runner
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  
  runner.runAllTests()
    .then(report => {
      const exitCode = report.summary.critical_issues > 0 ? 2 : 
                      report.summary.high_issues > 0 ? 1 : 0;
      
      console.log(`\nExiting with code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('\n💥 Comprehensive test suite failed:', error);
      process.exit(3);
    });
}
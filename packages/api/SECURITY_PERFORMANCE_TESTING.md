# Security and Performance Testing Guide

This document describes the comprehensive security and performance testing system implemented for StorySlip.

## Overview

The testing system includes:
- **Security vulnerability scanning** - Automated detection of common security issues
- **Performance testing** - Load testing and performance benchmarking
- **Comprehensive reporting** - Detailed HTML, JSON, and CSV reports

## Test Categories

### Security Tests

#### Authentication Security
- ✅ Password strength validation
- ✅ Brute force protection
- ✅ Session management
- ✅ Token validation and expiration

#### Authorization Security
- ✅ Privilege escalation prevention
- ✅ Horizontal access control
- ✅ Role-based access control (RBAC)
- ✅ API key permissions

#### Input Validation
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ NoSQL injection prevention
- ✅ File upload security

#### Data Protection
- ✅ Sensitive data exposure
- ✅ API security headers
- ✅ Error message sanitization
- ✅ Database security

#### Session Security
- ✅ Secure cookie configuration
- ✅ Session fixation prevention
- ✅ Session timeout handling
- ✅ CSRF protection

### Performance Tests

#### Response Time Testing
- ✅ API endpoint response times
- ✅ Database query performance
- ✅ Widget rendering speed
- ✅ Search functionality performance

#### Concurrency Testing
- ✅ Multiple concurrent users
- ✅ Concurrent content creation
- ✅ Widget delivery under load
- ✅ Database connection pooling

#### Load Testing
- ✅ Authentication load testing
- ✅ Content management load testing
- ✅ Widget delivery load testing
- ✅ Mixed workload simulation

#### Resource Usage
- ✅ Memory leak detection
- ✅ Large payload handling
- ✅ CDN and caching performance
- ✅ File upload performance

## Running Tests

### Individual Test Suites

```bash
# Run security tests only
npm run test:security

# Run performance tests only
npm run test:performance

# Run comprehensive test suite (security + performance)
npm run test:comprehensive
```

### Jest-based Tests

```bash
# Run security unit tests
npm test -- --testPathPattern=security

# Run performance unit tests
npm test -- --testPathPattern=performance

# Run all tests with coverage
npm run test:coverage
```

## Test Configuration

### Security Test Configuration

Security tests are configured in `src/__tests__/security/vulnerability-scanner.ts`:

```typescript
// Example security test categories
const securityCategories = [
  'authentication',
  'authorization', 
  'input_validation',
  'data_exposure',
  'session',
  'csrf',
  'xss',
  'sql_injection'
];
```

### Performance Test Configuration

Performance tests are configured in `src/__tests__/performance/load-test-config.ts`:

```typescript
// Example load test scenario
{
  name: 'Authentication Load Test',
  duration: 60000, // 1 minute
  virtualUsers: 50,
  rampUpTime: 10000, // 10 seconds
  expectedResponseTime: {
    p50: 200,
    p95: 500,
    p99: 1000
  },
  expectedThroughput: 100, // requests per second
  errorThreshold: 0.01 // 1% error rate
}
```

## Test Reports

### Report Formats

Tests generate reports in multiple formats:

1. **JSON Report** - Machine-readable detailed results
2. **HTML Report** - Human-readable visual report
3. **CSV Summary** - Spreadsheet-compatible summary

### Report Location

Reports are saved to `./test-results/` directory:

```
test-results/
├── comprehensive-test-report-2024-01-15T10-30-00.json
├── comprehensive-test-report-2024-01-15T10-30-00.html
└── test-summary-2024-01-15T10-30-00.csv
```

### Sample HTML Report

The HTML report includes:
- Executive summary with pass/fail counts
- Security vulnerability details with severity levels
- Performance test results with metrics
- Actionable recommendations
- Visual indicators for critical issues

## Security Severity Levels

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| **Critical** | Immediate security risk | Fix immediately |
| **High** | Significant security risk | Fix within 24-48 hours |
| **Medium** | Moderate security risk | Fix within 1 week |
| **Low** | Minor security improvement | Fix when convenient |

## Performance Thresholds

### Response Time Targets

| Endpoint Type | P50 Target | P95 Target | P99 Target |
|---------------|------------|------------|------------|
| Authentication | 200ms | 500ms | 1000ms |
| Content API | 300ms | 800ms | 1500ms |
| Widget Delivery | 100ms | 300ms | 500ms |
| Search | 500ms | 1000ms | 2000ms |

### Throughput Targets

| Test Scenario | Target RPS | Error Threshold |
|---------------|------------|-----------------|
| Authentication | 100 | 1% |
| Content Management | 60 | 2% |
| Widget Delivery | 200 | 0.5% |
| Mixed Workload | 120 | 1.5% |

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/security-performance.yml`:

```yaml
name: Security and Performance Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: packages/api
      
      - name: Run comprehensive tests
        run: npm run test:comprehensive
        working-directory: packages/api
      
      - name: Upload test reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-reports
          path: packages/api/test-results/
```

### Exit Codes

The test runner uses specific exit codes:

- `0` - All tests passed
- `1` - High severity issues found
- `2` - Critical security issues found
- `3` - Test execution failed

## Monitoring Integration

### Alerts Configuration

Set up monitoring alerts based on test results:

```typescript
// Example alert thresholds
const alertThresholds = {
  criticalSecurityIssues: 0, // Alert on any critical issues
  highSecurityIssues: 2,     // Alert on 2+ high issues
  performanceFailures: 3,    // Alert on 3+ performance failures
  overallErrorRate: 0.05     // Alert on 5%+ error rate
};
```

### Metrics Collection

Tests automatically collect metrics for:
- Response times (P50, P95, P99)
- Throughput (requests per second)
- Error rates by endpoint
- Memory and CPU usage
- Database performance metrics

## Best Practices

### Security Testing

1. **Run regularly** - Include in CI/CD pipeline
2. **Fix critical issues immediately** - Don't deploy with critical vulnerabilities
3. **Review remediation suggestions** - Each failed test includes fix recommendations
4. **Test in staging** - Run full security scans before production deployment

### Performance Testing

1. **Establish baselines** - Track performance trends over time
2. **Test realistic scenarios** - Use production-like data volumes
3. **Monitor resource usage** - Watch for memory leaks and CPU spikes
4. **Load test before releases** - Ensure performance doesn't regress

### Report Analysis

1. **Review HTML reports** - Easy to understand visual format
2. **Track trends** - Compare reports over time
3. **Prioritize fixes** - Address critical and high severity issues first
4. **Share with team** - Include security and performance in code reviews

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Ensure database is running and accessible
npm run migrate
```

#### Memory Issues During Load Testing
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run test:performance
```

#### Test Timeouts
```bash
# Increase Jest timeout in jest.config.js
module.exports = {
  testTimeout: 60000 // 60 seconds
};
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
export DEBUG=storyslip:*
npm run test:comprehensive
```

## Contributing

### Adding New Security Tests

1. Add test to `vulnerability-scanner.ts`
2. Follow the pattern of existing tests
3. Include severity level and remediation advice
4. Update this documentation

### Adding New Performance Tests

1. Add scenario to `load-test-config.ts`
2. Define realistic thresholds
3. Include in comprehensive test suite
4. Document expected behavior

### Updating Thresholds

1. Review current performance baselines
2. Update thresholds in configuration files
3. Test changes in staging environment
4. Update documentation

## Support

For questions or issues with the testing system:

1. Check this documentation first
2. Review test logs and reports
3. Check GitHub issues for known problems
4. Contact the development team

---

**Remember**: Security and performance testing is an ongoing process. Regular testing helps maintain a secure and performant application.
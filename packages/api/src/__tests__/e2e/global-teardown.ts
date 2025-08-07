import { FullConfig } from '@playwright/test';
import { DatabaseService } from '../../services/database';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test global teardown...');

  const db = DatabaseService.getInstance();

  try {
    // Clean up test data created during tests
    await cleanupTestData(db);

    // Generate test report summary
    await generateTestSummary();

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

async function cleanupTestData(db: DatabaseService) {
  console.log('🧹 Final cleanup of test data...');

  try {
    // Clean up in reverse dependency order to avoid foreign key constraints

    // 1. Clean up analytics data
    await db.query(`
      DELETE FROM widget_analytics 
      WHERE widget_id IN (
        SELECT id FROM widgets 
        WHERE title LIKE '%Test%' OR description LIKE '%test%'
      )
    `);

    // 2. Clean up API keys
    await db.query(`
      DELETE FROM widget_api_keys 
      WHERE widget_id IN (
        SELECT id FROM widgets 
        WHERE title LIKE '%Test%' OR description LIKE '%test%'
      )
    `);

    // 3. Clean up widgets
    await db.query(`
      DELETE FROM widgets 
      WHERE title LIKE '%Test%' 
         OR description LIKE '%test%'
         OR website_id IN (
           SELECT id FROM websites 
           WHERE domain LIKE '%.example.com' OR domain LIKE '%.test.com'
         )
    `);

    // 4. Clean up content
    await db.query(`
      DELETE FROM content 
      WHERE title LIKE '%Test%' 
         OR title LIKE '%E2E%'
         OR excerpt LIKE '%test%'
         OR website_id IN (
           SELECT id FROM websites 
           WHERE domain LIKE '%.example.com' OR domain LIKE '%.test.com'
         )
    `);

    // 5. Clean up team memberships
    await db.query(`
      DELETE FROM team_members 
      WHERE website_id IN (
        SELECT id FROM websites 
        WHERE domain LIKE '%.example.com' OR domain LIKE '%.test.com'
      )
    `);

    // 6. Clean up websites
    await db.query(`
      DELETE FROM websites 
      WHERE domain LIKE '%.example.com' 
         OR domain LIKE '%.test.com'
         OR name LIKE '%Test%'
    `);

    // 7. Clean up user profiles
    await db.query(`
      DELETE FROM user_profiles 
      WHERE user_id IN (
        SELECT id FROM auth.users 
        WHERE email LIKE '%test-%' 
           OR email LIKE '%@example.com'
           OR email LIKE '%@test.com'
      )
    `);

    // 8. Clean up organizations
    await db.query(`
      DELETE FROM organizations 
      WHERE name LIKE '%Test%' 
         OR name LIKE '%E2E%'
    `);

    // 9. Finally, clean up users
    await db.query(`
      DELETE FROM auth.users 
      WHERE email LIKE '%test-%' 
         OR email LIKE '%@example.com'
         OR email LIKE '%@test.com'
    `);

    // Clean up any orphaned sessions
    await db.query(`
      DELETE FROM auth.sessions 
      WHERE created_at < NOW() - INTERVAL '1 hour'
    `);

    console.log('✅ Final test data cleanup completed');

  } catch (error) {
    console.warn('⚠️ Final cleanup had issues (this is usually fine):', error.message);
  }
}

async function generateTestSummary() {
  console.log('📊 Generating test summary...');

  try {
    const fs = require('fs');
    const path = require('path');

    // Read test results if available
    const resultsPath = path.join(process.cwd(), 'test-results', 'e2e-results.json');
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        suites: results.suites?.map((suite: any) => ({
          title: suite.title,
          tests: suite.tests?.length || 0,
          passed: suite.tests?.filter((t: any) => t.outcome === 'passed').length || 0,
          failed: suite.tests?.filter((t: any) => t.outcome === 'failed').length || 0,
        })) || [],
      };

      // Write summary to file
      const summaryPath = path.join(process.cwd(), 'test-results', 'e2e-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      // Log summary to console
      console.log('📈 Test Summary:');
      console.log(`   Total Tests: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Skipped: ${summary.skipped}`);
      console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);

      if (summary.failed > 0) {
        console.log('❌ Some tests failed. Check the HTML report for details.');
      } else {
        console.log('✅ All tests passed!');
      }
    }

  } catch (error) {
    console.warn('⚠️ Could not generate test summary:', error.message);
  }
}

export default globalTeardown;
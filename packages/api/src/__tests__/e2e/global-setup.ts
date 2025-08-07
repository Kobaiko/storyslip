import { chromium, FullConfig } from '@playwright/test';
import { DatabaseService } from '../../services/database';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');

  // Initialize database connection
  const db = DatabaseService.getInstance();

  try {
    // Verify database connection
    await db.query('SELECT 1');
    console.log('✅ Database connection verified');

    // Run any necessary migrations for testing
    console.log('🔄 Running test database setup...');

    // Create test database schema if needed
    await db.query(`
      CREATE SCHEMA IF NOT EXISTS test_data;
    `);

    // Clean up any existing test data
    await cleanupTestData(db);

    // Create test indexes for better performance
    await createTestIndexes(db);

    console.log('✅ Test database setup completed');

    // Start browser for global authentication if needed
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Perform any global authentication setup
    // This could include creating admin users, setting up test data, etc.

    await browser.close();

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function cleanupTestData(db: DatabaseService) {
  console.log('🧹 Cleaning up existing test data...');

  try {
    // Clean up test users (emails containing 'test-' or ending with '@example.com')
    await db.query(`
      DELETE FROM auth.users 
      WHERE email LIKE '%test-%' 
         OR email LIKE '%@example.com'
         OR email LIKE '%@test.com'
    `);

    // Clean up test websites
    await db.query(`
      DELETE FROM websites 
      WHERE domain LIKE '%.example.com' 
         OR domain LIKE '%.test.com'
         OR name LIKE '%Test%'
    `);

    // Clean up test content
    await db.query(`
      DELETE FROM content 
      WHERE title LIKE '%Test%' 
         OR title LIKE '%E2E%'
         OR excerpt LIKE '%test%'
    `);

    // Clean up test widgets
    await db.query(`
      DELETE FROM widgets 
      WHERE title LIKE '%Test%' 
         OR description LIKE '%test%'
    `);

    // Clean up test API keys
    await db.query(`
      DELETE FROM widget_api_keys 
      WHERE name LIKE '%Test%' 
         OR name LIKE '%E2E%'
    `);

    // Clean up test analytics data
    await db.query(`
      DELETE FROM widget_analytics 
      WHERE created_at < NOW() - INTERVAL '1 day'
    `);

    console.log('✅ Test data cleanup completed');

  } catch (error) {
    console.warn('⚠️ Test data cleanup had issues (this is usually fine):', error.message);
  }
}

async function createTestIndexes(db: DatabaseService) {
  console.log('📊 Creating test performance indexes...');

  try {
    // Create indexes for better test performance
    const indexes = [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_users_email ON auth.users(email) WHERE email LIKE \'%test%\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_websites_domain ON websites(domain) WHERE domain LIKE \'%.example.com\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_content_title ON content(title) WHERE title LIKE \'%Test%\'',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_widgets_title ON widgets(title) WHERE title LIKE \'%Test%\'',
    ];

    for (const indexQuery of indexes) {
      try {
        await db.query(indexQuery);
      } catch (error) {
        // Index might already exist, which is fine
        if (!error.message.includes('already exists')) {
          console.warn('⚠️ Index creation warning:', error.message);
        }
      }
    }

    console.log('✅ Test indexes created');

  } catch (error) {
    console.warn('⚠️ Test index creation had issues (this is usually fine):', error.message);
  }
}

export default globalSetup;
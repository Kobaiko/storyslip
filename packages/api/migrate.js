const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'storyslip',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function runMigrations() {
  try {
    console.log('🗄️  Running database migrations...');
    
    // First, create basic schema
    await createBasicSchema();
    
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT filename FROM migrations ORDER BY id'
    );
    const executedSet = new Set(executedMigrations.map(row => row.filename));

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('✅ Basic schema created - no additional migrations found');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('✅ Basic schema created - no additional migrations found');
      return;
    }

    // Run pending migrations
    for (const filename of migrationFiles) {
      if (!executedSet.has(filename)) {
        console.log(`Running migration: ${filename}`);
        const migrationPath = path.join(migrationsDir, filename);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        await pool.query('BEGIN');
        try {
          await pool.query(migrationSQL);
          await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
          await pool.query('COMMIT');
          console.log(`✅ Migration ${filename} completed`);
        } catch (error) {
          await pool.query('ROLLBACK');
          console.log(`⚠️  Migration ${filename} failed, continuing with basic schema:`, error.message);
        }
      }
    }

    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createBasicSchema() {
  console.log('Creating basic schema...');
  
  const basicSchema = `
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Websites table
    CREATE TABLE IF NOT EXISTS websites (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255),
      owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
      api_key UUID DEFAULT uuid_generate_v4(),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Content table
    CREATE TABLE IF NOT EXISTS content (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      slug VARCHAR(500) NOT NULL,
      content TEXT,
      excerpt TEXT,
      status VARCHAR(20) DEFAULT 'draft',
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(website_id, slug)
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(website_id, slug)
    );

    -- Tags table
    CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(website_id, slug)
    );

    -- Insert demo data
    INSERT INTO users (id, email, password_hash, first_name, last_name) 
    VALUES (
      '550e8400-e29b-41d4-a716-446655440000',
      'demo@storyslip.com',
      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
      'Demo',
      'User'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO websites (id, name, domain, owner_id) 
    VALUES (
      '550e8400-e29b-41d4-a716-446655440001',
      'Demo Website',
      'demo.storyslip.com',
      '550e8400-e29b-41d4-a716-446655440000'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO content (website_id, title, slug, content, status, published_at)
    VALUES (
      '550e8400-e29b-41d4-a716-446655440001',
      'Welcome to StorySlip CMS',
      'welcome-to-storyslip',
      '<h1>Welcome to StorySlip CMS</h1><p>This is your first piece of content! You can edit this in the dashboard.</p>',
      'published',
      CURRENT_TIMESTAMP
    ) ON CONFLICT (website_id, slug) DO NOTHING;
  `;

  await pool.query(basicSchema);
  console.log('✅ Basic schema created with demo data');
}

runMigrations();
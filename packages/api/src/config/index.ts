import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    nodeEnv: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost',
  },

  // Database configuration
  database: {
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Email configuration
  email: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Widget configuration
  widget: {
    cdnUrl: process.env.WIDGET_CDN_URL || 'https://cdn.storyslip.com',
  },

  // Security configuration
  security: {
    bcryptRounds: 12,
    maxRequestSize: '10mb',
    corsOrigins: {
      admin: process.env.NODE_ENV === 'production' 
        ? ['https://dashboard.storyslip.com'] 
        : ['http://localhost:3000'],
      widget: true, // Allow all origins for widget embedding
    },
  },

  // Rate limiting configuration
  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000,
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,
    },
    widget: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100,
    },
    content: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50,
    },
    upload: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20,
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.NODE_ENV === 'production',
      errorFile: 'logs/error.log',
      combinedFile: 'logs/combined.log',
    },
    console: {
      enabled: process.env.NODE_ENV !== 'production',
    },
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export default config;
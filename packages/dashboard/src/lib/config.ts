// Application configuration
export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  },

  // App Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'StorySlip CMS',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_NODE_ENV || 'development',
  },

  // Feature Flags
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    teamFeatures: import.meta.env.VITE_ENABLE_TEAM_FEATURES === 'true',
    whiteLabeling: import.meta.env.VITE_ENABLE_WHITE_LABELING === 'true',
  },

  // CDN Configuration
  cdn: {
    url: import.meta.env.VITE_CDN_URL || '',
  },

  // Pagination defaults
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
  },

  // Toast notification defaults
  toast: {
    defaultDuration: 5000,
    maxToasts: 5,
  },

  // File upload limits
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'text/plain', 'application/msword'],
  },

  // Authentication
  auth: {
    tokenKey: 'auth_token',
    userKey: 'user',
    refreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  },

  // Theme configuration
  theme: {
    defaultTheme: 'light',
    storageKey: 'theme-preference',
  },

  // Development flags
  dev: {
    enableDevTools: import.meta.env.DEV,
    enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  },
} as const;

// Type-safe environment variable access
export const env = {
  isDevelopment: config.app.environment === 'development',
  isProduction: config.app.environment === 'production',
  isTest: config.app.environment === 'test',
} as const;

// Validation function for required environment variables
export function validateConfig() {
  const required = [
    'VITE_API_URL',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// Initialize configuration validation in development
if (env.isDevelopment) {
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration Error:', error);
  }
}
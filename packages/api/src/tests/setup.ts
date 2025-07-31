import { jest } from '@jest/globals';

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers
jest.useFakeTimers();

// Setup global test utilities
global.testUtils = {
  createMockUser: () => ({
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    is_verified: true,
    created_at: new Date().toISOString(),
  }),
  
  createMockWebsite: () => ({
    id: 'test-website-123',
    name: 'Test Website',
    domain: 'test.example.com',
    api_key: 'sk_test_123',
    is_verified: true,
    owner_id: 'test-user-123',
    created_at: new Date().toISOString(),
  }),
  
  createMockContent: () => ({
    id: 'test-content-123',
    title: 'Test Article',
    content: '<p>This is test content</p>',
    excerpt: 'Test excerpt',
    status: 'published',
    website_id: 'test-website-123',
    author_id: 'test-user-123',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }),
};

// Setup database mocks
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    })),
    rpc: jest.fn(),
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        list: jest.fn(),
        getPublicUrl: jest.fn(),
      })),
    },
  },
}));

// Setup email service mocks
jest.mock('../services/email.service', () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendInvitationEmail: jest.fn().mockResolvedValue(undefined),
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

// Setup authentication middleware mock
jest.mock('../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = global.testUtils.createMockUser();
    next();
  }),
  authenticateApiKey: jest.fn((req, res, next) => {
    req.website = global.testUtils.createMockWebsite();
    next();
  }),
}));

// Setup validation middleware mock
jest.mock('../middleware/validation', () => ({
  validateRequest: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateRegistration: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateLogin: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateWebsite: jest.fn(() => (req: any, res: any, next: any) => next()),
  validateContent: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

// Setup rate limiting mock
jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: jest.fn((req: any, res: any, next: any) => next()),
  apiLimiter: jest.fn((req: any, res: any, next: any) => next()),
  generalLimiter: jest.fn((req: any, res: any, next: any) => next()),
}));

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Cleanup after all tests
afterAll(() => {
  jest.useRealTimers();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export test utilities for use in tests
export const testUtils = global.testUtils;
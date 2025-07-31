import { jest } from '@jest/globals';

// Setup test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock DOM environment
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => ({
      style: {},
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
        toggle: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      innerHTML: '',
      textContent: '',
      children: [],
      parentNode: null,
    })),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getElementById: jest.fn(),
    getElementsByClassName: jest.fn(() => []),
    getElementsByTagName: jest.fn(() => []),
    createTextNode: jest.fn((text) => ({ textContent: text })),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
    head: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'https://example.com',
      origin: 'https://example.com',
      hostname: 'example.com',
      pathname: '/',
      search: '',
      hash: '',
    },
    navigator: {
      userAgent: 'Mozilla/5.0 (Test Browser)',
      language: 'en-US',
    },
    screen: {
      width: 1920,
      height: 1080,
    },
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setTimeout: jest.fn((fn, delay) => setTimeout(fn, delay)),
    clearTimeout: jest.fn((id) => clearTimeout(id)),
    setInterval: jest.fn((fn, delay) => setInterval(fn, delay)),
    clearInterval: jest.fn((id) => clearInterval(id)),
    requestAnimationFrame: jest.fn((fn) => setTimeout(fn, 16)),
    cancelAnimationFrame: jest.fn((id) => clearTimeout(id)),
  },
  writable: true,
});

// Mock fetch
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// Setup global test utilities
global.testUtils = {
  createMockContent: () => [
    {
      id: 'content-1',
      title: 'Test Article 1',
      excerpt: 'This is a test article excerpt',
      content: '<p>This is test content</p>',
      published_at: '2024-01-01T00:00:00Z',
      slug: 'test-article-1',
      featured_image: 'https://example.com/image1.jpg',
      categories: ['Technology'],
      tags: ['JavaScript', 'Testing'],
    },
    {
      id: 'content-2',
      title: 'Test Article 2',
      excerpt: 'Another test article excerpt',
      content: '<p>This is more test content</p>',
      published_at: '2024-01-02T00:00:00Z',
      slug: 'test-article-2',
      featured_image: 'https://example.com/image2.jpg',
      categories: ['Programming'],
      tags: ['TypeScript', 'Testing'],
    },
  ],
  
  createMockBranding: () => ({
    brand_name: 'Test Brand',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    logo_url: 'https://example.com/logo.png',
    font_family: 'Inter, sans-serif',
    border_radius: '8px',
  }),
  
  createMockWidget: () => ({
    websiteId: 'test-website-123',
    apiKey: 'sk_test_123',
    containerId: 'storyslip-widget',
    layout: 'list',
    itemsPerPage: 10,
    showSearch: true,
    showFilters: true,
    showPagination: true,
    trackAnalytics: true,
    customStyles: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: '16px',
    },
  }),
  
  mockApiResponse: (data: any, success = true) => ({
    ok: success,
    status: success ? 200 : 400,
    json: async () => ({ success, data, message: success ? 'Success' : 'Error' }),
  }),
  
  mockFetchSuccess: (data: any) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data }),
    });
  },
  
  mockFetchError: (message = 'Network error') => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(message));
  },
  
  createMockElement: (tagName = 'div') => ({
    tagName: tagName.toUpperCase(),
    style: {},
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn(),
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerHTML: '',
    textContent: '',
    children: [],
    parentNode: null,
    offsetWidth: 300,
    offsetHeight: 200,
    getBoundingClientRect: jest.fn(() => ({
      top: 0,
      left: 0,
      bottom: 200,
      right: 300,
      width: 300,
      height: 200,
    })),
  }),
  
  simulateIntersection: (entries: any[]) => {
    const observer = (global.IntersectionObserver as jest.Mock).mock.instances[0];
    const callback = (global.IntersectionObserver as jest.Mock).mock.calls[0][0];
    callback(entries, observer);
  },
  
  simulateResize: (entries: any[]) => {
    const observer = (global.ResizeObserver as jest.Mock).mock.instances[0];
    const callback = (global.ResizeObserver as jest.Mock).mock.calls[0][0];
    callback(entries, observer);
  },
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Mock CSS-in-JS functionality
global.CSS = {
  supports: jest.fn(() => true),
  escape: jest.fn((str) => str),
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
} as any;

// Mock URL constructor
global.URL = jest.fn().mockImplementation((url, base) => ({
  href: url,
  origin: base || 'https://example.com',
  protocol: 'https:',
  hostname: 'example.com',
  pathname: '/',
  search: '',
  hash: '',
  toString: () => url,
})) as any;

// Mock URLSearchParams
global.URLSearchParams = jest.fn().mockImplementation((params) => {
  const map = new Map();
  if (typeof params === 'string') {
    params.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) map.set(decodeURIComponent(key), decodeURIComponent(value || ''));
    });
  }
  return {
    get: (key: string) => map.get(key) || null,
    set: (key: string, value: string) => map.set(key, value),
    has: (key: string) => map.has(key),
    delete: (key: string) => map.delete(key),
    toString: () => Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('&'),
  };
}) as any;

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export test utilities for use in tests
export const testUtils = global.testUtils;
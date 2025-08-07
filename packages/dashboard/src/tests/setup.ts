import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.VITE_API_URL = 'http://localhost:3001';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
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
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock File and FileReader
global.File = jest.fn().mockImplementation((chunks, filename, options) => ({
  name: filename,
  size: chunks.reduce((acc: number, chunk: any) => acc + chunk.length, 0),
  type: options?.type || '',
  lastModified: Date.now(),
}));

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  result: null,
  onload: null,
  onerror: null,
}));

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = jest.fn();

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
  
  createMockAnalytics: () => ({
    total_views: 1250,
    unique_visitors: 890,
    bounce_rate: 0.35,
    avg_session_duration: 180,
    top_content: [
      {
        content_id: 'test-content-123',
        title: 'Test Article',
        views: 450,
      },
    ],
    traffic_sources: {
      direct: 520,
      search: 480,
      social: 190,
      referral: 60,
    },
  }),
  
  mockApiResponse: (data: any, success = true) => ({
    ok: success,
    status: success ? 200 : 400,
    json: async () => ({ success, data, message: success ? 'Success' : 'Error' }),
  }),
  
  mockAuthContext: () => ({
    user: global.testUtils.createMockUser(),
    token: 'mock-jwt-token',
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    isLoading: false,
    isAuthenticated: true,
  }),
};

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
  useParams: () => ({}),
}));

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  }),
}));

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  BarElement: jest.fn(),
  LineElement: jest.fn(),
  PointElement: jest.fn(),
  ArcElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

jest.mock('react-chartjs-2', () => ({
  Bar: jest.fn(() => 'MockBarChart'),
  Line: jest.fn(() => 'MockLineChart'),
  Pie: jest.fn(() => 'MockPieChart'),
  Doughnut: jest.fn(() => 'MockDoughnutChart'),
}));

// Mock rich text editor
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => '<p>Mock content</p>'),
    setContent: jest.fn(),
    commands: {
      setContent: jest.fn(),
      focus: jest.fn(),
    },
    isActive: jest.fn(() => false),
    can: jest.fn(() => ({ toggleBold: jest.fn(() => true) })),
  })),
  EditorContent: jest.fn(() => 'MockEditorContent'),
}));

// Mock date picker
jest.mock('react-datepicker', () => {
  return jest.fn(() => 'MockDatePicker');
});

// Mock color picker
jest.mock('react-color', () => ({
  SketchPicker: jest.fn(() => 'MockColorPicker'),
}));

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
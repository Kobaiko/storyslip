import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the API client
vi.mock('../lib/api', () => ({
  apiClient: {
    getToken: vi.fn(() => null),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
  },
}));

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const testQueryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login page when not authenticated', async () => {
    renderWithProviders(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Sign in to StorySlip')).toBeInTheDocument();
    });
  });

  it('shows loading spinner while checking authentication', () => {
    renderWithProviders(<App />);
    
    // Should show loading state initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('AuthProvider', () => {
  it('provides authentication context', () => {
    const TestComponent = () => {
      return <div>Test Component</div>;
    };

    const testQueryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={testQueryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import App from '../../App';
import DashboardPage from '../../pages/DashboardPage';
import ContentPage from '../../pages/ContentPage';
import WebsitesPage from '../../pages/WebsitesPage';
import TeamPage from '../../pages/TeamPage';

// Mock API calls
jest.mock('../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock hooks
jest.mock('../../hooks/useWebsites', () => ({
  useWebsites: () => ({
    data: [
      {
        id: 'website-1',
        name: 'Test Website 1',
        domain: 'test1.example.com',
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'website-2',
        name: 'Test Website 2',
        domain: 'test2.example.com',
        is_verified: false,
        created_at: '2024-01-02T00:00:00Z',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../hooks/useContent', () => ({
  useContent: () => ({
    data: [
      {
        id: 'content-1',
        title: 'Test Article 1',
        status: 'published',
        published_at: '2024-01-01T00:00:00Z',
        views: 150,
      },
      {
        id: 'content-2',
        title: 'Test Article 2',
        status: 'draft',
        published_at: null,
        views: 0,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    data: {
      total_views: 1250,
      unique_visitors: 890,
      bounce_rate: 0.35,
      avg_session_duration: 180,
      top_content: [
        {
          content_id: 'content-1',
          title: 'Test Article 1',
          views: 450,
        },
      ],
      traffic_sources: {
        direct: 520,
        search: 480,
        social: 190,
        referral: 60,
      },
    },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('../../hooks/useUsers', () => ({
  useUsers: () => ({
    data: [
      {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        is_verified: true,
      },
      {
        id: 'user-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'editor',
        is_verified: true,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // Mock authenticated user
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      is_verified: true,
    };
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify({ user: mockUser, token: 'mock-token' })),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('Dashboard Page Integration', () => {
    it('should render dashboard with all key metrics', async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Check for key dashboard elements
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      
      // Check for stats cards
      await waitFor(() => {
        expect(screen.getByText('Total Views')).toBeInTheDocument();
        expect(screen.getByText('1,250')).toBeInTheDocument();
        expect(screen.getByText('Unique Visitors')).toBeInTheDocument();
        expect(screen.getByText('890')).toBeInTheDocument();
      });

      // Check for recent content
      expect(screen.getByText('Recent Content')).toBeInTheDocument();
      expect(screen.getByText('Test Article 1')).toBeInTheDocument();
    });

    it('should display real-time analytics updates', async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Check for real-time stats component
      await waitFor(() => {
        expect(screen.getByText('Real-time Analytics')).toBeInTheDocument();
      });

      // Simulate real-time update
      fireEvent.click(screen.getByText('Refresh'));
      
      await waitFor(() => {
        expect(screen.getByText('Last updated:')).toBeInTheDocument();
      });
    });

    it('should navigate to different sections from dashboard', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Navigate to websites
      fireEvent.click(screen.getByText('Websites'));
      await waitFor(() => {
        expect(screen.getByText('Your Websites')).toBeInTheDocument();
      });

      // Navigate to content
      fireEvent.click(screen.getByText('Content'));
      await waitFor(() => {
        expect(screen.getByText('Content Management')).toBeInTheDocument();
      });
    });
  });

  describe('Content Management Integration', () => {
    it('should display content list with proper filtering', async () => {
      render(
        <TestWrapper>
          <ContentPage />
        </TestWrapper>
      );

      // Check content list
      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
        expect(screen.getByText('Test Article 2')).toBeInTheDocument();
      });

      // Test status filtering
      fireEvent.click(screen.getByText('Published'));
      await waitFor(() => {
        expect(screen.getByText('Test Article 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Article 2')).not.toBeInTheDocument();
      });
    });

    it('should handle content creation workflow', async () => {
      render(
        <TestWrapper>
          <ContentPage />
        </TestWrapper>
      );

      // Click create new content
      fireEvent.click(screen.getByText('Create New Article'));

      // Fill out form
      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Title'), {
        target: { value: 'New Test Article' },
      });

      fireEvent.change(screen.getByLabelText('Content'), {
        target: { value: '<p>This is a new test article.</p>' },
      });

      // Submit form
      fireEvent.click(screen.getByText('Publish'));

      await waitFor(() => {
        expect(screen.getByText('Article published successfully')).toBeInTheDocument();
      });
    });

    it('should handle content editing workflow', async () => {
      render(
        <TestWrapper>
          <ContentPage />
        </TestWrapper>
      );

      // Click edit on first article
      fireEvent.click(screen.getAllByText('Edit')[0]);

      // Update content
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Article 1')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByDisplayValue('Test Article 1'), {
        target: { value: 'Updated Test Article 1' },
      });

      // Save changes
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Article updated successfully')).toBeInTheDocument();
      });
    });

    it('should handle bulk content operations', async () => {
      render(
        <TestWrapper>
          <ContentPage />
        </TestWrapper>
      );

      // Select multiple articles
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);

      // Perform bulk action
      fireEvent.click(screen.getByText('Bulk Actions'));
      fireEvent.click(screen.getByText('Delete Selected'));

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(screen.getByText('Articles deleted successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Website Management Integration', () => {
    it('should display websites with verification status', async () => {
      render(
        <TestWrapper>
          <WebsitesPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Website 1')).toBeInTheDocument();
        expect(screen.getByText('Test Website 2')).toBeInTheDocument();
      });

      // Check verification badges
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Pending Verification')).toBeInTheDocument();
    });

    it('should handle website creation workflow', async () => {
      render(
        <TestWrapper>
          <WebsitesPage />
        </TestWrapper>
      );

      // Click create website
      fireEvent.click(screen.getByText('Add Website'));

      // Fill form
      await waitFor(() => {
        expect(screen.getByLabelText('Website Name')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Website Name'), {
        target: { value: 'New Test Website' },
      });

      fireEvent.change(screen.getByLabelText('Domain'), {
        target: { value: 'newtest.example.com' },
      });

      // Submit
      fireEvent.click(screen.getByText('Create Website'));

      await waitFor(() => {
        expect(screen.getByText('Website created successfully')).toBeInTheDocument();
      });
    });

    it('should handle domain verification process', async () => {
      render(
        <TestWrapper>
          <WebsitesPage />
        </TestWrapper>
      );

      // Click verify domain for unverified website
      fireEvent.click(screen.getByText('Verify Domain'));

      await waitFor(() => {
        expect(screen.getByText('Domain Verification')).toBeInTheDocument();
      });

      // Show verification instructions
      expect(screen.getByText('Add the following DNS record')).toBeInTheDocument();
      expect(screen.getByText('TXT')).toBeInTheDocument();

      // Check verification
      fireEvent.click(screen.getByText('Check Verification'));

      await waitFor(() => {
        expect(screen.getByText('Verification successful')).toBeInTheDocument();
      });
    });

    it('should display website analytics', async () => {
      render(
        <TestWrapper>
          <WebsitesPage />
        </TestWrapper>
      );

      // Click on website to view details
      fireEvent.click(screen.getByText('Test Website 1'));

      await waitFor(() => {
        expect(screen.getByText('Website Analytics')).toBeInTheDocument();
        expect(screen.getByText('1,250')).toBeInTheDocument(); // Total views
        expect(screen.getByText('890')).toBeInTheDocument(); // Unique visitors
      });

      // Check traffic sources chart
      expect(screen.getByText('Traffic Sources')).toBeInTheDocument();
      expect(screen.getByText('Direct: 520')).toBeInTheDocument();
      expect(screen.getByText('Search: 480')).toBeInTheDocument();
    });
  });

  describe('Team Management Integration', () => {
    it('should display team members with roles', async () => {
      render(
        <TestWrapper>
          <TeamPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      // Check roles
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
    });

    it('should handle team member invitation', async () => {
      render(
        <TestWrapper>
          <TeamPage />
        </TestWrapper>
      );

      // Click invite member
      fireEvent.click(screen.getByText('Invite Member'));

      // Fill invitation form
      await waitFor(() => {
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'newmember@example.com' },
      });

      fireEvent.change(screen.getByLabelText('Role'), {
        target: { value: 'editor' },
      });

      fireEvent.change(screen.getByLabelText('Message'), {
        target: { value: 'Welcome to our team!' },
      });

      // Send invitation
      fireEvent.click(screen.getByText('Send Invitation'));

      await waitFor(() => {
        expect(screen.getByText('Invitation sent successfully')).toBeInTheDocument();
      });
    });

    it('should handle role management', async () => {
      render(
        <TestWrapper>
          <TeamPage />
        </TestWrapper>
      );

      // Click manage roles for a user
      fireEvent.click(screen.getAllByText('Manage')[0]);

      await waitFor(() => {
        expect(screen.getByText('Manage User Role')).toBeInTheDocument();
      });

      // Change role
      fireEvent.change(screen.getByLabelText('Role'), {
        target: { value: 'admin' },
      });

      // Save changes
      fireEvent.click(screen.getByText('Update Role'));

      await waitFor(() => {
        expect(screen.getByText('Role updated successfully')).toBeInTheDocument();
      });
    });

    it('should display user activity log', async () => {
      render(
        <TestWrapper>
          <TeamPage />
        </TestWrapper>
      );

      // Click on activity tab
      fireEvent.click(screen.getByText('Activity Log'));

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });

      // Check for activity entries
      expect(screen.getByText('Content created')).toBeInTheDocument();
      expect(screen.getByText('Website updated')).toBeInTheDocument();
    });
  });

  describe('Navigation and Layout Integration', () => {
    it('should handle sidebar navigation', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Test all navigation items
      const navItems = ['Dashboard', 'Websites', 'Content', 'Team', 'Analytics'];
      
      for (const item of navItems) {
        fireEvent.click(screen.getByText(item));
        await waitFor(() => {
          expect(screen.getByText(item)).toBeInTheDocument();
        });
      }
    });

    it('should handle responsive layout', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Check for mobile menu toggle
      expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument();

      // Toggle mobile menu
      fireEvent.click(screen.getByLabelText('Toggle menu'));
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeVisible();
      });
    });

    it('should handle user profile dropdown', async () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Click user profile
      fireEvent.click(screen.getByText('Test User'));

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      // Test logout
      fireEvent.click(screen.getByText('Logout'));
      
      await waitFor(() => {
        expect(screen.getByText('Login')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      const mockApi = require('../../lib/api');
      mockApi.api.get.mockRejectedValueOnce(new Error('Network error'));

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error loading data')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Test retry functionality
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockApi.api.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle form validation errors', async () => {
      render(
        <TestWrapper>
          <ContentPage />
        </TestWrapper>
      );

      // Try to create content without required fields
      fireEvent.click(screen.getByText('Create New Article'));

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
      });

      // Submit without filling required fields
      fireEvent.click(screen.getByText('Publish'));

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
        expect(screen.getByText('Content is required')).toBeInTheDocument();
      });
    });

    it('should handle loading states', async () => {
      // Mock loading state
      const mockUseWebsites = require('../../hooks/useWebsites');
      mockUseWebsites.useWebsites.mockReturnValueOnce({
        data: null,
        isLoading: true,
        error: null,
      });

      render(
        <TestWrapper>
          <WebsitesPage />
        </TestWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should handle real-time analytics updates', async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      // Initial state
      await waitFor(() => {
        expect(screen.getByText('1,250')).toBeInTheDocument();
      });

      // Simulate real-time update
      const mockUseAnalytics = require('../../hooks/useAnalytics');
      mockUseAnalytics.useAnalytics.mockReturnValueOnce({
        data: {
          total_views: 1300,
          unique_visitors: 920,
          bounce_rate: 0.33,
          avg_session_duration: 185,
        },
        isLoading: false,
        error: null,
      });

      // Trigger re-render
      fireEvent.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(screen.getByText('1,300')).toBeInTheDocument();
        expect(screen.getByText('920')).toBeInTheDocument();
      });
    });

    it('should handle content status updates', async () => {
      render(
        <TestWrapper>
          <ContentPage />
        </TestWrapper>
      );

      // Change content status
      fireEvent.click(screen.getAllByText('Draft')[0]);
      fireEvent.click(screen.getByText('Publish'));

      await waitFor(() => {
        expect(screen.getByText('Published')).toBeInTheDocument();
        expect(screen.getByText('Content published successfully')).toBeInTheDocument();
      });
    });
  });
});
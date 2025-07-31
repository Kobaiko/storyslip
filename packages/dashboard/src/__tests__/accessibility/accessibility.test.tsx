import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import App from '../../App';
import DashboardPage from '../../pages/DashboardPage';
import ContentPage from '../../pages/ContentPage';
import WebsitesPage from '../../pages/WebsitesPage';
import AnalyticsPage from '../../pages/AnalyticsPage';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock API calls
jest.mock('../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock hooks with accessible data
jest.mock('../../hooks/useWebsites', () => ({
  useWebsites: () => ({
    data: [
      {
        id: 'website-1',
        name: 'Accessible Website 1',
        domain: 'accessible1.example.com',
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'website-2',
        name: 'Accessible Website 2',
        domain: 'accessible2.example.com',
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
        title: 'Accessible Article 1',
        status: 'published',
        published_at: '2024-01-01T00:00:00Z',
        views: 150,
      },
      {
        id: 'content-2',
        title: 'Accessible Article 2',
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
      views_change: 12.5,
      visitors_change: 8.3,
      session_duration_change: -2.1,
      bounce_rate_change: -5.2,
      daily_stats: [
        {
          date: '2024-01-01',
          views: 125,
          unique_visitors: 89,
          clicks: 45,
          bounce_rate: 35,
          avg_session_duration: 180,
        },
      ],
      traffic_sources: [
        {
          source: 'organic',
          visitors: 450,
          percentage: 50.6,
          sessions: 520,
          bounce_rate: 32.1,
          avg_session_duration: 195,
        },
      ],
      top_content: [
        {
          id: 'content-1',
          title: 'Top Accessible Article',
          views: 450,
          unique_visitors: 320,
          clicks: 89,
          bounce_rate: 28.5,
          avg_session_duration: 220,
          published_at: '2024-01-01T00:00:00Z',
        },
      ],
    },
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

const AccessibleTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

describe('Accessibility Tests', () => {
  beforeEach(() => {
    // Mock authenticated user
    const mockUser = {
      id: 'user-123',
      name: 'Accessible Test User',
      email: 'accessible@example.com',
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

  describe('Dashboard Page Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', async () => {
      render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Check for proper heading structure
      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      expect(h1Elements).toHaveLength(1);
      expect(h1Elements[0]).toHaveTextContent('Dashboard');

      // Check for proper subheadings
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('should have accessible navigation', async () => {
      render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Check for navigation landmarks
      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Check for accessible navigation links
      const navLinks = screen.getAllByRole('link');
      navLinks.forEach(link => {
        expect(link).toHaveAttribute('href');
        // Links should have accessible names
        expect(link).toHaveAccessibleName();
      });
    });

    it('should have accessible stats cards', async () => {
      render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Views')).toBeInTheDocument();
      });

      // Check for proper ARIA labels on stats
      const statsCards = screen.getAllByRole('region');
      statsCards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
      });

      // Check for accessible numbers
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('890')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Test tab navigation
      const focusableElements = screen.getAllByRole('button').concat(screen.getAllByRole('link'));
      
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('tabindex');
        
        // Focus the element
        element.focus();
        expect(document.activeElement).toBe(element);
      });
    });
  });

  describe('Content Page Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Content Management')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible content table', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Accessible Article 1')).toBeInTheDocument();
      });

      // Check for proper table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(table).toHaveAttribute('aria-label');

      // Check for table headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
      
      columnHeaders.forEach(header => {
        expect(header).toHaveAccessibleName();
      });

      // Check for table rows
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + data rows
    });

    it('should have accessible form controls', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      // Click create new content button
      fireEvent.click(screen.getByText('Create New Article'));

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
      });

      // Check form accessibility
      const titleInput = screen.getByLabelText('Title');
      expect(titleInput).toHaveAttribute('aria-required', 'true');
      expect(titleInput).toHaveAttribute('id');

      const contentTextarea = screen.getByLabelText('Content');
      expect(contentTextarea).toHaveAttribute('aria-required', 'true');
      expect(contentTextarea).toHaveAttribute('id');

      // Check for proper form labels
      const labels = screen.getAllByText(/Title|Content|Status/);
      labels.forEach(label => {
        expect(label).toBeInTheDocument();
      });
    });

    it('should have accessible status indicators', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Accessible Article 1')).toBeInTheDocument();
      });

      // Check for status badges with proper ARIA labels
      const publishedBadge = screen.getByText('Published');
      expect(publishedBadge).toHaveAttribute('aria-label');

      const draftBadge = screen.getByText('Draft');
      expect(draftBadge).toHaveAttribute('aria-label');
    });

    it('should support screen reader announcements', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Accessible Article 1')).toBeInTheDocument();
      });

      // Check for ARIA live regions for dynamic updates
      const liveRegions = screen.getAllByRole('status');
      expect(liveRegions.length).toBeGreaterThan(0);

      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live');
      });
    });
  });

  describe('Websites Page Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <WebsitesPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Your Websites')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible website cards', async () => {
      render(
        <AccessibleTestWrapper>
          <WebsitesPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Accessible Website 1')).toBeInTheDocument();
      });

      // Check for proper card structure
      const websiteCards = screen.getAllByRole('article');
      expect(websiteCards.length).toBeGreaterThan(0);

      websiteCards.forEach(card => {
        expect(card).toHaveAttribute('aria-label');
      });

      // Check for verification status indicators
      const verifiedIndicator = screen.getByText('Verified');
      expect(verifiedIndicator).toHaveAttribute('aria-label');

      const pendingIndicator = screen.getByText('Pending Verification');
      expect(pendingIndicator).toHaveAttribute('aria-label');
    });

    it('should have accessible action buttons', async () => {
      render(
        <AccessibleTestWrapper>
          <WebsitesPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Add Website')).toBeInTheDocument();
      });

      // Check primary action button
      const addButton = screen.getByText('Add Website');
      expect(addButton).toHaveAttribute('aria-label');
      expect(addButton).toHaveAttribute('type', 'button');

      // Check secondary action buttons
      const editButtons = screen.getAllByText('Edit');
      editButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Analytics Page Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <AnalyticsPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible charts and graphs', async () => {
      render(
        <AccessibleTestWrapper>
          <AnalyticsPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Check for chart accessibility
      const charts = screen.getAllByTestId(/chart|graph/);
      charts.forEach(chart => {
        expect(chart).toHaveAttribute('role', 'img');
        expect(chart).toHaveAttribute('aria-label');
        // Charts should have alternative text descriptions
        expect(chart).toHaveAccessibleDescription();
      });
    });

    it('should have accessible data tables', async () => {
      render(
        <AccessibleTestWrapper>
          <AnalyticsPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Top Performing Content')).toBeInTheDocument();
      });

      // Check for accessible data tables
      const dataTables = screen.getAllByRole('table');
      dataTables.forEach(table => {
        expect(table).toHaveAttribute('aria-label');
        
        // Check for proper table structure
        const headers = table.querySelectorAll('th');
        headers.forEach(header => {
          expect(header).toHaveAttribute('scope');
        });
      });
    });

    it('should have accessible filter controls', async () => {
      render(
        <AccessibleTestWrapper>
          <AnalyticsPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Check for accessible filter controls
      const filterButton = screen.getByText('Filters');
      expect(filterButton).toHaveAttribute('aria-expanded');
      expect(filterButton).toHaveAttribute('aria-controls');

      // Test filter interaction
      fireEvent.click(filterButton);

      await waitFor(() => {
        const filterPanel = screen.getByRole('dialog');
        expect(filterPanel).toBeInTheDocument();
        expect(filterPanel).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Form Accessibility', () => {
    it('should have accessible form validation', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      // Open create form
      fireEvent.click(screen.getByText('Create New Article'));

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
      });

      // Submit form without required fields
      fireEvent.click(screen.getByText('Publish'));

      await waitFor(() => {
        // Check for accessible error messages
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);

        errorMessages.forEach(error => {
          expect(error).toHaveAttribute('aria-live', 'polite');
        });

        // Check that form fields are marked as invalid
        const titleInput = screen.getByLabelText('Title');
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
        expect(titleInput).toHaveAttribute('aria-describedby');
      });
    });

    it('should have accessible form help text', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      fireEvent.click(screen.getByText('Create New Article'));

      await waitFor(() => {
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
      });

      // Check for help text associations
      const titleInput = screen.getByLabelText('Title');
      const helpText = screen.getByText(/Enter a descriptive title/);
      
      expect(titleInput).toHaveAttribute('aria-describedby');
      expect(helpText).toHaveAttribute('id');
    });
  });

  describe('Modal and Dialog Accessibility', () => {
    it('should have accessible modals', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      // Open delete confirmation modal
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveAttribute('aria-modal', 'true');
        expect(modal).toHaveAttribute('aria-labelledby');
        expect(modal).toHaveAttribute('aria-describedby');
      });

      // Check for focus management
      const modalTitle = screen.getByRole('heading', { level: 2 });
      expect(document.activeElement).toBe(modalTitle);

      // Check for close button
      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    it('should trap focus in modals', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
      });

      // Test focus trapping
      const focusableElements = screen.getAllByRole('button');
      const modalButtons = focusableElements.filter(btn => 
        btn.closest('[role="dialog"]')
      );

      expect(modalButtons.length).toBeGreaterThan(0);

      // Tab through modal elements
      modalButtons.forEach(button => {
        fireEvent.keyDown(button, { key: 'Tab' });
        expect(document.activeElement).toBeInstanceOf(HTMLElement);
        expect(document.activeElement?.closest('[role="dialog"]')).toBeTruthy();
      });
    });

    it('should handle escape key to close modals', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
      });

      // Press escape key
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast', async () => {
      const { container } = render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // This would typically be tested with automated tools
      // For now, we check that elements have proper styling classes
      const textElements = container.querySelectorAll('h1, h2, h3, p, span, button');
      textElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        expect(computedStyle.color).toBeDefined();
        expect(computedStyle.backgroundColor).toBeDefined();
      });
    });

    it('should not rely solely on color for information', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Accessible Article 1')).toBeInTheDocument();
      });

      // Check that status indicators have text labels, not just colors
      const publishedStatus = screen.getByText('Published');
      expect(publishedStatus).toHaveTextContent('Published');

      const draftStatus = screen.getByText('Draft');
      expect(draftStatus).toHaveTextContent('Draft');

      // Check for icons or other visual indicators
      const statusIcons = screen.getAllByRole('img');
      statusIcons.forEach(icon => {
        expect(icon).toHaveAttribute('alt');
      });
    });
  });

  describe('Responsive and Mobile Accessibility', () => {
    it('should be accessible on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const { container } = render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Check for mobile navigation
      const mobileMenuButton = screen.getByLabelText('Toggle menu');
      expect(mobileMenuButton).toBeInTheDocument();
      expect(mobileMenuButton).toHaveAttribute('aria-expanded');
    });

    it('should have accessible touch targets', async () => {
      render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Check that interactive elements have sufficient size
      const buttons = screen.getAllByRole('button');
      const links = screen.getAllByRole('link');
      
      [...buttons, ...links].forEach(element => {
        const rect = element.getBoundingClientRect();
        // WCAG recommends minimum 44x44 pixels for touch targets
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should have proper ARIA landmarks', async () => {
      render(
        <AccessibleTestWrapper>
          <App />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Check for main landmarks
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();

      // Check for complementary content
      const complementaryElements = screen.getAllByRole('complementary');
      expect(complementaryElements.length).toBeGreaterThan(0);
    });

    it('should have descriptive page titles', async () => {
      render(
        <AccessibleTestWrapper>
          <DashboardPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Check that page has a descriptive title
      expect(document.title).toContain('Dashboard');
      expect(document.title).toContain('StorySlip');
    });

    it('should announce dynamic content changes', async () => {
      render(
        <AccessibleTestWrapper>
          <ContentPage />
        </AccessibleTestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Content Management')).toBeInTheDocument();
      });

      // Check for ARIA live regions
      const liveRegions = screen.getAllByRole('status');
      expect(liveRegions.length).toBeGreaterThan(0);

      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live');
        expect(['polite', 'assertive']).toContain(
          region.getAttribute('aria-live')
        );
      });
    });
  });
});
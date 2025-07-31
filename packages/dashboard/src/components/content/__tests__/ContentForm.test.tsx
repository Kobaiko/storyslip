import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContentForm } from '../ContentForm';
import { Content } from '../../../hooks/useContent';

// Mock the hooks and dependencies
jest.mock('../../../hooks/useContent');
jest.mock('../../../lib/utils', () => ({
  slugify: (text: string) => text.toLowerCase().replace(/\s+/g, '-'),
  formatDate: (date: string) => new Date(date).toLocaleDateString(),
}));

const mockContent: Content = {
  id: '1',
  title: 'Test Content',
  slug: 'test-content',
  body: '<p>Test content body</p>',
  excerpt: 'Test excerpt',
  status: 'draft',
  author_id: 'user1',
  website_id: 'website1',
  view_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  author: {
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com',
  },
  categories: [
    { id: 'cat1', name: 'Technology', slug: 'technology' },
  ],
  tags: [
    { id: 'tag1', name: 'React', slug: 'react' },
  ],
};

const mockCategories = [
  { id: 'cat1', name: 'Technology', slug: 'technology' },
  { id: 'cat2', name: 'Design', slug: 'design' },
];

const mockTags = [
  { id: 'tag1', name: 'React', slug: 'react' },
  { id: 'tag2', name: 'JavaScript', slug: 'javascript' },
];

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ContentForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnSaveDraft = jest.fn();
  const mockOnPreview = jest.fn();
  const mockOnImageUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create form correctly', () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    expect(screen.getByText('Create New Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Excerpt (Optional)')).toBeInTheDocument();
  });

  it('renders edit form with content data', () => {
    renderWithQueryClient(
      <ContentForm
        content={mockContent}
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="edit"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    expect(screen.getByText('Edit Content')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Content')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test-content')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test excerpt')).toBeInTheDocument();
  });

  it('auto-generates slug from title in create mode', async () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const slugInput = screen.getByLabelText('Slug');

    fireEvent.change(titleInput, { target: { value: 'My New Article' } });

    await waitFor(() => {
      expect(slugInput).toHaveValue('my-new-article');
    });
  });

  it('validates required fields', async () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with form data', async () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const slugInput = screen.getByLabelText('Slug');
    const submitButton = screen.getByRole('button', { name: /save/i });

    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(slugInput, { target: { value: 'test-title' } });

    // Mock the rich text editor content
    const bodyInput = document.querySelector('[contenteditable]');
    if (bodyInput) {
      bodyInput.innerHTML = '<p>Test content</p>';
      fireEvent.input(bodyInput);
    }

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          slug: 'test-title',
          body: '<p>Test content</p>',
          status: 'draft',
        })
      );
    });
  });

  it('calls onSaveDraft when save draft button is clicked', async () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        onSaveDraft={mockOnSaveDraft}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const saveDraftButton = screen.getByRole('button', { name: /save draft/i });

    fireEvent.change(titleInput, { target: { value: 'Draft Title' } });
    fireEvent.click(saveDraftButton);

    await waitFor(() => {
      expect(mockOnSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Draft Title',
          status: 'draft',
        })
      );
    });
  });

  it('calls onPreview when preview button is clicked', () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        onPreview={mockOnPreview}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const previewButton = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    expect(mockOnPreview).toHaveBeenCalled();
  });

  it('handles category selection', () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const technologyCheckbox = screen.getByLabelText('Technology');
    fireEvent.click(technologyCheckbox);

    expect(technologyCheckbox).toBeChecked();
  });

  it('handles tag selection', () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const reactCheckbox = screen.getByLabelText('React');
    fireEvent.click(reactCheckbox);

    expect(reactCheckbox).toBeChecked();
  });

  it('shows scheduled date input when status is scheduled', () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'scheduled' } });

    expect(screen.getByLabelText('Schedule Date')).toBeInTheDocument();
  });

  it('validates SEO title length', async () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const seoTitleInput = screen.getByLabelText('SEO Title');
    const longTitle = 'a'.repeat(70); // Exceeds 60 character limit

    fireEvent.change(seoTitleInput, { target: { value: longTitle } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('SEO title should be less than 60 characters')).toBeInTheDocument();
    });
  });

  it('validates SEO description length', async () => {
    renderWithQueryClient(
      <ContentForm
        websiteId="website1"
        onSubmit={mockOnSubmit}
        mode="create"
        categories={mockCategories}
        tags={mockTags}
      />
    );

    const seoDescriptionInput = screen.getByLabelText('SEO Description');
    const longDescription = 'a'.repeat(170); // Exceeds 160 character limit

    fireEvent.change(seoDescriptionInput, { target: { value: longDescription } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('SEO description should be less than 160 characters')).toBeInTheDocument();
    });
  });
});
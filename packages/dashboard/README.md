# StorySlip Dashboard

The StorySlip Dashboard is a modern React-based admin interface for managing embeddable content. Built with TypeScript, Tailwind CSS, and modern React patterns.

## Features

### 🎨 **Modern UI/UX**
- Clean, responsive design with Tailwind CSS
- Comprehensive component library with consistent design system
- Mobile-first responsive layout
- Dark mode support (coming soon)

### 🔐 **Authentication & Security**
- JWT-based authentication
- Protected routes with automatic redirects
- Role-based access control
- Secure token management

### 📊 **Dashboard Overview**
- Real-time statistics and metrics
- Recent activity feed
- Quick action shortcuts
- Performance insights

### 📝 **Content Management**
- Create, edit, and publish content
- Rich text editor support
- Media management
- Content scheduling
- SEO optimization tools

### 🎛️ **Widget Management**
- Visual widget builder
- Multiple widget types (content list, featured article, category feed)
- Real-time preview
- Embed code generation
- Analytics tracking

### 👥 **Team Collaboration**
- User management and invitations
- Role-based permissions
- Activity logging
- Team analytics

### 📈 **Analytics & Insights**
- Content performance metrics
- Widget engagement tracking
- Traffic source analysis
- Custom reporting

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, Card, etc.)
│   └── layout/         # Layout components (Sidebar, Header, etc.)
├── contexts/           # React contexts (Auth, Theme, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries (API client, query client)
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   └── ...            # Feature pages
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── __tests__/          # Test files
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- StorySlip API server running

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=StorySlip
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run type-check` - Run TypeScript type checking

### Code Style

The project uses:
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety

### Component Development

#### Creating New Components

1. Create component file in appropriate directory
2. Export from index file if in `ui/` directory
3. Add TypeScript interfaces for props
4. Include JSDoc comments for complex components
5. Write tests for component behavior

Example component structure:
```tsx
import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export interface MyComponentProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const MyComponent = forwardRef<HTMLDivElement, MyComponentProps>(
  ({ variant = 'primary', children, ...props }, ref) => {
    return (
      <div
        className={clsx(
          'base-classes',
          variant === 'primary' && 'primary-classes',
          variant === 'secondary' && 'secondary-classes'
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MyComponent.displayName = 'MyComponent';

export { MyComponent };
```

### State Management

The dashboard uses React Query for server state management:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/queryClient';

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: queryKeys.content.list(websiteId),
  queryFn: () => apiClient.get(`/websites/${websiteId}/content`),
});

// Mutations
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: (data) => apiClient.post('/content', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
  },
});
```

### Authentication

The dashboard uses a context-based authentication system:

```tsx
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, login, logout, isAuthenticated } = useAuth();
  
  // Component logic
};
```

### Routing

Protected routes are automatically handled:

```tsx
import { ProtectedRoute } from '../components/ProtectedRoute';

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

## Testing

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Writing Tests

Example test structure:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent>Test</MyComponent>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles interactions', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick}>Click me</MyComponent>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## API Integration

The dashboard communicates with the StorySlip API using a centralized API client:

```tsx
import { apiClient } from '../lib/api';

// GET request
const response = await apiClient.get('/content');

// POST request
const response = await apiClient.post('/content', {
  title: 'New Article',
  body: 'Article content...',
});

// Error handling is automatic
```

## Deployment

### Environment Variables

Production environment variables:
```env
VITE_API_URL=https://api.storyslip.com
VITE_APP_NAME=StorySlip
```

### Build Process

1. Install dependencies: `npm ci`
2. Build application: `npm run build`
3. Deploy `dist/` directory to your hosting provider

### Hosting Recommendations

- **Vercel**: Zero-config deployment with Git integration
- **Netlify**: Easy deployment with form handling
- **AWS S3 + CloudFront**: Scalable static hosting
- **GitHub Pages**: Free hosting for open source projects

## Performance

### Optimization Features

- **Code Splitting**: Automatic route-based code splitting
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image and font optimization
- **Caching**: Aggressive caching with React Query
- **Lazy Loading**: Component and route lazy loading

### Performance Monitoring

The dashboard includes performance monitoring:
- Bundle size analysis
- Runtime performance metrics
- User interaction tracking
- Error boundary reporting

## Accessibility

The dashboard follows WCAG 2.1 AA guidelines:
- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance
- Focus management

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Commit changes: `git commit -m 'Add new feature'`
7. Push to branch: `git push origin feature/new-feature`
8. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Documentation: [https://docs.storyslip.com](https://docs.storyslip.com)
- Issues: [GitHub Issues](https://github.com/storyslip/storyslip/issues)
- Email: support@storyslip.com
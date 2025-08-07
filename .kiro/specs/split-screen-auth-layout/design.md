# Split-Screen Authentication Layout Design

## Overview

This design document outlines the implementation of a modern split-screen authentication layout for StorySlip. The design features a product preview section on the left showcasing the dashboard interface, and authentication forms on the right with improved spacing and visual design. The layout will be fully responsive and integrate seamlessly with the existing Supabase authentication system.

## Architecture

### Layout Structure

The split-screen authentication system will consist of:

1. **AuthLayout Component** - Main container managing the split-screen layout
2. **ProductPreview Component** - Left panel with dashboard preview and branding
3. **AuthPanel Component** - Right panel containing authentication forms
4. **Enhanced Form Components** - Improved input fields and form styling

### Component Hierarchy

```
AuthLayout
├── ProductPreview
│   ├── BrandingSection
│   ├── DashboardPreview (image/mockup)
│   ├── FeatureHighlights
│   └── ValueProposition
└── AuthPanel
    ├── AuthHeader (logo, title, description)
    ├── AuthForm (login/register/forgot password)
    └── AuthFooter (links, terms, etc.)
```

## Components and Interfaces

### 1. AuthLayout Component

**File:** `packages/dashboard/src/components/auth/AuthLayout.tsx`

**Purpose:** Main container component that manages the split-screen layout and responsive behavior.

**Props Interface:**
```typescript
interface AuthLayoutProps {
  children: React.ReactNode;
  showPreview?: boolean; // Hide preview on mobile
  previewContent?: React.ReactNode; // Custom preview content
}
```

**Key Features:**
- 50/50 split on desktop (≥1024px)
- Vertical stack on tablet (768px-1023px)
- Form-only on mobile (<768px)
- Smooth responsive transitions

### 2. ProductPreview Component

**File:** `packages/dashboard/src/components/auth/ProductPreview.tsx`

**Purpose:** Left panel showcasing StorySlip dashboard and value proposition.

**Props Interface:**
```typescript
interface ProductPreviewProps {
  variant?: 'dashboard' | 'features' | 'benefits';
  showFeatures?: boolean;
  customImage?: string;
}
```

**Content Elements:**
- StorySlip logo and branding
- Dashboard screenshot/mockup
- Key feature highlights
- Value proposition text
- Subtle gradient overlay for text readability

### 3. AuthPanel Component

**File:** `packages/dashboard/src/components/auth/AuthPanel.tsx`

**Purpose:** Right panel container for authentication forms with improved styling.

**Props Interface:**
```typescript
interface AuthPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  showBackLink?: boolean;
  backLinkText?: string;
  backLinkHref?: string;
}
```

**Features:**
- Centered form layout with optimal width
- Consistent padding and spacing
- Header with title and description
- Optional back navigation link

### 4. Enhanced Input Components

**File:** `packages/dashboard/src/components/ui/Input.tsx` (enhanced)

**Improvements:**
- Increased default width (400px minimum)
- Better padding and spacing (16px horizontal, 12px vertical)
- Improved focus states with blue border
- Consistent height (48px for medium size)
- Better typography (16px font size to prevent iOS zoom)

## Data Models

### Authentication Form Data

```typescript
interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface ForgotPasswordFormData {
  email: string;
}
```

### Preview Content Configuration

```typescript
interface PreviewConfig {
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  branding: {
    logo: string;
    title: string;
    subtitle: string;
  };
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  valueProposition: {
    headline: string;
    description: string;
  };
}
```

## Error Handling

### Authentication Errors
- Supabase authentication errors displayed with clear messaging
- Form validation errors shown inline with red styling
- Network errors handled with retry mechanisms
- Session management errors with appropriate redirects

### Layout Errors
- Graceful fallback to single-column layout if split-screen fails
- Image loading errors with placeholder content
- Responsive breakpoint failures with mobile-first fallback

### Accessibility Errors
- Screen reader compatibility for all interactive elements
- Keyboard navigation support with proper focus management
- Color contrast compliance for all text and interactive elements

## Testing Strategy

### Visual Testing
- Screenshot comparisons across different screen sizes
- Cross-browser compatibility testing
- Form layout consistency verification
- Image loading and display testing

### Functional Testing
- Supabase authentication flow testing
- Form validation and submission testing
- Responsive behavior testing
- Navigation and routing testing

### Accessibility Testing
- Keyboard navigation testing
- Screen reader compatibility
- Color contrast validation
- Focus management verification

### Performance Testing
- Image loading optimization
- Component rendering performance
- Mobile device performance testing
- Bundle size impact analysis

## Implementation Details

### Responsive Breakpoints

**Desktop (≥1024px):**
```css
.auth-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
}
```

**Tablet (768px-1023px):**
```css
.auth-layout {
  display: flex;
  flex-direction: column;
}
.product-preview {
  height: 40vh;
}
.auth-panel {
  flex: 1;
  min-height: 60vh;
}
```

**Mobile (<768px):**
```css
.auth-layout {
  display: block;
}
.product-preview {
  display: none;
}
.auth-panel {
  min-height: 100vh;
  padding: 1rem;
}
```

### Form Styling Specifications

**Input Fields:**
- Width: 100% of container (max 400px)
- Height: 48px
- Padding: 12px 16px
- Border: 1px solid #d1d5db
- Border radius: 6px
- Font size: 16px (prevents iOS zoom)
- Focus border: 2px solid #3b82f6

**Form Container:**
- Max width: 400px
- Centered alignment
- Padding: 2rem
- Background: white
- Border radius: 8px (on mobile)

**Spacing:**
- Between form fields: 1.5rem (24px)
- Between form sections: 2rem (32px)
- Form container padding: 2rem (32px)

### Product Preview Content

**Dashboard Screenshot:**
- High-quality screenshot of the main dashboard
- Optimized for web (WebP format with PNG fallback)
- Responsive sizing with proper aspect ratio
- Subtle shadow and border for depth

**Feature Highlights:**
- 3-4 key features with icons
- Positioned as overlay on the preview image
- Semi-transparent background for readability
- Smooth fade-in animations

**Branding Elements:**
- StorySlip logo prominently displayed
- Consistent color scheme with main application
- Professional typography hierarchy
- Value proposition messaging

### Supabase Integration

**Authentication Flow:**
```typescript
const handleRegister = async (data: RegisterFormData) => {
  try {
    const { user, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    });
    
    if (error) throw error;
    
    // Redirect to dashboard or email confirmation
    navigate('/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```

**Session Management:**
- Automatic session restoration on page load
- Proper cleanup on logout
- Redirect handling for authenticated users
- Token refresh management

### Performance Optimizations

**Image Optimization:**
- Lazy loading for preview images
- Multiple image formats (WebP, PNG)
- Responsive image sizing
- Preload critical images

**Code Splitting:**
- Separate bundles for auth pages
- Lazy load non-critical components
- Optimize bundle size for faster loading

**Caching Strategy:**
- Cache preview images
- Store form data temporarily (excluding passwords)
- Cache authentication state
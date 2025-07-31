# StorySlip

An embeddable SaaS Content Management System that allows developers to add professional content management capabilities to any website using a simple code snippet.

## Project Structure

This is a monorepo containing three main packages:

```
storyslip/
├── packages/
│   ├── api/          # Backend API (Node.js/Express + Supabase)
│   ├── dashboard/    # Admin Dashboard (React/TypeScript)
│   └── widget/       # Embed Widget (Vanilla JavaScript)
├── .kiro/           # Kiro specs and configuration
└── docs/            # Documentation
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

```bash
# Install dependencies for all packages
npm install

# Start all services in development mode
npm run dev
```

This will start:
- API server on http://localhost:3001
- Dashboard on http://localhost:3000  
- Widget demo on http://localhost:3002

### Individual Package Commands

```bash
# API server
npm run dev:api

# Dashboard
npm run dev:dashboard

# Widget
npm run dev:widget
```

## Package Details

### API (`packages/api`)
- **Tech Stack**: Node.js, Express, TypeScript, Supabase
- **Port**: 3001
- **Purpose**: Backend API for user management, content management, and widget content delivery

### Dashboard (`packages/dashboard`)
- **Tech Stack**: React, TypeScript, Vite, Tailwind CSS
- **Port**: 3000
- **Purpose**: Admin interface for managing content, websites, and users

### Widget (`packages/widget`)
- **Tech Stack**: Vanilla TypeScript, Webpack
- **Port**: 3002 (demo)
- **Purpose**: Lightweight embeddable widget for displaying content on third-party sites

## Development

### Code Quality

```bash
# Lint all packages
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

### Testing

```bash
# Run tests for all packages
npm test

# Run tests in watch mode
npm run test:watch
```

### Building

```bash
# Build all packages
npm run build
```

## Environment Setup

1. Copy environment example files:
```bash
cp packages/api/.env.example packages/api/.env
```

2. Configure your Supabase credentials in `packages/api/.env`

## Architecture

StorySlip follows a microservices architecture with:

- **Admin Dashboard**: React SPA for content management
- **Widget System**: Lightweight JavaScript for content display  
- **Backend APIs**: Node.js/Express services with Supabase
- **Database**: PostgreSQL via Supabase with row-level security
- **Authentication**: JWT-based with refresh token rotation

## Key Features

- 🚀 **Fast Setup**: Add CMS to any website in under 3 minutes
- 🔒 **Secure**: JWT authentication with role-based access control
- 🎨 **White-label**: Full branding customization for agencies
- 📊 **Analytics**: Built-in content performance tracking
- 🔧 **Integration Testing**: Real-time embed code validation
- 📱 **Responsive**: Works on all devices and screen sizes

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure all checks pass before submitting PRs

## License

MIT License - see LICENSE file for details
# StorySlip Integration Guide

This document explains how the StorySlip marketing site is connected to the dashboard and API.

## Architecture Overview

StorySlip consists of three main components:

1. **Marketing Site** (`packages/marketing`) - Next.js app running on port 3002
2. **Dashboard** (`packages/dashboard`) - React/Vite app running on port 3000  
3. **API** (`packages/api`) - Node.js/Express API running on port 3001

## How They're Connected

### Marketing Site → Dashboard
All CTA buttons on the marketing site now point to the dashboard:

- **"Get Started"** buttons → `http://localhost:3000/register`
- **"Sign In"** links → `http://localhost:3000/login`
- **"Start Free Trial"** buttons → `http://localhost:3000/register`
- **Pricing plans** → `http://localhost:3000/register?plan=pro` (with plan parameter)

### Dashboard → Marketing Site
The dashboard includes links back to the marketing site:

- **Header** → "Back to Marketing" link
- **Auth pages** → "Back to StorySlip.com" link

### Marketing Site → API
- **"View Docs"** button → `http://localhost:3001/api/docs`

## Environment Configuration

### Marketing Site (packages/marketing/.env.local)
```env
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MARKETING_URL=http://localhost:3002
```

### Dashboard (packages/dashboard/.env.local)
```env
VITE_MARKETING_URL=http://localhost:3002
VITE_API_URL=http://localhost:3001
VITE_DASHBOARD_URL=http://localhost:3000
```

## Configuration Files

### Marketing Site
- `packages/marketing/src/config/app.ts` - Centralized URL configuration
- Uses `urls` helper functions for consistent linking

### Dashboard  
- `packages/dashboard/src/config/app.ts` - Centralized URL configuration
- Uses `urls` helper functions for consistent linking

## User Flow

1. **Discovery**: User visits marketing site at `http://localhost:3002`
2. **Registration**: User clicks "Get Started" → redirected to `http://localhost:3000/register`
3. **Authentication**: User creates account or logs in
4. **Dashboard**: User lands in dashboard at `http://localhost:3000`
5. **Content Management**: User can manage content, websites, etc.
6. **Documentation**: User can access API docs at `http://localhost:3001/api/docs`

## Development Setup

1. Start all services:
   ```bash
   ./start-storyslip.sh
   ```

2. Access the applications:
   - Marketing: http://localhost:3002
   - Dashboard: http://localhost:3000  
   - API Docs: http://localhost:3001/api/docs

## Production Deployment

For production, update the environment variables to use your production URLs:

### Marketing Site (.env.production)
```env
NEXT_PUBLIC_DASHBOARD_URL=https://app.storyslip.com
NEXT_PUBLIC_API_URL=https://api.storyslip.com
NEXT_PUBLIC_MARKETING_URL=https://storyslip.com
```

### Dashboard (.env.production)
```env
VITE_MARKETING_URL=https://storyslip.com
VITE_API_URL=https://api.storyslip.com
VITE_DASHBOARD_URL=https://app.storyslip.com
```

## Key Features

- ✅ Seamless navigation between marketing and dashboard
- ✅ Environment-based URL configuration
- ✅ Plan parameter passing for pricing tiers
- ✅ Consistent branding across all applications
- ✅ Mobile-responsive design
- ✅ Back navigation from dashboard to marketing
- ✅ Direct links to API documentation

## Contact Integration

- **Sales inquiries** → `sales@storyslip.com`
- **Demo requests** → `demo@storyslip.com`
- **Support** → `support@storyslip.com`

All contact links are configured in the app config files for easy maintenance.
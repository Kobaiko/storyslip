# Testing StorySlip Integration

This guide helps you test the integration between the marketing site, dashboard, and API.

## Quick Test Steps

### 1. Start All Services
```bash
./start-storyslip.sh
```

Wait for all services to start. You should see:
- Marketing Site: http://localhost:3002
- Dashboard: http://localhost:3000  
- API: http://localhost:3001

### 2. Test URL Configuration
Visit the test page: http://localhost:3002/test-urls

This page shows:
- Environment configuration values
- Generated URLs
- Test links you can click

### 3. Test Marketing Site Navigation

#### Header Navigation
- Visit http://localhost:3002
- Check the header navigation includes "Documentation" 
- Click "Documentation" → should open http://localhost:3001/api/docs in new tab
- Click "Sign In" → should go to http://localhost:3000/login
- Click "Get Started" → should go to http://localhost:3000/register

#### Hero Section
- Click "Start Free Trial" button → should go to http://localhost:3000/register

#### Pricing Section  
- Click "Get Started" (Free plan) → should go to http://localhost:3000/register
- Click "Start Free Trial" (Pro plan) → should go to http://localhost:3000/register?plan=pro
- Click "Contact Sales" (Enterprise) → should open email client

#### CTA Section
- Click "Start Free Trial" → should go to http://localhost:3000/register
- Click "Schedule Demo" → should open email client

#### Demo Section
- Click "Start Free Trial" → should go to http://localhost:3000/register  
- Click "View Docs" → should go to http://localhost:3001/api/docs

### 4. Test Dashboard Navigation

#### From Dashboard to Marketing
- Visit http://localhost:3000
- Look for "Back to Marketing" link in header → should go to http://localhost:3002

#### Auth Pages
- Visit http://localhost:3000/login
- Click "Back to StorySlip.com" → should go to http://localhost:3002
- Visit http://localhost:3000/register  
- Click "Back to StorySlip.com" → should go to http://localhost:3002

### 5. Test API Documentation
- Visit http://localhost:3001/api/docs
- Should show Swagger/OpenAPI documentation

## Troubleshooting

### URLs Not Working
1. Check environment files exist:
   - `packages/marketing/.env.local`
   - `packages/dashboard/.env.local`

2. Check the URLs in test page: http://localhost:3002/test-urls

3. Verify services are running on correct ports:
   ```bash
   curl http://localhost:3002  # Marketing (Next.js)
   curl http://localhost:3000  # Dashboard (Vite)  
   curl http://localhost:3001  # API (Express)
   ```

### Services Not Starting
1. Check Docker is running: `docker info`
2. Check ports are available: `lsof -i :3000,3001,3002`
3. Check logs in terminal where you ran `./start-storyslip.sh`

### TypeScript Errors
- Marketing site: `cd packages/marketing && npm run type-check`
- Dashboard: `cd packages/dashboard && npm run type-check`

### Environment Variables Not Loading
1. Restart the development servers
2. Check `.env.local` files have correct format
3. For Next.js, variables must start with `NEXT_PUBLIC_`
4. For Vite, variables must start with `VITE_`

## Expected Behavior

✅ **Working Integration:**
- All CTA buttons redirect to dashboard auth pages
- Documentation links open API docs
- Back navigation works from dashboard to marketing
- Email links open default email client
- External links open in new tabs

❌ **Common Issues:**
- 404 errors → Check services are running
- Wrong URLs → Check environment configuration  
- CORS errors → Check API CORS settings
- TypeScript errors → Check type definitions

## Production Deployment

For production, update environment variables:

**Marketing (.env.production):**
```env
NEXT_PUBLIC_DASHBOARD_URL=https://app.storyslip.com
NEXT_PUBLIC_API_URL=https://api.storyslip.com  
NEXT_PUBLIC_MARKETING_URL=https://storyslip.com
```

**Dashboard (.env.production):**
```env
VITE_MARKETING_URL=https://storyslip.com
VITE_API_URL=https://api.storyslip.com
VITE_DASHBOARD_URL=https://app.storyslip.com
```
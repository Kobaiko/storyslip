import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'StorySlip API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      docs: '/api/docs',
      auth: '/api/auth/*',
      content: '/api/content',
      websites: '/api/websites',
      analytics: '/api/analytics/*',
      team: '/api/team/*',
      widget: '/api/widget/:websiteId'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'storyslip-api'
  });
});

// API health check endpoint
app.get('/api/monitoring/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'storyslip-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'healthy',
      redis: 'healthy',
      external_apis: 'healthy'
    }
  });
});

// Demo API endpoints for showcase
app.get('/api/content', (req, res) => {
  res.json({
    data: [
      {
        id: 'demo-post-1',
        title: 'Welcome to StorySlip',
        content: 'This is a demo blog post showcasing the content management features.',
        status: 'published',
        author: 'Demo Admin',
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-post-2',
        title: 'AI-Powered Content Creation',
        content: 'Learn how StorySlip uses AI to help you create amazing content.',
        status: 'published',
        author: 'Demo Admin',
        created_at: new Date().toISOString()
      }
    ],
    total: 2,
    page: 1,
    limit: 10
  });
});

app.get('/api/widgets', (req, res) => {
  res.json({
    data: [
      {
        id: 'demo-widget-1',
        name: 'Blog Feed',
        type: 'blog-feed',
        theme: 'modern',
        config: { limit: 5 },
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-widget-2',
        name: 'Content Showcase',
        type: 'content-grid',
        theme: 'minimal',
        config: { columns: 3 },
        created_at: new Date().toISOString()
      }
    ],
    total: 2
  });
});

app.get('/api/analytics/overview', (req, res) => {
  res.json({
    views: 12543,
    visitors: 8921,
    bounce_rate: 0.32,
    avg_session_duration: 245,
    top_content: [
      { title: 'Welcome to StorySlip', views: 3421 },
      { title: 'AI-Powered Content', views: 2876 }
    ],
    traffic_sources: {
      direct: 45,
      search: 32,
      social: 15,
      referral: 8
    }
  });
});

app.get('/api/team/members', (req, res) => {
  res.json({
    data: [
      {
        id: 'demo-admin',
        name: 'Demo Admin',
        email: 'admin@storyslip.com',
        role: 'admin',
        status: 'active',
        last_active: new Date().toISOString()
      },
      {
        id: 'demo-user',
        name: 'Demo User',
        email: 'user@storyslip.com',
        role: 'user',
        status: 'active',
        last_active: new Date().toISOString()
      }
    ],
    total: 2
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'StorySlip API',
    version: '1.0.0',
    description: 'Content Management System API',
    endpoints: {
      health: 'GET /health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile'
      },
      content: {
        list: 'GET /api/content',
        create: 'POST /api/content',
        get: 'GET /api/content/:id',
        update: 'PUT /api/content/:id',
        delete: 'DELETE /api/content/:id'
      },
      websites: {
        list: 'GET /api/websites',
        create: 'POST /api/websites'
      }
    }
  });
});

// Mock auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  res.json({
    success: true,
    user: {
      id: '1',
      email,
      name,
      created_at: new Date().toISOString()
    },
    token: 'mock-jwt-token'
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  res.json({
    success: true,
    user: {
      id: '1',
      email,
      name: 'Demo User',
      created_at: new Date().toISOString()
    },
    token: 'mock-jwt-token'
  });
});

app.get('/api/auth/profile', (req, res) => {
  res.json({
    id: '1',
    email: 'demo@storyslip.com',
    name: 'Demo User',
    created_at: new Date().toISOString()
  });
});

// Mock content endpoints
app.get('/api/content', (req, res) => {
  res.json({
    content: [
      {
        id: '1',
        title: 'Welcome to StorySlip',
        content: 'This is your first piece of content!',
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Getting Started Guide',
        content: 'Learn how to use StorySlip CMS effectively.',
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    total: 2,
    page: 1,
    limit: 10
  });
});

app.post('/api/content', (req, res) => {
  const { title, content, status = 'draft' } = req.body;
  res.json({
    id: Date.now().toString(),
    title,
    content,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
});

app.get('/api/content/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    title: 'Sample Content',
    content: 'This is sample content from the API.',
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
});

// Mock websites endpoints
app.get('/api/websites', (req, res) => {
  res.json({
    websites: [
      {
        id: '1',
        name: 'My Website',
        domain: 'example.com',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ],
    total: 1
  });
});

app.post('/api/websites', (req, res) => {
  const { name, domain } = req.body;
  res.json({
    id: Date.now().toString(),
    name,
    domain,
    status: 'active',
    created_at: new Date().toISOString()
  });
});

// Mock analytics endpoints
app.get('/api/analytics/stats', (req, res) => {
  res.json({
    totalContent: 12,
    totalViews: 1543,
    totalWebsites: 3,
    activeUsers: 8
  });
});

// Mock team endpoints
app.get('/api/team/members', (req, res) => {
  res.json({
    members: [
      {
        id: '1',
        name: 'Demo User',
        email: 'demo@storyslip.com',
        role: 'admin',
        status: 'active'
      }
    ]
  });
});

// Widget endpoints
app.get('/api/widget/:websiteId', (req, res) => {
  const { websiteId } = req.params;
  res.json({
    websiteId,
    content: [
      {
        id: '1',
        title: 'Featured Content',
        excerpt: 'This is featured content for your website.',
        url: '/content/1'
      }
    ],
    branding: {
      primaryColor: '#3b82f6',
      fontFamily: 'Inter, sans-serif'
    }
  });
});

// Catch all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StorySlip API Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

export default app;
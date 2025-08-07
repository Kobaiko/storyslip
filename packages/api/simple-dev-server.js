const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// Mock data
const mockData = {
  user: {
    id: 'user-123',
    name: 'Demo User',
    email: 'demo@storyslip.com',
    avatar_url: null,
    is_verified: true,
    created_at: new Date().toISOString()
  },
  websites: [
    {
      id: 'website-123',
      name: 'Demo Website',
      domain: 'demo.example.com',
      is_verified: true,
      created_at: new Date().toISOString()
    }
  ],
  content: [
    {
      id: 'content-123',
      title: 'Welcome to StorySlip',
      content: '<p>This is a demo article showcasing the StorySlip platform.</p>',
      status: 'published',
      created_at: new Date().toISOString()
    }
  ],
  analytics: {
    total_views: 1250,
    unique_visitors: 890,
    bounce_rate: 0.35,
    avg_session_duration: 180
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'StorySlip API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    data: {
      user: mockData.user,
      token: 'mock-jwt-token'
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    data: {
      user: mockData.user,
      token: 'mock-jwt-token'
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: mockData.user
  });
});

// Content endpoints
app.get('/api/content', (req, res) => {
  res.json({
    success: true,
    data: mockData.content
  });
});

app.post('/api/content', (req, res) => {
  const newContent = {
    id: `content-${Date.now()}`,
    ...req.body,
    created_at: new Date().toISOString()
  };
  mockData.content.push(newContent);
  res.json({
    success: true,
    data: newContent
  });
});

// Website endpoints
app.get('/api/websites', (req, res) => {
  res.json({
    success: true,
    data: mockData.websites
  });
});

// Analytics endpoints
app.get('/api/analytics/overview', (req, res) => {
  res.json({
    success: true,
    data: mockData.analytics
  });
});

app.get('/api/analytics/realtime/:websiteId', (req, res) => {
  res.json({
    success: true,
    data: {
      active_users: Math.floor(Math.random() * 50) + 20,
      page_views_last_minute: Math.floor(Math.random() * 10) + 5,
      page_views_last_hour: Math.floor(Math.random() * 200) + 100,
      top_pages: [
        { path: '/', title: 'Home', active_users: Math.floor(Math.random() * 20) + 5 },
        { path: '/blog', title: 'Blog', active_users: Math.floor(Math.random() * 15) + 3 },
        { path: '/about', title: 'About', active_users: Math.floor(Math.random() * 10) + 2 }
      ],
      traffic_sources: [
        { source: 'direct', active_users: Math.floor(Math.random() * 15) + 5, percentage: 45 },
        { source: 'search', active_users: Math.floor(Math.random() * 10) + 3, percentage: 30 },
        { source: 'social', active_users: Math.floor(Math.random() * 8) + 2, percentage: 25 }
      ],
      devices: {
        desktop: Math.floor(Math.random() * 20) + 10,
        mobile: Math.floor(Math.random() * 25) + 15,
        tablet: Math.floor(Math.random() * 8) + 3
      },
      countries: [
        { country: 'United States', active_users: Math.floor(Math.random() * 15) + 8 },
        { country: 'United Kingdom', active_users: Math.floor(Math.random() * 8) + 4 },
        { country: 'Canada', active_users: Math.floor(Math.random() * 6) + 3 }
      ]
    }
  });
});

// Widget endpoints
app.get('/api/widgets', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'widget-123',
        name: 'Demo Widget',
        type: 'content',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Team endpoints
app.get('/api/team/members', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'member-123',
        name: 'Demo User',
        email: 'demo@storyslip.com',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.json({
    success: true,
    message: 'Mock API endpoint',
    data: null
  });
});

// Serve widget embed script
app.get('/widget/:widgetId', (req, res) => {
  const widgetScript = `
    (function() {
      const widget = document.createElement('div');
      widget.innerHTML = '<div style="padding: 20px; border: 2px solid #3b82f6; border-radius: 8px; background: #f8fafc; text-align: center;"><h3 style="color: #1e40af; margin: 0 0 10px 0;">StorySlip Widget</h3><p style="margin: 0; color: #64748b;">Widget ID: ${req.params.widgetId}</p><p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">Powered by StorySlip</p></div>';
      document.currentScript.parentNode.insertBefore(widget, document.currentScript);
    })();
  `;
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(widgetScript);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StorySlip API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎨 Widget demo: http://localhost:${PORT}/widget/demo`);
});

module.exports = app;
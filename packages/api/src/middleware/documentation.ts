import { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { specs } from '../config/swagger';

// Custom CSS for Swagger UI
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info .title { color: #3B82F6; }
  .swagger-ui .info .description { font-size: 14px; line-height: 1.6; }
  .swagger-ui .scheme-container { background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .swagger-ui .opblock.opblock-post { border-color: #10B981; }
  .swagger-ui .opblock.opblock-get { border-color: #3B82F6; }
  .swagger-ui .opblock.opblock-put { border-color: #F59E0B; }
  .swagger-ui .opblock.opblock-delete { border-color: #EF4444; }
  .swagger-ui .opblock-summary-method { min-width: 80px; }
  .swagger-ui .btn.authorize { background-color: #3B82F6; border-color: #3B82F6; }
  .swagger-ui .btn.authorize:hover { background-color: #2563EB; border-color: #2563EB; }
`;

// Swagger UI options
const swaggerOptions = {
  customCss,
  customSiteTitle: 'StorySlip CMS API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
    requestInterceptor: (req: any) => {
      // Add custom headers or modify requests
      req.headers['X-API-Version'] = '1.0';
      return req;
    },
    responseInterceptor: (res: any) => {
      // Log API responses for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('API Response:', res.status, res.url);
      }
      return res;
    },
  },
};

// Create Swagger middleware
export const swaggerServe = swaggerUi.serve;
export const swaggerSetup = swaggerUi.setup(specs, swaggerOptions);

// Custom documentation landing page
export const documentationLanding = (req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>StorySlip CMS API Documentation</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #374151;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 40px 20px;
        }
        .header {
          text-align: center;
          color: white;
          margin-bottom: 60px;
        }
        .header h1 {
          font-size: 3rem;
          margin-bottom: 10px;
          font-weight: 700;
        }
        .header p {
          font-size: 1.2rem;
          opacity: 0.9;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin-bottom: 60px;
        }
        .card {
          background: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .card h3 {
          color: #3B82F6;
          font-size: 1.5rem;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        .card h3::before {
          content: '';
          width: 8px;
          height: 8px;
          background: #3B82F6;
          border-radius: 50%;
          margin-right: 12px;
        }
        .card p {
          margin-bottom: 20px;
          color: #6B7280;
        }
        .card a {
          display: inline-block;
          background: #3B82F6;
          color: white;
          padding: 12px 24px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.3s ease;
        }
        .card a:hover {
          background: #2563EB;
        }
        .features {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .features h2 {
          color: #1F2937;
          font-size: 2rem;
          margin-bottom: 30px;
          text-align: center;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
        }
        .feature {
          text-align: center;
        }
        .feature-icon {
          width: 60px;
          height: 60px;
          background: #EBF4FF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 15px;
          font-size: 24px;
        }
        .feature h4 {
          color: #1F2937;
          font-size: 1.2rem;
          margin-bottom: 10px;
        }
        .feature p {
          color: #6B7280;
          font-size: 0.9rem;
        }
        .footer {
          text-align: center;
          color: white;
          margin-top: 60px;
          opacity: 0.8;
        }
        .footer a {
          color: white;
          text-decoration: none;
        }
        .footer a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>StorySlip CMS API</h1>
          <p>Comprehensive API documentation for developers</p>
        </div>
        
        <div class="cards">
          <div class="card">
            <h3>Interactive API Docs</h3>
            <p>Explore all API endpoints with interactive examples. Test requests directly from your browser with built-in authentication.</p>
            <a href="/api/docs/swagger">Open Swagger UI</a>
          </div>
          
          <div class="card">
            <h3>Getting Started Guide</h3>
            <p>Step-by-step guide to integrate StorySlip CMS into your application. Includes authentication, basic operations, and best practices.</p>
            <a href="/api/docs/guide">View Guide</a>
          </div>
          
          <div class="card">
            <h3>Widget Integration</h3>
            <p>Learn how to embed the StorySlip widget into your website. Includes customization options and advanced configuration.</p>
            <a href="/api/docs/widget">Widget Docs</a>
          </div>
          
          <div class="card">
            <h3>Webhook Reference</h3>
            <p>Set up real-time notifications for content updates, user actions, and system events. Includes payload examples and security.</p>
            <a href="/api/docs/webhooks">Webhook Docs</a>
          </div>
          
          <div class="card">
            <h3>SDK & Libraries</h3>
            <p>Official SDKs and community libraries for popular programming languages. Get started quickly with pre-built integrations.</p>
            <a href="/api/docs/sdks">View SDKs</a>
          </div>
          
          <div class="card">
            <h3>API Status</h3>
            <p>Real-time API status, uptime monitoring, and incident reports. Stay informed about service availability and performance.</p>
            <a href="https://status.storyslip.com" target="_blank">Check Status</a>
          </div>
        </div>
        
        <div class="features">
          <h2>API Features</h2>
          <div class="feature-grid">
            <div class="feature">
              <div class="feature-icon">🔐</div>
              <h4>Secure Authentication</h4>
              <p>JWT-based authentication with role-based access control and API key support</p>
            </div>
            <div class="feature">
              <div class="feature-icon">⚡</div>
              <h4>High Performance</h4>
              <p>Optimized endpoints with caching, pagination, and efficient database queries</p>
            </div>
            <div class="feature">
              <div class="feature-icon">🎨</div>
              <h4>White-label Ready</h4>
              <p>Complete branding customization with custom domains and email templates</p>
            </div>
            <div class="feature">
              <div class="feature-icon">📊</div>
              <h4>Rich Analytics</h4>
              <p>Detailed analytics and reporting with real-time data and custom metrics</p>
            </div>
            <div class="feature">
              <div class="feature-icon">🔄</div>
              <h4>Real-time Updates</h4>
              <p>Webhook support for instant notifications and real-time synchronization</p>
            </div>
            <div class="feature">
              <div class="feature-icon">🛠️</div>
              <h4>Developer Friendly</h4>
              <p>Comprehensive documentation, SDKs, and excellent developer experience</p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>
            Need help? Contact us at 
            <a href="mailto:support@storyslip.com">support@storyslip.com</a> 
            or visit our 
            <a href="https://storyslip.com/support" target="_blank">support center</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
};

// Middleware to add API documentation headers
export const addDocumentationHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add API version header
  res.setHeader('X-API-Version', '1.0');
  
  // Add documentation links
  res.setHeader('X-API-Docs', `${req.protocol}://${req.get('host')}/api/docs`);
  res.setHeader('X-API-Swagger', `${req.protocol}://${req.get('host')}/api/docs/swagger`);
  
  next();
};

// Generate OpenAPI JSON endpoint
export const openApiJson = (req: Request, res: Response) => {
  res.json(specs);
};

// Health check endpoint with API info
export const healthCheck = (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'StorySlip CMS API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: {
      interactive: `${req.protocol}://${req.get('host')}/api/docs/swagger`,
      openapi: `${req.protocol}://${req.get('host')}/api/docs/openapi.json`,
      guide: `${req.protocol}://${req.get('host')}/api/docs/guide`,
    },
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      websites: '/api/websites',
      content: '/api/content',
      analytics: '/api/analytics',
      team: '/api/team',
      branding: '/api/branding',
      notifications: '/api/notifications',
      widget: '/api/widget',
    },
  });
};
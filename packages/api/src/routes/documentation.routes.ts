import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { marked } from 'marked';
import {
  swaggerServe,
  swaggerSetup,
  documentationLanding,
  openApiJson,
  healthCheck,
  addDocumentationHeaders,
} from '../middleware/documentation';

const router = Router();

// Add documentation headers to all routes
router.use(addDocumentationHeaders);

// Documentation landing page
router.get('/', documentationLanding);

// Interactive Swagger UI
router.use('/swagger', swaggerServe, swaggerSetup);

// OpenAPI JSON specification
router.get('/openapi.json', openApiJson);

// Health check with API info
router.get('/health', healthCheck);

// Markdown documentation renderer
const renderMarkdown = (filename: string) => {
  return (req: any, res: any) => {
    try {
      const filePath = join(__dirname, '..', 'docs', filename);
      const markdown = readFileSync(filePath, 'utf-8');
      const html = marked(markdown);
      
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>StorySlip API Documentation</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #374151;
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px 20px;
              background: #f9fafb;
            }
            .container {
              background: white;
              padding: 60px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }
            h1 {
              color: #1f2937;
              font-size: 2.5rem;
              margin-bottom: 1rem;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 0.5rem;
            }
            h2 {
              color: #374151;
              font-size: 1.8rem;
              margin-top: 2rem;
              margin-bottom: 1rem;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 0.5rem;
            }
            h3 {
              color: #4b5563;
              font-size: 1.4rem;
              margin-top: 1.5rem;
              margin-bottom: 0.75rem;
            }
            h4 {
              color: #6b7280;
              font-size: 1.2rem;
              margin-top: 1.25rem;
              margin-bottom: 0.5rem;
            }
            p {
              margin-bottom: 1rem;
            }
            code {
              background: #f3f4f6;
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              font-size: 0.9em;
            }
            pre {
              background: #1f2937;
              color: #f9fafb;
              padding: 1.5rem;
              border-radius: 8px;
              overflow-x: auto;
              margin: 1rem 0;
            }
            pre code {
              background: none;
              padding: 0;
              color: inherit;
            }
            blockquote {
              border-left: 4px solid #3b82f6;
              padding-left: 1rem;
              margin: 1rem 0;
              background: #eff6ff;
              padding: 1rem;
              border-radius: 0 8px 8px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1rem 0;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 0.75rem;
              text-align: left;
            }
            th {
              background: #f9fafb;
              font-weight: 600;
            }
            tr:nth-child(even) {
              background: #f9fafb;
            }
            a {
              color: #3b82f6;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            ul, ol {
              margin: 1rem 0;
              padding-left: 2rem;
            }
            li {
              margin: 0.5rem 0;
            }
            .nav {
              background: #1f2937;
              color: white;
              padding: 1rem 0;
              margin: -60px -60px 40px -60px;
              border-radius: 12px 12px 0 0;
            }
            .nav-content {
              padding: 0 60px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .nav h1 {
              margin: 0;
              font-size: 1.5rem;
              border: none;
              padding: 0;
              color: white;
            }
            .nav-links {
              display: flex;
              gap: 2rem;
            }
            .nav-links a {
              color: #d1d5db;
              text-decoration: none;
              font-weight: 500;
            }
            .nav-links a:hover {
              color: white;
            }
            .highlight {
              background: #fef3c7;
              padding: 1rem;
              border-radius: 8px;
              border-left: 4px solid #f59e0b;
              margin: 1rem 0;
            }
            .warning {
              background: #fef2f2;
              padding: 1rem;
              border-radius: 8px;
              border-left: 4px solid #ef4444;
              margin: 1rem 0;
            }
            .info {
              background: #eff6ff;
              padding: 1rem;
              border-radius: 8px;
              border-left: 4px solid #3b82f6;
              margin: 1rem 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="nav">
              <div class="nav-content">
                <h1>StorySlip API Documentation</h1>
                <div class="nav-links">
                  <a href="/api/docs">Home</a>
                  <a href="/api/docs/guide">Getting Started</a>
                  <a href="/api/docs/swagger">API Reference</a>
                  <a href="/api/docs/widget">Widget</a>
                  <a href="/api/docs/webhooks">Webhooks</a>
                </div>
              </div>
            </div>
            ${html}
          </div>
        </body>
        </html>
      `;
      
      res.send(fullHtml);
    } catch (error) {
      res.status(404).send(`
        <h1>Documentation Not Found</h1>
        <p>The requested documentation page could not be found.</p>
        <a href="/api/docs">Return to Documentation Home</a>
      `);
    }
  };
};

// Documentation pages
router.get('/guide', renderMarkdown('getting-started.md'));
router.get('/widget', renderMarkdown('widget-integration.md'));
router.get('/webhooks', renderMarkdown('webhooks.md'));

// SDK documentation
router.get('/sdks', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>StorySlip SDKs and Libraries</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #374151;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #f9fafb;
        }
        .container {
          background: white;
          padding: 60px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        h1 {
          color: #1f2937;
          font-size: 2.5rem;
          margin-bottom: 2rem;
          text-align: center;
        }
        .sdk-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin: 2rem 0;
        }
        .sdk-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 2rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sdk-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        .sdk-header {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }
        .sdk-icon {
          width: 48px;
          height: 48px;
          margin-right: 1rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .sdk-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }
        .sdk-description {
          color: #6b7280;
          margin-bottom: 1.5rem;
        }
        .sdk-install {
          background: #f3f4f6;
          padding: 1rem;
          border-radius: 6px;
          font-family: monospace;
          margin-bottom: 1rem;
        }
        .sdk-links {
          display: flex;
          gap: 1rem;
        }
        .sdk-link {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.2s;
        }
        .primary-link {
          background: #3b82f6;
          color: white;
        }
        .primary-link:hover {
          background: #2563eb;
        }
        .secondary-link {
          background: #f3f4f6;
          color: #374151;
        }
        .secondary-link:hover {
          background: #e5e7eb;
        }
        .coming-soon {
          opacity: 0.6;
          position: relative;
        }
        .coming-soon::after {
          content: 'Coming Soon';
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #f59e0b;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>SDKs and Libraries</h1>
        <p style="text-align: center; font-size: 1.2rem; color: #6b7280; margin-bottom: 3rem;">
          Official SDKs and community libraries to integrate StorySlip into your applications
        </p>
        
        <div class="sdk-grid">
          <div class="sdk-card">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #f7df1e; color: #000;">JS</div>
              <div class="sdk-title">JavaScript/Node.js</div>
            </div>
            <div class="sdk-description">
              Official JavaScript SDK for Node.js and browser environments. Includes TypeScript definitions and full API coverage.
            </div>
            <div class="sdk-install">npm install @storyslip/sdk</div>
            <div class="sdk-links">
              <a href="https://github.com/storyslip/sdk-javascript" class="sdk-link primary-link">GitHub</a>
              <a href="https://www.npmjs.com/package/@storyslip/sdk" class="sdk-link secondary-link">npm</a>
            </div>
          </div>
          
          <div class="sdk-card">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #3776ab; color: white;">🐍</div>
              <div class="sdk-title">Python</div>
            </div>
            <div class="sdk-description">
              Python SDK with async/await support, comprehensive error handling, and integration with popular frameworks.
            </div>
            <div class="sdk-install">pip install storyslip-sdk</div>
            <div class="sdk-links">
              <a href="https://github.com/storyslip/sdk-python" class="sdk-link primary-link">GitHub</a>
              <a href="https://pypi.org/project/storyslip-sdk/" class="sdk-link secondary-link">PyPI</a>
            </div>
          </div>
          
          <div class="sdk-card">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #777bb4; color: white;">PHP</div>
              <div class="sdk-title">PHP</div>
            </div>
            <div class="sdk-description">
              PHP SDK compatible with PHP 7.4+ and 8.x. Includes Laravel service provider and Symfony bundle.
            </div>
            <div class="sdk-install">composer require storyslip/sdk</div>
            <div class="sdk-links">
              <a href="https://github.com/storyslip/sdk-php" class="sdk-link primary-link">GitHub</a>
              <a href="https://packagist.org/packages/storyslip/sdk" class="sdk-link secondary-link">Packagist</a>
            </div>
          </div>
          
          <div class="sdk-card">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #cc342d; color: white;">💎</div>
              <div class="sdk-title">Ruby</div>
            </div>
            <div class="sdk-description">
              Ruby gem with Rails integration, comprehensive test coverage, and support for Ruby 2.7+.
            </div>
            <div class="sdk-install">gem install storyslip-sdk</div>
            <div class="sdk-links">
              <a href="https://github.com/storyslip/sdk-ruby" class="sdk-link primary-link">GitHub</a>
              <a href="https://rubygems.org/gems/storyslip-sdk" class="sdk-link secondary-link">RubyGems</a>
            </div>
          </div>
          
          <div class="sdk-card coming-soon">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #00add8; color: white;">Go</div>
              <div class="sdk-title">Go</div>
            </div>
            <div class="sdk-description">
              Go SDK with context support, structured logging, and comprehensive error handling.
            </div>
            <div class="sdk-install">go get github.com/storyslip/sdk-go</div>
            <div class="sdk-links">
              <a href="#" class="sdk-link primary-link">GitHub</a>
              <a href="#" class="sdk-link secondary-link">pkg.go.dev</a>
            </div>
          </div>
          
          <div class="sdk-card coming-soon">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #239120; color: white;">C#</div>
              <div class="sdk-title">.NET/C#</div>
            </div>
            <div class="sdk-description">
              .NET SDK with async/await support, dependency injection, and ASP.NET Core integration.
            </div>
            <div class="sdk-install">dotnet add package StorySlip.SDK</div>
            <div class="sdk-links">
              <a href="#" class="sdk-link primary-link">GitHub</a>
              <a href="#" class="sdk-link secondary-link">NuGet</a>
            </div>
          </div>
        </div>
        
        <h2>Framework Integrations</h2>
        <div class="sdk-grid">
          <div class="sdk-card">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #61dafb; color: #000;">⚛️</div>
              <div class="sdk-title">React</div>
            </div>
            <div class="sdk-description">
              React hooks and components for easy StorySlip integration with SSR support.
            </div>
            <div class="sdk-install">npm install @storyslip/react</div>
            <div class="sdk-links">
              <a href="https://github.com/storyslip/react" class="sdk-link primary-link">GitHub</a>
              <a href="https://www.npmjs.com/package/@storyslip/react" class="sdk-link secondary-link">npm</a>
            </div>
          </div>
          
          <div class="sdk-card">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #4fc08d; color: white;">Vue</div>
              <div class="sdk-title">Vue.js</div>
            </div>
            <div class="sdk-description">
              Vue.js plugin with composables, components, and Nuxt.js module for seamless integration.
            </div>
            <div class="sdk-install">npm install @storyslip/vue</div>
            <div class="sdk-links">
              <a href="https://github.com/storyslip/vue" class="sdk-link primary-link">GitHub</a>
              <a href="https://www.npmjs.com/package/@storyslip/vue" class="sdk-link secondary-link">npm</a>
            </div>
          </div>
          
          <div class="sdk-card">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #dd0031; color: white;">🅰️</div>
              <div class="sdk-title">Angular</div>
            </div>
            <div class="sdk-description">
              Angular library with services, components, and pipes for StorySlip integration.
            </div>
            <div class="sdk-install">ng add @storyslip/angular</div>
            <div class="sdk-links">
              <a href="https://github.com/storyslip/angular" class="sdk-link primary-link">GitHub</a>
              <a href="https://www.npmjs.com/package/@storyslip/angular" class="sdk-link secondary-link">npm</a>
            </div>
          </div>
          
          <div class="sdk-card">
            <div class="sdk-header">
              <div class="sdk-icon" style="background: #21759b; color: white;">WP</div>
              <div class="sdk-title">WordPress</div>
            </div>
            <div class="sdk-description">
              WordPress plugin with shortcodes, widgets, and Gutenberg blocks for easy content embedding.
            </div>
            <div class="sdk-install">Install from WordPress Plugin Directory</div>
            <div class="sdk-links">
              <a href="https://github.com/storyslip/wordpress" class="sdk-link primary-link">GitHub</a>
              <a href="https://wordpress.org/plugins/storyslip/" class="sdk-link secondary-link">WordPress.org</a>
            </div>
          </div>
        </div>
        
        <h2>Community Libraries</h2>
        <p>Community-maintained libraries and integrations:</p>
        <ul>
          <li><strong>Gatsby Plugin</strong> - <code>gatsby-plugin-storyslip</code></li>
          <li><strong>Next.js Integration</strong> - <code>@storyslip/nextjs</code></li>
          <li><strong>Svelte Component</strong> - <code>svelte-storyslip</code></li>
          <li><strong>Shopify App</strong> - Available in Shopify App Store</li>
          <li><strong>Webflow Integration</strong> - Custom code snippets</li>
        </ul>
        
        <h2>Getting Help</h2>
        <p>Need help with SDK integration?</p>
        <ul>
          <li><strong>Documentation</strong>: Each SDK includes comprehensive documentation</li>
          <li><strong>Examples</strong>: Check the examples directory in each repository</li>
          <li><strong>Issues</strong>: Report bugs or request features on GitHub</li>
          <li><strong>Community</strong>: Join our <a href="https://community.storyslip.com">developer community</a></li>
          <li><strong>Support</strong>: Email us at <a href="mailto:support@storyslip.com">support@storyslip.com</a></li>
        </ul>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

export default router;
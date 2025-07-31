# Getting Started with StorySlip CMS API

Welcome to the StorySlip CMS API! This guide will help you get up and running with our powerful content management system.

## Overview

StorySlip CMS is a white-label content management system that allows you to:
- Manage multiple websites and brands from a single platform
- Create and publish content with rich editing capabilities
- Embed dynamic content into any website using our lightweight widget
- Track analytics and user engagement
- Collaborate with team members using role-based permissions
- Customize branding and domains for white-label deployments

## Base URL

All API requests should be made to:
```
https://api.storyslip.com
```

For development and testing:
```
http://localhost:3001
```

## Authentication

StorySlip API uses JWT (JSON Web Tokens) for authentication. You'll need to:

1. **Register an account** or **log in** to get a JWT token
2. **Include the token** in the Authorization header for all authenticated requests

### Getting a Token

**Register a new account:**
```bash
curl -X POST https://api.storyslip.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

**Login with existing account:**
```bash
curl -X POST https://api.storyslip.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

Both endpoints return a response like:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Using the Token

Include the JWT token in the Authorization header:
```bash
curl -X GET https://api.storyslip.com/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Token Refresh

Tokens expire after 24 hours. Use the refresh token to get a new one:
```bash
curl -X POST https://api.storyslip.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Quick Start Tutorial

Let's walk through creating your first website and content:

### Step 1: Create a Website

```bash
curl -X POST https://api.storyslip.com/api/websites \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Blog",
    "domain": "myblog.com",
    "description": "A personal blog about technology"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "website-123",
    "name": "My Blog",
    "domain": "myblog.com",
    "api_key": "sk_live_1234567890abcdef",
    "embed_code": "<script src=\"https://widget.storyslip.com/embed.js\" data-website-id=\"website-123\"></script>"
  }
}
```

### Step 2: Create Content

```bash
curl -X POST https://api.storyslip.com/api/websites/website-123/content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with StorySlip",
    "content": "<p>Welcome to my first article!</p>",
    "status": "published",
    "seo_title": "Getting Started with StorySlip - Complete Guide",
    "seo_description": "Learn how to use StorySlip CMS for your website"
  }'
```

### Step 3: Embed the Widget

Add the embed code to your website:
```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to My Website</h1>
  
  <!-- StorySlip Widget -->
  <div id="storyslip-content"></div>
  <script src="https://widget.storyslip.com/embed.js" 
          data-website-id="website-123"
          data-container="#storyslip-content">
  </script>
</body>
</html>
```

### Step 4: View Analytics

```bash
curl -X GET https://api.storyslip.com/api/websites/website-123/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Use Cases

### Content Management

**List all content:**
```bash
curl -X GET "https://api.storyslip.com/api/websites/website-123/content?limit=10&status=published" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Update content:**
```bash
curl -X PUT https://api.storyslip.com/api/websites/website-123/content/content-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "<p>Updated content...</p>"
  }'
```

**Schedule content:**
```bash
curl -X POST https://api.storyslip.com/api/websites/website-123/content \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Future Article",
    "content": "<p>This will be published later</p>",
    "status": "scheduled",
    "scheduled_for": "2024-02-01T09:00:00Z"
  }'
```

### Team Management

**Invite a team member:**
```bash
curl -X POST https://api.storyslip.com/api/websites/website-123/team/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "editor@example.com",
    "role": "editor",
    "message": "Welcome to our team!"
  }'
```

### Analytics

**Get detailed analytics:**
```bash
curl -X GET "https://api.storyslip.com/api/websites/website-123/analytics?period=30d&metrics=views,visitors,engagement" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### White-label Branding

**Configure branding:**
```bash
curl -X PUT https://api.storyslip.com/api/websites/website-123/branding \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_name": "My Brand",
    "primary_color": "#3B82F6",
    "secondary_color": "#1E40AF",
    "custom_domain": "cms.mybrand.com"
  }'
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401): Invalid or missing authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests

## Rate Limits

API endpoints have the following rate limits:
- **Authentication**: 5 requests per minute
- **Content operations**: 100 requests per minute
- **Analytics**: 50 requests per minute
- **General endpoints**: 200 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:

```bash
curl -X GET "https://api.storyslip.com/api/websites/website-123/content?limit=20&offset=40" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

## Webhooks

Set up webhooks to receive real-time notifications:

```bash
curl -X POST https://api.storyslip.com/api/websites/website-123/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/storyslip",
    "events": ["content.published", "content.updated"],
    "secret": "your-webhook-secret"
  }'
```

## SDKs and Libraries

Official SDKs are available for:
- **JavaScript/Node.js**: `npm install @storyslip/sdk`
- **Python**: `pip install storyslip-sdk`
- **PHP**: `composer require storyslip/sdk`
- **Ruby**: `gem install storyslip-sdk`

Example with JavaScript SDK:
```javascript
import StorySlip from '@storyslip/sdk';

const client = new StorySlip({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.storyslip.com'
});

// Create content
const content = await client.content.create('website-123', {
  title: 'My Article',
  content: '<p>Article content...</p>',
  status: 'published'
});
```

## Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Store tokens securely**: Never expose JWT tokens in client-side code
3. **Handle rate limits**: Implement exponential backoff for rate-limited requests
4. **Validate webhooks**: Always verify webhook signatures
5. **Use pagination**: Don't fetch all data at once for large datasets
6. **Cache responses**: Cache API responses when appropriate
7. **Monitor usage**: Track your API usage and set up alerts

## Support

Need help? We're here to assist:
- **Documentation**: [https://docs.storyslip.com](https://docs.storyslip.com)
- **Email Support**: [support@storyslip.com](mailto:support@storyslip.com)
- **Community Forum**: [https://community.storyslip.com](https://community.storyslip.com)
- **Status Page**: [https://status.storyslip.com](https://status.storyslip.com)

## Next Steps

- Explore the [Interactive API Documentation](/api/docs/swagger)
- Learn about [Widget Integration](/api/docs/widget)
- Set up [Webhooks](/api/docs/webhooks)
- Check out our [SDKs](/api/docs/sdks)
- Join our [Developer Community](https://community.storyslip.com)
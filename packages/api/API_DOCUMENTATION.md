# StorySlip CMS API Documentation

This document provides an overview of the comprehensive API documentation system implemented for StorySlip CMS.

## Documentation Features

### 🚀 Interactive API Documentation
- **Swagger UI**: Full interactive API documentation with try-it-out functionality
- **OpenAPI 3.0**: Complete OpenAPI specification with detailed schemas
- **Authentication**: Built-in authentication testing with JWT tokens
- **Real-time Testing**: Test API endpoints directly from the documentation

### 📚 Comprehensive Guides
- **Getting Started Guide**: Step-by-step tutorial for new developers
- **Widget Integration**: Complete guide for embedding the StorySlip widget
- **Webhook Documentation**: Detailed webhook setup and event handling
- **SDK Documentation**: Information about official SDKs and libraries

### 🔧 Developer Resources
- **Code Examples**: Working code samples in multiple languages
- **Error Handling**: Comprehensive error codes and responses
- **Rate Limiting**: Detailed rate limiting information
- **Best Practices**: Security and performance recommendations

## Accessing the Documentation

### Live Documentation
- **Production**: [https://api.storyslip.com/api/docs](https://api.storyslip.com/api/docs)
- **Development**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

### Documentation Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/docs` | Documentation landing page |
| `/api/docs/swagger` | Interactive Swagger UI |
| `/api/docs/openapi.json` | OpenAPI specification (JSON) |
| `/api/docs/guide` | Getting started guide |
| `/api/docs/widget` | Widget integration guide |
| `/api/docs/webhooks` | Webhook documentation |
| `/api/docs/sdks` | SDK and library information |
| `/api/docs/health` | API health and status |

## Documentation Structure

### OpenAPI Specification
The API documentation is built using OpenAPI 3.0 specification with:

```yaml
openapi: 3.0.0
info:
  title: StorySlip CMS API
  version: 1.0.0
  description: Comprehensive API for StorySlip CMS
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key
```

### Schema Definitions
Comprehensive schemas for all API entities:
- **User**: User account information
- **Website**: Website configuration
- **Content**: Content items with metadata
- **Analytics**: Analytics data structures
- **Webhooks**: Webhook event payloads
- **Errors**: Standardized error responses

### Security Documentation
- **JWT Authentication**: Bearer token authentication
- **API Keys**: Website-specific API keys for widget endpoints
- **Rate Limiting**: Endpoint-specific rate limits
- **CORS**: Cross-origin request handling

## Implementation Details

### Swagger Configuration
Located in `src/config/swagger.ts`:
- OpenAPI specification generation
- Schema definitions
- Security schemes
- Server configurations
- Tag definitions

### Documentation Middleware
Located in `src/middleware/documentation.ts`:
- Swagger UI setup with custom styling
- Documentation headers
- Health check endpoints
- Landing page generation

### Route Documentation
Each route file includes comprehensive Swagger annotations:
```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 */
```

### Markdown Documentation
Comprehensive guides written in Markdown:
- **Getting Started**: `src/docs/getting-started.md`
- **Widget Integration**: `src/docs/widget-integration.md`
- **Webhooks**: `src/docs/webhooks.md`

## Features

### 🎨 Custom Styling
- Branded Swagger UI with StorySlip colors
- Responsive design for mobile devices
- Dark/light theme support
- Custom CSS for better readability

### 🔍 Search and Filtering
- Full-text search across all endpoints
- Filter by tags (Authentication, Content, etc.)
- Filter by HTTP methods (GET, POST, PUT, DELETE)
- Advanced filtering options

### 📱 Mobile Responsive
- Optimized for mobile and tablet viewing
- Touch-friendly interface
- Collapsible sections
- Responsive navigation

### 🚀 Performance Optimized
- Lazy loading of documentation sections
- Compressed assets
- CDN-ready static files
- Efficient caching headers

## Testing

### Automated Tests
Comprehensive test suite in `src/__tests__/documentation.test.ts`:
- Documentation endpoint availability
- OpenAPI specification validation
- Schema completeness
- Response format validation
- Security configuration testing

### Manual Testing
- Interactive endpoint testing via Swagger UI
- Authentication flow testing
- Error response validation
- Rate limiting verification

## Maintenance

### Updating Documentation
1. **Route Documentation**: Add Swagger annotations to route files
2. **Schema Updates**: Update schemas in `src/config/swagger.ts`
3. **Guide Updates**: Edit Markdown files in `src/docs/`
4. **Version Updates**: Update version in package.json and swagger config

### Adding New Endpoints
1. Add Swagger annotations to the route handler
2. Define request/response schemas if needed
3. Add appropriate tags and security requirements
4. Update integration tests

### Schema Validation
The OpenAPI specification is automatically validated:
- Schema structure validation
- Required field validation
- Type checking
- Reference validation

## Best Practices

### Documentation Standards
- **Comprehensive**: Document all endpoints, parameters, and responses
- **Consistent**: Use consistent naming and formatting
- **Examples**: Provide realistic examples for all schemas
- **Security**: Document authentication and authorization requirements

### Code Examples
- **Multiple Languages**: Provide examples in JavaScript, Python, PHP, etc.
- **Real-world Scenarios**: Use practical, working examples
- **Error Handling**: Show proper error handling patterns
- **Best Practices**: Demonstrate recommended usage patterns

### Maintenance Guidelines
- **Regular Updates**: Keep documentation in sync with code changes
- **Version Control**: Track documentation changes with code
- **Review Process**: Include documentation in code review process
- **User Feedback**: Collect and incorporate user feedback

## Integration

### CI/CD Pipeline
Documentation is automatically:
- Generated from code annotations
- Validated for completeness
- Deployed with API updates
- Tested for accessibility

### Monitoring
- Documentation endpoint monitoring
- User interaction analytics
- Error tracking and reporting
- Performance monitoring

## Support

### Getting Help
- **Documentation Issues**: Report via GitHub issues
- **API Questions**: Contact support@storyslip.com
- **Community**: Join our developer community
- **Status**: Check status.storyslip.com

### Contributing
- **Documentation PRs**: Welcome improvements and corrections
- **Example Code**: Contribute code examples
- **Translations**: Help translate documentation
- **Feedback**: Provide feedback on documentation quality

## Future Enhancements

### Planned Features
- **Interactive Tutorials**: Step-by-step guided tutorials
- **Code Generators**: Generate client code from OpenAPI spec
- **Postman Collection**: Auto-generated Postman collections
- **GraphQL Documentation**: GraphQL API documentation
- **Versioning**: API version-specific documentation

### Community Features
- **User Comments**: Allow community comments on endpoints
- **Rating System**: Rate documentation quality
- **Contribution System**: Community-driven improvements
- **Discussion Forums**: Developer discussion forums

---

This comprehensive documentation system ensures that developers have all the resources they need to successfully integrate with the StorySlip CMS API.
# Webhooks Documentation

Webhooks allow your application to receive real-time notifications when events occur in your StorySlip CMS. This guide covers setup, security, and handling webhook events.

## Overview

StorySlip sends HTTP POST requests to your configured webhook URLs when specific events occur. This enables you to:

- Sync content changes to external systems
- Trigger automated workflows
- Update caches when content is published
- Send notifications to team members
- Integrate with third-party services

## Setting Up Webhooks

### Create a Webhook Endpoint

First, create an endpoint in your application to receive webhook events:

```javascript
// Express.js example
app.post('/webhooks/storyslip', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.headers['x-storyslip-signature'];
  const payload = req.body;
  
  // Verify the webhook signature (see Security section)
  if (!verifySignature(payload, signature)) {
    return res.status(401).send('Unauthorized');
  }
  
  const event = JSON.parse(payload);
  
  // Handle the event
  handleWebhookEvent(event);
  
  // Acknowledge receipt
  res.status(200).send('OK');
});
```

### Configure Webhook in Dashboard

1. Go to your website settings in the StorySlip dashboard
2. Navigate to the "Webhooks" section
3. Click "Add Webhook"
4. Enter your endpoint URL and select events
5. Save the configuration

### Configure via API

```bash
curl -X POST https://api.storyslip.com/api/websites/website-123/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks/storyslip",
    "events": [
      "content.published",
      "content.updated",
      "content.deleted",
      "user.invited",
      "analytics.milestone"
    ],
    "secret": "your-webhook-secret",
    "active": true
  }'
```

## Webhook Events

### Content Events

#### content.published
Triggered when content is published.

```json
{
  "id": "evt_1234567890",
  "event": "content.published",
  "website_id": "website-123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "content": {
      "id": "content-456",
      "title": "Getting Started with StorySlip",
      "slug": "getting-started-with-storyslip",
      "status": "published",
      "published_at": "2024-01-15T10:30:00Z",
      "author": {
        "id": "user-789",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "categories": ["technology", "tutorials"],
      "tags": ["cms", "javascript", "api"],
      "url": "https://example.com/articles/getting-started-with-storyslip"
    }
  }
}
```

#### content.updated
Triggered when published content is updated.

```json
{
  "id": "evt_1234567891",
  "event": "content.updated",
  "website_id": "website-123",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "content": {
      "id": "content-456",
      "title": "Getting Started with StorySlip (Updated)",
      "changes": ["title", "content", "seo_description"],
      "previous_version": {
        "title": "Getting Started with StorySlip",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    }
  }
}
```

#### content.deleted
Triggered when content is deleted.

```json
{
  "id": "evt_1234567892",
  "event": "content.deleted",
  "website_id": "website-123",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "content": {
      "id": "content-456",
      "title": "Getting Started with StorySlip",
      "deleted_by": {
        "id": "user-789",
        "name": "John Doe"
      }
    }
  }
}
```

#### content.scheduled
Triggered when content is scheduled for future publication.

```json
{
  "id": "evt_1234567893",
  "event": "content.scheduled",
  "website_id": "website-123",
  "timestamp": "2024-01-15T13:00:00Z",
  "data": {
    "content": {
      "id": "content-789",
      "title": "Future Article",
      "scheduled_for": "2024-01-20T09:00:00Z",
      "author": {
        "id": "user-789",
        "name": "John Doe"
      }
    }
  }
}
```

### User Events

#### user.invited
Triggered when a user is invited to join a website.

```json
{
  "id": "evt_1234567894",
  "event": "user.invited",
  "website_id": "website-123",
  "timestamp": "2024-01-15T14:00:00Z",
  "data": {
    "invitation": {
      "id": "inv-123",
      "email": "newuser@example.com",
      "role": "editor",
      "invited_by": {
        "id": "user-789",
        "name": "John Doe"
      },
      "expires_at": "2024-01-22T14:00:00Z"
    }
  }
}
```

#### user.joined
Triggered when a user accepts an invitation and joins a website.

```json
{
  "id": "evt_1234567895",
  "event": "user.joined",
  "website_id": "website-123",
  "timestamp": "2024-01-16T09:00:00Z",
  "data": {
    "user": {
      "id": "user-456",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "editor",
      "joined_at": "2024-01-16T09:00:00Z"
    }
  }
}
```

#### user.role_changed
Triggered when a user's role is changed.

```json
{
  "id": "evt_1234567896",
  "event": "user.role_changed",
  "website_id": "website-123",
  "timestamp": "2024-01-16T10:00:00Z",
  "data": {
    "user": {
      "id": "user-456",
      "name": "Jane Smith",
      "previous_role": "editor",
      "new_role": "admin",
      "changed_by": {
        "id": "user-789",
        "name": "John Doe"
      }
    }
  }
}
```

### Analytics Events

#### analytics.milestone
Triggered when analytics milestones are reached.

```json
{
  "id": "evt_1234567897",
  "event": "analytics.milestone",
  "website_id": "website-123",
  "timestamp": "2024-01-16T11:00:00Z",
  "data": {
    "milestone": {
      "type": "page_views",
      "value": 10000,
      "period": "all_time",
      "previous_milestone": 5000,
      "content": {
        "id": "content-456",
        "title": "Getting Started with StorySlip",
        "url": "https://example.com/articles/getting-started-with-storyslip"
      }
    }
  }
}
```

### System Events

#### website.verified
Triggered when a website domain is verified.

```json
{
  "id": "evt_1234567898",
  "event": "website.verified",
  "website_id": "website-123",
  "timestamp": "2024-01-16T12:00:00Z",
  "data": {
    "website": {
      "id": "website-123",
      "domain": "example.com",
      "verified_at": "2024-01-16T12:00:00Z"
    }
  }
}
```

#### backup.completed
Triggered when a website backup is completed.

```json
{
  "id": "evt_1234567899",
  "event": "backup.completed",
  "website_id": "website-123",
  "timestamp": "2024-01-16T13:00:00Z",
  "data": {
    "backup": {
      "id": "backup-789",
      "type": "full",
      "size": 1048576,
      "download_url": "https://backups.storyslip.com/backup-789.zip",
      "expires_at": "2024-01-23T13:00:00Z"
    }
  }
}
```

## Security

### Webhook Signatures

StorySlip signs webhook payloads with HMAC-SHA256 using your webhook secret. Always verify signatures to ensure requests are from StorySlip.

#### Verifying Signatures

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const receivedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

// Usage
const isValid = verifySignature(
  req.body,
  req.headers['x-storyslip-signature'],
  'your-webhook-secret'
);
```

#### Python Example

```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    received_signature = signature.replace('sha256=', '')
    
    return hmac.compare_digest(expected_signature, received_signature)
```

#### PHP Example

```php
function verifySignature($payload, $signature, $secret) {
    $expectedSignature = hash_hmac('sha256', $payload, $secret);
    $receivedSignature = str_replace('sha256=', '', $signature);
    
    return hash_equals($expectedSignature, $receivedSignature);
}
```

### Best Practices

1. **Always verify signatures**: Never process webhooks without signature verification
2. **Use HTTPS**: Only accept webhooks over HTTPS
3. **Implement idempotency**: Handle duplicate events gracefully
4. **Validate event structure**: Check that events have expected fields
5. **Rate limiting**: Implement rate limiting on your webhook endpoints
6. **Logging**: Log all webhook events for debugging and monitoring

## Handling Webhooks

### Basic Event Handler

```javascript
function handleWebhookEvent(event) {
  console.log(`Received ${event.event} for website ${event.website_id}`);
  
  switch (event.event) {
    case 'content.published':
      handleContentPublished(event.data.content);
      break;
      
    case 'content.updated':
      handleContentUpdated(event.data.content);
      break;
      
    case 'content.deleted':
      handleContentDeleted(event.data.content);
      break;
      
    case 'user.invited':
      handleUserInvited(event.data.invitation);
      break;
      
    case 'analytics.milestone':
      handleAnalyticsMilestone(event.data.milestone);
      break;
      
    default:
      console.log(`Unhandled event type: ${event.event}`);
  }
}
```

### Content Synchronization

```javascript
async function handleContentPublished(content) {
  try {
    // Update external CMS or database
    await externalCMS.createOrUpdate({
      id: content.id,
      title: content.title,
      content: content.content,
      publishedAt: content.published_at,
      url: content.url
    });
    
    // Clear CDN cache
    await cdn.purgeCache(content.url);
    
    // Send notification
    await notifications.send({
      type: 'content_published',
      title: `New content published: ${content.title}`,
      url: content.url
    });
    
    console.log(`Successfully synced content: ${content.id}`);
  } catch (error) {
    console.error(`Failed to sync content: ${error.message}`);
    // Implement retry logic or dead letter queue
  }
}
```

### Team Notifications

```javascript
async function handleUserInvited(invitation) {
  try {
    // Send Slack notification
    await slack.sendMessage({
      channel: '#team-updates',
      text: `${invitation.invited_by.name} invited ${invitation.email} as ${invitation.role}`
    });
    
    // Update team management system
    await teamSystem.createPendingUser({
      email: invitation.email,
      role: invitation.role,
      invitedBy: invitation.invited_by.id,
      expiresAt: invitation.expires_at
    });
    
  } catch (error) {
    console.error(`Failed to handle user invitation: ${error.message}`);
  }
}
```

### Analytics Integration

```javascript
async function handleAnalyticsMilestone(milestone) {
  try {
    // Send to analytics service
    await analytics.track('milestone_reached', {
      type: milestone.type,
      value: milestone.value,
      contentId: milestone.content?.id,
      contentTitle: milestone.content?.title
    });
    
    // Trigger celebration workflow
    if (milestone.value >= 10000) {
      await celebrations.trigger({
        type: 'page_views_milestone',
        value: milestone.value,
        content: milestone.content
      });
    }
    
  } catch (error) {
    console.error(`Failed to handle analytics milestone: ${error.message}`);
  }
}
```

## Error Handling and Retries

### Retry Logic

StorySlip automatically retries failed webhook deliveries:

- **Immediate retry**: If your endpoint returns a 5xx status code
- **Exponential backoff**: Retries after 1, 2, 4, 8, and 16 minutes
- **Maximum attempts**: 5 retry attempts
- **Timeout**: 30 seconds per request

### Handling Failures

```javascript
app.post('/webhooks/storyslip', async (req, res) => {
  try {
    const event = JSON.parse(req.body);
    
    // Process the event
    await processWebhookEvent(event);
    
    // Return success
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Webhook processing failed:', error);
    
    // Return appropriate status code
    if (error.code === 'TEMPORARY_ERROR') {
      // StorySlip will retry
      res.status(500).send('Temporary error, please retry');
    } else {
      // Don't retry for permanent errors
      res.status(400).send('Permanent error, do not retry');
    }
  }
});
```

### Idempotency

Handle duplicate events using idempotency keys:

```javascript
const processedEvents = new Set();

function handleWebhookEvent(event) {
  // Check if we've already processed this event
  if (processedEvents.has(event.id)) {
    console.log(`Event ${event.id} already processed, skipping`);
    return;
  }
  
  // Process the event
  processEvent(event);
  
  // Mark as processed
  processedEvents.add(event.id);
  
  // Clean up old events (implement proper cleanup logic)
  if (processedEvents.size > 10000) {
    // Remove oldest events
  }
}
```

## Testing Webhooks

### Local Development

Use tools like ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose local port 3000
ngrok http 3000

# Use the HTTPS URL in your webhook configuration
# https://abc123.ngrok.io/webhooks/storyslip
```

### Webhook Testing Tool

Create a simple webhook testing endpoint:

```javascript
app.post('/webhooks/test', (req, res) => {
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // Log to file for inspection
  fs.appendFileSync('webhook-log.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    headers: req.headers,
    body: req.body
  }, null, 2) + '\n');
  
  res.status(200).send('OK');
});
```

### Manual Testing

Test webhook delivery manually via API:

```bash
curl -X POST https://api.storyslip.com/api/websites/website-123/webhooks/webhook-456/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "content.published",
    "test_data": {
      "content_id": "test-content-123"
    }
  }'
```

## Monitoring and Debugging

### Webhook Logs

View webhook delivery logs in your dashboard or via API:

```bash
curl -X GET https://api.storyslip.com/api/websites/website-123/webhooks/webhook-456/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Health Checks

Implement health check endpoints:

```javascript
app.get('/webhooks/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});
```

### Monitoring Metrics

Track webhook performance:

```javascript
const webhookMetrics = {
  received: 0,
  processed: 0,
  failed: 0,
  averageProcessingTime: 0
};

function trackWebhookMetrics(event, processingTime, success) {
  webhookMetrics.received++;
  
  if (success) {
    webhookMetrics.processed++;
  } else {
    webhookMetrics.failed++;
  }
  
  // Update average processing time
  webhookMetrics.averageProcessingTime = 
    (webhookMetrics.averageProcessingTime + processingTime) / 2;
}
```

## Common Integration Patterns

### Content Synchronization

```javascript
// Sync content to multiple destinations
async function syncContent(content) {
  const destinations = [
    { name: 'elasticsearch', sync: syncToElasticsearch },
    { name: 'redis', sync: syncToRedis },
    { name: 'cdn', sync: syncToCDN }
  ];
  
  const results = await Promise.allSettled(
    destinations.map(dest => dest.sync(content))
  );
  
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Failed to sync to ${destinations[index].name}:`, result.reason);
    }
  });
}
```

### Cache Invalidation

```javascript
async function invalidateCache(content) {
  const cacheKeys = [
    `content:${content.id}`,
    `category:${content.category}`,
    'homepage',
    'sitemap'
  ];
  
  await Promise.all([
    redis.del(...cacheKeys),
    cdn.purge(content.url),
    cdn.purge('/sitemap.xml')
  ]);
}
```

### Notification Workflows

```javascript
async function sendNotifications(event) {
  const workflows = {
    'content.published': [
      sendSlackNotification,
      sendEmailToSubscribers,
      updateSocialMedia
    ],
    'user.invited': [
      sendWelcomeEmail,
      updateTeamDirectory
    ],
    'analytics.milestone': [
      sendCelebrationMessage,
      updateDashboard
    ]
  };
  
  const workflow = workflows[event.event];
  if (workflow) {
    await Promise.all(workflow.map(fn => fn(event.data)));
  }
}
```

## Troubleshooting

### Common Issues

#### Webhook Not Receiving Events
1. Check webhook URL is accessible from the internet
2. Verify HTTPS is properly configured
3. Check firewall and security group settings
4. Ensure endpoint returns 200 status code

#### Signature Verification Failing
1. Verify webhook secret matches configuration
2. Check signature header name (`x-storyslip-signature`)
3. Ensure payload is used as raw bytes, not parsed JSON
4. Verify HMAC-SHA256 implementation

#### High Failure Rate
1. Check endpoint response times (must be < 30 seconds)
2. Implement proper error handling
3. Return appropriate HTTP status codes
4. Monitor server resources and scaling

### Debug Mode

Enable debug logging for webhooks:

```javascript
const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[WEBHOOK DEBUG] ${message}`, data);
  }
}

app.post('/webhooks/storyslip', (req, res) => {
  debugLog('Received webhook', {
    headers: req.headers,
    body: req.body
  });
  
  // ... rest of handler
});
```

## Support

Need help with webhooks?

- **Documentation**: [https://docs.storyslip.com/webhooks](https://docs.storyslip.com/webhooks)
- **Examples**: [https://github.com/storyslip/webhook-examples](https://github.com/storyslip/webhook-examples)
- **Support**: [support@storyslip.com](mailto:support@storyslip.com)
- **Community**: [https://community.storyslip.com](https://community.storyslip.com)
- **Status**: [https://status.storyslip.com](https://status.storyslip.com)
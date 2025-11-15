# @pixel/ghl-client

A strongly-typed GoHighLevel API client built with **Bun** and **TypeBox** for runtime validation and compile-time type safety.

## Features

- **Full Type Safety** - Complete TypeScript types for all GHL API resources
- **Runtime Validation** - TypeBox schemas validate all API responses
- **Smart Retry Logic** - Automatic retry with exponential backoff for failed requests
- **Multiple Auth Methods** - Support for both API Key and OAuth 2.0 authentication
- **Pipeline Caching** - Built-in caching for pipeline data with configurable TTL
- **Endpoint Fallbacks** - Handles GHL API inconsistencies with multiple endpoint variations
- **Clean Architecture** - Resource-based API with intuitive method names

## Installation

```bash
bun add @ojowwalker/ghl-client
```

## Quick Start

### API Key Authentication

```typescript
import { GHLClient } from '@ojowwalker/ghl-client';

const client = new GHLClient({
  auth: {
    type: 'api-key',
    apiKey: process.env.GHL_API_KEY!,
  },
  locationId: process.env.GHL_LOCATION_ID, // Optional default location
});

// Search contacts
const contacts = await client.contacts.search({
  locationId: 'loc-123',
  query: 'john',
});

// Create opportunity
const opportunity = await client.opportunities.create({
  locationId: 'loc-123',
  name: 'New Deal',
  pipelineId: 'pipeline-123',
  pipelineStageId: 'stage-123',
  contactId: 'contact-123',
  monetaryValue: 5000,
});
```

### OAuth 2.0 Authentication

```typescript
import { GHLClient, OAuthClient } from '@ojowwalker/ghl-client';

// Step 1: Create OAuth client
const oauthClient = new OAuthClient({
  clientId: process.env.GHL_CLIENT_ID!,
  clientSecret: process.env.GHL_CLIENT_SECRET!,
  redirectUri: 'https://your-app.com/auth/callback',
  scopes: ['contacts.readonly', 'contacts.write', 'opportunities.write'],
});

// Step 2: Redirect user to authorization URL
const authUrl = oauthClient.getAuthorizationUrl({
  state: 'random-state-string',
});
// Redirect user to: authUrl

// Step 3: Exchange code for tokens (in your callback handler)
const tokens = await oauthClient.exchangeCodeForToken(authorizationCode);

// Step 4: Create GHL client with OAuth tokens
const client = new GHLClient({
  auth: {
    type: 'oauth',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  },
});
```

## API Reference

### Contacts

```typescript
// Get contact by ID
const contact = await client.contacts.get('contact-id');

// Create contact
const contact = await client.contacts.create({
  locationId: 'loc-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  tags: ['lead', 'hot'],
  customFields: {
    custom_field_id: 'value',
  },
});

// Update contact
const contact = await client.contacts.update('contact-id', {
  firstName: 'Jane',
  tags: ['customer'],
});

// Search contacts
const contacts = await client.contacts.search({
  locationId: 'loc-123',
  query: 'john',
  limit: 50,
});

// Search by phone
const contacts = await client.contacts.searchByPhone('loc-123', '+1234567890');

// Search by email
const contacts = await client.contacts.searchByEmail('loc-123', 'john@example.com');

// Upsert contact (create or update)
const contact = await client.contacts.upsert({
  locationId: 'loc-123',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
});

// Add note to contact
const note = await client.contacts.addNote({
  contactId: 'contact-id',
  body: 'Called and left voicemail',
  userId: 'user-id', // optional
});

// Get contact notes
const notes = await client.contacts.getNotes('contact-id');

// Delete contact
await client.contacts.delete('contact-id');
```

### Opportunities

```typescript
// Get opportunity by ID
const opportunity = await client.opportunities.get('opp-id');

// Create opportunity
const opportunity = await client.opportunities.create({
  locationId: 'loc-123',
  name: 'Enterprise Deal',
  pipelineId: 'pipeline-123',
  pipelineStageId: 'stage-123',
  contactId: 'contact-123',
  monetaryValue: 50000,
  status: 'open',
  assignedTo: 'user-id',
});

// Update opportunity
const opportunity = await client.opportunities.update('opp-id', {
  pipelineStageId: 'new-stage-id',
  monetaryValue: 75000,
  status: 'won',
});

// Upsert opportunity
const opportunity = await client.opportunities.upsert({
  locationId: 'loc-123',
  name: 'Deal',
  pipelineId: 'pipeline-123',
  pipelineStageId: 'stage-123',
  contactId: 'contact-123',
});

// Search opportunities
const opportunities = await client.opportunities.search({
  locationId: 'loc-123',
  contactId: 'contact-123',
  status: 'open',
});

// Get pipelines
const pipelines = await client.opportunities.getPipelines('loc-123');

// Get pipelines with caching (1-hour TTL)
const pipelinesMap = await client.opportunities.loadPipelinesCache('loc-123');
const pipeline = pipelinesMap.get('pipeline-id');

// Find stage by name
const stage = await client.opportunities.findStageByName(
  'loc-123',
  'pipeline-123',
  'Qualified'
);

// Check if opportunity exists for contact
const existing = await client.opportunities.existsForContact(
  'loc-123',
  'contact-123',
  'pipeline-123'
);

// Clear pipeline cache
client.opportunities.clearPipelineCache('loc-123');

// Delete opportunity
await client.opportunities.delete('opp-id');
```

### Users

```typescript
// List all users for a location
const users = await client.users.list('loc-123');

// Get user by ID
const user = await client.users.get('user-id');

// Find user by email
const user = await client.users.findByEmail('loc-123', 'user@example.com');

// Get users by role
const admins = await client.users.getByRole('loc-123', 'admin');
```

## Advanced Configuration

### Retry Configuration

```typescript
const client = new GHLClient({
  auth: { type: 'api-key', apiKey: 'your-api-key' },
  retry: {
    maxRetries: 5,
    initialDelay: 2000, // 2 seconds
    maxDelay: 30000, // 30 seconds
    exponentialBase: 2,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      return error.statusCode >= 500 && attempt < 3;
    },
    onRetry: (error, attempt, delay) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
    },
  },
});
```

### Debug Logging

```typescript
const client = new GHLClient({
  auth: { type: 'api-key', apiKey: 'your-api-key' },
  debug: true, // Enable debug logging
});
```

### Custom Base URL

```typescript
const client = new GHLClient({
  auth: { type: 'api-key', apiKey: 'your-api-key' },
  baseUrl: 'https://custom-ghl-instance.com', // Custom base URL
  apiVersion: '2021-07-28', // API version
  timeout: 60000, // 60 second timeout
});
```

## OAuth Token Management

### Automatic Token Refresh

```typescript
const client = new GHLClient({
  auth: {
    type: 'oauth',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    onTokenRefresh: async (newTokens) => {
      // Save new tokens to your database
      await saveTokens(newTokens);
    },
  },
});
```

### Manual Token Refresh

```typescript
const oauthClient = new OAuthClient({ /* config */ });

// Check if token is expired
if (oauthClient.isTokenExpired(expiresAt)) {
  // Refresh the token
  const newTokens = await oauthClient.refreshToken(refreshToken);

  // Update client auth
  client.updateAuth({
    type: 'oauth',
    accessToken: newTokens.access_token,
    refreshToken: newTokens.refresh_token,
    expiresAt: oauthClient.calculateExpiresAt(newTokens.expires_in),
  });
}
```

## TypeBox Schemas

All API request/response types are backed by TypeBox schemas for runtime validation:

```typescript
import { Value } from '@sinclair/typebox/value';
import { ContactSchema } from '@ojowwalker/ghl-client';

// Validate data against schema
const isValid = Value.Check(ContactSchema, someData);

// Get validation errors
const errors = [...Value.Errors(ContactSchema, someData)];
```

## Error Handling

```typescript
import { HttpClientError, ValidationError } from '@ojowwalker/ghl-client';

try {
  const contact = await client.contacts.get('contact-id');
} catch (error) {
  if (error instanceof HttpClientError) {
    console.error('HTTP Error:', error.statusCode, error.message);
    console.error('Response:', error.response);
    console.error('Should retry:', error.shouldRetry);
  } else if (error instanceof ValidationError) {
    console.error('Validation errors:', error.errors);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Common Patterns

### Duplicate Prevention

```typescript
// Check if opportunity already exists before creating
const existing = await client.opportunities.existsForContact(
  locationId,
  contactId,
  pipelineId
);

if (existing && ['won', 'lost', 'abandoned'].includes(existing.status)) {
  console.log('Opportunity already closed, skipping');
  return;
}

if (existing && existing.assignedTo !== newAssignedTo) {
  // Update only the owner
  await client.opportunities.update(existing.id, {
    assignedTo: newAssignedTo,
  });
} else if (!existing) {
  // Create new opportunity
  await client.opportunities.create({
    locationId,
    contactId,
    pipelineId,
    pipelineStageId,
    name: 'New Deal',
  });
}
```

### Pipeline Stage Lookup

```typescript
// Find stage ID by name
const stage = await client.opportunities.findStageByName(
  locationId,
  pipelineId,
  'Qualified'
);

if (stage) {
  await client.opportunities.create({
    locationId,
    pipelineId,
    pipelineStageId: stage.id,
    // ...
  });
}
```

## TypeScript Support

Full TypeScript support with detailed type definitions:

```typescript
import type {
  Contact,
  Opportunity,
  User,
  Pipeline,
  PipelineStage,
  OpportunityStatus,
  CustomFields,
} from '@ojowwalker/ghl-client';

// All types are fully typed and documented
const contact: Contact = {
  id: 'contact-123',
  locationId: 'loc-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  // ...autocomplete for all fields
};
```

## License

MIT

## Support

For issues and questions, please contact the Pixel team or refer to the [GoHighLevel API documentation](https://marketplace.gohighlevel.com/docs/).

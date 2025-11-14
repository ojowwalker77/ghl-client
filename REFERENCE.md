# @ojowwalker/ghl-client - LLM API Reference

## Package Information
- **Name**: @ojowwalker/ghl-client
- **Version**: 0.1.0
- **Description**: Strongly-typed GoHighLevel API client built with Bun and TypeBox
- **Type**: ESM module
- **Runtime**: Bun 1.0+ or Node.js 18+
- **License**: MIT

## Installation
```bash
bun add @ojowwalker/ghl-client
```

## Core Architecture

### Main Client Class: GHLClient

**Constructor Configuration (GHLClientConfig)**
```typescript
interface GHLClientConfig {
  auth: AuthConfig; // REQUIRED
  baseUrl?: string; // Default: 'https://services.leadconnectorhq.com'
  apiVersion?: string; // Default: '2021-07-28'
  timeout?: number; // Default: 30000 (30 seconds)
  retry?: RetryConfig;
  locationId?: string; // Default location ID for requests
  logger?: Logger; // Default: NoopLogger
  auditLogger?: AuditLogger; // Default: NoopAuditLogger
  actor?: string; // Actor ID for audit logs
  debug?: boolean; // Deprecated - use logger instead
}
```

### Authentication Configuration

**AuthConfig (Union Type)**
```typescript
type AuthConfig = ApiKeyAuth | OAuthAuth;

interface ApiKeyAuth {
  type: 'api-key';
  apiKey: string;
}

interface OAuthAuth {
  type: 'oauth';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Timestamp in milliseconds
  clientId?: string; // Required for automatic token refresh
  clientSecret?: string; // Required for automatic token refresh
  redirectUri?: string;
  onTokenRefresh?: (tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }) => void | Promise<void>;
}
```

### Retry Configuration
```typescript
interface RetryConfig {
  maxRetries?: number; // Default: 3
  initialDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 10000ms
  exponentialBase?: number; // Default: 2
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
}
```

**Default Retry Behavior**:
- Retries on 5xx errors
- Retries on 429 (rate limit) with respect to Retry-After header
- Retries on network/timeout errors
- Does NOT retry on 401/403 (auth errors)
- Uses exponential backoff with jitter

### Client Resources

**GHLClient Instance Properties**:
```typescript
class GHLClient {
  contacts: ContactsResource;
  opportunities: OpportunitiesResource;
  users: UsersResource;
  locationId?: string; // Default location ID

  // Public methods
  updateAuth(auth: AuthConfig): void;
  getAccessToken(): string;
}
```

## Contacts Resource

### ContactsResource Methods

#### get(contactId: string): Promise&lt;Contact&gt;
Get a contact by ID.

**Parameters**:
- `contactId`: string - Contact ID

**Returns**: Promise&lt;Contact&gt;

**Example**:
```typescript
const contact = await client.contacts.get('contact-123');
```

#### create(data: CreateContactRequest): Promise&lt;Contact&gt;
Create a new contact.

**Parameters**:
- `data`: CreateContactRequest

**CreateContactRequest**:
```typescript
{
  locationId: string; // REQUIRED
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string; // Email format
  phone?: string; // E.164 format recommended
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  timezone?: string;
  dnd?: boolean;
  tags?: string[];
  customFields?: Record<string, string | number | boolean | null>;
  source?: string;
  companyName?: string;
  assignedTo?: string; // User ID
}
```

**Returns**: Promise&lt;Contact&gt;

**Example**:
```typescript
const contact = await client.contacts.create({
  locationId: 'loc-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  tags: ['lead', 'hot']
});
```

#### update(contactId: string, data: UpdateContactRequest): Promise&lt;Contact&gt;
Update an existing contact.

**Parameters**:
- `contactId`: string - Contact ID
- `data`: UpdateContactRequest (same fields as CreateContactRequest, all optional)

**Returns**: Promise&lt;Contact&gt;

**Example**:
```typescript
const contact = await client.contacts.update('contact-123', {
  firstName: 'Jane',
  tags: ['customer']
});
```

#### delete(contactId: string): Promise&lt;void&gt;
Delete a contact.

**Parameters**:
- `contactId`: string - Contact ID

**Returns**: Promise&lt;void&gt;

**Example**:
```typescript
await client.contacts.delete('contact-123');
```

#### search(params: SearchContactsRequest): Promise&lt;Contact[]&gt;
Search contacts with fallback endpoint support.

**Parameters**:
- `params`: SearchContactsRequest

**SearchContactsRequest**:
```typescript
{
  locationId: string; // REQUIRED
  query?: string; // General search query
  email?: string; // Search by email
  phone?: string; // Search by phone
  limit?: number; // 1-100, default: 20
  offset?: number; // Default: 0
  startAfter?: string; // Cursor for pagination
  startAfterId?: string; // Cursor ID for pagination
}
```

**Returns**: Promise&lt;Contact[]&gt;

**Example**:
```typescript
const contacts = await client.contacts.search({
  locationId: 'loc-123',
  query: 'john',
  limit: 50
});
```

**Note**: Tries POST /contacts/search first, falls back to GET /contacts/ if POST fails.

#### searchByPhone(locationId: string, phone: string): Promise&lt;Contact[]&gt;
Convenience method to search by phone.

**Example**:
```typescript
const contacts = await client.contacts.searchByPhone('loc-123', '+1234567890');
```

#### searchByEmail(locationId: string, email: string): Promise&lt;Contact[]&gt;
Convenience method to search by email.

**Example**:
```typescript
const contacts = await client.contacts.searchByEmail('loc-123', 'john@example.com');
```

#### upsert(data: UpsertContactRequest): Promise&lt;Contact&gt;
Create or update a contact based on email/phone matching.

**Parameters**:
- `data`: UpsertContactRequest (same as CreateContactRequest)

**Returns**: Promise&lt;Contact&gt;

**Example**:
```typescript
const contact = await client.contacts.upsert({
  locationId: 'loc-123',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe'
});
```

#### addNote(data: CreateContactNoteRequest): Promise&lt;ContactNote&gt;
Add a note to a contact.

**Parameters**:
- `data`: CreateContactNoteRequest

**CreateContactNoteRequest**:
```typescript
{
  contactId: string; // REQUIRED
  body: string; // REQUIRED - Note content
  userId?: string; // Optional - User who created the note
}
```

**Returns**: Promise&lt;ContactNote&gt;

**Example**:
```typescript
const note = await client.contacts.addNote({
  contactId: 'contact-123',
  body: 'Called and left voicemail',
  userId: 'user-123'
});
```

#### getNotes(contactId: string): Promise&lt;ContactNote[]&gt;
Get all notes for a contact.

**Parameters**:
- `contactId`: string - Contact ID

**Returns**: Promise&lt;ContactNote[]&gt;

**Example**:
```typescript
const notes = await client.contacts.getNotes('contact-123');
```

### Contact Type Definition
```typescript
interface Contact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  website?: string;
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  dateAdded?: string; // ISO 8601 date-time
  dateUpdated?: string; // ISO 8601 date-time
  dateOfBirth?: string; // Can be partial date
  tags?: (string | { id?: string; name?: string; label?: string })[];
  source?: {
    type?: string;
    id?: string;
    name?: string;
    url?: string;
  };
  attributionSource?: {
    url?: string;
    campaign?: string;
    utmSource?: string;
    utmMedium?: string;
    utmContent?: string;
    referrer?: string;
    campaignId?: string;
    fbclid?: string;
    gclid?: string;
    mscklid?: string;
    dclid?: string;
    fbc?: string;
    fbp?: string;
    fbEventId?: string;
    userAgent?: string;
    ip?: string;
    medium?: string;
    mediumId?: string;
  };
  customFields?: Record<string, string | number | boolean | null>;
  customField?: Record<string, string | number | boolean | null>;
  assignedTo?: string;
  socialMediaLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  type?: string;
  contactType?: string;
  timezone?: string;
  dnd?: boolean;
  dndSettings?: {
    call?: { status?: string; message?: string; code?: string };
    email?: { status?: string; message?: string; code?: string };
    sms?: { status?: string; message?: string; code?: string };
    whatsapp?: { status?: string; message?: string; code?: string };
    gmb?: { status?: string; message?: string; code?: string };
    fb?: { status?: string; message?: string; code?: string };
  };
  businessId?: string;
  followers?: string[];
  inboundDndSettings?: any;
}

interface ContactNote {
  id?: string;
  contactId: string;
  userId?: string;
  body: string;
  dateAdded?: string; // ISO 8601 date-time
}
```

## Opportunities Resource

### OpportunitiesResource Methods

#### get(opportunityId: string): Promise&lt;Opportunity&gt;
Get an opportunity by ID.

**Parameters**:
- `opportunityId`: string - Opportunity ID

**Returns**: Promise&lt;Opportunity&gt;

**Example**:
```typescript
const opportunity = await client.opportunities.get('opp-123');
```

#### create(data: CreateOpportunityRequest): Promise&lt;Opportunity&gt;
Create a new opportunity.

**Parameters**:
- `data`: CreateOpportunityRequest

**CreateOpportunityRequest**:
```typescript
{
  locationId: string; // REQUIRED
  name: string; // REQUIRED - Opportunity name
  pipelineId: string; // REQUIRED
  pipelineStageId: string; // REQUIRED
  contactId?: string; // Associated contact
  status?: 'open' | 'won' | 'lost' | 'abandoned' | string;
  monetaryValue?: number;
  monetaryValueCurrency?: string; // Default: 'USD'
  assignedTo?: string; // User ID
  source?: string;
  customFields?: Record<string, string | number | boolean | null>;
}
```

**Returns**: Promise&lt;Opportunity&gt;

**Example**:
```typescript
const opportunity = await client.opportunities.create({
  locationId: 'loc-123',
  name: 'Enterprise Deal',
  pipelineId: 'pipeline-123',
  pipelineStageId: 'stage-123',
  contactId: 'contact-123',
  monetaryValue: 50000,
  status: 'open',
  assignedTo: 'user-123'
});
```

#### update(opportunityId: string, data: UpdateOpportunityRequest): Promise&lt;Opportunity&gt;
Update an existing opportunity.

**Parameters**:
- `opportunityId`: string - Opportunity ID
- `data`: UpdateOpportunityRequest (all fields from CreateOpportunityRequest except locationId, all optional)

**Returns**: Promise&lt;Opportunity&gt;

**Example**:
```typescript
const opportunity = await client.opportunities.update('opp-123', {
  pipelineStageId: 'stage-456',
  monetaryValue: 75000,
  status: 'won'
});
```

#### delete(opportunityId: string): Promise&lt;void&gt;
Delete an opportunity.

**Parameters**:
- `opportunityId`: string - Opportunity ID

**Returns**: Promise&lt;void&gt;

**Example**:
```typescript
await client.opportunities.delete('opp-123');
```

#### upsert(data: UpsertOpportunityRequest): Promise&lt;Opportunity&gt;
Create or update an opportunity.

**Parameters**:
- `data`: UpsertOpportunityRequest (CreateOpportunityRequest + optional id field)

**Returns**: Promise&lt;Opportunity&gt;

**Example**:
```typescript
const opportunity = await client.opportunities.upsert({
  locationId: 'loc-123',
  name: 'Deal',
  pipelineId: 'pipeline-123',
  pipelineStageId: 'stage-123',
  contactId: 'contact-123'
});
```

#### search(params: SearchOpportunitiesRequest): Promise&lt;Opportunity[]&gt;
Search opportunities.

**Parameters**:
- `params`: SearchOpportunitiesRequest

**SearchOpportunitiesRequest**:
```typescript
{
  locationId: string; // REQUIRED
  pipelineId?: string;
  pipelineStageId?: string;
  contactId?: string;
  status?: 'open' | 'won' | 'lost' | 'abandoned' | string;
  assignedTo?: string; // User ID
  query?: string;
  limit?: number; // 1-100, default: 20
  offset?: number; // Default: 0
  startAfter?: string;
  startAfterId?: string;
}
```

**Returns**: Promise&lt;Opportunity[]&gt;

**Example**:
```typescript
const opportunities = await client.opportunities.search({
  locationId: 'loc-123',
  contactId: 'contact-123',
  status: 'open'
});
```

#### getPipelines(locationId?: string): Promise&lt;Pipeline[]&gt;
Get all pipelines for a location.

**Parameters**:
- `locationId`: string (optional) - Uses default locationId from client config if not provided

**Returns**: Promise&lt;Pipeline[]&gt;

**Example**:
```typescript
const pipelines = await client.opportunities.getPipelines('loc-123');
```

#### loadPipelinesCache(locationId?: string): Promise&lt;Map&lt;string, Pipeline&gt;&gt;
Get pipelines with 1-hour caching.

**Parameters**:
- `locationId`: string (optional) - Uses default locationId from client config if not provided

**Returns**: Promise&lt;Map&lt;string, Pipeline&gt;&gt; - Map of pipeline ID to Pipeline object

**Cache TTL**: 1 hour (3600000ms)

**Example**:
```typescript
const pipelinesMap = await client.opportunities.loadPipelinesCache('loc-123');
const pipeline = pipelinesMap.get('pipeline-123');
```

#### findStageByName(locationId: string, pipelineId: string, stageName: string): Promise&lt;{id: string; name: string} | null&gt;
Find a pipeline stage by name (case-insensitive).

**Parameters**:
- `locationId`: string - Location ID
- `pipelineId`: string - Pipeline ID
- `stageName`: string - Stage name to search for

**Returns**: Promise&lt;{id: string; name: string} | null&gt;

**Example**:
```typescript
const stage = await client.opportunities.findStageByName(
  'loc-123',
  'pipeline-123',
  'Qualified'
);
if (stage) {
  console.log(stage.id, stage.name);
}
```

#### clearPipelineCache(locationId?: string): void
Clear pipeline cache.

**Parameters**:
- `locationId`: string (optional) - Clear specific location's cache, or all if not provided

**Example**:
```typescript
client.opportunities.clearPipelineCache('loc-123');
// Or clear all
client.opportunities.clearPipelineCache();
```

#### existsForContact(locationId: string, contactId: string, pipelineId: string): Promise&lt;Opportunity | null&gt;
Check if an opportunity exists for a contact in a specific pipeline.

**Parameters**:
- `locationId`: string - Location ID
- `contactId`: string - Contact ID
- `pipelineId`: string - Pipeline ID

**Returns**: Promise&lt;Opportunity | null&gt; - First matching opportunity or null

**Example**:
```typescript
const existing = await client.opportunities.existsForContact(
  'loc-123',
  'contact-123',
  'pipeline-123'
);

if (existing && ['won', 'lost', 'abandoned'].includes(existing.status)) {
  console.log('Opportunity already closed');
}
```

### Opportunity Type Definitions
```typescript
type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned' | string;

interface Opportunity {
  id: string;
  locationId: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId?: string;
  contact?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
  };
  status: OpportunityStatus;
  monetaryValue?: number;
  monetaryValueCurrency?: string; // Default: 'USD'
  assignedTo?: string;
  dateAdded?: string; // ISO 8601 date-time
  dateUpdated?: string; // ISO 8601 date-time
  lastStatusChangeAt?: string; // ISO 8601 date-time
  source?: string;
  customFields?: Record<string, string | number | boolean | null>;
  leadValue?: number;
  followers?: string[];
}

interface Pipeline {
  id: string;
  name: string;
  locationId: string;
  stages: PipelineStage[];
  showInFunnel?: boolean;
  showInPieChart?: boolean;
}

interface PipelineStage {
  id: string;
  name: string;
  position?: number;
  pipelineId?: string;
}
```

## Users Resource

### UsersResource Methods

#### list(locationId?: string, params?: Omit&lt;GetUsersRequest, 'locationId'&gt;): Promise&lt;User[]&gt;
Get all users for a location. Tries multiple endpoint variations for compatibility.

**Parameters**:
- `locationId`: string (optional) - Uses default locationId from client config if not provided
- `params`: GetUsersRequest (optional, excluding locationId)

**Endpoint Fallback Order**:
1. `/users/?locationId={locationId}`
2. `/users?locationId={locationId}`
3. `/locations/{locationId}/users`
4. `/locations/{locationId}/users/`

**Returns**: Promise&lt;User[]&gt;

**Example**:
```typescript
const users = await client.users.list('loc-123');
```

#### get(userId: string): Promise&lt;User&gt;
Get a user by ID.

**Parameters**:
- `userId`: string - User ID

**Returns**: Promise&lt;User&gt;

**Example**:
```typescript
const user = await client.users.get('user-123');
```

#### findByEmail(locationId: string, email: string): Promise&lt;User | null&gt;
Find a user by email (case-insensitive).

**Parameters**:
- `locationId`: string - Location ID
- `email`: string - Email to search for

**Returns**: Promise&lt;User | null&gt;

**Example**:
```typescript
const user = await client.users.findByEmail('loc-123', 'admin@example.com');
```

#### getByRole(locationId: string, role: string): Promise&lt;User[]&gt;
Get users by role.

**Parameters**:
- `locationId`: string - Location ID
- `role`: string - Role to filter by ('admin', 'user', 'account', etc.)

**Returns**: Promise&lt;User[]&gt;

**Example**:
```typescript
const admins = await client.users.getByRole('loc-123', 'admin');
```

### User Type Definitions
```typescript
type UserRole = 'admin' | 'user' | 'account' | string;

interface User {
  id: string;
  locationId?: string;
  companyId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role?: UserRole;
  type?: string;
  permissions?: UserPermissions;
  deleted?: boolean;
  dateAdded?: string; // ISO 8601 date-time
}

interface UserPermissions {
  campaignsEnabled?: boolean;
  campaignsReadOnly?: boolean;
  contactsEnabled?: boolean;
  workflowsEnabled?: boolean;
  workflowsReadOnly?: boolean;
  triggersEnabled?: boolean;
  funnelsEnabled?: boolean;
  websitesEnabled?: boolean;
  opportunitiesEnabled?: boolean;
  dashboardStatsEnabled?: boolean;
  bulkRequestsEnabled?: boolean;
  appointmentsEnabled?: boolean;
  reviewsEnabled?: boolean;
  onlineListingsEnabled?: boolean;
  phoneCallEnabled?: boolean;
  conversationsEnabled?: boolean;
  assignedDataOnly?: boolean;
  adwordsReportingEnabled?: boolean;
  membershipEnabled?: boolean;
  facebookAdsReportingEnabled?: boolean;
  attributionReportingEnabled?: boolean;
  settingsEnabled?: boolean;
  tagsEnabled?: boolean;
  leadValueEnabled?: boolean;
  marketingEnabled?: boolean;
  agentReportingEnabled?: boolean;
  botService?: boolean;
  socialPlanner?: boolean;
  bloggingEnabled?: boolean;
  invoiceEnabled?: boolean;
  affiliateManagerEnabled?: boolean;
  contentAiEnabled?: boolean;
  refundsEnabled?: boolean;
  recordPaymentEnabled?: boolean;
  cancelSubscriptionEnabled?: boolean;
  paymentsEnabled?: boolean;
  communitiesEnabled?: boolean;
  exportPaymentsEnabled?: boolean;
}
```

## OAuth Client

### OAuthClient Class

**Constructor**:
```typescript
interface OAuthConfig {
  clientId: string; // REQUIRED
  clientSecret: string; // REQUIRED
  redirectUri: string; // REQUIRED
  scopes: OAuthScope[]; // Default: []
}

const oauthClient = new OAuthClient(config);
// Or use factory function
const oauthClient = createOAuthClient(config);
```

**OAuth Endpoints**:
- Authorization: `https://marketplace.gohighlevel.com/oauth/chooselocation`
- Token: `https://services.leadconnectorhq.com/oauth/token`

### OAuthClient Methods

#### generateState(): string
Generate a cryptographically secure random state parameter.

**Returns**: string

**Example**:
```typescript
const state = oauthClient.generateState();
// Store in session for validation
```

#### getAuthorizationUrl(options?: {state?: string; scopes?: OAuthScope[]}): string
Generate OAuth authorization URL.

**Parameters**:
- `options.state`: string (optional) - Auto-generated if not provided
- `options.scopes`: OAuthScope[] (optional) - Uses config scopes if not provided

**Returns**: string - Authorization URL

**Example**:
```typescript
const authUrl = oauthClient.getAuthorizationUrl({
  state: 'random-state-string'
});
// Redirect user to authUrl
```

#### exchangeCodeForToken(code: string): Promise&lt;OAuthTokenResponse&gt;
Exchange authorization code for access token.

**Parameters**:
- `code`: string - Authorization code from callback

**Returns**: Promise&lt;OAuthTokenResponse&gt;

**Example**:
```typescript
const tokens = await oauthClient.exchangeCodeForToken(authorizationCode);
```

#### refreshToken(refreshToken: string): Promise&lt;OAuthRefreshTokenResponse&gt;
Refresh access token using refresh token.

**Parameters**:
- `refreshToken`: string - Refresh token

**Returns**: Promise&lt;OAuthRefreshTokenResponse&gt;

**Example**:
```typescript
const newTokens = await oauthClient.refreshToken(oldRefreshToken);
```

#### isTokenExpired(expiresAt: number, bufferSeconds?: number): boolean
Check if access token is expired.

**Parameters**:
- `expiresAt`: number - Expiration timestamp in milliseconds
- `bufferSeconds`: number (optional) - Buffer time before expiration, default: 300 (5 minutes)

**Returns**: boolean

**Example**:
```typescript
if (oauthClient.isTokenExpired(expiresAt)) {
  // Token is expired or will expire soon
}
```

#### calculateExpiresAt(expiresIn: number): number
Calculate token expiration timestamp.

**Parameters**:
- `expiresIn`: number - Seconds until token expires

**Returns**: number - Expiration timestamp in milliseconds

**Example**:
```typescript
const expiresAt = oauthClient.calculateExpiresAt(3600); // 1 hour
```

### OAuth Type Definitions
```typescript
type OAuthScope =
  | 'contacts.readonly' | 'contacts.write'
  | 'opportunities.readonly' | 'opportunities.write'
  | 'calendars.readonly' | 'calendars.write'
  | 'calendars/events.readonly' | 'calendars/events.write'
  | 'conversations.readonly' | 'conversations.write'
  | 'conversations/message.readonly' | 'conversations/message.write'
  | 'users.readonly' | 'users.write'
  | 'locations.readonly' | 'locations.write'
  | 'locations/customFields.readonly' | 'locations/customFields.write'
  | 'locations/customValues.readonly' | 'locations/customValues.write'
  | 'locations/tags.readonly' | 'locations/tags.write'
  | 'locations/tasks.readonly' | 'locations/tasks.write'
  | 'businesses.readonly' | 'businesses.write'
  | 'saas/company.readonly' | 'saas/company.write'
  | 'saas/location.readonly' | 'saas/location.write'
  | 'oauth.readonly' | 'oauth.write'
  | 'forms.readonly' | 'forms.write'
  | 'surveys.readonly'
  | 'links.readonly' | 'links.write'
  | 'workflows.readonly'
  | 'payments.readonly' | 'payments.write'
  | string; // Allow custom scopes

interface OAuthTokenResponse {
  access_token: string;
  token_type: string; // 'Bearer'
  expires_in: number; // Seconds
  refresh_token: string;
  scope: string;
  userType?: string;
  locationId?: string;
  companyId?: string;
  approvedLocations?: string[];
  userId?: string;
}

interface OAuthRefreshTokenResponse {
  access_token: string;
  token_type: string; // 'Bearer'
  expires_in: number; // Seconds
  refresh_token: string;
  scope: string;
}
```

## Error Handling

### Error Classes

#### HttpClientError
```typescript
class HttpClientError extends Error {
  name: 'HttpClientError';
  statusCode?: number;
  response?: any;
  shouldRetry: boolean;
  retryAfter?: number; // Milliseconds
}
```

**When thrown**:
- HTTP errors (4xx, 5xx)
- Network errors
- Timeout errors

**shouldRetry values**:
- `true`: 5xx errors, 429 (rate limit), network/timeout errors
- `false`: 401/403 (auth errors), 4xx client errors

#### ValidationError
```typescript
class ValidationError extends Error {
  name: 'ValidationError';
  errors: Array<{
    path: string;
    message: string;
    value: any;
  }>;
}
```

**When thrown**:
- Response validation fails against TypeBox schema
- Malformed API responses

### Error Handling Pattern
```typescript
import { HttpClientError, ValidationError } from '@ojowwalker/ghl-client';

try {
  const contact = await client.contacts.get('contact-id');
} catch (error) {
  if (error instanceof HttpClientError) {
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);
    console.error('Response:', error.response);
    console.error('Should retry:', error.shouldRetry);
    if (error.retryAfter) {
      console.error('Retry after:', error.retryAfter, 'ms');
    }
  } else if (error instanceof ValidationError) {
    console.error('Validation errors:', error.errors);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Advanced Features

### Automatic Token Refresh

When using OAuth with `clientId`, `clientSecret`, and `refreshToken`, the client automatically:
1. Checks token expiration before each request (5-minute buffer)
2. Refreshes token if expired
3. Retries failed requests after refreshing token
4. Calls `onTokenRefresh` callback with new tokens

**Example**:
```typescript
const client = new GHLClient({
  auth: {
    type: 'oauth',
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    onTokenRefresh: async (newTokens) => {
      await database.saveTokens(newTokens);
    }
  }
});

// Token automatically refreshed when needed
const contacts = await client.contacts.search({ locationId: 'loc-123' });
```

### Manual Auth Update
```typescript
// Update auth config (e.g., after manual token refresh)
client.updateAuth({
  type: 'oauth',
  accessToken: newAccessToken,
  refreshToken: newRefreshToken,
  expiresAt: Date.now() + 3600 * 1000
});
```

### Custom Retry Logic
```typescript
const client = new GHLClient({
  auth: { type: 'api-key', apiKey: 'key' },
  retry: {
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    exponentialBase: 2,
    shouldRetry: (error, attempt) => {
      // Custom logic: only retry server errors, max 3 attempts
      return error.statusCode >= 500 && attempt < 3;
    },
    onRetry: (error, attempt, delay) => {
      console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
    }
  }
});
```

### Logging
```typescript
import { ConsoleLogger } from '@ojowwalker/ghl-client';

const client = new GHLClient({
  auth: { type: 'api-key', apiKey: 'key' },
  logger: new ConsoleLogger() // Enable logging
});

// Custom logger implementation
class CustomLogger {
  debug(message: string, data?: any): void { /* ... */ }
  info(message: string, data?: any): void { /* ... */ }
  warn(message: string, data?: any): void { /* ... */ }
  error(message: string, data?: any): void { /* ... */ }
}

const client = new GHLClient({
  auth: { type: 'api-key', apiKey: 'key' },
  logger: new CustomLogger()
});
```

### TypeBox Schema Validation

All types are backed by TypeBox schemas for runtime validation:

```typescript
import { Value } from '@sinclair/typebox/value';
import { ContactSchema } from '@ojowwalker/ghl-client';

// Validate data
const isValid = Value.Check(ContactSchema, data);

// Get validation errors
const errors = [...Value.Errors(ContactSchema, data)];
```

## Common Patterns

### Duplicate Contact Prevention
```typescript
// Search by email first
const existing = await client.contacts.searchByEmail('loc-123', 'john@example.com');

if (existing.length > 0) {
  // Update existing
  await client.contacts.update(existing[0].id, { firstName: 'John' });
} else {
  // Create new
  await client.contacts.create({
    locationId: 'loc-123',
    email: 'john@example.com',
    firstName: 'John'
  });
}

// Or use upsert
const contact = await client.contacts.upsert({
  locationId: 'loc-123',
  email: 'john@example.com',
  firstName: 'John'
});
```

### Duplicate Opportunity Prevention
```typescript
const existing = await client.opportunities.existsForContact(
  'loc-123',
  'contact-123',
  'pipeline-123'
);

if (existing && ['won', 'lost', 'abandoned'].includes(existing.status)) {
  console.log('Opportunity already closed, skipping');
  return;
}

if (existing && existing.assignedTo !== newAssignedTo) {
  // Update only the owner
  await client.opportunities.update(existing.id, {
    assignedTo: newAssignedTo
  });
} else if (!existing) {
  // Create new
  await client.opportunities.create({
    locationId: 'loc-123',
    contactId: 'contact-123',
    pipelineId: 'pipeline-123',
    pipelineStageId: 'stage-123',
    name: 'New Deal'
  });
}
```

### Pipeline Stage Lookup
```typescript
// Find stage by name
const stage = await client.opportunities.findStageByName(
  'loc-123',
  'pipeline-123',
  'Qualified'
);

if (stage) {
  await client.opportunities.create({
    locationId: 'loc-123',
    pipelineId: 'pipeline-123',
    pipelineStageId: stage.id,
    contactId: 'contact-123',
    name: 'New Lead'
  });
}
```

### Efficient Pipeline Caching
```typescript
// Load pipelines once with caching
const pipelinesMap = await client.opportunities.loadPipelinesCache('loc-123');

// Use cached data for multiple operations
for (const contact of contacts) {
  const pipeline = pipelinesMap.get('pipeline-123');
  const stage = pipeline?.stages.find(s => s.name === 'New Lead');

  if (stage) {
    await client.opportunities.create({
      locationId: 'loc-123',
      pipelineId: 'pipeline-123',
      pipelineStageId: stage.id,
      contactId: contact.id,
      name: `Deal for ${contact.name}`
    });
  }
}

// Clear cache when needed (e.g., after pipeline modifications)
client.opportunities.clearPipelineCache('loc-123');
```

### Complete OAuth Flow
```typescript
// Step 1: Create OAuth client
const oauthClient = new OAuthClient({
  clientId: process.env.GHL_CLIENT_ID!,
  clientSecret: process.env.GHL_CLIENT_SECRET!,
  redirectUri: 'https://your-app.com/auth/callback',
  scopes: ['contacts.readonly', 'contacts.write', 'opportunities.write']
});

// Step 2: Generate authorization URL
const state = oauthClient.generateState();
// Save state in session for validation
session.oauthState = state;

const authUrl = oauthClient.getAuthorizationUrl({ state });
// Redirect user to authUrl

// Step 3: Handle callback
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate state
  if (state !== session.oauthState) {
    throw new Error('Invalid state');
  }

  // Exchange code for tokens
  const tokens = await oauthClient.exchangeCodeForToken(code);

  // Save tokens to database
  await database.saveTokens(userId, tokens);

  // Create GHL client
  const client = new GHLClient({
    auth: {
      type: 'oauth',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: oauthClient.calculateExpiresAt(tokens.expires_in),
      clientId: process.env.GHL_CLIENT_ID!,
      clientSecret: process.env.GHL_CLIENT_SECRET!,
      onTokenRefresh: async (newTokens) => {
        await database.saveTokens(userId, newTokens);
      }
    }
  });

  // Use client
  const contacts = await client.contacts.search({ locationId: tokens.locationId });
});
```

## Complete Usage Example

```typescript
import { GHLClient, OAuthClient } from '@ojowwalker/ghl-client';

// API Key Authentication
const client = new GHLClient({
  auth: {
    type: 'api-key',
    apiKey: process.env.GHL_API_KEY!
  },
  locationId: 'loc-123',
  retry: {
    maxRetries: 3,
    initialDelay: 1000
  }
});

// Create contact
const contact = await client.contacts.create({
  locationId: 'loc-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  tags: ['lead']
});

// Create opportunity
const opportunity = await client.opportunities.create({
  locationId: 'loc-123',
  name: 'New Deal',
  pipelineId: 'pipeline-123',
  pipelineStageId: 'stage-123',
  contactId: contact.id,
  monetaryValue: 5000,
  status: 'open'
});

// Add note
await client.contacts.addNote({
  contactId: contact.id,
  body: 'Initial contact made'
});

// Search opportunities
const opportunities = await client.opportunities.search({
  locationId: 'loc-123',
  contactId: contact.id
});

// Get users
const users = await client.users.list('loc-123');
const admin = await client.users.findByEmail('loc-123', 'admin@example.com');
```

## TypeScript Import Patterns

```typescript
// Main client and OAuth
import { GHLClient, OAuthClient, createOAuthClient } from '@ojowwalker/ghl-client';

// Type definitions
import type {
  // Auth
  AuthConfig, ApiKeyAuth, OAuthAuth,

  // Contact types
  Contact, CreateContactRequest, UpdateContactRequest,
  SearchContactsRequest, UpsertContactRequest, ContactNote,

  // Opportunity types
  Opportunity, OpportunityStatus, Pipeline, PipelineStage,
  CreateOpportunityRequest, UpdateOpportunityRequest,
  SearchOpportunitiesRequest,

  // User types
  User, UserRole, UserPermissions,

  // OAuth types
  OAuthScope, OAuthConfig, OAuthTokenResponse,

  // Common types
  CustomFields, Tag, Address, PaginationMeta,

  // Utility types
  RetryConfig
} from '@ojowwalker/ghl-client';

// Error classes
import { HttpClientError, ValidationError } from '@ojowwalker/ghl-client';

// TypeBox schemas (for advanced validation)
import {
  ContactSchema,
  OpportunitySchema,
  UserSchema,
  // ... all other schemas
} from '@ojowwalker/ghl-client';
```

## API Endpoint Reference

### Base URLs
- **API Base**: `https://services.leadconnectorhq.com`
- **OAuth Authorization**: `https://marketplace.gohighlevel.com/oauth/chooselocation`
- **OAuth Token**: `https://services.leadconnectorhq.com/oauth/token`

### Contacts Endpoints
- `GET /contacts/{id}` - Get contact
- `POST /contacts/` - Create contact
- `PUT /contacts/{id}` - Update contact
- `DELETE /contacts/{id}` - Delete contact
- `POST /contacts/search` - Search contacts (primary)
- `GET /contacts/` - Search contacts (fallback)
- `POST /contacts/upsert` - Upsert contact
- `POST /contacts/{id}/notes` - Add note
- `GET /contacts/{id}/notes` - Get notes

### Opportunities Endpoints
- `GET /opportunities/{id}` - Get opportunity
- `POST /opportunities/` - Create opportunity
- `PUT /opportunities/{id}` - Update opportunity
- `DELETE /opportunities/{id}` - Delete opportunity
- `POST /opportunities/upsert` - Upsert opportunity
- `GET /opportunities/search` - Search opportunities
- `GET /opportunities/pipelines` - Get pipelines

### Users Endpoints (Multiple Variations)
- `GET /users/?locationId={id}` - List users (primary)
- `GET /users?locationId={id}` - List users (fallback 1)
- `GET /locations/{id}/users` - List users (fallback 2)
- `GET /locations/{id}/users/` - List users (fallback 3)
- `GET /users/{id}` - Get user

### OAuth Endpoints
- `GET /oauth/chooselocation` - Authorization URL
- `POST /oauth/token` - Token exchange/refresh

## Important Implementation Notes

### Request Headers
All API requests include:
- `Authorization: Bearer {token}`
- `Content-Type: application/json`
- `Version: {apiVersion}` (default: '2021-07-28')

### Timeout
Default request timeout: 30 seconds (configurable)

### Rate Limiting
- Client respects 429 responses with Retry-After header
- Automatic exponential backoff on rate limits
- Default retry: 3 attempts with 1s initial delay

### Validation
- All responses validated against TypeBox schemas when schema provided
- Validation errors thrown as `ValidationError`
- Can disable validation per-request with `validateResponse: false`

### Caching
- Pipeline cache: 1 hour TTL
- Cache stored per location ID
- Manual cache clearing available

### Endpoint Fallbacks
- Contacts search: POST /contacts/search → GET /contacts/
- Users list: 4 different endpoint variations tried sequentially

### Token Refresh
- Automatic refresh when token expires (5-minute buffer)
- Single concurrent refresh (prevents race conditions)
- Failed requests retried once after token refresh on 401

### Location ID Handling
- Can be set as default in client config
- Can be overridden per-request
- Required for most operations
- Throws error if not provided and no default set

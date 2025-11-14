/**
 * @pixel/ghl-client
 *
 * A strongly-typed GoHighLevel API client built with Bun and TypeBox
 * Provides runtime validation and compile-time type safety for all GHL API interactions
 */

// Main client
export { GHLClient, type GHLClientConfig } from './client';

// OAuth client
export { OAuthClient, createOAuthClient } from './auth/oauth-client';

// Auth types
export type {
  AuthConfig,
  AuthMethod,
  ApiKeyAuth,
  OAuthAuth,
} from './auth/types';

// Resources
export type { ContactsResource } from './resources/contacts';
export type { OpportunitiesResource } from './resources/opportunities';
export type { UsersResource } from './resources/users';

// Types - Common
export type {
  DateTime,
  GHLId,
  Email,
  Phone,
  Url,
  PaginationMeta,
  ErrorResponse,
  CustomFields,
  Tag,
  Address,
} from './types/common';

// Types - Contact
export type {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  SearchContactsRequest,
  UpsertContactRequest,
  ContactNote,
  CreateContactNoteRequest,
  ContactResponse,
  ContactsListResponse,
  ContactSource,
  AttributionSource,
  SocialMediaLinks,
} from './types/contact';

// Types - Opportunity
export type {
  Opportunity,
  OpportunityStatus,
  Pipeline,
  PipelineStage,
  MonetaryValue,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  UpsertOpportunityRequest,
  SearchOpportunitiesRequest,
  GetPipelinesRequest,
  OpportunityResponse,
  OpportunitiesListResponse,
  PipelinesResponse,
} from './types/opportunity';

// Types - User
export type {
  User,
  UserRole,
  UserPermissions,
  GetUsersRequest,
  UserResponse,
  UsersListResponse,
} from './types/user';

// Types - OAuth
export type {
  OAuthScope,
  OAuthConfig,
  OAuthTokenResponse,
  OAuthRefreshTokenResponse,
  OAuthAuthorizationUrlRequest,
  OAuthTokenExchangeRequest,
  OAuthTokenRefreshRequest,
  OAuthCallbackQuery,
} from './types/oauth';

// Utilities
export { HttpClient, HttpClientError, ValidationError, type HttpClientConfig } from './utils/http';
export { withRetry, createRetryWrapper, type RetryConfig } from './utils/retry';
export { type Logger, NoopLogger, ConsoleLogger } from './utils/logger';

// TypeBox schemas (for advanced usage)
export {
  // Common schemas
  DateTimeSchema,
  GHLIdSchema,
  EmailSchema,
  PhoneSchema,
  UrlSchema,
  PaginationMetaSchema,
  ErrorResponseSchema,
  CustomFieldsSchema,
  TagSchema,
  AddressSchema,
} from './types/common';

export {
  // Contact schemas
  ContactSchema,
  CreateContactRequestSchema,
  UpdateContactRequestSchema,
  SearchContactsRequestSchema,
  UpsertContactRequestSchema,
  ContactNoteSchema,
  CreateContactNoteRequestSchema,
  ContactResponseSchema,
  ContactsListResponseSchema,
} from './types/contact';

export {
  // Opportunity schemas
  OpportunitySchema,
  OpportunityStatusSchema,
  PipelineSchema,
  PipelineStageSchema,
  MonetaryValueSchema,
  CreateOpportunityRequestSchema,
  UpdateOpportunityRequestSchema,
  UpsertOpportunityRequestSchema,
  SearchOpportunitiesRequestSchema,
  GetPipelinesRequestSchema,
  OpportunityResponseSchema,
  OpportunitiesListResponseSchema,
  PipelinesResponseSchema,
} from './types/opportunity';

export {
  // User schemas
  UserSchema,
  UserRoleSchema,
  UserPermissionsSchema,
  GetUsersRequestSchema,
  UserResponseSchema,
  UsersListResponseSchema,
} from './types/user';

export {
  // OAuth schemas
  OAuthScopeSchema,
  OAuthConfigSchema,
  OAuthTokenResponseSchema,
  OAuthRefreshTokenResponseSchema,
  OAuthAuthorizationUrlRequestSchema,
  OAuthTokenExchangeRequestSchema,
  OAuthTokenRefreshRequestSchema,
  OAuthCallbackQuerySchema,
} from './types/oauth';

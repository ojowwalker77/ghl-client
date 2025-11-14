import { Type, Static } from '@sinclair/typebox';

/**
 * OAuth Scopes
 */
export const OAuthScopeSchema = Type.Union([
  // Contacts
  Type.Literal('contacts.readonly'),
  Type.Literal('contacts.write'),

  // Opportunities
  Type.Literal('opportunities.readonly'),
  Type.Literal('opportunities.write'),

  // Calendars
  Type.Literal('calendars.readonly'),
  Type.Literal('calendars.write'),
  Type.Literal('calendars/events.readonly'),
  Type.Literal('calendars/events.write'),

  // Conversations
  Type.Literal('conversations.readonly'),
  Type.Literal('conversations.write'),
  Type.Literal('conversations/message.readonly'),
  Type.Literal('conversations/message.write'),

  // Users
  Type.Literal('users.readonly'),
  Type.Literal('users.write'),

  // Locations
  Type.Literal('locations.readonly'),
  Type.Literal('locations.write'),
  Type.Literal('locations/customFields.readonly'),
  Type.Literal('locations/customFields.write'),
  Type.Literal('locations/customValues.readonly'),
  Type.Literal('locations/customValues.write'),
  Type.Literal('locations/tags.readonly'),
  Type.Literal('locations/tags.write'),
  Type.Literal('locations/tasks.readonly'),
  Type.Literal('locations/tasks.write'),

  // Business
  Type.Literal('businesses.readonly'),
  Type.Literal('businesses.write'),

  // SaaS
  Type.Literal('saas/company.readonly'),
  Type.Literal('saas/company.write'),
  Type.Literal('saas/location.readonly'),
  Type.Literal('saas/location.write'),

  // OAuth
  Type.Literal('oauth.readonly'),
  Type.Literal('oauth.write'),

  // Forms
  Type.Literal('forms.readonly'),
  Type.Literal('forms.write'),

  // Surveys
  Type.Literal('surveys.readonly'),

  // Links
  Type.Literal('links.readonly'),
  Type.Literal('links.write'),

  // Workflows
  Type.Literal('workflows.readonly'),

  // Payments
  Type.Literal('payments.readonly'),
  Type.Literal('payments.write'),

  // Allow custom scopes
  Type.String(),
]);

/**
 * OAuth Configuration
 */
export const OAuthConfigSchema = Type.Object({
  clientId: Type.String(),
  clientSecret: Type.String(),
  redirectUri: Type.String(),
  scopes: Type.Array(OAuthScopeSchema, { default: [] }),
});

/**
 * OAuth Token Response
 */
export const OAuthTokenResponseSchema = Type.Object({
  access_token: Type.String(),
  token_type: Type.String({ default: 'Bearer' }),
  expires_in: Type.Number(),
  refresh_token: Type.String(),
  scope: Type.String(),
  userType: Type.Optional(Type.String()),
  locationId: Type.Optional(Type.String()),
  companyId: Type.Optional(Type.String()),
  approvedLocations: Type.Optional(Type.Array(Type.String())),
  userId: Type.Optional(Type.String()),
});

/**
 * OAuth Refresh Token Response
 */
export const OAuthRefreshTokenResponseSchema = Type.Object({
  access_token: Type.String(),
  token_type: Type.String({ default: 'Bearer' }),
  expires_in: Type.Number(),
  refresh_token: Type.String(),
  scope: Type.String(),
});

/**
 * OAuth Authorization URL Request
 */
export const OAuthAuthorizationUrlRequestSchema = Type.Object({
  clientId: Type.String(),
  redirectUri: Type.String(),
  scopes: Type.Array(OAuthScopeSchema),
  state: Type.Optional(Type.String()),
  responseType: Type.Optional(Type.String({ default: 'code' })),
});

/**
 * OAuth Token Exchange Request
 */
export const OAuthTokenExchangeRequestSchema = Type.Object({
  code: Type.String(),
  clientId: Type.String(),
  clientSecret: Type.String(),
  grantType: Type.Optional(Type.Literal('authorization_code', { default: 'authorization_code' })),
  redirectUri: Type.Optional(Type.String()),
});

/**
 * OAuth Token Refresh Request
 */
export const OAuthTokenRefreshRequestSchema = Type.Object({
  refreshToken: Type.String(),
  clientId: Type.String(),
  clientSecret: Type.String(),
  grantType: Type.Optional(Type.Literal('refresh_token', { default: 'refresh_token' })),
});

/**
 * OAuth Callback Query Parameters
 */
export const OAuthCallbackQuerySchema = Type.Object({
  code: Type.String(),
  state: Type.Optional(Type.String()),
  error: Type.Optional(Type.String()),
  error_description: Type.Optional(Type.String()),
});

// Export types
export type OAuthScope = Static<typeof OAuthScopeSchema>;
export type OAuthConfig = Static<typeof OAuthConfigSchema>;
export type OAuthTokenResponse = Static<typeof OAuthTokenResponseSchema>;
export type OAuthRefreshTokenResponse = Static<typeof OAuthRefreshTokenResponseSchema>;
export type OAuthAuthorizationUrlRequest = Static<typeof OAuthAuthorizationUrlRequestSchema>;
export type OAuthTokenExchangeRequest = Static<typeof OAuthTokenExchangeRequestSchema>;
export type OAuthTokenRefreshRequest = Static<typeof OAuthTokenRefreshRequestSchema>;
export type OAuthCallbackQuery = Static<typeof OAuthCallbackQuerySchema>;

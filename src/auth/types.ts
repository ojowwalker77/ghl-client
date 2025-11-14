/**
 * Authentication types
 */

/**
 * Authentication method
 */
export type AuthMethod = 'api-key' | 'oauth';

/**
 * API Key Authentication
 */
export interface ApiKeyAuth {
  type: 'api-key';
  apiKey: string;
}

/**
 * OAuth Authentication
 */
export interface OAuthAuth {
  type: 'oauth';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  onTokenRefresh?: (tokens: { accessToken: string; refreshToken: string; expiresAt: number }) => void | Promise<void>;
}

/**
 * Authentication Configuration
 */
export type AuthConfig = ApiKeyAuth | OAuthAuth;

/**
 * Check if auth is API Key
 */
export function isApiKeyAuth(auth: AuthConfig): auth is ApiKeyAuth {
  return auth.type === 'api-key';
}

/**
 * Check if auth is OAuth
 */
export function isOAuthAuth(auth: AuthConfig): auth is OAuthAuth {
  return auth.type === 'oauth';
}

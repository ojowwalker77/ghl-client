import { HttpClient } from './utils/http';
import { withRetry, type RetryConfig } from './utils/retry';
import type { AuthConfig } from './auth/types';
import { isApiKeyAuth, isOAuthAuth } from './auth/types';
import { ContactsResource } from './resources/contacts';
import { OpportunitiesResource } from './resources/opportunities';
import { UsersResource } from './resources/users';

/**
 * GHL Client Configuration
 */
export interface GHLClientConfig {
  /**
   * Authentication configuration
   */
  auth: AuthConfig;

  /**
   * Base URL for GHL API
   * @default 'https://services.leadconnectorhq.com'
   */
  baseUrl?: string;

  /**
   * API version
   * @default '2021-07-28'
   */
  apiVersion?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: RetryConfig;

  /**
   * Default location ID (optional, can be passed per-request)
   */
  locationId?: string;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Main GoHighLevel API Client
 *
 * @example
 * ```ts
 * // With API Key
 * const client = new GHLClient({
 *   auth: { type: 'api-key', apiKey: 'your-api-key' },
 *   locationId: 'your-location-id',
 * });
 *
 * // With OAuth
 * const client = new GHLClient({
 *   auth: {
 *     type: 'oauth',
 *     accessToken: 'your-access-token',
 *     refreshToken: 'your-refresh-token',
 *   },
 * });
 *
 * // Usage
 * const contacts = await client.contacts.search({ locationId: 'loc-123' });
 * ```
 */
export class GHLClient {
  private readonly http: HttpClient;
  private readonly retryConfig?: RetryConfig;
  private auth: AuthConfig;
  private readonly debug: boolean;

  // Resource instances
  public readonly contacts: ContactsResource;
  public readonly opportunities: OpportunitiesResource;
  public readonly users: UsersResource;

  // Default location ID
  public readonly locationId?: string;

  constructor(config: GHLClientConfig) {
    this.auth = config.auth;
    this.retryConfig = config.retry;
    this.locationId = config.locationId;
    this.debug = config.debug ?? false;

    // Initialize HTTP client
    this.http = new HttpClient({
      baseUrl: config.baseUrl ?? 'https://services.leadconnectorhq.com',
      apiVersion: config.apiVersion ?? '2021-07-28',
      timeout: config.timeout ?? 30000,
      headers: this.buildAuthHeaders(),
    });

    // Initialize resources
    this.contacts = new ContactsResource(this);
    this.opportunities = new OpportunitiesResource(this);
    this.users = new UsersResource(this);

    this.log('GHLClient initialized', {
      authType: this.auth.type,
      baseUrl: config.baseUrl,
      locationId: this.locationId,
    });
  }

  /**
   * Get the HTTP client instance
   * @internal
   */
  getHttpClient(): HttpClient {
    return this.http;
  }

  /**
   * Get retry configuration
   * @internal
   */
  getRetryConfig(): RetryConfig | undefined {
    return this.retryConfig;
  }

  /**
   * Execute a function with retry logic
   * @internal
   */
  async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    if (this.retryConfig) {
      return withRetry(fn, this.retryConfig);
    }
    return fn();
  }

  /**
   * Update authentication tokens (for OAuth)
   */
  updateAuth(auth: AuthConfig): void {
    this.auth = auth;
    // Note: We don't update HTTP client headers here because they're set per-request
    this.log('Auth updated', { authType: auth.type });
  }

  /**
   * Get current access token
   */
  getAccessToken(): string {
    if (isApiKeyAuth(this.auth)) {
      return this.auth.apiKey;
    }
    if (isOAuthAuth(this.auth)) {
      return this.auth.accessToken;
    }
    throw new Error('Invalid auth configuration');
  }

  /**
   * Build authorization headers
   * @internal
   */
  buildAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Log debug messages
   * @internal
   */
  log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[GHLClient] ${message}`, data || '');
    }
  }

  /**
   * Get default location ID or throw if not set
   * @internal
   */
  requireLocationId(locationId?: string): string {
    const id = locationId ?? this.locationId;
    if (!id) {
      throw new Error(
        'Location ID is required. Either set it in the client config or pass it as a parameter.'
      );
    }
    return id;
  }
}

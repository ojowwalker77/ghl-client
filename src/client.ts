import { HttpClient } from './utils/http';
import { withRetry, type RetryConfig } from './utils/retry';
import type { AuthConfig, OAuthAuthConfig } from './auth/types';
import { isApiKeyAuth, isOAuthAuth } from './auth/types';
import { ContactsResource } from './resources/contacts';
import { OpportunitiesResource } from './resources/opportunities';
import { UsersResource } from './resources/users';
import { OAuthClient } from './auth/oauth-client';
import { type Logger, NoopLogger, ConsoleLogger } from './utils/logger';
import { type AuditLogger, NoopAuditLogger, type AuditEvent } from './utils/audit';

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
   * Logger instance for logging client activity
   * @default NoopLogger (no logging)
   *
   * @example
   * // Enable console logging
   * logger: new ConsoleLogger()
   *
   * // Use custom logger
   * logger: myCustomLogger
   */
  logger?: Logger;

  /**
   * Audit logger for compliance and security logging
   * @default NoopAuditLogger (no audit logging)
   *
   * @example
   * // Enable console audit logging (dev only)
   * auditLogger: new ConsoleAuditLogger()
   *
   * // Use custom audit logger (recommended for production)
   * auditLogger: new BufferAuditLogger(async (events) => {
   *   await sendToAuditSystem(events);
   * })
   */
  auditLogger?: AuditLogger;

  /**
   * Actor identifier for audit logs (user ID, email, API key name, etc.)
   * Used to track who performed each operation
   *
   * @example
   * actor: 'user-123'
   * actor: 'admin@example.com'
   * actor: 'api-service-account'
   */
  actor?: string;

  /**
   * Enable debug logging (deprecated - use logger instead)
   * @deprecated Use logger: new ConsoleLogger() instead
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
  private readonly logger: Logger;
  private readonly auditLogger: AuditLogger;
  private readonly actor?: string;
  private oauthClient?: OAuthClient;
  private tokenRefreshPromise?: Promise<void>;

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
    this.actor = config.actor;

    // Initialize logger (support legacy debug flag)
    if (config.logger) {
      this.logger = config.logger;
    } else if (config.debug) {
      this.logger = new ConsoleLogger();
    } else {
      this.logger = new NoopLogger();
    }

    // Initialize audit logger
    this.auditLogger = config.auditLogger || new NoopAuditLogger();

    // Initialize OAuth client if using OAuth
    if (isOAuthAuth(this.auth) && this.auth.clientId && this.auth.clientSecret) {
      this.oauthClient = new OAuthClient({
        clientId: this.auth.clientId,
        clientSecret: this.auth.clientSecret,
        redirectUri: this.auth.redirectUri || '',
        scopes: [],
      });
    }

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

    this.logger.info('GHLClient initialized', {
      authType: this.auth.type,
      baseUrl: config.baseUrl,
      locationId: this.locationId,
    });
  }

  /**
   * Check if OAuth token is expired
   * @internal
   */
  private isTokenExpired(): boolean {
    if (!isOAuthAuth(this.auth) || !this.auth.expiresAt) {
      return false;
    }

    // Buffer of 5 minutes before expiration
    const bufferMs = 5 * 60 * 1000;
    return Date.now() >= this.auth.expiresAt - bufferMs;
  }

  /**
   * Refresh OAuth token
   * @internal
   */
  private async refreshToken(): Promise<void> {
    if (!isOAuthAuth(this.auth)) {
      throw new Error('Cannot refresh token: not using OAuth authentication');
    }

    if (!this.oauthClient) {
      throw new Error('Cannot refresh token: OAuth client not initialized');
    }

    if (!this.auth.refreshToken) {
      throw new Error('Cannot refresh token: no refresh token available');
    }

    this.logger.debug('Refreshing OAuth token');

    try {
      const newTokens = await this.oauthClient.refreshToken(this.auth.refreshToken);

      const newAuth: OAuthAuthConfig = {
        type: 'oauth',
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || this.auth.refreshToken,
        expiresAt: Date.now() + newTokens.expires_in * 1000,
        clientId: this.auth.clientId,
        clientSecret: this.auth.clientSecret,
        redirectUri: this.auth.redirectUri,
        onTokenRefresh: this.auth.onTokenRefresh,
      };

      this.auth = newAuth;

      // Call onTokenRefresh callback if provided
      if (this.auth.onTokenRefresh) {
        this.auth.onTokenRefresh({
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token || this.auth.refreshToken,
          expiresAt: newAuth.expiresAt!,
        });
      }

      this.logger.info('OAuth token refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh OAuth token', { error });
      throw error;
    }
  }

  /**
   * Ensure token is valid (refresh if expired)
   * @internal
   */
  async ensureValidToken(): Promise<void> {
    if (!isOAuthAuth(this.auth)) {
      return; // No token refresh needed for API key auth
    }

    if (!this.isTokenExpired()) {
      return; // Token is still valid
    }

    // Prevent multiple concurrent refresh attempts
    if (this.tokenRefreshPromise) {
      await this.tokenRefreshPromise;
      return;
    }

    this.tokenRefreshPromise = this.refreshToken();
    try {
      await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = undefined;
    }
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
   * Execute a function with retry logic and automatic token refresh
   * @internal
   */
  async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    // Ensure token is valid before making request
    await this.ensureValidToken();

    try {
      if (this.retryConfig) {
        return await withRetry(fn, this.retryConfig);
      }
      return await fn();
    } catch (error: any) {
      // If we get a 401 error and we're using OAuth, try refreshing token once
      if (error?.statusCode === 401 && isOAuthAuth(this.auth) && this.oauthClient) {
        this.logger.debug('Received 401, attempting token refresh and retry');

        try {
          await this.refreshToken();

          // Retry the request once with new token
          if (this.retryConfig) {
            return await withRetry(fn, this.retryConfig);
          }
          return await fn();
        } catch (refreshError) {
          this.logger.error('Token refresh and retry failed', { refreshError });
          throw refreshError;
        }
      }

      throw error;
    }
  }

  /**
   * Update authentication tokens (for OAuth)
   */
  updateAuth(auth: AuthConfig): void {
    this.auth = auth;
    // Note: We don't update HTTP client headers here because they're set per-request
    this.logger.debug('Auth updated', { authType: auth.type });
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
    this.logger.debug(message, data);
  }

  /**
   * Get logger instance
   * @internal
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get audit logger instance
   * @internal
   */
  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  /**
   * Log an audit event
   * @internal
   */
  audit(event: Partial<AuditEvent>): void {
    const fullEvent: AuditEvent = {
      timestamp: new Date(),
      actor: this.actor,
      success: true,
      ...event,
      operation: event.operation!,
      resourceType: event.resourceType!,
    };

    try {
      this.auditLogger.log(fullEvent);
    } catch (error) {
      // Audit logging failures should not break the application
      this.logger.error('Failed to log audit event', { error, event: fullEvent });
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

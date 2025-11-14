import type {
  OAuthConfig,
  OAuthTokenResponse,
  OAuthRefreshTokenResponse,
  OAuthAuthorizationUrlRequest,
  OAuthTokenExchangeRequest,
  OAuthTokenRefreshRequest,
  OAuthScope,
} from '../types/oauth';

/**
 * OAuth Client for GoHighLevel
 * Handles OAuth 2.0 authorization flow and token management
 */
export class OAuthClient {
  private readonly config: OAuthConfig;
  private readonly authBaseUrl = 'https://marketplace.gohighlevel.com/oauth';
  private readonly tokenBaseUrl = 'https://services.leadconnectorhq.com/oauth';

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  /**
   * Generate OAuth authorization URL
   *
   * @example
   * ```ts
   * const authUrl = oauthClient.getAuthorizationUrl({
   *   state: 'random-state-string',
   * });
   * // Redirect user to authUrl
   * ```
   */
  getAuthorizationUrl(options?: {
    state?: string;
    scopes?: OAuthScope[];
  }): string {
    const url = new URL(`${this.authBaseUrl}/chooselocation`);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);

    const scopes = options?.scopes || this.config.scopes;
    if (scopes.length > 0) {
      url.searchParams.set('scope', scopes.join(' '));
    }

    if (options?.state) {
      url.searchParams.set('state', options.state);
    }

    return url.toString();
  }

  /**
   * Exchange authorization code for access token
   *
   * @example
   * ```ts
   * const tokens = await oauthClient.exchangeCodeForToken('auth-code');
   * ```
   */
  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch(`${this.tokenBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return (await response.json()) as OAuthTokenResponse;
  }

  /**
   * Refresh access token using refresh token
   *
   * @example
   * ```ts
   * const tokens = await oauthClient.refreshToken('refresh-token');
   * ```
   */
  async refreshToken(refreshToken: string): Promise<OAuthRefreshTokenResponse> {
    const response = await fetch(`${this.tokenBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    return (await response.json()) as OAuthTokenResponse;
  }

  /**
   * Check if access token is expired
   *
   * @param expiresAt - Timestamp when token expires (milliseconds)
   * @param bufferSeconds - Buffer time before expiration to consider token expired
   */
  isTokenExpired(expiresAt: number, bufferSeconds: number = 300): boolean {
    const now = Date.now();
    const buffer = bufferSeconds * 1000;
    return now >= expiresAt - buffer;
  }

  /**
   * Calculate token expiration timestamp
   *
   * @param expiresIn - Seconds until token expires
   */
  calculateExpiresAt(expiresIn: number): number {
    return Date.now() + expiresIn * 1000;
  }
}

/**
 * Create an OAuth client instance
 *
 * @example
 * ```ts
 * const oauthClient = createOAuthClient({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   redirectUri: 'https://your-app.com/callback',
 *   scopes: ['contacts.readonly', 'opportunities.write'],
 * });
 * ```
 */
export function createOAuthClient(config: OAuthConfig): OAuthClient {
  return new OAuthClient(config);
}

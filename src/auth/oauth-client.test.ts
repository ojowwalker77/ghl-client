import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { OAuthClient, createOAuthClient } from './oauth-client';
import type { OAuthConfig } from '../types/oauth';

const mockConfig: OAuthConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'https://example.com/callback',
  scopes: ['contacts.readonly', 'contacts.write'],
};

// Mock global fetch
const originalFetch = globalThis.fetch;
let mockFetch: any;

beforeEach(() => {
  mockFetch = mock(() => Promise.resolve(new Response()));
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('OAuthClient', () => {
  describe('constructor', () => {
    test('should create instance with valid config', () => {
      const client = new OAuthClient(mockConfig);
      expect(client).toBeDefined();
    });

    test('should be created via factory function', () => {
      const client = createOAuthClient(mockConfig);
      expect(client).toBeInstanceOf(OAuthClient);
    });
  });

  describe('getAuthorizationUrl', () => {
    test('should generate authorization URL with required parameters', () => {
      const client = new OAuthClient(mockConfig);
      const url = client.getAuthorizationUrl();

      expect(url).toContain('https://marketplace.gohighlevel.com/oauth/chooselocation');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
    });

    test('should include scopes from config', () => {
      const client = new OAuthClient(mockConfig);
      const url = client.getAuthorizationUrl();

      expect(url).toContain('scope=contacts.readonly+contacts.write');
    });

    test('should include custom state parameter', () => {
      const client = new OAuthClient(mockConfig);
      const url = client.getAuthorizationUrl({ state: 'random-state-123' });

      expect(url).toContain('state=random-state-123');
    });

    test('should override scopes when provided in options', () => {
      const client = new OAuthClient(mockConfig);
      const url = client.getAuthorizationUrl({
        scopes: ['opportunities.write', 'users.readonly'],
      });

      expect(url).toContain('scope=opportunities.write+users.readonly');
    });

    test('should handle empty scopes array', () => {
      const client = new OAuthClient({
        ...mockConfig,
        scopes: [],
      });
      const url = client.getAuthorizationUrl();

      expect(url).not.toContain('scope=');
    });

    test('should encode redirect URI properly', () => {
      const client = new OAuthClient({
        ...mockConfig,
        redirectUri: 'https://example.com/callback?param=value',
      });
      const url = client.getAuthorizationUrl();

      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback%3Fparam%3Dvalue');
    });
  });

  describe('exchangeCodeForToken', () => {
    test('should exchange code for tokens successfully', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'contacts.readonly contacts.write',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTokenResponse), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new OAuthClient(mockConfig);
      const result = await client.exchangeCodeForToken('auth-code-123');

      expect(result).toEqual(mockTokenResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should send correct request parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new OAuthClient(mockConfig);
      await client.exchangeCodeForToken('auth-code-123');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://services.leadconnectorhq.com/oauth/token');
      expect(callArgs[1].method).toBe('POST');
      expect(callArgs[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      const bodyParams = new URLSearchParams(callArgs[1].body);
      expect(bodyParams.get('client_id')).toBe('test-client-id');
      expect(bodyParams.get('client_secret')).toBe('test-client-secret');
      expect(bodyParams.get('grant_type')).toBe('authorization_code');
      expect(bodyParams.get('code')).toBe('auth-code-123');
      expect(bodyParams.get('redirect_uri')).toBe('https://example.com/callback');
    });

    test('should throw error on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Invalid authorization code', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        })
      );

      const client = new OAuthClient(mockConfig);

      await expect(client.exchangeCodeForToken('invalid-code')).rejects.toThrow(
        'Token exchange failed'
      );
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new OAuthClient(mockConfig);

      await expect(client.exchangeCodeForToken('auth-code-123')).rejects.toThrow('Network error');
    });
  });

  describe('refreshToken', () => {
    test('should refresh token successfully', async () => {
      const mockRefreshResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'contacts.readonly contacts.write',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockRefreshResponse), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new OAuthClient(mockConfig);
      const result = await client.refreshToken('old-refresh-token');

      expect(result).toEqual(mockRefreshResponse);
    });

    test('should send correct refresh request parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'new-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new OAuthClient(mockConfig);
      await client.refreshToken('refresh-token-456');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe('https://services.leadconnectorhq.com/oauth/token');
      expect(callArgs[1].method).toBe('POST');

      const bodyParams = new URLSearchParams(callArgs[1].body);
      expect(bodyParams.get('client_id')).toBe('test-client-id');
      expect(bodyParams.get('client_secret')).toBe('test-client-secret');
      expect(bodyParams.get('grant_type')).toBe('refresh_token');
      expect(bodyParams.get('refresh_token')).toBe('refresh-token-456');
    });

    test('should throw error on failed token refresh', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Invalid refresh token', {
          status: 400,
          headers: { 'content-type': 'text/plain' },
        })
      );

      const client = new OAuthClient(mockConfig);

      await expect(client.refreshToken('invalid-refresh-token')).rejects.toThrow(
        'Token refresh failed'
      );
    });
  });

  describe('isTokenExpired', () => {
    test('should return false for non-expired token', () => {
      const client = new OAuthClient(mockConfig);
      const futureTime = Date.now() + 10 * 60 * 1000; // 10 minutes from now

      expect(client.isTokenExpired(futureTime)).toBe(false);
    });

    test('should return true for expired token', () => {
      const client = new OAuthClient(mockConfig);
      const pastTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago

      expect(client.isTokenExpired(pastTime)).toBe(true);
    });

    test('should consider buffer time', () => {
      const client = new OAuthClient(mockConfig);
      const almostExpired = Date.now() + 4 * 60 * 1000; // 4 minutes from now

      // Default buffer is 5 minutes (300 seconds)
      expect(client.isTokenExpired(almostExpired)).toBe(true);
    });

    test('should allow custom buffer time', () => {
      const client = new OAuthClient(mockConfig);
      const almostExpired = Date.now() + 4 * 60 * 1000; // 4 minutes from now

      // With 3 minute buffer, should not be expired
      expect(client.isTokenExpired(almostExpired, 180)).toBe(false);

      // With 5 minute buffer, should be expired
      expect(client.isTokenExpired(almostExpired, 300)).toBe(true);
    });

    test('should handle edge case at exact expiry time', () => {
      const client = new OAuthClient(mockConfig);
      const now = Date.now();

      expect(client.isTokenExpired(now, 0)).toBe(true);
    });
  });

  describe('calculateExpiresAt', () => {
    test('should calculate correct expiration timestamp', () => {
      const client = new OAuthClient(mockConfig);
      const expiresIn = 3600; // 1 hour

      const beforeCall = Date.now();
      const expiresAt = client.calculateExpiresAt(expiresIn);
      const afterCall = Date.now();

      const expectedMin = beforeCall + expiresIn * 1000;
      const expectedMax = afterCall + expiresIn * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    test('should handle zero expiration', () => {
      const client = new OAuthClient(mockConfig);
      const expiresAt = client.calculateExpiresAt(0);

      expect(expiresAt).toBeCloseTo(Date.now(), -2); // Within 100ms
    });

    test('should handle large expiration values', () => {
      const client = new OAuthClient(mockConfig);
      const thirtyDays = 30 * 24 * 60 * 60; // 30 days in seconds

      const expiresAt = client.calculateExpiresAt(thirtyDays);
      const expected = Date.now() + thirtyDays * 1000;

      expect(expiresAt).toBeCloseTo(expected, -3); // Within 1 second
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete OAuth flow', async () => {
      const client = new OAuthClient(mockConfig);

      // Step 1: Generate auth URL
      const authUrl = client.getAuthorizationUrl({ state: 'state-123' });
      expect(authUrl).toContain('state=state-123');

      // Step 2: Exchange code for token
      const tokenResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'contacts.readonly',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(tokenResponse), { status: 200 })
      );

      const tokens = await client.exchangeCodeForToken('auth-code');
      expect(tokens.access_token).toBe('access-token');

      // Step 3: Calculate expiration
      const expiresAt = client.calculateExpiresAt(tokens.expires_in);
      expect(client.isTokenExpired(expiresAt)).toBe(false);
    });

    test('should handle token refresh when expired', async () => {
      const client = new OAuthClient(mockConfig);

      // Token is expired
      const expiresAt = Date.now() - 1000;
      expect(client.isTokenExpired(expiresAt)).toBe(true);

      // Refresh the token
      const refreshResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'contacts.readonly',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(refreshResponse), { status: 200 })
      );

      const newTokens = await client.refreshToken('old-refresh-token');
      const newExpiresAt = client.calculateExpiresAt(newTokens.expires_in);

      expect(client.isTokenExpired(newExpiresAt)).toBe(false);
    });
  });
});

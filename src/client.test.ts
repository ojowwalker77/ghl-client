import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { GHLClient } from './client';
import type { AuthConfig } from './auth/types';
import { ContactsResource } from './resources/contacts';
import { OpportunitiesResource } from './resources/opportunities';
import { UsersResource } from './resources/users';

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

describe('GHLClient', () => {
  describe('constructor', () => {
    test('should initialize with API key auth', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-api-key',
        },
      });

      expect(client).toBeDefined();
      expect(client.contacts).toBeInstanceOf(ContactsResource);
      expect(client.opportunities).toBeInstanceOf(OpportunitiesResource);
      expect(client.users).toBeInstanceOf(UsersResource);
    });

    test('should initialize with OAuth auth', () => {
      const client = new GHLClient({
        auth: {
          type: 'oauth',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: Date.now() + 3600000,
        },
      });

      expect(client).toBeDefined();
    });

    test('should use default configuration values', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      expect(client).toBeDefined();
      // Client should have resources initialized
      expect(client.contacts).toBeDefined();
      expect(client.opportunities).toBeDefined();
      expect(client.users).toBeDefined();
    });

    test('should accept custom base URL', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        baseUrl: 'https://custom-api.example.com',
      });

      expect(client).toBeDefined();
    });

    test('should accept custom timeout', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        timeout: 60000,
      });

      expect(client).toBeDefined();
    });

    test('should accept default location ID', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        locationId: 'loc-default',
      });

      expect(client.locationId).toBe('loc-default');
    });

    test('should accept retry configuration', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        retry: {
          maxRetries: 5,
          initialDelay: 2000,
        },
      });

      const retryConfig = client.getRetryConfig();
      expect(retryConfig).toBeDefined();
      expect(retryConfig?.maxRetries).toBe(5);
      expect(retryConfig?.initialDelay).toBe(2000);
    });

    test('should enable debug mode', () => {
      const consoleInfoSpy = mock(() => {});
      const originalInfo = console.info;
      console.info = consoleInfoSpy;

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        debug: true,
      });

      // Info log should be called during initialization
      expect(consoleInfoSpy).toHaveBeenCalled();

      console.info = originalInfo;
    });
  });

  describe('getAccessToken', () => {
    test('should return API key for API key auth', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'my-api-key',
        },
      });

      expect(client.getAccessToken()).toBe('my-api-key');
    });

    test('should return access token for OAuth auth', () => {
      const client = new GHLClient({
        auth: {
          type: 'oauth',
          accessToken: 'my-access-token',
          refreshToken: 'my-refresh-token',
          expiresAt: Date.now() + 3600000,
        },
      });

      expect(client.getAccessToken()).toBe('my-access-token');
    });
  });

  describe('buildAuthHeaders', () => {
    test('should build Bearer token header for API key', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      const headers = client.buildAuthHeaders();
      expect(headers.Authorization).toBe('Bearer test-key');
    });

    test('should build Bearer token header for OAuth', () => {
      const client = new GHLClient({
        auth: {
          type: 'oauth',
          accessToken: 'oauth-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
        },
      });

      const headers = client.buildAuthHeaders();
      expect(headers.Authorization).toBe('Bearer oauth-token');
    });
  });

  describe('updateAuth', () => {
    test('should update authentication configuration', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'old-key',
        },
      });

      expect(client.getAccessToken()).toBe('old-key');

      client.updateAuth({
        type: 'api-key',
        apiKey: 'new-key',
      });

      expect(client.getAccessToken()).toBe('new-key');
    });

    test('should switch from API key to OAuth', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'api-key',
        },
      });

      client.updateAuth({
        type: 'oauth',
        accessToken: 'new-oauth-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
      });

      expect(client.getAccessToken()).toBe('new-oauth-token');
    });

    test('should update OAuth tokens', () => {
      const client = new GHLClient({
        auth: {
          type: 'oauth',
          accessToken: 'old-token',
          refreshToken: 'old-refresh',
          expiresAt: Date.now() + 1000,
        },
      });

      client.updateAuth({
        type: 'oauth',
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresAt: Date.now() + 3600000,
      });

      expect(client.getAccessToken()).toBe('new-token');
    });
  });

  describe('requireLocationId', () => {
    test('should return provided location ID', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      const result = client.requireLocationId('loc-123');
      expect(result).toBe('loc-123');
    });

    test('should return default location ID when not provided', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        locationId: 'loc-default',
      });

      const result = client.requireLocationId();
      expect(result).toBe('loc-default');
    });

    test('should prefer provided location ID over default', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        locationId: 'loc-default',
      });

      const result = client.requireLocationId('loc-override');
      expect(result).toBe('loc-override');
    });

    test('should throw error when no location ID available', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      expect(() => client.requireLocationId()).toThrow('Location ID is required');
    });
  });

  describe('withRetry', () => {
    test('should execute function without retry when no config', async () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      const fn = mock(async () => 'result');
      const result = await client.withRetry(fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should execute function with retry when configured', async () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        retry: {
          maxRetries: 3,
          initialDelay: 10,
          shouldRetry: () => true,
        },
      });

      let attempt = 0;
      const fn = mock(async () => {
        attempt++;
        if (attempt < 2) {
          const error: any = new Error('Temporary failure');
          error.shouldRetry = true;
          throw error;
        }
        return 'success';
      });

      const result = await client.withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('log', () => {
    test('should not log when debug is disabled (NoopLogger)', () => {
      const consoleDebugSpy = mock(() => {});
      const originalDebug = console.debug;
      console.debug = consoleDebugSpy;

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        debug: false,
      });

      // Clear calls from constructor
      consoleDebugSpy.mockClear();

      client.log('Test message', { data: 'test' });

      expect(consoleDebugSpy).not.toHaveBeenCalled();

      console.debug = originalDebug;
    });

    test('should log when debug is enabled (ConsoleLogger)', () => {
      const consoleDebugSpy = mock(() => {});
      const originalDebug = console.debug;
      console.debug = consoleDebugSpy;

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        debug: true,
      });

      // Clear calls from constructor
      consoleDebugSpy.mockClear();

      client.log('Test message', { data: 'test' });

      expect(consoleDebugSpy).toHaveBeenCalledWith('[GHLClient] Test message', { data: 'test' });

      console.debug = originalDebug;
    });

    test('should use custom logger when provided', () => {
      const customLogger = {
        debug: mock(() => {}),
        info: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      };

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        logger: customLogger,
      });

      client.log('Test message', { data: 'test' });

      expect(customLogger.debug).toHaveBeenCalledWith('Test message', { data: 'test' });
    });
  });

  describe('integration with resources', () => {
    test('should make API call through contacts resource', async () => {
      // Note: Full schema validation is tested in HTTP client tests.
      // These integration tests focus on end-to-end flow with minimal data.
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            contact: {
              id: 'contact-123',
              locationId: 'loc-123',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      );

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      const contact = await client.contacts.get('contact-123');

      expect(contact.id).toBe('contact-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/contacts/contact-123');
      expect(callArgs[1].headers.Authorization).toBe('Bearer test-key');
    });

    test('should make API call through opportunities resource', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            opportunity: {
              id: 'opp-123',
              locationId: 'loc-123',
              name: 'Test Deal',
              pipelineId: 'pipeline-1',
              pipelineStageId: 'stage-1',
              status: 'open',
              contactId: 'contact-123',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      );

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      const opportunity = await client.opportunities.get('opp-123');

      expect(opportunity.id).toBe('opp-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should make API call through users resource', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: {
              id: 'user-123',
              name: 'Test User',
              email: 'user@example.com',
              role: 'admin',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
      );

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      const user = await client.users.get('user-123');

      expect(user.id).toBe('user-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should apply retry logic to resource calls', async () => {
      let attempt = 0;
      mockFetch.mockImplementation(async () => {
        attempt++;
        if (attempt < 3) {
          return new Response(JSON.stringify({ message: 'Server error' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({
            contact: {
              id: 'contact-123',
              locationId: 'loc-123',
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      });

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        retry: {
          maxRetries: 3,
          initialDelay: 10,
        },
      });

      const contact = await client.contacts.get('contact-123');

      expect(contact.id).toBe('contact-123');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should use default location ID in resource calls', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        locationId: 'loc-default',
      });

      await client.users.list();

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('loc-default');
    });
  });

  describe('OAuth token refresh scenario', () => {
    test('should support token refresh flow', () => {
      const onTokenRefresh = mock((newTokens: any) => {
        expect(newTokens.accessToken).toBe('new-access-token');
      });

      const client = new GHLClient({
        auth: {
          type: 'oauth',
          accessToken: 'old-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 100, // Almost expired
          onTokenRefresh,
        },
      });

      // Simulate token refresh
      client.updateAuth({
        type: 'oauth',
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: Date.now() + 3600000,
      });

      expect(client.getAccessToken()).toBe('new-access-token');
    });
  });

  describe('error handling', () => {
    test('should propagate errors from resources', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      await expect(client.contacts.get('invalid-id')).rejects.toThrow();
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
      });

      await expect(client.contacts.get('contact-123')).rejects.toThrow('Network error');
    });
  });

  describe('configuration edge cases', () => {
    test('should handle empty string location ID', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        locationId: '',
      });

      // Empty string should be treated as no location ID
      expect(() => client.requireLocationId()).toThrow();
    });

    test('should handle very long timeout values', () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        timeout: 600000, // 10 minutes
      });

      expect(client).toBeDefined();
    });

    test('should handle zero retry attempts', async () => {
      const client = new GHLClient({
        auth: {
          type: 'api-key',
          apiKey: 'test-key',
        },
        retry: {
          maxRetries: 0,
        },
      });

      const fn = mock(async () => {
        throw new Error('Fails');
      });

      await expect(client.withRetry(fn)).rejects.toThrow('Fails');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});

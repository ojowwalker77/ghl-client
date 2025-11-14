import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { HttpClient, HttpClientError, ValidationError } from './http';
import { Type } from '@sinclair/typebox';

// Mock global fetch
const originalFetch = globalThis.fetch;
let mockFetch: any;

beforeEach(() => {
  mockFetch = mock(() => Promise.resolve(new Response()));
  globalThis.fetch = mockFetch;
});

// Restore after tests
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('HttpClient', () => {
  describe('constructor', () => {
    test('should initialize with default values', () => {
      const client = new HttpClient({
        baseUrl: 'https://api.example.com',
      });

      expect(client).toBeDefined();
    });

    test('should accept custom configuration', () => {
      const client = new HttpClient({
        baseUrl: 'https://api.example.com',
        apiVersion: '2023-01-01',
        timeout: 60000,
        headers: { 'X-Custom': 'header' },
      });

      expect(client).toBeDefined();
    });
  });

  describe('GET requests', () => {
    test('should make successful GET request', async () => {
      const responseData = { id: '123', name: 'Test' };
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      const result = await client.get('/users/123');

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('should handle query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      await client.get('/users', {
        query: { page: 1, limit: 10, filter: 'active' },
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('limit=10');
      expect(callUrl).toContain('filter=active');
    });

    test('should handle array query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      await client.get('/users', {
        query: { tags: ['admin', 'user'] },
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('tags=admin');
      expect(callUrl).toContain('tags=user');
    });

    test('should filter out null and undefined query parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      await client.get('/users', {
        query: { page: 1, filter: null, search: undefined },
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('page=1');
      expect(callUrl).not.toContain('filter');
      expect(callUrl).not.toContain('search');
    });

    test('should include custom headers', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      await client.get('/users', {
        headers: { 'X-Request-ID': 'abc123' },
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['X-Request-ID']).toBe('abc123');
    });
  });

  describe('POST requests', () => {
    test('should make POST request with body', async () => {
      const requestBody = { name: 'John', email: 'john@example.com' };
      const responseData = { id: '456', ...requestBody };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(responseData), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      const result = await client.post('/users', { body: requestBody });

      expect(result).toEqual(responseData);
      const callBody = mockFetch.mock.calls[0][1].body;
      expect(JSON.parse(callBody)).toEqual(requestBody);
    });

    test('should set correct Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      await client.post('/users', { body: { name: 'Test' } });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Content-Type']).toBe('application/json');
    });
  });

  describe('PUT requests', () => {
    test('should make PUT request', async () => {
      const updateData = { name: 'Updated Name' };
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(updateData), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      const result = await client.put('/users/123', { body: updateData });

      expect(result).toEqual(updateData);
      expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    });
  });

  describe('PATCH requests', () => {
    test('should make PATCH request', async () => {
      const patchData = { email: 'newemail@example.com' };
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(patchData), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      const result = await client.patch('/users/123', { body: patchData });

      expect(result).toEqual(patchData);
      expect(mockFetch.mock.calls[0][1].method).toBe('PATCH');
    });
  });

  describe('DELETE requests', () => {
    test('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      const result = await client.delete('/users/123');

      expect(result).toEqual({ success: true });
      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    });
  });

  describe('Error handling', () => {
    test('should throw HttpClientError on 404', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'User not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users/999');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).statusCode).toBe(404);
        expect((error as HttpClientError).shouldRetry).toBe(false);
      }
    });

    test('should mark 5xx errors as retryable', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).statusCode).toBe(500);
        expect((error as HttpClientError).shouldRetry).toBe(true);
      }
    });

    test('should mark 401 errors as non-retryable', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).statusCode).toBe(401);
        expect((error as HttpClientError).shouldRetry).toBe(false);
      }
    });

    test('should mark 403 errors as non-retryable', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Forbidden' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).statusCode).toBe(403);
        expect((error as HttpClientError).shouldRetry).toBe(false);
      }
    });

    test('should handle timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'));

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).message).toBe('Request timeout');
        expect((error as HttpClientError).shouldRetry).toBe(true);
      }
    });

    test('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Internal Server Error', {
          status: 500,
          headers: { 'content-type': 'text/plain' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).statusCode).toBe(500);
      }
    });
  });

  describe('Response validation', () => {
    test('should validate response against schema', async () => {
      const responseData = { id: '123', name: 'Test', email: 'test@example.com' };
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const UserSchema = Type.Object({
        id: Type.String(),
        name: Type.String(),
        email: Type.String(),
      });

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      const result = await client.get('/users/123', {
        responseSchema: UserSchema,
      });

      expect(result).toEqual(responseData);
    });

    test('should throw ValidationError on schema mismatch', async () => {
      const invalidData = { id: 123 }; // id should be string
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(invalidData), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const UserSchema = Type.Object({
        id: Type.String(),
        name: Type.String(),
      });

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users/123', {
          responseSchema: UserSchema,
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).errors.length).toBeGreaterThan(0);
      }
    });

    test('should skip validation when validateResponse is false', async () => {
      const invalidData = { id: 123 }; // Would normally fail validation
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(invalidData), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const UserSchema = Type.Object({
        id: Type.String(),
      });

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      const result = await client.get('/users/123', {
        responseSchema: UserSchema,
        validateResponse: false,
      });

      expect(result).toEqual(invalidData);
    });
  });

  describe('Headers', () => {
    test('should include API version in headers', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({
        baseUrl: 'https://api.example.com',
        apiVersion: '2023-05-01',
      });
      await client.get('/users');

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Version']).toBe('2023-05-01');
    });

    test('should merge custom headers with default headers', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({
        baseUrl: 'https://api.example.com',
        headers: { 'X-Client-ID': 'test-client' },
      });
      await client.get('/users', {
        headers: { 'X-Request-ID': 'req-123' },
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['X-Client-ID']).toBe('test-client');
      expect(callHeaders['X-Request-ID']).toBe('req-123');
      expect(callHeaders['Content-Type']).toBe('application/json');
    });
  });

  describe('Text responses', () => {
    test('should handle non-JSON success responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('OK', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });
      const result = await client.get('/health');

      expect(result).toBe('OK');
    });
  });

  describe('Rate limiting', () => {
    test('should mark 429 errors as retryable', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).statusCode).toBe(429);
        expect((error as HttpClientError).shouldRetry).toBe(true);
      }
    });

    test('should parse Retry-After header in seconds', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'Retry-After': '60', // 60 seconds
          },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).retryAfter).toBe(60000); // 60 seconds in ms
      }
    });

    test('should parse Retry-After header as HTTP date', async () => {
      const retryDate = new Date(Date.now() + 120000); // 2 minutes from now
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'Retry-After': retryDate.toUTCString(),
          },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        const retryAfter = (error as HttpClientError).retryAfter!;
        expect(retryAfter).toBeGreaterThan(115000); // At least 115 seconds
        expect(retryAfter).toBeLessThan(125000); // At most 125 seconds
      }
    });

    test('should default to 1 second if no Retry-After header', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'content-type': 'application/json' },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).retryAfter).toBe(1000); // 1 second default
      }
    });

    test('should handle invalid Retry-After header gracefully', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'Retry-After': 'invalid',
          },
        })
      );

      const client = new HttpClient({ baseUrl: 'https://api.example.com' });

      try {
        await client.get('/users');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).retryAfter).toBe(1000); // Fallback to default
      }
    });
  });
});

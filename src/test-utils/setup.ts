/**
 * Test setup and global utilities
 */

/**
 * Mock fetch function for testing HTTP requests
 */
export function createMockFetch(responses: Map<string, any> = new Map()) {
  return async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const urlString = typeof url === 'string' ? url : url.toString();
    const mockResponse = responses.get(urlString);

    if (!mockResponse) {
      return new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(mockResponse.body), {
      status: mockResponse.status || 200,
      headers: { 'content-type': 'application/json', ...mockResponse.headers },
    });
  };
}

/**
 * Create a timeout that rejects after specified milliseconds
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });
}

/**
 * Mock AbortSignal.timeout for testing
 */
export function mockAbortSignal(timeout: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
}

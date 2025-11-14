import { Value } from '@sinclair/typebox/value';
import type { TSchema } from '@sinclair/typebox';
import { ErrorResponseSchema } from '../types/common';

/**
 * HTTP Client Configuration
 */
export interface HttpClientConfig {
  baseUrl: string;
  apiVersion?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * HTTP Client Error
 */
export class HttpClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any,
    public shouldRetry: boolean = false,
    public retryAfter?: number // Milliseconds to wait before retry (for rate limits)
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: any[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * HTTP Client for GHL API
 * Handles all HTTP requests with built-in validation using TypeBox schemas
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly timeout: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl;
    this.apiVersion = config.apiVersion ?? '2021-07-28';
    this.timeout = config.timeout ?? 30000; // 30 seconds
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Version': this.apiVersion,
      ...config.headers,
    };
  }

  /**
   * Make an HTTP request with validation
   */
  async request<TResponse>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: {
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
      responseSchema?: TSchema;
      validateResponse?: boolean;
    } = {}
  ): Promise<TResponse> {
    const { body, query, headers, responseSchema, validateResponse = true } = options;

    // Build URL with query parameters
    const url = this.buildUrl(path, query);

    // Build headers
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Build request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.timeout),
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body);
    }

    try {
      // Make the request
      const response = await fetch(url, requestOptions);

      // Parse response
      const data = await this.parseResponse(response);

      // Validate response if schema provided
      if (validateResponse && responseSchema) {
        this.validateResponse(data, responseSchema);
      }

      return data as TResponse;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * GET request
   */
  async get<TResponse>(
    path: string,
    options?: {
      query?: Record<string, any>;
      headers?: Record<string, string>;
      responseSchema?: TSchema;
    }
  ): Promise<TResponse> {
    return this.request<TResponse>('GET', path, options);
  }

  /**
   * POST request
   */
  async post<TResponse>(
    path: string,
    options?: {
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
      responseSchema?: TSchema;
    }
  ): Promise<TResponse> {
    return this.request<TResponse>('POST', path, options);
  }

  /**
   * PUT request
   */
  async put<TResponse>(
    path: string,
    options?: {
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
      responseSchema?: TSchema;
    }
  ): Promise<TResponse> {
    return this.request<TResponse>('PUT', path, options);
  }

  /**
   * PATCH request
   */
  async patch<TResponse>(
    path: string,
    options?: {
      body?: any;
      query?: Record<string, any>;
      headers?: Record<string, string>;
      responseSchema?: TSchema;
    }
  ): Promise<TResponse> {
    return this.request<TResponse>('PATCH', path, options);
  }

  /**
   * DELETE request
   */
  async delete<TResponse>(
    path: string,
    options?: {
      query?: Record<string, any>;
      headers?: Record<string, string>;
      responseSchema?: TSchema;
    }
  ): Promise<TResponse> {
    return this.request<TResponse>('DELETE', path, options);
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, query?: Record<string, any>): string {
    const url = new URL(path, this.baseUrl);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    return url.toString();
  }

  /**
   * Parse response based on status code
   */
  private async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    // Handle successful responses
    if (response.ok) {
      if (isJson) {
        return await response.json();
      }
      return await response.text();
    }

    // Handle error responses
    let errorData: any;
    try {
      errorData = isJson ? await response.json() : await response.text();
    } catch {
      errorData = { message: 'Failed to parse error response' };
    }

    // Check if it's an auth error (don't retry)
    const isAuthError = response.status === 401 || response.status === 403;

    // Check if it's a rate limit error
    const isRateLimited = response.status === 429;
    let retryAfter: number | undefined;

    if (isRateLimited) {
      // Parse Retry-After header (can be in seconds or HTTP date)
      const retryAfterHeader = response.headers.get('Retry-After');
      if (retryAfterHeader) {
        // Try parsing as integer (seconds)
        const seconds = parseInt(retryAfterHeader, 10);
        if (!isNaN(seconds)) {
          retryAfter = seconds * 1000; // Convert to milliseconds
        } else {
          // Try parsing as HTTP date
          const retryDate = new Date(retryAfterHeader);
          if (!isNaN(retryDate.getTime())) {
            retryAfter = Math.max(0, retryDate.getTime() - Date.now());
          }
        }
      }
      // Default to 1 second if no Retry-After header
      if (!retryAfter) {
        retryAfter = 1000;
      }
    }

    // Throw HttpClientError
    throw new HttpClientError(
      errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData,
      !isAuthError && (response.status >= 500 || isRateLimited), // Retry on 5xx or 429
      retryAfter
    );
  }

  /**
   * Validate response against TypeBox schema
   */
  private validateResponse(data: any, schema: TSchema): void {
    const errors = [...Value.Errors(schema, data)];

    if (errors.length > 0) {
      throw new ValidationError(
        'Response validation failed',
        errors.map(err => ({
          path: err.path,
          message: err.message,
          value: err.value,
        }))
      );
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof HttpClientError || error instanceof ValidationError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return new HttpClientError('Request timeout', undefined, undefined, true);
      }
      return new HttpClientError(error.message);
    }

    return new HttpClientError('Unknown error occurred');
  }
}

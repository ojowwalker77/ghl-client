/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  exponentialBase: 2,
  shouldRetry: (error: any) => {
    // Retry on 5xx errors or network errors
    return error?.shouldRetry === true || error?.statusCode >= 500;
  },
  onRetry: () => {
    // No-op by default
  },
};

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  exponentialBase: number,
  maxDelay: number
): number {
  const delay = initialDelay * Math.pow(exponentialBase, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   async () => await someApiCall(),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelay,
    maxDelay,
    exponentialBase,
    shouldRetry,
    onRetry,
  } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // Wait before retry (skip on first attempt)
      if (attempt > 1) {
        const delay = calculateDelay(attempt - 1, initialDelay, exponentialBase, maxDelay);
        onRetry(lastError, attempt - 1, delay);
        await sleep(delay);
      }

      // Execute function
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === maxRetries + 1;
      if (isLastAttempt || !shouldRetry(error, attempt)) {
        throw error;
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retry wrapper function
 *
 * @example
 * ```ts
 * const retryableRequest = createRetryWrapper({ maxRetries: 3 });
 * const result = await retryableRequest(() => fetch('/api/data'));
 * ```
 */
export function createRetryWrapper(config: RetryConfig = {}) {
  return <T>(fn: () => Promise<T>): Promise<T> => {
    return withRetry(fn, config);
  };
}

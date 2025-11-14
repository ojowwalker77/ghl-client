import { describe, expect, test, mock } from 'bun:test';
import { withRetry, createRetryWrapper } from './retry';

describe('withRetry', () => {
  test('should succeed on first attempt', async () => {
    const fn = mock(async () => 'success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should retry and eventually succeed', async () => {
    let attempt = 0;
    const fn = mock(async () => {
      attempt++;
      if (attempt < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    });

    const result = await withRetry(fn, {
      maxRetries: 3,
      initialDelay: 10, // Short delay for tests
      shouldRetry: () => true,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('should throw error after max retries', async () => {
    const fn = mock(async () => {
      throw new Error('Permanent failure');
    });

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        initialDelay: 10,
        shouldRetry: () => true,
      })
    ).rejects.toThrow('Permanent failure');

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  test('should not retry when shouldRetry returns false', async () => {
    const fn = mock(async () => {
      throw new Error('Non-retryable error');
    });

    await expect(
      withRetry(fn, {
        maxRetries: 3,
        shouldRetry: () => false,
      })
    ).rejects.toThrow('Non-retryable error');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should respect shouldRetry based on error type', async () => {
    const fn = mock(async () => {
      const error: any = new Error('Server error');
      error.statusCode = 500;
      error.shouldRetry = true;
      throw error;
    });

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        initialDelay: 10,
      })
    ).rejects.toThrow('Server error');

    expect(fn).toHaveBeenCalledTimes(3); // Retries 5xx errors
  });

  test('should not retry auth errors by default', async () => {
    const fn = mock(async () => {
      const error: any = new Error('Unauthorized');
      error.statusCode = 401;
      error.shouldRetry = false;
      throw error;
    });

    await expect(
      withRetry(fn, {
        maxRetries: 3,
        initialDelay: 10,
      })
    ).rejects.toThrow('Unauthorized');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should call onRetry callback', async () => {
    let attempt = 0;
    const fn = mock(async () => {
      attempt++;
      if (attempt < 2) {
        throw new Error('Retry me');
      }
      return 'success';
    });

    const onRetry = mock((error: any, attemptNum: number, delay: number) => {
      expect(error.message).toBe('Retry me');
      expect(attemptNum).toBeGreaterThan(0);
      expect(delay).toBeGreaterThan(0);
    });

    await withRetry(fn, {
      maxRetries: 2,
      initialDelay: 10,
      shouldRetry: () => true,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('should calculate exponential backoff delay correctly', async () => {
    let attempt = 0;
    const fn = mock(async () => {
      attempt++;
      if (attempt < 4) {
        throw new Error('Keep trying');
      }
      return 'success';
    });

    const delays: number[] = [];
    const onRetry = mock((error: any, attemptNum: number, delay: number) => {
      delays.push(delay);
    });

    await withRetry(fn, {
      maxRetries: 3,
      initialDelay: 100,
      exponentialBase: 2,
      maxDelay: 1000,
      shouldRetry: () => true,
      onRetry,
    });

    // Expected delays: 100, 200, 400
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(400);
  });

  test('should respect maxDelay cap', async () => {
    let attempt = 0;
    const fn = mock(async () => {
      attempt++;
      if (attempt < 5) {
        throw new Error('Keep trying');
      }
      return 'success';
    });

    const delays: number[] = [];
    const onRetry = mock((error: any, attemptNum: number, delay: number) => {
      delays.push(delay);
    });

    await withRetry(fn, {
      maxRetries: 4,
      initialDelay: 100,
      exponentialBase: 2,
      maxDelay: 250, // Cap at 250ms
      shouldRetry: () => true,
      onRetry,
    });

    // Expected delays: 100, 200, 250 (capped), 250 (capped)
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(250); // Capped
    expect(delays[3]).toBe(250); // Capped
  });

  test('should handle custom shouldRetry logic', async () => {
    let attempt = 0;
    const fn = mock(async () => {
      attempt++;
      const error: any = new Error(`Attempt ${attempt}`);
      error.attempt = attempt;
      throw error;
    });

    const shouldRetry = mock((error: any, attemptNum: number) => {
      // Only retry if attempt number is less than 2
      return attemptNum < 2;
    });

    await expect(
      withRetry(fn, {
        maxRetries: 5,
        initialDelay: 10,
        shouldRetry,
      })
    ).rejects.toThrow('Attempt 2');

    expect(fn).toHaveBeenCalledTimes(2);
    expect(shouldRetry).toHaveBeenCalledTimes(2);
  });
});

describe('createRetryWrapper', () => {
  test('should create a reusable retry wrapper', async () => {
    const retryWrapper = createRetryWrapper({
      maxRetries: 2,
      initialDelay: 10,
      shouldRetry: () => true,
    });

    let attempt = 0;
    const fn = mock(async () => {
      attempt++;
      if (attempt < 2) {
        throw new Error('Retry');
      }
      return 'success';
    });

    const result = await retryWrapper(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('should work with different functions', async () => {
    const retryWrapper = createRetryWrapper({
      maxRetries: 1,
      initialDelay: 10,
    });

    const fn1 = mock(async () => 'result1');
    const fn2 = mock(async () => 'result2');

    const result1 = await retryWrapper(fn1);
    const result2 = await retryWrapper(fn2);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});

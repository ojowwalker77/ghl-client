/**
 * Logger interface for the GHL client
 * Allows users to provide their own logging implementation
 */
export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

/**
 * No-op logger (default) - doesn't log anything
 */
export class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

/**
 * Console logger - logs to console (useful for debugging)
 */
export class ConsoleLogger implements Logger {
  constructor(private readonly prefix: string = '[GHLClient]') {}

  debug(message: string, data?: any): void {
    if (data) {
      console.debug(`${this.prefix} ${message}`, data);
    } else {
      console.debug(`${this.prefix} ${message}`);
    }
  }

  info(message: string, data?: any): void {
    if (data) {
      console.info(`${this.prefix} ${message}`, data);
    } else {
      console.info(`${this.prefix} ${message}`);
    }
  }

  warn(message: string, data?: any): void {
    if (data) {
      console.warn(`${this.prefix} ${message}`, data);
    } else {
      console.warn(`${this.prefix} ${message}`);
    }
  }

  error(message: string, data?: any): void {
    if (data) {
      console.error(`${this.prefix} ${message}`, data);
    } else {
      console.error(`${this.prefix} ${message}`);
    }
  }
}

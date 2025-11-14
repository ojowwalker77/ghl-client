/**
 * Audit Event - Represents a logged operation
 */
export interface AuditEvent {
  /** Timestamp of the event */
  timestamp: Date;

  /** Type of operation */
  operation: AuditOperation;

  /** Resource type being operated on */
  resourceType: ResourceType;

  /** ID of the resource (if applicable) */
  resourceId?: string;

  /** Location ID where operation occurred */
  locationId?: string;

  /** User/client identifier performing the operation */
  actor?: string;

  /** Whether the operation succeeded */
  success: boolean;

  /** Error message if operation failed */
  error?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** IP address of the request (if available) */
  ipAddress?: string;

  /** User agent (if available) */
  userAgent?: string;
}

/**
 * Audit Operation Types
 */
export type AuditOperation =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'search'
  | 'list'
  | 'upsert'
  | 'auth'
  | 'token_refresh';

/**
 * Resource Types
 */
export type ResourceType =
  | 'contact'
  | 'opportunity'
  | 'user'
  | 'pipeline'
  | 'note'
  | 'auth_token';

/**
 * Audit Logger Interface
 * Implement this to create custom audit logging
 */
export interface AuditLogger {
  /**
   * Log an audit event
   */
  log(event: AuditEvent): void | Promise<void>;
}

/**
 * No-op audit logger (default) - doesn't log anything
 */
export class NoopAuditLogger implements AuditLogger {
  log(): void {}
}

/**
 * Console audit logger - logs to console (useful for debugging)
 * WARNING: Do not use in production - logs may contain PII
 */
export class ConsoleAuditLogger implements AuditLogger {
  log(event: AuditEvent): void {
    const { timestamp, operation, resourceType, resourceId, actor, success, error } = event;

    const message = `[AUDIT] ${timestamp.toISOString()} | ${actor || 'unknown'} | ${operation.toUpperCase()} ${resourceType}${resourceId ? ` [${resourceId}]` : ''} | ${success ? 'SUCCESS' : 'FAIL'}${error ? ` - ${error}` : ''}`;

    if (success) {
      console.info(message, event.metadata || '');
    } else {
      console.error(message, event.metadata || '');
    }
  }
}

/**
 * File audit logger - appends to a JSON file
 * Suitable for simple production logging (but consider a proper audit system)
 */
export class FileAuditLogger implements AuditLogger {
  constructor(
    private readonly filePath: string,
    private readonly fs: any // Pass in filesystem module
  ) {}

  async log(event: AuditEvent): Promise<void> {
    try {
      const logLine = JSON.stringify(event) + '\n';
      await this.fs.appendFile(this.filePath, logLine);
    } catch (error) {
      // Don't throw - audit logging failures shouldn't break the app
      console.error('[AUDIT] Failed to write audit log:', error);
    }
  }
}

/**
 * Buffer audit logger - collects events in memory for batch processing
 * Useful for sending audit logs to external systems
 */
export class BufferAuditLogger implements AuditLogger {
  private buffer: AuditEvent[] = [];
  private flushPromise?: Promise<void>;

  constructor(
    private readonly onFlush: (events: AuditEvent[]) => Promise<void>,
    private readonly maxBufferSize: number = 100,
    private readonly flushInterval: number = 60000 // 1 minute
  ) {
    // Auto-flush on interval
    setInterval(() => this.flush(), flushInterval);
  }

  log(event: AuditEvent): void {
    this.buffer.push(event);

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    // Prevent concurrent flushes
    if (this.flushPromise) {
      await this.flushPromise;
      return;
    }

    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    this.flushPromise = this.onFlush(eventsToFlush)
      .catch((error) => {
        // Don't throw - audit logging failures shouldn't break the app
        console.error('[AUDIT] Failed to flush audit logs:', error);
        // Put events back in buffer if flush failed
        this.buffer.unshift(...eventsToFlush);
      })
      .finally(() => {
        this.flushPromise = undefined;
      });

    await this.flushPromise;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }
}

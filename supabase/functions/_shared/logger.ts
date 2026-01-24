// Shared logging utility for edge functions
// Provides structured logging with request tracking and error monitoring

export interface LogContext {
  functionName: string;
  requestId: string;
  userId?: string;
  action?: string;
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get minimum log level from environment (default: info)
const MIN_LOG_LEVEL = (Deno.env.get('LOG_LEVEL') || 'info') as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(
  level: LogLevel,
  ctx: LogContext,
  message: string,
  data?: Record<string, unknown>
): string {
  const entry = {
    timestamp: formatTimestamp(),
    level: level.toUpperCase(),
    function: ctx.functionName,
    requestId: ctx.requestId,
    action: ctx.action,
    userId: ctx.userId,
    message,
    ...data,
  };
  
  // Remove undefined values
  Object.keys(entry).forEach(key => {
    if (entry[key as keyof typeof entry] === undefined) {
      delete entry[key as keyof typeof entry];
    }
  });
  
  return JSON.stringify(entry);
}

export class Logger {
  private ctx: LogContext;
  private startTime: number;

  constructor(functionName: string, requestId?: string) {
    this.ctx = {
      functionName,
      requestId: requestId || crypto.randomUUID().slice(0, 8),
    };
    this.startTime = Date.now();
  }

  setContext(updates: Partial<LogContext>): void {
    this.ctx = { ...this.ctx, ...updates };
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('debug')) {
      console.log(formatLogEntry('debug', this.ctx, message, data));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('info')) {
      console.log(formatLogEntry('info', this.ctx, message, data));
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (shouldLog('warn')) {
      console.warn(formatLogEntry('warn', this.ctx, message, data));
    }
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    if (shouldLog('error')) {
      const errorData: Record<string, unknown> = { ...data };
      
      if (error instanceof Error) {
        errorData.errorName = error.name;
        errorData.errorMessage = error.message;
        errorData.errorStack = error.stack?.split('\n').slice(0, 5).join('\n');
      } else if (error) {
        errorData.errorRaw = String(error);
      }
      
      console.error(formatLogEntry('error', this.ctx, message, errorData));
    }
  }

  // Log request start
  logRequest(method: string, body?: unknown): void {
    this.info('Request received', {
      method,
      bodyPreview: body ? JSON.stringify(body).slice(0, 500) : undefined,
    });
  }

  // Log response with duration
  logResponse(statusCode: number, body?: unknown): void {
    const duration = Date.now() - this.startTime;
    this.info('Response sent', {
      statusCode,
      durationMs: duration,
      bodyPreview: body ? JSON.stringify(body).slice(0, 500) : undefined,
    });
  }

  // Log external API call
  logExternalCall(service: string, endpoint: string, method: string = 'GET'): void {
    this.debug('External API call', { service, endpoint, method });
  }

  // Log external API response
  logExternalResponse(service: string, statusCode: number, success: boolean): void {
    const level = success ? 'debug' : 'warn';
    this[level]('External API response', { service, statusCode, success });
  }

  // Log database operation
  logDbOperation(operation: string, table: string, success: boolean, rowCount?: number): void {
    const level = success ? 'debug' : 'error';
    this[level]('Database operation', { operation, table, success, rowCount });
  }

  // Get elapsed time
  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  // Get request ID for response headers
  getRequestId(): string {
    return this.ctx.requestId;
  }
}

// Create logger instance for a function
export function createLogger(functionName: string, req?: Request): Logger {
  // Try to get request ID from header or generate one
  const requestId = req?.headers.get('x-request-id') || crypto.randomUUID().slice(0, 8);
  return new Logger(functionName, requestId);
}

// Wrap handler with automatic logging
export function withLogging(
  functionName: string,
  handler: (req: Request, log: Logger) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const log = createLogger(functionName, req);
    
    try {
      // Log request (but not for OPTIONS preflight)
      if (req.method !== 'OPTIONS') {
        let body: unknown;
        try {
          body = await req.clone().json();
        } catch {
          // Body might not be JSON
        }
        log.logRequest(req.method, body);
      }
      
      const response = await handler(req, log);
      
      // Log response
      if (req.method !== 'OPTIONS') {
        log.logResponse(response.status);
      }
      
      // Add request ID to response headers
      const headers = new Headers(response.headers);
      headers.set('x-request-id', log.getRequestId());
      
      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (error) {
      log.error('Unhandled error', error);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Internal server error',
          requestId: log.getRequestId(),
        }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'x-request-id': log.getRequestId(),
          } 
        }
      );
    }
  };
}
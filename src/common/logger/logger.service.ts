import { Injectable, Logger } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

@Injectable()
export class LoggerService extends Logger {
  log(message: string, context?: string) {
    super.log(message, context);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
  }

  /**
   * Log API request
   */
  logRequest(
    method: string,
    path: string,
    userId?: number,
    context = 'HTTP',
  ) {
    const message = `${method} ${path}${userId ? ` - User: ${userId}` : ''}`;
    this.log(message, context);
  }

  /**
   * Log API response
   */
  logResponse(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    context = 'HTTP',
  ) {
    const message = `${method} ${path} - Status: ${statusCode} - ${responseTime}ms`;
    this.log(message, context);
  }

  /**
   * Log database operation
   */
  logDatabase(operation: string, entity: string, details?: string) {
    const message = `${operation} ${entity}${details ? ` - ${details}` : ''}`;
    this.debug(message, 'Database');
  }

  /**
   * Log authentication event
   */
  logAuth(event: string, email: string, status: 'success' | 'failure') {
    const message = `${event} - ${email} - ${status.toUpperCase()}`;
    status === 'success' ? this.log(message, 'Auth') : this.warn(message, 'Auth');
  }

  /**
   * Log error with additional context
   */
  logError(
    error: Error | string,
    context?: string,
    additionalInfo?: Record<string, any>,
  ) {
    const errorMessage =
      typeof error === 'string' ? error : error.message || 'Unknown error';
    const errorTrace =
      typeof error === 'string' ? undefined : error.stack;

    const infoString = additionalInfo
      ? ` - ${JSON.stringify(additionalInfo)}`
      : '';
    const finalMessage = errorMessage + infoString;

    this.error(finalMessage, errorTrace, context);
  }
}

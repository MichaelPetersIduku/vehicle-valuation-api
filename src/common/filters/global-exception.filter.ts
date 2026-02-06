import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { IErrorResponse } from '../exceptions/app-error.exception';

/**
 * Global exception filter that catches all unhandled exceptions and formats them
 * into a consistent, production-grade error response structure.
 *
 * Handles:
 * - HttpException (custom AppException and NestJS HttpExceptions)
 * - Database errors (TypeORM EntityNotFoundError, QueryFailedError)
 * - Validation errors
 * - Unexpected runtime errors
 *
 * Error response format:
 * {
 *   statusCode: number,
 *   message: string,
 *   error: string,
 *   details?: unknown,
 *   timestamp: ISO string,
 *   path: request path
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggerService: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let error = 'INTERNAL_SERVER_ERROR';
    let details: unknown = undefined;

    // Handle HttpException (custom AppException and NestJS HttpExceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const errorObj = exceptionResponse as any;
        message = errorObj.message || exception.message || message;
        error = errorObj.error || this.getErrorTypeFromStatus(status);
        details = errorObj.details;
      } else {
        message = String(exceptionResponse);
      }
    }
    // Handle TypeORM EntityNotFoundError (similar to NotFoundException)
    else if (
      exception instanceof Error &&
      exception.name === 'EntityNotFoundError'
    ) {
      status = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
      error = 'NOT_FOUND';
    }
    // Handle TypeORM QueryFailedError (database constraint violations, etc.)
    else if (
      exception instanceof Error &&
      exception.name === 'QueryFailedError'
    ) {
      const dbError = exception as any;
      status = HttpStatus.BAD_REQUEST;
      message = this.getDatabaseErrorMessage(dbError);
      error = 'DATABASE_ERROR';
      details = {
        code: dbError.code,
        constraint: dbError.constraint,
      };
    }
    // Handle standard JavaScript errors
    else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message || 'Internal server error';
      error = exception.name || 'INTERNAL_SERVER_ERROR';

      // Include stack trace only in development
      if (process.env.NODE_ENV === 'development') {
        details = {
          stack: exception.stack,
        };
      }
    }
    // Fallback for unknown error types
    else {
      message = String(exception) || 'An unexpected error occurred';
    }

    // Ensure 5xx errors include proper logging
    if (status >= 500) {
      this.loggerService.logError(exception as Error, 'GlobalExceptionFilter', {
        statusCode: status,
        path: request.url,
        method: request.method,
        userId: request.user?.id,
        error,
      });
    } else if (status >= 400) {
      // Log client errors at warn level
      this.loggerService.warn(
        `Client error [${status}] - ${message}`,
        'GlobalExceptionFilter',
      );
    }

    // Build consistent error response
    const errorResponse: IErrorResponse = {
      statusCode: status,
      message,
      error,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Extract user-friendly message from database errors
   */
  private getDatabaseErrorMessage(error: any): string {
    // Foreign key constraint violation
    if (
      error.code === 'ER_NO_REFERENCED_ROW' ||
      error.code === 'FOREIGN_KEY_CONSTRAINT_FAILS'
    ) {
      return 'Invalid reference: the referenced resource does not exist';
    }

    // Duplicate key constraint violation
    if (
      error.code === 'ER_DUP_ENTRY' ||
      error.code === 'UNIQUE_CONSTRAINT_FAILS'
    ) {
      return 'This resource already exists (duplicate entry)';
    }

    // Not null constraint violation
    if (
      error.code === 'ER_BAD_NULL_ERROR' ||
      error.code === 'NOT_NULL_CONSTRAINT_FAILS'
    ) {
      return 'Required field is missing';
    }

    // Default database error message
    return 'Database operation failed';
  }

  /**
   * Get human-readable error type from HTTP status code
   */
  private getErrorTypeFromStatus(status: number): string {
    const errorMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return errorMap[status] || 'UNKNOWN_ERROR';
  }
}

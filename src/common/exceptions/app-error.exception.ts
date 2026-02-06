import { HttpException, HttpStatus } from '@nestjs/common';

export interface IErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  details?: unknown;
  timestamp?: string;
  path?: string;
}

/**
 * Base application exception class for custom error handling
 * Supports both 400 (client) and 500 (server) error scenarios
 */
export class AppException extends HttpException {
  constructor(
    statusCode: HttpStatus,
    message: string,
    error?: string,
    details?: unknown,
  ) {
    const response: IErrorResponse = {
      statusCode,
      message,
      ...(error && { error }),
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    };

    super(response, statusCode);
  }
}

/**
 * 400 Bad Request - Client-side errors (validation, bad input, duplicate resources, etc.)
 * Use this when the client sends invalid or malformed data
 */
export class BadRequestException extends AppException {
  constructor(message: string, details?: unknown) {
    super(HttpStatus.BAD_REQUEST, message, 'BAD_REQUEST', details);
  }
}

/**
 * 401 Unauthorized - Authentication failed
 * Use this when the user cannot be authenticated
 */
export class UnauthorizedException extends AppException {
  constructor(message: string = 'Unauthorized', details?: unknown) {
    super(HttpStatus.UNAUTHORIZED, message, 'UNAUTHORIZED', details);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 * Use this when the user lacks permissions to access a resource
 */
export class ForbiddenException extends AppException {
  constructor(message: string = 'Forbidden', details?: unknown) {
    super(HttpStatus.FORBIDDEN, message, 'FORBIDDEN', details);
  }
}

/**
 * 404 Not Found - Resource does not exist
 * Use this when a requested resource cannot be found
 */
export class NotFoundException extends AppException {
  constructor(message: string, details?: unknown) {
    super(HttpStatus.NOT_FOUND, message, 'NOT_FOUND', details);
  }
}

/**
 * 409 Conflict - Resource conflict (duplicate, outdated, etc.)
 * Use this for conflicts like duplicate entries or version mismatch
 */
export class ConflictException extends AppException {
  constructor(message: string, details?: unknown) {
    super(HttpStatus.CONFLICT, message, 'CONFLICT', details);
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 * Use this for detailed validation errors
 */
export class UnprocessableEntityException extends AppException {
  constructor(message: string, details?: unknown) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      message,
      'UNPROCESSABLE_ENTITY',
      details,
    );
  }
}

/**
 * 500 Internal Server Error - Server-side errors (unexpected failures)
 * Use this for unexpected server errors, database failures, etc.
 */
export class InternalServerErrorException extends AppException {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super(
      HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      'INTERNAL_SERVER_ERROR',
      details,
    );
  }
}

/**
 * 503 Service Unavailable - Service temporarily unavailable
 * Use this when external services are down or the server is overloaded
 */
export class ServiceUnavailableException extends AppException {
  constructor(message: string = 'Service unavailable', details?: unknown) {
    super(
      HttpStatus.SERVICE_UNAVAILABLE,
      message,
      'SERVICE_UNAVAILABLE',
      details,
    );
  }
}

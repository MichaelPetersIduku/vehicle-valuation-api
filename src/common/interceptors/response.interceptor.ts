import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Production-grade response interceptor that formats successful HTTP responses
 * into a consistent structure. Handles all 2xx status codes and ensures
 * consistent response format across the entire application.
 *
 * Response format:
 * {
 *   statusCode: number,
 *   message: string,
 *   timestamp: ISO string,
 *   path: request path,
 *   data: response data (null for 204 No Content)
 * }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  /**
   * Message mappings for different HTTP status codes
   */
  private readonly statusMessages: Record<number, string> = {
    [HttpStatus.OK]: 'success',
    [HttpStatus.CREATED]: 'resource created successfully',
    [HttpStatus.ACCEPTED]: 'request accepted',
    [HttpStatus.NO_CONTENT]: 'no content',
    [HttpStatus.PARTIAL_CONTENT]: 'partial content',
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      // Ensure errors are re-thrown so global exception filter can handle them
      catchError((err) => {
        const duration = Date.now() - startTime;
        console.error(
          `[ERROR] ${request.method} ${request.url} - ${duration}ms`,
        );
        return throwError(() => err);
      }),
      map((data) => {
        const status = response.statusCode || HttpStatus.OK;
        const duration = Date.now() - startTime;

        // If a status code indicates an error, don't wrap the body
        // This should not happen in normal flow due to exception filter,
        // but keeping for safety
        if (status >= 400) {
          return data;
        }

        // Default message for the status code
        let message = this.statusMessages[status] || 'success';

        // Allow services to return a custom message. Supported response shapes:
        // { message: 'text', data: any }
        // { message: 'text', ...otherFields }
        // If `message` exists, prefer it and set payload to `data` if provided,
        // otherwise use remaining object fields as the payload.
        let payload: any = data ?? null;
        if (data && typeof data === 'object' && 'message' in data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const asAny = data as any;
          message = asAny.message || message;

          if ('data' in asAny) {
            payload = asAny.data ?? null;
          } else {
            // remove message field and use the rest as payload
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { message: _m, ...rest } = asAny;
            payload = Object.keys(rest).length === 0 ? null : rest;
          }
        }

        // Log successful request
        console.log(
          `[${status}] ${request.method} ${request.url} - ${duration}ms`,
        );

        return {
          statusCode: status,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
          data: status === HttpStatus.NO_CONTENT ? null : payload,
        };
      }),
    );
  }
}

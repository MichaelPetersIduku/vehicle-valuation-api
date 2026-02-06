import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

/**
 * Interceptor to log external API calls
 */
@Injectable()
export class ExternalApiInterceptor implements NestInterceptor {
  constructor(private loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(
        (data) => {
          const duration = Date.now() - startTime;
          this.loggerService.log(
            `External API call completed - ${request.method} ${request.url} - ${duration}ms`,
            'ExternalApiInterceptor',
          );
        },
        (error) => {
          const duration = Date.now() - startTime;
          this.loggerService.warn(
            `External API call failed - ${request.method} ${request.url} - ${duration}ms`,
            'ExternalApiInterceptor',
          );
        },
      ),
    );
  }
}

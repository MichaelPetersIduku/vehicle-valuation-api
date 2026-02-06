import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const user = (req as any).user;
    const start = Date.now();

    // Log incoming request
    this.loggerService.logRequest(method, originalUrl, user?.id, 'Request');

    // Log response
    const originalSend = res.send.bind(res);
    res.send = function (this: Response, data: any) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;

      // if (statusCode >= 400) {
      //   this.loggerService.warn(
      //     `${method} ${originalUrl} - Status: ${statusCode} - ${duration}ms`,
      //     'Response',
      //   );
      // } else {
      //   this.loggerService.logResponse(
      //     method,
      //     originalUrl,
      //     statusCode,
      //     duration,
      //     'Response',
      //   );
      // }

      return originalSend(data);
    };

    next();
  }
}

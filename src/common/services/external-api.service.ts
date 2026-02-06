import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { LoggerService } from '../logger/logger.service';

export interface ApiCallConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

@Injectable()
export class ExternalApiService {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_RETRIES = 3;

  constructor(
    private readonly httpService: HttpService,
    private loggerService: LoggerService,
  ) {}

  /**
   * Make GET request to external API
   */
  get<T = any>(
    url: string,
    config?: ApiCallConfig,
  ): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('GET', url, undefined, config);
  }

  /**
   * Make POST request to external API
   */
  post<T = any>(
    url: string,
    data?: any,
    config?: ApiCallConfig,
  ): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('POST', url, data, config);
  }

  /**
   * Make PUT request to external API
   */
  put<T = any>(
    url: string,
    data?: any,
    config?: ApiCallConfig,
  ): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', url, data, config);
  }

  /**
   * Make PATCH request to external API
   */
  patch<T = any>(
    url: string,
    data?: any,
    config?: ApiCallConfig,
  ): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', url, data, config);
  }

  /**
   * Make DELETE request to external API
   */
  delete<T = any>(
    url: string,
    config?: ApiCallConfig,
  ): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', url, undefined, config);
  }

  /**
   * Core method to make HTTP requests with retry logic and error handling
   */
  private makeRequest<T = any>(
    method: string,
    url: string,
    data?: any,
    config?: ApiCallConfig,
  ): Observable<ApiResponse<T>> {
    const timeoutMs = config?.timeout || this.DEFAULT_TIMEOUT;
    const retries = config?.retries ?? this.DEFAULT_RETRIES;

    this.loggerService.debug(
      `Making ${method} request to ${url}`,
      'ExternalApiService.makeRequest',
    );

    let request$: Observable<AxiosResponse<T>>;

    switch (method.toUpperCase()) {
      case 'GET':
        request$ = this.httpService.get<T>(url, {
          headers: config?.headers,
        });
        break;
      case 'POST':
        request$ = this.httpService.post<T>(url, data, {
          headers: config?.headers,
        });
        break;
      case 'PUT':
        request$ = this.httpService.put<T>(url, data, {
          headers: config?.headers,
        });
        break;
      case 'PATCH':
        request$ = this.httpService.patch<T>(url, data, {
          headers: config?.headers,
        });
        break;
      case 'DELETE':
        request$ = this.httpService.delete<T>(url, {
          headers: config?.headers,
        });
        break;
      default:
        return throwError(
          () =>
            new HttpException(
              `Unsupported HTTP method: ${method}`,
              HttpStatus.BAD_REQUEST,
            ),
        );
    }

    return request$.pipe(
      timeout(timeoutMs),
      retry({
        count: retries,
        delay: (error, retryCount) => {
          const delayMs = Math.pow(2, retryCount) * 1000; // Exponential backoff
          this.loggerService.warn(
            `Retry attempt ${
              retryCount + 1
            }/${retries} for ${method} ${url} after ${delayMs}ms`,
            'ExternalApiService.makeRequest',
          );
          return new Promise((resolve) => setTimeout(resolve, delayMs));
        },
      }),
      catchError((error) => {
        this.handleError(error, method, url);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Handle and format API errors
   */
  private handleError(error: AxiosError | any, method: string, url: string) {
    const errorInfo = {
      method,
      url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
    };

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      this.loggerService.logError(
        new Error(`External API error: ${method} ${url} returned ${status}`),
        'ExternalApiService.handleError',
        errorInfo,
      );

      throw new HttpException(
        {
          statusCode: status,
          message: `External API error: ${error.response.statusText}`,
          details: data,
        },
        status,
      );
    } else if (error.request) {
      // Request made but no response received
      this.loggerService.logError(
        new Error(`No response from external API: ${method} ${url}`),
        'ExternalApiService.handleError',
        errorInfo,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'External API did not respond',
        },
        HttpStatus.BAD_GATEWAY,
      );
    } else {
      // Error in request setup
      this.loggerService.logError(
        error,
        'ExternalApiService.handleError',
        errorInfo,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to call external API',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

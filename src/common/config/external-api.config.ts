import { Injectable } from '@nestjs/common';

/**
 * Configuration for external API calls
 */
@Injectable()
export class ExternalApiConfig {
  readonly defaultTimeout = parseInt(
    process.env.EXTERNAL_API_TIMEOUT || '10000',
    10,
  );
  readonly defaultRetries = parseInt(
    process.env.EXTERNAL_API_RETRIES || '3',
    10,
  );
  readonly jsonPlaceholderUrl =
    process.env.JSONPLACEHOLDER_URL || 'https://jsonplaceholder.typicode.com';
  readonly apiKey = process.env.EXTERNAL_API_KEY;
}

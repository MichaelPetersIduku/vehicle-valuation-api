import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LoggerService } from './logger/logger.service';
import { ExternalApiService } from './services/external-api.service';
import { ExternalApiConfig } from './config/external-api.config';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [LoggerService, ExternalApiService, ExternalApiConfig],
  exports: [LoggerService, ExternalApiService, ExternalApiConfig, HttpModule],
})
export class CommonModule {}

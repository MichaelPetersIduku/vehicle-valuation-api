import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ExternalApiService, ApiCallConfig } from './external-api.service';
import { LoggerService } from '../logger/logger.service';

/**
 * Rapid API service
 * This service handles interactions with the RapidAPI platform to fetch vehicle data
 */
@Injectable()
export class RapidApiService {
  private readonly timeout = 15000;

  constructor(
    private externalApiService: ExternalApiService,
    private configService: ConfigService,
    private loggerService: LoggerService,
  ) {}

  /**
   * Get vehicle data by VIN
   */
  async getVehicleData(vin: string) {
    try {
      const config: ApiCallConfig = {
        timeout: this.timeout,
        retries: 2,
        headers: {
          'X-RapidAPI-Key': this.configService.get('RAPID_API_KEY'),
          'X-RapidAPI-Host': 'vin-lookup2.p.rapidapi.com',
        },
      };

      const response = await firstValueFrom(
        this.externalApiService.get(
          `${this.configService.get(
            'RAPID_API_URL',
          )}/vehicle-lookup?vin=${vin}`,
          config,
        ),
      );

      this.loggerService.log(
        `Successfully fetched vehicle data for VIN ${vin}`,
        'RapidApiService.getVehicleData',
      );

      return response.data;
    } catch (error) {
      this.loggerService.logError(
        error as Error,
        'RapidApiService.getVehicleData',
        { vin },
      );
      throw error;
    }
  }
}

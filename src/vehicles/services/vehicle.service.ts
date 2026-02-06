import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '../../common/logger/logger.service';
import { Vehicle } from '../entities/vehicle.entity';
import { RapidApiService } from 'src/common/services/rapid-api.service';
import { VehicleDataIngestionDto } from '../dto/vehicle.dto';
import { MileageHistory } from '../entities/mileage_history.entity';
import { isObjectEmpty } from 'src/utils/utility';
import { Valuation } from '../entities/valuation.entity';
import { IMarketValue } from '../interfaces/market_value.interface';

@Injectable()
export class VehicleService {
  USD_TO_NGN = 1500; // TODO: This should ideally come from a currency conversion service
  constructor(
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(MileageHistory)
    private mileageHistoryRepository: Repository<MileageHistory>,
    @InjectRepository(Valuation)
    private valuationRepository: Repository<Valuation>,
    private loggerService: LoggerService,
    private rapidApiService: RapidApiService,
  ) {}

  async getVehicleData(vin: string) {
    try {
      // Check database if vehicle data for the given VIN already exists
      const existingVehicle = await this.vehicleRepository.findOne({
        where: { vin },
      });

      if (existingVehicle) {
        this.loggerService.log(
          `Vehicle data already exists for VIN: ${vin}`,
          'VehicleService.getVehicleData',
        );
        return existingVehicle;
      }

      // If it does not exist, fetch data from external RapidAPI and save it to the database
      const vehicleData = await this.rapidApiService.getVehicleData(vin);
      if (isObjectEmpty(vehicleData))
        throw new NotFoundException(`No vehicle data found for VIN: ${vin}`);
      const newVehicle = this.vehicleRepository.create({
        vin: vin,
        make: vehicleData.make,
        model: vehicleData.model,
        year: vehicleData.year,
        mileageAdjustment: vehicleData.mileage_adjustment,
        mileage: vehicleData.mileage,
        trim: vehicleData.trim,
        weight: vehicleData.weight,
      });
      const savedVehicle = await this.vehicleRepository.save(newVehicle);

      this.loggerService.log(
        `Fetched and saved new vehicle data for VIN: ${vin}`,
        'VehicleService.getVehicleData',
      );

      return savedVehicle;
      // Return the newly saved data
    } catch (error) {
      this.loggerService.logError(
        error as Error,
        'VehicleService.getVehicleData',
        {
          vin: vin,
        },
      );
      throw error;
    }
  }

  async ingestVehicleData(vehicleData: VehicleDataIngestionDto) {
    try {
      // Check if vehicle data for the given VIN already exists
      const existingVehicle = await this.vehicleRepository.findOne({
        where: { vin: vehicleData.vin },
      });

      let isAnomalous = false;
      // If it exists
      if (existingVehicle) {
        // Update the mileage (only if the new mileage is higher than the existing mileage)
        if (vehicleData.mileage >= existingVehicle.mileage) {
          existingVehicle.mileage = vehicleData.mileage;
          // TODO: Update other fields based on requirements
          await this.vehicleRepository.save(existingVehicle);
        } else {
          isAnomalous = true;
          this.loggerService.log(
            `Received mileage (${vehicleData.mileage}) is not higher than existing mileage (${existingVehicle.mileage}) for VIN: ${vehicleData.vin}. Mileage not updated.`,
            'VehicleService.ingestVehicleData',
          );
        }

        // Save the new mileage to the mileage history table and also check for anomaly
        const mileageHistory = this.mileageHistoryRepository.create({
          vehicle: existingVehicle,
          mileage: vehicleData.mileage,
          isAnomalous,
        });
        await this.mileageHistoryRepository.save(mileageHistory);
        if (isAnomalous)
          throw new BadRequestException(
            `Received mileage (${vehicleData.mileage}) is less than existing mileage for VIN: ${vehicleData.vin}. Mileage not updated.`,
          );
        return existingVehicle;
      } else {
        // If it does not exist call rapid api to fetch the data and save it to the database
        const fetchedVehicle = await this.rapidApiService.getVehicleData(
          vehicleData.vin,
        );

        const vehicle = this.vehicleRepository.create({
          vin: vehicleData.vin,
          make: fetchedVehicle.make || vehicleData.make,
          model: fetchedVehicle.model || vehicleData.model,
          year: fetchedVehicle.year || vehicleData.year,
          mileage: vehicleData.mileage,
          mileageAdjustment: fetchedVehicle.mileage_adjustment,
          trim: fetchedVehicle.trim || vehicleData.trim,
          weight: fetchedVehicle.weight || vehicleData.weight,
        });
        await this.vehicleRepository.save(vehicle);

        // Save the new mileage to the mileage history table and also check for anomaly
        const mileageHistory = this.mileageHistoryRepository.create({
          vehicle: vehicle,
          mileage: vehicleData.mileage,
          isAnomalous: false,
        });
        await this.mileageHistoryRepository.save(mileageHistory);
        return vehicle;
      }
    } catch (error) {
      this.loggerService.logError(
        error as Error,
        'VehicleService.ingestVehicleData',
        {
          vin: vehicleData.vin,
        },
      );
      throw error;
    }
  }

  async vehicleValuation(vin: string) {
    try {
      let vehicle = await this.vehicleRepository.findOne({
        where: { vin },
      });

      if (!vehicle) vehicle = await this.getVehicleData(vin); // This will fetch from RapidAPI and save to DB if not found

      // Check the database for existing valuation for the vehicle
      const existingValuation = await this.valuationRepository.findOne({
        where: { vehicle: { id: vehicle.id } },
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      // If a recent valuation exists (e.g., within the last 30 days), return it
      if (existingValuation) {
        const valuationAgeInDays =
          (new Date().getTime() - existingValuation.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        if (valuationAgeInDays <= 30) {
          this.loggerService.log(
            `Returning existing valuation for VIN ${vin} (age: ${valuationAgeInDays.toFixed(
              2,
            )} days)`,
            'VehicleService.vehicleValuation',
          );
          return existingValuation;
        }
      }

      const marketValueResponse = await this.rapidApiService.getVehicleData(
        vin,
      );

      const marketValueData: IMarketValue = {
        loanValue: marketValueResponse.loan_value,
        mileageAdjustment: marketValueResponse.mileage_adjustment,
        adjustedTradeInValue: marketValueResponse.adjusted_trade_in_value,
        averageTradeIn: marketValueResponse.average_trade_in,
      };

      const marketValue = this.calculateMarketValue(marketValueData);
      const adjustedMarketValue = this.applyRiskAdjustments(
        vehicle,
        marketValue,
      );

      // Save valuation to the database
      const valuation = this.valuationRepository.create({
        vehicle,
        estimatedValue: adjustedMarketValue,
        provider: 'RapidAPI',
      });
      await this.valuationRepository.save(valuation);
      return valuation;
    } catch (error) {
      this.loggerService.logError(
        error as Error,
        'VehicleService.vehicleValuation',
        {
          vin: vin,
        },
      );
      throw error;
    }
  }

  private calculateMarketValue(data: IMarketValue) {
    let usdValue: number;

    if (data.loanValue) {
      usdValue = data.loanValue + (data.mileageAdjustment || 0);
    } else if (data.adjustedTradeInValue) {
      usdValue = data.adjustedTradeInValue;
    } else if (data.averageTradeIn) {
      usdValue = data.averageTradeIn;
    } else {
      throw new Error('No valuation fields available');
    }

    return Math.round(usdValue * this.USD_TO_NGN);
  }

  // This function applies risk adjustments to the market value based on factors like age and mileage
  private applyRiskAdjustments(vehicle: Vehicle, marketValue: number) {
    let adjusted = marketValue;

    // Age penalty
    const age = new Date().getFullYear() - vehicle.year;
    adjusted -= marketValue * Math.min(age * 0.03, 0.3); // Max 30% depreciation for age

    // Mileage penalty (if available)
    if (vehicle.mileage) {
      adjusted -= marketValue * Math.min(vehicle.mileage / 200000, 0.2); // Max 20% depreciation for mileage
    }

    // Absolute floor
    return Math.max(Math.round(adjusted), 1500000); // Minimum value of 1.5 million NGN for any vehicle.
  }
}

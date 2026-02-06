import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleService } from './services/vehicle.service';
import { VehicleController } from './controllers/vehicle.controller';
import { RapidApiService } from 'src/common/services/rapid-api.service';
import { MileageHistory } from './entities/mileage_history.entity';
import { Valuation } from './entities/valuation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, MileageHistory, Valuation]),
    CommonModule,
  ],
  controllers: [VehicleController],
  providers: [VehicleService, RapidApiService],
  exports: [VehicleService],
})
export class VehicleModule {}

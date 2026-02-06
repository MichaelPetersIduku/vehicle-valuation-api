import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../common/common.module';
import { Loan } from './entities/loan.entity';
import { Offer } from './entities/offer.entity';
import { LoanController } from './controllers/loan.controller';
import { LoanService } from './services/loan.service';
import { Vehicle } from 'src/vehicles/entities/vehicle.entity';
import { VehicleService } from 'src/vehicles/services/vehicle.service';
import { MileageHistory } from 'src/vehicles/entities/mileage_history.entity';
import { Valuation } from 'src/vehicles/entities/valuation.entity';
import { RapidApiService } from 'src/common/services/rapid-api.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, Offer, Vehicle, MileageHistory, Valuation]),
    CommonModule,
  ],
  controllers: [LoanController],
  providers: [LoanService, VehicleService, RapidApiService],
  exports: [LoanService],
})
export class LoansModule {}

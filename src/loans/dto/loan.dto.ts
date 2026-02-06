import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { LoanStatus } from '../entities/loan.entity';
import { VehicleDto } from 'src/vehicles/dto/vehicle.dto';

export class LoanRequestDto {
  @Type(() => Number)
  @IsNumber()
  vehicleId: number;

  @Type(() => Number)
  @IsNumber()
  requestedAmount: number;

  @IsString()
  @IsNotEmpty()
  applicantName: string;

  @IsEmail()
  applicantEmail: string;

  @Type(() => Number)
  @IsNumber()
  monthlyIncome: number;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class LoanResponseDto {
  loanId: number;
  status: LoanStatus;
  requestedAmount: number;
  applicantName: string;
  applicantEmail: string;
  monthlyIncome: number;
  vehicle: VehicleDto;
}

export class LoanOfferDto {
  offerId: number;
  loanId: number;
  offerType: string;
  interestRate: number;
  monthlyPayment: number;
  tenureMonths: number;
  totalInterest: number;
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { VehicleService } from '../services/vehicle.service';
import {
  DefaultColumnsResponse,
  VehicleDataIngestionDto,
} from '../dto/vehicle.dto';
import { Valuation } from '../entities/valuation.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from 'src/auth/models/roles.model';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @ApiOperation({
    summary: 'Vehicle data retrieval',
    description:
      'Fetches and stores vehicle data based on the provided VIN. This endpoint is public and does not require authentication.',
  })
  @ApiOkResponse({
    status: 200,
    type: DefaultColumnsResponse,
    description: 'Vehicle data successfully retrieved',
  })
  @ApiBadRequestResponse({ description: 'Invalid VIN provided' })
  @Public()
  @Get(':vin')
  getVehicleData(@Param('vin') vin: string) {
    return this.vehicleService.getVehicleData(vin);
  }

  @ApiOperation({
    summary: 'Vehicle data ingestion',
    description:
      'Ingests vehicle data based on the provided VIN. This endpoint is only for admin users and requires authentication.',
  })
  @ApiCreatedResponse({
    status: 201,
    type: 'Vehicle data successfully ingested',
  })
  @ApiBadRequestResponse({ description: 'Invalid data provided' })
  @Post('ingest')
  @Roles(Role.ADMIN)
  ingestVehicleData(@Body() vehicleDataIngestionDto: VehicleDataIngestionDto) {
    return this.vehicleService.ingestVehicleData(vehicleDataIngestionDto);
  }

  @ApiOperation({
    summary: 'Vehicle valuation',
    description: 'Gets the current valuation of a vehicle',
  })
  @ApiOkResponse({
    status: 200,
    type: Valuation,
    description: 'Vehicle valuation successfully retrieved',
  })
  @ApiBadRequestResponse({ description: 'Invalid VIN provided' })
  @Public()
  @Get('/valuation/:vin')
  getVehicleValuation(@Param('vin') vin: string) {
    return this.vehicleService.vehicleValuation(vin);
  }
}

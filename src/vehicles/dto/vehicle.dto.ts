import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class VehicleDto {
  @ApiProperty({
    description: 'Vehicle identification number',
    example: '1HGBH41JXMN109186',
  })
  @IsString()
  @IsNotEmpty()
  readonly vin: string;

  @ApiProperty({
    description: 'Vehicle make',
    example: 'Toyota',
  })
  @IsString()
  @IsNotEmpty()
  readonly make: string;

  @ApiProperty({
    description: 'Vehicle model',
    example: 'Camry',
  })
  @IsString()
  @IsNotEmpty()
  readonly model: string;

  @ApiProperty({
    description: 'Vehicle manufacturing year',
    example: '2020',
  })
  @IsString()
  @IsNotEmpty()
  readonly year: string;

  @ApiProperty({
    description: 'Vehicle mileage',
    example: '30000',
  })
  @IsNumber()
  readonly mileage: number;

  @ApiProperty({
    description: 'Vehicle weight',
    example: '3500',
  })
  @IsString()
  readonly weight: string;

  @ApiProperty({
    description: 'Vehicle trim',
    example: 'LE',
  })
  @IsString()
  @IsNotEmpty()
  readonly trim: string;
}

export class VehicleDataIngestionDto extends PartialType(VehicleDto) {
  @ApiProperty({
    description: 'Vehicle vin',
    example: '1HGBH41JXMN109186',
  })
  @IsString()
  @IsNotEmpty()
  readonly vin: string;
}

export class DefaultColumnsResponse extends VehicleDto {
  @ApiProperty({
    description: 'Vehicle ID',
    example: 1,
  })
  readonly id: number;

  @ApiProperty({
    description: 'Vehicle creation timestamp',
    example: '2024-02-03T10:35:13.000Z',
  })
  readonly createdAt: Date;

  @ApiProperty({
    description: 'Vehicle last update timestamp',
    example: '2024-02-03T10:35:13.000Z',
  })
  readonly updatedAt: Date;
}

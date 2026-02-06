import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '../../auth/models/roles.model';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsString()
  @IsEmail()
  readonly email: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
  })
  @IsString()
  @IsNotEmpty()
  readonly password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  readonly firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  readonly lastName: string;
}

export class CreateAdminDto extends CreateUserDto {
  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.ADMIN,
  })
  @IsEnum(Role)
  readonly role: Role;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class DefaultColumnsResponse extends CreateUserDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  readonly id: number;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-02-03T10:35:13.000Z',
  })
  readonly createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2024-02-03T10:35:13.000Z',
  })
  readonly updatedAt: Date;

  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.CUSTOMER,
  })
  readonly role: Role;
}

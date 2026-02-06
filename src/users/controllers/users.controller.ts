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
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../auth/models/roles.model';
import {
  CreateAdminDto,
  CreateUserDto,
  DefaultColumnsResponse,
  UpdateUserDto,
} from '../dto/create-user.dto';
import { UsersService } from '../services/users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Create a new user with customer role',
    description:
      'Creates a new user account with the customer role. This endpoint is public and does not require authentication.',
  })
  @ApiCreatedResponse({
    status: 201,
    type: DefaultColumnsResponse,
    description: 'User successfully created',
  })
  @ApiBadRequestResponse({ description: 'Invalid user data provided' })
  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @ApiOperation({
    summary: 'Create a new user with admin role',
    description:
      'Creates a new user account with the specified role. Only admin users can access this endpoint.',
  })
  @ApiCreatedResponse({
    status: 201,
    type: DefaultColumnsResponse,
    description: 'Admin user successfully created',
  })
  @ApiBadRequestResponse({ description: 'Invalid user data provided' })
  @ApiUnauthorizedResponse({ description: 'No valid JWT token provided' })
  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Post('admin')
  createAdmin(@Body() creatAdminDto: CreateAdminDto) {
    return this.usersService.create(creatAdminDto);
  }

  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieves a list of all users in the system. Only admin users can access this endpoint.',
  })
  @ApiOkResponse({
    status: 200,
    isArray: true,
    type: DefaultColumnsResponse,
    description: 'List of all users',
  })
  @ApiUnauthorizedResponse({ description: 'No valid JWT token provided' })
  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({
    summary: 'Get a user by ID',
    description:
      'Retrieves a specific user by their ID. Only admin users can access this endpoint.',
  })
  @ApiOkResponse({
    status: 200,
    type: DefaultColumnsResponse,
    description: 'User found',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'No valid JWT token provided' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @ApiOperation({
    summary: 'Update a user',
    description:
      'Updates a specific user by their ID. Only admin users can access this endpoint.',
  })
  @ApiOkResponse({
    status: 200,
    type: DefaultColumnsResponse,
    description: 'User successfully updated',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid user data provided' })
  @ApiUnauthorizedResponse({ description: 'No valid JWT token provided' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Deletes a specific user by their ID. Only admin users can access this endpoint.',
  })
  @ApiOkResponse({
    status: 200,
    description: 'User successfully deleted',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'No valid JWT token provided' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}

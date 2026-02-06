import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { LoggerService } from '../../common/logger/logger.service';
import {
  CreateAdminDto,
  CreateUserDto,
  UpdateUserDto,
} from '../dto/create-user.dto';
import { User } from '../entities/user.entity';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '../../common/exceptions/app-error.exception';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private loggerService: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto | CreateAdminDto) {
    try {
      const user = await this.userRepository.findOne({
        email: createUserDto.email,
      });

      if (user) {
        this.loggerService.warn(
          `Attempt to create duplicate user: ${createUserDto.email}`,
          'UsersService.create',
        );
        throw new ConflictException(
          'User already exists with this email address',
          { email: createUserDto.email },
        );
      }

      const createdUser = await this.userRepository.create(createUserDto);
      const saveUser = await this.userRepository.save(createdUser);
      delete saveUser.password;
      delete saveUser.refreshToken;

      this.loggerService.logDatabase('Create', 'User', `Email: ${saveUser.id}`);
      this.loggerService.log(
        `User created successfully - Email: ${createUserDto.email}`,
        'UsersService.create',
      );

      return saveUser;
    } catch (error) {
      // Re-throw custom exceptions as-is
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(error as Error, 'UsersService.create', {
        email: createUserDto.email,
      });

      throw new InternalServerErrorException(
        'Failed to create user. Please try again later.',
        { originalError: (error as Error).message },
      );
    }
  }

  async findAll() {
    try {
      const users = await this.userRepository.find();
      this.loggerService.logDatabase(
        'Find All',
        'User',
        `Count: ${users.length}`,
      );
      return users;
    } catch (error) {
      this.loggerService.logError(error as Error, 'UsersService.findAll');

      throw new InternalServerErrorException(
        'Failed to retrieve users. Please try again later.',
      );
    }
  }

  async findByEmailAndGetPassword(email: string) {
    try {
      // Use query builder to explicitly include password (column has select: false)
      const user = await this.userRepository
        .createQueryBuilder('user')
        .select(['user.id', 'user.password', 'user.role', 'user.email'])
        .where('user.email = :email', { email })
        .getOne();

      if (!user) {
        this.loggerService.debug(
          `User not found with email: ${email}`,
          'UsersService.findByEmailAndGetPassword',
        );
        throw new NotFoundException(`User with email ${email} not found`, {
          email,
        });
      }

      this.loggerService.logDatabase(
        'Find By Email',
        'User',
        `Email: ${email}`,
      );
      return user;
    } catch (error) {
      this.loggerService.logError(
        error as Error,
        'UsersService.findByEmailAndGetPassword',
        { email },
      );
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve user. Please try again later.',
        { email },
      );
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.userRepository.findOne(id);

      if (!user) {
        this.loggerService.warn(
          `User not found with ID: ${id}`,
          'UsersService.findOne',
        );
        return null;
      }

      this.loggerService.logDatabase('Find One', 'User', `ID: ${id}`);
      return user;
    } catch (error) {
      this.loggerService.logError(error as Error, 'UsersService.findOne', {
        id,
      });

      throw new InternalServerErrorException(
        'Failed to retrieve user. Please try again later.',
      );
    }
  }

  async findById(userId: number) {
    try {
      const user = await this.userRepository.findOneOrFail(userId);
      this.loggerService.logDatabase('Find By ID', 'User', `ID: ${userId}`);
      return user;
    } catch (error) {
      this.loggerService.debug(
        `User not found with ID: ${userId}`,
        'UsersService.findById',
      );

      throw new NotFoundException(`User with ID ${userId} not found`, {
        userId,
      });
    }
  }

  async findByEmail(email: string) {
    try {
      const user = await this.userRepository.findOneOrFail({
        where: { email },
      });
      this.loggerService.logDatabase(
        'Find By Email',
        'User',
        `Email: ${email}`,
      );
      return user;
    } catch (error) {
      this.loggerService.debug(
        `User not found with email: ${email}`,
        'UsersService.findByEmail',
      );

      throw new NotFoundException(`User with email ${email} not found`, {
        email,
      });
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userRepository.preload({
        id,
        ...updateUserDto,
      });
      if (!user) {
        this.loggerService.warn(
          `Attempt to update non-existent user: ${id}`,
          'UsersService.update',
        );
        throw new NotFoundException(`User with ID ${id} not found`, {
          userId: id,
        });
      }
      const savedUser = await this.userRepository.save(user);
      this.loggerService.logDatabase('Update', 'User', `ID: ${id}`);
      this.loggerService.log(
        `User updated successfully - ID: ${id}`,
        'UsersService.update',
      );
      return savedUser;
    } catch (error) {
      // Re-throw custom exceptions as-is
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(error as Error, 'UsersService.update', {
        id,
      });

      throw new InternalServerErrorException(
        'Failed to update user. Please try again later.',
        { userId: id },
      );
    }
  }

  async remove(id: number) {
    try {
      const user = await this.userRepository.findOne(id);

      if (!user) {
        this.loggerService.warn(
          `Attempt to delete non-existent user: ${id}`,
          'UsersService.remove',
        );
        throw new NotFoundException(`User with ID ${id} not found`, {
          userId: id,
        });
      }

      const deletedUser = await this.userRepository.remove(user);
      this.loggerService.logDatabase('Delete', 'User', `ID: ${id}`);
      this.loggerService.log(
        `User deleted successfully - ID: ${id}`,
        'UsersService.remove',
      );
      return deletedUser;
    } catch (error) {
      // Re-throw custom exceptions as-is
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(error as Error, 'UsersService.remove', {
        id,
      });

      throw new InternalServerErrorException(
        'Failed to delete user. Please try again later.',
        { userId: id },
      );
    }
  }

  async setCurrentRefreshToken(refreshToken: string, userId: number) {
    try {
      const hash = createHash('sha256').update(refreshToken).digest('hex');
      const currentHashedRefreshToken = await bcrypt.hashSync(hash, 10);
      await this.userRepository.update(userId, {
        refreshToken: currentHashedRefreshToken,
      });
      this.loggerService.debug(
        `Refresh token updated`,
        'UsersService.setCurrentRefreshToken',
      );
    } catch (error) {
      this.loggerService.logError(
        error as Error,
        'UsersService.setCurrentRefreshToken',
        { userId },
      );

      throw new InternalServerErrorException(
        'Failed to update refresh token. Please try again later.',
        { userId },
      );
    }
  }

  async removeRefreshToken(userId: number) {
    try {
      await this.findById(userId);
      await this.userRepository.update(
        { id: userId },
        {
          refreshToken: null,
        },
      );
      this.loggerService.debug(
        `Refresh token removed`,
        'UsersService.removeRefreshToken',
      );
    } catch (error) {
      // Re-throw custom exceptions as-is
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(
        error as Error,
        'UsersService.removeRefreshToken',
        { userId },
      );

      throw new InternalServerErrorException(
        'Failed to remove refresh token. Please try again later.',
        { userId },
      );
    }
  }

  async getUserIfRefreshTokenMatches(refreshToken: string, userId: number) {
    try {
      const user = await this.userRepository.findOne({
        select: ['id', 'refreshToken', 'role'],
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`, {
          userId,
        });
      }

      const hash = createHash('sha256').update(refreshToken).digest('hex');
      const isRefreshTokenMatching = await bcrypt.compare(
        hash,
        user.refreshToken,
      );

      if (isRefreshTokenMatching) {
        this.loggerService.debug(
          `Refresh token verified for user: ${userId}`,
          'UsersService.getUserIfRefreshTokenMatches',
        );
        return { id: user.id, role: user.role };
      }

      this.loggerService.warn(
        `Invalid refresh token for user: ${userId}`,
        'UsersService.getUserIfRefreshTokenMatches',
      );

      throw new BadRequestException('Invalid refresh token', { userId });
    } catch (error) {
      // Re-throw custom exceptions as-is
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(
        error as Error,
        'UsersService.getUserIfRefreshTokenMatches',
        { userId },
      );

      throw new InternalServerErrorException(
        'Failed to verify refresh token. Please try again later.',
        { userId },
      );
    }
  }
}

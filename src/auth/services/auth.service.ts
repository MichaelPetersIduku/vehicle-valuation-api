import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import config from '../../config';
import { LoggerService } from '../../common/logger/logger.service';
import { UsersService } from '../../users/services/users.service';
import { PayloadToken } from './../models/token.model';
import {
  UnauthorizedException,
  InternalServerErrorException,
} from '../../common/exceptions/app-error.exception';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(config.KEY)
    private configService: ConfigType<typeof config>,
    private loggerService: LoggerService,
  ) {}

  async validateUser(email: string, password: string) {
    try {
      const user: {
        password: string;
        id: number;
        role: string;
      } = await this.usersService.findByEmailAndGetPassword(email);

      if (!user) {
        this.loggerService.logAuth('User validation', email, 'failure');
        return null;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match result:', isMatch); // Debug log for password comparison

      if (isMatch) {
        this.loggerService.logAuth('User validation', email, 'success');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rta } = user;
        return { ...rta, email };
      } else {
        this.loggerService.logAuth('User validation', email, 'failure');
        throw new UnauthorizedException('Invalid email or password', { email });
      }
    } catch (error) {
      this.loggerService.logError(error as Error, 'AuthService.validateUser', {
        email,
      });

      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to validate user credentials. Please try again later.',
        { email },
      );
    }
  }

  async login(user: PayloadToken) {
    try {
      const { accessToken } = this.jwtToken(user);
      const refreshToken = this.jwtRefreshToken(user);
      await this.usersService.setCurrentRefreshToken(refreshToken, user.id);

      this.loggerService.log(
        `User login successful - User ID: ${user.id}`,
        'AuthService.login',
      );

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      // Re-throw custom exceptions as-is
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(error as Error, 'AuthService.login', {
        userId: user.id,
      });

      throw new InternalServerErrorException(
        'Login failed. Please try again later.',
        { userId: user.id },
      );
    }
  }

  jwtToken(user: PayloadToken) {
    try {
      const payload: PayloadToken = {
        role: user.role,
        id: user.id,
        email: user.email,
      };
      const token = this.jwtService.sign(payload);
      this.loggerService.debug(
        `Access token generated for user: ${user.id}`,
        'AuthService.jwtToken',
      );
      return {
        accessToken: token,
      };
    } catch (error) {
      this.loggerService.logError(error as Error, 'AuthService.jwtToken', {
        userId: user.id,
      });

      throw new InternalServerErrorException(
        'Failed to generate access token. Please try again later.',
        { userId: user.id },
      );
    }
  }

  jwtRefreshToken(user: PayloadToken) {
    try {
      const payload = { role: user.role, id: user.id };

      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.jwt.jwtRefreshSecret,
        expiresIn: `${this.configService.jwt.refreshTokenExpiration}`,
      });

      this.loggerService.debug(
        `Refresh token generated for user: ${user.id}`,
        'AuthService.jwtRefreshToken',
      );

      return refreshToken;
    } catch (error) {
      this.loggerService.logError(
        error as Error,
        'AuthService.jwtRefreshToken',
        {
          userId: user.id,
        },
      );

      throw new InternalServerErrorException(
        'Failed to generate refresh token. Please try again later.',
        { userId: user.id },
      );
    }
  }

  async logout(user: PayloadToken) {
    try {
      await this.usersService.removeRefreshToken(user.id);
      this.loggerService.log(
        `User logout successful - User ID: ${user.id}`,
        'AuthService.logout',
      );
    } catch (error) {
      // Re-throw custom exceptions as-is
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(error as Error, 'AuthService.logout', {
        userId: user.id,
      });

      throw new InternalServerErrorException(
        'Logout failed. Please try again later.',
        { userId: user.id },
      );
    }
  }

  async createAccessTokenFromRefreshToken(user: PayloadToken) {
    try {
      const token = this.jwtToken(user);
      this.loggerService.log(
        `Token refreshed for user: ${user.id}`,
        'AuthService.createAccessTokenFromRefreshToken',
      );
      return token;
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
        'AuthService.createAccessTokenFromRefreshToken',
        {
          userId: user.id,
        },
      );

      throw new InternalServerErrorException(
        'Failed to refresh token. Please try again later.',
        { userId: user.id },
      );
    }
  }
}

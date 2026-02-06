import {
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  GetRefreshResponse,
  LoginDto,
  PostLoginResponse,
} from '../dto/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import JwtRefreshGuard from '../guards/jwt-refresh.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { PayloadToken } from '../models/token.model';
import { AuthService } from '../services/auth.service';

type AuthorizedRequest = Express.Request & {
  headers: { authorization: string };
  user: PayloadToken;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates a user with email and password, returns access and refresh tokens.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    type: PostLoginResponse,
    status: 200,
    description:
      'Successfully authenticated, returns access and refresh tokens',
  })
  @ApiBadRequestResponse({ description: 'Invalid email or password' })
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  login(@Request() req: { user: PayloadToken }) {
    const user = req.user;
    return this.authService.login(user);
  }

  @ApiOperation({
    summary: 'User logout',
    description:
      'Invalidates the current JWT access token and logs out the user.',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Successfully logged out',
  })
  @ApiUnauthorizedResponse({ description: 'No valid JWT token provided' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('logout')
  async logOut(@Request() req: { user: PayloadToken }) {
    await this.authService.logout(req.user);
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using the valid refresh token.',
  })
  @ApiOkResponse({
    status: 200,
    type: GetRefreshResponse,
    description: 'Successfully generated new access token',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  @ApiBearerAuth('refresh-token')
  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  refresh(@Req() req: AuthorizedRequest) {
    return this.authService.createAccessTokenFromRefreshToken(req.user);
  }
}

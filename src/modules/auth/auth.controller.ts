import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { ApiSuccessResponse } from 'src/common/decorators/response.decorator';
import { AuthEntity } from 'src/modules/auth/entities/auth.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiSuccessResponse(UserEntity)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Login successful')
  @ApiSuccessResponse(AuthEntity)
  @ApiBody({ type: LoginDto })
  login(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(user.id, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Token refreshed')
  @ApiCookieAuth('refresh_token')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token as string | undefined;
    return this.authService.refresh(refreshToken, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies.refresh_token as string | undefined;
    return this.authService.logout(refreshToken, res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logoutAll(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    return this.authService.logoutAll(user.id, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiSuccessResponse(UserEntity)
  me(@CurrentUser() user: User) {
    return new UserEntity(user);
  }
}

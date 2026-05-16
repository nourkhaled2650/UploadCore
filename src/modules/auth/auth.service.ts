import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { Response } from 'express';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from '../users/users.service';

import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import jwtConfig from 'src/config/jwt.config';
import { UserEntity } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { AuthEntity } from './entities/auth.entity';
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(appConfig.KEY)
    private readonly appConf: ConfigType<typeof appConfig>,
    @Inject(jwtConfig.KEY)
    private readonly jwtConf: ConfigType<typeof jwtConfig>,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateAccessToken(sub: string): string {
    return this.jwtService.sign(
      { sub },
      {
        secret: this.jwtConf.accessSecret,
        expiresIn: this.jwtConf.accessExpiresIn as SignOptions['expiresIn'],
      },
    );
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.appConf.env === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private async generateAndStoreRefreshToken(userId: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.jwtConf.refreshSecret,
        expiresIn: this.jwtConf.refreshExpiresIn as SignOptions['expiresIn'],
      },
    );

    const hashed = this.hashToken(token);

    const days = parseInt(this.jwtConf.refreshExpiresIn.replace('d', ''));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await this.prisma.refreshToken.create({
      data: {
        token: hashed,
        userId,
        expiresAt,
      },
    });

    return token;
  }
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) return null;

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) return null;

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active. Please verify your email.');
    }

    return user;
  }

  async register(dto: RegisterDto): Promise<UserEntity> {
    return this.usersService.create(dto);
  }

  async login(userId: string, res: Response): Promise<AuthEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    console.log('login called with userId:', userId);
    console.log('prisma.refreshToken:', this.prisma.refreshToken);
    console.log(
      'prisma keys:',
      Object.keys(this.prisma).filter((k) => k.includes('refresh')),
    );
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = await this.generateAndStoreRefreshToken(userId);

    this.setRefreshTokenCookie(res, refreshToken);

    return new AuthEntity(accessToken, new UserEntity(user!));
  }

  async refresh(rawRefreshToken: string, res: Response): Promise<{ accessToken: string }> {
    // verify signature first — no DB hit if token is invalid
    console.log('rawRefreshToken received:', rawRefreshToken ? 'present' : 'missing');
    console.log('token length:', rawRefreshToken?.length);
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(rawRefreshToken, {
        secret: this.jwtConf.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // look up hashed token in DB
    const hashed = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hashed },
      include: { user: true },
    });

    // not found, revoked, or expired
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // revoked token used again — replay attack detected
      // revoke all tokens for this user, force re-login on all devices
      if (stored?.revokedAt) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: payload.sub, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is suspended');
    }

    // rotate — revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshToken = await this.generateAndStoreRefreshToken(stored.userId);
    this.setRefreshTokenCookie(res, newRefreshToken);

    const accessToken = this.generateAccessToken(stored.userId);

    return { accessToken };
  }

  async logout(rawRefreshToken: string, res: Response): Promise<void> {
    if (rawRefreshToken) {
      const hashed = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { token: hashed, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie('refresh_token');
  }
  async logoutAll(userId: string, res: Response): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    res.clearCookie('refresh_token');
  }
}

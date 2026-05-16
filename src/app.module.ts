import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppLoggerModule } from 'src/config/logger.module';

@Module({
  imports: [AppConfigModule, PrismaModule, UsersModule, AuthModule, AppLoggerModule],
})
export class AppModule {}

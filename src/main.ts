import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import appConfig from './config/app.config';
import { ENV } from './config/env';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: ENV.NODE_ENV === 'production',
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const appConf = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  await app.listen(appConf.port);

  const url = await app.getUrl();
  console.log(`App running on ${url}`);
}

void bootstrap();

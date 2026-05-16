import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import appConfig from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages:
        app.get<ConfigType<typeof appConfig>>(appConfig.KEY).env === 'production',
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const appConf = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  await app.listen(appConf.port);

  const url = await app.getUrl();
  console.log(`App running on ${url}`);
}

void bootstrap();

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { ConfigType } from '@nestjs/config';
import appConfig from 'src/config/app.config';
import { AppConfigModule } from 'src/config/config.module';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [appConfig.KEY],
      useFactory: (appConf: ConfigType<typeof appConfig>) => ({
        pinoHttp: {
          transport:
            appConf.env !== 'production'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          level: appConf.env !== 'production' ? 'debug' : 'info',
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        },
      }),
    }),
  ],
})
export class AppLoggerModule {}

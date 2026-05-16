import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './env.validation';
import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validate: (config) => {
        const result = envSchema.safeParse(config);

        if (!result.success) {
          const messages = Object.entries(result.error.flatten().fieldErrors)
            .map(([field, errors]) => `  ${field}: ${errors?.join(', ')}`)
            .join('\n');

          throw new Error(`\n\nInvalid environment variables:\n${messages}\n`);
        }

        return result.data;
      },
    }),
  ],
})
export class AppConfigModule {}

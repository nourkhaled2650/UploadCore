import { registerAs } from '@nestjs/config';
import { ENV } from './env';

export default registerAs('app', () => ({
  port: ENV.PORT,
  env: ENV.NODE_ENV,
}));

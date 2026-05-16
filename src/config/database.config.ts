import { registerAs } from '@nestjs/config';
import { ENV } from './env';

export default registerAs('database', () => ({
  url: ENV.DATABASE_URL,
}));

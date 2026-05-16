import { registerAs } from '@nestjs/config';
import { ENV } from './env';

export default registerAs('jwt', () => ({
  accessSecret: ENV.JWT_ACCESS_SECRET,
  refreshSecret: ENV.JWT_REFRESH_SECRET,
  accessExpiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
}));

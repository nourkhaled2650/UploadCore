import { defineConfig } from 'prisma/config';
import { ENV } from '../src/config/env';

export default defineConfig({
  datasource: {
    url: ENV.DATABASE_URL,
  },
});

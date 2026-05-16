import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),

  // Database
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required' })
    .url({ error: 'DATABASE_URL must be a valid URL' }),

  // JWT
  JWT_ACCESS_SECRET: z
    .string({ error: 'JWT_ACCESS_SECRET is required' })
    .min(32, { error: 'JWT_ACCESS_SECRET must be at least 32 characters' }),
  JWT_REFRESH_SECRET: z
    .string({ error: 'JWT_REFRESH_SECRET is required' })
    .min(32, { error: 'JWT_REFRESH_SECRET must be at least 32 characters' }),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

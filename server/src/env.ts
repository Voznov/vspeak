import dotenv from 'dotenv';
import { z } from 'zod';
import { zPort } from './utils/zod';

const envFiles = ['.env.local', '.env'];
envFiles.forEach((envFile) => dotenv.config({ path: envFile, override: false }));

const envSchema = z.object({
  HTTP_PORT: zPort,
  HTTP_HOST: z.string(),
  JWT_SECRET: z.string().min(32),
  ADMIN_KEY: z.string().min(32),
  MEDIASOUP_LISTEN_IP: z.ipv4(),
  MEDIASOUP_ANNOUNCED_IP: z.ipv4(),
  MEDIASOUP_MIN_PORT: zPort,
  MEDIASOUP_MAX_PORT: zPort,
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: zPort,
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
});

const parsedEnv = envSchema.parse(process.env);

export const ENV = parsedEnv;

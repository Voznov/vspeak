import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './env';

const KEEP_ALIVE_TIMEOUT = 5000;
const HEADERS_TIMEOUT = 2 * KEEP_ALIVE_TIMEOUT;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
    bufferLogs: true,
  });

  app.enableCors();
  app.enableShutdownHooks();

  const server = app.getHttpServer();
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
  server.headersTimeout = HEADERS_TIMEOUT;

  await app.listen(ENV.HTTP_PORT, ENV.HTTP_HOST);

  console.log(`🚀 Server running on http://${ENV.HTTP_HOST}:${ENV.HTTP_PORT}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

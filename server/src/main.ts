import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ENV } from './env';
import { ZodValidationPipe } from '../libs/validation';

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

  app.useGlobalPipes(new ZodValidationPipe());

  const swaggerDocument = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('VSpeak API').setVersion('1.0').build());
  SwaggerModule.setup('docs', app, swaggerDocument, { jsonDocumentUrl: 'docs-json' });

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

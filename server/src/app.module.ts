import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ClsMiddleware } from './auth/cls.middleware';
import { ChannelsModule } from './channels/channels.module';
import { ENV } from './env';
import { CreateChannels20260306002 } from './postgres/migrations/CreateChannels20260306002';
import { CreateUsers20260306001 } from './postgres/migrations/CreateUsers20260306001';
import { PostgresModule } from './postgres/postgres.module';
import { S3Module } from './s3/s3.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    PostgresModule.register({
      migrations: {
        CreateUsers20260306001,
        CreateChannels20260306002,
      },
    }),
    S3Module.register({
      region: ENV.S3_REGION,
      endpoint: ENV.S3_ENDPOINT,
      publicEndpoint: ENV.S3_PUBLIC_ENDPOINT,
      forcePathStyle: ENV.S3_FORCE_PATH_STYLE,
      accessKeyId: ENV.S3_ACCESS_KEY_ID,
      secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
      webhookAuthToken: ENV.S3_WEBHOOK_AUTH_TOKEN,
    }),
    AuthModule,
    UserModule,
    ChannelsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ClsMiddleware).forRoutes('*');
  }
}

import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ClsMiddleware } from './auth/cls.middleware';
import { ChannelsModule } from './channels/channels.module';
import { PostgresModule } from './postgres/postgres.module';
import { CreateUsers20260306001 } from './postgres/migrations/CreateUsers20260306001';
import { CreateChannels20260306002 } from './postgres/migrations/CreateChannels20260306002';
import { WebRtcModule } from './webrtc/webrtc.module';

@Module({
  imports: [
    PostgresModule.register({
      migrations: {
        CreateUsers20260306001,
        CreateChannels20260306002,
      },
    }),
    AuthModule,
    WebRtcModule,
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

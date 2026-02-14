import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ClsMiddleware } from './auth/cls.middleware';
import { ChannelsModule } from './channels/channels.module';
import { WebRtcModule } from './webrtc/webrtc.module';

@Module({
  imports: [AuthModule, WebRtcModule, ChannelsModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ClsMiddleware).forRoutes('*');
  }
}

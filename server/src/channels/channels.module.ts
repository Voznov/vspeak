import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { AuthModule } from '../auth/auth.module';
import { WebRtcModule } from '../webrtc/webrtc.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule, WebRtcModule, AuthModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}

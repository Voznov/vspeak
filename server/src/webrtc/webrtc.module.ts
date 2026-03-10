import { forwardRef, Module } from '@nestjs/common';
import { WebRtcController } from './webrtc.controller';
import { WebRTCService } from './webrtc.service';
// eslint-disable-next-line import-x/no-cycle
import { ChannelsModule } from '../channels/channels.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule, forwardRef(() => ChannelsModule)],
  controllers: [WebRtcController],
  providers: [WebRTCService],
  exports: [WebRTCService],
})
export class WebRtcModule {}

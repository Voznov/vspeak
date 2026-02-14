import { Module } from '@nestjs/common';
import { WebRtcController } from './webrtc.controller';
import { WebRTCService } from './webrtc.service';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule],
  controllers: [WebRtcController],
  providers: [WebRTCService],
  exports: [WebRTCService],
})
export class WebRtcModule {}

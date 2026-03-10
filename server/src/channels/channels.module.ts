import { forwardRef, Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsRepo } from './channels.repo';
import { ChannelsService } from './channels.service';
import { UserModule } from '../user/user.module';
// eslint-disable-next-line import-x/no-cycle
import { WebRtcModule } from '../webrtc/webrtc.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule, forwardRef(() => WebRtcModule), UserModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelsRepo],
  exports: [ChannelsService],
})
export class ChannelsModule {}

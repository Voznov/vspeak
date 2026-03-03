import { Body, UseGuards } from '@nestjs/common';
import {
  CloseProducerRequestDto,
  CloseProducerResponseDto,
  ConnectTransportRequestDto,
  ConnectTransportResponseDto,
  ConsumeStreamRequestDto,
  ConsumeStreamResponseDto,
  GetChannelInfoRequestDto,
  GetChannelInfoResponseDto,
  PauseConsumerRequestDto,
  PauseConsumerResponseDto,
  ProduceStreamRequestDto,
  ProduceStreamResponseDto,
  ResumeConsumerRequestDto,
  ResumeConsumerResponseDto,
  SetDeafRequestDto,
  SetDeafResponseDto,
} from './webrtc.dto';
import { WebRTCService } from './webrtc.service';
import { Api } from '../../../libs/api';
import { getUserId } from '../auth/cls.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Rest, RestController } from '../utils/decorators';

@RestController()
@UseGuards(JwtAuthGuard)
export class WebRtcController extends Api.Voice {
  constructor(private readonly webrtcService: WebRTCService) {
    super();
  }

  @Rest({ response: GetChannelInfoResponseDto })
  async getChannelInfo(@Body() request: GetChannelInfoRequestDto): Promise<GetChannelInfoResponseDto> {
    const userId = getUserId();

    return this.webrtcService.getChannelInfo(userId, request.channelId);
  }

  @Rest({ response: ConnectTransportResponseDto })
  async connectTransport(@Body() request: ConnectTransportRequestDto): Promise<ConnectTransportResponseDto> {
    const userId = getUserId();
    await this.webrtcService.connectTransport(userId, request.transportId, request.dtlsParameters);

    return { success: true };
  }

  @Rest({ response: ProduceStreamResponseDto })
  async produceStream(@Body() request: ProduceStreamRequestDto): Promise<ProduceStreamResponseDto> {
    const userId = getUserId();

    return this.webrtcService.produceStream(userId, request.kind, request.source, request.rtpParameters);
  }

  @Rest({ response: CloseProducerResponseDto })
  async closeProducer(@Body() request: CloseProducerRequestDto): Promise<CloseProducerResponseDto> {
    const userId = getUserId();
    this.webrtcService.closeProducer(userId, request.producerId);

    return { success: true };
  }

  @Rest({ response: ConsumeStreamResponseDto })
  async consumeStream(@Body() request: ConsumeStreamRequestDto): Promise<ConsumeStreamResponseDto> {
    const userId = getUserId();

    return this.webrtcService.consumeStream(userId, request.producerUserId, request.producerId, request.rtpCapabilities);
  }

  @Rest({ response: ResumeConsumerResponseDto })
  async resumeConsumer(@Body() request: ResumeConsumerRequestDto): Promise<ResumeConsumerResponseDto> {
    const userId = getUserId();
    await this.webrtcService.resumeConsuming(userId, request.consumerId);

    return { success: true };
  }

  @Rest({ response: PauseConsumerResponseDto })
  async pauseConsumer(@Body() request: PauseConsumerRequestDto): Promise<PauseConsumerResponseDto> {
    const userId = getUserId();
    await this.webrtcService.pauseConsuming(userId, request.consumerId);

    return { success: true };
  }

  @Rest({ response: SetDeafResponseDto })
  async setDeaf(@Body() request: SetDeafRequestDto): Promise<SetDeafResponseDto> {
    const userId = getUserId();
    this.webrtcService.setIsDeaf(userId, request.isDeaf);

    return { success: true };
  }
}

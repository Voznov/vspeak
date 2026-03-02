import { Body, UseGuards } from '@nestjs/common';
import type { DtlsParameters, RtpCapabilities, RtpParameters } from 'mediasoup/types';
import { WebRTCService } from './webrtc.service';
import { Api } from '../../../libs/api';
import {
  type CloseProducerRequest,
  type CloseProducerResponse,
  type ConnectTransportRequest,
  type ConnectTransportResponse,
  type ConsumeStreamRequest,
  type ConsumeStreamResponse,
  type GetChannelInfoRequest,
  type GetChannelInfoResponse,
  type PauseConsumerRequest,
  type PauseConsumerResponse,
  type ProduceStreamRequest,
  type ProduceStreamResponse,
  type ResumeConsumerRequest,
  type ResumeConsumerResponse,
  type SetDeafRequest,
  type SetDeafResponse,
} from '../../../libs/api/entities';
import { getUserId } from '../auth/cls.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestController } from '../utils/decorators';

@RestController()
@UseGuards(JwtAuthGuard)
export class WebRtcController extends Api.Voice {
  constructor(private readonly webrtcService: WebRTCService) {
    super();
  }

  async getChannelInfo(@Body() request: GetChannelInfoRequest): Promise<GetChannelInfoResponse> {
    const userId = getUserId();
    const { channelId } = request;

    return this.webrtcService.getChannelInfo(userId, channelId);
  }

  async connectTransport(@Body() request: ConnectTransportRequest): Promise<ConnectTransportResponse> {
    const userId = getUserId();
    const { transportId, dtlsParameters } = request;
    await this.webrtcService.connectTransport(userId, transportId, dtlsParameters as DtlsParameters);

    return { success: true };
  }

  async produceStream(@Body() request: ProduceStreamRequest): Promise<ProduceStreamResponse> {
    const userId = getUserId();
    const { kind, source, rtpParameters } = request;

    return this.webrtcService.produceStream(userId, kind, source, rtpParameters as RtpParameters);
  }

  async closeProducer(@Body() request: CloseProducerRequest): Promise<CloseProducerResponse> {
    const userId = getUserId();
    const { producerId } = request;

    this.webrtcService.closeProducer(userId, producerId);

    return { success: true };
  }

  async consumeStream(@Body() request: ConsumeStreamRequest): Promise<ConsumeStreamResponse> {
    const userId = getUserId();
    const { producerUserId, producerId, rtpCapabilities } = request;

    return this.webrtcService.consumeStream(userId, producerUserId, producerId, rtpCapabilities as RtpCapabilities);
  }

  async resumeConsumer(@Body() request: ResumeConsumerRequest): Promise<ResumeConsumerResponse> {
    const userId = getUserId();
    const { consumerId } = request;
    await this.webrtcService.resumeConsuming(userId, consumerId);

    return { success: true };
  }

  async pauseConsumer(@Body() request: PauseConsumerRequest): Promise<PauseConsumerResponse> {
    const userId = getUserId();
    const { consumerId } = request;
    await this.webrtcService.pauseConsuming(userId, consumerId);

    return { success: true };
  }

  async setDeaf(@Body() request: SetDeafRequest): Promise<SetDeafResponse> {
    const userId = getUserId();
    const { isDeaf } = request;

    this.webrtcService.setIsDeaf(userId, isDeaf);

    return { success: true };
  }
}

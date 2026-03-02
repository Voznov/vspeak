import { HttpException, HttpStatus, Injectable, type OnModuleInit } from '@nestjs/common';
import { createWorker } from 'mediasoup';
import {
  Consumer,
  DtlsParameters,
  IceCandidate,
  IceParameters,
  Producer,
  Router,
  RouterRtpCodecCapability,
  RtpCapabilities,
  RtpParameters,
  Transport,
  WebRtcTransport,
  Worker,
} from 'mediasoup/types';
import { ChannelId, ConsumerId, ProducerId, ProducerInfo, ProducerKind, ProducerSource, TransportId, UserId, UserMediaStatus } from '../../../libs/api/entities';
import { ENV } from '../env';
import { WsGateway } from '../ws/ws.gateway';

type UserInfo = {
  sendTransport: Transport;
  recvTransport: Transport;
  channelId: ChannelId;
  producers: Map<ProducerId, Producer<{ source: ProducerSource }>>;
  consumers: Map<ConsumerId, Consumer>;
  isDeaf: boolean;
};

type ChannelInfo = {
  router: Router;
};

type TransportInfo = {
  transportId: TransportId;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
};

@Injectable()
export class WebRTCService implements OnModuleInit {
  private worker!: Worker;
  private readonly userInfos = new Map<UserId, UserInfo>();
  private readonly channelInfos = new Map<ChannelId, ChannelInfo>();

  constructor(private readonly wsGateway: WsGateway) {}

  async onModuleInit() {
    this.worker = await createWorker({
      logLevel: 'warn',
      rtcMinPort: ENV.MEDIASOUP_MIN_PORT,
      rtcMaxPort: ENV.MEDIASOUP_MAX_PORT,
    });

    this.worker.on('died', () => {
      console.error('mediasoup Worker died, exiting in 2 seconds...');
      setTimeout(() => process.exit(1), 2000);
    });

    console.log('✅ mediasoup Worker initialized');
  }

  // Server calls

  public async createChannelRouter(channelId: ChannelId, mediaCodecs?: RouterRtpCodecCapability[]) {
    const defaultCodecs: RouterRtpCodecCapability[] = [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        parameters: {
          maxaveragebitrate: 256000, // 256 kbps
          useinbandfec: 1,
          usedtx: 0,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 5000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 2,
          'x-google-start-bitrate': 5000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 5000,
        },
      },
    ];

    const router = await this.worker.createRouter({ mediaCodecs: mediaCodecs ?? defaultCodecs });
    this.channelInfos.set(channelId, { router });
  }

  public async deleteChannelRouter(channelId: ChannelId): Promise<void> {
    const channelInfo = this.channelInfos.get(channelId);
    if (!channelInfo) {
      return;
    }

    channelInfo.router.close();
    this.channelInfos.delete(channelId);
  }

  // Client calls

  public getChannelInfo(userId: UserId, channelId: ChannelId) {
    const channelInfo = this.channelInfos.get(channelId);
    if (!channelInfo) {
      throw new HttpException('Unknown channel id', HttpStatus.NOT_FOUND);
    }

    // Collect producerInfos from all userInfos for this channel
    const producerInfos: ProducerInfo[] = [];
    for (const [uid, userInfo] of this.userInfos.entries()) {
      if (userInfo.channelId === channelId) {
        for (const producer of userInfo.producers.values()) {
          producerInfos.push({
            producerId: producer.id as ProducerId,
            kind: producer.kind,
            source: (producer.appData as { source?: ProducerSource }).source ?? 'user',
            userId: uid,
          });
        }
      }
    }

    return { capabilities: channelInfo.router.rtpCapabilities, producerInfos };
  }

  public async createTransports(userId: UserId, channelId: ChannelId, onDisconnect: () => void) {
    const channelInfo = this.channelInfos.get(channelId);
    if (!channelInfo) {
      throw new HttpException('Unknown channel id', HttpStatus.NOT_FOUND);
    }

    // If the user is already connected, close their old transports
    if (this.userInfos.has(userId)) {
      this.closeTransports(userId);
    }

    // onClose callback calls closeTransports and the provided onDisconnect
    const handleTransportClose = () => {
      this.closeTransports(userId);
      onDisconnect(); // Notify ChannelsService
    };

    const recvTransport = await this.createTransport(channelInfo.router, handleTransportClose);
    const sendTransport = await this.createTransport(channelInfo.router, handleTransportClose);

    const userInfo: UserInfo = {
      recvTransport,
      sendTransport,
      channelId,
      producers: new Map(),
      consumers: new Map(),
      isDeaf: false,
    };
    this.userInfos.set(userId, userInfo);

    void this.wsGateway.joinRoom(userId, channelId);

    const send: TransportInfo = {
      transportId: sendTransport.id as TransportId,
      dtlsParameters: sendTransport.dtlsParameters,
      iceCandidates: sendTransport.iceCandidates,
      iceParameters: sendTransport.iceParameters,
    };
    const recv: TransportInfo = {
      transportId: recvTransport.id as TransportId,
      dtlsParameters: recvTransport.dtlsParameters,
      iceCandidates: recvTransport.iceCandidates,
      iceParameters: recvTransport.iceParameters,
    };

    return { send, recv };
  }

  public closeTransports(userId: UserId): void {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) {
      return;
    }

    const { recvTransport, sendTransport, producers, consumers } = userInfo;

    // Close all resources
    this.userInfos.delete(userId);
    [...producers.values()].forEach((producer) => producer.close());
    [...consumers.values()].forEach((consumer) => consumer.close());
    recvTransport.close();
    sendTransport.close();

    void this.wsGateway.leaveRoom(userId);
    // userId is NOT removed from channel.userIds here — ChannelsService handles that via callback
  }

  public closeProducer(userId: UserId, producerId: ProducerId): void {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const producer = userInfo.producers.get(producerId);
    if (!producer) {
      throw new HttpException('Producer not found', HttpStatus.NOT_FOUND);
    }

    // Closing triggers the @close listener which emits producerClosed WS event
    producer.close();
  }

  public async connectTransport(userId: UserId, transportId: TransportId, dtlsParameters: DtlsParameters): Promise<void> {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    let transport: Transport;
    switch (transportId) {
      case userInfo.recvTransport.id: {
        transport = userInfo.recvTransport;
        break;
      }
      case userInfo.sendTransport.id: {
        transport = userInfo.sendTransport;
        break;
      }
      default: {
        throw new HttpException('Transport not found', HttpStatus.NOT_FOUND);
      }
    }

    await transport.connect({ dtlsParameters });
  }

  public async produceStream(userId: UserId, kind: ProducerKind, source: ProducerSource, rtpParameters: RtpParameters) {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const producer = await userInfo.sendTransport.produce({ kind, rtpParameters, appData: { source } });
    const producerId = producer.id as ProducerId;

    userInfo.producers.set(producerId, producer);
    producer.on('@close', () => {
      const { channelId } = userInfo;
      userInfo.producers.delete(producerId);
      this.wsGateway.emitToChannel(channelId, 'producerClosed', { producerId, userId });
      if (this.userInfos.has(userId)) {
        this.wsGateway.emitToAll('channelUserStatusChanged', { channelId, userId, status: this.getUserMediaStatus(userId) });
      }
    });

    this.wsGateway.emitToChannel(userInfo.channelId, 'producerCreated', { info: { userId, producerId, kind, source } });
    this.wsGateway.emitToAll('channelUserStatusChanged', { channelId: userInfo.channelId, userId, status: this.getUserMediaStatus(userId) });

    return { producerId };
  }

  public getUserMediaStatus(userId: UserId): UserMediaStatus {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) return { hasMic: false, hasVideo: false, hasScreen: false, isDeaf: false };
    let hasMic = false;
    let hasVideo = false;
    let hasScreen = false;
    for (const producer of userInfo.producers.values()) {
      const { kind } = producer;
      const { source } = producer.appData;
      if (kind === 'audio') {
        if (source === 'user') {
          hasMic = true;
        }
      } else {
        if (source === 'user') {
          hasVideo = true;
        } else {
          hasScreen = true;
        }
      }
    }

    return { hasMic, hasVideo, hasScreen, isDeaf: userInfo.isDeaf };
  }

  public setIsDeaf(userId: UserId, isDeaf: boolean): void {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    userInfo.isDeaf = isDeaf;
    this.wsGateway.emitToAll('channelUserStatusChanged', { channelId: userInfo.channelId, userId, status: this.getUserMediaStatus(userId) });
  }

  public async consumeStream(userId: UserId, producerUserId: UserId, producerId: ProducerId, rtpCapabilities: RtpCapabilities) {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const producerUserInfo = this.userInfos.get(producerUserId);
    if (!producerUserInfo) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (userInfo.channelId !== producerUserInfo.channelId) {
      throw new HttpException('Channel mismatch', HttpStatus.BAD_REQUEST);
    }

    const producer = producerUserInfo.producers.get(producerId);
    if (!producer) {
      throw new HttpException('Producer not found', HttpStatus.NOT_FOUND);
    }

    const channelInfo = this.channelInfos.get(userInfo.channelId);
    if (!channelInfo) {
      throw new HttpException('Channel not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const canConsume = channelInfo.router.canConsume({ producerId, rtpCapabilities });
    if (!canConsume) {
      throw new HttpException('Cannot consume - RTP capabilities mismatch', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const consumer = await userInfo.recvTransport.consume({ producerId, rtpCapabilities, paused: true });
    const consumerId = consumer.id as ConsumerId;

    userInfo.consumers.set(consumerId, consumer);
    consumer.on('@close', () => {
      userInfo.consumers.delete(consumerId);
    });

    return {
      consumerId,
      producerId: consumer.producerId as ProducerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  public async resumeConsuming(userId: UserId, consumerId: ConsumerId) {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const consumer = userInfo.consumers.get(consumerId);
    if (!consumer) {
      throw new HttpException('Consumer not found', HttpStatus.NOT_FOUND);
    }

    await consumer.resume();
  }

  public async pauseConsuming(userId: UserId, consumerId: ConsumerId) {
    const userInfo = this.userInfos.get(userId);
    if (!userInfo) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const consumer = userInfo.consumers.get(consumerId);
    if (!consumer) {
      throw new HttpException('Consumer not found', HttpStatus.NOT_FOUND);
    }

    await consumer.pause();
  }

  private async createTransport(router: Router, onClose: () => void): Promise<WebRtcTransport> {
    const transport = await router.createWebRtcTransport({
      listenIps: [
        {
          ip: ENV.MEDIASOUP_LISTEN_IP,
          announcedIp: ENV.MEDIASOUP_ANNOUNCED_IP,
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    transport.on('@close', onClose);
    transport.on('routerclose', onClose);

    return transport;
  }
}

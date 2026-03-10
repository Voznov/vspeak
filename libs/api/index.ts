import {
  type AdminLoginRequest,
  type AdminLoginResponse,
  type CloseProducerRequest,
  type CloseProducerResponse,
  type ConnectTransportRequest,
  type ConnectTransportResponse,
  type ConsumeStreamRequest,
  type ConsumeStreamResponse,
  type CreateChannelRequest,
  type CreateChannelResponse,
  type CreateTransportsRequest,
  type CreateTransportsResponse,
  type DeleteChannelRequest,
  type DeleteChannelResponse,
  type GetChannelInfoRequest,
  type GetChannelInfoResponse,
  type GetChannelUsersRequest,
  type GetChannelUsersResponse,
  type GetMeRequest,
  type GetMeResponse,
  type GetPaletteRequest,
  type GetPaletteResponse,
  type JoinChannelRequest,
  type JoinChannelResponse,
  type LeaveChannelRequest,
  type LeaveChannelResponse,
  type ListChannelsRequest,
  type ListChannelsResponse,
  type LoginRequest,
  type LoginResponse,
  type PauseConsumerRequest,
  type PauseConsumerResponse,
  type PauseProducerRequest,
  type PauseProducerResponse,
  type ProduceStreamRequest,
  type ProduceStreamResponse,
  type ResumeConsumerRequest,
  type ResumeConsumerResponse,
  type ResumeProducerRequest,
  type ResumeProducerResponse,
  type SetDeafRequest,
  type SetDeafResponse,
  type UpdateAvatarRequest,
  type UpdateAvatarResponse,
  type UpdateChannelRequest,
  type UpdateChannelResponse,
  type UpdateUserRequest,
  type UpdateUserResponse,
} from './entities';
import { createRpcInterface } from '../rpc.interface';

abstract class Auth {
  abstract login(_: LoginRequest): Promise<LoginResponse>;
  abstract adminLogin(_: AdminLoginRequest): Promise<AdminLoginResponse>;
}

abstract class User {
  abstract getMe(_: GetMeRequest): Promise<GetMeResponse>;
  abstract updateAvatar(_: UpdateAvatarRequest): Promise<UpdateAvatarResponse>;
  abstract updateUser(_: UpdateUserRequest): Promise<UpdateUserResponse>;
  abstract getPalette(_: GetPaletteRequest): Promise<GetPaletteResponse>;
}

abstract class Channels {
  abstract listChannels(_: ListChannelsRequest): Promise<ListChannelsResponse>;
  abstract createChannel(_: CreateChannelRequest): Promise<CreateChannelResponse>;
  abstract deleteChannel(_: DeleteChannelRequest): Promise<DeleteChannelResponse>;
  abstract updateChannel(_: UpdateChannelRequest): Promise<UpdateChannelResponse>;
  abstract joinChannel(_: JoinChannelRequest): Promise<JoinChannelResponse>;
  abstract leaveChannel(_: LeaveChannelRequest): Promise<LeaveChannelResponse>;
  abstract getChannelUsers(_: GetChannelUsersRequest): Promise<GetChannelUsersResponse>;
}

abstract class WebRtc {
  abstract createTransports(_: CreateTransportsRequest): Promise<CreateTransportsResponse>;
  abstract getChannelInfo(_: GetChannelInfoRequest): Promise<GetChannelInfoResponse>;
  abstract connectTransport(_: ConnectTransportRequest): Promise<ConnectTransportResponse>;
  abstract produceStream(_: ProduceStreamRequest): Promise<ProduceStreamResponse>;
  abstract closeProducer(_: CloseProducerRequest): Promise<CloseProducerResponse>;
  abstract pauseProducer(_: PauseProducerRequest): Promise<PauseProducerResponse>;
  abstract resumeProducer(_: ResumeProducerRequest): Promise<ResumeProducerResponse>;
  abstract consumeStream(_: ConsumeStreamRequest): Promise<ConsumeStreamResponse>;
  abstract resumeConsumer(_: ResumeConsumerRequest): Promise<ResumeConsumerResponse>;
  abstract pauseConsumer(_: PauseConsumerRequest): Promise<PauseConsumerResponse>;
  abstract setDeaf(_: SetDeafRequest): Promise<SetDeafResponse>;
}

export class Api extends createRpcInterface({ Auth, User, Channels, WebRtc }) {}

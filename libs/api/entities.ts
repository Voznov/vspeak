import { type Branded } from '../types';

export type UserId = Branded<string, 'UserId'>;
export type ChannelId = Branded<string, 'ChannelId'>;
export type UserRole = 'user' | 'admin';

export type User = {
  id: UserId;
  nickname: string;
  role: UserRole;
};

export type Channel = {
  id: ChannelId;
  name: string;
};

export type UserMediaStatus = {
  hasMic: boolean;
  hasVideo: boolean;
  hasScreen: boolean;
  isDeaf: boolean;
};

export type UserWithStatus = User & UserMediaStatus;

export type ChannelWithUsers = Channel & {
  users: UserWithStatus[];
};

export type LoginRequest = {
  nickname: string;
  invitationToken?: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type AdminLoginRequest = {
  nickname: string;
  adminKey: string;
};

export type AdminLoginResponse = {
  token: string;
  user: User;
};

export type GetMeRequest = {};

export type GetMeResponse = {
  user: User;
};

export type ListChannelsRequest = {};

export type ListChannelsResponse = {
  channels: ChannelWithUsers[];
};

export type CreateChannelRequest = {
  name: string;
};

export type CreateChannelResponse = {
  channel: ChannelWithUsers;
};

export type DeleteChannelRequest = {
  channelId: ChannelId;
};

export type DeleteChannelResponse = {
  success: boolean;
};

export type JoinChannelRequest = {
  channelId: ChannelId;
};

export type JoinChannelResponse = {
  channel: ChannelWithUsers;
  send: TransportInfo;
  recv: TransportInfo;
};

export type LeaveChannelRequest = {
  channelId: ChannelId;
};

export type LeaveChannelResponse = {
  success: boolean;
};

export type GetChannelUsersRequest = {
  channelId: ChannelId;
};

export type GetChannelUsersResponse = {
  users: User[];
};

// Voice / WebRTC types
export type TransportId = Branded<string, 'TransportId'>;
export type ProducerId = Branded<string, 'ProducerId'>;
export type ConsumerId = Branded<string, 'ConsumerId'>;

export type TransportInfo = {
  transportId: TransportId;
  iceParameters: unknown;
  iceCandidates: unknown[];
  dtlsParameters: unknown;
};

export type ProducerKind = 'audio' | 'video';
export type ProducerSource = 'user' | 'display';

export type ProducerInfo = {
  producerId: ProducerId;
  kind: ProducerKind;
  source: ProducerSource;
  userId: UserId;
};

export type GetChannelInfoRequest = {
  channelId: ChannelId;
};

export type GetChannelInfoResponse = {
  capabilities: unknown; // mediasoup RtpCapabilities
  producerInfos: ProducerInfo[];
};

export type ConnectUserRequest = {
  channelId: ChannelId;
};

export type ConnectUserResponse = {
  send: TransportInfo;
  recv: TransportInfo;
};

export type DisconnectUserRequest = {};

export type DisconnectUserResponse = {
  success: boolean;
};

export type ConnectTransportRequest = {
  transportId: TransportId;
  dtlsParameters: unknown;
};

export type ConnectTransportResponse = {
  success: boolean;
};

export type ProduceStreamRequest = {
  kind: ProducerKind;
  source: ProducerSource;
  rtpParameters: unknown;
};

export type ProduceStreamResponse = {
  producerId: ProducerId;
};

export type ConsumeStreamRequest = {
  producerUserId: UserId;
  producerId: ProducerId;
  rtpCapabilities: unknown;
};

export type ConsumeStreamResponse = {
  consumerId: ConsumerId;
  producerId: ProducerId;
  kind: ProducerKind;
  rtpParameters: unknown;
};

export type ResumeConsumerRequest = {
  consumerId: ConsumerId;
};

export type ResumeConsumerResponse = {
  success: boolean;
};

export type PauseConsumerRequest = {
  consumerId: ConsumerId;
};

export type PauseConsumerResponse = {
  success: boolean;
};

export type CloseProducerRequest = {
  producerId: ProducerId;
};

export type CloseProducerResponse = {
  success: boolean;
};

export type SetDeafRequest = {
  isDeaf: boolean;
};

export type SetDeafResponse = {
  success: boolean;
};

// WebSocket event types
export type WsEvents = {
  channelUserJoined: { channelId: ChannelId; user: UserWithStatus };
  channelUserLeft: { channelId: ChannelId; userId: UserId };
  channelUserStatusChanged: { channelId: ChannelId; userId: UserId; status: UserMediaStatus };
  producerCreated: { info: ProducerInfo };
  producerClosed: { producerId: ProducerId; userId: UserId };
  channelCreated: { channel: ChannelWithUsers };
  channelDeleted: { channelId: ChannelId };
};

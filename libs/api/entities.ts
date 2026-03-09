import { type Branded } from '../types';

export type UserId = Branded<string, 'UserId'>;
export type ChannelId = Branded<string, 'ChannelId'>;
export type UserRole = 'user' | 'admin';

export type User = {
  id: UserId;
  nickname: string;
  role: UserRole;
  bgColor: string;
  avatarUrl?: string;
};

export type Channel = {
  id: ChannelId;
  name: string;
};

export type UserMediaStatus = {
  hasMic: boolean;
  isMuted: boolean;
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

// WebRTC types
export type TransportId = Branded<string, 'TransportId'>;
export type ProducerId = Branded<string, 'ProducerId'>;
export type ConsumerId = Branded<string, 'ConsumerId'>;

export type FingerprintAlgorithm = 'sha-1' | 'sha-224' | 'sha-256' | 'sha-384' | 'sha-512';
export type DtlsRole = 'auto' | 'client' | 'server';
export type DtlsFingerprint = { algorithm: FingerprintAlgorithm; value: string };
export type DtlsParameters = { role?: DtlsRole; fingerprints: DtlsFingerprint[] };
export type IceParameters = { usernameFragment: string; password: string; iceLite?: boolean };
export type IceCandidate = {
  foundation: string;
  priority: number;
  ip: string;
  address: string;
  protocol: 'udp' | 'tcp';
  port: number;
  type: 'host';
  tcpType?: 'passive';
};

export type TransportInfo = {
  transportId: TransportId;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
};

export type ProducerKind = 'audio' | 'video';
export type ProducerSource = 'user' | 'display';

export type ProducerInfo = {
  producerId: ProducerId;
  kind: ProducerKind;
  source: ProducerSource;
  userId: UserId;
};

export type RtcpFeedback = { type: string; parameter?: string };
export type RtpHeaderExtensionDirection = 'sendrecv' | 'sendonly' | 'recvonly' | 'inactive';
export type RtpHeaderExtensionUri =
  | 'urn:ietf:params:rtp-hdrext:sdes:mid'
  | 'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id'
  | 'urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id'
  | 'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time'
  | 'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01'
  | 'urn:ietf:params:rtp-hdrext:ssrc-audio-level'
  | 'https://aomediacodec.github.io/av1-rtp-spec/#dependency-descriptor-rtp-header-extension'
  | 'urn:3gpp:video-orientation'
  | 'http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time'
  | 'urn:ietf:params:rtp-hdrext:toffset'
  | 'http://www.webrtc.org/experiments/rtp-hdrext/playout-delay'
  | 'urn:mediasoup:params:rtp-hdrext:packet-id';

export type RtpCodecCapability = {
  kind: ProducerKind;
  mimeType: string;
  preferredPayloadType: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: RtcpFeedback[];
};

export type RtpHeaderExtension = {
  kind: ProducerKind;
  uri: RtpHeaderExtensionUri;
  preferredId: number;
  preferredEncrypt?: boolean;
  direction?: RtpHeaderExtensionDirection;
};

export type RtpCapabilities = {
  codecs?: RtpCodecCapability[];
  headerExtensions?: RtpHeaderExtension[];
};

export type RtpCodecParameters = {
  mimeType: string;
  payloadType: number;
  clockRate: number;
  channels?: number;
  parameters?: Record<string, unknown>;
  rtcpFeedback?: RtcpFeedback[];
};

export type RtpHeaderExtensionParameters = {
  uri: RtpHeaderExtensionUri;
  id: number;
  encrypt?: boolean;
  parameters?: Record<string, unknown>;
};

export type RtpEncodingParameters = {
  ssrc?: number;
  rid?: string;
  codecPayloadType?: number;
  rtx?: { ssrc: number };
  dtx?: boolean;
  scalabilityMode?: string;
  scaleResolutionDownBy?: number;
  maxBitrate?: number;
  maxFramerate?: number;
  adaptivePtime?: boolean;
  priority?: 'very-low' | 'low' | 'medium' | 'high';
  networkPriority?: 'very-low' | 'low' | 'medium' | 'high';
};

export type RtcpParameters = { cname?: string; reducedSize?: boolean };

export type RtpParameters = {
  mid?: string;
  codecs: RtpCodecParameters[];
  headerExtensions?: RtpHeaderExtensionParameters[];
  encodings?: RtpEncodingParameters[];
  rtcp?: RtcpParameters;
  msid?: string;
};

export type GetChannelInfoRequest = {
  channelId: ChannelId;
};

export type GetChannelInfoResponse = {
  capabilities: RtpCapabilities;
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
  dtlsParameters: DtlsParameters;
};

export type ConnectTransportResponse = {
  success: boolean;
};

export type ProduceStreamRequest = {
  kind: ProducerKind;
  source: ProducerSource;
  rtpParameters: RtpParameters;
};

export type ProduceStreamResponse = {
  producerId: ProducerId;
};

export type ConsumeStreamRequest = {
  producerUserId: UserId;
  producerId: ProducerId;
  rtpCapabilities: RtpCapabilities;
};

export type ConsumeStreamResponse = {
  consumerId: ConsumerId;
  producerId: ProducerId;
  kind: ProducerKind;
  rtpParameters: RtpParameters;
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

export type PauseProducerRequest = {
  producerId: ProducerId;
};

export type PauseProducerResponse = {
  success: boolean;
};

export type ResumeProducerRequest = {
  producerId: ProducerId;
};

export type ResumeProducerResponse = {
  success: boolean;
};

export type SetDeafRequest = {
  isDeaf: boolean;
};

export type SetDeafResponse = {
  success: boolean;
};

export type UpdateAvatarRequest = {};

export type UpdateAvatarResponse = {
  uploadUrl: string;
};

export type UpdateUserRequest = {
  nickname?: string;
  bgColor?: string;
};

export type UpdateUserResponse = {
  user: User;
};

export type GetPaletteRequest = {};

export type GetPaletteResponse = {
  colors: string[];
};

export type UpdateChannelRequest = {
  channelId: ChannelId;
  name: string;
};

export type UpdateChannelResponse = {
  channel: Channel;
};

// WebSocket event types
export type WsEvents = {
  channelUserJoined: { channelId: ChannelId; user: UserWithStatus };
  channelUserLeft: { channelId: ChannelId; userId: UserId };
  channelUserStatusChanged: { channelId: ChannelId; userId: UserId; status: UserMediaStatus };
  producerCreated: { info: ProducerInfo };
  producerClosed: { producerId: ProducerId; userId: UserId };
  channelCreated: { channel: ChannelWithUsers };
  channelUpdated: { channel: Channel };
  userUpdated: { user: User };
  channelDeleted: { channelId: ChannelId };
};

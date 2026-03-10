import { z } from 'zod';
import { UserEntity } from './user/user.entity';
import type { ChannelId, ConsumerId, ProducerId, TransportId, UserId } from '../../libs/api/entities';
import { ZodDto } from '../libs/validation';

export const zUserId = z.string().transform((v) => v as UserId);
export const zChannelId = z.string().transform((v) => v as ChannelId);
export const zTransportId = z.string().transform((v) => v as TransportId);
export const zProducerId = z.string().transform((v) => v as ProducerId);
export const zConsumerId = z.string().transform((v) => v as ConsumerId);
export { zBgColor } from './user/palette';

export class UserDto extends ZodDto(
  UserEntity.omit({ createdAt: true }).extend({
    avatarUrl: z.string().optional(),
  }),
) {}

export class UserWithStatusDto extends ZodDto(
  UserDto.extend({
    isConnected: z.boolean(),
    hasMic: z.boolean(),
    isMuted: z.boolean(),
    hasVideo: z.boolean(),
    hasScreen: z.boolean(),
    isDeaf: z.boolean(),
  }),
) {}

export class ChannelDto extends ZodDto(
  z.object({
    id: zChannelId,
    name: z.string(),
  }),
) {}

export class ChannelWithUsersDto extends ZodDto(
  z.object({
    id: zChannelId,
    name: z.string(),
    users: UserWithStatusDto.array(),
  }),
) {}

export class DtlsFingerprintDto extends ZodDto(
  z.object({
    algorithm: z.enum(['sha-1', 'sha-224', 'sha-256', 'sha-384', 'sha-512']),
    value: z.string(),
  }),
) {}

export class DtlsParametersDto extends ZodDto(
  z.object({
    role: z.enum(['auto', 'client', 'server']).optional(),
    fingerprints: DtlsFingerprintDto.array(),
  }),
) {}

export class IceParametersDto extends ZodDto(
  z.object({
    usernameFragment: z.string(),
    password: z.string(),
    iceLite: z.boolean().optional(),
  }),
) {}

export class IceCandidateDto extends ZodDto(
  z.object({
    foundation: z.string(),
    priority: z.number(),
    ip: z.string(),
    address: z.string(),
    protocol: z.enum(['udp', 'tcp']),
    port: z.number().int(),
    type: z.literal('host'),
    tcpType: z.literal('passive').optional(),
  }),
) {}

export class TransportInfoDto extends ZodDto(
  z.object({
    transportId: zTransportId,
    iceParameters: IceParametersDto,
    iceCandidates: IceCandidateDto.array(),
    dtlsParameters: DtlsParametersDto,
  }),
) {}

export class ProducerInfoDto extends ZodDto(
  z.object({
    producerId: zProducerId,
    kind: z.enum(['audio', 'video']),
    source: z.enum(['user', 'display']),
    userId: zUserId,
  }),
) {}

// RTP types — codec sub-schemas use z.looseObject() to pass through opaque `parameters` fields

const zRtpHeaderExtensionUri = z.enum([
  'urn:ietf:params:rtp-hdrext:sdes:mid',
  'urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id',
  'urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id',
  'http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
  'http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01',
  'urn:ietf:params:rtp-hdrext:ssrc-audio-level',
  'https://aomediacodec.github.io/av1-rtp-spec/#dependency-descriptor-rtp-header-extension',
  'urn:3gpp:video-orientation',
  'http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time',
  'urn:ietf:params:rtp-hdrext:toffset',
  'http://www.webrtc.org/experiments/rtp-hdrext/playout-delay',
  'urn:mediasoup:params:rtp-hdrext:packet-id',
]);

const rtcpFeedbackSchema = z.object({
  type: z.string(),
  parameter: z.string().optional(),
});

const rtpCodecCapabilitySchema = z.looseObject({
  kind: z.enum(['audio', 'video']),
  mimeType: z.string(),
  preferredPayloadType: z.number().int(),
  clockRate: z.number().int(),
  channels: z.number().int().optional(),
  rtcpFeedback: z.array(rtcpFeedbackSchema).optional(),
});

const rtpHeaderExtensionSchema = z.object({
  kind: z.enum(['audio', 'video']),
  uri: zRtpHeaderExtensionUri,
  preferredId: z.number().int(),
  preferredEncrypt: z.boolean().optional(),
  direction: z.enum(['sendrecv', 'sendonly', 'recvonly', 'inactive']).optional(),
});

export class RtpCapabilitiesDto extends ZodDto(
  z.object({
    codecs: z.array(rtpCodecCapabilitySchema).optional(),
    headerExtensions: z.array(rtpHeaderExtensionSchema).optional(),
  }),
) {}

const rtpCodecParametersSchema = z.looseObject({
  mimeType: z.string(),
  payloadType: z.number().int(),
  clockRate: z.number().int(),
  channels: z.number().int().optional(),
  rtcpFeedback: z.array(rtcpFeedbackSchema).optional(),
});

const rtpHeaderExtensionParametersSchema = z.looseObject({
  uri: zRtpHeaderExtensionUri,
  id: z.number().int(),
  encrypt: z.boolean().optional(),
});

const rtpEncodingParametersSchema = z.object({
  ssrc: z.number().optional(),
  rid: z.string().optional(),
  codecPayloadType: z.number().int().optional(),
  rtx: z.object({ ssrc: z.number() }).optional(),
  dtx: z.boolean().optional(),
  scalabilityMode: z.string().optional(),
  scaleResolutionDownBy: z.number().optional(),
  maxBitrate: z.number().optional(),
  maxFramerate: z.number().optional(),
  adaptivePtime: z.boolean().optional(),
  priority: z.enum(['very-low', 'low', 'medium', 'high']).optional(),
  networkPriority: z.enum(['very-low', 'low', 'medium', 'high']).optional(),
});

const rtcpParametersSchema = z.object({
  cname: z.string().optional(),
  reducedSize: z.boolean().optional(),
});

export class RtpParametersDto extends ZodDto(
  z.object({
    mid: z.string().optional(),
    codecs: z.array(rtpCodecParametersSchema),
    headerExtensions: z.array(rtpHeaderExtensionParametersSchema).optional(),
    encodings: z.array(rtpEncodingParametersSchema).optional(),
    rtcp: rtcpParametersSchema.optional(),
    msid: z.string().optional(),
  }),
) {}

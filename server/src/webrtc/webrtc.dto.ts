import { z } from 'zod';
import { ZodDto } from '../../libs/validation';
import { DtlsParametersDto, ProducerInfoDto, RtpCapabilitiesDto, RtpParametersDto, TransportInfoDto, zChannelId, zConsumerId, zProducerId, zTransportId, zUserId } from '../shared.dto';

export class GetChannelInfoRequestDto extends ZodDto(
  z.object({
    channelId: zChannelId,
  }),
) {}

export class GetChannelInfoResponseDto extends ZodDto(
  z.object({
    capabilities: RtpCapabilitiesDto,
    producerInfos: ProducerInfoDto.array(),
  }),
) {}

export class ConnectTransportRequestDto extends ZodDto(
  z.object({
    transportId: zTransportId,
    dtlsParameters: DtlsParametersDto,
  }),
) {}

export class ConnectTransportResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class ProduceStreamRequestDto extends ZodDto(
  z.object({
    kind: z.enum(['audio', 'video']),
    source: z.enum(['user', 'display']),
    rtpParameters: RtpParametersDto,
  }),
) {}

export class ProduceStreamResponseDto extends ZodDto(
  z.object({
    producerId: zProducerId,
  }),
) {}

export class CloseProducerRequestDto extends ZodDto(
  z.object({
    producerId: zProducerId,
  }),
) {}

export class CloseProducerResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class ConsumeStreamRequestDto extends ZodDto(
  z.object({
    producerUserId: zUserId,
    producerId: zProducerId,
    rtpCapabilities: RtpCapabilitiesDto,
  }),
) {}

export class ConsumeStreamResponseDto extends ZodDto(
  z.object({
    consumerId: zConsumerId,
    producerId: zProducerId,
    kind: z.enum(['audio', 'video']),
    rtpParameters: RtpParametersDto,
  }),
) {}

export class PauseProducerRequestDto extends ZodDto(
  z.object({
    producerId: zProducerId,
  }),
) {}

export class PauseProducerResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class ResumeProducerRequestDto extends ZodDto(
  z.object({
    producerId: zProducerId,
  }),
) {}

export class ResumeProducerResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class ResumeConsumerRequestDto extends ZodDto(
  z.object({
    consumerId: zConsumerId,
  }),
) {}

export class ResumeConsumerResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class PauseConsumerRequestDto extends ZodDto(
  z.object({
    consumerId: zConsumerId,
  }),
) {}

export class PauseConsumerResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class SetDeafRequestDto extends ZodDto(
  z.object({
    isDeaf: z.boolean(),
  }),
) {}

export class SetDeafResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class CreateTransportsRequestDto extends ZodDto(
  z.object({
    channelId: zChannelId,
  }),
) {}

export class CreateTransportsResponseDto extends ZodDto(
  z.object({
    send: TransportInfoDto,
    recv: TransportInfoDto,
  }),
) {}

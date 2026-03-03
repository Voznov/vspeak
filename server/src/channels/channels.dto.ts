import { z } from 'zod';
import { ZodDto } from '../../libs/validation';
import { ChannelWithUsersDto, TransportInfoDto, UserDto, zChannelId } from '../shared.dto';

export class ListChannelsResponseDto extends ZodDto(
  z.object({
    channels: ChannelWithUsersDto.array(),
  }),
) {}

export class CreateChannelRequestDto extends ZodDto(
  z.object({
    name: z.string(),
  }),
) {}

export class CreateChannelResponseDto extends ZodDto(
  z.object({
    channel: ChannelWithUsersDto,
  }),
) {}

export class DeleteChannelRequestDto extends ZodDto(
  z.object({
    channelId: zChannelId,
  }),
) {}

export class DeleteChannelResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class JoinChannelRequestDto extends ZodDto(
  z.object({
    channelId: zChannelId,
  }),
) {}

export class JoinChannelResponseDto extends ZodDto(
  z.object({
    channel: ChannelWithUsersDto,
    send: TransportInfoDto,
    recv: TransportInfoDto,
  }),
) {}

export class LeaveChannelRequestDto extends ZodDto(
  z.object({
    channelId: zChannelId,
  }),
) {}

export class LeaveChannelResponseDto extends ZodDto(
  z.object({
    success: z.boolean(),
  }),
) {}

export class GetChannelUsersRequestDto extends ZodDto(
  z.object({
    channelId: zChannelId,
  }),
) {}

export class GetChannelUsersResponseDto extends ZodDto(
  z.object({
    users: UserDto.array(),
  }),
) {}

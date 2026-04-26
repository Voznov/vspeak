import { ZodDto } from '@voznov/zod-dto';
import { z } from 'zod';
import { zBgColor } from './palette';
import { UserDto } from '../shared.dto';

export class GetMeResponseDto extends ZodDto(
  z.object({
    user: UserDto,
  }),
) {}

export class UpdateAvatarResponseDto extends ZodDto(
  z.object({
    uploadUrl: z.string(),
  }),
) {}

export class UpdateUserRequestDto extends ZodDto(
  z.object({
    nickname: z.string().min(1).max(64).optional(),
    bgColor: zBgColor.optional(),
  }),
) {}

export class UpdateUserResponseDto extends ZodDto(
  z.object({
    user: UserDto,
  }),
) {}

export class GetPaletteResponseDto extends ZodDto(
  z.object({
    colors: zBgColor.array(),
  }),
) {}

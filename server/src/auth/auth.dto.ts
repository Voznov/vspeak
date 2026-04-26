import { ZodDto } from '@voznov/zod-dto';
import { z } from 'zod';
import { UserDto } from '../shared.dto';

export class LoginRequestDto extends ZodDto(
  z.object({
    nickname: z.string(),
    invitationToken: z.string().optional(),
  }),
) {}

export class LoginResponseDto extends ZodDto(
  z.object({
    token: z.string(),
    user: UserDto,
  }),
) {}

export class AdminLoginRequestDto extends ZodDto(
  z.object({
    nickname: z.string(),
    adminKey: z.string(),
  }),
) {}

export class AdminLoginResponseDto extends ZodDto(
  z.object({
    token: z.string(),
    user: UserDto,
  }),
) {}

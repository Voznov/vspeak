import { ZodDto } from '@voznov/zod-dto';
import { z } from 'zod';
import { zBgColor } from './palette';
import type { UserId } from '../../../libs/api/entities';

const zUserId = z.string().transform((v) => v as UserId);

export class UserEntity extends ZodDto(
  z.object({
    id: zUserId,
    nickname: z.string(),
    role: z.enum(['user', 'admin']),
    bgColor: zBgColor,
    createdAt: z.coerce.date(),
  }),
) {}

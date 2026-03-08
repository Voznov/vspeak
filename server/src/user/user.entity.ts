import { z } from 'zod';
import { zBgColor } from './palette';
import type { UserId } from '../../../libs/api/entities';
import { ZodDto } from '../../libs/validation';

const zUserId = z.string().transform((v) => v as UserId);

export class UserEntity extends ZodDto(
  z.object({
    id: zUserId,
    nickname: z.string(),
    role: z.enum(['user', 'admin']),
    bgColor: zBgColor,
    createdAt: z.coerce.date(),
  }),
  {
    aliases: { created_at: 'createdAt', bg_color: 'bgColor' },
  },
) {}

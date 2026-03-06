import { z } from 'zod';
import { ZodDto } from '../../libs/validation';
import { zUserId } from '../shared.dto';

export class UserEntity extends ZodDto(
  z.object({
    id: zUserId,
    nickname: z.string(),
    role: z.enum(['user', 'admin']),
    createdAt: z.coerce.date(),
  }),
  { aliases: { created_at: 'createdAt' } },
) {}

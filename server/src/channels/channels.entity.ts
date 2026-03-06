import { z } from 'zod';
import { ZodDto } from '../../libs/validation';
import { zChannelId } from '../shared.dto';

export class ChannelEntity extends ZodDto(
  z.object({
    id: zChannelId,
    name: z.string(),
    createdAt: z.coerce.date(),
  }),
  { aliases: { created_at: 'createdAt' } },
) {}

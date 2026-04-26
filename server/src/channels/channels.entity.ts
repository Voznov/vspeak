import { ZodDto } from '@voznov/zod-dto';
import { z } from 'zod';
import { zChannelId } from '../shared.dto';

export class ChannelEntity extends ZodDto(
  z.object({
    id: zChannelId,
    name: z.string(),
    createdAt: z.coerce.date(),
  }),
) {}

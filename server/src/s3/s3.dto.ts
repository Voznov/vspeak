import { Event } from '@aws-sdk/client-s3';
import { ZodDto } from '@voznov/zod-dto';
import { z } from 'zod';
import { S3Bucket } from './s3.constants';

const zS3Bucket = z.enum(S3Bucket);

export class S3RecordDto extends ZodDto(
  z.object({
    eventName: z.enum(Event),
    s3: z.object({
      bucket: z.object({ name: zS3Bucket }),
      object: z.object({ key: z.string() }),
    }),
  }),
) {}

export class S3WebhookBodyDto extends ZodDto(
  z.object({
    Records: S3RecordDto.array().optional(),
  }),
) {}

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketNotificationConfigurationCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { S3_CONFIG, S3Bucket, WEBHOOK_ARN } from './s3.constants';
import { type S3RecordDto } from './s3.dto';
import { type S3Config, type S3EventHandler, type S3ObjectEvent, type S3Path } from './s3.types';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly logger = new Logger(S3Service.name);
  private readonly handlers = new Map<S3Bucket, S3EventHandler[]>();

  constructor(@Inject(S3_CONFIG) readonly config: S3Config) {
    const clientOptions = {
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    this.client = new S3Client(clientOptions);
    this.presignClient = config.publicEndpoint ? new S3Client({ ...clientOptions, endpoint: config.publicEndpoint }) : this.client;
  }

  async onModuleInit(): Promise<void> {
    await Promise.all(Object.values(S3Bucket).map(async (bucket) => this.ensureBucket(bucket)));

    if (this.config.webhookAuthToken) {
      await Promise.all(Object.values(S3Bucket).map(async (bucket) => this.subscribeBucketToWebhook(bucket)));
    }
  }

  onEvent(bucket: S3Bucket, handler: S3EventHandler): () => void {
    const list = this.handlers.get(bucket) ?? [];
    list.push(handler);
    this.handlers.set(bucket, list);

    return () => {
      this.handlers.set(bucket, this.handlers.get(bucket)?.filter((h) => h !== handler) ?? []);
    };
  }

  async dispatchWebhookEvent(records: S3RecordDto[]): Promise<void> {
    for (const record of records) {
      const event: S3ObjectEvent = {
        bucket: record.s3.bucket.name,
        key: record.s3.object.key,
        eventName: record.eventName,
      };

      const list = this.handlers.get(event.bucket) ?? [];
      await Promise.all(list.map(async (handler) => handler(event)));
    }
  }

  async objectExists({ bucket, key }: S3Path): Promise<boolean> {
    return this.client
      .send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      .then(() => true)
      .catch(() => false);
  }

  async putObject({ bucket, key }: S3Path, body: PutObjectCommandInput['Body'], contentType?: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async getObject({ bucket, key }: S3Path): Promise<NodeJS.ReadableStream> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    return response.Body as NodeJS.ReadableStream;
  }

  async deleteObject({ bucket, key }: S3Path): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async getPresignedUploadUrl({ bucket, key }: S3Path, contentType: string, expiresIn: number): Promise<string> {
    return getSignedUrl(this.presignClient, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn });
  }

  async getPresignedDownloadUrl({ bucket, key }: S3Path, expiresIn: number): Promise<string | undefined> {
    if (!(await this.objectExists({ bucket, key }))) return undefined;

    return getSignedUrl(this.presignClient, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  }

  private async ensureBucket(bucket: S3Bucket): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
      this.logger.log(`Created bucket: ${bucket}`);
    }
  }

  private async subscribeBucketToWebhook(bucket: S3Bucket): Promise<void> {
    try {
      await this.client.send(
        new PutBucketNotificationConfigurationCommand({
          Bucket: bucket,
          NotificationConfiguration: {
            QueueConfigurations: [{ QueueArn: WEBHOOK_ARN, Events: ['s3:ObjectCreated:*', 's3:ObjectRemoved:*'], Id: `${bucket}-webhook` }],
          },
        }),
      );
      this.logger.log(`Subscribed bucket to webhook: ${bucket}`);
    } catch (error) {
      this.logger.warn(`Failed to subscribe bucket to webhook: ${bucket}`, error);
    }
  }
}

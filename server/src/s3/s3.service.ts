import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, type PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { S3_CONFIG, S3Bucket } from './s3.constants';
import { type S3Config, type S3Path } from './s3.types';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly client: S3Client;
  private readonly logger = new Logger(S3Service.name);

  constructor(@Inject(S3_CONFIG) config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await Promise.all(Object.values(S3Bucket).map(async (bucket) => this.ensureBucket(bucket)));
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

  async getPresignedUploadUrl({ bucket, key }: S3Path, contentType: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(this.client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn });
  }

  async getPresignedDownloadUrl({ bucket, key }: S3Path, expiresIn = 900): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  }

  private async ensureBucket(bucket: S3Bucket): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
      this.logger.log(`Created bucket: ${bucket}`);
    }
  }
}

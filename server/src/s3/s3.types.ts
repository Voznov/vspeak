import { type S3Bucket } from './s3.constants';

export interface S3Config {
  region: string;
  endpoint?: string;
  publicEndpoint?: string;
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface S3Path {
  bucket: S3Bucket;
  key: string;
}

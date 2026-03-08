import { type Event } from '@aws-sdk/client-s3';
import { type S3Bucket } from './s3.constants';

export interface S3Config {
  region: string;
  endpoint?: string;
  publicEndpoint?: string;
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  webhookAuthToken?: string;
}

export interface S3Path {
  bucket: S3Bucket;
  key: string;
}

export interface S3ObjectEvent {
  bucket: S3Bucket;
  key: string;
  eventName: Event;
}

export type S3EventHandler = (event: S3ObjectEvent) => void | Promise<void>;

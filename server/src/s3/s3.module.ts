import { type DynamicModule, Module } from '@nestjs/common';
import { S3_CONFIG } from './s3.constants';
import { S3Service } from './s3.service';
import { type S3Config } from './s3.types';

@Module({ providers: [S3Service], exports: [S3Service] })
export class S3Module {
  static register(config: S3Config): DynamicModule {
    return {
      module: S3Module,
      providers: [{ provide: S3_CONFIG, useValue: config }],
      global: true,
    };
  }
}

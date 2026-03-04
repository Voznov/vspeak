import { type DynamicModule, Module } from '@nestjs/common';
import { POSTGRES_MIGRATION_CONFIG } from './postgres.constants';
import { PostgresService } from './postgres.service';
import { type PostgresMigrationConfig } from './postgres.types';

@Module({ providers: [PostgresService], exports: [PostgresService] })
export class PostgresModule {
  static register(config: PostgresMigrationConfig): DynamicModule {
    return {
      module: PostgresModule,
      providers: [{ provide: POSTGRES_MIGRATION_CONFIG, useValue: config }],
      global: true,
    };
  }
}

import { type Type } from '@nestjs/common';
import { type PoolClient } from 'pg';

export type PostgresMigration = {
  up: (client: PoolClient) => Promise<void>;
  down: (client: PoolClient) => Promise<void>;
};

export type PostgresMigrationConfig = {
  migrations: Record<string, Type<PostgresMigration>>;
};

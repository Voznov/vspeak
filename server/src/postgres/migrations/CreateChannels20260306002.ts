import { type PoolClient } from 'pg';
import { type PostgresMigration } from '../postgres.types';

export class CreateChannels20260306002 implements PostgresMigration {
  async up(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE channels (
        id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(128)  NOT NULL UNIQUE,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(client: PoolClient): Promise<void> {
    await client.query('DROP TABLE IF EXISTS channels');
  }
}
